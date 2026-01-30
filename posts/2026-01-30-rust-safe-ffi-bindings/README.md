# How to Create Safe FFI Bindings in Rust

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Rust, FFI, C, Interoperability

Description: Build safe Rust wrappers around C libraries using FFI with proper memory management, error handling, and idiomatic Rust APIs.

---

## Introduction

Rust excels at systems programming, but sometimes you need to call into existing C libraries. The Foreign Function Interface (FFI) lets you do exactly that. However, crossing the language boundary introduces unsafe code that can undermine Rust's safety guarantees if not handled properly.

This guide walks through building safe FFI bindings from the ground up. You will learn how to wrap C functions in safe Rust APIs, manage memory correctly, handle errors across the FFI boundary, and automate binding generation with bindgen.

## Understanding extern "C" Basics

The `extern "C"` block tells Rust to use the C calling convention. This is essential because different languages pass arguments and return values differently.

Here is a simple example calling the C standard library's `abs` function:

```rust
// Declare the external C function
// The extern block tells Rust this function is defined elsewhere
extern "C" {
    fn abs(input: i32) -> i32;
}

fn main() {
    // Calling FFI functions is always unsafe because Rust cannot
    // verify the correctness of the foreign code
    let result = unsafe { abs(-5) };
    println!("Absolute value: {}", result);
}
```

The `unsafe` block is required because Rust cannot verify that:
- The function signature matches the actual C function
- The C code does not cause undefined behavior
- Memory is handled correctly

### Common C Types and Their Rust Equivalents

When writing FFI bindings, you need to use the correct type mappings. The `std::os::raw` module provides C-compatible types.

| C Type | Rust Type | Notes |
|--------|-----------|-------|
| `int` | `c_int` | Usually 32 bits, but platform-dependent |
| `unsigned int` | `c_uint` | Unsigned variant |
| `long` | `c_long` | 32 or 64 bits depending on platform |
| `char` | `c_char` | Signed or unsigned depending on platform |
| `char*` | `*const c_char` or `*mut c_char` | Null-terminated string pointer |
| `void*` | `*mut c_void` | Generic pointer |
| `size_t` | `usize` | Pointer-sized unsigned integer |
| `bool` | `bool` | Rust bool is compatible with C99 _Bool |

Here is how to use these types:

```rust
use std::os::raw::{c_char, c_int, c_void};

extern "C" {
    // strlen takes a const char pointer and returns size_t
    fn strlen(s: *const c_char) -> usize;

    // malloc takes size_t and returns void pointer
    fn malloc(size: usize) -> *mut c_void;

    // free takes void pointer and returns nothing
    fn free(ptr: *mut c_void);
}
```

## Using bindgen for Automatic Binding Generation

Writing FFI declarations by hand is tedious and error-prone. The bindgen tool generates Rust bindings from C header files automatically.

### Setting Up bindgen

Add bindgen to your build dependencies in `Cargo.toml`:

```toml
[build-dependencies]
bindgen = "0.69"

[dependencies]
libc = "0.2"
```

### Creating a build.rs File

The build script runs before compilation and generates bindings:

```rust
// build.rs
use std::env;
use std::path::PathBuf;

fn main() {
    // Tell cargo to link against the target library
    // For a library named "mylib", this looks for libmylib.so or mylib.lib
    println!("cargo:rustc-link-lib=mylib");

    // Tell cargo where to find the library
    // Adjust this path to match your library location
    println!("cargo:rustc-link-search=/usr/local/lib");

    // Tell cargo to rerun build.rs if the header changes
    println!("cargo:rerun-if-changed=wrapper.h");

    // Generate bindings using bindgen
    let bindings = bindgen::Builder::default()
        // The header file to generate bindings for
        .header("wrapper.h")
        // Tell bindgen which types to generate
        .allowlist_function("mylib_.*")
        .allowlist_type("MyLib.*")
        // Generate implementations for common traits
        .derive_debug(true)
        .derive_default(true)
        // Finish the builder and generate bindings
        .generate()
        .expect("Unable to generate bindings");

    // Write bindings to the $OUT_DIR/bindings.rs file
    let out_path = PathBuf::from(env::var("OUT_DIR").unwrap());
    bindings
        .write_to_file(out_path.join("bindings.rs"))
        .expect("Couldn't write bindings");
}
```

### Using Generated Bindings

Include the generated bindings in your library:

```rust
// src/lib.rs

// Include the generated bindings
// The include! macro pastes the file contents at this location
#![allow(non_upper_case_globals)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]

include!(concat!(env!("OUT_DIR"), "/bindings.rs"));
```

### Example wrapper.h

The wrapper header includes the C library headers you want to bind:

```c
// wrapper.h
// This file includes all the C headers we want bindings for

#include <mylib/mylib.h>
#include <mylib/config.h>
```

## Wrapping Raw Pointers Safely

Raw pointers from C need careful handling. The standard approach is to wrap them in a Rust struct that enforces safety invariants.

### A Complete Example: Wrapping a C Database Library

Let us build a safe wrapper around a hypothetical C database library:

```rust
use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int, c_void};
use std::ptr;

// Raw FFI declarations - these match the C library's interface
mod ffi {
    use super::*;

    // Opaque type representing a database connection
    // We never access its fields, just pass around pointers
    #[repr(C)]
    pub struct DbConnection {
        _private: [u8; 0],
    }

    // Opaque type for query results
    #[repr(C)]
    pub struct DbResult {
        _private: [u8; 0],
    }

    extern "C" {
        // Opens a database connection
        // Returns null on failure
        pub fn db_open(path: *const c_char) -> *mut DbConnection;

        // Closes a database connection
        pub fn db_close(conn: *mut DbConnection);

        // Executes a query and returns results
        // Returns null on failure
        pub fn db_query(
            conn: *mut DbConnection,
            sql: *const c_char,
        ) -> *mut DbResult;

        // Frees query results
        pub fn db_result_free(result: *mut DbResult);

        // Gets a string value from results
        // Returns null if no value at that position
        pub fn db_result_get_string(
            result: *mut DbResult,
            row: c_int,
            col: c_int,
        ) -> *const c_char;

        // Gets the row count
        pub fn db_result_row_count(result: *mut DbResult) -> c_int;

        // Gets the last error message
        // Returns null if no error
        pub fn db_get_error() -> *const c_char;
    }
}

// Safe wrapper types start here

/// A database connection handle
///
/// This type owns the connection and will close it when dropped.
/// The connection cannot be cloned or copied to prevent double-free bugs.
pub struct Connection {
    ptr: *mut ffi::DbConnection,
}

// Connection can be sent between threads if the C library is thread-safe
// Remove these if the C library is not thread-safe
unsafe impl Send for Connection {}
unsafe impl Sync for Connection {}

impl Connection {
    /// Opens a connection to the database at the given path
    ///
    /// Returns an error if the connection fails
    pub fn open(path: &str) -> Result<Self, DbError> {
        // Convert Rust string to C string
        let c_path = CString::new(path)
            .map_err(|_| DbError::InvalidPath)?;

        // Call the C function
        let ptr = unsafe { ffi::db_open(c_path.as_ptr()) };

        // Check for null pointer indicating failure
        if ptr.is_null() {
            return Err(DbError::from_last_error());
        }

        Ok(Connection { ptr })
    }

    /// Executes a query and returns the results
    pub fn query(&mut self, sql: &str) -> Result<QueryResult, DbError> {
        let c_sql = CString::new(sql)
            .map_err(|_| DbError::InvalidQuery)?;

        let result_ptr = unsafe {
            ffi::db_query(self.ptr, c_sql.as_ptr())
        };

        if result_ptr.is_null() {
            return Err(DbError::from_last_error());
        }

        Ok(QueryResult { ptr: result_ptr })
    }
}

impl Drop for Connection {
    fn drop(&mut self) {
        // Safety: we own the pointer and it was valid when created
        // The C library handles null checks internally
        unsafe {
            ffi::db_close(self.ptr);
        }
    }
}

/// Query results handle
///
/// This type owns the result set and will free it when dropped.
pub struct QueryResult {
    ptr: *mut ffi::DbResult,
}

impl QueryResult {
    /// Returns the number of rows in the result
    pub fn row_count(&self) -> usize {
        let count = unsafe { ffi::db_result_row_count(self.ptr) };
        count as usize
    }

    /// Gets a string value at the given row and column
    ///
    /// Returns None if the value is null or out of bounds
    pub fn get_string(&self, row: usize, col: usize) -> Option<String> {
        let ptr = unsafe {
            ffi::db_result_get_string(
                self.ptr,
                row as c_int,
                col as c_int,
            )
        };

        if ptr.is_null() {
            return None;
        }

        // Convert C string to Rust String
        // Safety: we trust the C library to return valid UTF-8
        // In practice you might want lossy conversion
        let c_str = unsafe { CStr::from_ptr(ptr) };
        c_str.to_str().ok().map(|s| s.to_owned())
    }
}

impl Drop for QueryResult {
    fn drop(&mut self) {
        unsafe {
            ffi::db_result_free(self.ptr);
        }
    }
}
```

## Implementing Drop for Resource Cleanup

The `Drop` trait ensures resources are freed when Rust values go out of scope. This is critical for FFI because forgetting to free C resources causes memory leaks.

### Drop Implementation Patterns

Here are common patterns for implementing Drop:

```rust
use std::ptr;

// Pattern 1: Simple pointer cleanup
pub struct SimpleHandle {
    ptr: *mut c_void,
}

impl Drop for SimpleHandle {
    fn drop(&mut self) {
        if !self.ptr.is_null() {
            unsafe { free_handle(self.ptr); }
        }
    }
}

// Pattern 2: Handle with optional cleanup function
pub struct ConfigurableHandle {
    ptr: *mut c_void,
    // Some C APIs have different cleanup functions for different states
    needs_full_cleanup: bool,
}

impl Drop for ConfigurableHandle {
    fn drop(&mut self) {
        unsafe {
            if self.needs_full_cleanup {
                full_cleanup(self.ptr);
            } else {
                quick_cleanup(self.ptr);
            }
        }
    }
}

// Pattern 3: Handle that might be moved out of
pub struct MovableHandle {
    // Option allows us to take ownership without dropping
    ptr: Option<*mut c_void>,
}

impl MovableHandle {
    /// Takes ownership of the raw pointer
    ///
    /// After calling this, the handle will not free the resource on drop.
    /// The caller becomes responsible for freeing it.
    pub fn into_raw(mut self) -> *mut c_void {
        self.ptr.take().unwrap()
    }
}

impl Drop for MovableHandle {
    fn drop(&mut self) {
        if let Some(ptr) = self.ptr {
            unsafe { free_handle(ptr); }
        }
    }
}
```

### Preventing Double-Free with ManuallyDrop

Sometimes you need to transfer ownership to C code:

```rust
use std::mem::ManuallyDrop;

pub struct TransferableBuffer {
    data: Vec<u8>,
}

impl TransferableBuffer {
    /// Transfers ownership of the buffer to C code
    ///
    /// Returns a pointer and length. The C code becomes responsible
    /// for calling our free function.
    pub fn into_raw_parts(self) -> (*mut u8, usize) {
        let mut me = ManuallyDrop::new(self);
        let ptr = me.data.as_mut_ptr();
        let len = me.data.len();

        // Prevent Vec from being dropped
        // The C code now owns this memory
        std::mem::forget(std::mem::take(&mut me.data));

        (ptr, len)
    }

    /// Reconstructs a buffer from raw parts
    ///
    /// Safety: ptr must have come from into_raw_parts and not been freed
    pub unsafe fn from_raw_parts(ptr: *mut u8, len: usize, cap: usize) -> Self {
        TransferableBuffer {
            data: Vec::from_raw_parts(ptr, len, cap),
        }
    }
}
```

## Converting C Strings Safely

String conversion is one of the trickiest parts of FFI. C strings are null-terminated, while Rust strings are length-prefixed and must be valid UTF-8.

### C String Types Comparison

| Type | Owned/Borrowed | Null-terminated | Notes |
|------|----------------|-----------------|-------|
| `CString` | Owned | Yes | Use for passing strings to C |
| `CStr` | Borrowed | Yes | Use for reading strings from C |
| `String` | Owned | No | Standard Rust string |
| `&str` | Borrowed | No | Standard Rust string slice |

### String Conversion Functions

```rust
use std::ffi::{CStr, CString};
use std::os::raw::c_char;

/// Converts a Rust string to a C string for passing to C functions
///
/// Fails if the string contains null bytes
fn rust_to_c(s: &str) -> Result<CString, std::ffi::NulError> {
    CString::new(s)
}

/// Converts a C string pointer to a Rust string
///
/// Returns an error if the string is not valid UTF-8
unsafe fn c_to_rust(ptr: *const c_char) -> Result<String, std::str::Utf8Error> {
    let c_str = CStr::from_ptr(ptr);
    c_str.to_str().map(|s| s.to_owned())
}

/// Converts a C string pointer to a Rust string, replacing invalid UTF-8
///
/// This is useful when you cannot guarantee the C library returns valid UTF-8
unsafe fn c_to_rust_lossy(ptr: *const c_char) -> String {
    let c_str = CStr::from_ptr(ptr);
    c_str.to_string_lossy().into_owned()
}

/// Safely converts a possibly-null C string pointer
///
/// Returns None if the pointer is null
unsafe fn c_to_rust_optional(ptr: *const c_char) -> Option<String> {
    if ptr.is_null() {
        None
    } else {
        Some(c_to_rust_lossy(ptr))
    }
}
```

### Handling String Ownership

C libraries have different ownership semantics for returned strings:

```rust
use std::ffi::CStr;
use std::os::raw::c_char;

extern "C" {
    // Returns a pointer to internal storage - do not free
    fn get_version() -> *const c_char;

    // Returns newly allocated string - caller must free
    fn get_message() -> *mut c_char;

    // Frees a string allocated by the library
    fn free_string(s: *mut c_char);
}

/// Gets the library version string
///
/// The string is borrowed from the library and must not be freed.
pub fn version() -> &'static str {
    unsafe {
        let ptr = get_version();
        // This is safe because the C library guarantees the pointer
        // remains valid for the lifetime of the program
        CStr::from_ptr(ptr)
            .to_str()
            .expect("version string is not valid UTF-8")
    }
}

/// Gets a message from the library
///
/// This creates an owned String because the C library allocates
/// new memory that we must eventually free.
pub fn message() -> Result<String, std::str::Utf8Error> {
    unsafe {
        let ptr = get_message();
        if ptr.is_null() {
            return Ok(String::new());
        }

        // Copy the string before freeing
        let result = CStr::from_ptr(ptr).to_str().map(|s| s.to_owned());

        // Free the C-allocated memory
        free_string(ptr);

        result
    }
}
```

## Error Handling Across the FFI Boundary

C libraries report errors in various ways: return codes, errno, error strings, or output parameters. Your safe wrapper should convert these to idiomatic Rust errors.

### Defining Error Types

```rust
use std::ffi::CStr;
use std::fmt;
use std::os::raw::c_char;

extern "C" {
    fn get_last_error_code() -> i32;
    fn get_last_error_message() -> *const c_char;
}

/// Error codes returned by the C library
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(i32)]
pub enum ErrorCode {
    Success = 0,
    InvalidArgument = 1,
    OutOfMemory = 2,
    IoError = 3,
    NotFound = 4,
    PermissionDenied = 5,
    Unknown = -1,
}

impl From<i32> for ErrorCode {
    fn from(code: i32) -> Self {
        match code {
            0 => ErrorCode::Success,
            1 => ErrorCode::InvalidArgument,
            2 => ErrorCode::OutOfMemory,
            3 => ErrorCode::IoError,
            4 => ErrorCode::NotFound,
            5 => ErrorCode::PermissionDenied,
            _ => ErrorCode::Unknown,
        }
    }
}

/// Error type for library operations
#[derive(Debug)]
pub struct LibError {
    code: ErrorCode,
    message: String,
}

impl LibError {
    /// Creates an error from the library's thread-local error state
    pub fn from_last_error() -> Self {
        unsafe {
            let code = ErrorCode::from(get_last_error_code());
            let msg_ptr = get_last_error_message();

            let message = if msg_ptr.is_null() {
                format!("Error code: {:?}", code)
            } else {
                CStr::from_ptr(msg_ptr)
                    .to_string_lossy()
                    .into_owned()
            };

            LibError { code, message }
        }
    }

    /// Returns the error code
    pub fn code(&self) -> ErrorCode {
        self.code
    }
}

impl fmt::Display for LibError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for LibError {}
```

### Converting C Error Patterns

Different C libraries use different error conventions:

```rust
use std::io;
use std::os::raw::c_int;

// Pattern 1: Return code with errno
extern "C" {
    fn c_read(fd: c_int, buf: *mut u8, count: usize) -> isize;
}

pub fn read_data(fd: i32, buf: &mut [u8]) -> io::Result<usize> {
    let result = unsafe {
        c_read(fd, buf.as_mut_ptr(), buf.len())
    };

    if result < 0 {
        // errno is set on failure
        Err(io::Error::last_os_error())
    } else {
        Ok(result as usize)
    }
}

// Pattern 2: Boolean return with error output parameter
extern "C" {
    fn c_operation(
        input: c_int,
        output: *mut c_int,
        error: *mut *const c_char,
    ) -> bool;
}

pub fn operation(input: i32) -> Result<i32, String> {
    let mut output: c_int = 0;
    let mut error: *const c_char = std::ptr::null();

    let success = unsafe {
        c_operation(input, &mut output, &mut error)
    };

    if success {
        Ok(output)
    } else if !error.is_null() {
        unsafe {
            let msg = CStr::from_ptr(error)
                .to_string_lossy()
                .into_owned();
            Err(msg)
        }
    } else {
        Err("Unknown error".to_string())
    }
}

// Pattern 3: Return null on failure
extern "C" {
    fn c_create_resource() -> *mut c_void;
}

pub fn create_resource() -> Result<ResourceHandle, LibError> {
    let ptr = unsafe { c_create_resource() };

    if ptr.is_null() {
        Err(LibError::from_last_error())
    } else {
        Ok(ResourceHandle { ptr })
    }
}
```

## Build Configuration with build.rs

The `build.rs` script handles library discovery, linking, and code generation.

### Complete build.rs Example

```rust
// build.rs
use std::env;
use std::path::PathBuf;

fn main() {
    // Get the target operating system
    let target_os = env::var("CARGO_CFG_TARGET_OS").unwrap();

    // Platform-specific library paths
    let lib_path = match target_os.as_str() {
        "macos" => "/opt/homebrew/lib",
        "linux" => "/usr/lib/x86_64-linux-gnu",
        "windows" => "C:\\Libraries\\mylib\\lib",
        _ => panic!("Unsupported OS: {}", target_os),
    };

    let include_path = match target_os.as_str() {
        "macos" => "/opt/homebrew/include",
        "linux" => "/usr/include",
        "windows" => "C:\\Libraries\\mylib\\include",
        _ => panic!("Unsupported OS: {}", target_os),
    };

    // Tell cargo where to find the library
    println!("cargo:rustc-link-search=native={}", lib_path);

    // Link the library
    // "dylib" for dynamic linking, "static" for static linking
    println!("cargo:rustc-link-lib=dylib=mylib");

    // On some platforms you need additional system libraries
    if target_os == "linux" {
        println!("cargo:rustc-link-lib=pthread");
        println!("cargo:rustc-link-lib=dl");
    }

    // Rerun if these files change
    println!("cargo:rerun-if-changed=wrapper.h");
    println!("cargo:rerun-if-env-changed=MYLIB_DIR");

    // Check for custom library path from environment
    if let Ok(custom_path) = env::var("MYLIB_DIR") {
        println!("cargo:rustc-link-search=native={}/lib", custom_path);
    }

    // Generate bindings with bindgen
    let bindings = bindgen::Builder::default()
        .header("wrapper.h")
        // Add include path for header resolution
        .clang_arg(format!("-I{}", include_path))
        // Select what to generate bindings for
        .allowlist_function("mylib_.*")
        .allowlist_type("MyLib.*")
        .allowlist_var("MYLIB_.*")
        // Block system types we do not need
        .blocklist_type("__.*")
        // Generate Debug and Default implementations
        .derive_debug(true)
        .derive_default(true)
        .derive_eq(true)
        .derive_hash(true)
        // Make enums into Rust enums when possible
        .rustified_enum("MyLibError")
        // Handle size_t correctly
        .size_t_is_usize(true)
        // Generate documentation from C comments
        .generate_comments(true)
        .generate()
        .expect("Failed to generate bindings");

    let out_path = PathBuf::from(env::var("OUT_DIR").unwrap());
    bindings
        .write_to_file(out_path.join("bindings.rs"))
        .expect("Failed to write bindings");
}
```

### Using pkg-config for Library Discovery

For libraries that provide pkg-config files, use the pkg-config crate:

```rust
// build.rs
fn main() {
    // pkg-config will set the correct link flags automatically
    let lib = pkg_config::Config::new()
        .atleast_version("2.0")
        .probe("libfoo")
        .expect("libfoo >= 2.0 not found");

    // Use the include paths for bindgen
    let mut builder = bindgen::Builder::default()
        .header("wrapper.h");

    for path in lib.include_paths {
        builder = builder.clang_arg(format!("-I{}", path.display()));
    }

    let bindings = builder
        .generate()
        .expect("Failed to generate bindings");

    let out_path = PathBuf::from(env::var("OUT_DIR").unwrap());
    bindings
        .write_to_file(out_path.join("bindings.rs"))
        .expect("Failed to write bindings");
}
```

Add pkg-config to your build dependencies:

```toml
[build-dependencies]
bindgen = "0.69"
pkg-config = "0.3"
```

## Putting It All Together: A Complete Example

Here is a complete example wrapping a hypothetical image processing library:

```rust
// src/lib.rs
#![allow(non_upper_case_globals)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]

// Include generated bindings
mod sys {
    include!(concat!(env!("OUT_DIR"), "/bindings.rs"));
}

use std::ffi::{CStr, CString};
use std::path::Path;
use std::ptr;

/// Error type for image operations
#[derive(Debug)]
pub struct ImageError {
    message: String,
}

impl ImageError {
    fn from_last_error() -> Self {
        unsafe {
            let msg = sys::imglib_get_error();
            let message = if msg.is_null() {
                "Unknown error".to_string()
            } else {
                CStr::from_ptr(msg).to_string_lossy().into_owned()
            };
            ImageError { message }
        }
    }
}

impl std::fmt::Display for ImageError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for ImageError {}

/// Pixel format for image data
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PixelFormat {
    Rgb,
    Rgba,
    Grayscale,
}

impl From<sys::imglib_pixel_format> for PixelFormat {
    fn from(fmt: sys::imglib_pixel_format) -> Self {
        match fmt {
            sys::imglib_pixel_format_IMGLIB_RGB => PixelFormat::Rgb,
            sys::imglib_pixel_format_IMGLIB_RGBA => PixelFormat::Rgba,
            sys::imglib_pixel_format_IMGLIB_GRAY => PixelFormat::Grayscale,
            _ => PixelFormat::Rgb, // Default fallback
        }
    }
}

impl From<PixelFormat> for sys::imglib_pixel_format {
    fn from(fmt: PixelFormat) -> Self {
        match fmt {
            PixelFormat::Rgb => sys::imglib_pixel_format_IMGLIB_RGB,
            PixelFormat::Rgba => sys::imglib_pixel_format_IMGLIB_RGBA,
            PixelFormat::Grayscale => sys::imglib_pixel_format_IMGLIB_GRAY,
        }
    }
}

/// An image loaded into memory
pub struct Image {
    handle: *mut sys::imglib_image,
}

// Safety: The C library documents that image handles can be sent between threads
unsafe impl Send for Image {}

impl Image {
    /// Loads an image from a file path
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self, ImageError> {
        let path_str = path.as_ref()
            .to_str()
            .ok_or_else(|| ImageError {
                message: "Invalid path encoding".to_string(),
            })?;

        let c_path = CString::new(path_str)
            .map_err(|_| ImageError {
                message: "Path contains null byte".to_string(),
            })?;

        let handle = unsafe { sys::imglib_open(c_path.as_ptr()) };

        if handle.is_null() {
            return Err(ImageError::from_last_error());
        }

        Ok(Image { handle })
    }

    /// Creates a new blank image with the given dimensions
    pub fn new(width: u32, height: u32, format: PixelFormat) -> Result<Self, ImageError> {
        let handle = unsafe {
            sys::imglib_create(width, height, format.into())
        };

        if handle.is_null() {
            return Err(ImageError::from_last_error());
        }

        Ok(Image { handle })
    }

    /// Returns the image width in pixels
    pub fn width(&self) -> u32 {
        unsafe { sys::imglib_get_width(self.handle) }
    }

    /// Returns the image height in pixels
    pub fn height(&self) -> u32 {
        unsafe { sys::imglib_get_height(self.handle) }
    }

    /// Returns the pixel format
    pub fn format(&self) -> PixelFormat {
        unsafe { sys::imglib_get_format(self.handle).into() }
    }

    /// Returns the raw pixel data as a byte slice
    pub fn data(&self) -> &[u8] {
        unsafe {
            let ptr = sys::imglib_get_data(self.handle);
            let len = sys::imglib_get_data_size(self.handle);
            std::slice::from_raw_parts(ptr, len)
        }
    }

    /// Returns the raw pixel data as a mutable byte slice
    pub fn data_mut(&mut self) -> &mut [u8] {
        unsafe {
            let ptr = sys::imglib_get_data(self.handle);
            let len = sys::imglib_get_data_size(self.handle);
            std::slice::from_raw_parts_mut(ptr, len)
        }
    }

    /// Resizes the image to the given dimensions
    pub fn resize(&mut self, width: u32, height: u32) -> Result<(), ImageError> {
        let success = unsafe {
            sys::imglib_resize(self.handle, width, height)
        };

        if success {
            Ok(())
        } else {
            Err(ImageError::from_last_error())
        }
    }

    /// Saves the image to a file
    ///
    /// The format is determined by the file extension.
    pub fn save<P: AsRef<Path>>(&self, path: P) -> Result<(), ImageError> {
        let path_str = path.as_ref()
            .to_str()
            .ok_or_else(|| ImageError {
                message: "Invalid path encoding".to_string(),
            })?;

        let c_path = CString::new(path_str)
            .map_err(|_| ImageError {
                message: "Path contains null byte".to_string(),
            })?;

        let success = unsafe {
            sys::imglib_save(self.handle, c_path.as_ptr())
        };

        if success {
            Ok(())
        } else {
            Err(ImageError::from_last_error())
        }
    }
}

impl Drop for Image {
    fn drop(&mut self) {
        unsafe {
            sys::imglib_free(self.handle);
        }
    }
}

impl Clone for Image {
    fn clone(&self) -> Self {
        // The C library provides a deep copy function
        let handle = unsafe { sys::imglib_clone(self.handle) };

        // Clone should not fail for a valid image
        // If it does, we panic because Clone cannot return Result
        if handle.is_null() {
            panic!("Failed to clone image: {}", ImageError::from_last_error());
        }

        Image { handle }
    }
}
```

## Testing FFI Code

Testing FFI bindings requires extra care. Here are some strategies:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    // Test basic functionality
    #[test]
    fn test_create_and_drop() {
        // This tests that create and drop work without crashing
        let image = Image::new(100, 100, PixelFormat::Rgb).unwrap();
        assert_eq!(image.width(), 100);
        assert_eq!(image.height(), 100);
        // Image is dropped here - tests that cleanup works
    }

    // Test error handling
    #[test]
    fn test_open_nonexistent_file() {
        let result = Image::open("/nonexistent/path/to/image.png");
        assert!(result.is_err());
    }

    // Test that we do not double-free
    #[test]
    fn test_clone_and_drop() {
        let image1 = Image::new(50, 50, PixelFormat::Rgba).unwrap();
        let image2 = image1.clone();

        // Both should be independent
        assert_eq!(image1.width(), image2.width());

        drop(image1);
        // image2 should still be valid
        assert_eq!(image2.height(), 50);
    }

    // Test thread safety if claimed
    #[test]
    fn test_send_between_threads() {
        let image = Image::new(10, 10, PixelFormat::Grayscale).unwrap();

        std::thread::spawn(move || {
            assert_eq!(image.width(), 10);
        }).join().unwrap();
    }
}
```

## Summary

Creating safe FFI bindings requires attention to several concerns:

1. **Type mapping** - Use the correct C-compatible types from `std::os::raw`
2. **Binding generation** - Use bindgen to avoid manual errors
3. **Pointer wrapping** - Create safe wrapper types that own their resources
4. **Drop implementation** - Clean up C resources automatically
5. **String conversion** - Handle null termination and UTF-8 carefully
6. **Error handling** - Convert C error patterns to Rust Results
7. **Build configuration** - Use build.rs for linking and code generation

The goal is to present a safe, idiomatic Rust API to your users while handling all the unsafe details internally. When done correctly, users of your library never need to write unsafe code themselves.

## Further Reading

- The Rustonomicon chapter on FFI: https://doc.rust-lang.org/nomicon/ffi.html
- bindgen user guide: https://rust-lang.github.io/rust-bindgen/
- The Rust FFI Omnibus: http://jakegoulding.com/rust-ffi-omnibus/
- libc crate documentation: https://docs.rs/libc/
