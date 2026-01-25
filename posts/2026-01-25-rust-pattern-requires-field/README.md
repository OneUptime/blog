# How to Fix "Pattern requires field" Errors in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Pattern Matching, Structs, Error Handling, Destructuring

Description: Learn how to fix "pattern requires field" errors in Rust when destructuring structs. This guide covers struct patterns, field shorthand, and common mistakes with solutions.

---

The "pattern requires field" error occurs when your pattern does not account for all fields in a struct. Rust requires you to explicitly handle every field when destructuring, though you can use `..` to ignore some. This guide helps you understand and fix these errors.

## Understanding the Error

When you destructure a struct in a pattern, Rust checks that you have addressed all fields.

```rust
struct User {
    name: String,
    age: u32,
    email: String,
}

fn main() {
    let user = User {
        name: String::from("Alice"),
        age: 30,
        email: String::from("alice@example.com"),
    };

    // Error: pattern requires `email` field
    // let User { name, age } = user;

    // Solution 1: Include all fields
    let User { name, age, email } = user;
    println!("{} ({}) - {}", name, age, email);
}
```

The error message looks like this:

```
error[E0027]: pattern does not mention field `email`
 --> src/main.rs:13:9
  |
13|     let User { name, age } = user;
  |         ^^^^^^^^^^^^^^^^^^ missing field `email`
```

## Solution 1: Include All Fields

List every field in your pattern.

```rust
struct Config {
    host: String,
    port: u16,
    timeout: u32,
    retries: u8,
}

fn print_config(config: Config) {
    // Include all fields
    let Config { host, port, timeout, retries } = config;
    println!("Host: {}:{}", host, port);
    println!("Timeout: {}s, Retries: {}", timeout, retries);
}

fn main() {
    let config = Config {
        host: String::from("localhost"),
        port: 8080,
        timeout: 30,
        retries: 3,
    };
    print_config(config);
}
```

## Solution 2: Use `..` to Ignore Fields

The `..` syntax ignores remaining fields you do not need.

```rust
struct User {
    id: u64,
    name: String,
    email: String,
    created_at: String,
    updated_at: String,
}

fn print_user_name(user: &User) {
    // Only need name, ignore the rest
    let User { name, .. } = user;
    println!("Name: {}", name);
}

fn print_user_contact(user: &User) {
    // Need name and email, ignore others
    let User { name, email, .. } = user;
    println!("{}: {}", name, email);
}

fn main() {
    let user = User {
        id: 1,
        name: String::from("Alice"),
        email: String::from("alice@example.com"),
        created_at: String::from("2024-01-01"),
        updated_at: String::from("2024-01-15"),
    };

    print_user_name(&user);
    print_user_contact(&user);
}
```

## Solution 3: Use Underscore for Unused Fields

Prefix field bindings with underscore to indicate they are intentionally unused.

```rust
struct Response {
    status: u16,
    headers: Vec<String>,
    body: String,
}

fn get_status(response: Response) -> u16 {
    // Explicitly ignore headers and body
    let Response { status, headers: _, body: _ } = response;
    status
}

// Alternative: combine with ..
fn get_status_shorter(response: Response) -> u16 {
    let Response { status, .. } = response;
    status
}

fn main() {
    let response = Response {
        status: 200,
        headers: vec![String::from("Content-Type: text/html")],
        body: String::from("<h1>Hello</h1>"),
    };

    println!("Status: {}", get_status(response));
}
```

## Patterns in Match Expressions

The same rules apply in match arms.

```rust
struct Point {
    x: i32,
    y: i32,
    z: i32,
}

fn describe_point(point: &Point) -> &str {
    match point {
        // Must account for all fields in each arm
        Point { x: 0, y: 0, z: 0 } => "origin",
        Point { x: 0, y: 0, .. } => "on z-axis",
        Point { x: 0, z: 0, .. } => "on y-axis",
        Point { y: 0, z: 0, .. } => "on x-axis",
        Point { x: 0, .. } => "on yz-plane",
        Point { y: 0, .. } => "on xz-plane",
        Point { z: 0, .. } => "on xy-plane",
        _ => "in space",
    }
}

fn main() {
    println!("{}", describe_point(&Point { x: 0, y: 0, z: 0 }));
    println!("{}", describe_point(&Point { x: 5, y: 0, z: 0 }));
    println!("{}", describe_point(&Point { x: 1, y: 2, z: 3 }));
}
```

## Patterns in Function Parameters

You can destructure directly in function parameters.

```rust
struct Rectangle {
    width: u32,
    height: u32,
}

// Destructure in parameter
fn area(Rectangle { width, height }: &Rectangle) -> u32 {
    width * height
}

// With partial destructure
fn perimeter(Rectangle { width, height, .. }: &Rectangle) -> u32 {
    2 * (width + height)
}

fn main() {
    let rect = Rectangle { width: 10, height: 5 };
    println!("Area: {}", area(&rect));
    println!("Perimeter: {}", perimeter(&rect));
}
```

## Nested Struct Patterns

When destructuring nested structs, account for all fields at each level.

```rust
struct Address {
    street: String,
    city: String,
    country: String,
}

struct Person {
    name: String,
    age: u32,
    address: Address,
}

fn print_location(person: &Person) {
    // Nested destructure
    let Person {
        name,
        address: Address { city, country, .. },
        ..
    } = person;

    println!("{} lives in {}, {}", name, city, country);
}

fn main() {
    let person = Person {
        name: String::from("Alice"),
        age: 30,
        address: Address {
            street: String::from("123 Main St"),
            city: String::from("Boston"),
            country: String::from("USA"),
        },
    };

    print_location(&person);
}
```

## Enum Variant Structs

Enum variants with struct-like data follow the same rules.

```rust
enum Event {
    Click { x: i32, y: i32, button: u8 },
    KeyPress { key: char, modifiers: u8 },
    Scroll { delta_x: f32, delta_y: f32 },
}

fn handle_event(event: Event) {
    match event {
        // Must include all variant fields
        Event::Click { x, y, button } => {
            println!("Click at ({}, {}) with button {}", x, y, button);
        }
        // Or use .. to ignore some
        Event::KeyPress { key, .. } => {
            println!("Key pressed: {}", key);
        }
        Event::Scroll { delta_y, .. } => {
            println!("Scroll by {}", delta_y);
        }
    }
}

fn main() {
    handle_event(Event::Click { x: 100, y: 200, button: 1 });
    handle_event(Event::KeyPress { key: 'a', modifiers: 0 });
    handle_event(Event::Scroll { delta_x: 0.0, delta_y: 10.5 });
}
```

## Using ref and mut in Patterns

When destructuring, you can specify how fields are bound.

```rust
struct Data {
    value: String,
    count: u32,
}

fn process_data(data: &mut Data) {
    // Borrow fields instead of moving
    let Data { ref value, ref mut count } = data;

    println!("Value: {}", value);
    *count += 1;
}

fn take_value(data: Data) -> String {
    // Move value, copy count
    let Data { value, count: _ } = data;
    value
}

fn main() {
    let mut data = Data {
        value: String::from("hello"),
        count: 0,
    };

    process_data(&mut data);
    process_data(&mut data);
    println!("Count: {}", data.count);

    let value = take_value(data);
    println!("Took: {}", value);
}
```

## Field Renaming in Patterns

Rename fields during destructuring with `field: new_name` syntax.

```rust
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let point = Point { x: 10, y: 20 };

    // Rename x to horizontal, y to vertical
    let Point { x: horizontal, y: vertical } = point;
    println!("Horizontal: {}, Vertical: {}", horizontal, vertical);

    // Combine with other patterns
    let point2 = Point { x: 0, y: 5 };
    match point2 {
        Point { x: 0, y: height } => println!("On y-axis at height {}", height),
        Point { x: width, y: 0 } => println!("On x-axis at width {}", width),
        Point { x: px, y: py } => println!("At ({}, {})", px, py),
    }
}
```

## Common Mistakes

### Forgetting a Field

```rust
struct Triple {
    a: i32,
    b: i32,
    c: i32,
}

fn sum_pair(triple: Triple) -> i32 {
    // Error: missing field c
    // let Triple { a, b } = triple;

    // Fix: include c or use ..
    let Triple { a, b, .. } = triple;
    a + b
}
```

### Wrong Field Name

```rust
struct User {
    username: String,
    email: String,
}

fn get_user_name(user: User) -> String {
    // Error: no field named `name`
    // let User { name, .. } = user;

    // Fix: use correct field name
    let User { username, .. } = user;
    username
}
```

### Mixing Up Struct and Tuple Struct

```rust
struct TupleStruct(i32, i32);
struct RegularStruct { x: i32, y: i32 }

fn main() {
    let ts = TupleStruct(1, 2);
    let rs = RegularStruct { x: 1, y: 2 };

    // Tuple struct uses parentheses
    let TupleStruct(a, b) = ts;

    // Regular struct uses braces and field names
    let RegularStruct { x, y } = rs;
}
```

## Summary

The "pattern requires field" error ensures you handle all struct fields:

- Include every field in destructuring patterns
- Use `..` to explicitly ignore fields you do not need
- Use `_` prefix for unused but acknowledged fields
- Use `field: new_name` to rename during destructuring
- Apply these rules in `let`, `match`, and function parameters

Best practices:

- Use `..` liberally when you only need some fields
- Be explicit about which fields you care about
- Use field shorthand (`let S { x, y } = s`) when binding to same names
- Remember that nested structs need patterns at each level

These patterns make your code more maintainable by being explicit about what data you use.
