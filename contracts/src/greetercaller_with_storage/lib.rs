#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod greetercaller_with_storage {
    use greeter::IGreeter;
    use ink::contract_ref;
    use ink::prelude::string::String;

    #[ink(storage)]
    pub struct GreetercallerWithStorage {
        greeter: AccountId,
        message: String,
    }

    impl GreetercallerWithStorage {
        #[ink(constructor)]
        pub fn new(greeter: AccountId, message: String) -> Self {
            Self { greeter, message }
        }

        #[ink(message)]
        pub fn greet(&self) -> String {
            self.message.clone()
        }
    }

    impl IGreeter for GreetercallerWithStorage {
        #[ink(message)]
        fn greet(&self) -> String {
            let greeter: contract_ref!(IGreeter) = self.greeter.into();
            greeter.greet()
        }

        #[ink(message)]
        fn set_message(&mut self, new_value: String) {
            self.message = new_value.clone();

            let mut greeter: contract_ref!(IGreeter) = self.greeter.into();
            greeter.set_message(new_value);
        }
    }
}
