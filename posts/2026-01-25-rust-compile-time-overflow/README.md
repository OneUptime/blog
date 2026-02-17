# How to Fix 'Overflow when adding' at Compile Time in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Const Evaluation, Overflow, Type System, Compile Time

Description: Learn how to fix compile-time overflow errors in Rust. This guide covers const evaluation limits, type size calculations, and strategies for avoiding overflow during compilation.

---

Compile-time overflow errors occur when Rust evaluates constant expressions and the result exceeds the type's capacity. Unlike runtime overflow, which may panic or wrap, compile-time overflow is caught by the compiler and must be fixed in the source code.

## Understanding the Error

The error occurs during constant evaluation, including const functions, array sizes, and type-level computations.

```rust
// Error: attempt to compute `u8::MAX + 1_u8`, which would overflow
// const TOO_BIG: u8 = 255 + 1;

// Error in array size
// const SIZE: usize = usize::MAX;
// let arr: [i32; SIZE + 1] = [0; SIZE + 1];  // Overflow!

fn main() {
    // These are checked at compile time
    const A: u8 = 200;
    const B: u8 = 50;
    // const C: u8 = A + B;  // Error: 250 + ... wait, this would be fine
    // const C: u8 = A + B + 10;  // Error: 250 + 10 = 260, overflow!

    println!("This code needs fixing");
}
```

## Common Scenarios

### Array Size Overflow

```rust
// Problem: Array size calculation overflows
// const BASE: usize = 1024 * 1024 * 1024;  // 1GB
// const MULTIPLIER: usize = 1024;
// const SIZE: usize = BASE * MULTIPLIER;  // Overflow on 32-bit!

// Solution 1: Use a smaller size
const SAFE_SIZE: usize = 1024 * 1024;  // 1MB
fn main() {
    let _arr: [u8; SAFE_SIZE] = [0; SAFE_SIZE];
    println!("Array created with {} bytes", SAFE_SIZE);
}
```

### Const Generic Overflow

```rust
// Problem with const generic calculations
// struct Buffer<const N: usize> {
//     data: [u8; N * 2],  // N * 2 might overflow
// }

// Solution: Use checked arithmetic in const context
const fn safe_double(n: usize) -> usize {
    match n.checked_mul(2) {
        Some(result) => result,
        None => panic!("Overflow in safe_double"),
    }
}

struct Buffer<const N: usize> {
    data: [u8; 1024],  // Use fixed size instead
}

fn main() {
    let _buf: Buffer<512> = Buffer { data: [0; 1024] };
}
```

### Numeric Literal Overflow

```rust
fn main() {
    // Problem: Literal too large for type
    // let x: u8 = 256;  // Error: literal out of range

    // Solution 1: Use appropriate type
    let x: u16 = 256;

    // Solution 2: Use wrapping if intentional
    let y: u8 = 256u16 as u8;  // Wraps to 0

    // Problem with expressions
    // const BIG: u32 = 1_000_000 * 1_000_000;  // Overflow in u32

    // Solution: Use larger type
    const BIG: u64 = 1_000_000 * 1_000_000;

    // Or use explicit widening
    const BIG2: u64 = 1_000_000u64 * 1_000_000;

    println!("{} {} {}", x, y, BIG);
}
```

## Const Function Limitations

Const functions have restrictions on arithmetic operations.

```rust
// Const functions that might overflow
const fn factorial(n: u64) -> u64 {
    match n {
        0 | 1 => 1,
        _ => n * factorial(n - 1),
    }
}

fn main() {
    // These work
    const FACT_10: u64 = factorial(10);
    const FACT_15: u64 = factorial(15);

    println!("10! = {}", FACT_10);
    println!("15! = {}", FACT_15);

    // This would overflow at compile time
    // const FACT_25: u64 = factorial(25);  // Error!

    // Runtime version can handle it differently
    let fact_25 = factorial(25);  // Might panic or wrap depending on build mode
}
```

## Safe Const Arithmetic

Use checked operations to handle potential overflow.

```rust
const fn checked_add(a: usize, b: usize) -> usize {
    match a.checked_add(b) {
        Some(result) => result,
        None => panic!("Addition overflow"),
    }
}

const fn checked_mul(a: usize, b: usize) -> usize {
    match a.checked_mul(b) {
        Some(result) => result,
        None => panic!("Multiplication overflow"),
    }
}

const fn safe_array_size(base: usize, count: usize) -> usize {
    checked_mul(base, count)
}

fn main() {
    // Safe calculation
    const SIZE: usize = safe_array_size(1024, 100);
    let _arr: [u8; SIZE] = [0; SIZE];

    // This would panic at compile time with clear message
    // const BAD: usize = safe_array_size(usize::MAX, 2);

    println!("Array size: {}", SIZE);
}
```

## Saturating and Wrapping in Const Context

```rust
const fn saturating_add(a: u8, b: u8) -> u8 {
    // saturating_add is const
    a.saturating_add(b)
}

const fn wrapping_add(a: u8, b: u8) -> u8 {
    // wrapping_add is const
    a.wrapping_add(b)
}

fn main() {
    const SAT: u8 = saturating_add(200, 100);  // 255 (saturated)
    const WRAP: u8 = wrapping_add(200, 100);   // 44 (wrapped)

    println!("Saturated: {}", SAT);
    println!("Wrapped: {}", WRAP);
}
```

## Type-Level Size Calculations

When working with types, size calculations can overflow.

```rust
use std::mem::size_of;

// Be careful with size calculations
fn main() {
    // These sizes are known at compile time
    const I32_SIZE: usize = size_of::<i32>();
    const ARRAY_SIZE: usize = size_of::<[i32; 1000]>();

    println!("i32 size: {}", I32_SIZE);
    println!("Array size: {}", ARRAY_SIZE);

    // Large arrays might have size overflow issues
    // const HUGE: usize = size_of::<[i32; usize::MAX]>();  // Error!
}
```

## Build Configuration for Overflow

Rust's behavior differs between debug and release builds.

```rust
fn main() {
    // In debug mode: panics on overflow
    // In release mode: wraps by default

    // Always check if overflow is possible
    let a: u8 = 200;
    let b: u8 = 100;

    // Option 1: Checked (returns Option)
    let result = a.checked_add(b);
    match result {
        Some(sum) => println!("Sum: {}", sum),
        None => println!("Overflow!"),
    }

    // Option 2: Saturating (clamps to max)
    let saturated = a.saturating_add(b);
    println!("Saturated: {}", saturated);

    // Option 3: Wrapping (wraps around)
    let wrapped = a.wrapping_add(b);
    println!("Wrapped: {}", wrapped);

    // Option 4: Overflowing (returns value and overflow flag)
    let (value, overflowed) = a.overflowing_add(b);
    println!("Value: {}, Overflowed: {}", value, overflowed);
}
```

## Fixing Common Patterns

### Pattern 1: Buffer Size Calculation

```rust
// Problem
// const HEADER_SIZE: usize = 64;
// const MAX_ITEMS: usize = usize::MAX / 8;
// const BUFFER_SIZE: usize = HEADER_SIZE + MAX_ITEMS;  // Overflow!

// Solution: Use reasonable limits
const HEADER_SIZE: usize = 64;
const MAX_ITEMS: usize = 1024 * 1024;  // 1M items max
const ITEM_SIZE: usize = 8;
const BUFFER_SIZE: usize = HEADER_SIZE + MAX_ITEMS * ITEM_SIZE;

fn main() {
    println!("Buffer size: {} bytes", BUFFER_SIZE);
}
```

### Pattern 2: Bit Shifting

```rust
// Problem: Shift can overflow
// const FLAGS: u32 = 1 << 32;  // Error: shift >= bit width

// Solution: Use appropriate width
const FLAG_A: u32 = 1 << 0;
const FLAG_B: u32 = 1 << 1;
const FLAG_C: u32 = 1 << 31;  // Max for u32

// For more flags, use larger type
const FLAG_LARGE: u64 = 1u64 << 32;

fn main() {
    println!("Flags: {}, {}, {}, {}", FLAG_A, FLAG_B, FLAG_C, FLAG_LARGE);
}
```

### Pattern 3: Time Calculations

```rust
// Problem: Millisecond calculations can overflow
// const DAYS_MS: u64 = 365 * 24 * 60 * 60 * 1000 * 100;  // 100 years

// Solution: Use intermediate steps with larger types
const SECONDS_PER_DAY: u64 = 24 * 60 * 60;
const MS_PER_SECOND: u64 = 1000;
const DAYS: u64 = 365 * 100;
const TOTAL_MS: u64 = DAYS * SECONDS_PER_DAY * MS_PER_SECOND;

fn main() {
    println!("100 years in ms: {}", TOTAL_MS);
}
```

## Summary

Compile-time overflow occurs when constant expressions exceed type limits:

| Cause | Solution |
|-------|----------|
| Literal too large | Use larger type |
| Expression overflow | Break into smaller steps |
| Array size overflow | Use smaller array or Box |
| Const function overflow | Use checked arithmetic |

Strategies:

- Use checked_*, saturating_*, or wrapping_* operations
- Choose appropriate numeric types
- Break large calculations into steps
- Use larger intermediate types
- Set reasonable limits on sizes

The compiler catches these errors to prevent undefined behavior. Fix them by using appropriate types and arithmetic operations.
