# How to Use Profile-Guided Optimization (PGO) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Performance, GCC, Clang, Compilation

Description: Learn how to use Profile-Guided Optimization (PGO) with GCC and Clang on Ubuntu to produce faster binaries by training the compiler with real execution profiles.

---

Profile-Guided Optimization (PGO) is a compiler technique where you first run your program to collect execution data, then recompile using that data to make smarter optimization decisions. Unlike generic optimizations that apply heuristics, PGO tells the compiler exactly which code paths are hot, which branches are almost always taken, and which functions are called frequently. The result is often a 5-20% performance improvement for CPU-bound workloads.

## How PGO Works

PGO follows a three-step process:

1. **Instrumented build**: Compile with instrumentation that records runtime behavior
2. **Profile collection**: Run the instrumented binary through representative workloads
3. **Optimized build**: Recompile using the collected profile data

The profile data helps the compiler make better decisions about:
- Function inlining (inline frequently called functions)
- Branch prediction hints (optimize likely branches)
- Code layout (group hot code together in memory for better cache usage)
- Vectorization decisions (know which loops are actually executed)

## PGO with GCC

### Step 1: Install Build Tools

```bash
# Install GCC and necessary build tools
sudo apt update
sudo apt install gcc g++ make -y

# Verify GCC version (PGO works with GCC 4.0+, better in newer versions)
gcc --version
```

### Step 2: Instrumented Compilation

```bash
# Compile with profiling instrumentation
# -fprofile-generate: instruments the binary to collect profile data
# -O2: use optimization level 2 as the base
# Profile data will be written to .gcda files
gcc -O2 -fprofile-generate -o myapp-instrumented myapp.c

# For C++ projects
g++ -O2 -fprofile-generate -o myapp-instrumented myapp.cpp
```

### Step 3: Collect Profile Data

```bash
# Run the instrumented binary with representative workloads
# This creates .gcda files containing execution counts
./myapp-instrumented --input representative-dataset.dat
./myapp-instrumented --input another-typical-workload.dat

# Run with multiple scenarios that cover typical usage
./myapp-instrumented --benchmark
./myapp-instrumented --process-batch data/

# List the generated profile data files
ls *.gcda
```

### Step 4: Optimized Compilation

```bash
# Recompile using the collected profile data
# -fprofile-use: use profile data for optimization
# -fprofile-correction: handle merged profiles from multiple runs
gcc -O2 -fprofile-use -fprofile-correction -o myapp-optimized myapp.c
```

### Comparing Performance

```bash
# Time the original build vs PGO-optimized build
time ./myapp --benchmark
time ./myapp-optimized --benchmark

# Use hyperfine for more accurate benchmarking
sudo apt install hyperfine -y
hyperfine --warmup 3 './myapp --benchmark' './myapp-optimized --benchmark'
```

## PGO with Clang

Clang has a more flexible PGO system using LLVM's profiling infrastructure.

### Step 1: Install Clang

```bash
# Install Clang
sudo apt install clang llvm -y

# Verify version
clang --version
```

### Step 2: Instrumented Build with Clang

```bash
# Compile with instrumentation
# -fprofile-instr-generate: instrument for profiling
clang -O2 -fprofile-instr-generate -o myapp-instrumented myapp.c
```

### Step 3: Run and Collect Profile

```bash
# Set environment variable to control where profile data is written
export LLVM_PROFILE_FILE="myapp-%p.profraw"

# Run the instrumented binary (creates .profraw files)
./myapp-instrumented --benchmark
./myapp-instrumented --process-large-dataset data/large.dat

# Merge multiple profile runs into a single file
llvm-profdata merge -output=myapp.profdata myapp-*.profraw
```

### Step 4: Use Profile for Optimized Build

```bash
# Compile with profile data
clang -O2 -fprofile-instr-use=myapp.profdata -o myapp-optimized myapp.c
```

## Real Example: Optimizing a C Program

Here is a complete PGO workflow for a sample compute-heavy program:

```c
/* compute.c - CPU-intensive string processing example */
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

/* Count character frequency - called millions of times in the hot path */
int count_char(const char *str, char target) {
    int count = 0;
    while (*str) {
        if (*str == target) count++;
        str++;
    }
    return count;
}

int main(int argc, char *argv[]) {
    char buffer[1024];
    int total = 0;

    /* Simulate processing a large file */
    for (int i = 0; i < 1000000; i++) {
        snprintf(buffer, sizeof(buffer), "line %d: processing data", i);
        /* 'a' is frequently searched - PGO will learn this */
        total += count_char(buffer, 'a');
        /* 'z' is rarely found - PGO learns branch prediction */
        total += count_char(buffer, 'z');
    }

    printf("Total count: %d\n", total);
    return 0;
}
```

```bash
# Step 1: Build without PGO as baseline
gcc -O2 -o compute-baseline compute.c

# Step 2: Build with instrumentation
gcc -O2 -fprofile-generate -o compute-instrumented compute.c

# Step 3: Run instrumented binary to collect profile
./compute-instrumented

# Step 4: Build with PGO
gcc -O2 -fprofile-use -fprofile-correction -o compute-pgo compute.c

# Step 5: Compare results
echo "=== Baseline ==="
time ./compute-baseline

echo "=== PGO-Optimized ==="
time ./compute-pgo
```

## PGO for Makefile-Based Projects

Most real projects use a build system. Here is how to integrate PGO into a typical Makefile workflow:

```makefile
# Makefile with PGO support

CC = gcc
CFLAGS = -O2 -Wall
SOURCES = main.c utils.c compute.c
TARGET = myapp

# Standard build
$(TARGET): $(SOURCES)
	$(CC) $(CFLAGS) -o $@ $^

# Step 1: Instrumented build
$(TARGET)-instrumented: $(SOURCES)
	$(CC) $(CFLAGS) -fprofile-generate -o $@ $^

# Step 2: Run to collect profiles (requires $(TARGET)-instrumented to exist)
profile-data: $(TARGET)-instrumented
	# Run with representative workloads
	./$(TARGET)-instrumented --input testdata/large-input.dat
	./$(TARGET)-instrumented --benchmark

# Step 3: PGO-optimized build
$(TARGET)-pgo: $(SOURCES) profile-data
	$(CC) $(CFLAGS) -fprofile-use -fprofile-correction -o $@ $^

# Full PGO workflow
pgo: $(TARGET)-pgo

# Cleanup
clean:
	rm -f $(TARGET) $(TARGET)-instrumented $(TARGET)-pgo *.gcda *.gcno
```

```bash
# Run the full PGO workflow
make pgo

# Compare performance
time ./myapp --benchmark
time ./myapp-pgo --benchmark
```

## Understanding Profile Coverage

For PGO to work well, your profile-collection workload must cover the code paths used in production:

```bash
# Use gcov to see which code paths were covered during profiling
gcc -O2 -fprofile-generate --coverage -o myapp-covered myapp.c
./myapp-covered --benchmark

# Generate coverage report
gcov myapp.c

# View coverage (lines with 0 were not executed during profiling)
cat myapp.c.gcov
```

If large parts of your code show zero coverage, your profile workload is not representative. Add more diverse test scenarios before the final PGO build.

## PGO in CI/CD Pipelines

```yaml
# .github/workflows/pgo-build.yml - example GitHub Actions workflow
name: PGO Build

on:
  push:
    branches: [main]

jobs:
  build-with-pgo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: sudo apt update && sudo apt install gcc make -y

      - name: Build instrumented binary
        run: gcc -O2 -fprofile-generate -o myapp-instrumented myapp.c

      - name: Collect profile data
        run: |
          ./myapp-instrumented --benchmark
          ./myapp-instrumented --process testdata/

      - name: Build PGO-optimized binary
        run: gcc -O2 -fprofile-use -fprofile-correction -o myapp myapp.c

      - name: Run performance validation
        run: time ./myapp --benchmark
```

PGO is most valuable when you have a stable, CPU-bound application with known usage patterns. It requires discipline to collect representative profiles, but the performance gains require no code changes and work transparently.
