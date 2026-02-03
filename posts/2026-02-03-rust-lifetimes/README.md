# How to Use Rust Lifetimes Correctly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Lifetimes, Memory Safety, Borrowing, Systems Programming

Description: Master Rust lifetimes to write safe, efficient code. This guide explains lifetime annotations, common patterns, and how to resolve lifetime errors in real-world scenarios.

---

Lifetimes are one of Rust's most distinctive features, and they often trip up developers coming from garbage-collected languages. But once you understand what lifetimes actually represent - and why the compiler needs them - they become a powerful tool for writing safe, efficient code without runtime overhead.

This guide walks through lifetime concepts from the ground up, with practical examples you can apply immediately.

## What Are Lifetimes?

A lifetime is the scope during which a reference is valid. Every reference in Rust has a lifetime, even when you do not write it explicitly. The compiler uses lifetimes to ensure references never outlive the data they point to.

Consider this code that will not compile:

```rust
fn main() {
    let reference_to_nothing;

    {
        let value = 42;
        reference_to_nothing = &value;
    } // value is dropped here

    // ERROR: reference_to_nothing points to deallocated memory
    println!("{}", reference_to_nothing);
}
```

The compiler catches this at compile time:

```
error[E0597]: `value` does not live long enough
 --> src/main.rs:6:32
  |
6 |         reference_to_nothing = &value;
  |                                ^^^^^^ borrowed value does not live long enough
7 |     }
  |     - `value` dropped here while still borrowed
8 |
9 |     println!("{}", reference_to_nothing);
  |                    -------------------- borrow later used here
```

This is the core problem lifetimes solve: preventing dangling references. In C or C++, this code would compile and cause undefined behavior at runtime. Rust catches it at compile time with zero runtime cost.

## Lifetime Annotations: The Syntax

When you need to tell the compiler about relationships between lifetimes, you use lifetime annotations. The syntax uses an apostrophe followed by a name, typically starting with `'a`:

```rust
// A reference with an explicit lifetime annotation
&'a i32

// A mutable reference with a lifetime
&'a mut i32
```

Lifetime annotations do not change how long values live. They describe relationships to the compiler so it can verify your code is safe.

## Why Functions Need Lifetime Annotations

When a function takes references as parameters and returns a reference, the compiler needs to know how the output lifetime relates to the input lifetimes. Consider this function:

```rust
// This won't compile - the compiler doesn't know which input
// lifetime the return value should be tied to
fn longest(x: &str, y: &str) -> &str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}
```

The compiler gives this error:

```
error[E0106]: missing lifetime specifier
 --> src/main.rs:1:33
  |
1 | fn longest(x: &str, y: &str) -> &str {
  |               ----     ----     ^ expected named lifetime parameter
  |
  = help: this function's return type contains a borrowed value, but the
          signature does not say whether it is borrowed from `x` or `y`
```

The fix is to add lifetime annotations that tell the compiler the return value lives at least as long as both inputs:

```rust
// The 'a annotation says: "the returned reference will be valid for
// at least as long as both x and y are valid"
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}

fn main() {
    let string1 = String::from("long string");
    let result;

    {
        let string2 = String::from("xyz");
        result = longest(&string1, &string2);
        // This works - both strings are still valid here
        println!("The longest string is: {}", result);
    }

    // This would NOT work if we tried to use result here,
    // because string2 has been dropped
}
```

## How Lifetime Annotations Work Together

The lifetime parameter `'a` gets substituted with the concrete lifetime that is the overlap of `x` and `y`. In practice, this means the returned reference is only valid for as long as the shorter-lived input:

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

fn main() {
    let string1 = String::from("this is a long string");

    {
        let string2 = String::from("short");

        // Both string1 and string2 are valid here
        // The lifetime 'a is the intersection: the scope of string2
        let result = longest(&string1, &string2);
        println!("Longest: {}", result);

    } // string2 is dropped, so 'a ends here

    // We can't use result outside the inner scope even though
    // string1 is still valid - the compiler is conservative
}
```

This conservative approach means Rust sometimes rejects code that would be safe at runtime. The tradeoff is guaranteed memory safety without garbage collection.

## Lifetime Elision Rules

Writing lifetime annotations everywhere would be tedious, so Rust has elision rules that let the compiler infer lifetimes in common patterns. These rules have evolved over time to cover more cases.

### Rule 1: Each Reference Parameter Gets Its Own Lifetime

When compiling function signatures, each reference parameter gets a distinct lifetime:

```rust
// What you write:
fn first_word(s: &str) -> &str { ... }

// What the compiler sees after applying Rule 1:
fn first_word<'a>(s: &'a str) -> &str { ... }
```

For multiple parameters:

```rust
// What you write:
fn foo(x: &i32, y: &i32) { ... }

// What the compiler sees:
fn foo<'a, 'b>(x: &'a i32, y: &'b i32) { ... }
```

### Rule 2: Single Input Lifetime Applies to All Outputs

If there is exactly one input lifetime parameter, that lifetime is assigned to all output lifetime parameters:

```rust
// What you write:
fn first_word(s: &str) -> &str { ... }

// After Rule 1:
fn first_word<'a>(s: &'a str) -> &str { ... }

// After Rule 2:
fn first_word<'a>(s: &'a str) -> &'a str { ... }
```

This makes sense: if a function takes one reference and returns a reference, the output must come from the input.

### Rule 3: Methods Get the Self Lifetime

If the function is a method with `&self` or `&mut self`, the lifetime of `self` is assigned to all output lifetime parameters:

```rust
impl ImportantExcerpt<'_> {
    // What you write:
    fn announce_and_return_part(&self, announcement: &str) -> &str {
        println!("Attention please: {}", announcement);
        self.part
    }

    // What the compiler sees:
    // fn announce_and_return_part<'a, 'b>(&'a self, announcement: &'b str) -> &'a str
}
```

This rule exists because methods typically return data owned by `self`, not from other parameters.

## When Elision Does Not Apply

Sometimes the compiler cannot infer lifetimes, and you must annotate them explicitly. The `longest` function from earlier is a classic example:

```rust
// This won't compile - two input lifetimes, which one does output use?
fn longest(x: &str, y: &str) -> &str { ... }

// You must be explicit:
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str { ... }
```

Another case is when you want different lifetime relationships:

```rust
// The returned reference only depends on x, not y
// This is useful when y is just used for computation
fn take_first<'a, 'b>(x: &'a str, y: &'b str) -> &'a str {
    println!("y has {} characters", y.len());
    x
}
```

## Structs with Lifetimes

When a struct holds references, you must annotate the lifetimes. This tells the compiler that an instance of the struct cannot outlive the references it contains:

```rust
// This struct holds a reference to a str
// The lifetime annotation 'a means: "an ImportantExcerpt cannot
// outlive the reference it holds in the part field"
struct ImportantExcerpt<'a> {
    part: &'a str,
}

fn main() {
    let novel = String::from("Call me Ishmael. Some years ago...");

    // first_sentence is a reference into novel
    let first_sentence = novel.split('.').next().unwrap();

    // excerpt holds a reference to part of novel
    let excerpt = ImportantExcerpt {
        part: first_sentence,
    };

    println!("Excerpt: {}", excerpt.part);

} // novel is dropped here, but that's fine - excerpt is also dropped
```

If you try to use the struct after the referenced data is dropped, the compiler catches it:

```rust
fn main() {
    let excerpt;

    {
        let novel = String::from("Call me Ishmael. Some years ago...");
        let first_sentence = novel.split('.').next().unwrap();

        excerpt = ImportantExcerpt {
            part: first_sentence,
        };
    } // novel is dropped here

    // ERROR: excerpt.part would be a dangling reference
    println!("Excerpt: {}", excerpt.part);
}
```

## Implementing Methods on Structs with Lifetimes

When implementing methods on a struct with lifetime parameters, you declare the lifetimes in the `impl` block:

```rust
struct ImportantExcerpt<'a> {
    part: &'a str,
}

// Declare 'a on the impl block, then use it in the type
impl<'a> ImportantExcerpt<'a> {
    // Method that returns data from self - lifetime elision applies
    fn level(&self) -> i32 {
        3
    }

    // Method that returns a reference - elision rule 3 applies
    // The compiler infers the return type is &'a str
    fn announce_and_return_part(&self, announcement: &str) -> &str {
        println!("Attention please: {}", announcement);
        self.part
    }
}
```

## Multiple Lifetime Parameters in Structs

Sometimes a struct holds references with different lifetimes:

```rust
// This struct holds two references that may have different lifetimes
struct DoubleRef<'a, 'b> {
    first: &'a str,
    second: &'b str,
}

fn main() {
    let string1 = String::from("first");

    {
        let string2 = String::from("second");

        let double = DoubleRef {
            first: &string1,
            second: &string2,
        };

        println!("First: {}, Second: {}", double.first, double.second);
    } // string2 and double are dropped

    // string1 is still valid
    println!("String1 is still here: {}", string1);
}
```

## The Static Lifetime

The `'static` lifetime is a special lifetime that means "lives for the entire duration of the program." String literals have this lifetime:

```rust
// String literals are stored in the program binary and live forever
let s: &'static str = "I have a static lifetime.";
```

You can also create `'static` references with `Box::leak` or lazy statics:

```rust
use std::sync::LazyLock;

// Static data initialized at first access
static CONFIG: LazyLock<String> = LazyLock::new(|| {
    std::fs::read_to_string("config.toml")
        .unwrap_or_else(|_| String::from("default config"))
});

fn get_config() -> &'static str {
    &CONFIG
}
```

Be cautious with `'static` - it is often overused. When the compiler suggests adding `'static` to fix a lifetime error, there is usually a better solution that does not require the data to live forever.

## Common Lifetime Errors and How to Fix Them

### Error: "borrowed value does not live long enough"

This means you are trying to use a reference after the data it points to has been dropped:

```rust
// ERROR: s does not live long enough
fn create_reference() -> &String {
    let s = String::from("hello");
    &s  // s is dropped at the end of this function
}
```

**Fix: Return owned data instead of a reference:**

```rust
fn create_string() -> String {
    let s = String::from("hello");
    s  // Move ownership to the caller
}
```

### Error: "cannot return reference to local variable"

Similar to above, but the error message is more specific:

```rust
fn get_str() -> &str {
    let s = String::from("hello");
    &s[..]  // Cannot return reference to local s
}
```

**Fix: Accept a reference parameter or return owned data:**

```rust
// Option 1: Take a reference and return a reference to it
fn get_str(s: &str) -> &str {
    &s[..3]
}

// Option 2: Return owned data
fn get_string() -> String {
    String::from("hello")
}
```

### Error: "lifetime may not live long enough"

This happens when the compiler cannot prove a lifetime relationship holds:

```rust
// ERROR: 'a and 'b might be different lifetimes
fn longest_wrong<'a, 'b>(x: &'a str, y: &'b str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y  // ERROR: returning 'b when 'a is expected
    }
}
```

**Fix: Use the same lifetime for both parameters:**

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}
```

**Or use a lifetime bound if one must outlive the other:**

```rust
// 'b must live at least as long as 'a
fn longest<'a, 'b: 'a>(x: &'a str, y: &'b str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}
```

### Error: "missing lifetime specifier"

The compiler cannot infer which lifetime to use:

```rust
// ERROR: Multiple input lifetimes, which applies to output?
struct Context<'a> {
    data: &'a str,
}

fn parse(context: &Context, input: &str) -> &str {
    // Which lifetime should the return have?
    &input[..5]
}
```

**Fix: Add explicit lifetime annotations:**

```rust
struct Context<'a> {
    data: &'a str,
}

// Be explicit about lifetime relationships
fn parse<'a, 'b>(context: &Context<'a>, input: &'b str) -> &'b str {
    &input[..5]
}
```

## Lifetime Bounds on Generic Types

When generic types contain references, you need lifetime bounds:

```rust
use std::fmt::Display;

// T must implement Display AND any references in T must live at least as long as 'a
fn longest_with_announcement<'a, T>(
    x: &'a str,
    y: &'a str,
    ann: T,
) -> &'a str
where
    T: Display,
{
    println!("Announcement! {}", ann);
    if x.len() > y.len() {
        x
    } else {
        y
    }
}
```

For structs with generic types that might contain references:

```rust
// T might contain references, so we need a lifetime bound
struct Wrapper<'a, T: 'a> {
    value: &'a T,
}

// Or using the simpler syntax when T itself is a reference
struct SimpleWrapper<'a, T> {
    value: &'a T,
}
```

## Higher-Ranked Trait Bounds (HRTBs)

Sometimes you need to express "this works for any lifetime." This is where Higher-Ranked Trait Bounds come in:

```rust
// This function takes a closure that can work with any lifetime
fn apply_to_ref<F>(f: F, s: &str) -> usize
where
    F: for<'a> Fn(&'a str) -> usize,  // F works for any lifetime 'a
{
    f(s)
}

fn main() {
    let count_chars = |s: &str| s.len();

    let string = String::from("hello");
    let result = apply_to_ref(count_chars, &string);

    println!("Length: {}", result);
}
```

The `for<'a>` syntax means "for all lifetimes 'a." This is common when working with closures that take references.

## Practical Patterns

### Pattern 1: Parsing and Returning Slices

A common pattern is parsing input and returning slices into it:

```rust
// Returns slices into the input - lifetime ties output to input
fn parse_key_value(input: &str) -> Option<(&str, &str)> {
    let mut parts = input.splitn(2, '=');
    let key = parts.next()?.trim();
    let value = parts.next()?.trim();
    Some((key, value))
}

fn main() {
    let line = "name = John Doe";

    if let Some((key, value)) = parse_key_value(line) {
        println!("Key: '{}', Value: '{}'", key, value);
    }
}
```

### Pattern 2: Iterator Over Borrowed Data

When creating iterators that borrow data, lifetimes ensure safety:

```rust
struct LineIterator<'a> {
    remaining: &'a str,
}

impl<'a> LineIterator<'a> {
    fn new(text: &'a str) -> Self {
        LineIterator { remaining: text }
    }
}

impl<'a> Iterator for LineIterator<'a> {
    type Item = &'a str;

    fn next(&mut self) -> Option<Self::Item> {
        if self.remaining.is_empty() {
            return None;
        }

        match self.remaining.find('\n') {
            Some(pos) => {
                let line = &self.remaining[..pos];
                self.remaining = &self.remaining[pos + 1..];
                Some(line)
            }
            None => {
                let line = self.remaining;
                self.remaining = "";
                Some(line)
            }
        }
    }
}

fn main() {
    let text = "line one\nline two\nline three";

    for line in LineIterator::new(text) {
        println!("{}", line);
    }
}
```

### Pattern 3: Cache with Borrowed Keys

Building a cache that borrows keys from input:

```rust
use std::collections::HashMap;

struct Cache<'a> {
    entries: HashMap<&'a str, String>,
}

impl<'a> Cache<'a> {
    fn new() -> Self {
        Cache {
            entries: HashMap::new(),
        }
    }

    // Key is borrowed from caller, value is owned
    fn insert(&mut self, key: &'a str, value: String) {
        self.entries.insert(key, value);
    }

    fn get(&self, key: &str) -> Option<&String> {
        self.entries.get(key)
    }
}

fn main() {
    let key1 = String::from("user_1");
    let key2 = String::from("user_2");

    let mut cache = Cache::new();
    cache.insert(&key1, String::from("Alice"));
    cache.insert(&key2, String::from("Bob"));

    println!("User 1: {:?}", cache.get("user_1"));

    // key1 and key2 must outlive cache
}
```

### Pattern 4: Self-Referential Structures (The Challenge)

Sometimes you want a struct that holds both owned data and references into that data. This is tricky in safe Rust:

```rust
// This WON'T work - Rust doesn't allow self-referential structs directly
// struct SelfRef {
//     data: String,
//     slice: &str,  // Can't reference data - what lifetime?
// }

// Solution 1: Store indices instead of references
struct SafeStruct {
    data: String,
    start: usize,
    end: usize,
}

impl SafeStruct {
    fn new(data: String, start: usize, end: usize) -> Self {
        assert!(end <= data.len());
        SafeStruct { data, start, end }
    }

    fn slice(&self) -> &str {
        &self.data[self.start..self.end]
    }
}

// Solution 2: Use separate lifetimes (data lives elsewhere)
struct BorrowedStruct<'a> {
    slice: &'a str,
}

fn main() {
    // Approach 1: Indices
    let s = SafeStruct::new(String::from("hello world"), 0, 5);
    println!("Slice: {}", s.slice());

    // Approach 2: Keep data separate
    let data = String::from("hello world");
    let borrowed = BorrowedStruct { slice: &data[0..5] };
    println!("Borrowed: {}", borrowed.slice);
}
```

## Lifetimes in Async Code

Async functions and lifetimes interact in specific ways. The future returned by an async function captures any references:

```rust
use std::future::Future;

// This async function returns a future that borrows input
async fn process(input: &str) -> usize {
    // Simulate async work
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    input.len()
}

// The future must not outlive the borrowed input
async fn example() {
    let data = String::from("hello");

    // This works - data lives until await completes
    let len = process(&data).await;
    println!("Length: {}", len);
}

// Be careful with spawning tasks that borrow data
async fn careful_spawning() {
    let data = String::from("hello");

    // This won't compile - spawned task might outlive data
    // tokio::spawn(async {
    //     process(&data).await
    // });

    // Fix: Move owned data into the task
    let data_clone = data.clone();
    tokio::spawn(async move {
        println!("Processing: {}", data_clone);
    });
}
```

## Debugging Lifetime Errors

When you encounter confusing lifetime errors, try these strategies:

### 1. Draw the Lifetimes

Visualize scopes with braces and track where each reference starts and ends:

```rust
fn main() {
    let a;                      // ----+-- 'a starts
    {                           //     |
        let b = String::from("b"); // -+-- 'b starts
        a = &b;                 //  |  |
    }                           // -+-- 'b ends
    println!("{}", a);          //     |  ERROR: 'b ended before use
}                               // ----+-- 'a ends
```

### 2. Start with Owned Data

If lifetimes are confusing, start with owned data and add borrowing only where needed:

```rust
// Start with owned data
struct Config {
    name: String,  // Owned, not borrowed
}

// Add borrowing only if you have a specific performance need
struct ConfigRef<'a> {
    name: &'a str,  // Borrowed, requires lifetime tracking
}
```

### 3. Use the Compiler Messages

Rust's error messages are detailed. Read them carefully:

```
error[E0597]: `x` does not live long enough
  --> src/main.rs:4:13
   |
3  |     let r;
   |         - borrow later stored here
4  |         r = &x;
   |             ^^ borrowed value does not live long enough
5  |     }
   |     - `x` dropped here while still borrowed
```

This tells you exactly which variable is the problem and where it is dropped.

### 4. Check for NLL (Non-Lexical Lifetimes)

Modern Rust uses Non-Lexical Lifetimes, which are smarter about when borrows end:

```rust
fn main() {
    let mut data = vec![1, 2, 3];

    let first = &data[0];  // Immutable borrow starts
    println!("First: {}", first);  // Last use of first
    // NLL: immutable borrow ends here, not at end of scope

    data.push(4);  // This works with NLL!
    println!("Data: {:?}", data);
}
```

## Summary

| Concept | Purpose | Example |
|---------|---------|---------|
| Lifetime annotations | Describe reference relationships | `fn foo<'a>(x: &'a str) -> &'a str` |
| Lifetime elision | Compiler infers common patterns | `fn first(s: &str) -> &str` |
| Struct lifetimes | Ensure struct does not outlive references | `struct Foo<'a> { data: &'a str }` |
| `'static` | Lives for entire program | `let s: &'static str = "hello"` |
| Lifetime bounds | Constrain generic types | `T: 'a` means T outlives 'a |
| HRTB | Works for any lifetime | `for<'a> Fn(&'a str)` |

Lifetimes are the compiler's way of tracking reference validity without runtime overhead. Once you internalize that lifetimes are about relationships - not about controlling when things are dropped - they become much easier to work with.

The key insights are:

1. Lifetime annotations describe existing relationships; they do not create new ones
2. When in doubt, use owned data instead of references
3. The compiler is conservative - it may reject safe code to guarantee safety
4. Start simple and add lifetime complexity only when needed

---

## Monitor Your Rust Applications with OneUptime

Building reliable Rust applications requires more than just memory safety. You need visibility into how your services perform in production.

[OneUptime](https://oneuptime.com) provides comprehensive monitoring for Rust applications:

- **Uptime monitoring** to detect when your Rust services go down
- **Performance metrics** to track response times and throughput
- **Alerting** via Slack, PagerDuty, email, and SMS when issues occur
- **Status pages** to keep your users informed during incidents
- **OpenTelemetry integration** for distributed tracing across your Rust microservices

Whether you are running a high-performance API server, a systems daemon, or embedded software that reports home, OneUptime helps you maintain reliability and respond to incidents quickly.

Start monitoring your Rust applications today at [oneuptime.com](https://oneuptime.com).
