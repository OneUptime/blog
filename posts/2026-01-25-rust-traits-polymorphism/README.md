# How to Use Traits for Polymorphism in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Traits, Polymorphism, Generics, Object-Oriented Programming

Description: Learn how to achieve polymorphism in Rust using traits. This guide covers static dispatch with generics, dynamic dispatch with trait objects, and when to use each approach.

---

Rust achieves polymorphism through traits rather than inheritance. Traits define shared behavior that different types can implement. This guide shows you how to use traits for both compile-time (static) and runtime (dynamic) polymorphism.

## Static Polymorphism with Generics

Generic functions work with any type that implements required traits. The compiler generates specialized code for each type used.

```rust
use std::fmt::Display;

// This function works with any type implementing Display
fn print_twice<T: Display>(value: T) {
    println!("{}", value);
    println!("{}", value);
}

// Multiple trait bounds
fn compare_and_print<T: Display + PartialOrd>(a: T, b: T) {
    if a < b {
        println!("{} < {}", a, b);
    } else {
        println!("{} >= {}", a, b);
    }
}

fn main() {
    print_twice(42);
    print_twice("hello");
    print_twice(3.14);

    compare_and_print(10, 20);
    compare_and_print("apple", "banana");
}
```

## Defining Your Own Traits

Create traits to define shared behavior.

```rust
trait Drawable {
    fn draw(&self);

    // Default implementation
    fn draw_twice(&self) {
        self.draw();
        self.draw();
    }
}

struct Circle {
    radius: f64,
}

struct Rectangle {
    width: f64,
    height: f64,
}

impl Drawable for Circle {
    fn draw(&self) {
        println!("Drawing circle with radius {}", self.radius);
    }
}

impl Drawable for Rectangle {
    fn draw(&self) {
        println!("Drawing rectangle {}x{}", self.width, self.height);
    }

    // Override default implementation
    fn draw_twice(&self) {
        println!("Drawing rectangle twice: {}x{}", self.width, self.height);
    }
}

fn render<T: Drawable>(item: &T) {
    item.draw();
}

fn main() {
    let circle = Circle { radius: 5.0 };
    let rect = Rectangle { width: 10.0, height: 5.0 };

    render(&circle);
    render(&rect);

    circle.draw_twice();
    rect.draw_twice();
}
```

## Dynamic Polymorphism with Trait Objects

Use `dyn Trait` for runtime polymorphism when types are unknown at compile time.

```rust
trait Animal {
    fn speak(&self) -> String;
    fn name(&self) -> &str;
}

struct Dog {
    name: String,
}

struct Cat {
    name: String,
}

struct Cow {
    name: String,
}

impl Animal for Dog {
    fn speak(&self) -> String {
        String::from("Woof!")
    }
    fn name(&self) -> &str {
        &self.name
    }
}

impl Animal for Cat {
    fn speak(&self) -> String {
        String::from("Meow!")
    }
    fn name(&self) -> &str {
        &self.name
    }
}

impl Animal for Cow {
    fn speak(&self) -> String {
        String::from("Moo!")
    }
    fn name(&self) -> &str {
        &self.name
    }
}

fn main() {
    // Vec of trait objects - different concrete types
    let animals: Vec<Box<dyn Animal>> = vec![
        Box::new(Dog { name: String::from("Rex") }),
        Box::new(Cat { name: String::from("Whiskers") }),
        Box::new(Cow { name: String::from("Bessie") }),
    ];

    for animal in &animals {
        println!("{} says {}", animal.name(), animal.speak());
    }
}
```

## When to Use Static vs Dynamic Dispatch

```rust
trait Processor {
    fn process(&self, data: &str) -> String;
}

struct UpperCase;
struct Reverse;

impl Processor for UpperCase {
    fn process(&self, data: &str) -> String {
        data.to_uppercase()
    }
}

impl Processor for Reverse {
    fn process(&self, data: &str) -> String {
        data.chars().rev().collect()
    }
}

// Static dispatch - zero runtime cost, larger binary
fn process_static<P: Processor>(processor: &P, data: &str) -> String {
    processor.process(data)
}

// Dynamic dispatch - runtime cost, smaller binary
fn process_dynamic(processor: &dyn Processor, data: &str) -> String {
    processor.process(data)
}

// Return trait object when type varies
fn get_processor(uppercase: bool) -> Box<dyn Processor> {
    if uppercase {
        Box::new(UpperCase)
    } else {
        Box::new(Reverse)
    }
}

fn main() {
    let upper = UpperCase;
    let reverse = Reverse;

    // Static dispatch - compiler knows exact type
    println!("{}", process_static(&upper, "hello"));
    println!("{}", process_static(&reverse, "hello"));

    // Dynamic dispatch - type determined at runtime
    let processor = get_processor(true);
    println!("{}", process_dynamic(processor.as_ref(), "hello"));
}
```

## Trait Objects and Object Safety

Not all traits can be used as trait objects. A trait is object-safe if:

- It does not have methods returning Self
- It does not have generic methods

```rust
// Object-safe trait
trait Describe {
    fn describe(&self) -> String;
}

// NOT object-safe - returns Self
trait Clonable {
    fn clone_self(&self) -> Self;
}

// NOT object-safe - generic method
trait Generic {
    fn process<T>(&self, value: T);
}

// Workaround: Associated type instead of Self
trait Factory {
    type Output;
    fn create(&self) -> Self::Output;
}

// Workaround: Use Box<dyn Trait> instead of Self
trait CloneBox {
    fn clone_box(&self) -> Box<dyn CloneBox>;
}

impl<T: Clone + CloneBox + 'static> CloneBox for T {
    fn clone_box(&self) -> Box<dyn CloneBox> {
        Box::new(self.clone())
    }
}

fn main() {
    // Can use Describe as trait object
    let items: Vec<Box<dyn Describe>> = vec![];
    println!("Items: {}", items.len());
}
```

## Trait Bounds in Structs

Store generic types with trait bounds in structs.

```rust
use std::fmt::Debug;

// Generic struct with trait bound
struct Container<T: Debug> {
    value: T,
}

impl<T: Debug> Container<T> {
    fn new(value: T) -> Self {
        Container { value }
    }

    fn print(&self) {
        println!("{:?}", self.value);
    }
}

// Struct with trait object for runtime flexibility
struct DynamicContainer {
    value: Box<dyn Debug>,
}

impl DynamicContainer {
    fn new<T: Debug + 'static>(value: T) -> Self {
        DynamicContainer {
            value: Box::new(value),
        }
    }

    fn print(&self) {
        println!("{:?}", self.value);
    }
}

fn main() {
    // Generic container - type known at compile time
    let int_container = Container::new(42);
    let str_container = Container::new("hello");

    int_container.print();
    str_container.print();

    // Dynamic container - type can vary
    let containers: Vec<DynamicContainer> = vec![
        DynamicContainer::new(42),
        DynamicContainer::new("hello"),
        DynamicContainer::new(vec![1, 2, 3]),
    ];

    for container in &containers {
        container.print();
    }
}
```

## Supertraits

Traits can require other traits as dependencies.

```rust
use std::fmt::Display;

// Supertrait: Printable requires Display
trait Printable: Display {
    fn print(&self) {
        println!("{}", self);
    }
}

// Multiple supertraits
trait DebugPrintable: std::fmt::Debug + Display {
    fn debug_print(&self) {
        println!("Debug: {:?}", self);
        println!("Display: {}", self);
    }
}

// Implement for types that already have Display
struct Point {
    x: i32,
    y: i32,
}

impl Display for Point {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}

impl Printable for Point {}

fn main() {
    let p = Point { x: 10, y: 20 };
    p.print();
}
```

## Extension Traits

Add methods to existing types using extension traits.

```rust
// Extension trait for String
trait StringExt {
    fn is_blank(&self) -> bool;
    fn truncate_words(&self, max_words: usize) -> String;
}

impl StringExt for str {
    fn is_blank(&self) -> bool {
        self.trim().is_empty()
    }

    fn truncate_words(&self, max_words: usize) -> String {
        self.split_whitespace()
            .take(max_words)
            .collect::<Vec<_>>()
            .join(" ")
    }
}

// Extension trait for iterators
trait IteratorExt: Iterator {
    fn take_until<P>(self, predicate: P) -> TakeUntil<Self, P>
    where
        Self: Sized,
        P: FnMut(&Self::Item) -> bool,
    {
        TakeUntil {
            iter: self,
            predicate,
            done: false,
        }
    }
}

impl<It: Iterator> IteratorExt for It {}

struct TakeUntil<It, P> {
    iter: It,
    predicate: P,
    done: bool,
}

impl<It: Iterator, P: FnMut(&It::Item) -> bool> Iterator for TakeUntil<It, P> {
    type Item = It::Item;

    fn next(&mut self) -> Option<Self::Item> {
        if self.done {
            return None;
        }
        match self.iter.next() {
            Some(item) if (self.predicate)(&item) => {
                self.done = true;
                None
            }
            item => item,
        }
    }
}

fn main() {
    let text = "   ";
    println!("Is blank: {}", text.is_blank());

    let long_text = "This is a very long sentence with many words";
    println!("Truncated: {}", long_text.truncate_words(4));

    // Using custom iterator extension
    let numbers: Vec<i32> = (1..10)
        .take_until(|&x| x > 5)
        .collect();
    println!("Numbers: {:?}", numbers);
}
```

## Strategy Pattern with Traits

Use traits to implement the strategy pattern.

```rust
trait SortStrategy {
    fn sort(&self, data: &mut [i32]);
}

struct BubbleSort;
struct QuickSort;

impl SortStrategy for BubbleSort {
    fn sort(&self, data: &mut [i32]) {
        let len = data.len();
        for i in 0..len {
            for j in 0..len - 1 - i {
                if data[j] > data[j + 1] {
                    data.swap(j, j + 1);
                }
            }
        }
    }
}

impl SortStrategy for QuickSort {
    fn sort(&self, data: &mut [i32]) {
        data.sort();  // Using built-in for simplicity
    }
}

struct Sorter<St: SortStrategy> {
    strategy: St,
}

impl<St: SortStrategy> Sorter<St> {
    fn new(strategy: St) -> Self {
        Sorter { strategy }
    }

    fn sort(&self, data: &mut [i32]) {
        self.strategy.sort(data);
    }
}

fn main() {
    let mut data1 = vec![5, 2, 8, 1, 9];
    let mut data2 = data1.clone();

    let bubble_sorter = Sorter::new(BubbleSort);
    let quick_sorter = Sorter::new(QuickSort);

    bubble_sorter.sort(&mut data1);
    quick_sorter.sort(&mut data2);

    println!("Bubble sorted: {:?}", data1);
    println!("Quick sorted: {:?}", data2);
}
```

## Summary

Rust provides two forms of polymorphism through traits:

| Approach | Syntax | Performance | Flexibility |
|----------|--------|-------------|-------------|
| Static (generics) | `fn foo<T: Trait>` | Zero cost | Types known at compile time |
| Dynamic (trait objects) | `&dyn Trait` | Virtual dispatch | Types vary at runtime |

Key concepts:

- Traits define shared behavior across types
- Generics provide static dispatch with monomorphization
- Trait objects provide dynamic dispatch with vtables
- Object safety rules determine which traits can be trait objects
- Supertraits allow trait inheritance
- Extension traits add methods to existing types

Choose static dispatch for performance-critical code and dynamic dispatch when you need runtime flexibility or heterogeneous collections.
