use openbrush::{
    contracts::psp22::PSP22Error,
    traits::{AccountId, Balance},
};

#[ink::trait_definition]
pub trait AndromedaCaller {
    #[ink(message)]
    fn swap_psp22_tokens(
        &mut self,
        psp22_token_start: AccountId,
        psp22_token_end: AccountId,
        token_start_amount: Balance,
        slippage: Balance,
    ) -> Result<Balance, PSP22Error>;
}
