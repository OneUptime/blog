# How to Understand Trait Implementation in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Traits, Generics, Polymorphism, OOP

Description: Learn how to implement traits in Rust including basic implementations, default methods, associated types, and the orphan rule. Master trait bounds and trait objects for polymorphic code.

---

Traits are Rust's way of defining shared behavior. They are similar to interfaces in other languages but more powerful. This guide covers everything from basic trait implementation to advanced patterns.

## Basic Trait Implementation

Define a trait with the `trait` keyword and implement it with `impl Trait for Type`:

```rust
// Define a trait with required methods
trait Describable {
    fn describe(&self) -> String;
}

// A struct to implement the trait on
struct Person {
    name: String,
    age: u32,
}

struct Car {
    make: String,
    model: String,
    year: u32,
}

// Implement the trait for Person
impl Describable for Person {
    fn describe(&self) -> String {
        format!("{}, {} years old", self.name, self.age)
    }
}

// Implement the trait for Car
impl Describable for Car {
    fn describe(&self) -> String {
        format!("{} {} {}", self.year, self.make, self.model)
    }
}

fn main() {
    let person = Person {
        name: "Alice".to_string(),
        age: 30,
    };

    let car = Car {
        make: "Toyota".to_string(),
        model: "Camry".to_string(),
        year: 2023,
    };

    println!("Person: {}", person.describe());
    println!("Car: {}", car.describe());
}
```

## Default Method Implementations

Traits can provide default implementations that types can use or override:

```rust
trait Printable {
    // Required method - must be implemented
    fn content(&self) -> String;

    // Default method - uses content()
    fn print(&self) {
        println!("{}", self.content());
    }

    // Default method with more logic
    fn print_bordered(&self) {
        let content = self.content();
        let border = "=".repeat(content.len() + 4);
        println!("{}", border);
        println!("| {} |", content);
        println!("{}", border);
    }
}

struct Message {
    text: String,
}

impl Printable for Message {
    fn content(&self) -> String {
        self.text.clone()
    }
    // Uses default print() and print_bordered()
}

struct ImportantMessage {
    text: String,
}

impl Printable for ImportantMessage {
    fn content(&self) -> String {
        self.text.clone()
    }

    // Override default print method
    fn print(&self) {
        println!("IMPORTANT: {}", self.content());
    }
}

fn main() {
    let msg = Message { text: "Hello".to_string() };
    msg.print();
    msg.print_bordered();

    let important = ImportantMessage { text: "Alert!".to_string() };
    important.print();
    important.print_bordered();
}
```

## Associated Types

Associated types make traits cleaner when there is a single logical type for a relationship:

```rust
// Without associated types - verbose
trait ContainerVerbose<T> {
    fn get(&self, index: usize) -> Option<&T>;
}

// With associated types - cleaner
trait Container {
    type Item;

    fn get(&self, index: usize) -> Option<&Self::Item>;
    fn len(&self) -> usize;
    fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

struct Stack<T> {
    items: Vec<T>,
}

impl<T> Container for Stack<T> {
    type Item = T;

    fn get(&self, index: usize) -> Option<&T> {
        self.items.get(index)
    }

    fn len(&self) -> usize {
        self.items.len()
    }
}

// The Iterator trait uses associated types
// trait Iterator {
//     type Item;
//     fn next(&mut self) -> Option<Self::Item>;
// }

fn main() {
    let stack = Stack {
        items: vec![1, 2, 3, 4, 5],
    };

    println!("Length: {}", stack.len());
    println!("Item at 2: {:?}", stack.get(2));
}
```

## Trait Bounds

Constrain generic types to those implementing specific traits:

```rust
use std::fmt::Display;

// Function with trait bound
fn print_item<T: Display>(item: T) {
    println!("{}", item);
}

// Multiple trait bounds
fn compare_and_print<T: Display + PartialOrd>(a: T, b: T) {
    if a > b {
        println!("{} is greater", a);
    } else {
        println!("{} is greater or equal", b);
    }
}

// Where clause for complex bounds
fn process<T, U>(t: T, u: U) -> String
where
    T: Display + Clone,
    U: Display + Default,
{
    format!("t: {}, u: {}", t, u)
}

// Trait bound on struct
struct Wrapper<T: Display> {
    value: T,
}

impl<T: Display> Wrapper<T> {
    fn show(&self) {
        println!("Wrapped: {}", self.value);
    }
}

fn main() {
    print_item(42);
    print_item("hello");

    compare_and_print(5, 3);
    compare_and_print("apple", "banana");

    let result = process("test", 0);
    println!("{}", result);

    let wrapped = Wrapper { value: 100 };
    wrapped.show();
}
```

## Implementing Traits for External Types

The orphan rule prevents implementing external traits on external types. But you can implement:

- Your traits on external types
- External traits on your types
- Your traits on your types

```rust
// Your trait on external type - allowed
trait Squared {
    fn squared(&self) -> Self;
}

impl Squared for i32 {
    fn squared(&self) -> i32 {
        self * self
    }
}

impl Squared for f64 {
    fn squared(&self) -> f64 {
        self * self
    }
}

// Newtype pattern to work around orphan rule
struct Meters(f64);

// Now you can implement Display (external trait) for Meters (your type)
impl std::fmt::Display for Meters {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}m", self.0)
    }
}

fn main() {
    let num = 5i32;
    println!("{} squared is {}", num, num.squared());

    let distance = Meters(100.5);
    println!("Distance: {}", distance);
}
```

## Trait Objects for Dynamic Dispatch

When you need runtime polymorphism, use trait objects:

```rust
trait Drawable {
    fn draw(&self);
    fn bounding_box(&self) -> (f64, f64, f64, f64);
}

struct Circle {
    x: f64,
    y: f64,
    radius: f64,
}

struct Rectangle {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

impl Drawable for Circle {
    fn draw(&self) {
        println!("Drawing circle at ({}, {}) with radius {}", self.x, self.y, self.radius);
    }

    fn bounding_box(&self) -> (f64, f64, f64, f64) {
        (
            self.x - self.radius,
            self.y - self.radius,
            self.x + self.radius,
            self.y + self.radius,
        )
    }
}

impl Drawable for Rectangle {
    fn draw(&self) {
        println!(
            "Drawing rectangle at ({}, {}) with size {}x{}",
            self.x, self.y, self.width, self.height
        );
    }

    fn bounding_box(&self) -> (f64, f64, f64, f64) {
        (self.x, self.y, self.x + self.width, self.y + self.height)
    }
}

// Store mixed types using trait objects
struct Canvas {
    shapes: Vec<Box<dyn Drawable>>,
}

impl Canvas {
    fn new() -> Self {
        Canvas { shapes: Vec::new() }
    }

    fn add(&mut self, shape: Box<dyn Drawable>) {
        self.shapes.push(shape);
    }

    fn draw_all(&self) {
        for shape in &self.shapes {
            shape.draw();
        }
    }
}

fn main() {
    let mut canvas = Canvas::new();

    canvas.add(Box::new(Circle { x: 10.0, y: 10.0, radius: 5.0 }));
    canvas.add(Box::new(Rectangle { x: 20.0, y: 20.0, width: 30.0, height: 15.0 }));
    canvas.add(Box::new(Circle { x: 50.0, y: 50.0, radius: 8.0 }));

    canvas.draw_all();
}
```

## Supertraits

Require another trait to be implemented:

```rust
trait Named {
    fn name(&self) -> &str;
}

// Entity requires Named to be implemented
trait Entity: Named {
    fn id(&self) -> u64;

    fn full_identifier(&self) -> String {
        format!("{}#{}", self.name(), self.id())
    }
}

struct User {
    id: u64,
    username: String,
}

// Must implement Named before Entity
impl Named for User {
    fn name(&self) -> &str {
        &self.username
    }
}

impl Entity for User {
    fn id(&self) -> u64 {
        self.id
    }
}

fn main() {
    let user = User {
        id: 12345,
        username: "alice".to_string(),
    };

    println!("Name: {}", user.name());
    println!("ID: {}", user.id());
    println!("Full: {}", user.full_identifier());
}
```

## Blanket Implementations

Implement a trait for all types that satisfy certain bounds:

```rust
trait Printable {
    fn print(&self);
}

// Blanket implementation: any type that implements Display
// automatically gets Printable
impl<T: std::fmt::Display> Printable for T {
    fn print(&self) {
        println!("{}", self);
    }
}

// Custom extension trait with blanket impl
trait StringExt {
    fn is_blank(&self) -> bool;
}

impl<T: AsRef<str>> StringExt for T {
    fn is_blank(&self) -> bool {
        self.as_ref().trim().is_empty()
    }
}

fn main() {
    // Printable works for any Display type
    42.print();
    "hello".print();
    3.14.print();

    // StringExt works for String, &str, etc.
    let s1 = String::from("  ");
    let s2 = "hello";
    let s3 = String::from("");

    println!("'{}' is blank: {}", s1, s1.is_blank());
    println!("'{}' is blank: {}", s2, s2.is_blank());
    println!("'{}' is blank: {}", s3, s3.is_blank());
}
```

## Summary

| Concept | Use Case |
|---------|----------|
| Basic trait | Define shared behavior |
| Default methods | Provide common implementations |
| Associated types | One logical type per trait impl |
| Trait bounds | Constrain generics |
| Trait objects | Runtime polymorphism |
| Supertraits | Require other traits |
| Blanket impls | Implement for categories of types |

Traits are fundamental to Rust's type system. They enable both compile-time polymorphism through generics and runtime polymorphism through trait objects. Master traits to write flexible, reusable Rust code.
