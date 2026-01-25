# How to Use match Expressions Effectively in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Pattern Matching, Control Flow, Enums, Error Handling

Description: Master Rust's match expressions for powerful pattern matching. Learn patterns, guards, bindings, and best practices for writing clean and expressive control flow.

---

The `match` expression is one of Rust's most powerful features. It allows you to compare a value against a series of patterns and execute code based on which pattern matches. Unlike switch statements in other languages, Rust's match is exhaustive and can destructure complex types.

## Basic Match Syntax

Match compares a value against patterns from top to bottom.

```rust
fn main() {
    let number = 3;

    match number {
        1 => println!("One"),
        2 => println!("Two"),
        3 => println!("Three"),
        _ => println!("Something else"),
    }

    // Match is an expression - it returns a value
    let description = match number {
        1 => "one",
        2 => "two",
        3 => "three",
        _ => "other",
    };
    println!("Number is: {}", description);
}
```

## Matching Enums

Match is commonly used with enums, especially Option and Result.

```rust
enum Direction {
    North,
    South,
    East,
    West,
}

fn describe_direction(dir: Direction) -> &'static str {
    match dir {
        Direction::North => "Going up",
        Direction::South => "Going down",
        Direction::East => "Going right",
        Direction::West => "Going left",
    }
}

// Matching Option
fn double_if_some(opt: Option<i32>) -> Option<i32> {
    match opt {
        Some(n) => Some(n * 2),
        None => None,
    }
}

// Matching Result
fn parse_number(s: &str) -> String {
    match s.parse::<i32>() {
        Ok(n) => format!("Parsed: {}", n),
        Err(e) => format!("Error: {}", e),
    }
}

fn main() {
    println!("{}", describe_direction(Direction::North));
    println!("{:?}", double_if_some(Some(21)));
    println!("{}", parse_number("42"));
    println!("{}", parse_number("abc"));
}
```

## Destructuring Patterns

Match can destructure tuples, structs, and enums with data.

```rust
struct Point {
    x: i32,
    y: i32,
}

enum Shape {
    Circle { radius: f64 },
    Rectangle { width: f64, height: f64 },
    Triangle(f64, f64, f64),  // sides
}

fn main() {
    // Destructure tuple
    let pair = (0, -2);
    match pair {
        (0, y) => println!("On y-axis at {}", y),
        (x, 0) => println!("On x-axis at {}", x),
        (x, y) => println!("At ({}, {})", x, y),
    }

    // Destructure struct
    let point = Point { x: 3, y: 7 };
    match point {
        Point { x: 0, y } => println!("On y-axis at {}", y),
        Point { x, y: 0 } => println!("On x-axis at {}", x),
        Point { x, y } => println!("At ({}, {})", x, y),
    }

    // Destructure enum variants
    let shape = Shape::Circle { radius: 5.0 };
    match shape {
        Shape::Circle { radius } => {
            println!("Circle with radius {}", radius);
        }
        Shape::Rectangle { width, height } => {
            println!("Rectangle {}x{}", width, height);
        }
        Shape::Triangle(a, b, c) => {
            println!("Triangle with sides {}, {}, {}", a, b, c);
        }
    }
}
```

## Pattern Guards

Use `if` conditions to add extra requirements to patterns.

```rust
fn classify_number(n: i32) -> &'static str {
    match n {
        x if x < 0 => "negative",
        0 => "zero",
        x if x % 2 == 0 => "positive even",
        _ => "positive odd",
    }
}

fn process_option(opt: Option<i32>) -> String {
    match opt {
        Some(n) if n > 100 => format!("Large: {}", n),
        Some(n) if n > 0 => format!("Small positive: {}", n),
        Some(n) if n < 0 => format!("Negative: {}", n),
        Some(0) => String::from("Zero"),
        None => String::from("Nothing"),
        _ => String::from("Unreachable"),  // Actually unreachable
    }
}

fn main() {
    println!("{}", classify_number(-5));
    println!("{}", classify_number(0));
    println!("{}", classify_number(4));
    println!("{}", classify_number(7));

    println!("{}", process_option(Some(150)));
    println!("{}", process_option(Some(50)));
    println!("{}", process_option(None));
}
```

## Multiple Patterns

Match multiple values with the `|` operator.

```rust
fn is_vowel(c: char) -> bool {
    match c {
        'a' | 'e' | 'i' | 'o' | 'u' |
        'A' | 'E' | 'I' | 'O' | 'U' => true,
        _ => false,
    }
}

fn describe_number(n: i32) -> &'static str {
    match n {
        0 => "zero",
        1 | 2 | 3 => "small",
        4 | 5 | 6 => "medium",
        7 | 8 | 9 => "large",
        _ => "out of range",
    }
}

fn main() {
    println!("Is 'e' a vowel? {}", is_vowel('e'));
    println!("Is 'b' a vowel? {}", is_vowel('b'));

    for i in 0..12 {
        println!("{}: {}", i, describe_number(i));
    }
}
```

## Range Patterns

Match ranges of values with `..=` (inclusive) or `..` (exclusive, in nightly).

```rust
fn grade_letter(score: u32) -> char {
    match score {
        90..=100 => 'A',
        80..=89 => 'B',
        70..=79 => 'C',
        60..=69 => 'D',
        0..=59 => 'F',
        _ => '?',  // Invalid score
    }
}

fn categorize_char(c: char) -> &'static str {
    match c {
        'a'..='z' => "lowercase letter",
        'A'..='Z' => "uppercase letter",
        '0'..='9' => "digit",
        _ => "other",
    }
}

fn main() {
    println!("Score 95: {}", grade_letter(95));
    println!("Score 72: {}", grade_letter(72));
    println!("Score 45: {}", grade_letter(45));

    println!("'m': {}", categorize_char('m'));
    println!("'5': {}", categorize_char('5'));
    println!("'!': {}", categorize_char('!'));
}
```

## Binding with @

Use `@` to bind a matched value to a variable while also testing it.

```rust
fn describe_age(age: u32) -> String {
    match age {
        0 => String::from("newborn"),
        age @ 1..=12 => format!("child ({})", age),
        age @ 13..=19 => format!("teenager ({})", age),
        age @ 20..=64 => format!("adult ({})", age),
        age @ 65.. => format!("senior ({})", age),
    }
}

enum Message {
    Hello { id: u32 },
    Goodbye,
}

fn process_message(msg: Message) {
    match msg {
        Message::Hello { id: id @ 3..=7 } => {
            println!("Found id in range: {}", id);
        }
        Message::Hello { id } => {
            println!("Other id: {}", id);
        }
        Message::Goodbye => println!("Goodbye"),
    }
}

fn main() {
    println!("{}", describe_age(5));
    println!("{}", describe_age(16));
    println!("{}", describe_age(35));
    println!("{}", describe_age(70));

    process_message(Message::Hello { id: 5 });
    process_message(Message::Hello { id: 15 });
}
```

## Ignoring Values

Use `_` to ignore values you do not need.

```rust
struct Config {
    debug: bool,
    log_level: u32,
    max_connections: u32,
}

fn check_config(config: &Config) {
    match config {
        // Ignore all fields except debug
        Config { debug: true, .. } => {
            println!("Debug mode enabled");
        }
        Config { debug: false, log_level, .. } => {
            println!("Release mode, log level: {}", log_level);
        }
    }
}

fn first_element(tuple: (i32, i32, i32)) -> i32 {
    match tuple {
        (first, _, _) => first,
    }
}

fn main() {
    let config = Config {
        debug: true,
        log_level: 3,
        max_connections: 100,
    };
    check_config(&config);

    let t = (10, 20, 30);
    println!("First: {}", first_element(t));
}
```

## Nested Patterns

Match can handle deeply nested structures.

```rust
enum Tree {
    Leaf(i32),
    Node {
        left: Box<Tree>,
        right: Box<Tree>,
    },
}

fn sum_tree(tree: &Tree) -> i32 {
    match tree {
        Tree::Leaf(value) => *value,
        Tree::Node { left, right } => {
            sum_tree(left) + sum_tree(right)
        }
    }
}

fn find_deep_value(opt: Option<Option<Option<i32>>>) -> i32 {
    match opt {
        Some(Some(Some(n))) => n,
        Some(Some(None)) => -1,
        Some(None) => -2,
        None => -3,
    }
}

fn main() {
    let tree = Tree::Node {
        left: Box::new(Tree::Leaf(1)),
        right: Box::new(Tree::Node {
            left: Box::new(Tree::Leaf(2)),
            right: Box::new(Tree::Leaf(3)),
        }),
    };

    println!("Tree sum: {}", sum_tree(&tree));

    println!("{}", find_deep_value(Some(Some(Some(42)))));
    println!("{}", find_deep_value(Some(Some(None))));
    println!("{}", find_deep_value(None));
}
```

## Match with References

Handle references in patterns carefully.

```rust
fn main() {
    let values = vec![1, 2, 3, 4, 5];

    // Matching references
    for value in &values {
        match value {
            // value is &i32, so patterns match against &i32
            1 => println!("One (matched literal)"),
            &n if n > 3 => println!("Greater than 3: {}", n),
            n => println!("Other: {}", n),
        }
    }

    // Using ref to borrow in pattern
    let tuple = (String::from("hello"), 42);
    match tuple {
        (ref s, n) => {
            // s is &String, tuple is not moved
            println!("{}: {}", s, n);
        }
    }
    // tuple is still valid here
    println!("Still have tuple: {:?}", tuple);
}
```

## Match vs if let

Use `if let` for single-pattern matches.

```rust
fn main() {
    let opt = Some(42);

    // Match for multiple cases
    match opt {
        Some(n) if n > 50 => println!("Large: {}", n),
        Some(n) => println!("Small: {}", n),
        None => println!("Nothing"),
    }

    // if let for single case
    if let Some(n) = opt {
        println!("Got: {}", n);
    }

    // if let with else
    if let Some(n) = opt {
        println!("Value: {}", n);
    } else {
        println!("No value");
    }

    // while let for iteration
    let mut stack = vec![1, 2, 3];
    while let Some(top) = stack.pop() {
        println!("Popped: {}", top);
    }
}
```

## Exhaustiveness

Match must cover all possible cases. The compiler enforces this.

```rust
enum Status {
    Active,
    Inactive,
    Pending,
}

fn describe_status(status: Status) -> &'static str {
    match status {
        Status::Active => "active",
        Status::Inactive => "inactive",
        Status::Pending => "pending",
        // All cases covered - no _ needed
    }
}

// For open-ended types, use _
fn describe_number(n: i32) -> &'static str {
    match n {
        0 => "zero",
        1 => "one",
        _ => "many",  // Catches all other i32 values
    }
}

fn main() {
    println!("{}", describe_status(Status::Active));
    println!("{}", describe_number(100));
}
```

## Summary

The `match` expression is central to idiomatic Rust:

- Patterns match values, destructure data, and bind variables
- Guards (`if`) add conditions to patterns
- Multiple patterns use `|`, ranges use `..=`
- `@` binds values while testing them
- `_` ignores values, `..` ignores remaining fields
- Match is exhaustive and must cover all cases

Best practices:

- Prefer `match` over chains of `if`/`else`
- Use `if let` for single-pattern cases
- Let the compiler help with exhaustiveness
- Use destructuring to access nested data

Match expressions make Rust code safer and more expressive by forcing you to handle all possible cases.
