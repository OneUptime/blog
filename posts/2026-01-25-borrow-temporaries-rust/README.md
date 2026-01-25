# How to Borrow Temporaries in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Lifetimes, Temporaries, References, Borrow Checker

Description: Learn how Rust handles temporary values and when you can borrow them. Understand temporary lifetime extension and common pitfalls when working with temporaries in Rust.

---

Temporary values in Rust are values created during expression evaluation that do not have explicit variable bindings. Understanding how long temporaries live and when you can borrow them is crucial for writing correct Rust code.

## What Are Temporaries?

Temporaries are unnamed values created during expression evaluation:

```rust
fn main() {
    // The String is a temporary - created and immediately borrowed
    let s: &str = &String::from("hello");
    println!("{}", s);  // Works! Temporary lifetime is extended

    // Another temporary example
    let len = String::from("hello").len();
    println!("Length: {}", len);

    // Temporary struct
    struct Config {
        value: i32,
    }
    let v = Config { value: 42 }.value;
    println!("Value: {}", v);
}
```

## Temporary Lifetime Extension

When you bind a reference to a temporary, Rust extends the temporary's lifetime to match the reference:

```rust
fn main() {
    // Temporary lifetime extension in action
    let r: &String = &String::from("extended");
    // The String lives as long as r

    println!("{}", r);

    // This also works with nested temporaries
    let inner: &str = &String::from("nested").to_uppercase();
    println!("{}", inner);

    // Works in let statements
    let config: &Config = &Config::new();
    config.use_it();
}

struct Config {
    data: String,
}

impl Config {
    fn new() -> Self {
        Config { data: "config".to_string() }
    }

    fn use_it(&self) {
        println!("Config: {}", self.data);
    }
}
```

## When Temporaries Die Early

Temporaries without lifetime extension die at the end of their statement:

```rust
fn get_string() -> String {
    String::from("temporary")
}

fn main() {
    // This works - temporary extended
    let s: &str = &get_string();
    println!("{}", s);

    // This would fail - temporary dies too soon
    // let borrowed;
    // borrowed = &get_string();  // Error: temporary dropped
    // println!("{}", borrowed);

    // Fixed by extending lifetime explicitly
    let owned = get_string();
    let borrowed = &owned;
    println!("{}", borrowed);
}
```

## Temporaries in Function Calls

Passing temporaries to functions that take references is safe:

```rust
fn print_len(s: &str) {
    println!("Length: {}", s.len());
}

fn process_config(config: &Config) {
    println!("Processing: {:?}", config);
}

#[derive(Debug)]
struct Config {
    name: String,
}

fn main() {
    // Temporary lives for the duration of the function call
    print_len(&String::from("hello"));

    // Same for structs
    process_config(&Config { name: "test".to_string() });

    // Chained method calls work too
    let upper = String::from("hello").to_uppercase();
    print_len(&upper);
}
```

## The Match Scrutinee Rule

Temporaries in match expressions live until the end of the match:

```rust
fn get_option() -> Option<String> {
    Some(String::from("value"))
}

fn main() {
    // Temporary lives through all match arms
    match &get_option() {
        Some(s) => println!("Got: {}", s),
        None => println!("None"),
    }

    // Also works with if let
    if let Some(s) = &get_option() {
        println!("Got: {}", s);
        // s is valid here
    }

    // Compared to this which would fail:
    // let opt = &get_option();  // This works
    // But the reference in match is special
}
```

## Common Pitfalls

### Pitfall 1: Returning References to Temporaries

```rust
// This won't compile
// fn bad() -> &str {
//     &String::from("bad")  // Temporary dropped at end of function
// }

// Fix: return owned value
fn good() -> String {
    String::from("good")
}

// Or return static string
fn also_good() -> &'static str {
    "static"
}
```

### Pitfall 2: Storing Temporaries in Struct Fields

```rust
// This won't work
// struct Bad<'a> {
//     data: &'a str,
// }
// let bad = Bad { data: &String::from("temp") };

// Fix: store owned data
struct Good {
    data: String,
}

fn main() {
    let good = Good { data: String::from("owned") };
    println!("{}", good.data);
}
```

### Pitfall 3: Temporaries in Conditionals

```rust
fn get_name() -> String {
    String::from("Alice")
}

fn main() {
    // This works - temporary extended for the if expression
    if get_name().starts_with("A") {
        println!("Name starts with A");
    }

    // But this doesn't - temporary dies before use
    // let starts_a;
    // starts_a = get_name().starts_with("A");  // OK, bool is Copy
    // But:
    // let first_char;
    // first_char = &get_name().chars().next();  // Error!

    // Fix: bind the temporary
    let name = get_name();
    let first_char = name.chars().next();
    println!("First char: {:?}", first_char);
}
```

## Temporary Extension Rules

The rules for when temporaries are extended:

```rust
fn main() {
    // Rule 1: Direct let binding with reference
    let r: &String = &String::from("extended");  // Extended

    // Rule 2: In a block that ends in a reference expression
    let r2: &i32 = &{
        let x = 42;
        x  // x is copied, then referenced
    };
    println!("{}", r2);

    // Rule 3: Pattern matching extends temporaries
    let (a, b): (&String, &String) = (&String::from("a"), &String::from("b"));
    println!("{} {}", a, b);

    // NOT extended: intermediate variables
    // let temp = String::from("not extended");
    // let r = &temp;  // temp dies at end of statement? No, temp is named

    // Actually, named variables are NOT temporaries
    // This distinction matters
}
```

## Working with Temporary Closures

Closures capturing temporaries need care:

```rust
fn main() {
    // This works - closure takes ownership
    let process = || String::from("owned").to_uppercase();
    println!("{}", process());

    // This also works - temporary used immediately
    let result = (|| String::from("lambda"))();
    println!("{}", result);

    // Be careful with references in closures
    let s = String::from("captured");
    let get_ref = || &s;  // Borrows s
    println!("{}", get_ref());

    // This would fail:
    // let bad = || &String::from("temp");  // Temporary dies
}
```

## Best Practices

```rust
fn main() {
    // Good: Temporary directly in function call
    print_data(&create_data());

    // Good: Temporary bound to reference variable
    let data: &Data = &create_data();
    use_data(data);

    // Good: Method chaining on temporaries
    let result = create_data()
        .process()
        .finalize();
    println!("{}", result);

    // Avoid: Complex temporary lifetimes
    // When in doubt, bind to a variable first
    let intermediate = create_data();
    let processed = intermediate.process();
    let result = processed.finalize();
    println!("{}", result);
}

struct Data {
    value: i32,
}

impl Data {
    fn process(self) -> Data {
        Data { value: self.value * 2 }
    }

    fn finalize(self) -> i32 {
        self.value
    }
}

fn create_data() -> Data {
    Data { value: 21 }
}

fn print_data(data: &Data) {
    println!("Data: {}", data.value);
}

fn use_data(data: &Data) {
    println!("Using: {}", data.value);
}
```

## Summary

| Scenario | Lifetime |
|----------|----------|
| `let r: &T = &temp;` | Extended to `r`'s scope |
| Function argument `f(&temp)` | Lives for function call |
| Match scrutinee `match &temp {}` | Lives through match |
| Method chain `temp.method()` | Statement only |
| Stored in struct | Must be owned |
| Returned from function | Cannot borrow |

Temporary lifetime extension makes Rust ergonomic for common patterns while the borrow checker prevents dangling references. When temporaries behave unexpectedly, bind them to named variables to make lifetimes explicit.
