# How to Return Iterator Trait from Functions in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Iterators, Traits, impl Trait, Generics

Description: Learn different approaches to return iterators from functions in Rust including impl Trait, Box dyn, and concrete types. Understand the trade-offs between each approach.

---

Returning iterators from functions in Rust can be tricky because iterator types are often complex and compiler-generated. This guide covers the different approaches for returning iterators, their trade-offs, and when to use each one.

## The Challenge

Iterator adapter methods like `map`, `filter`, and `chain` return types with long, complex names that include closures. These types cannot be written explicitly:

```rust
// What type does this return?
fn get_evens(numbers: Vec<i32>) -> ??? {
    numbers.into_iter().filter(|n| n % 2 == 0)
}
// The actual type is something like:
// Filter<IntoIter<i32>, [closure@src/main.rs:2:35]>
```

## Solution 1: impl Trait (Recommended)

The `impl Trait` syntax lets you return "some type that implements Iterator" without naming it:

```rust
// Return an iterator that yields i32 values
fn get_evens(numbers: Vec<i32>) -> impl Iterator<Item = i32> {
    numbers.into_iter().filter(|n| n % 2 == 0)
}

// Chain multiple operations
fn process_data(data: Vec<String>) -> impl Iterator<Item = String> {
    data.into_iter()
        .filter(|s| !s.is_empty())
        .map(|s| s.to_uppercase())
        .take(10)
}

// Works with references too
fn find_matches<'a>(items: &'a [String], prefix: &'a str) -> impl Iterator<Item = &'a String> {
    items.iter().filter(move |s| s.starts_with(prefix))
}

fn main() {
    let numbers = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let evens: Vec<i32> = get_evens(numbers).collect();
    println!("Evens: {:?}", evens);

    let data = vec!["hello".into(), "".into(), "world".into()];
    for item in process_data(data) {
        println!("{}", item);
    }

    let items = vec!["apple".into(), "apricot".into(), "banana".into()];
    for matched in find_matches(&items, "ap") {
        println!("Match: {}", matched);
    }
}
```

### Advantages of impl Trait
- Zero-cost abstraction (no heap allocation)
- Compiler can inline and optimize
- Simple syntax

### Limitations of impl Trait
- Cannot return different iterator types conditionally
- The actual type is hidden from callers

## Solution 2: Box<dyn Iterator> for Dynamic Dispatch

When you need to return different iterator types based on conditions, use trait objects:

```rust
// Return different iterators based on condition
fn get_numbers(ascending: bool) -> Box<dyn Iterator<Item = i32>> {
    if ascending {
        Box::new(1..=10)
    } else {
        Box::new((1..=10).rev())
    }
}

// Combine different sources
fn merge_sources(
    use_cache: bool,
    cache: Vec<i32>,
    compute: impl Fn() -> Vec<i32> + 'static,
) -> Box<dyn Iterator<Item = i32>> {
    if use_cache {
        Box::new(cache.into_iter())
    } else {
        Box::new(compute().into_iter())
    }
}

fn main() {
    println!("Ascending:");
    for n in get_numbers(true) {
        print!("{} ", n);
    }
    println!();

    println!("Descending:");
    for n in get_numbers(false) {
        print!("{} ", n);
    }
    println!();
}
```

### When to Use Box<dyn Iterator>
- Returning different iterator types conditionally
- When the iterator needs to be stored in a struct
- When compile times are a concern (reduces monomorphization)

## Solution 3: Concrete Iterator Types

For simple cases, return the concrete iterator type:

```rust
use std::vec::IntoIter;
use std::slice::Iter;
use std::ops::Range;

// Return a vector iterator
fn get_items() -> IntoIter<String> {
    vec!["a".to_string(), "b".to_string(), "c".to_string()].into_iter()
}

// Return a slice iterator
fn get_slice_iter(data: &[i32]) -> Iter<'_, i32> {
    data.iter()
}

// Return a range
fn get_range(start: i32, end: i32) -> Range<i32> {
    start..end
}

fn main() {
    for item in get_items() {
        println!("{}", item);
    }

    let data = [1, 2, 3, 4, 5];
    for n in get_slice_iter(&data) {
        println!("{}", n);
    }

    for n in get_range(5, 10) {
        println!("{}", n);
    }
}
```

## Solution 4: Custom Iterator Type

Create a struct that implements Iterator for complex logic:

```rust
// Custom iterator for Fibonacci sequence
struct Fibonacci {
    current: u64,
    next: u64,
    limit: u64,
}

impl Fibonacci {
    fn new(limit: u64) -> Self {
        Fibonacci {
            current: 0,
            next: 1,
            limit,
        }
    }
}

impl Iterator for Fibonacci {
    type Item = u64;

    fn next(&mut self) -> Option<Self::Item> {
        if self.current > self.limit {
            return None;
        }

        let result = self.current;
        self.current = self.next;
        self.next = result + self.next;
        Some(result)
    }
}

fn fibonacci(limit: u64) -> Fibonacci {
    Fibonacci::new(limit)
}

// Paginated results iterator
struct PageIterator<T> {
    items: Vec<T>,
    page_size: usize,
    current_page: usize,
}

impl<T> PageIterator<T> {
    fn new(items: Vec<T>, page_size: usize) -> Self {
        PageIterator {
            items,
            page_size,
            current_page: 0,
        }
    }
}

impl<T: Clone> Iterator for PageIterator<T> {
    type Item = Vec<T>;

    fn next(&mut self) -> Option<Self::Item> {
        let start = self.current_page * self.page_size;
        if start >= self.items.len() {
            return None;
        }

        let end = (start + self.page_size).min(self.items.len());
        self.current_page += 1;
        Some(self.items[start..end].to_vec())
    }
}

fn paginate<T: Clone>(items: Vec<T>, page_size: usize) -> PageIterator<T> {
    PageIterator::new(items, page_size)
}

fn main() {
    println!("Fibonacci up to 100:");
    for n in fibonacci(100) {
        print!("{} ", n);
    }
    println!();

    let items: Vec<i32> = (1..=25).collect();
    println!("\nPaginated (page size 10):");
    for (i, page) in paginate(items, 10).enumerate() {
        println!("Page {}: {:?}", i + 1, page);
    }
}
```

## Returning Iterators from Methods

Methods can also return iterators using similar patterns:

```rust
struct DataStore {
    items: Vec<String>,
    numbers: Vec<i32>,
}

impl DataStore {
    fn new() -> Self {
        DataStore {
            items: vec!["apple".into(), "banana".into(), "cherry".into()],
            numbers: vec![1, 2, 3, 4, 5],
        }
    }

    // Return iterator over references
    fn items(&self) -> impl Iterator<Item = &String> {
        self.items.iter()
    }

    // Return filtered iterator
    fn even_numbers(&self) -> impl Iterator<Item = &i32> {
        self.numbers.iter().filter(|n| *n % 2 == 0)
    }

    // Return mapped iterator
    fn item_lengths(&self) -> impl Iterator<Item = usize> + '_ {
        self.items.iter().map(|s| s.len())
    }

    // Consuming iterator (takes ownership of data)
    fn into_items(self) -> impl Iterator<Item = String> {
        self.items.into_iter()
    }
}

fn main() {
    let store = DataStore::new();

    println!("Items:");
    for item in store.items() {
        println!("  {}", item);
    }

    println!("Even numbers:");
    for n in store.even_numbers() {
        println!("  {}", n);
    }

    println!("Item lengths:");
    for len in store.item_lengths() {
        println!("  {}", len);
    }

    // Consume the store
    let store2 = DataStore::new();
    for item in store2.into_items() {
        println!("Owned: {}", item);
    }
}
```

## Generic Functions Returning Iterators

Use generics when the input type varies:

```rust
// Generic filter function
fn filter_positive<I>(iter: I) -> impl Iterator<Item = i32>
where
    I: Iterator<Item = i32>,
{
    iter.filter(|n| *n > 0)
}

// Transform any iterator
fn double_values<I>(iter: I) -> impl Iterator<Item = i32>
where
    I: Iterator<Item = i32>,
{
    iter.map(|n| n * 2)
}

// Chain iterators
fn combine<I, J>(first: I, second: J) -> impl Iterator<Item = i32>
where
    I: Iterator<Item = i32>,
    J: Iterator<Item = i32>,
{
    first.chain(second)
}

fn main() {
    let numbers = vec![-2, -1, 0, 1, 2, 3];
    let positive: Vec<i32> = filter_positive(numbers.into_iter()).collect();
    println!("Positive: {:?}", positive);

    let values = vec![1, 2, 3, 4, 5];
    let doubled: Vec<i32> = double_values(values.into_iter()).collect();
    println!("Doubled: {:?}", doubled);

    let a = vec![1, 2, 3];
    let b = vec![4, 5, 6];
    let combined: Vec<i32> = combine(a.into_iter(), b.into_iter()).collect();
    println!("Combined: {:?}", combined);
}
```

## Comparison of Approaches

| Approach | Heap Allocation | Dynamic Dispatch | Conditional Returns | Complexity |
|----------|-----------------|------------------|---------------------|------------|
| `impl Trait` | No | No | No | Low |
| `Box<dyn>` | Yes | Yes | Yes | Medium |
| Concrete type | No | No | No | Low |
| Custom iterator | No | No | Depends | High |

## Summary

- Use `impl Iterator<Item = T>` for most cases where you return a single iterator type
- Use `Box<dyn Iterator<Item = T>>` when you need to return different types conditionally
- Create custom iterator types for complex iteration logic
- Return concrete types like `IntoIter<T>` or `Range<T>` for simple cases

The `impl Trait` approach provides zero-cost abstraction and should be your default choice. Fall back to `Box<dyn Iterator>` only when you need runtime polymorphism.
