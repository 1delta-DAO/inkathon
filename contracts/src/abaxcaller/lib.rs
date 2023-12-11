#![cfg_attr(not(feature = "std"), no_std, no_main)]

mod abax {
    pub mod traits;
}

#[ink::contract]
mod abaxcaller {
    use crate::abax::traits::lending_pool::LendingPoolBorrow;
    use crate::abax::traits::lending_pool::LendingPoolDeposit;
    use crate::abax::traits::lending_pool::LendingPoolError;
    use crate::abax::traits::psp22::PSP22;
    use ink::{contract_ref, prelude::vec::Vec};
    use openbrush::contracts::psp22::PSP22Error;

    #[ink(storage)]
    pub struct AbaxCaller {
        lending_pool_borrow: contract_ref!(LendingPoolBorrow),
        lending_pool_deposit: contract_ref!(LendingPoolDeposit),
    }

    impl AbaxCaller {
        #[ink(constructor)]
        pub fn new(abax_address: AccountId) -> Self {
            Self {
                lending_pool_borrow: abax_address.into(),
                lending_pool_deposit: abax_address.into(),
            }
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
}
