# How to Install Rust and Cargo on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Rust, Cargo, Development, Programming, Linux

Description: Install the Rust programming language and Cargo package manager on RHEL using rustup for easy version management and updates.

---

Rust is a systems programming language focused on safety, concurrency, and performance. The recommended way to install Rust on RHEL is through rustup, the official installer.

## Install Prerequisites

```bash
# Install build essentials
sudo dnf install -y gcc gcc-c++ make curl
```

## Install Rust with rustup

```bash
# Download and run the rustup installer
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# When prompted, select option 1 (default installation)

# Load Rust into your current shell
source "$HOME/.cargo/env"
```

## Verify Installation

```bash
# Check Rust compiler version
rustc --version

# Check Cargo (package manager) version
cargo --version

# Check rustup version
rustup --version

# Show installed toolchains
rustup show
```

## Create and Build a Rust Project

```bash
# Create a new project
cargo new hello_rhel
cd hello_rhel
```

The generated `src/main.rs`:

```rust
// src/main.rs
fn main() {
    // Print system information
    println!("Hello from Rust on RHEL!");

    // Demonstrate basic Rust features
    let numbers = vec![1, 2, 3, 4, 5];
    let sum: i32 = numbers.iter().sum();
    println!("Sum of {:?} = {}", numbers, sum);
}
```

```bash
# Build the project (debug mode)
cargo build

# Run the project
cargo run

# Build for release (optimized)
cargo build --release

# The release binary is at target/release/hello_rhel
ls -lh target/release/hello_rhel
```

## Manage Rust Toolchains

```bash
# Update Rust to the latest stable version
rustup update

# Install the nightly toolchain
rustup toolchain install nightly

# Switch to nightly for the current project
rustup override set nightly

# Switch back to stable
rustup override set stable

# Install a specific version
rustup toolchain install 1.75.0
```

## Install Useful Components

```bash
# Install rust-analyzer (LSP for IDE support)
rustup component add rust-analyzer

# Install clippy (linter)
rustup component add clippy

# Install rustfmt (code formatter)
rustup component add rustfmt

# Use them
cargo clippy        # Run linter
cargo fmt           # Format code
cargo test          # Run tests
cargo doc --open    # Generate and open documentation
```

## Add Cargo to System PATH Permanently

```bash
# rustup adds this automatically, but verify it is in your profile
grep -q '.cargo/env' ~/.bashrc || echo 'source "$HOME/.cargo/env"' >> ~/.bashrc
```

## Uninstall Rust

```bash
# If you ever need to remove Rust completely
rustup self uninstall
```

Rust's ownership model and compile-time checks make it excellent for building reliable system tools and services on RHEL.
