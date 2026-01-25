# How to Use Generics in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Generics, Type System, Traits, Performance

Description: A comprehensive guide to generics in Rust. Learn generic functions, structs, enums, trait bounds, and advanced patterns for writing flexible and reusable code.

---

Generics allow you to write code that works with multiple types without duplicating logic. Rust's generics have zero runtime cost because the compiler generates specialized code for each concrete type used. This guide covers everything from basic generics to advanced patterns.

## Basic Generic Functions

Generic functions use type parameters in angle brackets.

```rust
// Generic function with one type parameter
fn identity<T>(value: T) -> T {
    value
}

// Multiple type parameters
fn pair<T, U>(first: T, second: U) -> (T, U) {
    (first, second)
}

// Generic with return type
fn create_default<T: Default>() -> T {
    T::default()
}

fn main() {
    // Type inferred from usage
    let x = identity(42);
    let s = identity("hello");

    // Explicit type annotation
    let y = identity::<f64>(3.14);

    // Multiple types
    let p = pair(1, "one");
    println!("Pair: {:?}", p);

    // Specify return type
    let v: Vec<i32> = create_default();
    let s: String = create_default();
}
```

## Generic Structs

Structs can have generic type parameters.

```rust
// Single type parameter
struct Container<T> {
    value: T,
}

impl<T> Container<T> {
    fn new(value: T) -> Self {
        Container { value }
    }

    fn get(&self) -> &T {
        &self.value
    }

    fn into_inner(self) -> T {
        self.value
    }
}

// Multiple type parameters
struct KeyValue<K, V> {
    key: K,
    value: V,
}

impl<K, V> KeyValue<K, V> {
    fn new(key: K, value: V) -> Self {
        KeyValue { key, value }
    }
}

fn main() {
    let int_container = Container::new(42);
    let str_container = Container::new("hello");

    println!("Int: {}", int_container.get());
    println!("Str: {}", str_container.get());

    let kv = KeyValue::new("name", "Alice");
    println!("Key: {}, Value: {}", kv.key, kv.value);
}
```

## Generic Enums

Enums use generics to work with any type.

```rust
// Standard library examples:
// enum Option<T> { Some(T), None }
// enum Result<T, E> { Ok(T), Err(E) }

// Custom generic enum
enum Tree<T> {
    Empty,
    Leaf(T),
    Node {
        value: T,
        left: Box<Tree<T>>,
        right: Box<Tree<T>>,
    },
}

impl<T> Tree<T> {
    fn leaf(value: T) -> Self {
        Tree::Leaf(value)
    }

    fn node(value: T, left: Tree<T>, right: Tree<T>) -> Self {
        Tree::Node {
            value,
            left: Box::new(left),
            right: Box::new(right),
        }
    }
}

fn main() {
    let tree = Tree::node(
        2,
        Tree::leaf(1),
        Tree::leaf(3),
    );

    println!("Tree created");
}
```

## Trait Bounds

Constrain generic types with trait bounds.

```rust
use std::fmt::Display;

// Single bound
fn print_value<T: Display>(value: T) {
    println!("{}", value);
}

// Multiple bounds with +
fn print_debug<T: Display + std::fmt::Debug>(value: T) {
    println!("Display: {}", value);
    println!("Debug: {:?}", value);
}

// where clause for complex bounds
fn process<T, U>(t: T, u: U) -> String
where
    T: Display + Clone,
    U: Display + Into<String>,
{
    format!("{} - {}", t.clone(), u)
}

// Bounds on struct methods
struct Wrapper<T> {
    value: T,
}

impl<T> Wrapper<T> {
    fn new(value: T) -> Self {
        Wrapper { value }
    }
}

// Method only available when T: Display
impl<T: Display> Wrapper<T> {
    fn print(&self) {
        println!("{}", self.value);
    }
}

// Method only available when T: Clone
impl<T: Clone> Wrapper<T> {
    fn duplicate(&self) -> Self {
        Wrapper { value: self.value.clone() }
    }
}

fn main() {
    print_value(42);
    print_value("hello");

    let wrapper = Wrapper::new(42);
    wrapper.print();  // Works because i32: Display

    let clone = wrapper.duplicate();  // Works because i32: Clone
}
```

## Associated Types vs Generic Parameters

Choose between associated types and generics based on your use case.

```rust
// Generic trait - multiple implementations per type
trait Converter<Output> {
    fn convert(&self) -> Output;
}

impl Converter<String> for i32 {
    fn convert(&self) -> String {
        self.to_string()
    }
}

impl Converter<f64> for i32 {
    fn convert(&self) -> f64 {
        *self as f64
    }
}

// Associated type - one implementation per type
trait IntoCollection {
    type Collection;
    fn into_collection(self) -> Self::Collection;
}

impl IntoCollection for Vec<i32> {
    type Collection = std::collections::HashSet<i32>;

    fn into_collection(self) -> Self::Collection {
        self.into_iter().collect()
    }
}

fn main() {
    let num = 42i32;

    let s: String = num.convert();
    let f: f64 = num.convert();

    println!("String: {}, Float: {}", s, f);

    let vec = vec![1, 2, 3, 3, 2, 1];
    let set = vec.into_collection();
    println!("Set: {:?}", set);
}
```

## Default Type Parameters

Provide default types for generic parameters.

```rust
use std::ops::Add;

// Default type parameter
struct Counter<T = i32> {
    count: T,
}

impl<T: Default> Counter<T> {
    fn new() -> Self {
        Counter { count: T::default() }
    }
}

impl<T: Add<Output = T> + Copy> Counter<T> {
    fn add(&mut self, amount: T) {
        self.count = self.count + amount;
    }
}

// Operator overloading with default
trait CustomAdd<Rhs = Self> {
    type Output;
    fn custom_add(self, rhs: Rhs) -> Self::Output;
}

impl CustomAdd for i32 {
    type Output = i32;
    fn custom_add(self, rhs: i32) -> i32 {
        self + rhs
    }
}

fn main() {
    // Uses default type i32
    let mut counter: Counter = Counter::new();
    counter.add(5);

    // Explicit type
    let mut float_counter: Counter<f64> = Counter::new();
    float_counter.add(3.14);

    println!("Count: {}", counter.count);
}
```

## Const Generics

Use compile-time constant values as generic parameters.

```rust
// Array wrapper with const generic size
struct Array<T, const N: usize> {
    data: [T; N],
}

impl<T: Default + Copy, const N: usize> Array<T, N> {
    fn new() -> Self {
        Array {
            data: [T::default(); N],
        }
    }

    fn len(&self) -> usize {
        N
    }
}

impl<T, const N: usize> Array<T, N> {
    fn get(&self, index: usize) -> Option<&T> {
        if index < N {
            Some(&self.data[index])
        } else {
            None
        }
    }
}

// Function with const generic
fn create_zeros<const N: usize>() -> [i32; N] {
    [0; N]
}

fn main() {
    let arr: Array<i32, 5> = Array::new();
    println!("Length: {}", arr.len());

    let zeros = create_zeros::<3>();
    println!("Zeros: {:?}", zeros);
}
```

## Phantom Types

Use PhantomData for type-level state without runtime cost.

```rust
use std::marker::PhantomData;

// Type states
struct Locked;
struct Unlocked;

struct Door<State> {
    _state: PhantomData<State>,
}

impl Door<Locked> {
    fn unlock(self) -> Door<Unlocked> {
        println!("Door unlocked");
        Door { _state: PhantomData }
    }
}

impl Door<Unlocked> {
    fn lock(self) -> Door<Locked> {
        println!("Door locked");
        Door { _state: PhantomData }
    }

    fn open(&self) {
        println!("Door opened");
    }
}

fn new_door() -> Door<Locked> {
    Door { _state: PhantomData }
}

fn main() {
    let door = new_door();  // Locked

    // door.open();  // Error! Cannot open locked door

    let door = door.unlock();  // Now unlocked
    door.open();  // OK

    let door = door.lock();  // Locked again
}
```

## Generic Implementations for Multiple Types

Implement traits for multiple generic combinations.

```rust
use std::fmt::Display;

trait Printable {
    fn print(&self);
}

// Blanket implementation for all Display types
impl<T: Display> Printable for T {
    fn print(&self) {
        println!("{}", self);
    }
}

// Specific implementation for Vec<T> where T: Display
impl<T: Display> Printable for Vec<T> {
    fn print(&self) {
        print!("[");
        for (i, item) in self.iter().enumerate() {
            if i > 0 {
                print!(", ");
            }
            print!("{}", item);
        }
        println!("]");
    }
}

fn main() {
    42.print();
    "hello".print();
    vec![1, 2, 3].print();
}
```

## Turbofish Syntax

Explicitly specify generic types with `::<>`.

```rust
fn main() {
    // Type inference
    let v = vec![1, 2, 3];

    // Turbofish for explicit type
    let v = Vec::<i32>::new();

    // On method calls
    let parsed = "42".parse::<i32>().unwrap();

    // On collect
    let numbers: Vec<i32> = (0..5).collect();
    // Or with turbofish
    let numbers = (0..5).collect::<Vec<i32>>();
    // Or with placeholder
    let numbers = (0..5).collect::<Vec<_>>();

    println!("Parsed: {}", parsed);
}
```

## Summary

Generics in Rust provide flexibility without runtime cost:

| Feature | Syntax | Use Case |
|---------|--------|----------|
| Generic function | `fn foo<T>()` | Reusable logic |
| Generic struct | `struct Foo<T>` | Type-parameterized data |
| Trait bounds | `T: Trait` | Constrain capabilities |
| where clause | `where T: Trait` | Complex bounds |
| Associated types | `type Item` | One impl per type |
| Const generics | `const N: usize` | Compile-time values |
| Phantom types | `PhantomData<T>` | Type-level markers |

Key points:

- Generics are monomorphized at compile time
- Use trait bounds to specify required functionality
- Choose associated types when there is one natural implementation
- Use generics when multiple implementations make sense
- Const generics enable array sizes and other constants as parameters

Generics are fundamental to Rust's type system, enabling code reuse while maintaining type safety and performance.
