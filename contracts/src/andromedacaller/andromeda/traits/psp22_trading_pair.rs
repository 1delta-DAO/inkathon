#[ink::trait_definition]
pub trait PSP22TradingPair {
    #[ink(message, selector = 0xba045271)]
    fn get_tokens(&self) -> Vec<AccountId>;

    #[ink(message, selector = 0xbf73316b)]
    fn creator(&self) -> AccountId;

    #[ink(message, selector = 0x79718546)]
    fn get_account_id(&self) -> AccountId;

    #[ink(message, selector = 0x999e3d9b)]
    fn get_shares(&self, account: AccountId) -> u128;

    #[ink(message, selector = 0x755e2027)]
    fn get_supply(&self) -> u128;

    #[ink(message, selector = 0x251247aa)]
    fn is_azero_pool(&self) -> bool;

    #[ink(message, selector = 0x264cd04b)]
    fn add_liquidity(
        &mut self,
        psp22_token_a_deposit_amount: Balance,
        psp22_token_b_deposit_amount: Balance,
        slippage: Balance,
    ) -> ();

    #[ink(message, selector = 0xbdd16bfa)]
    fn remove_liquidity(&mut self, amount_in_shares: Balance) -> ();

    #[ink(message, selector = 0x19dca244)]
    fn transactions_count(&self) -> u128;

    #[ink(message, selector = 0x45c43339)]
    fn swap_psp22_token_a(
        &mut self,
        psp22_a_amount_in: Balance,
        psp22_b_amount_out: Balance,
        slippage: Balance,
    ) -> ();

    #[ink(message, selector = 0xd9a228b3)]
    fn swap_psp22_token_b(
        &mut self,
        psp22_b_amount_in: Balance,
        psp22_a_amount_out: Balance,
        slippage: Balance,
    ) -> ();

    #[ink(message, selector = 0x71e9af3a)]
    fn get_psp22_b_amount_out(&self, amount: Balance) -> u128;

    #[ink(message, selector = 0x7d22968c)]
    fn get_psp22_a_amount_out(&self, amount: Balance) -> u128;

    #[ink(message, selector = 0x26e48145)]
    fn get_token_balances(&self) -> Vec<u128>;

    #[ink(message, selector = 0x26c06684)]
    fn get_fees(&self, account: AccountId) -> u128;
}
