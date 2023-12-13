#[ink::trait_definition]
pub trait PSP22TradingPair {
    #[ink(message)]
    fn get_tokens(&self) -> Result<Vec<AccountId>, LangError>;

    #[ink(message)]
    fn creator(&self) -> Result<AccountId, LangError>;

    #[ink(message)]
    fn get_account_id(&self) -> Result<AccountId, LangError>;

    #[ink(message)]
    fn get_shares(&self, account: AccountId) -> Result<u128, LangError>;

    #[ink(message)]
    fn get_supply(&self) -> Result<u128, LangError>;

    #[ink(message)]
    fn is_azero_pool(&self) -> Result<bool, LangError>;

    #[ink(message)]
    fn add_liquidity(
        &mut self,
        psp22_token_a_deposit_amount: Balance,
        psp22_token_b_deposit_amount: Balance,
        slippage: Balance,
    ) -> Result<(), LangError>;

    #[ink(message)]
    fn remove_liquidity(&mut self, amount_in_shares: Balance) -> Result<(), LangError>;

    #[ink(message)]
    fn transactions_count(&self) -> Result<u128, LangError>;

    #[ink(message)]
    fn swap_psp22_token_a(
        &mut self,
        psp22_a_amount_in: Balance,
        psp22_b_amount_out: Balance,
        slippage: Balance,
    ) -> Result<(), LangError>;

    #[ink(message)]
    fn swap_psp22_token_b(
        &mut self,
        psp22_b_amount_in: Balance,
        psp22_a_amount_out: Balance,
        slippage: Balance,
    ) -> Result<(), LangError>;

    #[ink(message)]
    fn get_psp22_b_amount_out(&self, amount: Balance) -> Result<u128, LangError>;

    #[ink(message)]
    fn get_psp22_a_amount_out(&self, amount: Balance) -> Result<u128, LangError>;

    #[ink(message)]
    fn get_token_balances(&self) -> Result<Vec<u128>, LangError>;

    #[ink(message)]
    fn get_fees(&self, account: AccountId) -> Result<u128, LangError>;
}
