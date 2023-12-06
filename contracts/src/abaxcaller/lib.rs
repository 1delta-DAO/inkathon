#![cfg_attr(not(feature = "std"), no_std, no_main)]

mod abax {
    pub mod traits;
}

#[ink::contract]
mod abaxcaller {
    use crate::abax::traits::lending_pool::LendingPoolView;
    use crate::abax::traits::lending_pool::RuleId;
    use ink::{contract_ref, prelude::vec::Vec};

    #[ink(storage)]
    pub struct AbaxCaller {
        lending_pool_view: contract_ref!(LendingPoolView),
    }

    impl AbaxCaller {
        #[ink(constructor)]
        pub fn new(abax_address: AccountId) -> Self {
            Self {
                lending_pool_view: abax_address.into(),
            }
        }

        #[ink(message)]
        pub fn view_asset_id(&self, asset: AccountId) -> Option<RuleId> {
            self.lending_pool_view.view_asset_id(asset)
        }

        #[ink(message)]
        pub fn view_registered_assets(&self) -> Vec<AccountId> {
            self.lending_pool_view.view_registered_assets()
        }
    }
}
