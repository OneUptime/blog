# How to Install Rust and Cargo on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Rust, Cargo, Development, Programming, Tutorial

Description: Complete guide to installing Rust programming language and Cargo package manager on Ubuntu.

---

Rust is a systems programming language that emphasizes safety, performance, and concurrency. It has consistently been one of the most loved programming languages according to developer surveys, and for good reason. Combined with Cargo, its powerful package manager and build system, Rust provides an excellent development experience. This comprehensive guide will walk you through installing Rust and Cargo on Ubuntu, managing toolchains, and mastering the essential workflows.

## Prerequisites

Before installing Rust, ensure your Ubuntu system is up to date and has the necessary build tools:

```bash
# Update your package lists and upgrade existing packages
sudo apt update && sudo apt upgrade -y

# Install essential build tools required for compiling Rust programs
# build-essential: includes gcc, g++, and make
# curl: used to download the rustup installer
# pkg-config: helps locate installed libraries
# libssl-dev: OpenSSL development files (needed by many Rust crates)
sudo apt install -y build-essential curl pkg-config libssl-dev
```

## Installing Rust via rustup

The recommended way to install Rust is through `rustup`, the official Rust toolchain installer. It manages Rust versions and associated tools seamlessly.

### Step 1: Download and Run the Installer

```bash
# Download and execute the rustup installer script
# The -sSf flags tell curl to:
#   -s: silent mode (no progress bar)
#   -S: show errors if they occur
#   -f: fail silently on HTTP errors
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

During installation, you will see a prompt with three options:

```
1) Proceed with installation (default)
2) Customize installation
3) Cancel installation
```

For most users, pressing `1` or Enter for the default installation is recommended.

### Step 2: Configure Your Shell Environment

After installation completes, you need to add Cargo's bin directory to your PATH:

```bash
# Add Rust to your current shell session
# This sources the cargo environment file which sets up PATH
source "$HOME/.cargo/env"

# Verify the installation by checking the Rust compiler version
rustc --version

# Check Cargo version as well
cargo --version
```

For the changes to persist across terminal sessions, add the following to your `~/.bashrc` or `~/.zshrc`:

```bash
# Rust/Cargo environment setup
# This ensures Rust binaries are available in every new terminal session
. "$HOME/.cargo/env"
```

### Step 3: Verify the Installation

```bash
# Display comprehensive version information
rustc --version --verbose

# Example output:
# rustc 1.75.0 (82e1608df 2023-12-21)
# binary: rustc
# commit-hash: 82e1608dfa6e0b5569232559e3d385fea5a93112
# commit-date: 2023-12-21
# host: x86_64-unknown-linux-gnu
# release: 1.75.0
# LLVM version: 17.0.6
```

## Managing Rust Versions

One of rustup's greatest strengths is its ability to manage multiple Rust versions effortlessly.

### Updating Rust

```bash
# Update rustup itself and all installed toolchains to their latest versions
# This is the command you'll run periodically to stay current
rustup update

# Update only rustup (the toolchain manager) without touching toolchains
rustup self update
```

### Installing Specific Versions

```bash
# Install the stable toolchain (default and recommended for most users)
rustup install stable

# Install the beta toolchain (preview of upcoming stable features)
rustup install beta

# Install the nightly toolchain (bleeding-edge features, may be unstable)
rustup install nightly

# Install a specific version by version number
# Useful for reproducibility or when a project requires a specific version
rustup install 1.70.0
```

### Switching Between Versions

```bash
# Set the default toolchain for all projects
# This affects every Rust project on your system
rustup default stable

# Override the toolchain for the current directory only
# Creates a rust-toolchain.toml file or uses rustup override
rustup override set nightly

# List all overrides currently in effect
rustup override list

# Remove an override for the current directory
rustup override unset
```

## Understanding Toolchains

A Rust toolchain consists of several components that work together:

### Toolchain Components

```bash
# List all installed toolchains on your system
rustup toolchain list

# Show detailed information about the active toolchain
rustup show

# List available components for the current toolchain
rustup component list

# Add a component (like the Rust source code for IDE support)
# rust-src: Rust standard library source (needed for rust-analyzer)
# rustfmt: automatic code formatter
# clippy: linting tool for catching common mistakes
rustup component add rust-src rustfmt clippy

# Add the rust-analyzer component (modern language server)
rustup component add rust-analyzer
```

### Common Components Explained

| Component | Purpose |
|-----------|---------|
| `rustc` | The Rust compiler |
| `cargo` | Package manager and build tool |
| `rust-std` | Standard library |
| `rust-docs` | Local documentation |
| `rustfmt` | Code formatter |
| `clippy` | Linting tool |
| `rust-src` | Standard library source code |
| `rust-analyzer` | Language server for IDEs |

### Using Toolchain Files

For project-specific toolchain requirements, create a `rust-toolchain.toml` file in your project root:

```toml
# rust-toolchain.toml
# This file specifies the exact toolchain configuration for this project
# Anyone cloning this repo will automatically use these settings

[toolchain]
# Specify the release channel: stable, beta, nightly, or a specific version
channel = "1.75.0"

# List required components that must be installed
components = ["rustfmt", "clippy", "rust-analyzer"]

# Specify compilation targets (useful for cross-compilation)
targets = ["x86_64-unknown-linux-gnu"]

# Optional: specify the profile (minimal, default, or complete)
profile = "default"
```

## Cargo Basics

Cargo is Rust's build system and package manager. It handles downloading dependencies, compiling packages, and much more.

### Essential Cargo Commands

```bash
# Create a new binary project (executable application)
# This creates a new directory with a basic project structure
cargo new my_project

# Create a new library project (reusable code)
# Libraries are meant to be used by other Rust projects
cargo new my_library --lib

# Initialize a Cargo project in an existing directory
# Useful when you already have some source files
cargo init

# Initialize a library in an existing directory
cargo init --lib
```

### Understanding the Project Structure

When you run `cargo new my_project`, Cargo creates:

```
my_project/
├── Cargo.toml      # Project manifest (dependencies, metadata)
├── Cargo.lock      # Locked versions of dependencies (auto-generated)
└── src/
    └── main.rs     # Main source file for binary projects
                    # (or lib.rs for library projects)
```

## Creating Projects

Let's create a sample project to demonstrate Cargo's capabilities:

```bash
# Create a new project called "hello_rust"
cargo new hello_rust
cd hello_rust
```

### The Cargo.toml Manifest

The `Cargo.toml` file is the heart of your Rust project:

```toml
# Cargo.toml - The project manifest file
# This file uses TOML (Tom's Obvious, Minimal Language) format

[package]
# Package name - must be unique if publishing to crates.io
name = "hello_rust"

# Semantic versioning: MAJOR.MINOR.PATCH
# Increment MAJOR for breaking changes
# Increment MINOR for new features (backward compatible)
# Increment PATCH for bug fixes
version = "0.1.0"

# Rust edition - determines which language features are available
# 2021 is the current edition, providing modern syntax and features
edition = "2021"

# Package authors - typically name and email
authors = ["Your Name <your.email@example.com>"]

# Brief description of your package
description = "A sample Rust project demonstrating Cargo basics"

# SPDX license identifier
license = "MIT"

# Link to the repository
repository = "https://github.com/username/hello_rust"

# Link to documentation
documentation = "https://docs.rs/hello_rust"

# Keywords for crates.io search (max 5)
keywords = ["example", "tutorial", "hello-world"]

# Categories for crates.io (must match predefined list)
categories = ["command-line-utilities"]

# Minimum supported Rust version
rust-version = "1.70"

# See more keys and their definitions at https://doc.rust-lang.org/cargo/reference/manifest.html

[dependencies]
# Dependencies go here - we'll add these in the next section
```

### Sample main.rs with Comments

```rust
// src/main.rs
// The entry point for our Rust application

// The main function is where program execution begins
// Unlike C/C++, main() returns () (unit type) by default
// You can also return Result<(), E> for error handling
fn main() {
    // println! is a macro (note the !) that prints to stdout
    // Macros in Rust end with ! and can do things functions cannot
    println!("Hello, Rust!");

    // Demonstrate variable binding
    // Variables are immutable by default in Rust
    let greeting = "Welcome to Rust programming";
    println!("{}", greeting);

    // Mutable variables require the 'mut' keyword
    let mut counter = 0;
    counter += 1;  // This is allowed because counter is mutable
    println!("Counter: {}", counter);

    // Type inference - Rust figures out the type automatically
    let number = 42;        // Inferred as i32
    let pi = 3.14159;       // Inferred as f64
    let is_awesome = true;  // Inferred as bool

    // Explicit type annotation
    let explicit_number: i64 = 1_000_000;  // Underscores for readability

    // String vs &str
    // &str is a string slice (borrowed, immutable view)
    // String is an owned, growable string
    let slice: &str = "I'm a string slice";
    let owned: String = String::from("I'm an owned String");

    // Print all our variables
    println!("Number: {}, Pi: {}, Awesome: {}", number, pi, is_awesome);
    println!("Explicit: {}", explicit_number);
    println!("{} and {}", slice, owned);
}
```

## Building and Running

Cargo provides several commands for building and running your projects:

```bash
# Build the project in debug mode (faster compilation, slower execution)
# Debug builds include debugging symbols and skip optimizations
# Output goes to target/debug/
cargo build

# Build in release mode (slower compilation, faster execution)
# Release builds are optimized and suitable for production
# Output goes to target/release/
cargo build --release

# Build and run in one command (most common during development)
cargo run

# Run in release mode
cargo run --release

# Check if the code compiles without producing an executable
# Much faster than cargo build - great for quick syntax checks
cargo check

# Clean build artifacts (removes the target/ directory)
cargo clean

# Build documentation for your project and dependencies
# Opens in your default browser
cargo doc --open
```

### Understanding Build Profiles

```toml
# Cargo.toml - Custom build profiles

# Development profile - used by default with 'cargo build'
[profile.dev]
opt-level = 0      # No optimization (fastest compile time)
debug = true       # Include debug symbols
debug-assertions = true  # Enable debug assertions
overflow-checks = true   # Check for integer overflow

# Release profile - used with 'cargo build --release'
[profile.release]
opt-level = 3      # Maximum optimization
debug = false      # No debug symbols (smaller binary)
lto = true         # Link-time optimization (slower build, faster binary)
codegen-units = 1  # Better optimization, slower compilation
panic = "abort"    # Abort on panic (smaller binary, no unwinding)
strip = true       # Strip symbols from binary

# Custom profile for benchmarking
[profile.bench]
opt-level = 3
debug = false

# Test profile inherits from dev by default
[profile.test]
opt-level = 0
debug = true
```

## Dependencies Management

Managing dependencies is one of Cargo's strongest features.

### Adding Dependencies

```bash
# Add a dependency using cargo add (requires cargo-edit or Rust 1.62+)
cargo add serde

# Add with specific version
cargo add serde@1.0.193

# Add with features enabled
cargo add serde --features derive

# Add a development-only dependency (for tests, examples, benchmarks)
cargo add --dev mockall

# Add a build dependency (for build.rs scripts)
cargo add --build cc

# Remove a dependency
cargo remove serde
```

### Cargo.toml Dependencies Section

```toml
# Cargo.toml - Dependencies configuration

[dependencies]
# Simple version specification (caret is implicit)
# "1.0" means ">=1.0.0 <2.0.0"
serde = "1.0"

# Exact version (use sparingly - reduces flexibility)
uuid = "=1.6.1"

# Version with features enabled
# Features are optional functionality that dependencies can expose
serde = { version = "1.0", features = ["derive"] }

# Enable default features (true by default)
tokio = { version = "1.35", features = ["full"] }

# Disable default features and select specific ones
# Useful for minimizing binary size
reqwest = { version = "0.11", default-features = false, features = ["json", "rustls-tls"] }

# Git dependency - use a specific git repository
my_crate = { git = "https://github.com/user/my_crate" }

# Git dependency with specific branch
my_crate = { git = "https://github.com/user/my_crate", branch = "develop" }

# Git dependency with specific tag
my_crate = { git = "https://github.com/user/my_crate", tag = "v1.0.0" }

# Git dependency with specific commit
my_crate = { git = "https://github.com/user/my_crate", rev = "abc123" }

# Path dependency - local crate (useful for workspaces)
my_local_crate = { path = "../my_local_crate" }

# Optional dependency - only compiled when feature is enabled
fancy_feature = { version = "1.0", optional = true }

[dev-dependencies]
# Dependencies only used for tests, examples, and benchmarks
criterion = "0.5"     # Benchmarking framework
mockall = "0.12"      # Mocking library
tempfile = "3.9"      # Create temporary files/directories
pretty_assertions = "1.4"  # Better assertion diff output

[build-dependencies]
# Dependencies used by build.rs scripts
cc = "1.0"            # C/C++ compiler integration
pkg-config = "0.3"    # Find system libraries

[features]
# Define custom features for your crate
# Features allow conditional compilation
default = ["std"]     # Features enabled by default
std = []              # Standard library support
fancy = ["dep:fancy_feature"]  # Enable optional dependency
full = ["std", "fancy"]  # Convenience feature enabling multiple features
```

### Version Requirements Explained

```toml
# Cargo.toml - Version requirement syntax

[dependencies]
# Caret requirements (default) - allows SemVer-compatible updates
# "^1.2.3" means ">=1.2.3 <2.0.0"
# "^0.2.3" means ">=0.2.3 <0.3.0" (0.x is special)
# "^0.0.3" means ">=0.0.3 <0.0.4" (0.0.x is special)
crate_a = "1.2.3"      # Same as "^1.2.3"

# Tilde requirements - allows patch-level updates only
# "~1.2.3" means ">=1.2.3 <1.3.0"
crate_b = "~1.2.3"

# Wildcard requirements
# "1.*" means ">=1.0.0 <2.0.0"
# "1.2.*" means ">=1.2.0 <1.3.0"
crate_c = "1.2.*"

# Comparison requirements
crate_d = ">=1.2.0"          # At least 1.2.0
crate_e = ">1.2, <1.5"       # Between 1.2 and 1.5
crate_f = ">=1.2, <2.0"      # SemVer-compatible

# Exact requirement (not recommended unless necessary)
crate_g = "=1.2.3"
```

### Working with Cargo.lock

```bash
# Update all dependencies to latest compatible versions
cargo update

# Update a specific dependency
cargo update -p serde

# Update a dependency to a specific version
cargo update -p serde --precise 1.0.190

# Display the dependency tree
cargo tree

# Display reverse dependencies (what depends on a crate)
cargo tree --invert serde

# Display duplicated dependencies
cargo tree --duplicates
```

## Testing in Rust

Rust has built-in support for testing at multiple levels.

### Unit Tests

```rust
// src/lib.rs
// A module demonstrating Rust's testing capabilities

/// Adds two numbers together.
///
/// # Examples
///
/// ```
/// use hello_rust::add;
/// assert_eq!(add(2, 3), 5);
/// ```
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

/// Divides two numbers, returning None if the divisor is zero.
///
/// # Examples
///
/// ```
/// use hello_rust::safe_divide;
/// assert_eq!(safe_divide(10, 2), Some(5));
/// assert_eq!(safe_divide(10, 0), None);
/// ```
pub fn safe_divide(dividend: i32, divisor: i32) -> Option<i32> {
    // Return None for division by zero instead of panicking
    if divisor == 0 {
        None
    } else {
        Some(dividend / divisor)
    }
}

/// Checks if a string is a valid email (simplified check).
pub fn is_valid_email(email: &str) -> bool {
    email.contains('@') && email.contains('.')
}

// Unit tests module
// The #[cfg(test)] attribute ensures this module is only compiled during testing
#[cfg(test)]
mod tests {
    // Import everything from the parent module
    use super::*;

    // Basic test - function name describes what it tests
    #[test]
    fn test_add_positive_numbers() {
        // assert_eq! checks that two values are equal
        assert_eq!(add(2, 3), 5);
    }

    #[test]
    fn test_add_negative_numbers() {
        assert_eq!(add(-2, -3), -5);
    }

    #[test]
    fn test_add_mixed_numbers() {
        assert_eq!(add(-2, 5), 3);
    }

    // Test with custom failure message
    #[test]
    fn test_add_with_message() {
        let result = add(10, 20);
        assert_eq!(
            result,
            30,
            "Expected 10 + 20 to equal 30, but got {}",
            result
        );
    }

    // Testing Option return values
    #[test]
    fn test_safe_divide_valid() {
        assert_eq!(safe_divide(10, 2), Some(5));
        assert_eq!(safe_divide(100, 10), Some(10));
    }

    #[test]
    fn test_safe_divide_by_zero() {
        // Division by zero should return None, not panic
        assert_eq!(safe_divide(10, 0), None);
    }

    // Test that should panic - useful for testing error conditions
    #[test]
    #[should_panic(expected = "divide by zero")]
    fn test_panic_on_divide_by_zero() {
        // This function would panic, and we expect it to
        let _ = 10 / 0;  // This will panic with "divide by zero"
    }

    // Ignored test - won't run unless specifically requested
    // Useful for slow tests or tests requiring special setup
    #[test]
    #[ignore]
    fn expensive_test() {
        // This test takes a long time
        std::thread::sleep(std::time::Duration::from_secs(10));
    }

    // Test returning Result - allows use of ? operator
    #[test]
    fn test_with_result() -> Result<(), String> {
        let result = add(2, 2);
        if result == 4 {
            Ok(())
        } else {
            Err(format!("Expected 4, got {}", result))
        }
    }

    // Test email validation
    #[test]
    fn test_valid_email() {
        assert!(is_valid_email("user@example.com"));
        assert!(is_valid_email("test.user@domain.org"));
    }

    #[test]
    fn test_invalid_email() {
        // assert! checks that a condition is true
        // Use ! to negate
        assert!(!is_valid_email("invalid-email"));
        assert!(!is_valid_email("missing@domain"));
        assert!(!is_valid_email("nodomain.com"));
    }
}
```

### Integration Tests

Integration tests live in the `tests/` directory:

```rust
// tests/integration_test.rs
// Integration tests test your library as an external user would

// Import the crate being tested
use hello_rust::{add, safe_divide, is_valid_email};

#[test]
fn test_add_integration() {
    // Integration tests can test the public API
    assert_eq!(add(100, 200), 300);
}

#[test]
fn test_safe_divide_integration() {
    // Test the happy path
    let result = safe_divide(100, 5);
    assert!(result.is_some());
    assert_eq!(result.unwrap(), 20);

    // Test the error path
    let zero_result = safe_divide(100, 0);
    assert!(zero_result.is_none());
}

// You can organize integration tests into modules
mod email_tests {
    use super::*;

    #[test]
    fn test_corporate_email() {
        assert!(is_valid_email("employee@company.com"));
    }

    #[test]
    fn test_personal_email() {
        assert!(is_valid_email("person@gmail.com"));
    }
}
```

### Running Tests

```bash
# Run all tests (unit, integration, and doc tests)
cargo test

# Run tests with output displayed (normally captured)
cargo test -- --nocapture

# Run a specific test by name
cargo test test_add

# Run tests matching a pattern
cargo test email

# Run only ignored tests
cargo test -- --ignored

# Run all tests including ignored
cargo test -- --include-ignored

# Run tests in a specific module
cargo test tests::test_add

# Run tests with multiple threads (default is parallel)
cargo test -- --test-threads=4

# Run tests sequentially (useful for tests with shared state)
cargo test -- --test-threads=1

# Run only unit tests (no integration tests)
cargo test --lib

# Run only integration tests
cargo test --test integration_test

# Run only doc tests
cargo test --doc

# Run tests in release mode
cargo test --release

# Show test output even for passing tests
cargo test -- --show-output
```

### Documentation Tests

```rust
// src/lib.rs
// Documentation comments can contain testable examples

/// Calculates the factorial of a number.
///
/// # Arguments
///
/// * `n` - The number to calculate factorial for
///
/// # Returns
///
/// The factorial of n, or None if overflow would occur
///
/// # Examples
///
/// ```
/// use hello_rust::factorial;
///
/// // Basic usage
/// assert_eq!(factorial(5), Some(120));
/// assert_eq!(factorial(0), Some(1));
///
/// // Edge cases
/// assert_eq!(factorial(1), Some(1));
/// ```
///
/// # Panics
///
/// This function does not panic.
///
/// ```should_panic
/// // This example is expected to panic
/// // (In this case it won't, but this shows the syntax)
/// panic!("This would panic");
/// ```
///
/// ```no_run
/// // This example compiles but is not executed
/// // Useful for examples that require external resources
/// use hello_rust::factorial;
/// let result = factorial(100);
/// ```
///
/// ```ignore
/// // This example is completely ignored
/// // Useful for examples that won't compile on all platforms
/// platform_specific_function();
/// ```
pub fn factorial(n: u64) -> Option<u64> {
    match n {
        0 | 1 => Some(1),
        _ => factorial(n - 1).and_then(|f| n.checked_mul(f)),
    }
}
```

## IDE Setup

Setting up a proper IDE environment greatly improves Rust development productivity.

### VS Code Setup

VS Code is one of the most popular editors for Rust development.

#### Install rust-analyzer Extension

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "rust-analyzer"
4. Install the official rust-analyzer extension

Or install from the command line:

```bash
# Install using VS Code CLI
code --install-extension rust-lang.rust-analyzer
```

#### Recommended VS Code Extensions

```bash
# Install essential Rust extensions via command line
code --install-extension rust-lang.rust-analyzer    # Language support
code --install-extension serayuzgur.crates          # Crates.io integration
code --install-extension tamasfe.even-better-toml  # TOML support
code --install-extension vadimcn.vscode-lldb       # Debugging support
code --install-extension usernamehw.errorlens      # Inline error display
```

#### VS Code Settings for Rust

Create or update `.vscode/settings.json` in your project:

```json
{
    // rust-analyzer settings
    "rust-analyzer.cargo.features": "all",
    "rust-analyzer.check.command": "clippy",
    "rust-analyzer.imports.granularity.group": "module",
    "rust-analyzer.imports.prefix": "self",

    // Format on save
    "editor.formatOnSave": true,
    "[rust]": {
        "editor.defaultFormatter": "rust-lang.rust-analyzer",
        "editor.formatOnSave": true,
        "editor.tabSize": 4
    },

    // Inlay hints (type annotations shown inline)
    "rust-analyzer.inlayHints.typeHints.enable": true,
    "rust-analyzer.inlayHints.parameterHints.enable": true,
    "rust-analyzer.inlayHints.chainingHints.enable": true,

    // Proc macro support
    "rust-analyzer.procMacro.enable": true,

    // Diagnostics
    "rust-analyzer.diagnostics.enable": true,
    "rust-analyzer.diagnostics.experimental.enable": true
}
```

#### VS Code Debug Configuration

Create `.vscode/launch.json` for debugging:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "lldb",
            "request": "launch",
            "name": "Debug executable",
            "cargo": {
                "args": [
                    "build",
                    "--bin=hello_rust",
                    "--package=hello_rust"
                ],
                "filter": {
                    "name": "hello_rust",
                    "kind": "bin"
                }
            },
            "args": [],
            "cwd": "${workspaceFolder}"
        },
        {
            "type": "lldb",
            "request": "launch",
            "name": "Debug unit tests",
            "cargo": {
                "args": [
                    "test",
                    "--no-run",
                    "--lib",
                    "--package=hello_rust"
                ],
                "filter": {
                    "name": "hello_rust",
                    "kind": "lib"
                }
            },
            "args": [],
            "cwd": "${workspaceFolder}"
        }
    ]
}
```

### Installing rust-analyzer Manually

If you need to install rust-analyzer separately:

```bash
# Install via rustup (recommended)
rustup component add rust-analyzer

# Or download the latest binary
curl -L https://github.com/rust-lang/rust-analyzer/releases/latest/download/rust-analyzer-x86_64-unknown-linux-gnu.gz | gunzip -c - > ~/.local/bin/rust-analyzer
chmod +x ~/.local/bin/rust-analyzer
```

### Other Editor Support

```bash
# For Neovim users - rust-tools.nvim provides excellent support
# For Emacs users - rustic-mode is recommended
# For IntelliJ users - the official Rust plugin is excellent

# Verify rust-analyzer is working
rust-analyzer --version
```

## Cross-Compilation

Rust makes cross-compilation straightforward with its target system.

### Understanding Targets

```bash
# List all available targets
rustup target list

# List installed targets
rustup target list --installed

# Show current default target
rustc --print target-list | head -20
```

### Adding Cross-Compilation Targets

```bash
# Add common Linux targets
rustup target add x86_64-unknown-linux-gnu      # 64-bit Linux (glibc)
rustup target add x86_64-unknown-linux-musl     # 64-bit Linux (musl, static)
rustup target add aarch64-unknown-linux-gnu     # 64-bit ARM Linux

# Add Windows targets
rustup target add x86_64-pc-windows-gnu         # 64-bit Windows (MinGW)
rustup target add x86_64-pc-windows-msvc        # 64-bit Windows (MSVC)

# Add macOS targets
rustup target add x86_64-apple-darwin           # 64-bit macOS (Intel)
rustup target add aarch64-apple-darwin          # 64-bit macOS (Apple Silicon)

# Add WebAssembly targets
rustup target add wasm32-unknown-unknown        # WebAssembly
rustup target add wasm32-wasi                   # WebAssembly with WASI

# Add embedded targets (no standard library)
rustup target add thumbv7em-none-eabihf         # ARM Cortex-M4/M7
```

### Installing Cross-Compilation Tools

```bash
# Install cross-compilation toolchains on Ubuntu
# For Windows (MinGW)
sudo apt install -y mingw-w64

# For ARM Linux
sudo apt install -y gcc-aarch64-linux-gnu

# For musl (static linking)
sudo apt install -y musl-tools

# Install 'cross' for easier cross-compilation (uses Docker)
cargo install cross
```

### Configuring Cross-Compilation

Create `.cargo/config.toml` in your project:

```toml
# .cargo/config.toml
# Cross-compilation configuration

# Target-specific linker settings
[target.x86_64-unknown-linux-musl]
# Use musl-gcc for static Linux binaries
linker = "musl-gcc"

[target.x86_64-pc-windows-gnu]
# Use MinGW for Windows cross-compilation
linker = "x86_64-w64-mingw32-gcc"
ar = "x86_64-w64-mingw32-ar"

[target.aarch64-unknown-linux-gnu]
# Use ARM cross-compiler
linker = "aarch64-linux-gnu-gcc"

# Default target (optional)
# [build]
# target = "x86_64-unknown-linux-musl"

# Environment variables for specific targets
[env]
# PKG_CONFIG_ALLOW_CROSS = "1"
```

### Building for Different Targets

```bash
# Build for a specific target
cargo build --target x86_64-unknown-linux-musl

# Build release for Windows
cargo build --release --target x86_64-pc-windows-gnu

# Build for ARM Linux
cargo build --target aarch64-unknown-linux-gnu

# Using 'cross' for easier cross-compilation
# Cross handles the toolchain setup automatically using Docker
cross build --target x86_64-pc-windows-gnu
cross build --target aarch64-unknown-linux-gnu

# Build for WebAssembly
cargo build --target wasm32-unknown-unknown --release

# The output will be in target/<target-triple>/release/
ls -la target/x86_64-unknown-linux-musl/release/
```

### WebAssembly Example

```bash
# Add wasm target
rustup target add wasm32-unknown-unknown

# Install wasm-pack for web integration
cargo install wasm-pack

# Install wasm-bindgen for JavaScript interop
cargo install wasm-bindgen-cli

# Build as WebAssembly
wasm-pack build --target web

# Or build manually
cargo build --target wasm32-unknown-unknown --release
```

## Useful Cargo Subcommands

Cargo has a rich ecosystem of subcommands that extend its functionality.

### Built-in Subcommands

```bash
# Format code according to Rust style guidelines
# Requires: rustup component add rustfmt
cargo fmt

# Check formatting without making changes
cargo fmt -- --check

# Run the Clippy linter for additional warnings
# Requires: rustup component add clippy
cargo clippy

# Run Clippy and fail on warnings (useful in CI)
cargo clippy -- -D warnings

# Generate and open documentation
cargo doc --open

# Generate docs including private items
cargo doc --document-private-items

# Run benchmarks (requires nightly for built-in benches)
cargo bench

# Package your crate for publishing
cargo package

# Publish to crates.io
cargo publish

# Login to crates.io
cargo login

# Search for crates
cargo search serde

# Display a tree of dependencies
cargo tree

# Display outdated dependencies
cargo outdated  # Requires cargo-outdated

# Fetch dependencies without building
cargo fetch

# Vendor dependencies (copy into vendor/ directory)
cargo vendor
```

### Installing Additional Subcommands

```bash
# cargo-edit: Adds 'add', 'rm', 'upgrade' commands
cargo install cargo-edit

# cargo-watch: Auto-rebuild on file changes
cargo install cargo-watch

# cargo-expand: Show macro expansions
cargo install cargo-expand

# cargo-audit: Security vulnerability scanner
cargo install cargo-audit

# cargo-outdated: Show outdated dependencies
cargo install cargo-outdated

# cargo-release: Automate release process
cargo install cargo-release

# cargo-deny: Lint dependencies for various issues
cargo install cargo-deny

# cargo-bloat: Find what takes space in executables
cargo install cargo-bloat

# cargo-flamegraph: Generate flamegraphs for profiling
cargo install flamegraph

# cargo-make: Task runner and build tool
cargo install cargo-make

# cargo-nextest: Faster test runner
cargo install cargo-nextest

# cargo-llvm-lines: Count LLVM IR lines per function
cargo install cargo-llvm-lines
```

### Using Cargo Subcommands

```bash
# Watch for changes and run check automatically
# Great for development - recompiles on save
cargo watch -x check

# Watch and run tests on change
cargo watch -x test

# Watch, check, then test, then run
cargo watch -x check -x test -x run

# Expand macros in your code (see generated code)
cargo expand

# Expand a specific function
cargo expand function_name

# Audit dependencies for security vulnerabilities
cargo audit

# Check for outdated dependencies
cargo outdated

# Analyze binary size
cargo bloat --release

# Show what functions take the most space
cargo bloat --release --crates

# Generate a flamegraph (requires perf on Linux)
cargo flamegraph

# Deny certain dependency characteristics
# Create deny.toml for configuration
cargo deny check

# Fast test runner
cargo nextest run

# Run tests with better output
cargo nextest run --status-level all
```

### Cargo Make Example

Create `Makefile.toml` for complex build workflows:

```toml
# Makefile.toml - cargo-make configuration

[tasks.format]
description = "Format code"
command = "cargo"
args = ["fmt"]

[tasks.lint]
description = "Run Clippy"
command = "cargo"
args = ["clippy", "--", "-D", "warnings"]
dependencies = ["format"]

[tasks.test]
description = "Run tests"
command = "cargo"
args = ["test"]
dependencies = ["lint"]

[tasks.build]
description = "Build release"
command = "cargo"
args = ["build", "--release"]
dependencies = ["test"]

[tasks.all]
description = "Run all tasks"
dependencies = ["build"]

[tasks.ci]
description = "CI pipeline"
dependencies = ["format", "lint", "test"]
```

Run with:

```bash
# Run the default task
cargo make

# Run a specific task
cargo make lint

# Run CI pipeline
cargo make ci
```

## Practical Example: A Complete Project

Let's create a more complete example demonstrating multiple Rust concepts:

```rust
// src/main.rs
// A practical example demonstrating common Rust patterns

use std::collections::HashMap;
use std::fs::File;
use std::io::{self, BufRead, BufReader, Write};

/// Represents a simple key-value store
/// Using generics to allow different value types
#[derive(Debug)]
struct KeyValueStore<V> {
    // HashMap provides O(1) average lookup time
    data: HashMap<String, V>,
    // Track the number of operations
    operation_count: usize,
}

// Implementation block for KeyValueStore
// The impl block defines methods for the struct
impl<V> KeyValueStore<V> {
    /// Creates a new empty KeyValueStore
    /// This is a common pattern - a 'new' associated function
    pub fn new() -> Self {
        KeyValueStore {
            data: HashMap::new(),
            operation_count: 0,
        }
    }

    /// Inserts a key-value pair into the store
    /// Takes ownership of both key and value
    pub fn insert(&mut self, key: String, value: V) {
        self.data.insert(key, value);
        self.operation_count += 1;
    }

    /// Gets a reference to a value by key
    /// Returns Option<&V> - Some(&value) if found, None if not
    pub fn get(&self, key: &str) -> Option<&V> {
        self.data.get(key)
    }

    /// Removes a key-value pair, returning the value if it existed
    pub fn remove(&mut self, key: &str) -> Option<V> {
        self.operation_count += 1;
        self.data.remove(key)
    }

    /// Returns the number of items in the store
    pub fn len(&self) -> usize {
        self.data.len()
    }

    /// Returns true if the store is empty
    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }

    /// Returns the total number of operations performed
    pub fn operations(&self) -> usize {
        self.operation_count
    }
}

// Implement Default trait for KeyValueStore
impl<V> Default for KeyValueStore<V> {
    fn default() -> Self {
        Self::new()
    }
}

/// Demonstrates error handling with Result type
/// This function reads lines from a file and returns them as a Vec
fn read_lines_from_file(path: &str) -> io::Result<Vec<String>> {
    // The ? operator propagates errors automatically
    // If File::open fails, the error is returned immediately
    let file = File::open(path)?;

    // BufReader provides efficient buffered reading
    let reader = BufReader::new(file);

    // Collect all lines into a Vec, propagating any errors
    // The collect() here is smart enough to collect Results
    reader.lines().collect()
}

/// Demonstrates pattern matching and Option handling
fn process_value(value: Option<i32>) -> String {
    // Match is Rust's powerful pattern matching construct
    match value {
        // Some(x) if x > 0 is a match guard
        Some(x) if x > 0 => format!("Positive: {}", x),
        Some(x) if x < 0 => format!("Negative: {}", x),
        Some(0) => String::from("Zero"),
        Some(_) => String::from("Some other number"), // Unreachable but required
        None => String::from("No value"),
    }
}

/// Demonstrates closures and iterators
fn demonstrate_iterators() {
    let numbers = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // Map transforms each element
    // Filter keeps only elements matching a condition
    // Collect gathers results into a collection
    let even_squares: Vec<i32> = numbers
        .iter()           // Create an iterator
        .filter(|&x| x % 2 == 0)  // Keep even numbers
        .map(|x| x * x)   // Square each number
        .collect();       // Collect into Vec

    println!("Even squares: {:?}", even_squares);
    // Output: Even squares: [4, 16, 36, 64, 100]

    // Fold (reduce) combines elements into a single value
    let sum: i32 = numbers.iter().sum();
    println!("Sum: {}", sum);

    // Find returns the first matching element
    let first_greater_than_5 = numbers.iter().find(|&&x| x > 5);
    println!("First > 5: {:?}", first_greater_than_5);
}

/// Demonstrates ownership and borrowing
fn ownership_demo() {
    // String is an owned type - it owns its data
    let owned_string = String::from("Hello, Rust!");

    // &str is a borrowed reference - it borrows the data
    let borrowed: &str = &owned_string;

    // Can have multiple immutable borrows
    let another_borrow: &str = &owned_string;

    println!("Owned: {}", owned_string);
    println!("Borrowed: {}", borrowed);
    println!("Another borrow: {}", another_borrow);

    // Mutable borrow example
    let mut mutable_string = String::from("Hello");

    // Only one mutable borrow at a time
    {
        let mutable_borrow = &mut mutable_string;
        mutable_borrow.push_str(", World!");
    } // mutable_borrow goes out of scope here

    println!("Modified: {}", mutable_string);
}

fn main() {
    println!("=== Rust Concepts Demo ===\n");

    // Using our KeyValueStore
    println!("--- KeyValueStore Demo ---");
    let mut store: KeyValueStore<String> = KeyValueStore::new();

    store.insert("name".to_string(), "Alice".to_string());
    store.insert("city".to_string(), "Boston".to_string());

    // Using if let for Option handling
    if let Some(name) = store.get("name") {
        println!("Found name: {}", name);
    }

    println!("Store has {} items", store.len());
    println!("Operations performed: {}", store.operations());

    // Pattern matching demo
    println!("\n--- Pattern Matching Demo ---");
    println!("{}", process_value(Some(42)));
    println!("{}", process_value(Some(-10)));
    println!("{}", process_value(None));

    // Iterator demo
    println!("\n--- Iterator Demo ---");
    demonstrate_iterators();

    // Ownership demo
    println!("\n--- Ownership Demo ---");
    ownership_demo();

    // Error handling demo
    println!("\n--- Error Handling Demo ---");
    match read_lines_from_file("Cargo.toml") {
        Ok(lines) => {
            println!("Read {} lines from Cargo.toml", lines.len());
            // Print first 3 lines
            for (i, line) in lines.iter().take(3).enumerate() {
                println!("  Line {}: {}", i + 1, line);
            }
        }
        Err(e) => {
            println!("Error reading file: {}", e);
        }
    }

    println!("\n=== Demo Complete ===");
}

// Unit tests for our KeyValueStore
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kvstore_insert_and_get() {
        let mut store = KeyValueStore::new();
        store.insert("key".to_string(), 42);

        assert_eq!(store.get("key"), Some(&42));
        assert_eq!(store.get("nonexistent"), None);
    }

    #[test]
    fn test_kvstore_remove() {
        let mut store = KeyValueStore::new();
        store.insert("key".to_string(), "value".to_string());

        let removed = store.remove("key");
        assert_eq!(removed, Some("value".to_string()));
        assert!(store.is_empty());
    }

    #[test]
    fn test_kvstore_operations_count() {
        let mut store: KeyValueStore<i32> = KeyValueStore::new();

        assert_eq!(store.operations(), 0);

        store.insert("a".to_string(), 1);
        store.insert("b".to_string(), 2);
        store.remove("a");

        assert_eq!(store.operations(), 3);
    }

    #[test]
    fn test_process_value() {
        assert_eq!(process_value(Some(5)), "Positive: 5");
        assert_eq!(process_value(Some(-3)), "Negative: -3");
        assert_eq!(process_value(Some(0)), "Zero");
        assert_eq!(process_value(None), "No value");
    }
}
```

## Troubleshooting Common Issues

### Permission Errors

```bash
# If you encounter permission errors with cargo
# Check ownership of .cargo and .rustup directories
ls -la ~/.cargo ~/.rustup

# Fix permissions if needed
sudo chown -R $(whoami) ~/.cargo ~/.rustup
```

### Linker Errors

```bash
# If you get linker errors, ensure build-essential is installed
sudo apt install -y build-essential

# For specific linker errors, you might need additional libraries
sudo apt install -y libssl-dev pkg-config
```

### Updating When Things Break

```bash
# If your Rust installation seems broken, try updating
rustup update

# Or reinstall completely
rustup self uninstall
# Then reinstall using the curl command from earlier
```

### Cache Issues

```bash
# Clear Cargo's cache if you encounter weird build issues
cargo clean

# Clear the global cache (use with caution)
rm -rf ~/.cargo/registry/cache
rm -rf ~/.cargo/git

# Rebuild with fresh dependencies
cargo build
```

## Summary

You have now learned how to:

1. **Install Rust and Cargo** using rustup, the official toolchain manager
2. **Manage Rust versions** and switch between stable, beta, and nightly channels
3. **Understand toolchains** and their components (rustc, cargo, clippy, rustfmt)
4. **Use Cargo** for creating, building, and running projects
5. **Manage dependencies** with Cargo.toml and understand version requirements
6. **Write and run tests** at unit, integration, and documentation levels
7. **Set up your IDE** with VS Code and rust-analyzer for a great development experience
8. **Cross-compile** for different platforms including Linux, Windows, macOS, and WebAssembly
9. **Extend Cargo** with useful subcommands like cargo-watch, cargo-audit, and cargo-expand

Rust's combination of safety, performance, and excellent tooling makes it an excellent choice for systems programming, web development, CLI tools, and much more.

## Monitoring Your Rust Applications with OneUptime

Once you have built and deployed your Rust applications, monitoring their performance and availability becomes crucial. **OneUptime** is a comprehensive open-source observability platform that can help you monitor your Rust applications effectively.

With OneUptime, you can:

- **Monitor Uptime**: Set up HTTP, TCP, or custom monitors to track your Rust web services and APIs
- **Track Performance**: Collect and visualize application metrics and response times
- **Set Up Alerts**: Configure notifications via email, SMS, Slack, or webhooks when issues arise
- **Create Status Pages**: Keep your users informed with beautiful, customizable status pages
- **Analyze Logs**: Aggregate and search through application logs for debugging
- **Track Incidents**: Manage incidents with built-in incident management workflows

Whether you are running a Rust-based web service, CLI tool, or embedded system that reports to a server, OneUptime provides the observability you need to ensure reliability and performance. Visit [oneuptime.com](https://oneuptime.com) to learn more about monitoring your Rust applications.
