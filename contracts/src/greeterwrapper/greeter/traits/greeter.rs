use ink::prelude::string::String;

#[ink::trait_definition]
pub trait Greeter {
    #[ink(message, selector = 0x1fe7426f)]
    fn set_message(&mut self, new_value: String);

    #[ink(message, selector = 0x052cda08)]
    fn greet(&self) -> String;
}
