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
        lending_pool_borrow: contract_ref!(LendingPoolBorrow),
        lending_pool_deposit: contract_ref!(LendingPoolDeposit),
    }

    impl AbaxCaller {
        #[ink(constructor)]
        pub fn new(abax_address: AccountId) -> Self {
            Self {
                abax_account: abax_address,
                lending_pool_borrow: abax_address.into(),
                lending_pool_deposit: abax_address.into(),
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

            self.lending_pool_deposit
                .deposit(asset, caller, amount, data)
        }

        #[ink(message)]
        pub fn redeem(
            &mut self,
            asset: AccountId,
            amount: Balance,
            data: Vec<u8>,
        ) -> Result<(), PSP22Error> {
            let caller: AccountId = Self::env().caller();

            let redeem_balance: u128 = self
                .lending_pool_deposit
                .redeem(asset, caller, amount, data)?;

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

            self.lending_pool_borrow
                .borrow(asset, caller, amount, data)?;

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

            self.lending_pool_borrow.repay(asset, caller, amount, data)
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

            let (eoa, margin_type, sec_asset): (AccountId, u8, AccountId) = self
                .decode_data(receiver_params)
                .map_err(|_| FlashLoanReceiverError::CantApprove)?;

            for ((&asset, &amount), &fee) in assets.iter().zip(amounts.iter()).zip(fees.iter()) {
                if amount <= 0 {
                    return Err(FlashLoanReceiverError::InsufficientBalance);
                }

                if margin_type == 0 {
                    self.lending_pool_deposit
                        .deposit(sec_asset, eoa, amount, Vec::new())
                        .map_err(|_| FlashLoanReceiverError::ExecuteOperationFailed)?;

                    self.lending_pool_borrow
                        .borrow(asset, eoa, amount + fee, Vec::new())
                        .map_err(|_| FlashLoanReceiverError::ExecuteOperationFailed)?;
                } else {
                    self.lending_pool_borrow
                        .repay(sec_asset, eoa, amount, Vec::new())
                        .map_err(|_| FlashLoanReceiverError::ExecuteOperationFailed)?;

                    self.lending_pool_deposit
                        .redeem(asset, eoa, amount + fee, Vec::new())
                        .map_err(|_| FlashLoanReceiverError::ExecuteOperationFailed)?;
                }
            }

            Ok(())
        }
    }
}
