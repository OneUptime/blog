# How to Use Meson Build System on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Meson, Build Tool, Development, Compilation

Description: Learn how to use the Meson build system on Ubuntu to configure, compile, and install software projects, including cross-compilation, dependencies, and custom build options.

---

Meson is a build system that has largely replaced Autoconf/automake for GNOME and many other modern C and C++ projects. It's faster than CMake for configuration, produces cleaner output during compilation, and has better built-in support for things like unit tests and cross-compilation. If you're building software that uses Meson, or if you're starting a new C/C++ project, this guide covers what you need to know to work with it effectively on Ubuntu.

## Installing Meson and Ninja

Meson generates build files for Ninja (its default backend), so you need both:

```bash
sudo apt update
sudo apt install meson ninja-build

# Verify installation
meson --version
ninja --version
```

Ubuntu's packaged version of meson is sometimes older than what a project requires. For the latest version:

```bash
# Install via pip (gets the latest release)
sudo apt install python3-pip
pip3 install --user meson

# Add ~/.local/bin to PATH if not already there
export PATH="$HOME/.local/bin:$PATH"
meson --version
```

## Building a Project That Uses Meson

The standard workflow for a Meson project:

```bash
# 1. Clone or extract the source
git clone https://gitlab.gnome.org/GNOME/glib.git
cd glib

# 2. Set up the build directory (this is the 'configure' step)
meson setup builddir

# 3. Compile
ninja -C builddir

# 4. Run tests (optional)
ninja -C builddir test

# 5. Install
sudo ninja -C builddir install
```

The `builddir` is a separate directory that keeps all build artifacts out of the source tree. You can have multiple build directories with different configurations from the same source.

## The meson.build File

Every Meson project has a `meson.build` file in the source root. For a simple C project:

```python
# meson.build

# Project declaration
project('my-project', 'c',
  version : '1.0.0',
  default_options : [
    'warning_level=2',    # Compiler warning level
    'c_std=c11',          # C standard
  ]
)

# Find dependencies
glib_dep = dependency('glib-2.0', version : '>=2.68')
thread_dep = dependency('threads')

# Build an executable
executable('myapp',
  sources : [
    'src/main.c',
    'src/utils.c',
  ],
  dependencies : [glib_dep, thread_dep],
  install : true,
)

# Build a shared library
mylib = shared_library('mylib',
  sources : 'src/mylib.c',
  version : '1.0.0',
  soversion : '1',
  install : true,
)

# Build a static library
static_library('mylib_static',
  sources : 'src/mylib.c',
)

# Install a header
install_headers('include/mylib.h', subdir : 'myproject')

# Configuration summary
summary({
  'Version': meson.project_version(),
  'GLib version': glib_dep.version(),
})
```

### Configuring and Compiling the Simple Project

```bash
meson setup build
ninja -C build
sudo ninja -C build install
```

## Meson Setup Options

The `meson setup` command accepts options that control the build:

```bash
# Show all available options for a project
meson configure builddir

# Set build type (affects optimization and debug symbols)
meson setup builddir --buildtype=release        # Optimized, no debug info
meson setup builddir --buildtype=debug          # No optimization, with debug
meson setup builddir --buildtype=debugoptimized # Default: some optimization + debug
meson setup builddir --buildtype=minsize        # Optimize for size

# Change the install prefix
meson setup builddir --prefix=/usr/local

# Enable/disable features
meson setup builddir -Denable-tests=true -Denable-docs=false

# Set C/C++ compiler
CC=clang CXX=clang++ meson setup builddir
```

## Modifying Options After Setup

You don't need to recreate the build directory to change options:

```bash
# Change an option in an existing build directory
meson configure builddir -Dbuildtype=release

# Change multiple options
meson configure builddir -Dbuildtype=release -Db_lto=true -Db_pch=true

# View current configuration
meson configure builddir
```

## Handling Dependencies

Meson has built-in support for finding system libraries:

```bash
# In meson.build - find a required dependency
zlib_dep = dependency('zlib')

# Optional dependency
readline_dep = dependency('readline', required : false)
if readline_dep.found()
  # Use it
endif

# Specify minimum version
openssl_dep = dependency('openssl', version : '>=1.1')

# Fallback to a subproject if not found on system
# (subproject is in subprojects/zlib/)
zlib_dep = dependency('zlib',
  fallback : ['zlib', 'zlib_dep'],
)
```

### WrapDB - Meson's Package Registry

Meson has a registry called WrapDB that can automatically download and build dependencies that aren't installed:

```bash
# List available packages
meson wrap list

# Download a dependency for the project
meson wrap install zlib
meson wrap install gtest

# This creates subprojects/zlib.wrap which Meson uses as a fallback
```

## Using pkg-config with Meson

For libraries that provide pkg-config files:

```bash
# Check what pkg-config knows about a library
pkg-config --libs --cflags openssl

# Meson automatically uses pkg-config
# This finds libssl via pkg-config
openssl_dep = dependency('openssl')
```

## Unit Tests in Meson

Meson has first-class test support:

```python
# meson.build - define a test
test_sources = ['tests/test_utils.c']

test_exe = executable('test-utils',
  sources : test_sources + ['src/utils.c'],
  dependencies : [glib_dep],
)

# Register the test
test('utils tests', test_exe)

# Test with additional arguments
test('utils tests verbose', test_exe,
  args : ['--verbose'],
  timeout : 120,
)
```

```bash
# Run all tests
ninja -C builddir test

# Run tests and show output even for passing tests
ninja -C builddir test --verbose

# Run a specific test
ninja -C builddir test --test-args="--gtest_filter=UtilsTest.*"

# Run tests with a specific timeout
meson test -C builddir --timeout-multiplier 2
```

## Generating pkg-config and CMake Files

For libraries, Meson can generate integration files automatically:

```python
# meson.build - install pkg-config file
pkgconfig = import('pkgconfig')
pkgconfig.generate(
  mylib,
  name : 'mylib',
  description : 'My Library',
  version : '1.0.0',
)

# Generate CMake integration files
cmake = import('cmake')
cmake.write_basic_package_version_file(
  name : 'mylib',
  version : '1.0.0',
)
```

## Cross-Compilation

Cross-compiling for ARM from an x86 Ubuntu machine:

```bash
# Install the cross-compiler
sudo apt install gcc-aarch64-linux-gnu g++-aarch64-linux-gnu

# Create a cross-compilation file
cat > cross-aarch64.ini << 'EOF'
[host_machine]
system = 'linux'
cpu_family = 'aarch64'
cpu = 'aarch64'
endian = 'little'

[binaries]
c = 'aarch64-linux-gnu-gcc'
cpp = 'aarch64-linux-gnu-g++'
ar = 'aarch64-linux-gnu-ar'
strip = 'aarch64-linux-gnu-strip'
pkgconfig = 'aarch64-linux-gnu-pkg-config'
EOF

# Set up cross-compilation build
meson setup builddir-arm --cross-file cross-aarch64.ini

# Build
ninja -C builddir-arm
```

## Using Meson Introspection

Meson can output information about the build in JSON format, useful for IDE integration:

```bash
# List all build targets
meson introspect builddir --targets

# List all tests
meson introspect builddir --tests

# Show project information
meson introspect builddir --projectinfo

# Generate compile_commands.json for clangd/IDE support
ls builddir/compile_commands.json
# Meson generates this automatically
```

## Cleaning and Rebuilding

```bash
# Reconfigure from scratch (keeps build directory, reruns setup)
meson setup --reconfigure builddir

# Wipe the build directory and start fresh
meson setup --wipe builddir

# Clean compiled objects
ninja -C builddir clean

# Full clean (including generated files)
rm -rf builddir
meson setup builddir
```

## Common Issues

### Missing dependency pkg-config file

```
ERROR: Dependency 'somelib' not found
```

```bash
# Find the package providing the pkg-config file
apt-file search somelib.pc

# Install the development package
sudo apt install libsomelib-dev
```

### Compiler cannot find header

Look at the error output from `ninja -C builddir` - if a header is missing, install the relevant `-dev` package:

```bash
# Search for a specific header
apt-file search openssl/ssl.h
# Output: libssl-dev: /usr/include/openssl/ssl.h
sudo apt install libssl-dev
```

Meson's speed advantage over CMake is most noticeable on large projects where the configuration step alone with CMake can take many seconds. With Meson, `meson setup` typically completes in a fraction of that time. The Ninja backend it defaults to also produces better parallel compilation behavior than the Makefiles generated by CMake.
