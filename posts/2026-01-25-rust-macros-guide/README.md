# How to Use Macros in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Macros, Metaprogramming, Code Generation, Productivity

Description: A practical guide to writing and using macros in Rust. Learn declarative macros with macro_rules!, procedural macros, and when to choose each approach for code generation.

---

Macros are a powerful feature in Rust that allow you to write code that generates other code. They reduce boilerplate, enable DSLs (domain-specific languages), and make your code more expressive. This guide covers both declarative macros (macro_rules!) and introduces procedural macros.

## Understanding Macros

Macros operate on the syntax level, transforming code before it is compiled. They are identified by the exclamation mark: `println!`, `vec!`, `assert!`.

```rust
fn main() {
    // These are all macro invocations
    println!("Hello, world!");
    let v = vec![1, 2, 3];
    assert_eq!(2 + 2, 4);

    // Macros can use different delimiters
    println!("Parentheses");
    println!["Brackets"];
    println!{"Braces"};
}
```

## Declarative Macros with macro_rules!

Declarative macros use pattern matching to generate code.

### Basic Syntax

```rust
// Define a simple macro
macro_rules! say_hello {
    () => {
        println!("Hello!");
    };
}

// Macro with an argument
macro_rules! greet {
    ($name:expr) => {
        println!("Hello, {}!", $name);
    };
}

fn main() {
    say_hello!();           // Prints: Hello!
    greet!("Alice");        // Prints: Hello, Alice!
    greet!(String::from("Bob")); // Also works with expressions
}
```

### Fragment Specifiers

Macros use fragment specifiers to match different types of syntax.

```rust
macro_rules! show_fragments {
    // expr - any expression
    (expr: $e:expr) => {
        println!("Expression: {:?}", $e);
    };

    // ident - identifier (variable or function name)
    (ident: $i:ident) => {
        let $i = 42;
        println!("Created variable {} = {}", stringify!($i), $i);
    };

    // ty - type
    (ty: $t:ty) => {
        let _: $t = Default::default();
        println!("Type: {}", stringify!($t));
    };

    // pat - pattern
    (pat: $p:pat) => {
        match Some(42) {
            $p => println!("Pattern matched!"),
            _ => println!("No match"),
        }
    };

    // stmt - statement
    (stmt: $s:stmt) => {
        $s
        println!("Statement executed");
    };

    // block - block expression
    (block: $b:block) => {
        let result = $b;
        println!("Block result: {:?}", result);
    };

    // literal - literal value
    (literal: $l:literal) => {
        println!("Literal: {}", $l);
    };

    // tt - token tree (flexible, matches almost anything)
    (tt: $($t:tt)*) => {
        println!("Token trees: {}", stringify!($($t)*));
    };
}

fn main() {
    show_fragments!(expr: 1 + 2);
    show_fragments!(ident: my_var);
    show_fragments!(ty: String);
    show_fragments!(literal: "hello");
    show_fragments!(tt: some random tokens here);
}
```

### Repetition

Macros can match repeated patterns.

```rust
// Match zero or more items
macro_rules! create_vec {
    // $() defines the pattern to repeat
    // $e:expr matches each element
    // ,* means comma-separated, zero or more
    ($($e:expr),*) => {
        {
            let mut v = Vec::new();
            $(
                v.push($e);
            )*
            v
        }
    };
}

// Match one or more items
macro_rules! min {
    // Base case: single element
    ($x:expr) => ($x);
    // Recursive case: compare first with min of rest
    ($x:expr, $($rest:expr),+) => {
        std::cmp::min($x, min!($($rest),+))
    };
}

// Match with different separators
macro_rules! make_pairs {
    // => as separator
    ($($key:expr => $value:expr),*) => {
        vec![$(($key, $value)),*]
    };
}

fn main() {
    let v = create_vec![1, 2, 3, 4, 5];
    println!("Vec: {:?}", v);

    let smallest = min!(5, 2, 8, 1, 9);
    println!("Min: {}", smallest);

    let pairs = make_pairs!["a" => 1, "b" => 2, "c" => 3];
    println!("Pairs: {:?}", pairs);
}
```

### Multiple Arms

Macros can have multiple matching arms.

```rust
macro_rules! calculate {
    // Addition
    (add $a:expr, $b:expr) => {
        $a + $b
    };
    // Subtraction
    (sub $a:expr, $b:expr) => {
        $a - $b
    };
    // Multiplication
    (mul $a:expr, $b:expr) => {
        $a * $b
    };
    // Division with error handling
    (div $a:expr, $b:expr) => {
        if $b != 0 {
            Some($a / $b)
        } else {
            None
        }
    };
}

fn main() {
    println!("10 + 5 = {}", calculate!(add 10, 5));
    println!("10 - 5 = {}", calculate!(sub 10, 5));
    println!("10 * 5 = {}", calculate!(mul 10, 5));
    println!("10 / 5 = {:?}", calculate!(div 10, 5));
    println!("10 / 0 = {:?}", calculate!(div 10, 0));
}
```

## Practical Macro Examples

### Implement Trait for Multiple Types

```rust
trait Describe {
    fn describe(&self) -> String;
}

// Implement Describe for multiple numeric types at once
macro_rules! impl_describe_for_numeric {
    ($($t:ty),*) => {
        $(
            impl Describe for $t {
                fn describe(&self) -> String {
                    format!("{} ({})", self, stringify!($t))
                }
            }
        )*
    };
}

impl_describe_for_numeric!(i8, i16, i32, i64, u8, u16, u32, u64, f32, f64);

fn main() {
    let x: i32 = 42;
    let y: f64 = 3.14;
    println!("{}", x.describe());  // 42 (i32)
    println!("{}", y.describe());  // 3.14 (f64)
}
```

### Builder Pattern Macro

```rust
macro_rules! builder {
    ($name:ident { $($field:ident: $ty:ty),* $(,)? }) => {
        pub struct $name {
            $($field: $ty),*
        }

        paste::paste! {
            pub struct [<$name Builder>] {
                $($field: Option<$ty>),*
            }

            impl [<$name Builder>] {
                pub fn new() -> Self {
                    Self {
                        $($field: None),*
                    }
                }

                $(
                    pub fn $field(mut self, value: $ty) -> Self {
                        self.$field = Some(value);
                        self
                    }
                )*

                pub fn build(self) -> Result<$name, &'static str> {
                    Ok($name {
                        $(
                            $field: self.$field.ok_or(concat!(
                                stringify!($field), " is required"
                            ))?
                        ),*
                    })
                }
            }
        }
    };
}

// Usage (requires paste crate for identifier concatenation)
// builder!(User { name: String, age: u32 });
```

### Simple Hashmap Macro

```rust
macro_rules! hashmap {
    () => {
        std::collections::HashMap::new()
    };
    ($($key:expr => $value:expr),+ $(,)?) => {
        {
            let mut map = std::collections::HashMap::new();
            $(
                map.insert($key, $value);
            )+
            map
        }
    };
}

fn main() {
    let empty = hashmap!();
    let scores = hashmap! {
        "Alice" => 100,
        "Bob" => 85,
        "Charlie" => 92,
    };

    println!("Empty: {:?}", empty);
    println!("Scores: {:?}", scores);
}
```

### Error Handling Macro

```rust
macro_rules! try_or_return {
    ($expr:expr, $default:expr) => {
        match $expr {
            Ok(val) => val,
            Err(_) => return $default,
        }
    };
}

macro_rules! ensure {
    ($cond:expr, $err:expr) => {
        if !$cond {
            return Err($err);
        }
    };
}

fn parse_positive(s: &str) -> Result<u32, &'static str> {
    let num: i32 = try_or_return!(s.parse(), Err("not a number"));
    ensure!(num > 0, "not positive");
    Ok(num as u32)
}

fn main() {
    println!("{:?}", parse_positive("42"));
    println!("{:?}", parse_positive("-5"));
    println!("{:?}", parse_positive("abc"));
}
```

### Test Generation Macro

```rust
macro_rules! test_cases {
    ($name:ident: $func:ident, $($input:expr => $expected:expr),+ $(,)?) => {
        mod $name {
            use super::*;

            $(
                paste::paste! {
                    #[test]
                    fn [<test_ $name _ $input:lower>]() {
                        assert_eq!($func($input), $expected);
                    }
                }
            )+
        }
    };
}

fn double(x: i32) -> i32 {
    x * 2
}

// This would generate multiple test functions
// test_cases!(double_tests: double, 1 => 2, 2 => 4, 5 => 10);
```

## Macro Debugging

Use `cargo expand` to see what your macros generate.

```bash
# Install cargo-expand
cargo install cargo-expand

# View expanded code
cargo expand
```

You can also use `println!` and `stringify!` for debugging:

```rust
macro_rules! debug_macro {
    ($($tokens:tt)*) => {
        // Print what was passed to the macro
        println!("Input tokens: {}", stringify!($($tokens)*));

        // Then do the actual work
        $($tokens)*
    };
}

fn main() {
    debug_macro!(let x = 5 + 3);
    println!("x = {}", x);
}
```

## Procedural Macros (Brief Overview)

Procedural macros are more powerful but require a separate crate. There are three types:

### Derive Macros

```rust
// In a proc-macro crate
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, DeriveInput};

#[proc_macro_derive(HelloMacro)]
pub fn hello_macro_derive(input: TokenStream) -> TokenStream {
    let ast = parse_macro_input!(input as DeriveInput);
    let name = &ast.ident;

    let gen = quote! {
        impl HelloMacro for #name {
            fn hello_macro() {
                println!("Hello from {}!", stringify!(#name));
            }
        }
    };

    gen.into()
}
```

### Attribute Macros

```rust
#[proc_macro_attribute]
pub fn route(attr: TokenStream, item: TokenStream) -> TokenStream {
    // Transform the function based on the attribute
    item
}

// Usage: #[route(GET, "/")]
```

### Function-like Macros

```rust
#[proc_macro]
pub fn sql(input: TokenStream) -> TokenStream {
    // Parse SQL and generate code
    input
}

// Usage: sql!(SELECT * FROM users WHERE id = 1)
```

## When to Use Macros

Use macros when you need to:

1. Reduce repetitive boilerplate code
2. Create variadic functions (functions with variable arguments)
3. Generate code based on patterns
4. Create domain-specific languages
5. Implement traits for many types at once

Avoid macros when:

1. A function or generic would work
2. The macro is hard to understand or debug
3. Compile-time error messages would be confusing

## Summary

Macros in Rust provide powerful metaprogramming capabilities:

- **Declarative macros** (macro_rules!) use pattern matching for simple code generation
- **Procedural macros** offer full programmatic control over code generation
- Fragment specifiers ($e:expr, $i:ident, etc.) match different syntax elements
- Repetition patterns ($(...)*) handle variable numbers of arguments

Key practices:

- Start simple and add complexity as needed
- Use `cargo expand` to debug macro output
- Document your macros with examples
- Prefer functions and generics when they suffice
- Test macro output thoroughly

Macros are a powerful tool that, when used appropriately, can make your Rust code more expressive and maintainable.
