#![cfg_attr(not(feature = "std"), no_std, no_main)]

use ink::prelude::string::String;

#[ink::trait_definition]
pub trait IGreeter {
    #[ink(message)]
    fn greet(&self) -> String;

    #[ink(message)]
    fn set_message(&mut self, new_value: String);
}
