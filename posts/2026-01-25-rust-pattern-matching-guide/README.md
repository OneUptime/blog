# How to Use Pattern Matching in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Pattern Matching, Control Flow, Enums, Destructuring

Description: A comprehensive guide to pattern matching in Rust. Learn match expressions, if let, while let, and advanced patterns for writing expressive and type-safe code.

---

Pattern matching is one of Rust's most powerful features. It allows you to destructure and examine data structures, handle different cases, and extract values in a concise and type-safe way. This guide covers all aspects of pattern matching in Rust.

## Basic Pattern Matching

The match expression compares a value against patterns.

```rust
fn main() {
    let number = 13;

    match number {
        1 => println!("One"),
        2 | 3 | 5 | 7 | 11 | 13 => println!("Prime"),
        13..=19 => println!("Teen"),
        _ => println!("Other"),
    }

    // Match is an expression - it returns a value
    let description = match number {
        1 => "one",
        2 => "two",
        _ => "many",
    };
    println!("Description: {}", description);
}
```

## Destructuring

Patterns can destructure complex types.

### Tuples

```rust
fn main() {
    let pair = (0, -2);

    match pair {
        (0, y) => println!("On y-axis at {}", y),
        (x, 0) => println!("On x-axis at {}", x),
        (x, y) => println!("At ({}, {})", x, y),
    }

    // Nested tuples
    let nested = ((1, 2), (3, 4));
    let ((a, b), (c, d)) = nested;
    println!("{} {} {} {}", a, b, c, d);
}
```

### Structs

```rust
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let point = Point { x: 0, y: 7 };

    match point {
        Point { x: 0, y } => println!("On y-axis at {}", y),
        Point { x, y: 0 } => println!("On x-axis at {}", x),
        Point { x, y } => println!("At ({}, {})", x, y),
    }

    // Shorthand when variable name matches field name
    let Point { x, y } = point;
    println!("Destructured: x={}, y={}", x, y);

    // Ignore fields with ..
    let Point { x, .. } = point;
    println!("Only x: {}", x);
}
```

### Enums

```rust
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
    ChangeColor(u8, u8, u8),
}

fn process(msg: Message) {
    match msg {
        Message::Quit => println!("Quit"),
        Message::Move { x, y } => println!("Move to ({}, {})", x, y),
        Message::Write(text) => println!("Write: {}", text),
        Message::ChangeColor(r, g, b) => {
            println!("Color: rgb({}, {}, {})", r, g, b);
        }
    }
}

fn main() {
    process(Message::Move { x: 10, y: 20 });
    process(Message::Write(String::from("hello")));
    process(Message::ChangeColor(255, 128, 0));
}
```

## Pattern Guards

Add conditions with `if` guards.

```rust
fn main() {
    let num = Some(4);

    match num {
        Some(x) if x < 5 => println!("Less than 5: {}", x),
        Some(x) if x >= 5 => println!("5 or more: {}", x),
        None => println!("None"),
        _ => unreachable!(),
    }

    // Multiple conditions
    let pair = (2, -2);
    match pair {
        (x, y) if x == y => println!("Equal"),
        (x, y) if x + y == 0 => println!("Opposites"),
        (x, _) if x % 2 == 0 => println!("First is even"),
        _ => println!("Other"),
    }
}
```

## if let and while let

For single-pattern matching, use `if let` or `while let`.

```rust
fn main() {
    let config_max = Some(3u8);

    // Instead of match for single case
    if let Some(max) = config_max {
        println!("Maximum is {}", max);
    }

    // With else
    let value: Option<i32> = None;
    if let Some(v) = value {
        println!("Got: {}", v);
    } else {
        println!("Nothing");
    }

    // while let for iteration
    let mut stack = vec![1, 2, 3];
    while let Some(top) = stack.pop() {
        println!("Popped: {}", top);
    }

    // let else for early return
    fn process(opt: Option<i32>) -> i32 {
        let Some(value) = opt else {
            return 0;
        };
        value * 2
    }
}
```

## Binding with @

Bind a value while also testing it.

```rust
fn main() {
    let num = Some(4);

    match num {
        Some(n @ 1..=5) => println!("Got {} (1-5)", n),
        Some(n @ 6..=10) => println!("Got {} (6-10)", n),
        Some(n) => println!("Got {} (other)", n),
        None => println!("None"),
    }

    // Binding with struct patterns
    struct Point { x: i32, y: i32 }
    let p = Point { x: 0, y: 5 };

    match p {
        Point { x: 0, y: y_val @ 1..=10 } => {
            println!("On y-axis at {} (1-10)", y_val);
        }
        Point { x, y } => println!("At ({}, {})", x, y),
    }
}
```

## Multiple Patterns

Use `|` to match multiple patterns.

```rust
fn main() {
    let x = 1;

    match x {
        1 | 2 => println!("One or two"),
        3 | 4 | 5 => println!("Three to five"),
        _ => println!("Other"),
    }

    // With enums
    enum Color {
        Red, Green, Blue, Yellow, Cyan, Magenta
    }

    let color = Color::Blue;
    match color {
        Color::Red | Color::Green | Color::Blue => {
            println!("Primary color");
        }
        Color::Yellow | Color::Cyan | Color::Magenta => {
            println!("Secondary color");
        }
    }
}
```

## Range Patterns

Match ranges of values.

```rust
fn main() {
    let x = 5;

    match x {
        1..=5 => println!("One through five"),
        6..=10 => println!("Six through ten"),
        _ => println!("Other"),
    }

    // Character ranges
    let c = 'c';
    match c {
        'a'..='j' => println!("Early letter"),
        'k'..='z' => println!("Late letter"),
        _ => println!("Other"),
    }
}
```

## Ignoring Values

Use `_` and `..` to ignore parts of patterns.

```rust
fn main() {
    // Ignore single value
    let pair = (1, 2);
    let (first, _) = pair;
    println!("First: {}", first);

    // Ignore multiple with ..
    let numbers = (1, 2, 3, 4, 5);
    let (first, .., last) = numbers;
    println!("First: {}, Last: {}", first, last);

    // Ignore remaining struct fields
    struct Person {
        name: String,
        age: u32,
        address: String,
    }

    let person = Person {
        name: String::from("Alice"),
        age: 30,
        address: String::from("123 Main St"),
    };

    let Person { name, .. } = person;
    println!("Name: {}", name);

    // Underscore prefix for unused variables
    let _unused = 42;  // No warning about unused variable
}
```

## Reference Patterns

Match and work with references.

```rust
fn main() {
    let reference = &4;

    match reference {
        &val => println!("Got value: {}", val),
    }

    // ref keyword to create reference in pattern
    let value = 5;
    match value {
        ref r => println!("Got reference to {}", r),
    }

    // ref mut for mutable reference
    let mut value = 5;
    match value {
        ref mut r => {
            *r += 1;
            println!("Modified to {}", r);
        }
    }

    // In struct patterns
    struct Data {
        value: String,
    }

    let data = Data { value: String::from("hello") };
    match data {
        Data { ref value } => {
            println!("Borrowed: {}", value);
        }
    }
    // data is still valid here because we only borrowed value
}
```

## Patterns in Function Parameters

```rust
// Destructure in parameters
fn print_coordinates(&(x, y): &(i32, i32)) {
    println!("({}, {})", x, y);
}

// With structs
struct Point { x: i32, y: i32 }

fn distance_from_origin(Point { x, y }: &Point) -> f64 {
    ((x * x + y * y) as f64).sqrt()
}

// With closures
fn main() {
    let points = vec![(0, 0), (1, 1), (2, 2)];

    let sum: i32 = points
        .iter()
        .map(|(x, y)| x + y)
        .sum();

    println!("Sum: {}", sum);

    print_coordinates(&(3, 5));
}
```

## Exhaustive Matching

Match must cover all possible cases.

```rust
enum Status {
    Active,
    Inactive,
    Pending,
}

fn describe(status: Status) -> &'static str {
    match status {
        Status::Active => "active",
        Status::Inactive => "inactive",
        Status::Pending => "pending",
        // All variants covered - no _ needed
    }
}

// For open-ended types, use catchall
fn describe_number(n: i32) -> &'static str {
    match n {
        0 => "zero",
        1 => "one",
        2 => "two",
        _ => "many",  // Required for i32
    }
}

fn main() {
    println!("{}", describe(Status::Active));
    println!("{}", describe_number(42));
}
```

## Nested Patterns

Match deeply nested structures.

```rust
enum OptionalPair {
    None,
    Some((i32, i32)),
}

fn main() {
    let value = OptionalPair::Some((1, 2));

    match value {
        OptionalPair::None => println!("None"),
        OptionalPair::Some((0, _)) => println!("First is zero"),
        OptionalPair::Some((_, 0)) => println!("Second is zero"),
        OptionalPair::Some((x, y)) => println!("Pair: ({}, {})", x, y),
    }

    // Deeply nested
    let deep = Some(Some(Some(42)));
    if let Some(Some(Some(value))) = deep {
        println!("Deep value: {}", value);
    }
}
```

## Summary

Pattern matching in Rust provides:

| Feature | Syntax | Example |
|---------|--------|---------|
| Match | `match x { ... }` | `match n { 1 => "one", _ => "other" }` |
| if let | `if let Pattern = x` | `if let Some(v) = opt { }` |
| while let | `while let Pattern = x` | `while let Some(v) = iter.next() { }` |
| let else | `let Pattern = x else { }` | `let Some(v) = opt else { return }` |

Pattern types:

- Literals: `1`, `"hello"`, `true`
- Variables: `x`, `name`
- Wildcards: `_`, `..`
- Ranges: `1..=5`, `'a'..='z'`
- Structs: `Point { x, y }`
- Tuples: `(a, b, c)`
- Enums: `Some(x)`, `None`
- Guards: `x if x > 5`
- Bindings: `n @ 1..=5`
- References: `&x`, `ref x`, `ref mut x`

Pattern matching makes Rust code expressive, safe, and easy to read.
