#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod greetercaller {
    use greeter::IGreeter;
    use ink::contract_ref;
    use ink::prelude::string::String;

    #[ink(storage)]
    pub struct GreeterCaller {
        greeter: AccountId,
    }

    impl GreeterCaller {
        #[ink(constructor)]
        pub fn new(greeter: AccountId) -> Self {
            Self { greeter }
        }
    }

    impl IGreeter for GreeterCaller {
        #[ink(message)]
        fn greet(&self) -> String {
            let greeter: contract_ref!(IGreeter) = self.greeter.into();
            greeter.greet()
        }

        #[ink(message)]
        fn set_message(&mut self, new_value: String) {
            let mut greeter: contract_ref!(IGreeter) = self.greeter.into();
            greeter.set_message(new_value)
        }
    }
}
