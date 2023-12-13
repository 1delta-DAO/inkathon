#![cfg_attr(not(feature = "std"), no_std, no_main)]

mod andromeda {
    pub mod traits;
}

#[ink::contract]
mod andromedacaller {

    use crate::andromeda::traits::{PSP22TradingPair, Router, PSP22};
    use ink::{contract_ref, prelude::vec::Vec, LangError};
    use openbrush::contracts::psp22::PSP22Error;

    #[derive(Debug, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum CallerError {
        PSP22(PSP22Error),
        Lang(LangError),
    }

    impl From<PSP22Error> for CallerError {
        fn from(error: PSP22Error) -> Self {
            CallerError::PSP22(error)
        }
    }

    impl From<LangError> for CallerError {
        fn from(error: LangError) -> Self {
            CallerError::Lang(error)
        }
    }

    #[ink(storage)]
    pub struct AndromedaCaller {
        andromeda_account: AccountId,
        swap_router: contract_ref!(Router),
    }

    impl AndromedaCaller {
        #[ink(constructor)]
        pub fn new(andromeda_router_address: AccountId) -> Self {
            Self {
                andromeda_account: andromeda_router_address,
                swap_router: andromeda_router_address.into(),
            }
        }

        // lending_pool_deposit functions
        #[ink(message)]
        pub fn create_psp22_liquidity_pool(
            &mut self,
            psp22_token_a: AccountId,
            psp22_token_b: AccountId,
            version: u64,
            token_a_amount: Balance,
            token_b_amount: Balance,
            slippage: Balance,
        ) -> Result<(), CallerError> {
            let caller: AccountId = Self::env().caller();

            // create liquidity pool
            let swap_pool_account_id =
                self.swap_router
                    .create_psp22_liquidity(psp22_token_a, psp22_token_b, version)?;

            // transfer tokens from caller to this contract
            let mut token_a: contract_ref!(PSP22) = psp22_token_a.into();
            token_a.transfer_from(caller, self.env().account_id(), token_a_amount, Vec::new())?;

            let mut token_b: contract_ref!(PSP22) = psp22_token_b.into();
            token_b.transfer_from(caller, self.env().account_id(), token_b_amount, Vec::new())?;

            // deposit liquidity
            token_a.approve(swap_pool_account_id, token_a_amount)?;
            token_b.approve(swap_pool_account_id, token_b_amount)?;

            let mut swap_pool: contract_ref!(PSP22TradingPair) = swap_pool_account_id.into();
            swap_pool.add_liquidity(token_a_amount, token_b_amount, slippage)?;

            // transfer liquidity tokens to caller
            let mut liquidity_token: contract_ref!(PSP22) = swap_pool_account_id.into();
            let liquidity_token_balance: u128 = liquidity_token.balance_of(self.env().account_id());
            liquidity_token.transfer(caller, liquidity_token_balance, Vec::new())?;

            return Ok(());
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
