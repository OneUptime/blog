# How to Use Collections (Vec, HashMap, HashSet) in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Collections, Vec, HashMap, HashSet, Data Structures

Description: A practical guide to using Rust's standard collections with performance considerations and common patterns.

---

Rust's standard library ships with a solid set of collection types that cover most use cases you'll encounter in day-to-day programming. Unlike some languages where you grab whatever third-party library looks good, Rust's built-in collections are well-designed, performant, and integrate seamlessly with the ownership system.

This guide walks through the collections you'll actually use: `Vec`, `HashMap`, `HashSet`, and `BTreeMap`. We'll look at real patterns, common pitfalls, and performance considerations that matter in production code.

## Vec: The Workhorse

`Vec<T>` is Rust's growable array type. If you're coming from other languages, think of it like Python's list or JavaScript's array - but with predictable performance characteristics.

### Basic Operations

Creating and manipulating vectors is straightforward:

```rust
// Creating vectors - the macro is convenient for literals
let mut numbers = vec![1, 2, 3, 4, 5];

// Or create an empty one and build it up
let mut names: Vec<String> = Vec::new();
names.push(String::from("Alice"));
names.push(String::from("Bob"));

// Access elements - panics if out of bounds
let first = numbers[0];

// Safe access that returns Option<&T>
match numbers.get(10) {
    Some(n) => println!("Found: {}", n),
    None => println!("Index out of bounds"),
}
```

### Capacity and Allocation

Here's something that trips up newcomers: Vec reallocates when it runs out of space. Each reallocation copies all elements to a new, larger buffer. If you know roughly how many elements you'll have, pre-allocate:

```rust
// Bad: causes multiple reallocations as the vec grows
let mut slow_vec = Vec::new();
for i in 0..10000 {
    slow_vec.push(i);
}

// Good: single allocation up front
let mut fast_vec = Vec::with_capacity(10000);
for i in 0..10000 {
    fast_vec.push(i);
}

// Check current capacity
println!("Length: {}, Capacity: {}", fast_vec.len(), fast_vec.capacity());
```

The capacity doubles each time it needs to grow (roughly), so the amortized cost of push is O(1). But if you're doing performance-sensitive work, those occasional O(n) copies can cause latency spikes.

### Useful Vec Methods

Some methods you'll reach for constantly:

```rust
let mut items = vec![3, 1, 4, 1, 5, 9, 2, 6];

// Sorting
items.sort();  // [1, 1, 2, 3, 4, 5, 6, 9]

// Remove duplicates (must be sorted first)
items.dedup(); // [1, 2, 3, 4, 5, 6, 9]

// Retain only elements matching a predicate
items.retain(|&x| x > 3); // [4, 5, 6, 9]

// Pop from the end - O(1)
let last = items.pop(); // Some(9)

// Remove at index - O(n) because it shifts elements
let removed = items.remove(0); // Removes 4, shifts everything left
```

## HashMap: Key-Value Storage

`HashMap<K, V>` is your go-to for key-value associations. It uses SipHash by default - slightly slower than some alternatives but resistant to HashDoS attacks.

### Basic Usage

```rust
use std::collections::HashMap;

let mut scores: HashMap<String, i32> = HashMap::new();

// Insert values
scores.insert(String::from("Blue"), 10);
scores.insert(String::from("Red"), 25);

// Get returns Option<&V>
let blue_score = scores.get("Blue"); // Some(&10)

// Direct access with default
let green_score = scores.get("Green").unwrap_or(&0);

// Check if key exists
if scores.contains_key("Blue") {
    println!("Blue team is playing");
}

// Iterate over key-value pairs
for (team, score) in &scores {
    println!("{}: {}", team, score);
}
```

### The Entry API

The entry API is one of Rust's nicest features for working with maps. It handles the "insert if not present" pattern elegantly:

```rust
use std::collections::HashMap;

let mut word_counts: HashMap<String, u32> = HashMap::new();
let text = "the quick brown fox jumps over the lazy dog";

// Without entry API - awkward and potentially inefficient
for word in text.split_whitespace() {
    if word_counts.contains_key(word) {
        *word_counts.get_mut(word).unwrap() += 1;
    } else {
        word_counts.insert(word.to_string(), 1);
    }
}

// With entry API - clean and single lookup
let mut word_counts: HashMap<String, u32> = HashMap::new();
for word in text.split_whitespace() {
    *word_counts.entry(word.to_string()).or_insert(0) += 1;
}

// or_insert_with for expensive default values
let mut cache: HashMap<String, Vec<u8>> = HashMap::new();
let data = cache
    .entry("key".to_string())
    .or_insert_with(|| expensive_computation());
```

### Using Custom Types as Keys

To use your own types as HashMap keys, they need to implement `Hash` and `Eq`. The derive macro handles this for most cases:

```rust
use std::collections::HashMap;

// Derive Hash and Eq for your type
#[derive(Hash, Eq, PartialEq, Debug)]
struct UserId {
    tenant: String,
    id: u64,
}

let mut user_sessions: HashMap<UserId, String> = HashMap::new();

let user = UserId {
    tenant: String::from("acme"),
    id: 12345,
};

user_sessions.insert(user, String::from("session_abc123"));
```

One important rule: if two values are equal according to `Eq`, they must produce the same hash. The derive macro guarantees this, but if you implement these traits manually, you need to maintain this invariant.

## HashSet: When You Only Care About Uniqueness

`HashSet<T>` is basically a `HashMap<T, ()>` - it stores keys without values. Use it when you need to track membership or eliminate duplicates.

```rust
use std::collections::HashSet;

let mut seen_ids: HashSet<u64> = HashSet::new();

// Insert returns true if the value was new
if seen_ids.insert(42) {
    println!("First time seeing 42");
}

// Returns false if already present
if !seen_ids.insert(42) {
    println!("Already saw 42");
}

// Check membership
if seen_ids.contains(&42) {
    println!("42 is in the set");
}
```

### Set Operations

HashSet supports the mathematical set operations you'd expect:

```rust
use std::collections::HashSet;

let a: HashSet<i32> = [1, 2, 3, 4, 5].iter().cloned().collect();
let b: HashSet<i32> = [3, 4, 5, 6, 7].iter().cloned().collect();

// Union - elements in either set
let union: HashSet<_> = a.union(&b).cloned().collect();
// {1, 2, 3, 4, 5, 6, 7}

// Intersection - elements in both sets
let intersection: HashSet<_> = a.intersection(&b).cloned().collect();
// {3, 4, 5}

// Difference - elements in a but not in b
let difference: HashSet<_> = a.difference(&b).cloned().collect();
// {1, 2}

// Symmetric difference - elements in one but not both
let sym_diff: HashSet<_> = a.symmetric_difference(&b).cloned().collect();
// {1, 2, 6, 7}
```

## BTreeMap: When Order Matters

`BTreeMap<K, V>` is a sorted map backed by a B-tree. Unlike HashMap, it keeps keys in sorted order. This comes with tradeoffs:

- Lookup is O(log n) instead of O(1)
- Keys must implement `Ord` instead of `Hash`
- Iteration is always in sorted order
- Range queries are efficient

```rust
use std::collections::BTreeMap;

let mut events: BTreeMap<u64, String> = BTreeMap::new();

// Timestamps as keys - will stay sorted
events.insert(1706745600, String::from("Server started"));
events.insert(1706745700, String::from("First request"));
events.insert(1706745650, String::from("Database connected"));

// Iteration is always in key order
for (timestamp, event) in &events {
    println!("{}: {}", timestamp, event);
}
// Output is chronologically ordered

// Range queries - get events in a time window
for (ts, event) in events.range(1706745600..1706745660) {
    println!("Early event: {}", event);
}
```

Use BTreeMap when you need sorted iteration or range queries. Stick with HashMap for everything else - the O(1) lookup is worth it.

## Iterators and Collections

Rust's iterator system works beautifully with collections. Most collection methods return iterators, and you can collect iterators back into collections.

```rust
let numbers = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Filter and transform
let even_squares: Vec<i32> = numbers
    .iter()
    .filter(|&&n| n % 2 == 0)
    .map(|&n| n * n)
    .collect();
// [4, 16, 36, 64, 100]

// Collect into different collection types
use std::collections::HashSet;
let unique: HashSet<i32> = vec![1, 2, 2, 3, 3, 3].into_iter().collect();

// Collect key-value pairs into HashMap
use std::collections::HashMap;
let pairs = vec![("a", 1), ("b", 2), ("c", 3)];
let map: HashMap<_, _> = pairs.into_iter().collect();
```

### Consuming vs Borrowing Iteration

Understanding the three iteration methods saves debugging time:

```rust
let names = vec![String::from("Alice"), String::from("Bob")];

// iter() - borrows elements, vec is still usable after
for name in names.iter() {
    println!("{}", name); // name is &String
}
println!("Still have {} names", names.len());

// iter_mut() - mutable borrows
let mut numbers = vec![1, 2, 3];
for n in numbers.iter_mut() {
    *n *= 2; // Modify in place
}

// into_iter() - takes ownership, consumes the vec
let names = vec![String::from("Alice"), String::from("Bob")];
for name in names.into_iter() {
    println!("{}", name); // name is String, not &String
}
// names is gone - can't use it here
```

## Performance Tips

A few things that make a real difference in production:

### Pre-allocate when possible

Both Vec and HashMap accept capacity hints. Use them when you know the approximate size:

```rust
// Good for building up results
let mut results = Vec::with_capacity(expected_count);

// HashMap also supports this
use std::collections::HashMap;
let mut cache = HashMap::with_capacity(1000);
```

### Use references as HashMap keys

Instead of cloning strings for every lookup, you can often use string slices:

```rust
use std::collections::HashMap;

// If you're looking up by &str but storing String keys
let mut map: HashMap<String, i32> = HashMap::new();
map.insert(String::from("key"), 42);

// This works because String implements Borrow<str>
let value = map.get("key"); // No allocation needed for lookup
```

### Consider alternative hashers

The default hasher prioritizes security. For internal data structures where HashDoS isn't a concern, faster hashers exist:

```rust
use std::collections::HashMap;
use std::hash::BuildHasherDefault;

// FxHash is popular for its speed
// Add to Cargo.toml: rustc-hash = "1.1"
use rustc_hash::FxHasher;

type FxHashMap<K, V> = HashMap<K, V, BuildHasherDefault<FxHasher>>;

let mut fast_map: FxHashMap<i32, i32> = FxHashMap::default();
```

### Drain instead of clear when reusing

If you're clearing a collection to reuse it, `drain()` lets you take ownership of elements while clearing:

```rust
let mut buffer = vec![1, 2, 3, 4, 5];

// Process and clear in one step
for item in buffer.drain(..) {
    process(item);
}
// buffer is now empty but retains its capacity
```

## Common Patterns

### Building a frequency counter

```rust
use std::collections::HashMap;

fn count_frequencies<T: std::hash::Hash + Eq>(items: &[T]) -> HashMap<&T, usize> {
    let mut counts = HashMap::new();
    for item in items {
        *counts.entry(item).or_insert(0) += 1;
    }
    counts
}
```

### Grouping items

```rust
use std::collections::HashMap;

#[derive(Debug)]
struct User {
    name: String,
    department: String,
}

fn group_by_department(users: Vec<User>) -> HashMap<String, Vec<User>> {
    let mut groups: HashMap<String, Vec<User>> = HashMap::new();
    for user in users {
        groups
            .entry(user.department.clone())
            .or_insert_with(Vec::new)
            .push(user);
    }
    groups
}
```

### LRU-style cache with insertion order

When you need to track insertion order, `IndexMap` from the `indexmap` crate is worth considering. It maintains insertion order while providing HashMap-like performance.

## Wrapping Up

Rust's standard collections handle most scenarios well. Start with `Vec` for sequences, `HashMap` for key-value pairs, and `HashSet` for unique elements. Reach for `BTreeMap` when you need ordering. The entry API and iterator integration make these collections pleasant to work with once you get the hang of them.

The ownership system might feel restrictive at first - you can't just grab references willy-nilly like in garbage-collected languages. But this discipline pays off: no data races, predictable performance, and code that's easier to reason about.

---

*Monitor Rust applications with [OneUptime](https://oneuptime.com) - track memory usage and performance.*
