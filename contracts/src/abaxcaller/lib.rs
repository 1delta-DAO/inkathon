#![cfg_attr(not(feature = "std"), no_std, no_main)]

mod abax {
    pub mod traits;
}

#[ink::contract]
mod abaxcaller {

    use crate::abax::traits::flash_loan_receiver::{FlashLoanReceiver, FlashLoanReceiverError};
    use crate::abax::traits::lending_pool::LendingPoolBorrow;
    use crate::abax::traits::lending_pool::LendingPoolDeposit;
    use crate::abax::traits::lending_pool::LendingPoolError;
    use crate::abax::traits::psp22::PSP22;
    use ink::{contract_ref, prelude::vec::Vec};
    use openbrush::contracts::psp22::PSP22Error;
    use scale::Decode;
    use scale::Input;

    #[ink(storage)]
    pub struct AbaxCaller {
        abax_account: AccountId,
    }

    impl AbaxCaller {
        #[ink(constructor)]
        pub fn new(abax_address: AccountId) -> Self {
            Self {
                abax_account: abax_address,
            }
        }

        // internal functions
        fn decode_data(
            &mut self,
            encoded_data: Vec<u8>,
        ) -> Result<(AccountId, u8, AccountId), scale::Error> {
            let mut data = encoded_data.as_slice();

            let eoa = AccountId::decode(&mut data)?;

            let margin_type = data.read_byte()?;

            let asset = AccountId::decode(&mut data)?;

            Ok((eoa, margin_type, asset))
        }

        // lending_pool_deposit functions
        #[ink(message)]
        pub fn deposit(
            &mut self,
            asset: AccountId,
            amount: Balance,
            data: Vec<u8>,
        ) -> Result<(), LendingPoolError> {
            let caller: AccountId = Self::env().caller();

            let mut token: contract_ref!(PSP22) = asset.into();
            token.transfer_from(caller, self.env().account_id(), amount, Vec::new())?;

            let mut lending_pool_deposit: contract_ref!(LendingPoolDeposit) =
                self.abax_account.into();

            lending_pool_deposit.deposit(asset, caller, amount, data)
        }

        #[ink(message)]
        pub fn redeem(
            &mut self,
            asset: AccountId,
            amount: Balance,
            data: Vec<u8>,
        ) -> Result<(), PSP22Error> {
            let caller: AccountId = Self::env().caller();

            let mut lending_pool_deposit: contract_ref!(LendingPoolDeposit) =
                self.abax_account.into();

            let redeem_balance: u128 = lending_pool_deposit.redeem(asset, caller, amount, data)?;

            let mut token: contract_ref!(PSP22) = asset.into();
            token.transfer(caller, redeem_balance, Vec::new())
        }

        // lending_pool_borrow functions
        #[ink(message)]
        pub fn borrow(
            &mut self,
            asset: AccountId,
            amount: Balance,
            data: Vec<u8>,
        ) -> Result<(), PSP22Error> {
            let caller: AccountId = Self::env().caller();

            let mut lending_pool_borrow: contract_ref!(LendingPoolBorrow) =
                self.abax_account.into();

            lending_pool_borrow.borrow(asset, caller, amount, data)?;

            let mut token: contract_ref!(PSP22) = asset.into();
            token.transfer(caller, amount, Vec::new())
        }

        #[ink(message)]
        pub fn repay(
            &mut self,
            asset: AccountId,
            amount: Balance,
            data: Vec<u8>,
        ) -> Result<Balance, LendingPoolError> {
            let caller: AccountId = Self::env().caller();

            let mut token: contract_ref!(PSP22) = asset.into();
            token.transfer_from(caller, self.env().account_id(), amount, Vec::new())?;

            let mut lending_pool_borrow: contract_ref!(LendingPoolBorrow) =
                self.abax_account.into();

            lending_pool_borrow.repay(asset, caller, amount, data)
        }

        // PSP22 functions
        #[ink(message)]
        pub fn approve(
            &self,
            asset: AccountId,
            spender: AccountId,
            value: u128,
        ) -> Result<(), PSP22Error> {
            let mut token: contract_ref!(PSP22) = asset.into();
            token.approve(spender, value)
        }
    }

    impl FlashLoanReceiver for AbaxCaller {
        #[ink(message)]
        fn execute_operation(
            &mut self,
            assets: Vec<AccountId>,
            amounts: Vec<u128>,
            fees: Vec<u128>,
            receiver_params: Vec<u8>,
        ) -> Result<(), FlashLoanReceiverError> {
            let caller: AccountId = Self::env().caller();

            if caller != self.abax_account || receiver_params.len() == 0 {
                return Err(FlashLoanReceiverError::CantApprove);
            }

            if assets.len() != amounts.len() || assets.len() != fees.len() || assets.len() != 1 {
                return Err(FlashLoanReceiverError::AssetNotMintable);
            }

            let asset = assets[0];
            let amount = amounts[0];
            let fee = fees[0];

            if amount <= 0 {
                return Err(FlashLoanReceiverError::InsufficientBalance);
            }

            let (eoa, margin_type, sec_asset): (AccountId, u8, AccountId) = self
                .decode_data(receiver_params)
                .map_err(|_| FlashLoanReceiverError::CantApprove)?;

            // swap from asset to sec_asset missing here

            let mut lending_pool_deposit: contract_ref!(LendingPoolDeposit) =
                self.abax_account.into();
            let mut lending_pool_borrow: contract_ref!(LendingPoolBorrow) =
                self.abax_account.into();

            if margin_type == 0 {
                // open position
                lending_pool_deposit
                    .deposit(sec_asset, eoa, amount, Vec::new())
                    .map_err(|_| FlashLoanReceiverError::ExecuteOperationFailed)?;

                lending_pool_borrow
                    .borrow(asset, eoa, fee, Vec::new())
                    .map_err(|_| FlashLoanReceiverError::ExecuteOperationFailed)?;
            } else if margin_type == 1 {
                // close position
                lending_pool_borrow
                    .repay(sec_asset, eoa, amount, Vec::new())
                    .map_err(|_| FlashLoanReceiverError::ExecuteOperationFailed)?;

                lending_pool_deposit
                    .redeem(asset, eoa, amount + fee, Vec::new())
                    .map_err(|_| FlashLoanReceiverError::ExecuteOperationFailed)?;
            } else if margin_type == 2 {
                // collateral swap
                lending_pool_deposit
                    .deposit(sec_asset, eoa, amount, Vec::new())
                    .map_err(|_| FlashLoanReceiverError::ExecuteOperationFailed)?;

                lending_pool_deposit
                    .redeem(asset, eoa, amount + fee, Vec::new())
                    .map_err(|_| FlashLoanReceiverError::ExecuteOperationFailed)?;
            } else {
                // debt swap
                lending_pool_borrow
                    .repay(sec_asset, eoa, amount, Vec::new())
                    .map_err(|_| FlashLoanReceiverError::ExecuteOperationFailed)?;

                lending_pool_borrow
                    .borrow(asset, eoa, amount + fee, Vec::new())
                    .map_err(|_| FlashLoanReceiverError::ExecuteOperationFailed)?;
            }

            // commented out to first test opening a position alone
            /*
            let mut sec_token: contract_ref!(PSP22) = sec_asset.into();
            let sec_token_balance = sec_token.balance_of(self.env().account_id());
            if sec_token_balance > 0 {
                sec_token
                    .transfer(eoa, sec_token_balance, Vec::new())
                    .map_err(|_| FlashLoanReceiverError::ExecuteOperationFailed)?;
            }

            let mut token: contract_ref!(PSP22) = asset.into();
            let token_balance = token.balance_of(self.env().account_id());
            let token_balance_without_flashloan = token_balance - amount - fee;
            if token_balance_without_flashloan > 0 {
                token
                    .transfer(eoa, token_balance_without_flashloan, Vec::new())
                    .map_err(|_| FlashLoanReceiverError::ExecuteOperationFailed)?;
            } */

            Ok(())
        }
    }
}
