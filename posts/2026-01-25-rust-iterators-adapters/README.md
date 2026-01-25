# How to Use Iterators and Adapters in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Iterators, Functional Programming, Collections, Performance

Description: Master Rust iterators and adapters for efficient collection processing. Learn map, filter, fold, and other combinators with practical examples and performance tips.

---

Iterators are a core part of Rust's approach to processing sequences of values. They provide a functional, lazy, and zero-cost way to transform and consume collections. This guide covers iterator basics, common adapters, and advanced patterns.

## Iterator Basics

An iterator produces a sequence of values one at a time.

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    // Create an iterator
    let mut iter = numbers.iter();

    // Manually consume
    println!("{:?}", iter.next());  // Some(&1)
    println!("{:?}", iter.next());  // Some(&2)
    println!("{:?}", iter.next());  // Some(&3)

    // For loop uses iterator automatically
    for n in numbers.iter() {
        println!("{}", n);
    }

    // Three ways to iterate
    for n in &numbers { }         // iter() - borrows
    for n in &mut vec![1,2,3] { } // iter_mut() - mutable borrow
    for n in numbers { }          // into_iter() - takes ownership
}
```

## Common Adapters

Adapters transform iterators without consuming them immediately.

### map: Transform Each Element

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    let doubled: Vec<i32> = numbers
        .iter()
        .map(|x| x * 2)
        .collect();

    println!("Doubled: {:?}", doubled);

    // Chain multiple maps
    let result: Vec<String> = numbers
        .iter()
        .map(|x| x * 2)
        .map(|x| x.to_string())
        .collect();

    println!("As strings: {:?}", result);
}
```

### filter: Keep Matching Elements

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    let evens: Vec<&i32> = numbers
        .iter()
        .filter(|x| *x % 2 == 0)
        .collect();

    println!("Evens: {:?}", evens);

    // Combine filter and map
    let even_doubled: Vec<i32> = numbers
        .iter()
        .filter(|x| *x % 2 == 0)
        .map(|x| x * 2)
        .collect();

    println!("Even doubled: {:?}", even_doubled);
}
```

### filter_map: Filter and Transform

```rust
fn main() {
    let strings = vec!["1", "two", "3", "four", "5"];

    // Parse strings to numbers, keeping only successful parses
    let numbers: Vec<i32> = strings
        .iter()
        .filter_map(|s| s.parse().ok())
        .collect();

    println!("Parsed: {:?}", numbers);

    // Equivalent to filter + map, but more efficient
    let alt: Vec<i32> = strings
        .iter()
        .map(|s| s.parse())
        .filter(|r| r.is_ok())
        .map(|r| r.unwrap())
        .collect();
}
```

### flat_map: Flatten Nested Iterators

```rust
fn main() {
    let nested = vec![vec![1, 2], vec![3, 4], vec![5, 6]];

    // Flatten nested vectors
    let flat: Vec<i32> = nested
        .iter()
        .flat_map(|v| v.iter())
        .copied()
        .collect();

    println!("Flat: {:?}", flat);

    // Split words into characters
    let words = vec!["hello", "world"];
    let chars: Vec<char> = words
        .iter()
        .flat_map(|s| s.chars())
        .collect();

    println!("Chars: {:?}", chars);
}
```

## Consuming Iterators

Consumers take an iterator and produce a final result.

### collect: Gather into Collection

```rust
use std::collections::{HashMap, HashSet};

fn main() {
    let numbers = vec![1, 2, 3, 3, 2, 1];

    // Into Vec
    let vec: Vec<i32> = numbers.iter().copied().collect();

    // Into HashSet (removes duplicates)
    let set: HashSet<i32> = numbers.iter().copied().collect();
    println!("Unique: {:?}", set);

    // Into HashMap
    let pairs = vec![("a", 1), ("b", 2), ("c", 3)];
    let map: HashMap<&str, i32> = pairs.into_iter().collect();
    println!("Map: {:?}", map);

    // Into String
    let chars = vec!['h', 'e', 'l', 'l', 'o'];
    let string: String = chars.into_iter().collect();
    println!("String: {}", string);
}
```

### fold: Accumulate into Single Value

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    // Sum using fold
    let sum = numbers.iter().fold(0, |acc, x| acc + x);
    println!("Sum: {}", sum);

    // Product
    let product = numbers.iter().fold(1, |acc, x| acc * x);
    println!("Product: {}", product);

    // Build a string
    let words = vec!["hello", "world"];
    let sentence = words.iter().fold(String::new(), |mut acc, word| {
        if !acc.is_empty() {
            acc.push(' ');
        }
        acc.push_str(word);
        acc
    });
    println!("Sentence: {}", sentence);
}
```

### reduce: Fold Without Initial Value

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    // Find max using reduce
    let max = numbers.iter().copied().reduce(|a, b| if a > b { a } else { b });
    println!("Max: {:?}", max);

    // Concatenate strings
    let words = vec!["hello", "beautiful", "world"];
    let combined = words.iter()
        .map(|s| s.to_string())
        .reduce(|a, b| format!("{} {}", a, b));
    println!("Combined: {:?}", combined);
}
```

### find and position

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5, 6];

    // Find first even
    let first_even = numbers.iter().find(|x| *x % 2 == 0);
    println!("First even: {:?}", first_even);

    // Find position
    let position = numbers.iter().position(|x| *x == 4);
    println!("Position of 4: {:?}", position);

    // find_map: find and transform
    let strings = vec!["1", "two", "3"];
    let first_number = strings.iter().find_map(|s| s.parse::<i32>().ok());
    println!("First number: {:?}", first_number);
}
```

## Chaining Operations

Build complex transformations by chaining adapters.

```rust
fn main() {
    let data = vec![
        ("Alice", 85),
        ("Bob", 92),
        ("Charlie", 78),
        ("Diana", 95),
        ("Eve", 88),
    ];

    // Complex query: names of people scoring > 80, uppercase, sorted
    let high_scorers: Vec<String> = data
        .iter()
        .filter(|(_, score)| *score > 80)
        .map(|(name, _)| name.to_uppercase())
        .collect();

    println!("High scorers: {:?}", high_scorers);

    // Calculate statistics
    let scores: Vec<i32> = data.iter().map(|(_, s)| *s).collect();

    let count = scores.len();
    let sum: i32 = scores.iter().sum();
    let avg = sum as f64 / count as f64;
    let max = scores.iter().max();
    let min = scores.iter().min();

    println!("Count: {}, Sum: {}, Avg: {:.1}", count, sum, avg);
    println!("Max: {:?}, Min: {:?}", max, min);
}
```

## Iterator Utilities

### take, skip, and step_by

```rust
fn main() {
    let numbers: Vec<i32> = (0..100).collect();

    // Take first 5
    let first_five: Vec<i32> = numbers.iter().copied().take(5).collect();
    println!("First 5: {:?}", first_five);

    // Skip first 95
    let last_five: Vec<i32> = numbers.iter().copied().skip(95).collect();
    println!("Last 5: {:?}", last_five);

    // Every 10th
    let every_tenth: Vec<i32> = numbers.iter().copied().step_by(10).collect();
    println!("Every 10th: {:?}", every_tenth);

    // Take while condition is true
    let small: Vec<i32> = numbers.iter().copied().take_while(|x| *x < 5).collect();
    println!("While < 5: {:?}", small);

    // Skip while condition is true
    let big: Vec<i32> = numbers.iter().copied().skip_while(|x| *x < 95).collect();
    println!("After 95: {:?}", big);
}
```

### zip: Combine Iterators

```rust
fn main() {
    let names = vec!["Alice", "Bob", "Charlie"];
    let scores = vec![85, 92, 78];

    // Zip into pairs
    let combined: Vec<(&str, i32)> = names
        .iter()
        .copied()
        .zip(scores.iter().copied())
        .collect();

    println!("Combined: {:?}", combined);

    // Enumerate: zip with index
    for (index, name) in names.iter().enumerate() {
        println!("{}: {}", index, name);
    }
}
```

### chain: Concatenate Iterators

```rust
fn main() {
    let first = vec![1, 2, 3];
    let second = vec![4, 5, 6];

    let combined: Vec<i32> = first
        .iter()
        .chain(second.iter())
        .copied()
        .collect();

    println!("Combined: {:?}", combined);
}
```

## Creating Custom Iterators

```rust
struct Counter {
    count: u32,
    max: u32,
}

impl Counter {
    fn new(max: u32) -> Self {
        Counter { count: 0, max }
    }
}

impl Iterator for Counter {
    type Item = u32;

    fn next(&mut self) -> Option<Self::Item> {
        if self.count < self.max {
            self.count += 1;
            Some(self.count)
        } else {
            None
        }
    }
}

fn main() {
    let counter = Counter::new(5);

    let collected: Vec<u32> = counter.collect();
    println!("Counter: {:?}", collected);

    // Use with adapters
    let sum: u32 = Counter::new(10)
        .filter(|x| x % 2 == 0)
        .sum();
    println!("Sum of evens: {}", sum);
}
```

## Performance Tips

```rust
fn main() {
    let numbers: Vec<i32> = (0..1000).collect();

    // Iterators are lazy - no work done until consumed
    let _lazy = numbers.iter().map(|x| x * 2);  // Nothing computed yet

    // Collect triggers computation
    let result: Vec<i32> = numbers.iter().map(|x| x * 2).collect();

    // Prefer iterator methods over manual loops
    // This is often faster due to LLVM optimizations
    let sum: i32 = numbers.iter().sum();

    // Use copied() or cloned() appropriately
    let ints: Vec<i32> = numbers.iter().copied().collect();  // For Copy types
    let strings: Vec<String> = vec!["a", "b"].iter().map(|s| s.to_string()).collect();

    // Use by_ref() to borrow iterator
    let mut iter = numbers.iter();
    let first_three: Vec<&i32> = iter.by_ref().take(3).collect();
    let rest: Vec<&i32> = iter.collect();  // Continue from where we left off

    println!("First 3: {:?}", first_three);
    println!("Rest length: {}", rest.len());
}
```

## Summary

Iterators provide a powerful, composable way to process data:

| Category | Methods |
|----------|---------|
| Adapters | map, filter, filter_map, flat_map, take, skip, zip, chain |
| Consumers | collect, fold, reduce, sum, product, count, find, any, all |
| Utilities | enumerate, peekable, by_ref, copied, cloned |

Key points:

- Iterators are lazy until consumed
- Chain adapters for complex transformations
- Use collect with type annotation to specify output collection
- Implement Iterator trait for custom sequences
- Iterator methods often optimize better than manual loops

Mastering iterators makes Rust code more expressive and often more efficient.
