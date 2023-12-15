#[ink::trait_definition]
pub trait Router {
    #[ink(message, selector = 0x611A3052)]
    fn get_associated_azero_pool(&self, psp22_token: AccountId) -> AccountId;

    #[ink(message, selector = 0xA3C62862)]
    fn get_associated_psp22_pool(
        &self,
        psp22_token_a: AccountId,
        psp22_token_b: AccountId,
    ) -> AccountId;

    #[ink(message, selector = 0x95C5D2C8)]
    fn azero_pool_found(&self, psp22_token: AccountId) -> bool;

    #[ink(message, selector = 0x026E8C83)]
    fn psp22_pool_found(&self, psp22_token_a: AccountId, psp22_token_b: AccountId) -> bool;

    #[ink(message, selector = 0x23C6FFAD)]
    fn create_azero_liquidity(&mut self, psp22_token: AccountId, version: u64) -> AccountId;

    #[ink(message, selector = 0x50495B96)]
    fn create_psp22_liquidity(
        &mut self,
        psp22_token_a: AccountId,
        psp22_token_b: AccountId,
        version: u64,
    ) -> AccountId;
}
