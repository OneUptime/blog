# How to Fix 'Expected type, found' Errors in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Type System, Errors, Debugging, Syntax

Description: Learn how to diagnose and fix 'expected type, found' errors in Rust. Understand common causes and discover patterns to resolve type mismatches.

---

The "expected type, found" error family in Rust indicates a mismatch between what the compiler expected and what it found. These errors often stem from syntax mistakes, missing annotations, or confusion between types and values. This guide covers the common causes and fixes.

## Understanding the Error

This error appears in several forms:

```
error: expected type, found `42`
error: expected type, found keyword `let`
error: expected type, found `foo`
```

Each indicates the compiler expected a type where you provided something else.

## Cause 1: Using Value Instead of Type

The most common case is using a value where a type is expected:

```rust
// Error: expected type, found `42`
// fn bad() -> 42 { }

// Fix: use actual type
fn good() -> i32 {
    42
}

// Error: expected type, found expression
// struct Bad {
//     field: 10,
// }

// Fix: provide type, not value
struct Good {
    field: i32,
}
```

## Cause 2: Missing Type Annotation

When type inference cannot determine the type:

```rust
fn main() {
    // Error in some contexts: cannot infer type
    // let v = Vec::new();

    // Fix 1: explicit type annotation
    let v: Vec<i32> = Vec::new();

    // Fix 2: turbofish syntax
    let v = Vec::<i32>::new();

    // Fix 3: let usage guide inference
    let mut v = Vec::new();
    v.push(42);  // Now compiler knows it's Vec<i32>
}
```

## Cause 3: Confusing Types and Modules

```rust
// Error: expected type, found module
// use std::collections;
// let map: collections = ...;

// Fix: use the actual type from the module
use std::collections::HashMap;
let map: HashMap<String, i32> = HashMap::new();

// Also watch for this mistake
mod my_module {
    pub struct MyType;
}

// Error: expected type, found module `my_module`
// let x: my_module = ...;

// Fix: use the type inside the module
let x: my_module::MyType = my_module::MyType;
```

## Cause 4: Generic Type Parameters

Mixing up type parameters and values:

```rust
// Error: expected type, found `5`
// struct Bad<5> {
//     data: i32,
// }

// Fix: type parameters are types, not values
struct Good<T> {
    data: T,
}

// For const generics, use const keyword
struct WithConst<const N: usize> {
    data: [i32; N],
}

fn main() {
    let g: Good<i32> = Good { data: 42 };
    let w: WithConst<5> = WithConst { data: [1, 2, 3, 4, 5] };
}
```

## Cause 5: Trait Bounds Syntax

```rust
// Error: expected type, found `+`
// fn bad<T: Clone + Debug>(x: T) { }  // This is actually correct
// The error happens with wrong syntax like:
// fn bad<T: Clone Debug>(x: T) { }  // Missing +

// Correct syntax
use std::fmt::Debug;

fn correct<T: Clone + Debug>(x: T) {
    println!("{:?}", x);
}

// Or use where clause
fn also_correct<T>(x: T)
where
    T: Clone + Debug,
{
    println!("{:?}", x);
}
```

## Cause 6: Function vs Type Confusion

```rust
// Error: expected type, found function
// let x: println = ...;

// println is a macro, not a type
// Functions also cannot be used as types directly

// Fix: use the actual type
fn my_function() -> i32 { 42 }

// Cannot use function name as type
// let x: my_function = ...;

// Use fn pointer type instead
let x: fn() -> i32 = my_function;
```

## Cause 7: Associated Types

```rust
trait Container {
    type Item;
    fn get(&self) -> Self::Item;
}

struct IntContainer {
    value: i32,
}

impl Container for IntContainer {
    type Item = i32;

    fn get(&self) -> Self::Item {
        self.value
    }
}

// Error: expected type, found `IntContainer::Item`
// let x: IntContainer::Item = 42;

// Fix: use the associated type correctly
fn use_container<C: Container>(c: &C) -> C::Item {
    c.get()
}

// Or use concrete type
let x: <IntContainer as Container>::Item = 42;
let x: i32 = 42;  // Simpler when you know the concrete type
```

## Cause 8: Macro Expansion Issues

```rust
// Some macro expansions can cause this error

// Error might occur with wrong macro usage
// type_alias!(MyType = i32);  // If macro expects different syntax

// Fix: check macro documentation for correct usage
macro_rules! create_type {
    ($name:ident, $type:ty) => {
        type $name = $type;
    };
}

create_type!(MyInt, i32);

fn main() {
    let x: MyInt = 42;
}
```

## Cause 9: Tuple vs Type Parentheses

```rust
// Parentheses can mean different things

// This is a tuple type
type Pair = (i32, i32);

// This is grouping (same as i32)
type Single = (i32);

// Empty parens is unit type
type Unit = ();

// Error: expected type, found `1, 2`
// let x: (1, 2) = ...;

// Fix: values go in expressions, not type annotations
let x: (i32, i32) = (1, 2);
```

## Cause 10: impl Trait Position

```rust
// impl Trait only valid in certain positions

// OK: return position
fn returns_impl() -> impl Iterator<Item = i32> {
    vec![1, 2, 3].into_iter()
}

// OK: argument position
fn takes_impl(iter: impl Iterator<Item = i32>) {
    for x in iter {
        println!("{}", x);
    }
}

// Error: cannot use impl Trait in let bindings
// let x: impl Clone = 42;

// Fix: use concrete type or generic
let x: i32 = 42;

fn with_generic<T: Clone>(x: T) {
    let cloned: T = x.clone();
}
```

## Debugging Tips

```rust
// 1. Check that you're using a type, not a value
fn check_types() {
    // Wrong: 5 is a value
    // let x: 5 = ...;

    // Right: i32 is a type
    let x: i32 = 5;
}

// 2. Verify module paths
mod outer {
    pub mod inner {
        pub struct Type;
    }
}

fn check_paths() {
    // Wrong: path to module, not type
    // let x: outer::inner = ...;

    // Right: path to type
    let x: outer::inner::Type = outer::inner::Type;
}

// 3. Check generic syntax
fn check_generics() {
    // Wrong: missing type parameter
    // let v: Vec = Vec::new();

    // Right: include type parameter
    let v: Vec<i32> = Vec::new();
}
```

## Summary

| Error Pattern | Likely Cause | Fix |
|---------------|--------------|-----|
| `expected type, found value` | Using literal where type needed | Use actual type name |
| `expected type, found module` | Module path instead of type | Add type name to path |
| `expected type, found function` | Function name instead of type | Use `fn()` pointer type |
| `expected type, found keyword` | Syntax error in type position | Check type syntax |
| `cannot infer type` | Missing type information | Add annotation or turbofish |

When you see "expected type, found X", check that you are providing a type (like `i32`, `String`, `Vec<T>`) rather than a value (like `42`, `"hello"`, `vec![1,2,3]`), a module path, or a function name.
