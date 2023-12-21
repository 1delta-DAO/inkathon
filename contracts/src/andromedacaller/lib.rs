#![cfg_attr(not(feature = "std"), no_std, no_main)]

mod andromeda {
    pub mod traits;
}

#[ink::contract]
mod andromedacaller {

    use crate::andromeda::traits::{PSP22TradingPair, Router, PSP22};
    use ink::{contract_ref, prelude::vec::Vec};
    use openbrush::contracts::psp22::PSP22Error;

    #[ink(storage)]
    pub struct AndromedaCaller {
        swap_router: contract_ref!(Router),
    }

    impl AndromedaCaller {
        #[ink(constructor)]
        pub fn new(andromeda_router_address: AccountId) -> Self {
            Self {
                swap_router: andromeda_router_address.into(),
            }
        }

        #[ink(message)]
        pub fn create_psp22_liquidity_pool(
            &mut self,
            psp22_token_a: AccountId,
            psp22_token_b: AccountId,
            token_a_amount: Balance,
            token_b_amount: Balance,
        ) -> Result<AccountId, PSP22Error> {
            let caller: AccountId = Self::env().caller();
            const VERSION: u64 = 0;
            const SLIPPAGE: Balance = 0;

            let swap_pool_account_id =
                self.swap_router
                    .create_psp22_liquidity(psp22_token_a, psp22_token_b, VERSION);

            let mut token_a: contract_ref!(PSP22) = psp22_token_a.into();
            token_a.transfer_from(caller, self.env().account_id(), token_a_amount, Vec::new())?;

            let mut token_b: contract_ref!(PSP22) = psp22_token_b.into();
            token_b.transfer_from(caller, self.env().account_id(), token_b_amount, Vec::new())?;

            token_a.approve(swap_pool_account_id, token_a_amount)?;
            token_b.approve(swap_pool_account_id, token_b_amount)?;

            let mut swap_pool: contract_ref!(PSP22TradingPair) = swap_pool_account_id.into();
            swap_pool.add_liquidity(token_a_amount, token_b_amount, SLIPPAGE);

            let mut liquidity_token: contract_ref!(PSP22) = swap_pool_account_id.into();
            let liquidity_token_balance: u128 = liquidity_token.balance_of(self.env().account_id());
            liquidity_token.transfer(caller, liquidity_token_balance, Vec::new())?;

            return Ok(swap_pool_account_id);
        }

        #[ink(message)]
        pub fn swap_psp22_tokens(
            &mut self,
            psp22_token_start: AccountId,
            psp22_token_end: AccountId,
            token_start_amount: Balance,
            slippage: Balance,
        ) -> Result<Balance, PSP22Error> {
            let caller: AccountId = Self::env().caller();

            let swap_pool_account_id = self
                .swap_router
                .get_associated_psp22_pool(psp22_token_start, psp22_token_end);

            let mut token_start: contract_ref!(PSP22) = psp22_token_start.into();
            token_start.transfer_from(
                caller,
                self.env().account_id(),
                token_start_amount,
                Vec::new(),
            )?;

            token_start.approve(swap_pool_account_id, token_start_amount)?;

            let mut swap_pool: contract_ref!(PSP22TradingPair) = swap_pool_account_id.into();
            let token_ids: Vec<AccountId> = swap_pool.get_tokens();

            let token_end_amount: u128;
            if token_ids[0] == psp22_token_start {
                token_end_amount = swap_pool.get_psp22_b_amount_out(token_start_amount);

                swap_pool.swap_psp22_token_a(token_start_amount, token_end_amount, slippage);
            } else {
                token_end_amount = swap_pool.get_psp22_a_amount_out(token_start_amount);

                swap_pool.swap_psp22_token_b(token_start_amount, token_end_amount, slippage);
            }

            let mut token_end: contract_ref!(PSP22) = psp22_token_end.into();
            let token_end_amount_realised: u128 = token_end.balance_of(self.env().account_id());
            token_end.transfer(caller, token_end_amount_realised, Vec::new())?;

            return Ok(token_end_amount_realised);
        }
    }
}
