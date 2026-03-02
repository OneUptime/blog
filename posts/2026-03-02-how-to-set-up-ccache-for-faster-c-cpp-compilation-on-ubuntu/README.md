# How to Set Up ccache for Faster C/C++ Compilation on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ccache, Compilation, Build Tools, Development

Description: Learn how to configure ccache on Ubuntu to dramatically speed up repeated C and C++ compilations by caching compiler output and reusing it on subsequent builds.

---

If you regularly compile the same C or C++ code - rebuilding after small changes, switching between git branches, or running CI pipelines - you're spending a lot of time recompiling files that haven't actually changed. ccache is a compiler cache that stores the output of previous compilations. When you compile a file that hasn't changed, ccache returns the cached result almost instantly instead of rerunning the compiler.

On a large project, ccache can take a rebuild from 10 minutes down to under 30 seconds after the first build. The cache persists across builds and even machine reboots, so you benefit even when working on multiple branches or after a `git clean`.

## Installing ccache

```bash
sudo apt update
sudo apt install ccache

# Verify installation
ccache --version
```

## How ccache Works

ccache acts as a wrapper around your compiler. It hashes the preprocessed source file along with the compiler flags. If it finds a match in its cache, it returns the cached object file directly. If not, it runs the real compiler and stores the result.

The hash includes:
- The preprocessed source code
- Compiler flags
- Compiler version
- Any included headers

This means if you change a header file that a source file includes, the affected files will be recompiled. Only truly unchanged compilation units hit the cache.

## Setting Up ccache

### Method 1: Symlink Masquerade (Simplest)

ccache installs compiler wrapper scripts in `/usr/lib/ccache/`:

```bash
# View the wrapper scripts
ls /usr/lib/ccache/

# Output typically includes:
# cc  c++  gcc  g++  gcc-12  g++-12  x86_64-linux-gnu-gcc  etc.
```

Add this directory to the front of your PATH:

```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH="/usr/lib/ccache:$PATH"

# Apply immediately
source ~/.bashrc

# Verify - should now point to ccache wrappers
which gcc
# /usr/lib/ccache/gcc
```

With this in place, any call to `gcc`, `g++`, or `cc` automatically goes through ccache without any changes to your build system.

### Method 2: Direct Invocation

Explicitly call ccache with the compiler:

```bash
# Compile using ccache explicitly
ccache gcc -c myfile.c -o myfile.o

# Or use CC/CXX environment variables
export CC="ccache gcc"
export CXX="ccache g++"
```

### Method 3: CMake Integration

CMake has native ccache support via `CMAKE_<LANG>_COMPILER_LAUNCHER`:

```bash
# Enable ccache in cmake configure step
cmake \
  -DCMAKE_C_COMPILER_LAUNCHER=ccache \
  -DCMAKE_CXX_COMPILER_LAUNCHER=ccache \
  ..

# Then build as normal
make -j$(nproc)
```

Or set it in your CMakeLists.txt to make it persistent:

```cmake
# CMakeLists.txt
find_program(CCACHE_FOUND ccache)
if(CCACHE_FOUND)
    set(CMAKE_C_COMPILER_LAUNCHER ccache)
    set(CMAKE_CXX_COMPILER_LAUNCHER ccache)
    message(STATUS "Using ccache: ${CCACHE_FOUND}")
endif()
```

### Method 4: Meson Integration

```bash
# Set environment variables before meson setup
export CC="ccache gcc"
export CXX="ccache g++"
meson setup build
ninja -C build
```

## Checking ccache Statistics

After building a project, check the cache hit rate:

```bash
ccache --show-stats

# Sample output:
# Summary:
#   Hits:             3214 / 3562 (90.23 %)
#   Direct:           3214
#   Preprocessed:        0
#   Misses:            348
#   Uncacheable:         0
# Primary storage:
#   Hits:             3214 / 3562 (90.23 %)
#   Misses:            348
#   Cache size (GB):  0.85 / 5.00
#   Files:            1048
```

A hit rate above 80% is good. 90%+ is excellent.

## Configuring the Cache Size

The default cache size is 5GB. Adjust it based on your projects and available disk space:

```bash
# Set cache size to 20GB
ccache --set-config=max_size=20G

# Set cache size to 500MB for space-constrained environments
ccache --set-config=max_size=500M

# View current configuration
ccache --show-config
```

## Configuration File

For persistent configuration, edit or create the ccache configuration file:

```bash
# The config file location
~/.config/ccache/ccache.conf

# Or the system-wide location
/etc/ccache.conf
```

```ini
# ~/.config/ccache/ccache.conf

# Cache directory (default: ~/.cache/ccache)
cache_dir = /home/user/.cache/ccache

# Maximum cache size
max_size = 20G

# Enable compression (saves space, minor CPU overhead)
compression = true
compression_level = 6

# Keep extended statistics
statistics_update_interval = 0

# Log file for debugging
# log_file = /tmp/ccache.log
```

## Using a Shared Cache

For teams or CI systems where multiple users build the same code, a shared cache can save significant time:

```bash
# Create a shared cache directory
sudo mkdir -p /var/cache/ccache
sudo chgrp developers /var/cache/ccache
sudo chmod 2775 /var/cache/ccache

# Configure ccache to use the shared directory
# Add to /etc/profile.d/ccache.sh or each user's .bashrc
export CCACHE_DIR=/var/cache/ccache

# Set appropriate umask so cached files are group-readable
export CCACHE_UMASK=002
```

Each developer needs to set `CCACHE_DIR` to point to the shared location. CI runners can also use this shared cache if they have access to the same filesystem.

## CI/CD Integration

### GitHub Actions with ccache

```yaml
# .github/workflows/build.yml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install ccache
        run: sudo apt install ccache

      - name: Cache ccache directory
        uses: actions/cache@v4
        with:
          path: ~/.cache/ccache
          key: ccache-${{ runner.os }}-${{ github.sha }}
          restore-keys: |
            ccache-${{ runner.os }}-

      - name: Build with ccache
        env:
          CC: ccache gcc
          CXX: ccache g++
        run: |
          cmake -B build .
          cmake --build build -j$(nproc)

      - name: Show ccache stats
        run: ccache --show-stats
```

### GitLab CI with ccache

```yaml
# .gitlab-ci.yml
build:
  stage: build
  cache:
    key: ccache
    paths:
      - .ccache/
  variables:
    CCACHE_DIR: ${CI_PROJECT_DIR}/.ccache
    CC: ccache gcc
    CXX: ccache g++
  script:
    - sudo apt install -y ccache
    - cmake -B build .
    - cmake --build build -j$(nproc)
    - ccache --show-stats
```

## Troubleshooting Low Cache Hit Rates

If you're seeing low hit rates, check for common causes:

### Debug Mode

```bash
# Enable verbose logging to see why compilations are missing the cache
export CCACHE_LOGFILE=/tmp/ccache-debug.log
make -j1   # Use -j1 to make the log readable
tail -f /tmp/ccache-debug.log
```

### Common Causes of Cache Misses

**Compiler version changes:**
```bash
# ccache is version-sensitive - check which compiler is being used
ccache --show-config | grep compiler
```

**Different flags each build:**
```bash
# Timestamps or build-specific flags defeat caching
# This is bad:
CFLAGS="-DBUILD_DATE=$(date)"

# The ccache_basedir option can help with absolute path differences
ccache --set-config=base_dir=/home/user/project
```

**Preprocessor output contains timestamps:**
Some projects embed `__DATE__` or `__TIME__` macros that change every build:

```bash
# Check for this pattern
grep -r "__DATE__\|__TIME__\|__TIMESTAMP__" src/
```

ccache can be told to ignore certain preprocessor output:

```ini
# In ccache.conf
sloppiness = time_macros
```

## Clearing the Cache

```bash
# Clear all cached objects
ccache --clear

# Zero the statistics without clearing the cache
ccache --zero-stats
```

## Combining ccache with distcc

ccache and distcc work well together. The recommended order is to put ccache before distcc so local cache hits avoid network round-trips entirely:

```bash
# Use ccache with distcc as the actual compiler
export CC="ccache distcc gcc"
export CXX="ccache distcc g++"

# Or set the CCACHE_PREFIX to use distcc when cache misses occur
export CCACHE_PREFIX=distcc
```

When ccache hits the cache, it returns the result locally. When it misses, it calls distcc, which distributes the compilation across your build farm.

For any project you're compiling repeatedly - whether personal development, automated CI builds, or package builds - ccache is one of the highest-leverage optimizations available. The setup takes under five minutes and the time savings compound with every build.
