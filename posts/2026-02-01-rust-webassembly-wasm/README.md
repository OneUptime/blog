# How to Build WebAssembly Modules with Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, WebAssembly, WASM, wasm-bindgen, Web Development

Description: A practical guide to building WebAssembly modules in Rust using wasm-bindgen and wasm-pack for web applications.

---

WebAssembly has changed how we think about web performance. Instead of being stuck with JavaScript for everything, you can now run near-native speed code in the browser. Rust happens to be one of the best languages for this job - it compiles to small, fast WASM binaries without a garbage collector eating into your performance budget.

I have been shipping Rust-based WASM modules in production for a while now, and this guide covers what actually matters when building them.

## Why Rust for WebAssembly?

Before diving into code, let's be clear about when Rust makes sense for WASM.

JavaScript is fine for most web applications. But when you need to process images, run cryptographic operations, parse large files, or handle computationally intensive tasks, JavaScript starts to struggle. Rust gives you predictable performance without garbage collection pauses, and WASM modules typically run 2-10x faster than equivalent JavaScript for CPU-bound work.

The Rust toolchain also has first-class WASM support. The ecosystem around wasm-pack and wasm-bindgen makes the JavaScript interop story surprisingly smooth.

## Setting Up Your Environment

You will need Rust installed first. If you do not have it yet, grab it from rustup.

The following commands install the WASM target and wasm-pack, which handles all the build complexity for you:

```bash
# Install the WebAssembly target for Rust
rustup target add wasm32-unknown-unknown

# Install wasm-pack - this tool builds, tests, and publishes WASM packages
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

## Creating Your First WASM Project

Start with a new library project. WASM modules are libraries, not executables.

```bash
# Create a new Rust library project for our WASM module
cargo new --lib wasm-calculator
cd wasm-calculator
```

The Cargo.toml file needs specific configuration for WASM output. The crate-type setting tells Rust to produce a dynamic library that wasm-pack can process:

```toml
[package]
name = "wasm-calculator"
version = "0.1.0"
edition = "2021"

# This tells Rust to build a dynamic library suitable for WASM
[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
# wasm-bindgen handles the JavaScript/Rust boundary
wasm-bindgen = "0.2"

# Optional but useful for better panic messages in the browser console
console_error_panic_hook = "0.1"

[profile.release]
# Optimize for small binary size - important for web delivery
opt-level = "s"
lto = true
```

## Your First Exported Function

The wasm_bindgen macro is what makes your Rust functions callable from JavaScript. Here is a basic example in src/lib.rs:

```rust
use wasm_bindgen::prelude::*;

// This function will be available in JavaScript as add(a, b)
// wasm_bindgen handles converting between JS numbers and Rust i32
#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

// A more practical example - calculating compound interest
// Takes principal, annual rate (as decimal), and years
#[wasm_bindgen]
pub fn compound_interest(principal: f64, rate: f64, years: u32) -> f64 {
    principal * (1.0 + rate).powi(years as i32)
}
```

Build it with wasm-pack. The --target web flag produces modules that work directly in browsers:

```bash
# Build for web browsers - creates a pkg/ directory with the WASM module
wasm-pack build --target web
```

## Using Your Module in JavaScript

After building, wasm-pack creates a pkg directory with everything you need. Here is how to load and use your module:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Rust WASM Demo</title>
</head>
<body>
    <script type="module">
        // Import the initialization function and your exported functions
        import init, { add, compound_interest } from './pkg/wasm_calculator.js';

        async function run() {
            // Always call init() first - this loads and instantiates the WASM
            await init();

            // Now you can call your Rust functions like regular JavaScript
            console.log('2 + 3 =', add(2, 3));
            
            // Calculate 10 years of 7% growth on $1000
            const future_value = compound_interest(1000, 0.07, 10);
            console.log('Investment value:', future_value.toFixed(2));
        }

        run();
    </script>
</body>
</html>
```

## Working with Strings

Strings are where things get interesting. JavaScript strings are UTF-16, Rust strings are UTF-8, and WASM only speaks numbers. wasm-bindgen handles the conversion, but you need to understand what is happening.

This example shows string handling with proper memory management:

```rust
use wasm_bindgen::prelude::*;

// Accept a JS string, process it, return a new JS string
// wasm-bindgen automatically handles the UTF-8/UTF-16 conversion
#[wasm_bindgen]
pub fn reverse_string(input: &str) -> String {
    input.chars().rev().collect()
}

// A practical example - slugifying a title for URLs
#[wasm_bindgen]
pub fn slugify(title: &str) -> String {
    title
        .to_lowercase()
        .chars()
        .map(|c| {
            if c.is_alphanumeric() {
                c
            } else if c.is_whitespace() {
                '-'
            } else {
                // Skip special characters entirely
                '\0'
            }
        })
        .filter(|c| *c != '\0')
        .collect::<String>()
        // Clean up multiple consecutive dashes
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}
```

## Handling Complex Types

Real applications need to pass structured data between JavaScript and Rust. You have two main options: using serde for automatic serialization, or creating wrapper types with wasm-bindgen.

First, add serde to your dependencies in Cargo.toml:

```toml
[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1.0", features = ["derive"] }
serde-wasm-bindgen = "0.6"
```

Now you can work with complex types. This example processes user data:

```rust
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

// Define your data structure with serde derives
#[derive(Serialize, Deserialize)]
pub struct User {
    pub name: String,
    pub email: String,
    pub age: u32,
}

#[derive(Serialize, Deserialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
}

// Accept a JsValue (any JS value) and return a JsValue
// serde_wasm_bindgen handles the conversion to/from Rust types
#[wasm_bindgen]
pub fn validate_user(user_js: JsValue) -> Result<JsValue, JsValue> {
    // Deserialize the JS object into our Rust struct
    let user: User = serde_wasm_bindgen::from_value(user_js)
        .map_err(|e| JsValue::from_str(&format!("Invalid user data: {}", e)))?;
    
    let mut errors = Vec::new();
    
    // Run validation checks
    if user.name.trim().is_empty() {
        errors.push("Name cannot be empty".to_string());
    }
    
    if !user.email.contains('@') {
        errors.push("Invalid email format".to_string());
    }
    
    if user.age < 13 {
        errors.push("User must be at least 13 years old".to_string());
    }
    
    let result = ValidationResult {
        valid: errors.is_empty(),
        errors,
    };
    
    // Serialize back to a JS object
    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}
```

Calling this from JavaScript is straightforward:

```javascript
import init, { validate_user } from './pkg/your_module.js';

await init();

const user = {
    name: "Jane Doe",
    email: "jane@example.com",
    age: 28
};

const result = validate_user(user);
console.log('Valid:', result.valid);
console.log('Errors:', result.errors);
```

## Performance-Critical: Working with Binary Data

For image processing, file parsing, or any binary data work, you want to avoid copying data between JavaScript and WASM memory. Use typed arrays:

```rust
use wasm_bindgen::prelude::*;

// Process image data in place - useful for filters, transformations, etc.
// Takes a Uint8ClampedArray from a canvas ImageData object
#[wasm_bindgen]
pub fn grayscale(data: &mut [u8]) {
    // ImageData is RGBA format - 4 bytes per pixel
    for chunk in data.chunks_exact_mut(4) {
        let r = chunk[0] as f32;
        let g = chunk[1] as f32;
        let b = chunk[2] as f32;
        
        // Standard grayscale conversion weights
        let gray = (0.299 * r + 0.587 * g + 0.114 * b) as u8;
        
        chunk[0] = gray;
        chunk[1] = gray;
        chunk[2] = gray;
        // Alpha channel (chunk[3]) remains unchanged
    }
}

// Example: invert colors
#[wasm_bindgen]
pub fn invert_colors(data: &mut [u8]) {
    for chunk in data.chunks_exact_mut(4) {
        chunk[0] = 255 - chunk[0];
        chunk[1] = 255 - chunk[1];
        chunk[2] = 255 - chunk[2];
    }
}
```

Using this with canvas in JavaScript:

```javascript
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

// Pass the raw pixel data to Rust - this is a view into WASM memory
grayscale(imageData.data);

// Put the modified data back
ctx.putImageData(imageData, 0, 0);
```

## Debugging WASM Modules

Debugging WASM can be frustrating without proper setup. Start by installing the panic hook in your module:

```rust
use wasm_bindgen::prelude::*;

// Call this once when your module loads
#[wasm_bindgen(start)]
pub fn init_panic_hook() {
    // This gives you actual Rust panic messages in the browser console
    // instead of cryptic "unreachable executed" errors
    console_error_panic_hook::set_once();
}

// You can also log to the browser console directly
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
    
    #[wasm_bindgen(js_namespace = console)]
    fn error(s: &str);
}

// A helper macro for console logging from Rust
macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

#[wasm_bindgen]
pub fn process_with_logging(input: &str) -> String {
    console_log!("Processing input: {}", input);
    
    let result = input.to_uppercase();
    
    console_log!("Result: {}", result);
    result
}
```

For source-level debugging, build with debug info:

```bash
# Build with debug symbols - larger file but enables browser debugger support
wasm-pack build --target web --dev
```

Chrome and Firefox both support WASM debugging. Open DevTools, go to Sources, and you can set breakpoints in your Rust code.

## Publishing to npm

Once your module works, publishing to npm lets anyone use it. wasm-pack handles this:

```bash
# Build with npm as the target
wasm-pack build --target bundler

# Login to npm (you need an npm account)
wasm-pack login

# Publish the package
wasm-pack publish
```

For bundler integration (webpack, vite, etc.), the --target bundler flag is what you want. Users can then install your package normally:

```bash
npm install your-wasm-package
```

And import it like any other npm package:

```javascript
import { add, compound_interest } from 'your-wasm-package';

// The WASM initialization happens automatically with most bundlers
```

## Testing Your WASM Code

wasm-pack includes a test runner that executes tests in a real browser:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    // This tells wasm-bindgen-test to run in a browser
    wasm_bindgen_test_configure!(run_in_browser);

    #[wasm_bindgen_test]
    fn test_add() {
        assert_eq!(add(2, 3), 5);
        assert_eq!(add(-1, 1), 0);
    }

    #[wasm_bindgen_test]
    fn test_slugify() {
        assert_eq!(slugify("Hello World"), "hello-world");
        assert_eq!(slugify("Rust & WASM!"), "rust-wasm");
    }
}
```

Run tests with:

```bash
# Run tests in headless Chrome
wasm-pack test --headless --chrome
```

## Common Pitfalls

A few things that trip people up:

Memory is not automatically shared. Every time you pass a string or array to WASM, it gets copied. For large data, consider keeping it in WASM memory and passing handles.

WASM is single-threaded by default. You can use Web Workers for parallelism, but each worker needs its own WASM instance.

Binary size matters. Every kilobyte counts for web delivery. Use --release builds, enable LTO, and consider wasm-opt for additional optimization:

```bash
# Install wasm-opt
npm install -g wasm-opt

# Optimize your WASM binary for size
wasm-opt -Os pkg/your_module_bg.wasm -o pkg/your_module_bg.wasm
```

## Wrapping Up

Rust and WebAssembly work well together. The tooling has matured significantly, and wasm-bindgen handles most of the painful interop details. Start with compute-heavy functions where JavaScript struggles, measure the performance difference, and expand from there.

The best approach is incremental. Keep your JavaScript codebase, identify bottlenecks, and replace those specific pieces with WASM modules. You do not need to rewrite everything in Rust to see benefits.

---

*Monitor your web applications with [OneUptime](https://oneuptime.com) - track performance and errors in production.*
