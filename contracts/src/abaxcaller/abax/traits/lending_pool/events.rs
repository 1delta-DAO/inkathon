use ink::prelude::string::String;
pub trait EmitDepositEvents {
    fn _emit_deposit_event(
        &mut self,
        asset: AccountId,
        caller: AccountId,
        on_behalf_of: AccountId,
        amount: Balance,
    );
    fn _emit_redeem_event(
        &mut self,
        asset: AccountId,
        caller: AccountId,
        on_behalf_of: AccountId,
        amount: Balance,
    );
}

pub trait EmitBorrowEvents {
    fn _emit_market_rule_chosen(&mut self, user: &AccountId, market_rule_id: &RuleId);
    fn _emit_collateral_set_event(&mut self, asset: AccountId, user: AccountId, set: bool);
    fn _emit_borrow_variable_event(
        &mut self,
        asset: AccountId,
        caller: AccountId,
        on_behalf_of: AccountId,
        amount: Balance,
    );
    fn _emit_repay_variable_event(
        &mut self,
        asset: AccountId,
        caller: AccountId,
        on_behalf_of: AccountId,
        amount: Balance,
    );
}

pub trait EmitConfigureEvents {
    fn _emit_choose_rule_event(&mut self, caller: AccountId, rule_id: u64);
}

pub trait EmitFlashEvents {
    fn _emit_flash_loan_event(
        &mut self,
        receiver: AccountId,
        caller: AccountId,
        asset: AccountId,
        amount: u128,
        fee: u128,
    );
}

pub trait EmitLiquidateEvents {
    fn _emit_liquidation_variable_event(
        &mut self,
        liquidator: AccountId,
        user: AccountId,
        asset_to_rapay: AccountId,
        asset_to_take: AccountId,
        amount_repaid: Balance,
        amount_taken: Balance,
    );
}

pub trait EmitMaintainEvents {
    fn _emit_accumulate_interest_event(&mut self, asset: &AccountId);
    fn _emit_accumulate_user_interest_event(&mut self, asset: &AccountId, user: &AccountId);
    fn _emit_rebalance_rate_event(&mut self, asset: &AccountId, user: &AccountId);
}

pub trait EmitManageEvents {
    fn _emit_price_feed_provider_changed_event(&mut self, asset: &AccountId);

    fn _emit_flash_loan_fee_e6_changed_event(&mut self, flash_loan_fee_e6: &u128);
    fn _emit_asset_registered_event(
        &mut self,
        asset: &AccountId,
        name: String,
        symbol: String,
        decimals: u8,
        a_token_code_hash: &[u8; 32],
        v_token_code_hash: &[u8; 32],
        a_token_address: &AccountId,
        v_token_address: &AccountId,
    );

    fn _emit_reserve_activated_event(&mut self, asset: &AccountId, active: bool);
    fn _emit_reserve_freezed_event(&mut self, asset: &AccountId, freezed: bool);

    fn _emit_reserve_parameters_changed_event(
        &mut self,
        asset: &AccountId,
        interest_rate_model: &[u128; 7],
        income_for_suppliers_part_e6: u128,
    );

    fn _emit_reserve_restrictions_changed_event(
        &mut self,
        asset: &AccountId,
        maximal_total_deposit: Option<Balance>,
        maximal_total_debt: Option<Balance>,
        minimal_collateral: Balance,
        minimal_debt: Balance,
    );

    fn _emit_asset_rules_changed_event(
        &mut self,
        market_rule_id: &u32,
        asset: &AccountId,
        asset_rules: &AssetRules,
    );

    fn _emit_stablecoin_debt_rate_changed(&mut self, asset: &AccountId, debt_rate_e18: &u128);
    fn _emit_income_taken(&mut self, asset: &AccountId);
}
