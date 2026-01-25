# How to Fix "Mutable borrow occurs here" Errors in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Borrow Checker, Mutability, Memory Safety, References

Description: Learn how to fix "mutable borrow occurs here" errors in Rust. This guide explains why these conflicts happen and provides practical patterns to resolve them.

---

The "mutable borrow occurs here" error occurs when you try to use a value while it is mutably borrowed elsewhere. Rust prevents this to ensure memory safety. This guide helps you understand the error and provides solutions for common scenarios.

## Understanding the Error

Rust's borrowing rules state that you can have either one mutable reference OR any number of immutable references, but not both simultaneously.

```rust
fn main() {
    let mut vec = vec![1, 2, 3];

    let first = &vec[0];     // Immutable borrow
    vec.push(4);              // Error: mutable borrow while immutable exists
    println!("{}", first);    // Immutable borrow used here

    // The error message:
    // error[E0502]: cannot borrow `vec` as mutable because it is
    //               also borrowed as immutable
}
```

## Common Scenarios and Solutions

### Scenario 1: Using Reference After Mutation

```rust
fn main() {
    let mut vec = vec![1, 2, 3];

    // Problem: Reference exists during mutation
    // let first = &vec[0];
    // vec.push(4);
    // println!("{}", first);

    // Solution 1: Use reference before mutation
    let first = &vec[0];
    println!("First: {}", first);  // Use it here
    vec.push(4);                    // Now mutation is safe

    // Solution 2: Copy the value instead of borrowing
    let first = vec[0];  // Copy for i32
    vec.push(5);
    println!("First: {}", first);

    // Solution 3: Use indices instead of references
    let first_idx = 0;
    vec.push(6);
    println!("First: {}", vec[first_idx]);
}
```

### Scenario 2: Iterating and Modifying

```rust
fn main() {
    let mut numbers = vec![1, 2, 3, 4, 5];

    // Problem: Cannot modify while iterating
    // for n in &numbers {
    //     if *n == 3 {
    //         numbers.push(6);  // Error!
    //     }
    // }

    // Solution 1: Collect indices, then modify
    let indices: Vec<usize> = numbers
        .iter()
        .enumerate()
        .filter(|(_, n)| **n == 3)
        .map(|(i, _)| i)
        .collect();

    for _ in indices {
        numbers.push(6);
    }

    // Solution 2: Use while loop with index
    let mut i = 0;
    while i < numbers.len() {
        if numbers[i] == 3 {
            numbers.push(7);
        }
        i += 1;
    }

    // Solution 3: Use retain for removal
    let mut to_remove = vec![1, 2, 3];
    to_remove.retain(|x| *x != 2);

    println!("{:?}", numbers);
}
```

### Scenario 3: Multiple Mutable Borrows

```rust
fn main() {
    let mut data = vec![1, 2, 3];

    // Problem: Two mutable borrows
    // let a = &mut data[0];
    // let b = &mut data[1];  // Error: second mutable borrow

    // Solution 1: Use split_at_mut
    let (left, right) = data.split_at_mut(1);
    let a = &mut left[0];
    let b = &mut right[0];
    *a = 10;
    *b = 20;
    println!("{:?}", data);

    // Solution 2: Complete one borrow before starting another
    {
        let a = &mut data[0];
        *a = 100;
    }
    {
        let b = &mut data[1];
        *b = 200;
    }

    // Solution 3: Use indices
    data[0] = 1000;
    data[1] = 2000;
}
```

### Scenario 4: Struct Method Borrowing Conflicts

```rust
struct Game {
    players: Vec<String>,
    scores: Vec<i32>,
}

impl Game {
    // Problem: Method takes &mut self, conflicts with field access
    // fn update(&mut self) {
    //     for player in &self.players {
    //         self.add_score(player);  // Error!
    //     }
    // }

    fn add_score(&mut self, _player: &str) {
        self.scores.push(0);
    }

    // Solution 1: Split the borrows
    fn update_split(&mut self) {
        let players = &self.players;
        let scores = &mut self.scores;

        for player in players {
            println!("Processing: {}", player);
            scores.push(0);
        }
    }

    // Solution 2: Use indices
    fn update_indices(&mut self) {
        for i in 0..self.players.len() {
            let player = &self.players[i];
            println!("Processing: {}", player);
            self.scores.push(0);
        }
    }

    // Solution 3: Collect and process
    fn update_collect(&mut self) {
        let players: Vec<String> = self.players.clone();
        for player in players {
            self.add_score(&player);
        }
    }
}
```

### Scenario 5: Closures Capturing Mutably

```rust
fn main() {
    let mut value = 10;

    // Problem: Closure captures mutably, preventing other uses
    // let mut closure = || value += 1;
    // println!("{}", value);  // Error: value is mutably borrowed by closure
    // closure();

    // Solution 1: Use closure immediately
    let mut closure = || value += 1;
    closure();
    closure();
    // closure is no longer used, value is free
    println!("{}", value);

    // Solution 2: Limit closure scope
    let mut value = 10;
    {
        let mut closure = || value += 1;
        closure();
    }
    println!("{}", value);

    // Solution 3: Use RefCell for interior mutability
    use std::cell::RefCell;
    let value = RefCell::new(10);
    let closure = || *value.borrow_mut() += 1;
    closure();
    println!("{}", value.borrow());
}
```

### Scenario 6: HashMap Entry API

```rust
use std::collections::HashMap;

fn main() {
    let mut map: HashMap<String, Vec<i32>> = HashMap::new();

    // Problem: Double mutable borrow
    // if !map.contains_key("key") {
    //     map.insert("key".to_string(), Vec::new());
    // }
    // map.get_mut("key").unwrap().push(1);

    // Solution: Use Entry API
    map.entry("key".to_string())
        .or_insert_with(Vec::new)
        .push(1);

    map.entry("key".to_string())
        .or_default()
        .push(2);

    // Entry API handles the borrow correctly
    for (key, values) in &map {
        println!("{}: {:?}", key, values);
    }
}
```

## Using Interior Mutability

When you cannot restructure borrows, use RefCell or Mutex.

```rust
use std::cell::RefCell;

struct Counter {
    count: RefCell<i32>,
}

impl Counter {
    fn new() -> Self {
        Counter { count: RefCell::new(0) }
    }

    // Takes &self but can still mutate count
    fn increment(&self) {
        *self.count.borrow_mut() += 1;
    }

    fn get(&self) -> i32 {
        *self.count.borrow()
    }
}

fn main() {
    let counter = Counter::new();

    // Can have multiple references and still mutate
    let ref1 = &counter;
    let ref2 = &counter;

    ref1.increment();
    ref2.increment();

    println!("Count: {}", counter.get());
}
```

## NLL (Non-Lexical Lifetimes)

Modern Rust uses NLL to allow borrows to end earlier.

```rust
fn main() {
    let mut vec = vec![1, 2, 3];

    // NLL allows this because the borrow ends before push
    let first = &vec[0];
    println!("{}", first);  // Last use of first

    vec.push(4);  // OK in NLL - first's borrow has ended

    // NLL also helps with conditionals
    let mut map = std::collections::HashMap::new();
    map.insert("key", 1);

    // Borrow in the if condition ends before the else branch
    if let Some(value) = map.get("key") {
        println!("Found: {}", value);
    } else {
        map.insert("key", 0);  // OK - no active borrow
    }
}
```

## Debugging Strategies

### Check Borrow Spans

```rust
fn main() {
    let mut data = vec![1, 2, 3];

    // The borrow starts here
    let reference = &data[0];
    //              ^^^^^^^^ immutable borrow starts

    // Error would occur here
    // data.push(4);  // mutable borrow attempted
    // ^^^^^^^^^^^^ mutable borrow

    // Reference used here - borrow must extend to here
    println!("{}", reference);
    // ^^^^^^^^^ immutable borrow later used

    // After this point, the borrow ends
    data.push(4);  // Now OK
}
```

### Minimize Borrow Scope

```rust
fn main() {
    let mut vec = vec![1, 2, 3];

    // Instead of long-lived references
    // let first = &vec[0];
    // ... lots of code ...
    // println!("{}", first);

    // Use the reference immediately
    println!("First: {}", vec[0]);

    // Or limit scope with braces
    {
        let first = &vec[0];
        println!("First: {}", first);
    }
    // first's borrow ends here

    vec.push(4);
}
```

## Summary

"Mutable borrow occurs here" errors prevent data races and memory corruption. Solutions include:

| Pattern | Solution |
|---------|----------|
| Borrow during mutation | Use before mutating, or copy |
| Iterate and modify | Collect indices, or use while loop |
| Multiple mutable refs | split_at_mut, or sequential access |
| Method borrow conflict | Split borrows, or use indices |
| Closure captures | Limit scope, or use RefCell |
| HashMap access | Use Entry API |

Key strategies:

- End borrows before mutation by limiting scope
- Use indices instead of references when possible
- Copy or clone when you need independent access
- Use interior mutability (RefCell, Mutex) when restructuring is not possible
- Let NLL help by using references immediately and not holding them

Understanding borrow lifetimes and restructuring code to minimize conflicts is key to productive Rust development.
