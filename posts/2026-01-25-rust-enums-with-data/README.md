# How to Use Rust Enums with Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Enums, Pattern Matching, Type System, Data Modeling

Description: Master Rust enums that carry data. Learn about tuple variants, struct variants, and how to use pattern matching to work with complex enum types effectively.

---

Rust enums are far more powerful than enums in most other languages. They can hold data, making them perfect for representing values that can be one of several different types. This guide shows you how to define, create, and work with data-carrying enums.

## Basic Enum Variants

Rust enums can have three kinds of variants: unit, tuple, and struct variants.

```rust
enum Message {
    // Unit variant - no data
    Quit,

    // Tuple variant - unnamed fields
    Move(i32, i32),

    // Struct variant - named fields
    Write { text: String },

    // Tuple variant with single field
    ChangeColor(u8, u8, u8),
}

fn main() {
    // Creating each variant
    let quit = Message::Quit;
    let move_msg = Message::Move(10, 20);
    let write = Message::Write { text: String::from("Hello") };
    let color = Message::ChangeColor(255, 128, 0);

    process_message(quit);
    process_message(move_msg);
    process_message(write);
    process_message(color);
}

fn process_message(msg: Message) {
    match msg {
        Message::Quit => println!("Quit"),
        Message::Move(x, y) => println!("Move to ({}, {})", x, y),
        Message::Write { text } => println!("Write: {}", text),
        Message::ChangeColor(r, g, b) => println!("Color: rgb({}, {}, {})", r, g, b),
    }
}
```

## Tuple Variants

Tuple variants hold positional data, accessed by position in patterns.

```rust
enum Measurement {
    Temperature(f64),           // Single value
    Coordinates(f64, f64),      // Two values
    Vector3D(f64, f64, f64),    // Three values
}

impl Measurement {
    fn describe(&self) -> String {
        match self {
            Measurement::Temperature(t) => format!("{}°C", t),
            Measurement::Coordinates(x, y) => format!("({}, {})", x, y),
            Measurement::Vector3D(x, y, z) => format!("({}, {}, {})", x, y, z),
        }
    }
}

fn main() {
    let temp = Measurement::Temperature(23.5);
    let pos = Measurement::Coordinates(10.0, 20.0);
    let vec = Measurement::Vector3D(1.0, 2.0, 3.0);

    println!("{}", temp.describe());
    println!("{}", pos.describe());
    println!("{}", vec.describe());
}
```

## Struct Variants

Struct variants have named fields, making them self-documenting.

```rust
enum HttpRequest {
    Get {
        url: String,
        headers: Vec<(String, String)>,
    },
    Post {
        url: String,
        headers: Vec<(String, String)>,
        body: String,
    },
    Put {
        url: String,
        body: String,
    },
    Delete {
        url: String,
    },
}

impl HttpRequest {
    fn url(&self) -> &str {
        match self {
            HttpRequest::Get { url, .. } => url,
            HttpRequest::Post { url, .. } => url,
            HttpRequest::Put { url, .. } => url,
            HttpRequest::Delete { url } => url,
        }
    }

    fn method(&self) -> &str {
        match self {
            HttpRequest::Get { .. } => "GET",
            HttpRequest::Post { .. } => "POST",
            HttpRequest::Put { .. } => "PUT",
            HttpRequest::Delete { .. } => "DELETE",
        }
    }
}

fn main() {
    let request = HttpRequest::Post {
        url: String::from("/api/users"),
        headers: vec![
            (String::from("Content-Type"), String::from("application/json")),
        ],
        body: String::from(r#"{"name": "Alice"}"#),
    };

    println!("{} {}", request.method(), request.url());
}
```

## The Option and Result Types

The standard library's Option and Result are enums with data.

```rust
// Option is defined as:
// enum Option<T> {
//     Some(T),
//     None,
// }

// Result is defined as:
// enum Result<T, E> {
//     Ok(T),
//     Err(E),
// }

fn divide(a: f64, b: f64) -> Option<f64> {
    if b == 0.0 {
        None
    } else {
        Some(a / b)
    }
}

fn parse_number(s: &str) -> Result<i32, String> {
    s.parse().map_err(|_| format!("Cannot parse '{}' as number", s))
}

fn main() {
    // Working with Option
    match divide(10.0, 2.0) {
        Some(result) => println!("10 / 2 = {}", result),
        None => println!("Cannot divide by zero"),
    }

    // Working with Result
    match parse_number("42") {
        Ok(n) => println!("Parsed: {}", n),
        Err(e) => println!("Error: {}", e),
    }

    // Using if let for single variant
    if let Some(result) = divide(10.0, 5.0) {
        println!("Result: {}", result);
    }
}
```

## Recursive Enums

Enums can refer to themselves using Box for indirection.

```rust
// Binary tree
enum Tree<T> {
    Leaf(T),
    Node {
        value: T,
        left: Box<Tree<T>>,
        right: Box<Tree<T>>,
    },
}

impl<T: std::fmt::Display> Tree<T> {
    fn print_inorder(&self) {
        match self {
            Tree::Leaf(value) => print!("{} ", value),
            Tree::Node { value, left, right } => {
                left.print_inorder();
                print!("{} ", value);
                right.print_inorder();
            }
        }
    }
}

// Linked list
enum List<T> {
    Empty,
    Cons(T, Box<List<T>>),
}

impl<T> List<T> {
    fn new() -> Self {
        List::Empty
    }

    fn prepend(self, value: T) -> Self {
        List::Cons(value, Box::new(self))
    }
}

fn main() {
    // Create a tree:    2
    //                  / \
    //                 1   3
    let tree = Tree::Node {
        value: 2,
        left: Box::new(Tree::Leaf(1)),
        right: Box::new(Tree::Leaf(3)),
    };

    print!("Inorder: ");
    tree.print_inorder();
    println!();

    // Create a list: 3 -> 2 -> 1 -> Empty
    let list = List::new()
        .prepend(1)
        .prepend(2)
        .prepend(3);
}
```

## Methods on Enums

Implement methods for enums just like structs.

```rust
#[derive(Debug)]
enum Shape {
    Circle { radius: f64 },
    Rectangle { width: f64, height: f64 },
    Triangle { base: f64, height: f64 },
}

impl Shape {
    // Constructor methods
    fn circle(radius: f64) -> Self {
        Shape::Circle { radius }
    }

    fn rectangle(width: f64, height: f64) -> Self {
        Shape::Rectangle { width, height }
    }

    fn triangle(base: f64, height: f64) -> Self {
        Shape::Triangle { base, height }
    }

    // Instance methods
    fn area(&self) -> f64 {
        match self {
            Shape::Circle { radius } => std::f64::consts::PI * radius * radius,
            Shape::Rectangle { width, height } => width * height,
            Shape::Triangle { base, height } => 0.5 * base * height,
        }
    }

    fn perimeter(&self) -> f64 {
        match self {
            Shape::Circle { radius } => 2.0 * std::f64::consts::PI * radius,
            Shape::Rectangle { width, height } => 2.0 * (width + height),
            Shape::Triangle { base, height } => {
                // Assuming isoceles triangle for simplicity
                let side = (height * height + (base / 2.0).powi(2)).sqrt();
                base + 2.0 * side
            }
        }
    }

    fn is_circle(&self) -> bool {
        matches!(self, Shape::Circle { .. })
    }
}

fn main() {
    let shapes = vec![
        Shape::circle(5.0),
        Shape::rectangle(4.0, 6.0),
        Shape::triangle(3.0, 4.0),
    ];

    for shape in &shapes {
        println!("{:?}: area = {:.2}", shape, shape.area());
    }
}
```

## Generic Enums

Enums can be generic over types.

```rust
enum Either<L, R> {
    Left(L),
    Right(R),
}

impl<L, R> Either<L, R> {
    fn is_left(&self) -> bool {
        matches!(self, Either::Left(_))
    }

    fn is_right(&self) -> bool {
        matches!(self, Either::Right(_))
    }

    fn left(self) -> Option<L> {
        match self {
            Either::Left(l) => Some(l),
            Either::Right(_) => None,
        }
    }

    fn right(self) -> Option<R> {
        match self {
            Either::Left(_) => None,
            Either::Right(r) => Some(r),
        }
    }
}

fn main() {
    let value: Either<i32, String> = Either::Left(42);

    if let Either::Left(n) = &value {
        println!("Got left: {}", n);
    }

    let value2: Either<i32, String> = Either::Right(String::from("hello"));

    match value2 {
        Either::Left(n) => println!("Number: {}", n),
        Either::Right(s) => println!("String: {}", s),
    }
}
```

## State Machines

Enums are perfect for modeling state machines.

```rust
enum ConnectionState {
    Disconnected,
    Connecting { attempt: u32 },
    Connected { session_id: String },
    Error { message: String },
}

struct Connection {
    state: ConnectionState,
}

impl Connection {
    fn new() -> Self {
        Connection {
            state: ConnectionState::Disconnected,
        }
    }

    fn connect(&mut self) {
        self.state = match &self.state {
            ConnectionState::Disconnected => {
                ConnectionState::Connecting { attempt: 1 }
            }
            ConnectionState::Connecting { attempt } if *attempt < 3 => {
                ConnectionState::Connecting { attempt: attempt + 1 }
            }
            ConnectionState::Connecting { attempt } => {
                ConnectionState::Error {
                    message: format!("Failed after {} attempts", attempt),
                }
            }
            other => {
                println!("Cannot connect from current state");
                return;
            }
        };
    }

    fn on_connected(&mut self, session_id: String) {
        if matches!(self.state, ConnectionState::Connecting { .. }) {
            self.state = ConnectionState::Connected { session_id };
        }
    }

    fn disconnect(&mut self) {
        self.state = ConnectionState::Disconnected;
    }

    fn describe(&self) -> String {
        match &self.state {
            ConnectionState::Disconnected => String::from("Disconnected"),
            ConnectionState::Connecting { attempt } => {
                format!("Connecting (attempt {})", attempt)
            }
            ConnectionState::Connected { session_id } => {
                format!("Connected (session: {})", session_id)
            }
            ConnectionState::Error { message } => {
                format!("Error: {}", message)
            }
        }
    }
}

fn main() {
    let mut conn = Connection::new();
    println!("{}", conn.describe());

    conn.connect();
    println!("{}", conn.describe());

    conn.on_connected(String::from("abc123"));
    println!("{}", conn.describe());

    conn.disconnect();
    println!("{}", conn.describe());
}
```

## Using matches! Macro

The `matches!` macro simplifies pattern matching for boolean checks.

```rust
enum Status {
    Active { since: String },
    Inactive,
    Pending { reason: String },
}

fn main() {
    let status = Status::Active { since: String::from("2024-01-01") };

    // Instead of match for boolean check
    let is_active = matches!(status, Status::Active { .. });
    println!("Is active: {}", is_active);

    // With guards
    let items = vec![1, 2, 3, 4, 5];
    let has_large = items.iter().any(|x| matches!(x, n if *n > 3));
    println!("Has large: {}", has_large);
}
```

## Summary

Rust enums with data are powerful tools for type-safe programming:

- **Unit variants** represent states without data
- **Tuple variants** hold positional data
- **Struct variants** have named fields for clarity
- **Recursive enums** use Box for self-referential types
- **Generic enums** work with any types

Common patterns:

- Use Option<T> for values that might not exist
- Use Result<T, E> for operations that might fail
- Model state machines with enum variants
- Implement methods on enums like structs

Enums combined with pattern matching create expressive, type-safe code that the compiler can verify for correctness.
