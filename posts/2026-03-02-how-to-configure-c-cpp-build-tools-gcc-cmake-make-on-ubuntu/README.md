# How to Configure C/C++ Build Tools (GCC, CMake, Make) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, C++, GCC, CMake, Development

Description: A thorough walkthrough of installing and configuring GCC, CMake, and Make on Ubuntu for C and C++ development, including multi-version management and build optimization.

---

C and C++ development on Ubuntu requires a proper build toolchain. While the tools themselves are mature and well-documented, getting them configured correctly - especially when dealing with multiple compiler versions or complex project structures - takes some deliberate setup. This guide covers GCC, CMake, and Make installation, configuration, and common patterns you'll encounter on Ubuntu systems.

## Installing the Base Build Tools

The `build-essential` package pulls in the most important pieces:

```bash
# Update package lists first
sudo apt update

# Install the essential build toolchain
sudo apt install -y build-essential

# This installs:
# - gcc (C compiler)
# - g++ (C++ compiler)
# - make
# - libc-dev (C standard library headers)
# - dpkg-dev (Debian package development tools)
```

Verify the installation:

```bash
gcc --version
g++ --version
make --version
```

## Managing Multiple GCC Versions

Ubuntu ships a default GCC version, but you may need an older or newer version for specific projects. The `ubuntu-toolchain-r` PPA provides newer GCC versions.

```bash
# Install additional GCC versions from standard repos
sudo apt install -y gcc-11 g++-11
sudo apt install -y gcc-12 g++-12
sudo apt install -y gcc-13 g++-13

# For newer versions not yet in standard repos, add the toolchain PPA
sudo add-apt-repository ppa:ubuntu-toolchain-r/test
sudo apt update
sudo apt install -y gcc-14 g++-14
```

### Switching Between GCC Versions with update-alternatives

`update-alternatives` lets you switch the default compiler without editing environment variables:

```bash
# Register each GCC version as an alternative
sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-11 11 \
    --slave /usr/bin/g++ g++ /usr/bin/g++-11

sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-12 12 \
    --slave /usr/bin/g++ g++ /usr/bin/g++-12

sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-13 13 \
    --slave /usr/bin/g++ g++ /usr/bin/g++-13

# Interactively select the active version
sudo update-alternatives --config gcc

# Verify the switch took effect
gcc --version
```

## Installing CMake

The CMake version in Ubuntu's repositories is often outdated. Projects using modern CMake features (target-based configuration, generator expressions, etc.) need a recent version.

### Method 1: APT (simple but potentially outdated)

```bash
sudo apt install -y cmake
cmake --version
```

### Method 2: Kitware's Official APT Repository

```bash
# Install the signing key
wget -O - https://apt.kitware.com/keys/kitware-archive-latest.asc \
    | gpg --dearmor - \
    | sudo tee /usr/share/keyrings/kitware-archive-keyring.gpg > /dev/null

# Add the repository (adjust for your Ubuntu version)
echo "deb [signed-by=/usr/share/keyrings/kitware-archive-keyring.gpg] \
    https://apt.kitware.com/ubuntu/ $(lsb_release -cs) main" \
    | sudo tee /etc/apt/sources.list.d/kitware.list

sudo apt update
sudo apt install -y cmake

cmake --version
```

### Method 3: Direct Binary Download

```bash
# Download the installer for a specific version
CMAKE_VERSION=3.28.3
wget https://github.com/Kitware/CMake/releases/download/v${CMAKE_VERSION}/cmake-${CMAKE_VERSION}-linux-x86_64.sh

# Install to /opt
chmod +x cmake-${CMAKE_VERSION}-linux-x86_64.sh
sudo ./cmake-${CMAKE_VERSION}-linux-x86_64.sh --skip-license --prefix=/opt/cmake

# Add to PATH
echo 'export PATH=/opt/cmake/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

## CMake Project Structure and Configuration

A typical CMake project layout:

```
myproject/
  CMakeLists.txt
  src/
    main.cpp
    mylib.cpp
  include/
    mylib.h
  tests/
    test_mylib.cpp
  build/         # created during build, not tracked in git
```

A minimal `CMakeLists.txt`:

```cmake
cmake_minimum_required(VERSION 3.20)
project(MyProject VERSION 1.0 LANGUAGES CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Create a library target
add_library(mylib src/mylib.cpp)
target_include_directories(mylib PUBLIC include/)

# Create the main executable
add_executable(myapp src/main.cpp)
target_link_libraries(myapp PRIVATE mylib)

# Enable testing
enable_testing()
add_subdirectory(tests)
```

## Building with CMake

The standard out-of-source build workflow:

```bash
# Create and enter the build directory
mkdir build && cd build

# Configure the project
# -DCMAKE_BUILD_TYPE controls optimization level
cmake -DCMAKE_BUILD_TYPE=Release ..

# Build using all available CPU cores
cmake --build . --parallel $(nproc)

# Install (if the project supports it)
cmake --install . --prefix /usr/local

# Run tests
ctest --output-on-failure
```

Common CMake configuration flags:

```bash
# Debug build with address sanitizer
cmake -DCMAKE_BUILD_TYPE=Debug \
      -DCMAKE_CXX_FLAGS="-fsanitize=address -g" \
      ..

# Release with debug info (good for profiling)
cmake -DCMAKE_BUILD_TYPE=RelWithDebInfo ..

# Specify a different compiler
cmake -DCMAKE_C_COMPILER=gcc-13 \
      -DCMAKE_CXX_COMPILER=g++-13 \
      ..

# Generate compile_commands.json for IDE integration
cmake -DCMAKE_EXPORT_COMPILE_COMMANDS=ON ..
```

## Make Configuration and Optimization

When working with Makefiles directly or alongside CMake:

```bash
# Parallel builds - use all cores
make -j$(nproc)

# Parallel builds with a specific count
make -j8

# Verbose output for debugging build issues
make VERBOSE=1

# Build a specific target
make myapp

# Clean build artifacts
make clean
```

### Writing a Simple Makefile

```makefile
# Makefile
CC = gcc
CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -O2
LDFLAGS =

# Source files and objects
SRCS = src/main.cpp src/mylib.cpp
OBJS = $(SRCS:.cpp=.o)
TARGET = myapp

# Default target
all: $(TARGET)

# Link
$(TARGET): $(OBJS)
	$(CXX) $(LDFLAGS) -o $@ $^

# Compile
%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c -o $@ $<

# Clean
clean:
	rm -f $(OBJS) $(TARGET)

.PHONY: all clean
```

## Installing Additional Development Libraries

Most C/C++ projects depend on system libraries. Install their development headers alongside the runtime:

```bash
# Common development libraries
sudo apt install -y \
    libssl-dev \        # OpenSSL
    libcurl4-openssl-dev \  # libcurl
    libboost-all-dev \  # Boost libraries
    libjsoncpp-dev \    # JSON parsing
    libsqlite3-dev \    # SQLite
    libpq-dev \         # PostgreSQL client
    zlib1g-dev \        # zlib compression
    libfmt-dev          # fmtlib formatting
```

## Compiler Warnings and Sanitizers

Good warning flags catch bugs before they manifest at runtime:

```bash
# Compile with comprehensive warnings
g++ -std=c++17 -Wall -Wextra -Wpedantic -Wshadow \
    -Wnon-virtual-dtor -Wcast-align \
    -Woverloaded-virtual -Wconversion \
    -o myapp main.cpp

# Address sanitizer - finds memory bugs
g++ -std=c++17 -g -fsanitize=address -fno-omit-frame-pointer \
    -o myapp main.cpp

# Undefined behavior sanitizer
g++ -std=c++17 -g -fsanitize=undefined \
    -o myapp main.cpp

# Thread sanitizer - finds race conditions
g++ -std=c++17 -g -fsanitize=thread \
    -o myapp main.cpp
```

## Clang as an Alternative Compiler

Installing Clang alongside GCC gives you access to better diagnostics and clang-specific tools:

```bash
# Install Clang and tools
sudo apt install -y clang clang-format clang-tidy lld

# Use clang for a CMake build
cmake -DCMAKE_C_COMPILER=clang \
      -DCMAKE_CXX_COMPILER=clang++ \
      ..
```

`clang-format` enforces consistent code style:

```bash
# Format a file in place
clang-format -i --style=Google src/main.cpp

# Check formatting without modifying
clang-format --style=LLVM --dry-run src/main.cpp
```

With `build-essential`, CMake from the official source, and proper compiler version management via `update-alternatives`, you have a solid C/C++ development environment on Ubuntu. The combination of GCC's mature optimization passes and Clang's superior diagnostics covers most development and debugging needs.
