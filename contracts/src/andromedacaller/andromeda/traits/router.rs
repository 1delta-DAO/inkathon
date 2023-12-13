#[ink::trait_definition]
pub trait Router {
    #[ink(message)]
    fn get_associated_azero_pool(&self, psp22_token: AccountId) -> Result<AccountId, LangError>;

    #[ink(message)]
    fn get_associated_psp22_pool(
        &self,
        psp22_token_a: AccountId,
        psp22_token_b: AccountId,
    ) -> Result<AccountId, LangError>;

    #[ink(message)]
    fn azero_pool_found(&self, psp22_token: AccountId) -> Result<bool, LangError>;

    #[ink(message)]
    fn psp22_pool_found(
        &self,
        psp22_token_a: AccountId,
        psp22_token_b: AccountId,
    ) -> Result<bool, LangError>;

    #[ink(message)]
    fn create_azero_liquidity(
        &mut self,
        psp22_token: AccountId,
        version: u64,
    ) -> Result<AccountId, LangError>;

    #[ink(message)]
    fn create_psp22_liquidity(
        &mut self,
        psp22_token_a: AccountId,
        psp22_token_b: AccountId,
        version: u64,
    ) -> Result<AccountId, LangError>;
}
