# How to Do HashMap Lookup and Insert Without Double Lookup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, HashMap, Entry API, Performance, Collections

Description: Learn how to use Rust's Entry API to efficiently check and modify HashMap entries in a single operation, avoiding the performance cost of double lookups.

---

A common pattern when working with HashMaps is checking if a key exists and then either inserting a new value or modifying the existing one. Doing this naively requires two hash lookups. Rust's Entry API solves this problem elegantly by providing a single-lookup approach.

## The Problem: Double Lookup

The naive approach looks up the key twice:

```rust
use std::collections::HashMap;

fn count_words_naive(text: &str) -> HashMap<String, usize> {
    let mut counts = HashMap::new();

    for word in text.split_whitespace() {
        // First lookup: check if key exists
        if counts.contains_key(word) {
            // Second lookup: get mutable reference
            *counts.get_mut(word).unwrap() += 1;
        } else {
            // Third lookup: insert
            counts.insert(word.to_string(), 1);
        }
    }

    counts
}
```

This code works but performs up to three hash lookups per word. The Entry API reduces this to one.

## The Entry API

The `entry()` method returns an `Entry` enum that represents either an occupied or vacant slot:

```rust
use std::collections::HashMap;

fn count_words(text: &str) -> HashMap<String, usize> {
    let mut counts = HashMap::new();

    for word in text.split_whitespace() {
        // Single lookup with entry()
        *counts.entry(word.to_string()).or_insert(0) += 1;
    }

    counts
}

fn main() {
    let text = "the quick brown fox jumps over the lazy dog the fox";
    let counts = count_words(text);

    for (word, count) in &counts {
        println!("{}: {}", word, count);
    }
}
```

## Entry Methods

The Entry API provides several methods for different use cases:

### or_insert: Insert Default if Missing

```rust
use std::collections::HashMap;

fn main() {
    let mut scores: HashMap<String, i32> = HashMap::new();

    // Insert 0 if key doesn't exist, then add 10
    *scores.entry("Alice".to_string()).or_insert(0) += 10;
    *scores.entry("Alice".to_string()).or_insert(0) += 5;
    *scores.entry("Bob".to_string()).or_insert(0) += 7;

    println!("Scores: {:?}", scores);
    // Alice: 15, Bob: 7
}
```

### or_insert_with: Lazy Default Construction

Use when the default value is expensive to create:

```rust
use std::collections::HashMap;

fn main() {
    let mut cache: HashMap<String, Vec<i32>> = HashMap::new();

    // Only creates the Vec if the key is missing
    cache.entry("data".to_string())
        .or_insert_with(|| {
            println!("Creating new vector");
            Vec::with_capacity(100)
        })
        .push(1);

    // Reuses existing Vec, no creation
    cache.entry("data".to_string())
        .or_insert_with(|| {
            println!("This won't print");
            Vec::with_capacity(100)
        })
        .push(2);

    println!("Cache: {:?}", cache);
}
```

### or_insert_with_key: Use Key in Default

Access the key when creating the default value:

```rust
use std::collections::HashMap;

fn main() {
    let mut lengths: HashMap<String, usize> = HashMap::new();

    let words = vec!["hello", "world", "hello"];

    for word in words {
        lengths.entry(word.to_string())
            .or_insert_with_key(|k| {
                println!("Computing length for: {}", k);
                k.len()
            });
    }

    println!("Lengths: {:?}", lengths);
}
```

### or_default: Use Default Trait

For types implementing `Default`:

```rust
use std::collections::HashMap;

fn main() {
    let mut groups: HashMap<char, Vec<String>> = HashMap::new();

    let words = vec!["apple", "apricot", "banana", "blueberry", "cherry"];

    for word in words {
        let first_char = word.chars().next().unwrap();
        groups.entry(first_char)
            .or_default()  // Vec::default() is empty Vec
            .push(word.to_string());
    }

    for (letter, words) in &groups {
        println!("{}: {:?}", letter, words);
    }
}
```

### and_modify: Modify Existing Entry

Combine with or_insert for modify-or-insert patterns:

```rust
use std::collections::HashMap;

fn main() {
    let mut stats: HashMap<String, Stats> = HashMap::new();

    #[derive(Debug, Clone)]
    struct Stats {
        count: u32,
        total: i64,
    }

    let events = vec![
        ("login", 100),
        ("login", 150),
        ("purchase", 50),
        ("login", 200),
        ("purchase", 75),
    ];

    for (event, value) in events {
        stats.entry(event.to_string())
            .and_modify(|s| {
                s.count += 1;
                s.total += value;
            })
            .or_insert(Stats { count: 1, total: value });
    }

    for (event, stat) in &stats {
        println!("{}: {} events, total: {}", event, stat.count, stat.total);
    }
}
```

## Pattern Matching on Entry

For more complex logic, match on the Entry directly:

```rust
use std::collections::HashMap;
use std::collections::hash_map::Entry;

fn main() {
    let mut inventory: HashMap<String, i32> = HashMap::new();
    inventory.insert("apples".to_string(), 10);

    // Detailed control with pattern matching
    match inventory.entry("apples".to_string()) {
        Entry::Occupied(mut entry) => {
            let current = entry.get_mut();
            if *current < 20 {
                *current += 5;
                println!("Restocked apples to {}", current);
            } else {
                println!("Apples already well stocked");
            }
        }
        Entry::Vacant(entry) => {
            entry.insert(15);
            println!("Added new item: apples");
        }
    }

    // Check before inserting
    match inventory.entry("oranges".to_string()) {
        Entry::Occupied(entry) => {
            println!("Already have {} oranges", entry.get());
        }
        Entry::Vacant(entry) => {
            entry.insert(20);
            println!("Added oranges");
        }
    }

    println!("Inventory: {:?}", inventory);
}
```

## OccupiedEntry Methods

When you have an occupied entry, several methods are available:

```rust
use std::collections::HashMap;
use std::collections::hash_map::Entry;

fn main() {
    let mut map: HashMap<String, String> = HashMap::new();
    map.insert("key".to_string(), "old_value".to_string());

    if let Entry::Occupied(mut entry) = map.entry("key".to_string()) {
        // Get immutable reference to value
        println!("Current: {}", entry.get());

        // Get mutable reference to value
        entry.get_mut().push_str("_modified");
        println!("After modify: {}", entry.get());

        // Get reference to key
        println!("Key: {}", entry.key());

        // Replace value, returns old value
        let old = entry.insert("new_value".to_string());
        println!("Replaced: {}", old);

        // Remove entry, returns value
        // let removed = entry.remove();
    }

    println!("Map: {:?}", map);
}
```

## Real-World Examples

### Caching Expensive Computations

```rust
use std::collections::HashMap;

struct ExpensiveComputer {
    cache: HashMap<u64, u64>,
}

impl ExpensiveComputer {
    fn new() -> Self {
        ExpensiveComputer {
            cache: HashMap::new(),
        }
    }

    fn compute(&mut self, input: u64) -> u64 {
        *self.cache.entry(input).or_insert_with(|| {
            // Simulate expensive computation
            println!("Computing for {}...", input);
            (0..input).sum()
        })
    }
}

fn main() {
    let mut computer = ExpensiveComputer::new();

    // First call computes
    println!("Result: {}", computer.compute(100));

    // Second call uses cache
    println!("Result: {}", computer.compute(100));

    // Different input computes
    println!("Result: {}", computer.compute(50));
}
```

### Grouping Data

```rust
use std::collections::HashMap;

#[derive(Debug)]
struct Record {
    category: String,
    value: i32,
}

fn group_by_category(records: Vec<Record>) -> HashMap<String, Vec<i32>> {
    let mut groups: HashMap<String, Vec<i32>> = HashMap::new();

    for record in records {
        groups.entry(record.category)
            .or_default()
            .push(record.value);
    }

    groups
}

fn main() {
    let records = vec![
        Record { category: "A".to_string(), value: 10 },
        Record { category: "B".to_string(), value: 20 },
        Record { category: "A".to_string(), value: 30 },
        Record { category: "C".to_string(), value: 40 },
        Record { category: "B".to_string(), value: 50 },
    ];

    let grouped = group_by_category(records);

    for (category, values) in &grouped {
        println!("{}: {:?}", category, values);
    }
}
```

### Building Adjacency Lists

```rust
use std::collections::HashMap;

fn build_graph(edges: &[(u32, u32)]) -> HashMap<u32, Vec<u32>> {
    let mut graph: HashMap<u32, Vec<u32>> = HashMap::new();

    for &(from, to) in edges {
        // Add edge in both directions for undirected graph
        graph.entry(from).or_default().push(to);
        graph.entry(to).or_default().push(from);
    }

    graph
}

fn main() {
    let edges = vec![
        (1, 2),
        (1, 3),
        (2, 3),
        (3, 4),
    ];

    let graph = build_graph(&edges);

    for (node, neighbors) in &graph {
        println!("Node {}: neighbors {:?}", node, neighbors);
    }
}
```

## Summary

| Method | Use Case |
|--------|----------|
| `or_insert(value)` | Insert literal default |
| `or_insert_with(fn)` | Lazy default construction |
| `or_insert_with_key(fn)` | Default depends on key |
| `or_default()` | Use Default trait |
| `and_modify(fn)` | Modify if exists |
| Pattern matching | Complex conditional logic |

The Entry API is essential for efficient HashMap operations in Rust. It eliminates redundant lookups and makes the code clearer by expressing intent directly. Always prefer `entry()` over separate `contains_key()` and `insert()` or `get_mut()` calls.
