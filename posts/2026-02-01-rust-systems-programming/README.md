# How to Use Rust for Systems Programming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Systems Programming, Low-Level, Memory, Performance

Description: A practical guide to using Rust for systems programming with low-level memory control and OS interactions.

---

Rust has carved out a unique position in the programming landscape. It delivers the low-level control that C and C++ programmers expect while providing memory safety guarantees that prevent entire classes of bugs. For systems programming - writing operating systems, device drivers, embedded firmware, or performance-critical infrastructure - Rust offers a compelling alternative to the traditional incumbents.

This guide walks through the practical aspects of systems programming in Rust. We will cover unsafe code, raw pointers, memory layout control, system calls, and interfacing with C libraries. By the end, you will have a solid foundation for building reliable systems-level software.

## Understanding Safe vs Unsafe Rust

Rust's safety guarantees come from its ownership system and borrow checker. These compile-time checks prevent data races, use-after-free bugs, and null pointer dereferences. However, systems programming sometimes requires operations that the compiler cannot verify as safe.

The `unsafe` keyword unlocks five capabilities that safe Rust prohibits:

1. Dereferencing raw pointers
2. Calling unsafe functions or methods
3. Accessing or modifying mutable static variables
4. Implementing unsafe traits
5. Accessing fields of unions

Here is a simple example showing the boundary between safe and unsafe code:

```rust
// Safe Rust - the compiler guarantees memory safety
fn safe_example() {
    let x = 42;
    let reference = &x;  // Borrowing is always safe
    println!("Value: {}", reference);
}

// Unsafe Rust - we take responsibility for safety
fn unsafe_example() {
    let x = 42;
    let raw_ptr = &x as *const i32;  // Creating raw pointer is safe
    
    // Dereferencing requires unsafe block because the compiler
    // cannot verify the pointer is valid at this point
    unsafe {
        println!("Value: {}", *raw_ptr);
    }
}
```

The key insight is that `unsafe` does not turn off the borrow checker or disable Rust's safety features. It simply allows specific operations that require manual verification. Your unsafe blocks should be small, well-documented, and wrapped in safe abstractions.

## Working with Raw Pointers

Raw pointers in Rust come in two flavors: `*const T` for immutable access and `*mut T` for mutable access. Unlike references, raw pointers can be null, can point to invalid memory, and do not have lifetime guarantees.

The following example demonstrates common raw pointer operations:

```rust
// Creating and manipulating raw pointers
fn raw_pointer_basics() {
    let mut value = 100;
    
    // Create immutable and mutable raw pointers
    let const_ptr: *const i32 = &value;
    let mut_ptr: *mut i32 = &mut value;
    
    unsafe {
        // Reading through an immutable pointer
        println!("Read value: {}", *const_ptr);
        
        // Writing through a mutable pointer
        *mut_ptr = 200;
        println!("Modified value: {}", *mut_ptr);
        
        // Pointer arithmetic - move to next i32 position
        // This would be invalid here but shows the syntax
        let next_ptr = mut_ptr.add(1);
        
        // Check if pointers are null before dereferencing
        if !mut_ptr.is_null() {
            println!("Pointer is valid");
        }
    }
}
```

When working with raw pointers from external sources, always validate them before use:

```rust
// Safe wrapper around raw pointer operations
pub fn process_buffer(ptr: *const u8, len: usize) -> Option<Vec<u8>> {
    // Validate inputs before entering unsafe code
    if ptr.is_null() {
        return None;
    }
    
    if len == 0 {
        return Some(Vec::new());
    }
    
    // Perform the unsafe operation with validated inputs
    unsafe {
        // Create a slice from the raw pointer
        // This is safe because we verified ptr is not null
        // and we trust the caller about the length
        let slice = std::slice::from_raw_parts(ptr, len);
        Some(slice.to_vec())
    }
}
```

## Controlling Memory Layout

Systems programming often requires precise control over how data is laid out in memory. Rust provides several attributes to control struct layout for interoperability with hardware registers, network protocols, or C libraries.

The `repr` attribute controls memory representation:

```rust
// Default Rust layout - compiler may reorder and pad fields
struct DefaultLayout {
    a: u8,
    b: u32,
    c: u8,
}

// C-compatible layout - fields in declaration order with C padding rules
// Use this when interfacing with C code or hardware
#[repr(C)]
struct CLayout {
    a: u8,      // offset 0
    // 3 bytes padding for alignment
    b: u32,     // offset 4
    c: u8,      // offset 8
    // 3 bytes padding to align struct size
}

// Packed layout - no padding between fields
// Useful for network protocols or file formats
#[repr(C, packed)]
struct PackedLayout {
    a: u8,      // offset 0
    b: u32,     // offset 1
    c: u8,      // offset 5
}

// Transparent layout - same representation as the single field
// Useful for newtype patterns in FFI
#[repr(transparent)]
struct Wrapper(u32);
```

You can inspect layout at compile time to verify your assumptions:

```rust
use std::mem::{size_of, align_of};

// Verify memory layout matches expectations
fn verify_layouts() {
    // Check sizes match what we expect for FFI
    assert_eq!(size_of::<CLayout>(), 12);
    assert_eq!(size_of::<PackedLayout>(), 6);
    
    // Check alignment requirements
    assert_eq!(align_of::<CLayout>(), 4);
    assert_eq!(align_of::<PackedLayout>(), 1);
    
    println!("Layout verification passed");
}
```

## Making System Calls

System calls are the interface between user programs and the operating system kernel. While Rust's standard library wraps most common operations, systems programming sometimes requires direct syscall access.

The `libc` crate provides raw bindings to C library functions, including syscall wrappers:

```rust
// Add to Cargo.toml: libc = "0.2"
use std::ffi::CString;

// Open a file using the POSIX open syscall
fn open_file_raw(path: &str) -> Result<i32, String> {
    // Convert Rust string to null-terminated C string
    let c_path = CString::new(path)
        .map_err(|_| "Invalid path: contains null byte")?;
    
    // Call the C open function
    // O_RDONLY = 0 means read-only access
    let fd = unsafe {
        libc::open(c_path.as_ptr(), libc::O_RDONLY)
    };
    
    // Check for errors - negative return means failure
    if fd < 0 {
        Err(format!("Failed to open file: {}", 
            std::io::Error::last_os_error()))
    } else {
        Ok(fd)
    }
}

// Read from a file descriptor
fn read_from_fd(fd: i32, buffer: &mut [u8]) -> Result<usize, String> {
    let bytes_read = unsafe {
        libc::read(
            fd,
            buffer.as_mut_ptr() as *mut libc::c_void,
            buffer.len()
        )
    };
    
    if bytes_read < 0 {
        Err(format!("Read failed: {}", 
            std::io::Error::last_os_error()))
    } else {
        Ok(bytes_read as usize)
    }
}

// Always close file descriptors to avoid resource leaks
fn close_fd(fd: i32) {
    unsafe {
        libc::close(fd);
    }
}
```

For Linux-specific syscalls not available through libc, you can use the `syscall` function directly:

```rust
// Direct syscall example - get thread ID on Linux
#[cfg(target_os = "linux")]
fn get_thread_id() -> i64 {
    // SYS_gettid is the syscall number for gettid
    unsafe {
        libc::syscall(libc::SYS_gettid)
    }
}
```

## Interfacing with C Libraries

Most systems programming involves working with existing C libraries. Rust's FFI (Foreign Function Interface) makes this straightforward but requires careful attention to safety.

Here is a pattern for wrapping a C library safely:

```rust
// Declare external C functions
// These bindings tell Rust about the C function signatures
extern "C" {
    fn some_c_function(input: *const u8, len: usize) -> i32;
    fn allocate_resource() -> *mut Resource;
    fn free_resource(ptr: *mut Resource);
}

// Opaque type representing a C struct we do not need to inspect
#[repr(C)]
struct Resource {
    _private: [u8; 0],
}

// Safe wrapper that manages the lifecycle
pub struct SafeResource {
    ptr: *mut Resource,
}

impl SafeResource {
    pub fn new() -> Option<Self> {
        let ptr = unsafe { allocate_resource() };
        
        // Return None if allocation failed
        if ptr.is_null() {
            None
        } else {
            Some(SafeResource { ptr })
        }
    }
    
    pub fn do_something(&self, data: &[u8]) -> Result<(), i32> {
        let result = unsafe {
            some_c_function(data.as_ptr(), data.len())
        };
        
        if result == 0 {
            Ok(())
        } else {
            Err(result)
        }
    }
}

// Implement Drop to ensure resources are always freed
impl Drop for SafeResource {
    fn drop(&mut self) {
        if !self.ptr.is_null() {
            unsafe {
                free_resource(self.ptr);
            }
        }
    }
}
```

The `bindgen` tool can automatically generate Rust bindings from C header files, which saves time and reduces errors for large libraries.

## Embedded and No-Std Programming

Embedded systems often lack a full operating system, meaning no heap allocator and no standard library. Rust supports this through the `no_std` attribute.

A minimal no_std program looks like this:

```rust
// Disable the standard library
#![no_std]
#![no_main]

use core::panic::PanicInfo;

// Define what happens on panic since we have no runtime
#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    // In a real embedded system, you might blink an LED
    // or write to a debug UART
    loop {}
}

// Entry point - name depends on your target
#[no_mangle]
pub extern "C" fn _start() -> ! {
    // Your embedded code here
    // No heap allocation, no threads, no filesystem
    
    loop {
        // Main loop
    }
}
```

For embedded development, you typically interact directly with memory-mapped hardware registers:

```rust
// Hardware register access pattern
// Assume a GPIO peripheral at address 0x4000_0000

const GPIO_BASE: usize = 0x4000_0000;
const GPIO_OUTPUT_OFFSET: usize = 0x04;
const GPIO_DIRECTION_OFFSET: usize = 0x08;

// Write to a hardware register
fn write_register(base: usize, offset: usize, value: u32) {
    let addr = (base + offset) as *mut u32;
    unsafe {
        // Use write_volatile to prevent compiler optimization
        // that might skip or reorder the write
        core::ptr::write_volatile(addr, value);
    }
}

// Read from a hardware register
fn read_register(base: usize, offset: usize) -> u32 {
    let addr = (base + offset) as *const u32;
    unsafe {
        // read_volatile ensures the read actually happens
        core::ptr::read_volatile(addr)
    }
}

// Set GPIO pin 5 as output and drive it high
fn set_pin_high() {
    // Configure pin 5 as output (bit 5 = 1)
    write_register(GPIO_BASE, GPIO_DIRECTION_OFFSET, 1 << 5);
    
    // Set pin 5 high
    write_register(GPIO_BASE, GPIO_OUTPUT_OFFSET, 1 << 5);
}
```

The `embedded-hal` crate provides traits that abstract over different microcontroller families, making code more portable.

## When to Use Unsafe

The decision to use unsafe code should be deliberate. Here are legitimate reasons:

**Performance-critical hot paths** - Sometimes safe abstractions add overhead. After profiling shows a bottleneck, unsafe code can eliminate bounds checks or use SIMD intrinsics.

**FFI boundaries** - Calling C libraries or exposing Rust functions to C requires unsafe code. Wrap these in safe abstractions.

**Hardware access** - Memory-mapped I/O, DMA buffers, and interrupt handlers need raw pointer manipulation.

**Data structures with complex ownership** - Self-referential structs, intrusive linked lists, and lock-free data structures sometimes cannot express their invariants to the borrow checker.

Here is a checklist before writing unsafe code:

```rust
// Before writing unsafe code, ask yourself:

// 1. Can this be done safely?
//    Often there is a safe alternative you have not considered.

// 2. What invariants must hold?
//    Document preconditions and postconditions clearly.

// 3. What could go wrong?
//    List potential undefined behaviors and how you prevent them.

// 4. Is this the minimal unsafe surface?
//    Keep unsafe blocks as small as possible.

// Example of well-documented unsafe code
/// Converts a byte slice to a string without UTF-8 validation.
/// 
/// # Safety
/// 
/// The caller must ensure that the bytes are valid UTF-8.
/// Passing invalid UTF-8 causes undefined behavior.
pub unsafe fn bytes_to_str_unchecked(bytes: &[u8]) -> &str {
    // SAFETY: Caller guarantees bytes are valid UTF-8
    std::str::from_utf8_unchecked(bytes)
}
```

## Tools for Unsafe Rust

Several tools help verify unsafe code:

**Miri** - An interpreter that detects undefined behavior in unsafe code. Run with `cargo +nightly miri test`.

**AddressSanitizer** - Catches memory errors at runtime. Enable with `RUSTFLAGS="-Z sanitizer=address"`.

**Clippy** - The linter has specific lints for unsafe code patterns. Use `#![deny(unsafe_op_in_unsafe_fn)]` to require explicit unsafe blocks even inside unsafe functions.

## Wrapping Up

Systems programming in Rust requires understanding when and how to step outside the language's safety guarantees. The key is treating unsafe code as a tool for building safe abstractions, not as an escape hatch from Rust's rules.

Start with safe Rust. Profile your code. When you need unsafe, document your invariants, minimize the unsafe surface area, and wrap everything in safe APIs. This approach gives you C-level control with Rust-level reliability.

The ecosystem continues to mature with crates like `libc`, `nix`, `embedded-hal`, and platform-specific bindings. Combined with Rust's zero-cost abstractions and strong type system, systems programming in Rust is both practical and productive.

---

*Monitor systems-level Rust applications with [OneUptime](https://oneuptime.com) - deep performance insights.*
