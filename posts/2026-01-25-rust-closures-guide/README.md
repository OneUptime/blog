# How to Use Closures in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Closures, Functional Programming, Iterators, Performance

Description: A comprehensive guide to closures in Rust. Learn about closure syntax, capturing variables, the Fn traits, and practical use cases with clear examples.

---

Closures are anonymous functions that can capture variables from their surrounding scope. They are one of Rust's most powerful features, enabling functional programming patterns and making code more expressive. This guide covers everything you need to know about using closures effectively.

## Basic Closure Syntax

Closures in Rust use the pipe symbol `|` to define parameters. The body can be a single expression or a block.

```rust
fn main() {
    // Basic closure with explicit types
    let add = |x: i32, y: i32| -> i32 { x + y };
    println!("5 + 3 = {}", add(5, 3));

    // Type inference allows shorter syntax
    let multiply = |x, y| x * y;
    println!("4 * 7 = {}", multiply(4, 7));

    // Closure with no parameters
    let greet = || println!("Hello, world!");
    greet();

    // Multi-line closure body
    let complex = |x: i32| {
        let doubled = x * 2;
        let squared = doubled * doubled;
        squared
    };
    println!("Result: {}", complex(3)); // (3 * 2)^2 = 36
}
```

## Capturing Variables

Closures can capture variables from their enclosing scope in three ways: by reference, by mutable reference, or by value.

### Capturing by Reference (Fn)

By default, closures borrow variables immutably when possible.

```rust
fn main() {
    let message = String::from("Hello");

    // Closure borrows message immutably
    let print_message = || {
        println!("{}", message);
    };

    print_message();
    print_message();

    // message is still usable here because it was only borrowed
    println!("Original: {}", message);
}
```

### Capturing by Mutable Reference (FnMut)

When a closure modifies a captured variable, it borrows mutably.

```rust
fn main() {
    let mut counter = 0;

    // Closure borrows counter mutably
    let mut increment = || {
        counter += 1;
        println!("Counter: {}", counter);
    };

    increment(); // Counter: 1
    increment(); // Counter: 2
    increment(); // Counter: 3

    // After closure is done, we can use counter again
    println!("Final: {}", counter);
}
```

### Capturing by Value (FnOnce)

Using the `move` keyword forces the closure to take ownership of captured variables.

```rust
fn main() {
    let data = vec![1, 2, 3, 4, 5];

    // move keyword transfers ownership to the closure
    let print_data = move || {
        println!("Data: {:?}", data);
    };

    print_data();

    // This would error: data has been moved
    // println!("{:?}", data);
}

// Common use case: spawning threads
fn thread_example() {
    let message = String::from("Hello from thread");

    // Threads require 'static lifetime, so we must move owned data
    let handle = std::thread::spawn(move || {
        println!("{}", message);
    });

    handle.join().unwrap();
}
```

## The Fn Traits

Rust has three traits that define how closures capture their environment:

```rust
// FnOnce: Takes ownership, can only be called once
// FnMut: Takes mutable reference, can be called multiple times
// Fn: Takes immutable reference, can be called multiple times

fn call_once<F>(f: F)
where
    F: FnOnce(),
{
    f();
    // Cannot call f() again - it might have consumed captured values
}

fn call_mut<F>(mut f: F)
where
    F: FnMut(),
{
    f();
    f(); // Can call multiple times
}

fn call_fn<F>(f: F)
where
    F: Fn(),
{
    f();
    f(); // Can call multiple times, even concurrently
}

fn main() {
    let value = String::from("hello");

    // This closure implements all three traits
    let print = || println!("{}", value);
    call_fn(print);

    let mut count = 0;
    // This closure implements FnMut and FnOnce
    let mut counter = || {
        count += 1;
    };
    call_mut(&mut counter);

    let owned = String::from("owned");
    // This closure only implements FnOnce
    let consume = || {
        drop(owned);
    };
    call_once(consume);
}
```

## Closures with Iterators

Closures are essential for iterator methods like `map`, `filter`, and `fold`.

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // map: transform each element
    let doubled: Vec<i32> = numbers.iter().map(|x| x * 2).collect();
    println!("Doubled: {:?}", doubled);

    // filter: keep elements matching a condition
    let evens: Vec<&i32> = numbers.iter().filter(|x| *x % 2 == 0).collect();
    println!("Evens: {:?}", evens);

    // filter_map: filter and transform in one step
    let parse_results: Vec<i32> = vec!["1", "two", "3", "four", "5"]
        .iter()
        .filter_map(|s| s.parse::<i32>().ok())
        .collect();
    println!("Parsed: {:?}", parse_results);

    // fold: accumulate into a single value
    let sum = numbers.iter().fold(0, |acc, x| acc + x);
    println!("Sum: {}", sum);

    // Chaining multiple operations
    let result: i32 = numbers
        .iter()
        .filter(|x| *x % 2 == 0)  // Keep evens
        .map(|x| x * x)            // Square them
        .sum();                     // Sum the results
    println!("Sum of squared evens: {}", result);
}
```

## Returning Closures from Functions

Since closures have unique anonymous types, you must use `impl Trait` or `Box<dyn Trait>` to return them.

```rust
// Return a closure using impl Trait (preferred when possible)
fn make_adder(n: i32) -> impl Fn(i32) -> i32 {
    move |x| x + n
}

// Return a closure using Box<dyn Trait> (needed for multiple closure types)
fn make_operation(op: &str) -> Box<dyn Fn(i32, i32) -> i32> {
    match op {
        "add" => Box::new(|a, b| a + b),
        "sub" => Box::new(|a, b| a - b),
        "mul" => Box::new(|a, b| a * b),
        _ => Box::new(|a, b| a / b),
    }
}

fn main() {
    let add_5 = make_adder(5);
    println!("10 + 5 = {}", add_5(10));

    let add = make_operation("add");
    let mul = make_operation("mul");
    println!("3 + 4 = {}", add(3, 4));
    println!("3 * 4 = {}", mul(3, 4));
}
```

## Closures as Struct Fields

You can store closures in structs using generics or trait objects.

```rust
// Using generics - more performant, closure type is part of struct type
struct Processor<F>
where
    F: Fn(i32) -> i32,
{
    operation: F,
}

impl<F> Processor<F>
where
    F: Fn(i32) -> i32,
{
    fn new(operation: F) -> Self {
        Processor { operation }
    }

    fn process(&self, value: i32) -> i32 {
        (self.operation)(value)
    }
}

// Using trait objects - more flexible, can change at runtime
struct DynamicProcessor {
    operation: Box<dyn Fn(i32) -> i32>,
}

impl DynamicProcessor {
    fn new(operation: Box<dyn Fn(i32) -> i32>) -> Self {
        DynamicProcessor { operation }
    }

    fn process(&self, value: i32) -> i32 {
        (self.operation)(value)
    }
}

fn main() {
    let doubler = Processor::new(|x| x * 2);
    println!("Doubled: {}", doubler.process(21));

    let tripler = DynamicProcessor::new(Box::new(|x| x * 3));
    println!("Tripled: {}", tripler.process(14));
}
```

## Common Patterns

### Callback Pattern

```rust
fn process_data<F>(data: Vec<i32>, on_complete: F)
where
    F: FnOnce(Vec<i32>),
{
    let processed: Vec<i32> = data.iter().map(|x| x * 2).collect();
    on_complete(processed);
}

fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    process_data(numbers, |result| {
        println!("Processing complete: {:?}", result);
    });
}
```

### Builder Pattern with Closures

```rust
struct QueryBuilder {
    conditions: Vec<Box<dyn Fn(&str) -> bool>>,
}

impl QueryBuilder {
    fn new() -> Self {
        QueryBuilder { conditions: Vec::new() }
    }

    fn where_clause<F>(mut self, condition: F) -> Self
    where
        F: Fn(&str) -> bool + 'static,
    {
        self.conditions.push(Box::new(condition));
        self
    }

    fn matches(&self, value: &str) -> bool {
        self.conditions.iter().all(|cond| cond(value))
    }
}

fn main() {
    let query = QueryBuilder::new()
        .where_clause(|s| s.len() > 3)
        .where_clause(|s| s.starts_with('h'));

    println!("'hello' matches: {}", query.matches("hello")); // true
    println!("'hi' matches: {}", query.matches("hi"));       // false
}
```

### Memoization with Closures

```rust
use std::collections::HashMap;

struct Memoized<F>
where
    F: Fn(i32) -> i32,
{
    calculation: F,
    cache: HashMap<i32, i32>,
}

impl<F> Memoized<F>
where
    F: Fn(i32) -> i32,
{
    fn new(calculation: F) -> Self {
        Memoized {
            calculation,
            cache: HashMap::new(),
        }
    }

    fn get(&mut self, arg: i32) -> i32 {
        if let Some(&result) = self.cache.get(&arg) {
            return result;
        }

        let result = (self.calculation)(arg);
        self.cache.insert(arg, result);
        result
    }
}

fn main() {
    let mut expensive = Memoized::new(|x| {
        println!("Computing for {}", x);
        x * x
    });

    println!("Result: {}", expensive.get(5)); // Computes
    println!("Result: {}", expensive.get(5)); // Cached
    println!("Result: {}", expensive.get(3)); // Computes
}
```

## Performance Considerations

Closures in Rust are highly optimized. When the closure type is known at compile time (using generics), the compiler can inline the closure code, resulting in zero overhead compared to regular functions.

```rust
// Generic version - closure is inlined, zero overhead
fn apply_generic<F: Fn(i32) -> i32>(f: F, x: i32) -> i32 {
    f(x)
}

// Trait object version - dynamic dispatch, small overhead
fn apply_dynamic(f: &dyn Fn(i32) -> i32, x: i32) -> i32 {
    f(x)
}

fn main() {
    let closure = |x| x + 1;

    // Generic: compiler monomorphizes, inlines the closure
    let result1 = apply_generic(&closure, 10);

    // Dynamic: uses vtable lookup at runtime
    let result2 = apply_dynamic(&closure, 10);

    println!("{} {}", result1, result2);
}
```

## Summary

Closures are a fundamental part of Rust programming. They enable:

- Anonymous functions that capture their environment
- Functional programming patterns with iterators
- Flexible callback and handler mechanisms
- Builder patterns and lazy evaluation

Understanding the three Fn traits (Fn, FnMut, FnOnce) and how closures capture variables will help you write more expressive and efficient Rust code. Use generics for performance-critical code and trait objects when you need runtime flexibility.
