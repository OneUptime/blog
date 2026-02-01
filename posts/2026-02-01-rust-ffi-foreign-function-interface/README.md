# How to Implement FFI (Foreign Function Interface) in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, FFI, C, Interoperability, bindgen, cbindgen

Description: A practical guide to implementing FFI in Rust to call C libraries and expose Rust functions to C code.

---

Rust is fantastic for systems programming, but the reality is that decades of battle-tested C libraries already exist. Whether you need to integrate with OpenSSL, SQLite, or a proprietary hardware driver, FFI (Foreign Function Interface) lets you bridge the gap between Rust and C code. This guide walks through both directions - calling C from Rust and exposing Rust functions to C.

## What is FFI and Why Does It Matter?

FFI allows code written in one language to call functions written in another. In Rust's case, FFI primarily means interoperating with C, since C's ABI (Application Binary Interface) is the lingua franca of systems programming. Almost every operating system, database, and low-level library exposes a C interface.

The trade-off is clear: you get access to existing codebases without rewriting everything, but you lose some of Rust's safety guarantees at the boundary. Understanding how to minimize that unsafe surface area is what separates good FFI code from dangerous FFI code.

## Calling C Functions from Rust

Let's start with the most common scenario - calling into an existing C library.

### The `extern "C"` Block

The foundation of Rust FFI is the `extern` block. This tells the compiler that certain functions are defined elsewhere and follow C calling conventions.

Here's a minimal example that calls the standard C library's `strlen` function:

```rust
// We use extern "C" to declare functions that follow C's calling convention.
// The function signatures must match the C declarations exactly.
extern "C" {
    fn strlen(s: *const std::os::raw::c_char) -> usize;
}

fn main() {
    // CString handles null-termination for us - C strings require a trailing \0
    let rust_string = std::ffi::CString::new("Hello, FFI!").unwrap();
    
    // We must use unsafe because the compiler cannot verify the C function's behavior
    let length = unsafe { strlen(rust_string.as_ptr()) };
    
    println!("String length: {}", length);
}
```

A few things to note here. First, `extern "C"` specifies the C ABI. Without it, Rust uses its own unstable ABI. Second, we use raw pointers (`*const c_char`) because C doesn't understand Rust's references. Third, all FFI calls are `unsafe` - Rust cannot guarantee what happens inside foreign code.

### Using the `libc` Crate

Manually declaring every C function is tedious and error-prone. The `libc` crate provides bindings to standard C library functions across platforms.

Add it to your `Cargo.toml`:

```toml
[dependencies]
libc = "0.2"
```

Now you can use C functions directly without manual declarations:

```rust
// The libc crate provides cross-platform bindings to standard C library functions.
// This is much safer than manual extern declarations since types are verified.
use libc::{c_char, c_int, printf};
use std::ffi::CString;

fn main() {
    let format = CString::new("The answer is %d\n").unwrap();
    let value: c_int = 42;
    
    // printf is variadic in C, so we need to be careful with argument types
    unsafe {
        printf(format.as_ptr(), value);
    }
}
```

The `libc` crate handles platform differences for you. Types like `c_int` map to the correct native integer size on each platform, which isn't always 32 bits.

## Generating Bindings with `bindgen`

Real C libraries have hundreds of functions and complex types. Writing bindings by hand is impractical. That's where `bindgen` comes in - it automatically generates Rust FFI declarations from C header files.

### Setting Up bindgen

First, install the tool:

```bash
cargo install bindgen-cli
```

Or use it as a build dependency for automatic generation:

```toml
[build-dependencies]
bindgen = "0.69"
```

### Example: Binding to a C Library

Let's say we have a simple C header file `math_ops.h`:

```c
// math_ops.h - A simple C library for demonstration
#ifndef MATH_OPS_H
#define MATH_OPS_H

typedef struct {
    double x;
    double y;
} Point;

// Calculate distance between two points
double point_distance(const Point* a, const Point* b);

// Add two integers with overflow checking, returns -1 on overflow
int safe_add(int a, int b, int* result);

#endif
```

Create a `build.rs` file to generate bindings at compile time:

```rust
// build.rs - This runs before your crate is compiled.
// It generates Rust bindings from C headers automatically.
use std::env;
use std::path::PathBuf;

fn main() {
    // Tell cargo to re-run this script if the header changes
    println!("cargo:rerun-if-changed=math_ops.h");
    
    // Tell the linker where to find the compiled C library
    println!("cargo:rustc-link-lib=math_ops");
    
    let bindings = bindgen::Builder::default()
        // Point to the C header file
        .header("math_ops.h")
        // Generate Rust doc comments from C comments
        .generate_comments(true)
        // Derive common traits for generated structs
        .derive_debug(true)
        .derive_default(true)
        .generate()
        .expect("Unable to generate bindings");
    
    // Write bindings to the $OUT_DIR directory
    let out_path = PathBuf::from(env::var("OUT_DIR").unwrap());
    bindings
        .write_to_file(out_path.join("bindings.rs"))
        .expect("Couldn't write bindings!");
}
```

Then include the generated bindings in your code:

```rust
// Include the auto-generated bindings from build.rs
// This macro expands to the contents of the generated file
include!(concat!(env!("OUT_DIR"), "/bindings.rs"));

fn main() {
    let p1 = Point { x: 0.0, y: 0.0 };
    let p2 = Point { x: 3.0, y: 4.0 };
    
    // Even with generated bindings, FFI calls remain unsafe
    let distance = unsafe { point_distance(&p1, &p2) };
    
    println!("Distance: {}", distance); // Should print 5.0
}
```

Bindgen handles complex scenarios like nested structs, enums, unions, and function pointers. It saves hours of manual work and reduces the chance of type mismatches.

## Exposing Rust Functions to C

Sometimes you want the reverse - making Rust code callable from C. This is useful when writing Rust libraries that need to integrate with existing C/C++ projects.

### The `#[no_mangle]` Attribute

Rust mangles function names by default for namespacing. To expose a function with its original name, use `#[no_mangle]`:

```rust
// The no_mangle attribute prevents Rust from changing the function name.
// extern "C" ensures the function uses C calling conventions.
// Together, they make this function callable from C code.
#[no_mangle]
pub extern "C" fn rust_multiply(a: i32, b: i32) -> i32 {
    a * b
}

// For functions that might fail, return a status code instead of panicking.
// Panicking across FFI boundaries is undefined behavior!
#[no_mangle]
pub extern "C" fn rust_divide(a: i32, b: i32, result: *mut i32) -> i32 {
    if b == 0 {
        return -1; // Error code for division by zero
    }
    
    // We must check that the pointer is valid before dereferencing
    if result.is_null() {
        return -2; // Error code for null pointer
    }
    
    unsafe {
        *result = a / b;
    }
    0 // Success
}
```

### Generating C Headers with cbindgen

Just as `bindgen` creates Rust bindings from C headers, `cbindgen` does the opposite - it generates C headers from your Rust code.

Install it:

```bash
cargo install cbindgen
```

Create a `cbindgen.toml` configuration file:

```toml
# cbindgen.toml - Configuration for C header generation
language = "C"
include_guard = "MY_RUST_LIB_H"
autogen_warning = "/* Warning: this file is auto-generated by cbindgen. Do not modify. */"

[export]
include = ["rust_multiply", "rust_divide", "RustPoint"]
```

Then generate the header:

```bash
cbindgen --config cbindgen.toml --output my_rust_lib.h
```

This produces a clean C header file that other developers can include in their C/C++ projects without knowing anything about Rust.

## Memory Safety at the FFI Boundary

FFI is where Rust's safety guarantees meet the Wild West. Here are the critical rules to follow.

### Rule 1: Never Panic Across FFI

Panicking in Rust code called from C is undefined behavior. Always catch potential panics:

```rust
// Use catch_unwind to prevent panics from crossing the FFI boundary.
// This converts panics into error codes that C can handle.
use std::panic::catch_unwind;

#[no_mangle]
pub extern "C" fn safe_operation(input: i32) -> i32 {
    let result = catch_unwind(|| {
        // Your code that might panic goes here
        if input < 0 {
            panic!("Negative input not allowed");
        }
        input * 2
    });
    
    match result {
        Ok(value) => value,
        Err(_) => -1, // Return error code instead of panicking
    }
}
```

### Rule 2: Manage Ownership Explicitly

C has no concept of Rust's ownership system. When passing data across the boundary, be explicit about who owns what:

```rust
// When Rust allocates memory that C will use, we need to prevent Rust
// from freeing it. Box::into_raw transfers ownership to the caller.
#[no_mangle]
pub extern "C" fn create_buffer(size: usize) -> *mut u8 {
    let buffer: Vec<u8> = vec![0; size];
    let boxed = buffer.into_boxed_slice();
    Box::into_raw(boxed) as *mut u8
}

// The caller must eventually return the memory so Rust can free it.
// Forgetting to call this function causes a memory leak.
#[no_mangle]
pub extern "C" fn free_buffer(ptr: *mut u8, size: usize) {
    if ptr.is_null() {
        return;
    }
    unsafe {
        // Reconstruct the Box so Rust's drop will free the memory
        let slice = std::slice::from_raw_parts_mut(ptr, size);
        let _ = Box::from_raw(slice);
    }
}
```

### Rule 3: Validate All Input Pointers

C code can pass invalid pointers. Always check before dereferencing:

```rust
// Never trust pointers from C code. Validate everything.
#[no_mangle]
pub extern "C" fn process_data(data: *const u8, len: usize) -> i32 {
    // Check for null pointer
    if data.is_null() {
        return -1;
    }
    
    // Check for reasonable length (prevent overflow attacks)
    if len > 1024 * 1024 * 100 {
        return -2; // Reject suspiciously large inputs
    }
    
    let slice = unsafe { std::slice::from_raw_parts(data, len) };
    
    // Now we can safely work with the slice
    slice.iter().map(|&b| b as i32).sum()
}
```

## Practical Tips from Production Use

After shipping FFI code in production, here's what actually matters:

**Test at the boundary.** Write tests that exercise the exact FFI interface, not just the Rust implementation. Memory bugs often hide in the marshaling code.

**Use integration tests with the actual C compiler.** Different compilers have different interpretations of the C standard. What works with gcc might fail with MSVC.

**Document ownership transfer explicitly.** In header files and documentation, clearly state which functions allocate memory and which functions must be called to free it.

**Consider using repr(C) for all FFI structs.** Rust's default struct layout is unspecified. Adding `#[repr(C)]` guarantees C-compatible memory layout:

```rust
// repr(C) ensures this struct has the same memory layout as the equivalent C struct.
// Without it, Rust might reorder or pad fields differently.
#[repr(C)]
pub struct Config {
    pub timeout_ms: u32,
    pub max_retries: u8,
    pub enabled: bool,
}
```

**Profile the FFI overhead.** Each FFI call has a cost - the compiler can't inline across the boundary. For tight loops, batch operations to reduce crossing frequency.

## Wrapping Up

FFI in Rust is a balancing act. You gain access to decades of existing C code, but you take on responsibility for safety at the boundary. The tools available - `bindgen` for generating Rust bindings, `cbindgen` for generating C headers, and the `libc` crate for standard library access - make this manageable.

The key is treating the FFI boundary as a trust boundary. Everything coming from C is suspect until validated. Everything going to C must be in C-compatible form. Keep the unsafe surface area small, wrap it in safe Rust APIs, and test thoroughly.

Start small - pick one C function you need, write the binding manually to understand the mechanics, then scale up with automated tools. The investment pays off when you can combine Rust's safety with C's ecosystem.

---

*Monitor Rust applications with C dependencies using [OneUptime](https://oneuptime.com) - track performance across language boundaries.*
