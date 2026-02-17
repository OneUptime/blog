# How to Fix 'Expected struct, found tuple' Errors in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Structs, Tuples, Pattern Matching, Error Handling

Description: Learn how to fix 'expected struct, found tuple' errors in Rust. This guide explains the differences between structs and tuples, and how to correctly destructure and construct both.

---

The "expected struct, found tuple" error occurs when you mix up the syntax for structs and tuples. While they may seem similar, Rust treats them differently. This guide helps you understand the distinction and fix common mistakes.

## Understanding the Difference

Structs and tuple structs have different syntax for construction and destructuring.

```rust
// Regular struct with named fields
struct Point {
    x: i32,
    y: i32,
}

// Tuple struct with positional fields
struct Color(u8, u8, u8);

// Regular tuple (not a struct)
type Pair = (i32, i32);

fn main() {
    // Struct construction uses braces and field names
    let point = Point { x: 10, y: 20 };

    // Tuple struct uses parentheses
    let color = Color(255, 128, 0);

    // Regular tuple uses parentheses
    let pair: Pair = (5, 10);

    println!("Point: ({}, {})", point.x, point.y);
    println!("Color: ({}, {}, {})", color.0, color.1, color.2);
    println!("Pair: ({}, {})", pair.0, pair.1);
}
```

## Common Error Scenarios

### Scenario 1: Using Tuple Syntax for Struct

```rust
struct Rectangle {
    width: u32,
    height: u32,
}

fn main() {
    // Error: expected struct, found tuple
    // let rect = Rectangle(100, 50);

    // Correct: use braces and field names
    let rect = Rectangle { width: 100, height: 50 };
    println!("Area: {}", rect.width * rect.height);
}
```

### Scenario 2: Using Struct Syntax for Tuple Struct

```rust
struct Meters(f64);

fn main() {
    // Error: expected tuple, found struct
    // let distance = Meters { 0: 42.0 };

    // Correct: use parentheses
    let distance = Meters(42.0);
    println!("Distance: {} meters", distance.0);
}
```

### Scenario 3: Destructuring with Wrong Pattern

```rust
struct User {
    name: String,
    age: u32,
}

fn main() {
    let user = User {
        name: String::from("Alice"),
        age: 30,
    };

    // Error: expected tuple pattern, found struct pattern
    // let (name, age) = user;

    // Correct: use struct pattern
    let User { name, age } = user;
    println!("{} is {} years old", name, age);
}
```

### Scenario 4: Match Arms with Wrong Pattern

```rust
struct Config {
    debug: bool,
    version: u32,
}

fn describe_config(config: Config) {
    // Error in match arms
    match config {
        // Wrong: tuple pattern for struct
        // (true, v) => println!("Debug mode, version {}", v),

        // Correct: struct pattern
        Config { debug: true, version } => {
            println!("Debug mode, version {}", version);
        }
        Config { debug: false, version } => {
            println!("Release mode, version {}", version);
        }
    }
}

fn main() {
    let config = Config { debug: true, version: 1 };
    describe_config(config);
}
```

## Working with Tuple Structs

Tuple structs are structs without named fields. They use positional access.

```rust
// Define tuple structs
struct Millimeters(u32);
struct Meters(f64);
struct Point3D(f64, f64, f64);

fn main() {
    // Construction uses parentheses
    let mm = Millimeters(1000);
    let m = Meters(1.0);
    let point = Point3D(1.0, 2.0, 3.0);

    // Access uses .0, .1, .2, etc.
    println!("{} millimeters", mm.0);
    println!("{} meters", m.0);
    println!("Point: ({}, {}, {})", point.0, point.1, point.2);

    // Destructuring uses parentheses
    let Point3D(x, y, z) = point;
    println!("Destructured: x={}, y={}, z={}", x, y, z);
}

// Function taking tuple struct
fn convert_to_mm(m: Meters) -> Millimeters {
    Millimeters((m.0 * 1000.0) as u32)
}
```

## Working with Regular Structs

Regular structs have named fields and use braces.

```rust
struct Person {
    name: String,
    age: u32,
    email: String,
}

fn main() {
    // Construction with braces
    let person = Person {
        name: String::from("Bob"),
        age: 25,
        email: String::from("bob@example.com"),
    };

    // Field access with dot notation
    println!("Name: {}", person.name);

    // Destructuring with braces
    let Person { name, age, email } = person;
    println!("{} ({}) - {}", name, age, email);
}
```

### Field Init Shorthand

When variable names match field names, you can use shorthand.

```rust
struct User {
    username: String,
    active: bool,
}

fn create_user(username: String) -> User {
    let active = true;

    // Shorthand: username instead of username: username
    User { username, active }
}

fn main() {
    let user = create_user(String::from("alice"));
    println!("User: {}, active: {}", user.username, user.active);
}
```

### Struct Update Syntax

Create a new struct based on an existing one.

```rust
#[derive(Debug, Clone)]
struct Settings {
    volume: u32,
    brightness: u32,
    theme: String,
}

fn main() {
    let default_settings = Settings {
        volume: 50,
        brightness: 70,
        theme: String::from("dark"),
    };

    // Update syntax: ..existing_struct
    let custom_settings = Settings {
        volume: 80,
        ..default_settings.clone()
    };

    println!("{:?}", custom_settings);
}
```

## Pattern Matching Rules

### Matching Structs

```rust
struct Rectangle {
    width: u32,
    height: u32,
}

fn classify_rect(rect: &Rectangle) -> &str {
    match rect {
        // Match specific values
        Rectangle { width: 0, height: 0 } => "point",
        Rectangle { width: 0, .. } => "vertical line",
        Rectangle { height: 0, .. } => "horizontal line",
        Rectangle { width, height } if width == height => "square",
        _ => "rectangle",
    }
}

fn main() {
    println!("{}", classify_rect(&Rectangle { width: 0, height: 0 }));
    println!("{}", classify_rect(&Rectangle { width: 5, height: 5 }));
    println!("{}", classify_rect(&Rectangle { width: 3, height: 5 }));
}
```

### Matching Tuple Structs

```rust
struct Color(u8, u8, u8);

fn describe_color(color: &Color) -> &str {
    match color {
        Color(255, 0, 0) => "red",
        Color(0, 255, 0) => "green",
        Color(0, 0, 255) => "blue",
        Color(0, 0, 0) => "black",
        Color(255, 255, 255) => "white",
        Color(r, g, b) if r == g && g == b => "gray",
        _ => "other",
    }
}

fn main() {
    println!("{}", describe_color(&Color(255, 0, 0)));
    println!("{}", describe_color(&Color(128, 128, 128)));
    println!("{}", describe_color(&Color(100, 150, 200)));
}
```

## Enum Variants

Enum variants can be struct-like or tuple-like, and mixing them up causes similar errors.

```rust
enum Message {
    // Unit variant
    Quit,
    // Tuple variant
    Move(i32, i32),
    // Struct variant
    Write { text: String },
}

fn process_message(msg: Message) {
    match msg {
        // Unit variant - no data
        Message::Quit => println!("Quit"),

        // Tuple variant - use parentheses
        Message::Move(x, y) => println!("Move to ({}, {})", x, y),

        // Struct variant - use braces
        Message::Write { text } => println!("Write: {}", text),
    }
}

fn main() {
    process_message(Message::Quit);
    process_message(Message::Move(10, 20));
    process_message(Message::Write { text: String::from("Hello") });
}
```

## Converting Between Structs and Tuples

Sometimes you need to convert between the two.

```rust
struct Point {
    x: i32,
    y: i32,
}

impl Point {
    // Convert to tuple
    fn to_tuple(&self) -> (i32, i32) {
        (self.x, self.y)
    }

    // Create from tuple
    fn from_tuple(t: (i32, i32)) -> Self {
        Point { x: t.0, y: t.1 }
    }
}

// Implement From trait for ergonomic conversion
impl From<(i32, i32)> for Point {
    fn from(t: (i32, i32)) -> Self {
        Point { x: t.0, y: t.1 }
    }
}

impl From<Point> for (i32, i32) {
    fn from(p: Point) -> Self {
        (p.x, p.y)
    }
}

fn main() {
    let point = Point { x: 10, y: 20 };
    let tuple: (i32, i32) = point.into();
    println!("Tuple: {:?}", tuple);

    let point2: Point = (30, 40).into();
    println!("Point: ({}, {})", point2.x, point2.y);
}
```

## Summary

The "expected struct, found tuple" error comes from mixing up syntax:

| Type | Construction | Destructuring | Field Access |
|------|--------------|---------------|--------------|
| Struct | `Type { field: value }` | `let Type { field } = val` | `val.field` |
| Tuple Struct | `Type(value)` | `let Type(val) = t` | `t.0` |
| Tuple | `(val1, val2)` | `let (a, b) = t` | `t.0` |

Key points:

- Structs use braces `{}` and named fields
- Tuple structs use parentheses `()` and positional access
- Match patterns must match the type's structure
- Enum variants can be unit, tuple-like, or struct-like

Understanding the syntax differences between structs and tuples helps you write correct Rust code and quickly fix these common errors.
