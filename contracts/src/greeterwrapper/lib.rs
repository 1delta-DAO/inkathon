#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod greeterwrapper {
    use ink::env::{
        call::{build_call, ExecutionInput, Selector},
        DefaultEnvironment,
    };
    use ink::prelude::string::String;

    #[ink(storage)]
    pub struct GreeterWrapper {
        greeter_address: AccountId,
    }

    impl GreeterWrapper {
        #[ink(constructor)]
        pub fn new(greeter_address: AccountId) -> Self {
            Self {
                greeter_address: greeter_address,
            }
        }

        #[ink(message)]
        pub fn set_message(&mut self, new_value: String) {
            pub const SELECTOR: [u8; 4] = [0x1f, 0xe7, 0x42, 0x6f];
            let _call_result = build_call::<DefaultEnvironment>()
                .call(self.greeter_address)
                .exec_input(ExecutionInput::new(Selector::new(SELECTOR)).push_arg(new_value))
                .returns::<()>()
                .invoke();
        }
    }
}
