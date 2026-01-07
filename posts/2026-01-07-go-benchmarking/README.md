# How to Benchmark Go Code with testing.B

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Benchmarking, Performance, Testing, Optimization

Description: Write effective benchmarks in Go using testing.B to identify performance regressions, compare implementations, and optimize critical code paths.

---

Performance is a critical aspect of software development, and Go provides first-class support for benchmarking through its standard `testing` package. Whether you are optimizing a hot code path, comparing algorithm implementations, or guarding against performance regressions in CI, understanding how to write effective benchmarks with `testing.B` is essential for any Go developer.

In this comprehensive guide, we will explore everything from basic benchmark syntax to advanced techniques for memory profiling, sub-benchmarks, and CI integration.

## Understanding Benchmark Basics

Go benchmarks live alongside your tests in `_test.go` files and follow a specific naming convention. A benchmark function must start with `Benchmark` and accept a single parameter of type `*testing.B`.

### Your First Benchmark

Let us start with a simple example. Suppose you have a function that concatenates strings:

```go
// concat.go - A simple string concatenation function
package concat

// ConcatStrings concatenates multiple strings using a simple loop
func ConcatStrings(strs []string) string {
    result := ""
    for _, s := range strs {
        result += s
    }
    return result
}
```

Here is how you would benchmark this function:

```go
// concat_test.go - Benchmark for string concatenation
package concat

import "testing"

// BenchmarkConcatStrings measures the performance of string concatenation
// The function name must start with "Benchmark" and accept *testing.B
func BenchmarkConcatStrings(b *testing.B) {
    // Prepare test data outside the benchmark loop
    strs := []string{"hello", "world", "from", "go", "benchmark"}

    // The benchmark loop - always use b.N iterations
    for i := 0; i < b.N; i++ {
        ConcatStrings(strs)
    }
}
```

Run this benchmark with:

```bash
# Run all benchmarks in the current package
go test -bench=.

# Run a specific benchmark by name pattern
go test -bench=BenchmarkConcatStrings

# Run benchmarks with verbose output
go test -bench=. -v
```

## Understanding b.N and Iteration Counting

The `b.N` field is the heart of Go benchmarks. It is not a fixed value you set; instead, the benchmark framework automatically adjusts it to run the benchmark function enough times to produce statistically meaningful results.

### How b.N Works

When you run a benchmark, Go starts with a small value of `b.N` (typically 1) and measures how long the function takes. It then increases `b.N` and runs again, continuing this process until the benchmark runs for at least one second (by default). This adaptive approach ensures benchmarks are both fast and accurate.

```go
// iterations_test.go - Demonstrating b.N behavior
package demo

import (
    "testing"
    "time"
)

// BenchmarkShowIterations shows how b.N increases over multiple runs
// Do NOT use time.Sleep in real benchmarks - this is for demonstration only
func BenchmarkShowIterations(b *testing.B) {
    b.Logf("b.N = %d", b.N)
    for i := 0; i < b.N; i++ {
        // Simulated work
        time.Sleep(time.Microsecond)
    }
}
```

### Important Rules for b.N

Always follow these rules when working with `b.N`:

```go
// rules_test.go - Correct and incorrect usage of b.N
package demo

import "testing"

// CORRECT: Loop exactly b.N times
func BenchmarkCorrect(b *testing.B) {
    for i := 0; i < b.N; i++ {
        // Your code here
    }
}

// INCORRECT: Never modify b.N or use it for anything other than loop count
func BenchmarkIncorrect(b *testing.B) {
    // DON'T DO THIS - modifying b.N breaks the benchmark
    b.N = 1000
    for i := 0; i < b.N; i++ {
        // This will not produce accurate results
    }
}

// INCORRECT: Never divide work by b.N
func BenchmarkAlsoIncorrect(b *testing.B) {
    data := make([]int, 1000)
    // DON'T DO THIS - work per iteration should be constant
    chunkSize := len(data) / b.N
    for i := 0; i < b.N; i++ {
        // Process chunk - this is wrong!
        _ = data[i*chunkSize : (i+1)*chunkSize]
    }
}
```

## Sub-Benchmarks with b.Run

Sub-benchmarks allow you to organize related benchmarks and run them with different parameters. This is incredibly useful for comparing implementations or testing with various input sizes.

### Basic Sub-Benchmarks

```go
// subbench_test.go - Using sub-benchmarks to compare implementations
package concat

import (
    "strings"
    "testing"
)

// BenchmarkStringConcat compares different string concatenation methods
func BenchmarkStringConcat(b *testing.B) {
    strs := []string{"hello", "world", "from", "go", "benchmark"}

    // Sub-benchmark for naive concatenation using + operator
    b.Run("NaiveConcat", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            result := ""
            for _, s := range strs {
                result += s
            }
            _ = result
        }
    })

    // Sub-benchmark for strings.Join
    b.Run("StringsJoin", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            _ = strings.Join(strs, "")
        }
    })

    // Sub-benchmark for strings.Builder
    b.Run("StringBuilder", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            var sb strings.Builder
            for _, s := range strs {
                sb.WriteString(s)
            }
            _ = sb.String()
        }
    })
}
```

Run sub-benchmarks with:

```bash
# Run all sub-benchmarks
go test -bench=BenchmarkStringConcat

# Run a specific sub-benchmark
go test -bench=BenchmarkStringConcat/StringBuilder
```

### Table-Driven Benchmarks

Table-driven benchmarks are excellent for testing performance across different input sizes:

```go
// table_bench_test.go - Table-driven benchmarks for various input sizes
package search

import "testing"

// LinearSearch performs a simple linear search through a slice
func LinearSearch(data []int, target int) int {
    for i, v := range data {
        if v == target {
            return i
        }
    }
    return -1
}

// BenchmarkLinearSearch tests search performance with different slice sizes
func BenchmarkLinearSearch(b *testing.B) {
    // Define test cases with different sizes
    sizes := []struct {
        name string
        size int
    }{
        {"Small-100", 100},
        {"Medium-1000", 1000},
        {"Large-10000", 10000},
        {"XLarge-100000", 100000},
    }

    for _, tc := range sizes {
        // Create test data for this size
        data := make([]int, tc.size)
        for i := range data {
            data[i] = i
        }
        // Search for element at the end (worst case)
        target := tc.size - 1

        b.Run(tc.name, func(b *testing.B) {
            for i := 0; i < b.N; i++ {
                LinearSearch(data, target)
            }
        })
    }
}
```

## Memory Allocation Benchmarks

Memory allocations can significantly impact performance. Go benchmarks can track allocations using the `-benchmem` flag and `b.ReportAllocs()`.

### Using -benchmem Flag

```bash
# Run benchmarks with memory allocation statistics
go test -bench=. -benchmem
```

This produces output like:

```
BenchmarkConcatStrings-8    1000000    1052 ns/op    176 B/op    5 allocs/op
```

The additional columns show:
- `176 B/op`: bytes allocated per operation
- `5 allocs/op`: allocations per operation

### Using b.ReportAllocs()

You can also enable allocation reporting programmatically:

```go
// alloc_bench_test.go - Memory allocation benchmarks
package memory

import (
    "strings"
    "testing"
)

// BenchmarkAllocations demonstrates memory allocation tracking
func BenchmarkAllocations(b *testing.B) {
    b.Run("WithPreallocation", func(b *testing.B) {
        // Enable allocation reporting for this sub-benchmark
        b.ReportAllocs()

        for i := 0; i < b.N; i++ {
            // Preallocate slice with known capacity
            data := make([]int, 0, 1000)
            for j := 0; j < 1000; j++ {
                data = append(data, j)
            }
        }
    })

    b.Run("WithoutPreallocation", func(b *testing.B) {
        b.ReportAllocs()

        for i := 0; i < b.N; i++ {
            // Slice grows dynamically, causing multiple allocations
            var data []int
            for j := 0; j < 1000; j++ {
                data = append(data, j)
            }
        }
    })
}

// BenchmarkStringBuilder compares string building strategies
func BenchmarkStringBuilder(b *testing.B) {
    words := make([]string, 100)
    for i := range words {
        words[i] = "word"
    }

    b.Run("Builder-NoGrow", func(b *testing.B) {
        b.ReportAllocs()
        for i := 0; i < b.N; i++ {
            var sb strings.Builder
            for _, w := range words {
                sb.WriteString(w)
            }
            _ = sb.String()
        }
    })

    b.Run("Builder-WithGrow", func(b *testing.B) {
        b.ReportAllocs()
        for i := 0; i < b.N; i++ {
            var sb strings.Builder
            // Preallocate buffer space
            sb.Grow(len(words) * 4)
            for _, w := range words {
                sb.WriteString(w)
            }
            _ = sb.String()
        }
    })
}
```

## Benchmark Setup and Cleanup

Sometimes benchmarks require expensive setup or cleanup. Use `b.ResetTimer()`, `b.StopTimer()`, and `b.StartTimer()` to exclude this time from measurements.

### Using b.ResetTimer()

```go
// setup_bench_test.go - Handling benchmark setup properly
package db

import (
    "testing"
)

// MockDatabase simulates an expensive-to-create database connection
type MockDatabase struct {
    data map[string]string
}

func NewMockDatabase(size int) *MockDatabase {
    db := &MockDatabase{data: make(map[string]string)}
    for i := 0; i < size; i++ {
        db.data[string(rune('a'+i%26))] = "value"
    }
    return db
}

func (db *MockDatabase) Query(key string) string {
    return db.data[key]
}

// BenchmarkDatabaseQuery excludes setup time from the benchmark
func BenchmarkDatabaseQuery(b *testing.B) {
    // Expensive setup - create database with lots of data
    db := NewMockDatabase(10000)

    // Reset timer to exclude setup time from measurements
    b.ResetTimer()

    for i := 0; i < b.N; i++ {
        db.Query("m")
    }
}
```

### Using b.StopTimer() and b.StartTimer()

For setup required within the loop:

```go
// stopstart_bench_test.go - Pausing the timer for per-iteration setup
package processing

import (
    "math/rand"
    "sort"
    "testing"
)

// BenchmarkSorting benchmarks sort while excluding data generation
func BenchmarkSorting(b *testing.B) {
    for i := 0; i < b.N; i++ {
        // Stop timer during data generation
        b.StopTimer()

        // Generate random data for each iteration
        data := make([]int, 1000)
        for j := range data {
            data[j] = rand.Intn(10000)
        }

        // Resume timer before the operation we want to measure
        b.StartTimer()

        sort.Ints(data)
    }
}
```

**Note**: Use `b.StopTimer()` and `b.StartTimer()` sparingly as they can introduce measurement noise when called frequently.

## Comparing Benchmark Results with benchstat

The `benchstat` tool is essential for comparing benchmark results between code changes. It provides statistical analysis to determine if performance differences are significant.

### Installing benchstat

```bash
# Install benchstat
go install golang.org/x/perf/cmd/benchstat@latest
```

### Collecting Benchmark Data

```bash
# Run benchmarks multiple times for statistical significance
# Save baseline results before making changes
go test -bench=. -count=10 > old.txt

# Make your code changes, then run again
go test -bench=. -count=10 > new.txt

# Compare the results
benchstat old.txt new.txt
```

### Understanding benchstat Output

```
name                 old time/op    new time/op    delta
StringConcat-8       1.05us +/- 2%  0.52us +/- 1%  -50.48% (p=0.000 n=10+10)

name                 old alloc/op   new alloc/op   delta
StringConcat-8       176B +/- 0%    64B +/- 0%     -63.64% (p=0.000 n=10+10)

name                 old allocs/op  new allocs/op  delta
StringConcat-8       5.00 +/- 0%    1.00 +/- 0%    -80.00% (p=0.000 n=10+10)
```

Key metrics:
- `+/- X%`: variance in measurements
- `delta`: percentage change between old and new
- `p=0.000`: p-value indicating statistical significance (lower is better)
- `n=10+10`: number of samples used from each run

### Creating a Benchmarking Script

Here is a script to automate benchmark comparison:

```bash
#!/bin/bash
# benchmark_compare.sh - Compare benchmark results between git branches

set -e

BENCH_PATTERN="${1:-.}"
BRANCH_OLD="${2:-main}"
BRANCH_NEW="${3:-HEAD}"
COUNT="${4:-10}"

echo "Comparing benchmarks: $BRANCH_OLD vs $BRANCH_NEW"
echo "Pattern: $BENCH_PATTERN, Count: $COUNT"

# Save current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Run benchmarks on old branch
echo "Running benchmarks on $BRANCH_OLD..."
git checkout "$BRANCH_OLD" --quiet
go test -bench="$BENCH_PATTERN" -benchmem -count="$COUNT" > /tmp/bench_old.txt

# Run benchmarks on new branch
echo "Running benchmarks on $BRANCH_NEW..."
git checkout "$BRANCH_NEW" --quiet
go test -bench="$BENCH_PATTERN" -benchmem -count="$COUNT" > /tmp/bench_new.txt

# Return to original branch
git checkout "$CURRENT_BRANCH" --quiet

# Compare results
echo ""
echo "=== Benchmark Comparison ==="
benchstat /tmp/bench_old.txt /tmp/bench_new.txt
```

## Avoiding Common Pitfalls

### Compiler Optimizations

The Go compiler is smart and may optimize away code that has no observable side effects. This can lead to benchmarks that appear extremely fast but are not measuring anything useful.

```go
// pitfalls_test.go - Avoiding compiler optimization issues
package pitfalls

import "testing"

// computeValue performs some computation
func computeValue(n int) int {
    result := 0
    for i := 0; i < n; i++ {
        result += i * i
    }
    return result
}

// BAD: Result is discarded, compiler may optimize away the call
func BenchmarkBad(b *testing.B) {
    for i := 0; i < b.N; i++ {
        computeValue(100) // Result unused - may be optimized away!
    }
}

// GOOD: Use a package-level variable to prevent optimization
var result int

func BenchmarkGood(b *testing.B) {
    var r int
    for i := 0; i < b.N; i++ {
        r = computeValue(100)
    }
    // Assign to package-level variable to ensure computation happens
    result = r
}

// ALTERNATIVE: Use b.StopTimer to assign result
func BenchmarkAlternative(b *testing.B) {
    var r int
    for i := 0; i < b.N; i++ {
        r = computeValue(100)
    }
    b.StopTimer()
    if r == 0 {
        b.Fatal("unexpected zero result")
    }
}
```

### Avoiding Setup in the Loop

```go
// setup_in_loop_test.go - Common mistake: putting setup inside the loop
package pitfalls

import "testing"

// BAD: Data creation is measured along with the operation
func BenchmarkBadSetup(b *testing.B) {
    for i := 0; i < b.N; i++ {
        // This allocation happens every iteration and skews results
        data := make([]int, 1000)
        for j := range data {
            data[j] = j
        }
        // Actual operation we want to measure
        sum := 0
        for _, v := range data {
            sum += v
        }
    }
}

// GOOD: Move setup outside the loop
func BenchmarkGoodSetup(b *testing.B) {
    // Create data once before the benchmark loop
    data := make([]int, 1000)
    for j := range data {
        data[j] = j
    }

    b.ResetTimer()

    for i := 0; i < b.N; i++ {
        sum := 0
        for _, v := range data {
            sum += v
        }
        _ = sum
    }
}
```

### Benchmark Interference

```go
// interference_test.go - Avoiding interference between benchmarks
package pitfalls

import (
    "sync"
    "testing"
)

// Global state can cause interference between benchmarks
var globalCache = make(map[string]string)
var globalMutex sync.Mutex

// BAD: Benchmarks that share global state may interfere
func BenchmarkWithGlobalState(b *testing.B) {
    for i := 0; i < b.N; i++ {
        globalMutex.Lock()
        globalCache["key"] = "value"
        _ = globalCache["key"]
        globalMutex.Unlock()
    }
}

// GOOD: Use local state for isolation
func BenchmarkWithLocalState(b *testing.B) {
    cache := make(map[string]string)
    var mutex sync.Mutex

    for i := 0; i < b.N; i++ {
        mutex.Lock()
        cache["key"] = "value"
        _ = cache["key"]
        mutex.Unlock()
    }
}
```

## Advanced Benchmarking Techniques

### Parallel Benchmarks

Test concurrent performance with `b.RunParallel()`:

```go
// parallel_bench_test.go - Benchmarking concurrent operations
package concurrent

import (
    "sync"
    "sync/atomic"
    "testing"
)

// Counter implementations for comparison
type MutexCounter struct {
    mu    sync.Mutex
    count int64
}

func (c *MutexCounter) Increment() {
    c.mu.Lock()
    c.count++
    c.mu.Unlock()
}

type AtomicCounter struct {
    count int64
}

func (c *AtomicCounter) Increment() {
    atomic.AddInt64(&c.count, 1)
}

// BenchmarkMutexCounter tests mutex-based counter performance
func BenchmarkMutexCounter(b *testing.B) {
    counter := &MutexCounter{}

    // RunParallel runs the benchmark in parallel across multiple goroutines
    b.RunParallel(func(pb *testing.PB) {
        // pb.Next() returns false when the benchmark should stop
        for pb.Next() {
            counter.Increment()
        }
    })
}

// BenchmarkAtomicCounter tests atomic counter performance
func BenchmarkAtomicCounter(b *testing.B) {
    counter := &AtomicCounter{}

    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            counter.Increment()
        }
    })
}
```

### Custom Metrics with b.ReportMetric()

```go
// custom_metrics_test.go - Reporting custom benchmark metrics
package custom

import (
    "testing"
)

// processItems simulates processing a batch of items
func processItems(items []string) int {
    processed := 0
    for _, item := range items {
        if len(item) > 0 {
            processed++
        }
    }
    return processed
}

// BenchmarkWithCustomMetrics reports items processed per second
func BenchmarkWithCustomMetrics(b *testing.B) {
    items := make([]string, 1000)
    for i := range items {
        items[i] = "item"
    }

    b.ResetTimer()

    totalProcessed := 0
    for i := 0; i < b.N; i++ {
        totalProcessed += processItems(items)
    }

    // Report custom metric: items processed per operation
    b.ReportMetric(float64(totalProcessed)/float64(b.N), "items/op")

    // Report throughput in items per second
    b.ReportMetric(float64(totalProcessed)/b.Elapsed().Seconds(), "items/sec")
}
```

### Benchmarking with Different CPU Counts

```bash
# Run benchmarks with different GOMAXPROCS values
go test -bench=. -cpu=1,2,4,8

# This produces output for each CPU configuration:
# BenchmarkParallel          1000000    1200 ns/op
# BenchmarkParallel-2        2000000     650 ns/op
# BenchmarkParallel-4        3500000     380 ns/op
# BenchmarkParallel-8        5000000     250 ns/op
```

## CI Integration for Performance Regression Detection

Integrating benchmarks into your CI pipeline helps catch performance regressions before they reach production.

### GitHub Actions Workflow

Create a workflow file at `.github/workflows/benchmark.yml`:

```yaml
# .github/workflows/benchmark.yml
name: Benchmark

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Install benchstat
        run: go install golang.org/x/perf/cmd/benchstat@latest

      - name: Run benchmarks on current branch
        run: go test -bench=. -benchmem -count=10 ./... > new.txt

      - name: Checkout base branch
        if: github.event_name == 'pull_request'
        run: git checkout ${{ github.base_ref }}

      - name: Run benchmarks on base branch
        if: github.event_name == 'pull_request'
        run: go test -bench=. -benchmem -count=10 ./... > old.txt

      - name: Compare benchmarks
        if: github.event_name == 'pull_request'
        run: |
          echo "## Benchmark Comparison" >> $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY
          benchstat old.txt new.txt >> $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY

      - name: Upload benchmark results
        uses: actions/upload-artifact@v4
        with:
          name: benchmark-results
          path: |
            new.txt
            old.txt
```

### Detecting Regressions Automatically

Create a script to fail CI on significant regressions:

```go
// tools/check_regression/main.go
// This tool parses benchstat output and fails if regressions exceed threshold
package main

import (
    "bufio"
    "fmt"
    "os"
    "regexp"
    "strconv"
    "strings"
)

func main() {
    // Threshold for acceptable regression (e.g., 10%)
    threshold := 10.0

    if len(os.Args) > 1 {
        if t, err := strconv.ParseFloat(os.Args[1], 64); err == nil {
            threshold = t
        }
    }

    scanner := bufio.NewScanner(os.Stdin)
    // Regex to match lines like: BenchmarkFoo-8  100ns  200ns  +100.00%
    deltaRegex := regexp.MustCompile(`([+-]\d+\.?\d*)%`)

    regressions := []string{}

    for scanner.Scan() {
        line := scanner.Text()
        matches := deltaRegex.FindStringSubmatch(line)

        if len(matches) > 1 {
            delta, err := strconv.ParseFloat(matches[1], 64)
            if err != nil {
                continue
            }

            // Positive delta means regression (slower)
            if delta > threshold {
                regressions = append(regressions,
                    fmt.Sprintf("  %s (%.2f%% slower)",
                        strings.Fields(line)[0], delta))
            }
        }
    }

    if len(regressions) > 0 {
        fmt.Printf("Performance regressions detected (threshold: %.1f%%):\n",
            threshold)
        for _, r := range regressions {
            fmt.Println(r)
        }
        os.Exit(1)
    }

    fmt.Println("No significant performance regressions detected.")
}
```

Use it in CI:

```yaml
- name: Check for regressions
  if: github.event_name == 'pull_request'
  run: |
    benchstat old.txt new.txt | go run ./tools/check_regression 10.0
```

### Storing Historical Benchmark Data

For long-term tracking, store benchmark results:

```yaml
# Additional step in GitHub Actions workflow
- name: Store benchmark results
  if: github.ref == 'refs/heads/main'
  run: |
    mkdir -p benchmarks
    cp new.txt benchmarks/$(date +%Y-%m-%d-%H%M%S).txt

    # Keep only last 30 days of results
    find benchmarks -name "*.txt" -mtime +30 -delete

- name: Commit benchmark history
  if: github.ref == 'refs/heads/main'
  uses: stefanzweifel/git-auto-commit-action@v5
  with:
    commit_message: "Update benchmark history"
    file_pattern: benchmarks/*.txt
```

## Real-World Example: Optimizing a JSON Parser

Let us walk through a complete example of using benchmarks to optimize code:

```go
// parser/parser.go - JSON parsing implementations
package parser

import (
    "encoding/json"
    "strings"
)

type Record struct {
    ID     int      `json:"id"`
    Name   string   `json:"name"`
    Tags   []string `json:"tags"`
    Active bool     `json:"active"`
}

// ParseRecordsNaive parses JSON records one at a time
func ParseRecordsNaive(data []string) ([]Record, error) {
    var records []Record
    for _, d := range data {
        var r Record
        if err := json.Unmarshal([]byte(d), &r); err != nil {
            return nil, err
        }
        records = append(records, r)
    }
    return records, nil
}

// ParseRecordsPrealloc preallocates the result slice
func ParseRecordsPrealloc(data []string) ([]Record, error) {
    records := make([]Record, 0, len(data))
    for _, d := range data {
        var r Record
        if err := json.Unmarshal([]byte(d), &r); err != nil {
            return nil, err
        }
        records = append(records, r)
    }
    return records, nil
}

// ParseRecordsDecoder uses a JSON decoder with string reader
func ParseRecordsDecoder(data []string) ([]Record, error) {
    records := make([]Record, 0, len(data))
    for _, d := range data {
        decoder := json.NewDecoder(strings.NewReader(d))
        var r Record
        if err := decoder.Decode(&r); err != nil {
            return nil, err
        }
        records = append(records, r)
    }
    return records, nil
}
```

```go
// parser/parser_test.go - Comprehensive benchmark suite
package parser

import (
    "fmt"
    "testing"
)

// generateTestData creates test JSON strings
func generateTestData(count int) []string {
    data := make([]string, count)
    for i := 0; i < count; i++ {
        data[i] = fmt.Sprintf(
            `{"id":%d,"name":"Record %d","tags":["tag1","tag2"],"active":true}`,
            i, i)
    }
    return data
}

// BenchmarkParsing compares all parsing implementations
func BenchmarkParsing(b *testing.B) {
    sizes := []int{10, 100, 1000}

    for _, size := range sizes {
        data := generateTestData(size)

        b.Run(fmt.Sprintf("Naive-%d", size), func(b *testing.B) {
            b.ReportAllocs()
            for i := 0; i < b.N; i++ {
                _, _ = ParseRecordsNaive(data)
            }
        })

        b.Run(fmt.Sprintf("Prealloc-%d", size), func(b *testing.B) {
            b.ReportAllocs()
            for i := 0; i < b.N; i++ {
                _, _ = ParseRecordsPrealloc(data)
            }
        })

        b.Run(fmt.Sprintf("Decoder-%d", size), func(b *testing.B) {
            b.ReportAllocs()
            for i := 0; i < b.N; i++ {
                _, _ = ParseRecordsDecoder(data)
            }
        })
    }
}
```

Running this benchmark:

```bash
go test -bench=BenchmarkParsing -benchmem
```

Example output:

```
BenchmarkParsing/Naive-10-8       100000    15234 ns/op    4896 B/op    67 allocs/op
BenchmarkParsing/Prealloc-10-8    100000    14567 ns/op    4512 B/op    62 allocs/op
BenchmarkParsing/Decoder-10-8     100000    18234 ns/op    5120 B/op    77 allocs/op
BenchmarkParsing/Naive-1000-8       1000  1523400 ns/op  489600 B/op  6700 allocs/op
BenchmarkParsing/Prealloc-1000-8    1000  1456700 ns/op  451200 B/op  6200 allocs/op
BenchmarkParsing/Decoder-1000-8     1000  1823400 ns/op  512000 B/op  7700 allocs/op
```

## Best Practices Summary

Here is a checklist for writing effective Go benchmarks:

1. **Name benchmarks clearly**: Use descriptive names that indicate what is being measured

2. **Always use b.N correctly**: Loop exactly `b.N` times without modification

3. **Prevent compiler optimization**: Assign results to package-level variables

4. **Exclude setup time**: Use `b.ResetTimer()` after expensive setup

5. **Report allocations**: Use `-benchmem` or `b.ReportAllocs()` for memory analysis

6. **Run multiple iterations**: Use `-count=10` or higher for statistical significance

7. **Use benchstat for comparison**: Never compare single benchmark runs

8. **Test multiple input sizes**: Use table-driven benchmarks with `b.Run()`

9. **Isolate benchmarks**: Avoid shared global state between benchmarks

10. **Integrate with CI**: Automate regression detection in your pipeline

## Conclusion

Go's `testing.B` provides a powerful framework for measuring and optimizing code performance. By understanding how `b.N` works, using sub-benchmarks effectively, tracking memory allocations, and integrating benchmarks into your CI pipeline, you can confidently maintain and improve the performance of your Go applications.

Remember that benchmarking is not a one-time activity but an ongoing practice. Regular benchmark runs help catch regressions early, and systematic optimization based on benchmark data leads to better-performing software.

Start with the basics, measure what matters, and let the data guide your optimization efforts. Happy benchmarking!

## Additional Resources

- [Go Testing Package Documentation](https://pkg.go.dev/testing)
- [benchstat Tool](https://pkg.go.dev/golang.org/x/perf/cmd/benchstat)
- [Go Performance Wiki](https://github.com/golang/go/wiki/Performance)
- [Profiling Go Programs](https://go.dev/blog/pprof)
