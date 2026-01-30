# How to Create Compile-Time Constants in Rust

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Rust, Const, Performance, Metaprogramming

Description: Master compile-time computation in Rust with const fn, const generics, and static assertions for zero-runtime-cost constants and validations.

---

Compile-time computation is one of Rust's most powerful features. By moving calculations from runtime to compile time, you eliminate overhead, catch errors earlier, and make your code more robust. This post covers everything from basic constants to advanced metaprogramming techniques.

## Understanding const vs static

Before diving into compile-time computation, you need to understand the difference between `const` and `static`. Both define values known at compile time, but they behave differently.

| Feature | `const` | `static` |
|---------|---------|----------|
| Memory location | Inlined at each use site | Single fixed memory location |
| Mutability | Always immutable | Can be mutable with `static mut` |
| Interior mutability | Not allowed | Allowed (with synchronization) |
| Lifetime | No lifetime (inlined) | `'static` lifetime |
| Address | No guaranteed address | Has a fixed address |
| Use case | Compile-time values | Global state, FFI |

Here is a basic example showing the difference:

```rust
// const: value is inlined wherever it's used
const MAX_BUFFER_SIZE: usize = 1024;

// static: has a fixed memory address
static APP_VERSION: &str = "1.0.0";

// static mut: mutable global (requires unsafe to access)
static mut COUNTER: u32 = 0;

fn main() {
    // Using const - the value 1024 is directly substituted here
    let buffer: [u8; MAX_BUFFER_SIZE] = [0; MAX_BUFFER_SIZE];

    // Using static - this references the actual memory location
    println!("Version: {}", APP_VERSION);

    // static mut requires unsafe
    unsafe {
        COUNTER += 1;
        println!("Counter: {}", COUNTER);
    }
}
```

### When to Use const

Use `const` when you need a value that should be substituted directly into the code. Constants are ideal for configuration values, mathematical constants, and array sizes.

```rust
// Mathematical constants
const PI: f64 = 3.14159265358979323846;
const E: f64 = 2.71828182845904523536;
const GOLDEN_RATIO: f64 = 1.61803398874989484820;

// Configuration constants
const MAX_CONNECTIONS: usize = 100;
const TIMEOUT_SECONDS: u64 = 30;
const DEFAULT_PORT: u16 = 8080;

// Array size constants - must be const, not static
const CACHE_SIZE: usize = 256;
static CACHE: [u8; CACHE_SIZE] = [0; CACHE_SIZE];

fn create_buffer() -> [u8; MAX_BUFFER_SIZE] {
    [0; MAX_BUFFER_SIZE]
}
```

### When to Use static

Use `static` when you need a value with a fixed memory address, when working with FFI, or when you need interior mutability with synchronization primitives.

```rust
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;

// Atomic counters - perfect use case for static
static REQUEST_COUNT: AtomicUsize = AtomicUsize::new(0);

// Lazy initialization with synchronization
static CONFIG: Mutex<Vec<String>> = Mutex::new(Vec::new());

fn handle_request() {
    // Atomic increment - thread safe
    REQUEST_COUNT.fetch_add(1, Ordering::SeqCst);
}

fn get_request_count() -> usize {
    REQUEST_COUNT.load(Ordering::SeqCst)
}

fn main() {
    handle_request();
    handle_request();
    println!("Total requests: {}", get_request_count());
}
```

## Const Functions (const fn)

The `const fn` feature allows you to define functions that can be evaluated at compile time. When called in a const context, the computation happens during compilation.

### Basic const fn

```rust
// A simple const function
const fn square(x: u32) -> u32 {
    x * x
}

// Can be used in const contexts
const SQUARED_TEN: u32 = square(10); // Computed at compile time

// Also works at runtime
fn main() {
    let runtime_value = square(5); // Computed at runtime
    println!("10 squared: {}", SQUARED_TEN);
    println!("5 squared: {}", runtime_value);
}
```

### Control Flow in const fn

Modern Rust allows loops and conditionals in const functions:

```rust
// Factorial computed at compile time
const fn factorial(n: u64) -> u64 {
    let mut result = 1;
    let mut i = 2;
    while i <= n {
        result *= i;
        i += 1;
    }
    result
}

// Fibonacci using recursion
const fn fibonacci(n: u32) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

// All computed at compile time
const FACT_10: u64 = factorial(10);
const FACT_20: u64 = factorial(20);
const FIB_20: u64 = fibonacci(20);

fn main() {
    println!("10! = {}", FACT_10);
    println!("20! = {}", FACT_20);
    println!("fib(20) = {}", FIB_20);
}
```

### String Processing in const fn

You can process strings at compile time, though with some limitations:

```rust
// Count occurrences of a byte in a string at compile time
const fn count_byte(s: &[u8], byte: u8) -> usize {
    let mut count = 0;
    let mut i = 0;
    while i < s.len() {
        if s[i] == byte {
            count += 1;
        }
        i += 1;
    }
    count
}

// Check if a string contains only ASCII digits
const fn is_numeric(s: &[u8]) -> bool {
    let mut i = 0;
    while i < s.len() {
        if s[i] < b'0' || s[i] > b'9' {
            return false;
        }
        i += 1;
    }
    true
}

const MESSAGE: &[u8] = b"hello world";
const SPACE_COUNT: usize = count_byte(MESSAGE, b' ');
const NUMBER: &[u8] = b"12345";
const IS_NUMERIC: bool = is_numeric(NUMBER);

fn main() {
    println!("Spaces in message: {}", SPACE_COUNT);
    println!("Is '12345' numeric: {}", IS_NUMERIC);
}
```

### Building Data Structures at Compile Time

You can create arrays and perform transformations at compile time:

```rust
// Generate a lookup table at compile time
const fn generate_squares() -> [u32; 16] {
    let mut table = [0u32; 16];
    let mut i = 0;
    while i < 16 {
        table[i] = (i * i) as u32;
        i += 1;
    }
    table
}

// Generate powers of 2
const fn generate_powers_of_two() -> [u64; 64] {
    let mut powers = [0u64; 64];
    let mut i = 0;
    while i < 64 {
        powers[i] = 1u64 << i;
        i += 1;
    }
    powers
}

// Precomputed at compile time
const SQUARES: [u32; 16] = generate_squares();
const POWERS_OF_TWO: [u64; 64] = generate_powers_of_two();

fn main() {
    println!("Squares: {:?}", &SQUARES[..]);
    println!("2^10 = {}", POWERS_OF_TWO[10]);
    println!("2^63 = {}", POWERS_OF_TWO[63]);
}
```

## Const Generics and Const Expressions

Const generics allow you to parameterize types by constant values. Combined with const expressions, this enables powerful compile-time abstractions.

### Basic Const Generics

```rust
// A fixed-size buffer parameterized by its size
struct Buffer<const N: usize> {
    data: [u8; N],
    len: usize,
}

impl<const N: usize> Buffer<N> {
    const fn new() -> Self {
        Buffer {
            data: [0; N],
            len: 0,
        }
    }

    fn push(&mut self, byte: u8) -> Result<(), &'static str> {
        if self.len >= N {
            return Err("Buffer full");
        }
        self.data[self.len] = byte;
        self.len += 1;
        Ok(())
    }

    fn as_slice(&self) -> &[u8] {
        &self.data[..self.len]
    }
}

fn main() {
    let mut small_buffer: Buffer<16> = Buffer::new();
    let mut large_buffer: Buffer<1024> = Buffer::new();

    small_buffer.push(42).unwrap();
    large_buffer.push(99).unwrap();

    println!("Small buffer: {:?}", small_buffer.as_slice());
    println!("Large buffer: {:?}", large_buffer.as_slice());
}
```

### Const Expressions in Generic Bounds

You can use const expressions to compute values based on generic parameters:

```rust
// Matrix with compile-time dimensions
struct Matrix<const ROWS: usize, const COLS: usize> {
    data: [[f64; COLS]; ROWS],
}

impl<const ROWS: usize, const COLS: usize> Matrix<ROWS, COLS> {
    const fn zero() -> Self {
        Matrix {
            data: [[0.0; COLS]; ROWS],
        }
    }

    const fn identity() -> Self
    where
        [(); ROWS - COLS]: , // Compile-time assertion that ROWS == COLS
    {
        let mut data = [[0.0; COLS]; ROWS];
        let mut i = 0;
        while i < ROWS {
            data[i][i] = 1.0;
            i += 1;
        }
        Matrix { data }
    }

    fn get(&self, row: usize, col: usize) -> f64 {
        self.data[row][col]
    }

    fn set(&mut self, row: usize, col: usize, value: f64) {
        self.data[row][col] = value;
    }
}

// Transpose produces a matrix with swapped dimensions
impl<const ROWS: usize, const COLS: usize> Matrix<ROWS, COLS> {
    fn transpose(&self) -> Matrix<COLS, ROWS> {
        let mut result = Matrix::<COLS, ROWS>::zero();
        for i in 0..ROWS {
            for j in 0..COLS {
                result.data[j][i] = self.data[i][j];
            }
        }
        result
    }
}

fn main() {
    let identity: Matrix<3, 3> = Matrix::identity();
    println!("Identity[1][1] = {}", identity.get(1, 1));

    let mut m: Matrix<2, 3> = Matrix::zero();
    m.set(0, 0, 1.0);
    m.set(0, 1, 2.0);
    m.set(0, 2, 3.0);
    m.set(1, 0, 4.0);
    m.set(1, 1, 5.0);
    m.set(1, 2, 6.0);

    let transposed: Matrix<3, 2> = m.transpose();
    println!("Transposed[2][1] = {}", transposed.get(2, 1));
}
```

### Computing Array Sizes at Compile Time

```rust
// Compute required buffer size at compile time
const fn required_capacity(items: usize, item_size: usize, alignment: usize) -> usize {
    let total = items * item_size;
    // Round up to alignment
    (total + alignment - 1) / alignment * alignment
}

const ITEM_COUNT: usize = 100;
const ITEM_SIZE: usize = 24;
const ALIGNMENT: usize = 64;
const BUFFER_SIZE: usize = required_capacity(ITEM_COUNT, ITEM_SIZE, ALIGNMENT);

struct AlignedBuffer {
    data: [u8; BUFFER_SIZE],
}

// Compile-time size calculation for protocol messages
const fn message_size(header: usize, payload: usize, checksum: usize) -> usize {
    header + payload + checksum
}

const HEADER_SIZE: usize = 8;
const MAX_PAYLOAD: usize = 1024;
const CHECKSUM_SIZE: usize = 4;
const MAX_MESSAGE_SIZE: usize = message_size(HEADER_SIZE, MAX_PAYLOAD, CHECKSUM_SIZE);

fn main() {
    println!("Buffer size: {} bytes", BUFFER_SIZE);
    println!("Max message size: {} bytes", MAX_MESSAGE_SIZE);
}
```

## Static Assertions with static_assertions Crate

The `static_assertions` crate provides macros for compile-time checks. These assertions fail at compile time, not runtime, catching bugs early.

Add to your Cargo.toml:

```toml
[dependencies]
static_assertions = "1.1"
```

### Type Size Assertions

```rust
use static_assertions::{assert_eq_size, assert_eq_size_val, const_assert};

// Ensure types have expected sizes
assert_eq_size!(u64, [u8; 8]);
assert_eq_size!(*const u8, usize);

// Ensure two types have the same size
struct MyWrapper(u64);
assert_eq_size!(MyWrapper, u64);

// Assert size of a value's type
fn check_sizes() {
    let x: u32 = 0;
    assert_eq_size_val!(x, [u8; 4]);
}

// Const assertions for numeric conditions
const_assert!(std::mem::size_of::<usize>() >= 4);
const_assert!(MAX_BUFFER_SIZE > 0);
const_assert!(MAX_BUFFER_SIZE.is_power_of_two());
```

### Trait Implementation Assertions

```rust
use static_assertions::{assert_impl_all, assert_not_impl_any, assert_obj_safe};

// Verify a type implements required traits
assert_impl_all!(String: Clone, Send, Sync);
assert_impl_all!(Vec<u8>: Send, Sync, Clone);

// Verify a type does NOT implement certain traits
assert_not_impl_any!(std::rc::Rc<u8>: Send, Sync);

// Verify a trait is object-safe
assert_obj_safe!(std::fmt::Debug);
assert_obj_safe!(std::io::Read);

// Custom types
struct MyType {
    data: Vec<u8>,
}

assert_impl_all!(MyType: Send, Sync);
```

### Const Value Assertions

```rust
use static_assertions::const_assert;

const PAGE_SIZE: usize = 4096;
const CACHE_LINE: usize = 64;
const MAX_THREADS: usize = 256;

// Validate configuration at compile time
const_assert!(PAGE_SIZE.is_power_of_two());
const_assert!(CACHE_LINE.is_power_of_two());
const_assert!(PAGE_SIZE >= CACHE_LINE);
const_assert!(MAX_THREADS > 0 && MAX_THREADS <= 1024);

// Ensure array indices are valid
const LOOKUP_TABLE_SIZE: usize = 256;
const MAX_INDEX: usize = 255;
const_assert!(MAX_INDEX < LOOKUP_TABLE_SIZE);

// Validate bit field sizes
const FLAGS_BITS: usize = 8;
const ID_BITS: usize = 24;
const_assert!(FLAGS_BITS + ID_BITS == 32);
```

### Custom Compile-Time Assertions

You can create your own compile-time checks using const evaluation:

```rust
// Compile-time assertion that panics with a custom message
const fn const_assert_msg(condition: bool, _msg: &str) {
    if !condition {
        panic!("Compile-time assertion failed");
    }
}

// Validate configuration
const MAX_PACKET_SIZE: usize = 65535;
const HEADER_SIZE: usize = 20;
const MAX_PAYLOAD_SIZE: usize = MAX_PACKET_SIZE - HEADER_SIZE;

const _: () = const_assert_msg(
    MAX_PAYLOAD_SIZE < MAX_PACKET_SIZE,
    "Payload must be smaller than packet"
);

// Validate enum discriminants fit in expected size
#[repr(u8)]
enum Status {
    Ok = 0,
    Error = 1,
    Pending = 2,
    Complete = 3,
}

const _: () = const_assert_msg(
    std::mem::size_of::<Status>() == 1,
    "Status enum must fit in 1 byte"
);
```

## Build Scripts for Complex Constants

For constants that require complex computation, file I/O, or external data, use build scripts. The `build.rs` file runs before compilation and can generate Rust code.

### Basic build.rs Setup

Create `build.rs` in your project root:

```rust
// build.rs
use std::env;
use std::fs::File;
use std::io::Write;
use std::path::Path;

fn main() {
    let out_dir = env::var("OUT_DIR").unwrap();
    let dest_path = Path::new(&out_dir).join("constants.rs");
    let mut f = File::create(&dest_path).unwrap();

    // Generate a lookup table
    writeln!(f, "pub const SINE_TABLE: [f32; 360] = [").unwrap();
    for i in 0..360 {
        let radians = (i as f64) * std::f64::consts::PI / 180.0;
        let sine = radians.sin();
        if i < 359 {
            writeln!(f, "    {:.10},", sine as f32).unwrap();
        } else {
            writeln!(f, "    {:.10}", sine as f32).unwrap();
        }
    }
    writeln!(f, "];").unwrap();

    // Generate version info
    let version = env::var("CARGO_PKG_VERSION").unwrap();
    writeln!(f, "pub const VERSION: &str = \"{}\";", version).unwrap();

    // Generate build timestamp
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    writeln!(f, "pub const BUILD_TIMESTAMP: u64 = {};", timestamp).unwrap();
}
```

Include the generated code in your main source:

```rust
// src/main.rs
include!(concat!(env!("OUT_DIR"), "/constants.rs"));

fn main() {
    println!("Version: {}", VERSION);
    println!("Built at: {}", BUILD_TIMESTAMP);
    println!("sin(90) = {}", SINE_TABLE[90]);
    println!("sin(45) = {}", SINE_TABLE[45]);
}
```

### Generating Code from External Data

Build scripts can read external files and generate constants:

```rust
// build.rs
use std::collections::HashMap;
use std::env;
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;

fn main() {
    let out_dir = env::var("OUT_DIR").unwrap();
    let dest_path = Path::new(&out_dir).join("country_codes.rs");
    let mut f = File::create(&dest_path).unwrap();

    // Read country codes from a data file
    // In a real project, this might be a CSV or JSON file
    let countries = vec![
        ("US", "United States", 1),
        ("GB", "United Kingdom", 44),
        ("DE", "Germany", 49),
        ("JP", "Japan", 81),
        ("AU", "Australia", 61),
    ];

    // Generate a const array
    writeln!(f, "#[derive(Debug, Clone, Copy)]").unwrap();
    writeln!(f, "pub struct Country {{").unwrap();
    writeln!(f, "    pub code: &'static str,").unwrap();
    writeln!(f, "    pub name: &'static str,").unwrap();
    writeln!(f, "    pub phone_prefix: u16,").unwrap();
    writeln!(f, "}}").unwrap();
    writeln!(f).unwrap();

    writeln!(f, "pub const COUNTRIES: &[Country] = &[").unwrap();
    for (code, name, prefix) in &countries {
        writeln!(
            f,
            "    Country {{ code: \"{}\", name: \"{}\", phone_prefix: {} }},",
            code, name, prefix
        ).unwrap();
    }
    writeln!(f, "];").unwrap();

    // Generate lookup function
    writeln!(f).unwrap();
    writeln!(f, "pub const fn country_by_code(code: &str) -> Option<&'static Country> {{").unwrap();
    writeln!(f, "    let bytes = code.as_bytes();").unwrap();
    writeln!(f, "    let mut i = 0;").unwrap();
    writeln!(f, "    while i < COUNTRIES.len() {{").unwrap();
    writeln!(f, "        let c = &COUNTRIES[i];").unwrap();
    writeln!(f, "        let cb = c.code.as_bytes();").unwrap();
    writeln!(f, "        if bytes.len() == cb.len() {{").unwrap();
    writeln!(f, "            let mut j = 0;").unwrap();
    writeln!(f, "            let mut matches = true;").unwrap();
    writeln!(f, "            while j < bytes.len() {{").unwrap();
    writeln!(f, "                if bytes[j] != cb[j] {{").unwrap();
    writeln!(f, "                    matches = false;").unwrap();
    writeln!(f, "                    break;").unwrap();
    writeln!(f, "                }}").unwrap();
    writeln!(f, "                j += 1;").unwrap();
    writeln!(f, "            }}").unwrap();
    writeln!(f, "            if matches {{").unwrap();
    writeln!(f, "                return Some(c);").unwrap();
    writeln!(f, "            }}").unwrap();
    writeln!(f, "        }}").unwrap();
    writeln!(f, "        i += 1;").unwrap();
    writeln!(f, "    }}").unwrap();
    writeln!(f, "    None").unwrap();
    writeln!(f, "}}").unwrap();

    // Tell Cargo to rerun if the data file changes
    println!("cargo:rerun-if-changed=data/countries.csv");
}
```

### Generating Perfect Hash Tables

For high-performance lookups, generate perfect hash tables at build time:

```rust
// build.rs
use std::env;
use std::fs::File;
use std::io::Write;
use std::path::Path;

fn main() {
    let out_dir = env::var("OUT_DIR").unwrap();
    let dest_path = Path::new(&out_dir).join("keywords.rs");
    let mut f = File::create(&dest_path).unwrap();

    // Keywords to recognize
    let keywords = [
        "if", "else", "while", "for", "loop", "match",
        "fn", "let", "mut", "const", "static", "struct",
        "enum", "impl", "trait", "pub", "mod", "use",
    ];

    // Simple hash function for demonstration
    // In production, use the phf crate for perfect hashing
    fn hash(s: &str, table_size: usize) -> usize {
        let mut h: usize = 0;
        for b in s.bytes() {
            h = h.wrapping_mul(31).wrapping_add(b as usize);
        }
        h % table_size
    }

    // Find a table size with no collisions (simplified)
    let table_size = 64;

    // Generate the hash table
    writeln!(f, "pub const KEYWORD_TABLE_SIZE: usize = {};", table_size).unwrap();
    writeln!(f, "pub const KEYWORDS: [Option<&str>; KEYWORD_TABLE_SIZE] = [").unwrap();

    let mut table: Vec<Option<&str>> = vec![None; table_size];
    for kw in &keywords {
        let h = hash(kw, table_size);
        // Linear probing for collisions
        let mut idx = h;
        while table[idx].is_some() {
            idx = (idx + 1) % table_size;
        }
        table[idx] = Some(kw);
    }

    for entry in &table {
        match entry {
            Some(kw) => writeln!(f, "    Some(\"{}\"),", kw).unwrap(),
            None => writeln!(f, "    None,").unwrap(),
        }
    }
    writeln!(f, "];").unwrap();

    // Generate lookup function
    writeln!(f).unwrap();
    writeln!(f, "pub fn is_keyword(s: &str) -> bool {{").unwrap();
    writeln!(f, "    let mut h: usize = 0;").unwrap();
    writeln!(f, "    for b in s.bytes() {{").unwrap();
    writeln!(f, "        h = h.wrapping_mul(31).wrapping_add(b as usize);").unwrap();
    writeln!(f, "    }}").unwrap();
    writeln!(f, "    let mut idx = h % KEYWORD_TABLE_SIZE;").unwrap();
    writeln!(f, "    for _ in 0..KEYWORD_TABLE_SIZE {{").unwrap();
    writeln!(f, "        match KEYWORDS[idx] {{").unwrap();
    writeln!(f, "            Some(kw) if kw == s => return true,").unwrap();
    writeln!(f, "            Some(_) => idx = (idx + 1) % KEYWORD_TABLE_SIZE,").unwrap();
    writeln!(f, "            None => return false,").unwrap();
    writeln!(f, "        }}").unwrap();
    writeln!(f, "    }}").unwrap();
    writeln!(f, "    false").unwrap();
    writeln!(f, "}}").unwrap();
}
```

## Practical Examples

### Compile-Time Configuration Validation

```rust
// Configuration that must be validated at compile time
mod config {
    pub const MAX_CONNECTIONS: usize = 1000;
    pub const BUFFER_SIZE: usize = 8192;
    pub const TIMEOUT_MS: u64 = 30000;
    pub const MAX_RETRIES: u32 = 3;

    // Compile-time validation
    const _: () = {
        assert!(MAX_CONNECTIONS > 0, "Must allow at least one connection");
        assert!(MAX_CONNECTIONS <= 10000, "Too many connections");
        assert!(BUFFER_SIZE.is_power_of_two(), "Buffer size must be power of 2");
        assert!(BUFFER_SIZE >= 1024, "Buffer too small");
        assert!(TIMEOUT_MS >= 1000, "Timeout too short");
        assert!(MAX_RETRIES <= 10, "Too many retries");
    };
}

fn main() {
    println!("Config validated at compile time!");
    println!("Max connections: {}", config::MAX_CONNECTIONS);
}
```

### Compile-Time Bitfield Generation

```rust
// Generate bitmasks at compile time
const fn make_mask(bits: u32) -> u64 {
    if bits >= 64 {
        u64::MAX
    } else {
        (1u64 << bits) - 1
    }
}

const fn make_field_mask(offset: u32, width: u32) -> u64 {
    make_mask(width) << offset
}

// Packet header bit fields
const VERSION_OFFSET: u32 = 0;
const VERSION_WIDTH: u32 = 4;
const VERSION_MASK: u64 = make_field_mask(VERSION_OFFSET, VERSION_WIDTH);

const TYPE_OFFSET: u32 = 4;
const TYPE_WIDTH: u32 = 4;
const TYPE_MASK: u64 = make_field_mask(TYPE_OFFSET, TYPE_WIDTH);

const LENGTH_OFFSET: u32 = 8;
const LENGTH_WIDTH: u32 = 16;
const LENGTH_MASK: u64 = make_field_mask(LENGTH_OFFSET, LENGTH_WIDTH);

const FLAGS_OFFSET: u32 = 24;
const FLAGS_WIDTH: u32 = 8;
const FLAGS_MASK: u64 = make_field_mask(FLAGS_OFFSET, FLAGS_WIDTH);

const fn extract_field(value: u64, offset: u32, mask: u64) -> u64 {
    (value & mask) >> offset
}

const fn insert_field(value: u64, field: u64, offset: u32, mask: u64) -> u64 {
    (value & !mask) | ((field << offset) & mask)
}

fn main() {
    let header: u64 = 0;
    let header = insert_field(header, 1, VERSION_OFFSET, VERSION_MASK);
    let header = insert_field(header, 3, TYPE_OFFSET, TYPE_MASK);
    let header = insert_field(header, 1024, LENGTH_OFFSET, LENGTH_MASK);
    let header = insert_field(header, 0xFF, FLAGS_OFFSET, FLAGS_MASK);

    println!("Header: 0x{:016X}", header);
    println!("Version: {}", extract_field(header, VERSION_OFFSET, VERSION_MASK));
    println!("Type: {}", extract_field(header, TYPE_OFFSET, TYPE_MASK));
    println!("Length: {}", extract_field(header, LENGTH_OFFSET, LENGTH_MASK));
    println!("Flags: 0x{:02X}", extract_field(header, FLAGS_OFFSET, FLAGS_MASK));
}
```

### Compile-Time CRC Table Generation

```rust
// Generate CRC32 lookup table at compile time
const fn crc32_table() -> [u32; 256] {
    let mut table = [0u32; 256];
    let mut i = 0u32;

    while i < 256 {
        let mut crc = i;
        let mut j = 0;
        while j < 8 {
            if crc & 1 == 1 {
                crc = (crc >> 1) ^ 0xEDB88320;
            } else {
                crc >>= 1;
            }
            j += 1;
        }
        table[i as usize] = crc;
        i += 1;
    }

    table
}

const CRC32_TABLE: [u32; 256] = crc32_table();

fn crc32(data: &[u8]) -> u32 {
    let mut crc = 0xFFFFFFFF;
    for byte in data {
        let index = ((crc ^ (*byte as u32)) & 0xFF) as usize;
        crc = (crc >> 8) ^ CRC32_TABLE[index];
    }
    !crc
}

// Verify table at compile time
const _: () = {
    assert!(CRC32_TABLE[0] == 0x00000000);
    assert!(CRC32_TABLE[1] == 0x77073096);
    assert!(CRC32_TABLE[255] == 0x2D02EF8D);
};

fn main() {
    let data = b"Hello, World!";
    let checksum = crc32(data);
    println!("CRC32 of 'Hello, World!': 0x{:08X}", checksum);
}
```

### Type-Level State Machines

Use const generics to encode state machines at the type level:

```rust
// State markers as const values
const IDLE: u8 = 0;
const CONNECTING: u8 = 1;
const CONNECTED: u8 = 2;
const DISCONNECTING: u8 = 3;

struct Connection<const STATE: u8> {
    address: String,
}

impl Connection<IDLE> {
    fn new(address: String) -> Self {
        Connection { address }
    }

    fn connect(self) -> Connection<CONNECTING> {
        println!("Initiating connection to {}", self.address);
        Connection { address: self.address }
    }
}

impl Connection<CONNECTING> {
    fn on_connected(self) -> Connection<CONNECTED> {
        println!("Connected to {}", self.address);
        Connection { address: self.address }
    }

    fn on_error(self) -> Connection<IDLE> {
        println!("Connection failed, returning to idle");
        Connection { address: self.address }
    }
}

impl Connection<CONNECTED> {
    fn send(&self, data: &[u8]) {
        println!("Sending {} bytes to {}", data.len(), self.address);
    }

    fn disconnect(self) -> Connection<DISCONNECTING> {
        println!("Disconnecting from {}", self.address);
        Connection { address: self.address }
    }
}

impl Connection<DISCONNECTING> {
    fn on_disconnected(self) -> Connection<IDLE> {
        println!("Disconnected, returning to idle");
        Connection { address: self.address }
    }
}

fn main() {
    // The type system ensures correct state transitions
    let conn = Connection::<IDLE>::new("127.0.0.1:8080".to_string());
    let conn = conn.connect();
    let conn = conn.on_connected();
    conn.send(b"Hello!");
    let conn = conn.disconnect();
    let _conn = conn.on_disconnected();

    // This would not compile - can only send when connected:
    // let idle = Connection::<IDLE>::new("test".to_string());
    // idle.send(b"data"); // Error: method not found
}
```

## Summary

Compile-time computation in Rust provides several benefits:

| Technique | Use Case | Benefit |
|-----------|----------|---------|
| `const` | Simple values, array sizes | Zero runtime cost, inlined |
| `static` | Global state, fixed addresses | Single location, interior mutability |
| `const fn` | Computed values, lookup tables | Complex initialization at compile time |
| Const generics | Type-level programming | Type-safe abstractions |
| static_assertions | Compile-time checks | Early error detection |
| build.rs | External data, code generation | Unlimited computation power |

Start with `const` and `const fn` for simple cases. Use `static` when you need a fixed address or synchronization primitives. Reach for build scripts when you need file I/O, external crates, or computations that would hit const evaluation limits.

The key principle is moving work from runtime to compile time wherever possible. This catches errors earlier, improves performance, and makes your code more robust.
