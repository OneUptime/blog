# How to Implement Macros for Code Generation in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Macros, Metaprogramming, Code Generation, proc-macro

Description: A practical guide to writing declarative and procedural macros in Rust for code generation and reducing boilerplate.

---

If you've ever found yourself copying and pasting similar code patterns across your Rust codebase, macros are your escape hatch. Rust's macro system lets you write code that writes code - and unlike macros in C or C++, Rust macros are hygienic and operate on the abstract syntax tree rather than plain text substitution.

This guide walks through both declarative macros (macro_rules!) and procedural macros, showing you when and how to use each for real-world code generation.

## Why Macros Matter in Rust

Rust doesn't have inheritance or runtime reflection. When you need to generate repetitive implementations across multiple types, you have two choices: write everything by hand or let the compiler do it for you. Macros give you compile-time code generation with full type checking on the expanded code.

Some common use cases include:

- Implementing traits for many types with slight variations
- Creating domain-specific languages (DSLs)
- Reducing boilerplate in serialization, logging, or database code
- Building test fixtures and assertions

## Declarative Macros with macro_rules!

Declarative macros are the simpler form. You define patterns that match against input tokens and specify what code to generate for each pattern.

### Basic Syntax

Here's a minimal macro that creates a greeting function:

```rust
// Define a macro named 'create_greeter' that generates a function
// The macro takes an identifier and creates a function with that name
macro_rules! create_greeter {
    // Match pattern: expects a single identifier (like a function name)
    ($name:ident) => {
        // Code to generate - a function that returns a greeting string
        fn $name() -> &'static str {
            concat!("Hello from ", stringify!($name), "!")
        }
    };
}

// Using the macro generates the function at compile time
create_greeter!(welcome);
create_greeter!(greet_user);

fn main() {
    println!("{}", welcome());      // "Hello from welcome!"
    println!("{}", greet_user());   // "Hello from greet_user!"
}
```

The `$name:ident` part is a metavariable that captures an identifier from the input. Rust has several fragment specifiers:

- `ident` - identifiers like variable or function names
- `expr` - expressions
- `ty` - types
- `pat` - patterns
- `stmt` - statements
- `block` - block expressions
- `item` - items like functions, structs, impl blocks
- `tt` - a single token tree (the most flexible)

### Pattern Matching with Multiple Arms

Macros can have multiple match arms, similar to regular match expressions:

```rust
// A logging macro that handles different numbers of arguments
// This demonstrates pattern matching with multiple arms
macro_rules! log_event {
    // Arm 1: Just a message
    ($msg:expr) => {
        println!("[LOG] {}", $msg);
    };
    
    // Arm 2: Message with a level
    ($level:expr, $msg:expr) => {
        println!("[{}] {}", $level, $msg);
    };
    
    // Arm 3: Level, message, and key-value context
    ($level:expr, $msg:expr, $($key:expr => $val:expr),*) => {
        print!("[{}] {} | ", $level, $msg);
        $(
            print!("{}={} ", $key, $val);
        )*
        println!();
    };
}

fn main() {
    log_event!("Simple message");
    log_event!("INFO", "Application started");
    log_event!("ERROR", "Connection failed", "host" => "localhost", "port" => 5432);
}
```

### Repetition Patterns

The `$(...)*` syntax handles zero or more repetitions. You can also use `$(...)+` for one or more, or `$(...)?` for zero or one:

```rust
// A macro that generates a struct with named fields from a simple syntax
// This shows how repetition patterns work for variable argument counts
macro_rules! define_struct {
    // Match: struct name followed by zero or more field:type pairs
    ($name:ident { $($field:ident: $ty:ty),* }) => {
        // Generate the struct definition
        #[derive(Debug)]
        struct $name {
            $(
                $field: $ty,
            )*
        }
        
        // Also generate a constructor
        impl $name {
            fn new($($field: $ty),*) -> Self {
                Self {
                    $(
                        $field,
                    )*
                }
            }
        }
    };
}

// Creates a User struct with id, name, and active fields
// Also generates User::new(id, name, active)
define_struct!(User { id: u64, name: String, active: bool });

fn main() {
    let user = User::new(1, "Alice".to_string(), true);
    println!("{:?}", user);
}
```

### Recursive Macros

Macros can call themselves recursively to process lists:

```rust
// A macro that implements a trait for multiple types at once
// Uses recursion to handle an arbitrary list of types
macro_rules! impl_printable {
    // Base case: single type
    ($t:ty) => {
        impl Printable for $t {
            fn print(&self) {
                println!("{}", self);
            }
        }
    };
    
    // Recursive case: handle first type, then call self with the rest
    ($t:ty, $($rest:ty),+) => {
        impl_printable!($t);
        impl_printable!($($rest),+);
    };
}

trait Printable {
    fn print(&self);
}

// Generate Printable impl for all these types in one call
impl_printable!(i32, i64, f32, f64, String, &str);

fn main() {
    42.print();
    "hello".print();
}
```

## Procedural Macros

When declarative macros aren't enough - when you need to parse complex input, perform computations, or generate code based on external data - you need procedural macros. These are Rust functions that take a token stream as input and produce a token stream as output.

Procedural macros must live in their own crate with `proc-macro = true` in Cargo.toml.

### Setting Up a Proc-Macro Crate

First, create a separate crate for your macros:

```toml
# Cargo.toml for your proc-macro crate
[package]
name = "my_macros"
version = "0.1.0"
edition = "2021"

[lib]
proc-macro = true

[dependencies]
# syn parses Rust code into a syntax tree
syn = { version = "2.0", features = ["full"] }
# quote helps generate Rust code from templates
quote = "1.0"
# proc-macro2 provides better token stream handling
proc-macro2 = "1.0"
```

### Derive Macros

Derive macros are the most common type. They let you add `#[derive(YourTrait)]` to structs and enums:

```rust
// In your proc-macro crate's lib.rs
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput, Data, Fields};

// The derive macro that generates a 'describe' method for any struct
#[proc_macro_derive(Describe)]
pub fn derive_describe(input: TokenStream) -> TokenStream {
    // Parse the input tokens into a syntax tree
    let input = parse_macro_input!(input as DeriveInput);
    
    // Get the name of the struct/enum we're implementing for
    let name = &input.ident;
    let name_str = name.to_string();
    
    // Build a description based on the struct's fields
    let field_descriptions = match &input.data {
        Data::Struct(data) => {
            match &data.fields {
                Fields::Named(fields) => {
                    // Collect field names for named structs
                    let field_names: Vec<_> = fields.named
                        .iter()
                        .map(|f| f.ident.as_ref().unwrap().to_string())
                        .collect();
                    format!("fields: {}", field_names.join(", "))
                },
                Fields::Unnamed(fields) => {
                    // Count fields for tuple structs
                    format!("{} unnamed fields", fields.unnamed.len())
                },
                Fields::Unit => "unit struct".to_string(),
            }
        },
        _ => "not a struct".to_string(),
    };
    
    // Generate the implementation using quote!
    let expanded = quote! {
        impl #name {
            pub fn describe() -> &'static str {
                concat!(stringify!(#name), " - ", #field_descriptions)
            }
        }
    };
    
    // Convert back to a TokenStream for the compiler
    TokenStream::from(expanded)
}
```

Usage in your main crate:

```rust
// Import the derive macro from your proc-macro crate
use my_macros::Describe;

// The derive attribute triggers code generation at compile time
#[derive(Describe)]
struct Config {
    host: String,
    port: u16,
    debug: bool,
}

fn main() {
    // The describe() method was generated by our macro
    println!("{}", Config::describe());
    // Output: "Config - fields: host, port, debug"
}
```

### Attribute Macros

Attribute macros are more flexible - they can transform any item and accept custom arguments:

```rust
// An attribute macro that wraps a function with timing instrumentation
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, ItemFn};

#[proc_macro_attribute]
pub fn timed(_attr: TokenStream, item: TokenStream) -> TokenStream {
    // Parse the input as a function
    let input = parse_macro_input!(item as ItemFn);
    
    // Extract function components
    let fn_name = &input.sig.ident;
    let fn_name_str = fn_name.to_string();
    let fn_block = &input.block;
    let fn_sig = &input.sig;
    let fn_vis = &input.vis;
    
    // Generate a new function that wraps the original with timing
    let expanded = quote! {
        #fn_vis #fn_sig {
            let _start = std::time::Instant::now();
            
            // Execute the original function body
            let _result = (|| #fn_block)();
            
            let _elapsed = _start.elapsed();
            println!("[TIMING] {} took {:?}", #fn_name_str, _elapsed);
            
            _result
        }
    };
    
    TokenStream::from(expanded)
}
```

Usage:

```rust
use my_macros::timed;

// The attribute macro transforms this function at compile time
#[timed]
fn expensive_calculation(n: u64) -> u64 {
    (1..=n).product()
}

fn main() {
    let result = expensive_calculation(20);
    // Prints: [TIMING] expensive_calculation took 245ns
    println!("Result: {}", result);
}
```

### Function-like Procedural Macros

These look like function calls but run at compile time:

```rust
// A macro that generates an enum from a comma-separated list
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, Ident, Token, punctuated::Punctuated};
use syn::parse::{Parse, ParseStream};

// Custom parser for our macro input
struct EnumInput {
    name: Ident,
    variants: Punctuated<Ident, Token![,]>,
}

impl Parse for EnumInput {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let name: Ident = input.parse()?;
        input.parse::<Token![:]>()?;
        let variants = Punctuated::parse_terminated(input)?;
        Ok(EnumInput { name, variants })
    }
}

#[proc_macro]
pub fn make_enum(input: TokenStream) -> TokenStream {
    let EnumInput { name, variants } = parse_macro_input!(input as EnumInput);
    
    let expanded = quote! {
        #[derive(Debug, Clone, Copy, PartialEq, Eq)]
        pub enum #name {
            #(#variants),*
        }
    };
    
    TokenStream::from(expanded)
}
```

Usage:

```rust
use my_macros::make_enum;

// Generates a full enum with derive traits
make_enum!(Status: Pending, Running, Completed, Failed);

fn main() {
    let s = Status::Running;
    println!("{:?}", s);
}
```

## When to Use (and Not Use) Macros

Macros are powerful but come with trade-offs.

**Use macros when:**

- You have genuinely repetitive code that can't be abstracted with generics or traits
- You need compile-time code generation based on struct definitions
- You're building a DSL that needs custom syntax
- The alternative is copy-pasting with slight modifications

**Avoid macros when:**

- A generic function would work
- You can use trait implementations instead
- The macro would obscure what's actually happening
- Debugging and error messages would become confusing

Macro errors can be cryptic. When a macro expansion fails, the compiler points to the macro call site, not the generated code. Tools like `cargo expand` help by showing the expanded output, but simpler is usually better.

## Debugging Tips

Use `cargo expand` to see what your macros generate:

```bash
# Install cargo-expand
cargo install cargo-expand

# See expanded code for your crate
cargo expand
```

For procedural macros, print the token stream during development:

```rust
#[proc_macro_derive(Debug)]
pub fn my_derive(input: TokenStream) -> TokenStream {
    // Print the generated code during compilation
    let output = generate_code(input);
    eprintln!("{}", output);
    output
}
```

## Real-World Example: Builder Pattern

Here's a practical derive macro that generates a builder for any struct:

```rust
// A derive macro that generates a builder pattern for structs
// This eliminates the boilerplate of writing builders manually
#[proc_macro_derive(Builder)]
pub fn derive_builder(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let name = &input.ident;
    let builder_name = quote::format_ident!("{}Builder", name);
    
    // Extract fields from the struct
    let fields = match &input.data {
        Data::Struct(data) => match &data.fields {
            Fields::Named(fields) => &fields.named,
            _ => panic!("Builder only works with named fields"),
        },
        _ => panic!("Builder only works with structs"),
    };
    
    // Generate Option-wrapped fields for the builder
    let builder_fields = fields.iter().map(|f| {
        let name = &f.ident;
        let ty = &f.ty;
        quote! { #name: Option<#ty> }
    });
    
    // Generate setter methods
    let setters = fields.iter().map(|f| {
        let name = &f.ident;
        let ty = &f.ty;
        quote! {
            pub fn #name(mut self, value: #ty) -> Self {
                self.#name = Some(value);
                self
            }
        }
    });
    
    // Generate the build method that constructs the final struct
    let build_fields = fields.iter().map(|f| {
        let name = &f.ident;
        quote! {
            #name: self.#name.expect(concat!(stringify!(#name), " is required"))
        }
    });
    
    let expanded = quote! {
        pub struct #builder_name {
            #(#builder_fields),*
        }
        
        impl #name {
            pub fn builder() -> #builder_name {
                #builder_name {
                    #(#fields.iter().map(|f| {
                        let name = &f.ident;
                        quote! { #name: None }
                    })),*
                }
            }
        }
        
        impl #builder_name {
            #(#setters)*
            
            pub fn build(self) -> #name {
                #name {
                    #(#build_fields),*
                }
            }
        }
    };
    
    TokenStream::from(expanded)
}
```

This generates a fluent builder API from just `#[derive(Builder)]` on your struct.

## Wrapping Up

Rust macros let you eliminate boilerplate without sacrificing type safety. Start with declarative macros for simpler cases - they're easier to write and debug. Move to procedural macros when you need to parse complex input or perform logic during code generation.

The key is restraint. A well-placed macro can clean up hundreds of lines of repetitive code. Overused macros turn your codebase into a puzzle. Use them where they genuinely reduce complexity, and keep them well-documented for the next developer who reads your code.

---

*Build maintainable Rust applications monitored by [OneUptime](https://oneuptime.com) - less boilerplate, more observability.*
