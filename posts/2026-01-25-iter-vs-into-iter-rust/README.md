# How to Use iter() vs into_iter() in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Iterators, Ownership, References, Collections

Description: Learn the difference between iter(), into_iter(), and iter_mut() in Rust. Understand when each method is appropriate based on ownership needs and how they affect your data.

---

Rust provides three main ways to iterate over collections: `iter()`, `into_iter()`, and `iter_mut()`. Each has different ownership semantics that affect whether you can use the original collection afterward. Understanding these differences is essential for writing correct and efficient Rust code.

## The Three Iterator Methods

| Method | Yields | Ownership | Collection After |
|--------|--------|-----------|------------------|
| `iter()` | `&T` | Borrows | Still usable |
| `iter_mut()` | `&mut T` | Mutably borrows | Still usable |
| `into_iter()` | `T` | Consumes | Gone |

```rust
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    // iter() - borrows each element
    for n in numbers.iter() {
        println!("Borrowed: {}", n);  // n is &i32
    }
    println!("Numbers still exists: {:?}", numbers);

    // iter_mut() - mutably borrows each element
    let mut mutable = vec![1, 2, 3, 4, 5];
    for n in mutable.iter_mut() {
        *n *= 2;  // n is &mut i32
    }
    println!("Doubled: {:?}", mutable);

    // into_iter() - takes ownership of each element
    let owned = vec![1, 2, 3, 4, 5];
    for n in owned.into_iter() {
        println!("Owned: {}", n);  // n is i32
    }
    // println!("{:?}", owned);  // Error: owned was moved
}
```

## When to Use iter()

Use `iter()` when you only need to read values and want to keep the collection:

```rust
fn sum_values(numbers: &[i32]) -> i32 {
    // Borrow iteration - doesn't consume the slice
    numbers.iter().sum()
}

fn find_max(numbers: &[i32]) -> Option<&i32> {
    // Returns reference to element in the original slice
    numbers.iter().max()
}

fn count_matches(items: &[String], pattern: &str) -> usize {
    items.iter()
        .filter(|s| s.contains(pattern))
        .count()
}

fn main() {
    let nums = vec![5, 2, 8, 1, 9, 3];

    println!("Sum: {}", sum_values(&nums));
    println!("Max: {:?}", find_max(&nums));
    println!("Original: {:?}", nums);  // Still accessible

    let words = vec!["hello".to_string(), "world".to_string(), "hello".to_string()];
    println!("Matches: {}", count_matches(&words, "hello"));
    println!("Words: {:?}", words);  // Still accessible
}
```

## When to Use iter_mut()

Use `iter_mut()` when you need to modify elements in place:

```rust
fn double_all(numbers: &mut [i32]) {
    for n in numbers.iter_mut() {
        *n *= 2;
    }
}

fn normalize(values: &mut [f64]) {
    // Find max first (immutable borrow)
    let max = values.iter()
        .copied()
        .fold(f64::NEG_INFINITY, f64::max);

    // Then normalize (mutable borrow)
    if max > 0.0 {
        for v in values.iter_mut() {
            *v /= max;
        }
    }
}

fn update_statuses(items: &mut Vec<Item>) {
    for item in items.iter_mut() {
        if item.needs_update() {
            item.status = Status::Updated;
        }
    }
}

#[derive(Debug)]
struct Item {
    value: i32,
    status: Status,
}

#[derive(Debug)]
enum Status {
    Pending,
    Updated,
}

impl Item {
    fn needs_update(&self) -> bool {
        self.value > 5
    }
}

fn main() {
    let mut nums = vec![1, 2, 3, 4, 5];
    double_all(&mut nums);
    println!("Doubled: {:?}", nums);

    let mut values = vec![10.0, 20.0, 30.0, 40.0, 50.0];
    normalize(&mut values);
    println!("Normalized: {:?}", values);

    let mut items = vec![
        Item { value: 3, status: Status::Pending },
        Item { value: 7, status: Status::Pending },
        Item { value: 10, status: Status::Pending },
    ];
    update_statuses(&mut items);
    println!("Items: {:?}", items);
}
```

## When to Use into_iter()

Use `into_iter()` when you want to consume the collection or need ownership of elements:

```rust
fn collect_strings(items: Vec<&str>) -> Vec<String> {
    // Take ownership of each &str and convert to String
    items.into_iter()
        .map(|s| s.to_uppercase())
        .collect()
}

fn merge_collections(a: Vec<i32>, b: Vec<i32>) -> Vec<i32> {
    // Consume both vectors
    a.into_iter()
        .chain(b.into_iter())
        .collect()
}

fn process_and_discard(items: Vec<String>) {
    // We don't need items after processing
    for item in items.into_iter() {
        println!("Processing: {}", item);
        // item is String, fully owned
    }
}

fn extract_values(records: Vec<Record>) -> Vec<i32> {
    // Move values out of records
    records.into_iter()
        .map(|r| r.value)
        .collect()
}

struct Record {
    value: i32,
    _metadata: String,
}

fn main() {
    let words = vec!["hello", "world"];
    let upper = collect_strings(words);
    println!("Upper: {:?}", upper);

    let first = vec![1, 2, 3];
    let second = vec![4, 5, 6];
    let merged = merge_collections(first, second);
    println!("Merged: {:?}", merged);

    let records = vec![
        Record { value: 10, _metadata: "a".to_string() },
        Record { value: 20, _metadata: "b".to_string() },
    ];
    let values = extract_values(records);
    println!("Values: {:?}", values);
}
```

## IntoIterator Trait and for Loops

The `for` loop automatically calls `into_iter()`. The behavior depends on what you iterate over:

```rust
fn main() {
    let v = vec![1, 2, 3];

    // for loop on owned Vec calls into_iter() - consumes
    // for x in v { } // v is consumed

    // for loop on &Vec calls iter() - borrows
    for x in &v {
        println!("Borrowed: {}", x);  // x is &i32
    }
    println!("v still exists: {:?}", v);

    // for loop on &mut Vec calls iter_mut()
    let mut m = vec![1, 2, 3];
    for x in &mut m {
        *x += 10;  // x is &mut i32
    }
    println!("Modified: {:?}", m);
}
```

## Iterator Adapters and Ownership

Iterator adapters like `map()`, `filter()`, and `collect()` respect the ownership of what is yielded:

```rust
fn main() {
    let strings = vec!["hello".to_string(), "world".to_string()];

    // iter() + map returns references, need to clone for ownership
    let lengths: Vec<usize> = strings.iter()
        .map(|s| s.len())
        .collect();
    println!("Lengths: {:?}", lengths);
    println!("Strings: {:?}", strings);

    // into_iter() + map - takes ownership, can move values
    let uppercased: Vec<String> = strings.into_iter()
        .map(|s| s.to_uppercase())  // s is String, owned
        .collect();
    println!("Upper: {:?}", uppercased);
    // strings is gone

    // Filter with iter() - keeps originals
    let numbers = vec![1, 2, 3, 4, 5, 6];
    let evens: Vec<&i32> = numbers.iter()
        .filter(|n| *n % 2 == 0)
        .collect();
    println!("Evens (refs): {:?}", evens);
    println!("Numbers: {:?}", numbers);

    // Filter with into_iter() - moves matching elements
    let numbers = vec![1, 2, 3, 4, 5, 6];
    let evens: Vec<i32> = numbers.into_iter()
        .filter(|n| n % 2 == 0)
        .collect();
    println!("Evens (owned): {:?}", evens);
}
```

## Working with Different Collection Types

Different collections have different `into_iter()` behavior:

```rust
use std::collections::{HashMap, HashSet};

fn main() {
    // HashMap into_iter yields (K, V) tuples
    let mut map = HashMap::new();
    map.insert("a", 1);
    map.insert("b", 2);

    // Borrow iteration
    for (k, v) in &map {
        println!("{}: {}", k, v);
    }

    // Consuming iteration
    for (k, v) in map {
        println!("Owned {}: {}", k, v);
    }
    // map is gone

    // HashSet into_iter yields T
    let set: HashSet<String> = ["one", "two", "three"]
        .iter()
        .map(|s| s.to_string())
        .collect();

    // Borrow
    for s in &set {
        println!("Borrowed: {}", s);
    }

    // Array iteration
    let arr = [1, 2, 3, 4, 5];

    // iter() on array yields &T
    for n in arr.iter() {
        println!("Array ref: {}", n);
    }

    // into_iter() on array yields T (since Rust 2021)
    for n in arr {
        println!("Array owned: {}", n);
    }
    // arr can still be used - arrays are Copy
    println!("Array: {:?}", arr);
}
```

## Common Patterns

```rust
fn main() {
    // Pattern 1: Clone when you need both borrowed iteration and new owned values
    let items = vec!["a".to_string(), "b".to_string()];
    let processed: Vec<String> = items.iter()
        .cloned()  // Clone each &String to String
        .map(|s| format!("[{}]", s))
        .collect();
    println!("Processed: {:?}", processed);
    println!("Original: {:?}", items);

    // Pattern 2: Use copied() for Copy types
    let numbers = vec![1, 2, 3, 4, 5];
    let doubled: Vec<i32> = numbers.iter()
        .copied()  // Copy each &i32 to i32
        .map(|n| n * 2)
        .collect();
    println!("Doubled: {:?}", doubled);

    // Pattern 3: Drain for partial consumption
    let mut items = vec![1, 2, 3, 4, 5];
    let first_three: Vec<i32> = items.drain(0..3).collect();
    println!("Drained: {:?}", first_three);
    println!("Remaining: {:?}", items);
}
```

## Summary

| Scenario | Method |
|----------|--------|
| Read-only access, keep collection | `iter()` |
| Modify in place, keep collection | `iter_mut()` |
| Transform to new collection, discard old | `into_iter()` |
| Need owned values but keep original | `iter().cloned()` or `iter().copied()` |
| for loop on `&collection` | Calls `iter()` |
| for loop on `&mut collection` | Calls `iter_mut()` |
| for loop on `collection` | Calls `into_iter()` |

Choose the right iterator method based on whether you need the collection afterward and whether you need to modify elements. This decision is fundamental to writing ownership-correct Rust code.
