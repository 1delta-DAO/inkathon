/// Contains most often used data of a reserve
#[derive(Debug, Encode, Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub struct ReserveData {
    /// if false deposits, redeems, borrows, repays, liquidate are blocked
    pub activated: bool,
    /// if true deposits and borrows are blocked
    pub freezed: bool,

    /// total deposit of underlying asset. It is sum of deposits and of accumulated interests. Total deposit of aToken.
    pub total_deposit: Balance,
    /// current interest rate for deposited tokens per millisecond. 10^24 = 100%  millisecond Percentage Rate.
    pub current_deposit_rate_e24: u128,

    /// total debt. It is sum of debts with accumulated interests. Total supply of vToken.
    pub total_debt: Balance,
    // current interest rate for debt per millisecond. 10^24 = 100%  millisecond Percentage Rate.
    pub current_debt_rate_e24: u128,

    /// timestamp of the last update of the rate indexes
    pub indexes_update_timestamp: Timestamp,
}
