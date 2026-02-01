# How to Profile and Optimize Rust Code for Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, Profiling, Performance, Optimization, Benchmarking

Description: A practical guide to profiling Rust applications using perf, flamegraph, and criterion for performance optimization.

---

Rust promises zero-cost abstractions and blazing-fast performance, but that doesn't mean your code is automatically optimal. I've seen plenty of Rust applications that run slower than their Python counterparts because nobody bothered to profile them. The compiler does a lot of heavy lifting, but it can't fix algorithmic inefficiencies or memory access patterns that thrash your CPU cache.

This guide walks through the practical tools and techniques for finding performance bottlenecks in Rust code and fixing them. We'll cover benchmarking with criterion, profiling with perf, generating flamegraphs, and memory profiling - all with real examples you can apply to your own projects.

## Start with Benchmarks, Not Guesses

Before optimizing anything, you need baseline measurements. Guessing where your code is slow almost always leads you down the wrong path. The Rust ecosystem has excellent tooling for this.

### Using cargo bench with criterion

The built-in `cargo bench` works, but criterion provides statistical rigor that catches you when results are just noise. It runs your benchmarks multiple times, computes confidence intervals, and tells you if changes are statistically significant.

First, add criterion to your project:

```toml
# Add to Cargo.toml - criterion goes in dev-dependencies since benchmarks only run during development
[dev-dependencies]
criterion = { version = "0.5", features = ["html_reports"] }

[[bench]]
name = "my_benchmark"
harness = false
```

Now create a benchmark file that tests the actual functions you care about:

```rust
// benches/my_benchmark.rs
// This benchmark compares two approaches to summing a vector
// The goal is to demonstrate how criterion detects performance differences

use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};

fn sum_iterator(data: &[i64]) -> i64 {
    data.iter().sum()
}

fn sum_loop(data: &[i64]) -> i64 {
    let mut total = 0;
    for &item in data {
        total += item;
    }
    total
}

fn benchmark_sums(c: &mut Criterion) {
    let data: Vec<i64> = (0..10_000).collect();
    
    let mut group = c.benchmark_group("sum_comparison");
    
    // black_box prevents the compiler from optimizing away our test data
    // Without it, the compiler might pre-compute the result at compile time
    group.bench_function("iterator", |b| {
        b.iter(|| sum_iterator(black_box(&data)))
    });
    
    group.bench_function("manual_loop", |b| {
        b.iter(|| sum_loop(black_box(&data)))
    });
    
    group.finish();
}

criterion_group!(benches, benchmark_sums);
criterion_main!(benches);
```

Run your benchmarks with:

```bash
# Run all benchmarks and generate HTML reports in target/criterion/
cargo bench
```

Criterion outputs something like this:

```
sum_comparison/iterator time:   [2.4521 µs 2.4598 µs 2.4682 µs]
sum_comparison/manual_loop
                        time:   [2.4489 µs 2.4567 µs 2.4651 µs]
```

The three values represent the confidence interval. If ranges overlap significantly between runs, the difference isn't statistically meaningful - don't chase phantom optimizations.

### Benchmarking with Different Input Sizes

Real performance characteristics often depend on input size. A function might be faster for small inputs but terrible at scale:

```rust
// This benchmark tests how performance scales with input size
// Useful for detecting O(n^2) algorithms hiding in seemingly innocent code

fn benchmark_scaling(c: &mut Criterion) {
    let mut group = c.benchmark_group("scaling_test");
    
    // Test across multiple input sizes to see the scaling behavior
    for size in [100, 1000, 10_000, 100_000].iter() {
        let data: Vec<i64> = (0..*size).collect();
        
        group.bench_with_input(
            BenchmarkId::new("sum", size),
            &data,
            |b, data| b.iter(|| sum_iterator(black_box(data))),
        );
    }
    
    group.finish();
}
```

## Profiling with perf

Benchmarks tell you how fast something runs. Profiling tells you where the time goes. On Linux, perf is the go-to tool for CPU profiling.

First, build your binary with debug symbols but still optimized:

```toml
# Add to Cargo.toml - this keeps debug symbols in release builds
# Debug symbols add about 10-20% to binary size but don't affect runtime performance

[profile.release]
debug = true
```

Now run your program under perf:

```bash
# Record performance data while running your program
# -g enables call graph recording so you can see the full call stack
perf record -g --call-graph dwarf ./target/release/my_program

# Generate a human-readable report
# This shows which functions consumed the most CPU time
perf report
```

The perf report interface is interactive. Use arrow keys to navigate and Enter to drill into functions. Look for functions that consume unexpectedly high percentages of time.

### Interpreting perf Output

Here's what a typical perf report looks like:

```
Samples: 15K of event 'cycles', Event count (approx.): 12847293847
Overhead  Command    Shared Object       Symbol
  45.23%  my_prog    my_prog             [.] expensive_function
  12.45%  my_prog    my_prog             [.] process_data
   8.91%  my_prog    libc-2.31.so        [.] malloc
   6.34%  my_prog    my_prog             [.] parse_input
```

That 8.91% in malloc is a red flag. If memory allocation shows up prominently, you're probably allocating in a hot loop. We'll address that later.

## Generating Flamegraphs

Flamegraphs visualize profiling data as stacked rectangles. Width represents time spent, and the stack shows the call hierarchy. They make it immediately obvious where time goes.

Install the flamegraph tool:

```bash
# cargo-flamegraph wraps perf and generates SVG flamegraphs automatically
cargo install flamegraph
```

Generate a flamegraph for your program:

```bash
# This runs your program under perf and generates flamegraph.svg
# The --root flag is sometimes needed on systems with restricted perf access
cargo flamegraph --root -- ./target/release/my_program arg1 arg2
```

For benchmarks specifically, you can generate flamegraphs during criterion runs:

```bash
# Profile a specific benchmark and generate a flamegraph
cargo flamegraph --bench my_benchmark -- --bench "sum_comparison"
```

When reading flamegraphs, look for wide plateaus - these are functions where significant time is spent. Tall narrow towers indicate deep call stacks but aren't necessarily problems unless they're also wide.

## Memory Profiling

CPU time is only half the story. Memory allocation patterns can devastate performance even when your algorithms are optimal. Every allocation hits the system allocator, which involves locks and bookkeeping.

### Using DHAT for Allocation Profiling

DHAT (Dynamic Heap Allocation Tool) comes with Valgrind and shows exactly where allocations happen:

```bash
# Run your program under DHAT to track all heap allocations
# The output shows allocation sites, sizes, and frequencies
valgrind --tool=dhat ./target/release/my_program
```

For Rust-specific tooling, the dhat crate provides similar functionality:

```rust
// Add to your main.rs for profiling runs only
// This tracks every allocation and produces a report on exit

#[cfg(feature = "dhat-heap")]
#[global_allocator]
static ALLOC: dhat::Alloc = dhat::Alloc;

fn main() {
    #[cfg(feature = "dhat-heap")]
    let _profiler = dhat::Profiler::new_heap();
    
    // Your actual program logic here
    run_application();
}
```

### Tracking Allocations with a Custom Allocator

For quick-and-dirty allocation counting, wrap the global allocator:

```rust
// This custom allocator counts allocations during program execution
// Useful for verifying that optimization changes actually reduced allocations

use std::alloc::{GlobalAlloc, Layout, System};
use std::sync::atomic::{AtomicUsize, Ordering};

static ALLOCATION_COUNT: AtomicUsize = AtomicUsize::new(0);

struct CountingAllocator;

unsafe impl GlobalAlloc for CountingAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        ALLOCATION_COUNT.fetch_add(1, Ordering::Relaxed);
        System.alloc(layout)
    }

    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        System.dealloc(ptr, layout)
    }
}

#[global_allocator]
static GLOBAL: CountingAllocator = CountingAllocator;

pub fn get_allocation_count() -> usize {
    ALLOCATION_COUNT.load(Ordering::Relaxed)
}
```

## Common Optimization Patterns

Now that you can measure things, here are the optimizations that actually matter in real Rust code.

### Avoid Allocations in Hot Loops

This is the number one performance killer I see in Rust code:

```rust
// BAD: Allocates a new String on every iteration
fn process_items_bad(items: &[&str]) -> Vec<String> {
    items.iter()
        .map(|s| format!("processed: {}", s))  // Allocates every time
        .collect()
}

// BETTER: Pre-allocate the result vector
fn process_items_better(items: &[&str]) -> Vec<String> {
    let mut results = Vec::with_capacity(items.len());  // Single allocation
    for s in items {
        results.push(format!("processed: {}", s));
    }
    results
}

// BEST: Reuse a buffer when possible
fn process_items_best(items: &[&str], buffer: &mut String) -> Vec<String> {
    let mut results = Vec::with_capacity(items.len());
    for s in items {
        buffer.clear();  // Reuse allocation
        buffer.push_str("processed: ");
        buffer.push_str(s);
        results.push(buffer.clone());
    }
    results
}
```

### Use Arrays Instead of Vectors for Fixed Sizes

When you know the size at compile time, arrays avoid heap allocation entirely:

```rust
// Vector version - heap allocated
fn compute_with_vec() -> i64 {
    let data: Vec<i64> = vec![1, 2, 3, 4, 5];
    data.iter().sum()
}

// Array version - stack allocated, no heap interaction
fn compute_with_array() -> i64 {
    let data: [i64; 5] = [1, 2, 3, 4, 5];
    data.iter().sum()
}
```

### Clone Less, Borrow More

Excessive cloning shows up constantly in perf profiles. Rust's ownership system exists precisely to avoid unnecessary copies:

```rust
// BAD: Clones the entire vector unnecessarily
fn process_data_bad(data: Vec<String>) -> usize {
    let cloned = data.clone();  // Expensive deep copy
    cloned.len()
}

// GOOD: Borrows instead of cloning
fn process_data_good(data: &[String]) -> usize {
    data.len()  // No copy needed
}

// When you need ownership, take it explicitly
fn consume_data(data: Vec<String>) -> usize {
    // Caller transfers ownership - no clone needed
    data.into_iter().map(|s| s.len()).sum()
}
```

### Use Iterators Instead of Index Loops

Iterators often compile to better code because they give the compiler more information about access patterns:

```rust
// Index-based loop - compiler must prove bounds checks can be eliminated
fn sum_indexed(data: &[i64]) -> i64 {
    let mut sum = 0;
    for i in 0..data.len() {
        sum += data[i];  // Bounds check on every access
    }
    sum
}

// Iterator-based - no bounds checks needed
fn sum_iterator(data: &[i64]) -> i64 {
    data.iter().sum()  // Compiler knows this is safe
}
```

### Cache-Friendly Data Structures

Modern CPUs are fast but memory is slow. Keeping data contiguous improves cache utilization dramatically:

```rust
// BAD: Each Box is a separate heap allocation
// Traversing this list causes cache misses on every element
struct LinkedNode {
    value: i64,
    next: Option<Box<LinkedNode>>,
}

// GOOD: All data in contiguous memory
// Traversal is cache-friendly
struct ContiguousData {
    values: Vec<i64>,
}
```

### Use release mode and LTO

This seems obvious but people forget. Debug builds can be 10-50x slower:

```toml
# For maximum release performance, add to Cargo.toml
[profile.release]
lto = true           # Link-time optimization across crates
codegen-units = 1    # Better optimization at cost of compile time
panic = "abort"      # Smaller binary, slightly faster
```

## Putting It All Together

Here's a workflow that actually works:

1. Write benchmarks for the code paths you care about
2. Run benchmarks to establish a baseline
3. Profile with perf or flamegraph to find hotspots
4. Check memory profiling if allocations show up in perf
5. Apply targeted optimizations to the specific hotspots
6. Re-run benchmarks to verify improvement
7. Repeat until satisfied

Don't optimize blindly. Don't optimize prematurely. Profile first, then fix what the data tells you to fix. I've wasted entire days optimizing functions that weren't even in the hot path because I assumed I knew where the problem was.

The tools exist. Use them.

---

*Get production performance insights with [OneUptime](https://oneuptime.com) - continuous profiling for Rust applications.*
