#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod doublegreetercaller {
    use greeter::IGreeter;
    use ink::contract_ref;
    use ink::prelude::string::String;

    #[ink(storage)]
    pub struct DoubleGreeterCaller {
        greeter: AccountId,
    }

    impl DoubleGreeterCaller {
        #[ink(constructor)]
        pub fn new(greeter: AccountId) -> Self {
            Self { greeter }
        }
    }

    impl IGreeter for DoubleGreeterCaller {
        #[ink(message)]
        fn greet(&self) -> String {
            let greeter: contract_ref!(IGreeter) = self.greeter.into();
            greeter.greet()
        }

        #[ink(message)]
        fn set_message(&mut self, new_value: String) {
            let mut greeter: contract_ref!(IGreeter) = self.greeter.into();
            greeter.set_message(new_value);
            greeter.set_message(String::from("new_value"));
        }
    }
}
