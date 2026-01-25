# How to Print Variable Types in Rust for Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Debugging, Types, Development, Diagnostics

Description: Learn different techniques to print and inspect variable types in Rust during development and debugging. Discover compile-time and runtime approaches for type inspection.

---

When learning Rust or debugging complex code, knowing the exact type of a variable is invaluable. Rust's type inference is powerful, but sometimes you need to see what type the compiler inferred. This guide covers multiple techniques for inspecting types.

## Method 1: Intentional Type Error

The simplest technique is to cause a deliberate type error:

```rust
fn main() {
    let x = vec![1, 2, 3].iter().map(|n| n * 2);

    // Deliberately assign to wrong type to see actual type
    let _: () = x;
}
```

The compiler error reveals the type:

```
error[E0308]: mismatched types
 --> src/main.rs:4:17
  |
4 |     let _: () = x;
  |            --   ^ expected `()`, found struct `Map`
  |            |
  |            expected due to this
  |
  = note: expected unit type `()`
             found struct `Map<std::slice::Iter<'_, i32>, [closure]>`
```

## Method 2: Using std::any::type_name

The `type_name` function returns a string representation of the type:

```rust
use std::any::type_name;

fn type_of<T>(_: &T) -> &'static str {
    type_name::<T>()
}

fn main() {
    let x = 42;
    let y = 3.14;
    let z = "hello";
    let v = vec![1, 2, 3];
    let closure = |n: i32| n * 2;

    println!("x: {}", type_of(&x));
    println!("y: {}", type_of(&y));
    println!("z: {}", type_of(&z));
    println!("v: {}", type_of(&v));
    println!("closure: {}", type_of(&closure));

    // Works with complex expressions
    let iter = v.iter().filter(|n| **n > 1);
    println!("iter: {}", type_of(&iter));
}
```

Output:

```
x: i32
y: f64
z: &str
v: alloc::vec::Vec<i32>
closure: main::{{closure}}
iter: core::iter::adapters::filter::Filter<core::slice::iter::Iter<i32>, main::{{closure}}>
```

## Method 3: Type Name with Size

Include the size of the type for more information:

```rust
use std::any::type_name;
use std::mem::size_of_val;

fn describe<T>(value: &T) {
    println!(
        "Type: {}, Size: {} bytes",
        type_name::<T>(),
        size_of_val(value)
    );
}

fn main() {
    let a: i32 = 42;
    let b: i64 = 42;
    let c: f64 = 3.14;
    let d = String::from("hello");
    let e = Box::new(42);
    let f = vec![1, 2, 3, 4, 5];

    describe(&a);
    describe(&b);
    describe(&c);
    describe(&d);
    describe(&e);
    describe(&f);
}
```

## Method 4: Debug Printing with dbg!

The `dbg!` macro prints expressions with file and line info:

```rust
fn main() {
    let x = 5;
    let y = dbg!(x * 2);  // Prints: [src/main.rs:3] x * 2 = 10

    let v = dbg!(vec![1, 2, 3]);

    // Multiple values
    let (a, b) = dbg!((1 + 1, 2 + 2));

    println!("y = {}, v = {:?}, a = {}, b = {}", y, v, a, b);
}
```

## Method 5: IDE Integration

Most IDEs show types on hover. Configure your editor:

```rust
// In VS Code with rust-analyzer:
// Hover over any variable to see its type

fn complex_function() {
    let data = std::fs::read_to_string("file.txt");
    // Hover over 'data' to see: Result<String, std::io::Error>

    let parsed = data
        .unwrap()
        .lines()
        .map(|line| line.parse::<i32>())
        .collect::<Vec<_>>();
    // Hover shows: Vec<Result<i32, ParseIntError>>
}
```

## Method 6: Custom Debug Implementation

For your own types, implement Debug:

```rust
use std::fmt;

struct Point {
    x: f64,
    y: f64,
}

impl fmt::Debug for Point {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Point {{ x: {:.2}, y: {:.2} }}", self.x, self.y)
    }
}

// Or use derive for automatic implementation
#[derive(Debug)]
struct Rectangle {
    width: f64,
    height: f64,
}

fn main() {
    let p = Point { x: 3.14159, y: 2.71828 };
    let r = Rectangle { width: 10.0, height: 5.0 };

    println!("{:?}", p);
    println!("{:#?}", r);  // Pretty-printed
}
```

## Method 7: Runtime Type Checking

Use TypeId for runtime type comparisons:

```rust
use std::any::{Any, TypeId};

fn is_string<T: 'static>(value: &T) -> bool {
    TypeId::of::<T>() == TypeId::of::<String>()
}

fn print_if_string(value: &dyn Any) {
    if let Some(s) = value.downcast_ref::<String>() {
        println!("It's a String: {}", s);
    } else if let Some(n) = value.downcast_ref::<i32>() {
        println!("It's an i32: {}", n);
    } else {
        println!("Unknown type");
    }
}

fn main() {
    let s = String::from("hello");
    let n = 42;

    println!("Is s a String? {}", is_string(&s));
    println!("Is n a String? {}", is_string(&n));

    print_if_string(&s);
    print_if_string(&n);
    print_if_string(&3.14f64);
}
```

## Method 8: Compiler Diagnostics

Use compiler attributes to see inferred types:

```rust
#![feature(core_intrinsics)]  // Nightly only

fn main() {
    let x = vec![1, 2, 3].iter().map(|n| n * 2);

    // Nightly: print type at compile time
    // println!("{}", std::intrinsics::type_name::<typeof(x)>());
}
```

For stable Rust, use the type error trick or `type_name`.

## Practical Debugging Example

```rust
use std::any::type_name;

fn type_of<T>(_: &T) -> &'static str {
    type_name::<T>()
}

fn debug_pipeline() {
    let data = vec!["10", "20", "thirty", "40"];

    println!("Step 1: Initial data");
    println!("  Type: {}", type_of(&data));

    let step2 = data.iter();
    println!("\nStep 2: After iter()");
    println!("  Type: {}", type_of(&step2));

    let step3 = data.iter().filter_map(|s| s.parse::<i32>().ok());
    println!("\nStep 3: After filter_map()");
    println!("  Type: {}", type_of(&step3));

    let step4: Vec<i32> = data.iter()
        .filter_map(|s| s.parse::<i32>().ok())
        .collect();
    println!("\nStep 4: After collect()");
    println!("  Type: {}", type_of(&step4));
    println!("  Value: {:?}", step4);
}

fn main() {
    debug_pipeline();
}
```

Output:

```
Step 1: Initial data
  Type: alloc::vec::Vec<&str>

Step 2: After iter()
  Type: core::slice::iter::Iter<&str>

Step 3: After filter_map()
  Type: core::iter::adapters::filter_map::FilterMap<core::slice::iter::Iter<&str>, ...>

Step 4: After collect()
  Type: alloc::vec::Vec<i32>
  Value: [10, 20, 40]
```

## Summary

| Method | When to Use | Works At |
|--------|-------------|----------|
| Type error trick | Quick check during development | Compile time |
| `type_name::<T>()` | Runtime type inspection | Runtime |
| `dbg!` macro | Print values with context | Runtime |
| IDE hover | Continuous type info | Development |
| `TypeId` | Runtime type comparison | Runtime |
| Custom Debug | Your own types | Runtime |

The intentional type error method is fastest for one-off checks during development. For logging or runtime inspection, `type_name` provides readable type information. Use the appropriate technique based on whether you need compile-time or runtime information.
