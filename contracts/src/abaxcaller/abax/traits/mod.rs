/// a trait that must be additionally implemented for PSP22 (PSP55) token to represent users deposits(debts) in `LendingPool` contract.
pub mod abacus_token;
/// `DIA_DATA` oracle interface.
pub mod dia_oracle;
/// a trait that must be implemented by a contract that will receive flash loan
pub mod flash_loan_receiver;
/// a trait implemented by core contract of the protocol. It comes with all the functionalities of Lending.
pub mod lending_pool;
/// the trait implemented that supporst getting prices by the AccountId of an asset. The implementation may be a wrapper on the contract that implements `dia_roacle`.
pub mod price_feed;
