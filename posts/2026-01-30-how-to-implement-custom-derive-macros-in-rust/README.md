# How to Implement Custom Derive Macros in Rust

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Rust, Macros, Metaprogramming, Code Generation

Description: Learn how to create custom derive macros in Rust using proc_macro, syn, and quote for automatic trait implementations.

---

Rust's derive macros are one of the most powerful metaprogramming features in the language. They allow you to automatically generate code at compile time, reducing boilerplate and ensuring consistency across your codebase. In this guide, we will walk through creating a custom derive macro from scratch.

## Understanding proc_macro Basics

Procedural macros in Rust operate on the abstract syntax tree (AST) of your code. Unlike declarative macros (`macro_rules!`), procedural macros are written as separate Rust functions that manipulate `TokenStream` values.

To create a derive macro, you need a separate crate with `proc-macro = true` in your `Cargo.toml`:

```toml
[lib]
proc-macro = true

[dependencies]
syn = { version = "2.0", features = ["full"] }
quote = "1.0"
proc-macro2 = "1.0"
```

The `proc_macro` crate provides the foundational `TokenStream` type, which represents a sequence of tokens that the Rust compiler understands. Your derive macro takes a `TokenStream` as input (the annotated struct or enum) and returns a `TokenStream` as output (the generated implementation).

## Parsing with syn

The `syn` crate parses Rust source code into a structured AST. This is essential because working with raw tokens would be extremely tedious. Here is how you parse an input into a `DeriveInput`:

```rust
use proc_macro::TokenStream;
use syn::{parse_macro_input, DeriveInput};

#[proc_macro_derive(MyTrait)]
pub fn my_trait_derive(input: TokenStream) -> TokenStream {
    let ast = parse_macro_input!(input as DeriveInput);

    // ast.ident gives us the struct/enum name
    // ast.data gives us the fields/variants
    // ast.generics gives us any generic parameters

    // ... generate implementation
}
```

The `DeriveInput` struct contains all the information about the annotated item, including its name, visibility, attributes, generics, and data (struct fields or enum variants).

## Code Generation with quote

The `quote` crate provides a convenient way to generate Rust code. It uses a macro that looks like template syntax:

```rust
use quote::quote;
use syn::DeriveInput;

fn impl_my_trait(ast: &DeriveInput) -> proc_macro2::TokenStream {
    let name = &ast.ident;

    quote! {
        impl MyTrait for #name {
            fn describe(&self) -> String {
                format!("This is a {}", stringify!(#name))
            }
        }
    }
}
```

The `#name` syntax interpolates the variable into the generated code. You can also use `#(...)* ` for iteration over collections.

## Complete Example: Implementing a Describe Trait

Let us create a complete derive macro for a `Describe` trait that generates a description based on struct fields:

```rust
// In your proc-macro crate (lib.rs)
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput, Data, Fields};

#[proc_macro_derive(Describe)]
pub fn describe_derive(input: TokenStream) -> TokenStream {
    let ast = parse_macro_input!(input as DeriveInput);
    let name = &ast.ident;

    let fields_description = match &ast.data {
        Data::Struct(data) => {
            match &data.fields {
                Fields::Named(fields) => {
                    let field_names: Vec<_> = fields.named.iter()
                        .map(|f| f.ident.as_ref().unwrap().to_string())
                        .collect();
                    field_names.join(", ")
                }
                Fields::Unnamed(fields) => {
                    format!("{} unnamed fields", fields.unnamed.len())
                }
                Fields::Unit => String::from("no fields"),
            }
        }
        _ => String::from("not a struct"),
    };

    let expanded = quote! {
        impl Describe for #name {
            fn describe(&self) -> String {
                format!(
                    "{} has the following fields: {}",
                    stringify!(#name),
                    #fields_description
                )
            }
        }
    };

    TokenStream::from(expanded)
}
```

Now you can use it in your application:

```rust
use my_macro::Describe;

trait Describe {
    fn describe(&self) -> String;
}

#[derive(Describe)]
struct User {
    name: String,
    email: String,
    age: u32,
}

fn main() {
    let user = User {
        name: "Alice".to_string(),
        email: "alice@example.com".to_string(),
        age: 30,
    };
    println!("{}", user.describe());
    // Output: User has the following fields: name, email, age
}
```

## Testing Your Macros

Testing derive macros requires a different approach. Use the `trybuild` crate for compile-time tests:

```rust
#[test]
fn test_derive() {
    let t = trybuild::TestCases::new();
    t.pass("tests/01-simple.rs");
    t.compile_fail("tests/02-invalid.rs");
}
```

For runtime behavior, create integration tests that use the derived implementations:

```rust
#[test]
fn test_describe_output() {
    #[derive(Describe)]
    struct TestStruct {
        field_a: i32,
        field_b: String,
    }

    let instance = TestStruct {
        field_a: 42,
        field_b: "test".to_string(),
    };

    assert!(instance.describe().contains("field_a"));
    assert!(instance.describe().contains("field_b"));
}
```

## Key Takeaways

Custom derive macros are powerful tools for reducing boilerplate in Rust. The combination of `proc_macro` for the macro infrastructure, `syn` for parsing, and `quote` for code generation provides a robust foundation for metaprogramming. Start with simple traits and gradually add complexity as you become comfortable with the AST manipulation patterns. Remember that compile-time errors from macros can be cryptic, so invest time in providing helpful error messages using `syn::Error` for a better developer experience.
