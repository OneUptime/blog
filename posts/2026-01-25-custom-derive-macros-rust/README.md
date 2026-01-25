# How to Reduce Boilerplate with Custom Derive Macros in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Macros, Derive, Metaprogramming, Code Generation

Description: Learn how to create custom derive macros in Rust to eliminate repetitive code and generate trait implementations automatically at compile time.

---

If you've written Rust for any length of time, you've probably typed `#[derive(Debug, Clone)]` dozens of times. These derive macros save us from writing tedious trait implementations by hand. But what happens when you need custom behavior that the standard derives don't provide? That's where custom derive macros come in.

In this guide, we'll build a custom derive macro from scratch. By the end, you'll understand how procedural macros work and how to use them to eliminate boilerplate in your own projects.

## Why Custom Derive Macros?

Consider a scenario where you're building a REST API and need to convert many structs into URL query parameters. Without macros, you'd write something like this for every struct:

```rust
struct UserFilter {
    name: Option<String>,
    age: Option<u32>,
    active: Option<bool>,
}

impl UserFilter {
    fn to_query_params(&self) -> Vec<(String, String)> {
        let mut params = Vec::new();
        if let Some(ref name) = self.name {
            params.push(("name".to_string(), name.clone()));
        }
        if let Some(ref age) = self.age {
            params.push(("age".to_string(), age.to_string()));
        }
        if let Some(ref active) = self.active {
            params.push(("active".to_string(), active.to_string()));
        }
        params
    }
}
```

Now imagine doing this for 20 different filter structs. That's a lot of repetitive code that's easy to get wrong. A custom derive macro lets you write `#[derive(ToQueryParams)]` and have the compiler generate all of it.

## Setting Up Your Macro Crate

Procedural macros must live in their own crate with `proc-macro = true` in Cargo.toml. Let's set one up:

```toml
# Cargo.toml for the macro crate
[package]
name = "query_params_derive"
version = "0.1.0"
edition = "2021"

[lib]
proc-macro = true

[dependencies]
syn = { version = "2.0", features = ["full"] }
quote = "1.0"
proc-macro2 = "1.0"
```

The key dependencies are:
- **syn**: Parses Rust code into a syntax tree we can inspect
- **quote**: Lets us generate new Rust code using a template syntax
- **proc-macro2**: Bridges between the compiler's proc-macro types and syn/quote

## Building the Derive Macro

Here's our complete derive macro implementation:

```rust
// src/lib.rs in query_params_derive crate
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput, Data, Fields};

#[proc_macro_derive(ToQueryParams)]
pub fn derive_to_query_params(input: TokenStream) -> TokenStream {
    // Parse the input tokens into a syntax tree
    let input = parse_macro_input!(input as DeriveInput);

    // Get the name of the struct we're deriving for
    let name = input.ident;

    // Extract fields from the struct
    let fields = match input.data {
        Data::Struct(data) => match data.fields {
            Fields::Named(fields) => fields.named,
            _ => panic!("ToQueryParams only supports structs with named fields"),
        },
        _ => panic!("ToQueryParams only supports structs"),
    };

    // Generate code for each field
    let field_conversions = fields.iter().map(|field| {
        let field_name = field.ident.as_ref().unwrap();
        let field_name_str = field_name.to_string();

        quote! {
            if let Some(ref value) = self.#field_name {
                params.push((#field_name_str.to_string(), value.to_string()));
            }
        }
    });

    // Generate the final implementation
    let expanded = quote! {
        impl #name {
            pub fn to_query_params(&self) -> Vec<(String, String)> {
                let mut params = Vec::new();
                #(#field_conversions)*
                params
            }
        }
    };

    TokenStream::from(expanded)
}
```

Let's break down what's happening:

1. **parse_macro_input!** converts the raw token stream into a `DeriveInput` struct that represents the item our derive is attached to.

2. We extract the struct name with `input.ident` - this is what we'll use in the generated `impl` block.

3. We pattern match on `input.data` to get the struct's fields. We panic if it's not a struct with named fields since our macro only handles that case.

4. For each field, we generate code that checks if the `Option` has a value and adds it to the params vector. The `quote!` macro lets us write Rust code as a template, with `#field_name` inserting our variable.

5. Finally, we combine everything into the full `impl` block. The `#(#field_conversions)*` syntax repeats the conversion code for each field.

## Using the Macro

In your main project, add the macro crate as a dependency and use it:

```rust
use query_params_derive::ToQueryParams;

#[derive(ToQueryParams)]
struct UserFilter {
    name: Option<String>,
    age: Option<u32>,
    active: Option<bool>,
}

fn main() {
    let filter = UserFilter {
        name: Some("Alice".to_string()),
        age: None,
        active: Some(true),
    };

    let params = filter.to_query_params();
    // Result: [("name", "Alice"), ("active", "true")]

    println!("{:?}", params);
}
```

That's it. The macro generates the entire `to_query_params` implementation at compile time.

## Adding Attribute Support

Custom derives become more powerful when you add attributes. Let's extend our macro to support renaming fields in the output:

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput, Data, Fields, Attribute, Expr, Lit, Meta};

#[proc_macro_derive(ToQueryParams, attributes(query_param))]
pub fn derive_to_query_params(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    let name = input.ident;

    let fields = match input.data {
        Data::Struct(data) => match data.fields {
            Fields::Named(fields) => fields.named,
            _ => panic!("ToQueryParams only supports structs with named fields"),
        },
        _ => panic!("ToQueryParams only supports structs"),
    };

    let field_conversions = fields.iter().map(|field| {
        let field_name = field.ident.as_ref().unwrap();

        // Check for #[query_param(rename = "...")] attribute
        let param_name = get_rename_value(&field.attrs)
            .unwrap_or_else(|| field_name.to_string());

        quote! {
            if let Some(ref value) = self.#field_name {
                params.push((#param_name.to_string(), value.to_string()));
            }
        }
    });

    let expanded = quote! {
        impl #name {
            pub fn to_query_params(&self) -> Vec<(String, String)> {
                let mut params = Vec::new();
                #(#field_conversions)*
                params
            }
        }
    };

    TokenStream::from(expanded)
}

// Helper function to extract rename value from attributes
fn get_rename_value(attrs: &[Attribute]) -> Option<String> {
    for attr in attrs {
        if attr.path().is_ident("query_param") {
            if let Meta::List(meta_list) = &attr.meta {
                let tokens = meta_list.tokens.to_string();
                // Parse "rename = \"value\""
                if tokens.starts_with("rename") {
                    if let Some(value) = tokens.split('"').nth(1) {
                        return Some(value.to_string());
                    }
                }
            }
        }
    }
    None
}
```

Now you can customize field names:

```rust
#[derive(ToQueryParams)]
struct SearchParams {
    #[query_param(rename = "q")]
    query: Option<String>,

    #[query_param(rename = "p")]
    page: Option<u32>,

    limit: Option<u32>,  // Uses field name as-is
}
```

## Debugging Tips

Developing macros can be tricky because errors happen at compile time. Here are some strategies:

**Use cargo-expand**: Install it with `cargo install cargo-expand`, then run `cargo expand` to see the generated code. This shows exactly what your macro produces.

**Start simple**: Get a basic version working before adding features. Print intermediate values during development using `eprintln!` in your macro code - it outputs during compilation.

**Test incrementally**: Create a small test crate that uses your macro and compile frequently. Macro errors can be cryptic, so catching them early helps.

## Performance Considerations

Derive macros run at compile time, so they add zero runtime overhead. The generated code is identical to what you'd write by hand. This makes them perfect for eliminating boilerplate without sacrificing performance.

However, complex macros can slow down compilation. If your macro does heavy processing, consider caching results or simplifying the logic.

## When to Use Custom Derives

Custom derive macros shine when you have:

- A trait that many structs need to implement
- Implementations that follow a predictable pattern based on struct fields
- Code that would otherwise be copy-pasted with minor variations

They're less suitable when each implementation needs unique logic or when the pattern is used by only a few types.

## Wrapping Up

Custom derive macros are one of Rust's most powerful features for reducing boilerplate. They let you extend the language in a type-safe way while keeping your codebase clean and maintainable.

The initial learning curve is steep, especially understanding syn's data structures. But once you've built a few macros, the pattern becomes natural. Start with simple cases, use cargo-expand liberally, and build up complexity gradually.

Your future self will thank you every time you type `#[derive(YourMacro)]` instead of copying another 50 lines of implementation code.

**Related Reading:**

- [Rust by Example - Macros](https://doc.rust-lang.org/rust-by-example/macros.html)
- [The Little Book of Rust Macros](https://danielkeep.github.io/tlborm/book/)
