#![cfg_attr(not(feature = "std"), no_std, no_main)]

mod traits;

pub use traits::IGreeter;

#[ink::contract]
mod doublegretter {
    use crate::IGreeter;
    use ink::prelude::string::String;

    #[ink(event)]
    pub struct Greeted {
        from: Option<AccountId>,
        message: String,
    }

    #[ink(storage)]
    pub struct DoubleGreeter {
        message: String,
        message2: String,
    }

    impl DoubleGreeter {
        /// Creates a new greeter contract initialized with the given value.
        #[ink(constructor)]
        pub fn new(init_value: String) -> Self {
            Self {
                message: init_value.clone(),
                message2: init_value.clone(),
            }
        }

        /// Creates a new greeter contract initialized to 'Hello ink!'.
        #[ink(constructor)]
        pub fn default() -> Self {
            let default_message = String::from("Hello ink!");
            Self::new(default_message)
        }

        #[ink(message)]
        pub fn greet(&self) -> String {
            self.message2.clone()
        }
    }

    impl IGreeter for DoubleGreeter {
        /// Returns the current value of `message`.
        #[ink(message)]
        fn greet(&self) -> String {
            self.message.clone()
        }

        /// Sets `message` to the given value.
        #[ink(message)]
        fn set_message(&mut self, new_value: String) {
            self.message = new_value.clone();
            self.message2 = new_value.clone();

            let from = self.env().caller();

            self.env().emit_event(Greeted {
                from: Some(from),
                message: new_value.clone(),
            });

            self.env().emit_event(Greeted {
                from: Some(from),
                message: new_value.clone(),
            });
        }
    }
}
