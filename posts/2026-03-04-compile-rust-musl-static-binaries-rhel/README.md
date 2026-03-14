# How to Compile Rust Applications with musl for Static Binaries on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Rust, Musl, Static Linking, Development, Linux

Description: Build fully static Rust binaries on RHEL using the musl libc target, producing self-contained executables that run on any Linux distribution.

---

By default, Rust on RHEL links against glibc dynamically. Using the musl target produces fully static binaries that run on any Linux system without library dependencies.

## Install Prerequisites

```bash
# Install musl tools
sudo dnf install -y musl-gcc musl-libc-static musl-devel

# If musl is not in the default repos, install from EPEL
sudo dnf install -y epel-release
sudo dnf install -y musl-gcc musl-libc-static
```

## Add the musl Target

```bash
# Add the x86_64 musl target to Rust
rustup target add x86_64-unknown-linux-musl

# Verify it is installed
rustup target list --installed
```

## Build a Static Binary

```bash
# Create a sample project
cargo new static-app && cd static-app
```

```rust
// src/main.rs
use std::net::TcpListener;
use std::io::Write;

fn main() {
    let listener = TcpListener::bind("0.0.0.0:8080").unwrap();
    println!("Listening on port 8080");

    for stream in listener.incoming() {
        if let Ok(mut stream) = stream {
            let response = "HTTP/1.1 200 OK\r\nContent-Length: 13\r\n\r\nHello, World!";
            stream.write_all(response.as_bytes()).unwrap();
        }
    }
}
```

```bash
# Build with the musl target
cargo build --release --target x86_64-unknown-linux-musl

# Verify the binary is statically linked
file target/x86_64-unknown-linux-musl/release/static-app
# Output: ELF 64-bit LSB executable, ... statically linked ...

# Confirm no dynamic library dependencies
ldd target/x86_64-unknown-linux-musl/release/static-app
# Output: not a dynamic executable
```

## Configure Cargo for musl Builds

Create a `.cargo/config.toml` for the project:

```toml
# .cargo/config.toml

[target.x86_64-unknown-linux-musl]
linker = "musl-gcc"

# Strip debug symbols for smaller binaries
rustflags = ["-C", "target-feature=+crt-static", "-C", "strip=symbols"]
```

Now `cargo build --release --target x86_64-unknown-linux-musl` uses these settings automatically.

## Build with TLS Support

Many applications need TLS. Use rustls instead of OpenSSL for easier static compilation:

```toml
# Cargo.toml - use rustls instead of openssl
[dependencies]
reqwest = { version = "0.11", features = ["rustls-tls"], default-features = false }
tokio = { version = "1", features = ["full"] }
```

If you must use OpenSSL statically:

```bash
# Install static OpenSSL for musl
sudo dnf install -y openssl-static

# Set environment variables for the build
export OPENSSL_STATIC=1
export OPENSSL_DIR=/usr

cargo build --release --target x86_64-unknown-linux-musl
```

## Compare Binary Sizes

```bash
# Dynamic (glibc) build
cargo build --release
ls -lh target/release/static-app

# Static (musl) build
cargo build --release --target x86_64-unknown-linux-musl
ls -lh target/x86_64-unknown-linux-musl/release/static-app

# Strip the binary for minimum size
strip target/x86_64-unknown-linux-musl/release/static-app
ls -lh target/x86_64-unknown-linux-musl/release/static-app
```

Static musl binaries are ideal for container images (use `FROM scratch`), embedded systems, or distributing to systems where you cannot control the installed libraries.
