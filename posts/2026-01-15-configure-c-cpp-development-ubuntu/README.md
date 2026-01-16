# How to Configure a C/C++ Development Environment on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, C, C++, Development, GCC, Tutorial

Description: Complete guide to setting up C and C++ development tools on Ubuntu.

---

Setting up a robust C/C++ development environment on Ubuntu is essential for systems programming, embedded development, game development, and high-performance computing. This comprehensive guide walks you through every aspect of configuring your Ubuntu system for professional C and C++ development.

## Table of Contents

1. [Installing GCC/G++ and Build-Essential](#installing-gccg-and-build-essential)
2. [Clang/LLVM as an Alternative Compiler](#clangllvm-as-an-alternative-compiler)
3. [Build Systems: Make and CMake](#build-systems-make-and-cmake)
4. [Creating Makefiles](#creating-makefiles)
5. [CMakeLists.txt Configuration](#cmakeliststxt-configuration)
6. [Working with Libraries and Header Files](#working-with-libraries-and-header-files)
7. [Static vs Shared Libraries](#static-vs-shared-libraries)
8. [Package Managers: vcpkg and Conan](#package-managers-vcpkg-and-conan)
9. [VS Code Setup with C/C++ Extension](#vs-code-setup-with-cc-extension)
10. [Debugging with GDB](#debugging-with-gdb)
11. [Code Formatting with clang-format](#code-formatting-with-clang-format)
12. [Static Analysis Tools](#static-analysis-tools)

---

## Installing GCC/G++ and Build-Essential

The GNU Compiler Collection (GCC) is the standard compiler for C and C++ on Linux systems. The `build-essential` package includes GCC, G++, and other essential tools like `make` and `libc-dev`.

### Install Build-Essential

```bash
# Update package lists to ensure you get the latest versions
sudo apt update

# Install the build-essential meta-package
# This includes: gcc, g++, make, libc-dev, and dpkg-dev
sudo apt install build-essential -y

# Verify the installation by checking versions
gcc --version
g++ --version
make --version
```

### Understanding What Gets Installed

```bash
# The build-essential package includes:
# - gcc: The GNU C compiler
# - g++: The GNU C++ compiler
# - make: Build automation tool
# - libc6-dev: C standard library development files
# - dpkg-dev: Debian package development tools

# Check all installed packages from build-essential
apt-cache depends build-essential
```

### Installing Specific GCC Versions

Ubuntu allows multiple GCC versions to coexist:

```bash
# Install GCC 12 (or another specific version)
sudo apt install gcc-12 g++-12 -y

# Configure alternatives to switch between versions
# Priority 100 means this becomes the default if it's the highest
sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-12 100
sudo update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-12 100

# If you have multiple versions, interactively select which to use
sudo update-alternatives --config gcc
sudo update-alternatives --config g++
```

### Your First C Program

Create a simple C program to verify your setup:

```c
/* hello.c - A simple C program to test the compiler
 *
 * This program demonstrates:
 * - Basic C syntax
 * - Standard library usage
 * - Compilation process
 */

#include <stdio.h>   /* Standard I/O library for printf */

int main(void) {
    /* Print a greeting message to stdout */
    printf("Hello from GCC on Ubuntu!\n");

    /* Return 0 to indicate successful execution */
    return 0;
}
```

Compile and run:

```bash
# Compile with warnings enabled (-Wall) and debugging symbols (-g)
# -Wall: Enable all common warnings
# -g: Include debugging information for GDB
# -o hello: Name the output executable "hello"
gcc -Wall -g -o hello hello.c

# Run the compiled program
./hello
```

### Your First C++ Program

```cpp
/* hello.cpp - A simple C++ program demonstrating modern C++ features
 *
 * This program shows:
 * - C++ I/O streams
 * - Standard library containers
 * - Range-based for loops (C++11)
 * - Auto type deduction (C++11)
 */

#include <iostream>  /* C++ I/O streams */
#include <vector>    /* Dynamic array container */
#include <string>    /* String class */

int main() {
    /* Using modern C++ features */
    std::vector<std::string> languages = {"C", "C++", "Assembly"};

    std::cout << "Languages supported by GCC:" << std::endl;

    /* Range-based for loop (C++11 feature) */
    for (const auto& lang : languages) {
        std::cout << "  - " << lang << std::endl;
    }

    return 0;
}
```

Compile with C++17 standard:

```bash
# Compile with C++17 standard and all warnings
# -std=c++17: Use C++17 standard
# -Wall -Wextra: Enable comprehensive warnings
# -pedantic: Strict ISO C++ compliance
g++ -std=c++17 -Wall -Wextra -pedantic -g -o hello_cpp hello.cpp

# Run the program
./hello_cpp
```

---

## Clang/LLVM as an Alternative Compiler

Clang is a modern compiler built on the LLVM infrastructure. It offers excellent error messages, fast compilation, and advanced tooling support.

### Installing Clang

```bash
# Install Clang and LLVM tools
sudo apt install clang llvm -y

# Install additional LLVM tools for development
# clang-tools: Extra Clang-based tools
# lldb: LLVM debugger (alternative to GDB)
# lld: LLVM linker (faster than GNU ld)
sudo apt install clang-tools lldb lld -y

# Verify installation
clang --version
clang++ --version
```

### Installing a Specific Clang Version

```bash
# Add the official LLVM repository for the latest versions
# First, get the LLVM GPG key for package verification
wget -O - https://apt.llvm.org/llvm-snapshot.gpg.key | sudo apt-key add -

# Add the repository (replace 'jammy' with your Ubuntu codename)
# Use 'lsb_release -cs' to find your codename
sudo add-apt-repository "deb http://apt.llvm.org/$(lsb_release -cs)/ llvm-toolchain-$(lsb_release -cs)-17 main"

# Update and install Clang 17
sudo apt update
sudo apt install clang-17 lldb-17 lld-17 -y

# Set up alternatives for easy switching
sudo update-alternatives --install /usr/bin/clang clang /usr/bin/clang-17 100
sudo update-alternatives --install /usr/bin/clang++ clang++ /usr/bin/clang++-17 100
```

### Comparing GCC and Clang

```bash
# Compile the same program with both compilers to compare

# GCC compilation
gcc -O2 -Wall -o program_gcc program.c
time ./program_gcc

# Clang compilation
clang -O2 -Wall -o program_clang program.c
time ./program_clang

# Compare binary sizes
ls -la program_gcc program_clang

# Compare generated assembly (useful for optimization analysis)
gcc -S -O2 program.c -o program_gcc.s
clang -S -O2 program.c -o program_clang.s
diff program_gcc.s program_clang.s
```

### Clang's Superior Error Messages

One of Clang's strengths is its detailed error messages:

```c
/* error_example.c - Demonstrates Clang's helpful error messages */

#include <stdio.h>

int main() {
    int numbers[5] = {1, 2, 3, 4, 5};

    /* This typo will produce different error messages in GCC vs Clang */
    printf("Value: %d\n", number[0]);  /* 'number' instead of 'numbers' */

    return 0;
}
```

```bash
# Clang provides more detailed suggestions
clang -Wall error_example.c
# Output includes: "did you mean 'numbers'?"
```

---

## Build Systems: Make and CMake

Build systems automate the compilation process, handle dependencies, and manage complex projects efficiently.

### Understanding Make

Make is a classic build automation tool that uses Makefiles to define build rules:

```bash
# Make should be installed with build-essential
# Verify it's available
make --version

# If not installed, install it separately
sudo apt install make -y
```

### Installing CMake

CMake is a cross-platform build system generator that creates Makefiles (or other build files) from a simpler configuration:

```bash
# Install CMake from Ubuntu repositories
sudo apt install cmake -y

# Check the version
cmake --version

# For the latest CMake version, use the official Kitware repository
# Remove old cmake if needed
sudo apt remove cmake

# Add Kitware's APT repository
wget -O - https://apt.kitware.com/keys/kitware-archive-latest.asc 2>/dev/null | \
    gpg --dearmor - | \
    sudo tee /usr/share/keyrings/kitware-archive-keyring.gpg >/dev/null

# Add the repository
echo "deb [signed-by=/usr/share/keyrings/kitware-archive-keyring.gpg] https://apt.kitware.com/ubuntu/ $(lsb_release -cs) main" | \
    sudo tee /etc/apt/sources.list.d/kitware.list >/dev/null

# Update and install
sudo apt update
sudo apt install cmake -y
```

### Additional Build Tools

```bash
# Install Ninja - a fast build system often used with CMake
sudo apt install ninja-build -y

# Install ccache - compiler cache for faster rebuilds
sudo apt install ccache -y

# Configure ccache with GCC
# Add to your ~/.bashrc for permanent configuration
export CC="ccache gcc"
export CXX="ccache g++"
```

---

## Creating Makefiles

Makefiles define how to compile and link your project. Understanding Makefiles is essential for C/C++ development.

### Basic Makefile Structure

```makefile
# Makefile - Basic example for a C project
#
# Makefile syntax:
# target: dependencies
#     command (must be indented with TAB, not spaces)

# Compiler settings
CC = gcc                          # C compiler
CFLAGS = -Wall -Wextra -g         # Compiler flags: warnings + debug info
LDFLAGS =                         # Linker flags (libraries, etc.)

# Project settings
TARGET = myprogram                # Output executable name
SRCS = main.c utils.c math.c      # Source files
OBJS = $(SRCS:.c=.o)              # Object files (auto-generated list)

# Default target - runs when you type 'make' with no arguments
all: $(TARGET)

# Link object files to create the executable
# $@ = target name (myprogram)
# $^ = all dependencies (all .o files)
$(TARGET): $(OBJS)
	$(CC) $(LDFLAGS) -o $@ $^

# Pattern rule: compile any .c file to .o file
# $< = first dependency (the .c file)
# $@ = target name (the .o file)
%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

# Clean build artifacts
# .PHONY means 'clean' is not a real file
.PHONY: clean
clean:
	rm -f $(OBJS) $(TARGET)

# Install the program system-wide
.PHONY: install
install: $(TARGET)
	sudo cp $(TARGET) /usr/local/bin/

# Run the program
.PHONY: run
run: $(TARGET)
	./$(TARGET)
```

### Advanced Makefile with Automatic Dependencies

```makefile
# Makefile - Advanced example with automatic dependency tracking
#
# This Makefile automatically detects header file dependencies
# so you don't have to manually specify them

# Compiler and flags
CC = gcc
CXX = g++
CFLAGS = -Wall -Wextra -Wpedantic -std=c11 -g -O2
CXXFLAGS = -Wall -Wextra -Wpedantic -std=c++17 -g -O2
LDFLAGS = -lm -lpthread    # Link math and pthread libraries

# Directory structure
SRC_DIR = src
OBJ_DIR = obj
BIN_DIR = bin
INC_DIR = include

# Find all source files automatically
C_SRCS = $(wildcard $(SRC_DIR)/*.c)
CXX_SRCS = $(wildcard $(SRC_DIR)/*.cpp)

# Generate object file names
C_OBJS = $(C_SRCS:$(SRC_DIR)/%.c=$(OBJ_DIR)/%.o)
CXX_OBJS = $(CXX_SRCS:$(SRC_DIR)/%.cpp=$(OBJ_DIR)/%.o)
OBJS = $(C_OBJS) $(CXX_OBJS)

# Dependency files (generated by compiler)
DEPS = $(OBJS:.o=.d)

# Target executable
TARGET = $(BIN_DIR)/application

# Add include directory to compiler flags
CFLAGS += -I$(INC_DIR)
CXXFLAGS += -I$(INC_DIR)

# Default target
all: directories $(TARGET)

# Create necessary directories
.PHONY: directories
directories:
	@mkdir -p $(OBJ_DIR) $(BIN_DIR)

# Link all object files
$(TARGET): $(OBJS)
	$(CXX) -o $@ $^ $(LDFLAGS)
	@echo "Build complete: $@"

# Compile C source files
# -MMD -MP generates dependency files automatically
$(OBJ_DIR)/%.o: $(SRC_DIR)/%.c
	$(CC) $(CFLAGS) -MMD -MP -c $< -o $@

# Compile C++ source files
$(OBJ_DIR)/%.o: $(SRC_DIR)/%.cpp
	$(CXX) $(CXXFLAGS) -MMD -MP -c $< -o $@

# Include generated dependency files
# The '-' prefix means don't error if files don't exist yet
-include $(DEPS)

# Clean everything
.PHONY: clean
clean:
	rm -rf $(OBJ_DIR) $(BIN_DIR)
	@echo "Clean complete"

# Debug build (no optimization, extra debug info)
.PHONY: debug
debug: CFLAGS += -O0 -DDEBUG
debug: CXXFLAGS += -O0 -DDEBUG
debug: clean all

# Release build (maximum optimization, no debug)
.PHONY: release
release: CFLAGS = -Wall -O3 -DNDEBUG
release: CXXFLAGS = -Wall -O3 -DNDEBUG
release: clean all

# Print variables for debugging the Makefile itself
.PHONY: info
info:
	@echo "C Sources: $(C_SRCS)"
	@echo "C++ Sources: $(CXX_SRCS)"
	@echo "Objects: $(OBJS)"
	@echo "Target: $(TARGET)"
```

### Example Project Structure

```bash
# Create a standard project structure
mkdir -p myproject/{src,include,obj,bin,lib,tests}

# myproject/
# ├── src/           # Source files (.c, .cpp)
# ├── include/       # Header files (.h, .hpp)
# ├── obj/           # Object files (generated)
# ├── bin/           # Executables (generated)
# ├── lib/           # Libraries
# ├── tests/         # Test files
# └── Makefile       # Build configuration
```

---

## CMakeLists.txt Configuration

CMake provides a more portable and feature-rich alternative to hand-written Makefiles.

### Basic CMakeLists.txt

```cmake
# CMakeLists.txt - Basic CMake configuration
#
# CMake generates platform-specific build files
# (Makefiles on Linux, Visual Studio projects on Windows, etc.)

# Minimum CMake version required
# 3.16+ recommended for modern features
cmake_minimum_required(VERSION 3.16)

# Project name, version, and languages
# VERSION allows you to access PROJECT_VERSION later
project(MyApplication
    VERSION 1.0.0
    DESCRIPTION "A sample C++ application"
    LANGUAGES C CXX
)

# Set C++ standard globally for the project
# CMAKE_CXX_STANDARD_REQUIRED ensures the standard is enforced
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)  # Don't use compiler-specific extensions

# Set C standard
set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

# Add compiler warnings
# Different compilers use different flags
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    add_compile_options(-Wall -Wextra -Wpedantic)
endif()

# Define the executable and its source files
add_executable(${PROJECT_NAME}
    src/main.cpp
    src/utils.cpp
    src/math_functions.cpp
)

# Add include directories
# PUBLIC means dependent targets also get these includes
target_include_directories(${PROJECT_NAME} PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# Print configuration information
message(STATUS "Project: ${PROJECT_NAME} v${PROJECT_VERSION}")
message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "Compiler: ${CMAKE_CXX_COMPILER_ID} ${CMAKE_CXX_COMPILER_VERSION}")
```

### Advanced CMakeLists.txt with Libraries

```cmake
# CMakeLists.txt - Advanced configuration with libraries and options

cmake_minimum_required(VERSION 3.16)

project(AdvancedProject
    VERSION 2.0.0
    DESCRIPTION "Advanced CMake example with libraries"
    LANGUAGES CXX
)

# Options that users can configure
# Use: cmake -DBUILD_TESTS=ON ..
option(BUILD_TESTS "Build the test suite" ON)
option(BUILD_SHARED_LIBS "Build shared libraries" ON)
option(ENABLE_SANITIZERS "Enable AddressSanitizer and UBSan" OFF)

# Set default build type if not specified
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE "Release" CACHE STRING "Build type" FORCE)
endif()

# C++ standard configuration
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Export compile commands for IDE integration
# Creates compile_commands.json for clangd, VS Code, etc.
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Compiler-specific settings
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    add_compile_options(
        -Wall -Wextra -Wpedantic
        -Wconversion -Wsign-conversion
        -Wold-style-cast -Wcast-qual
    )

    # Enable sanitizers if requested
    if(ENABLE_SANITIZERS)
        add_compile_options(-fsanitize=address,undefined -fno-omit-frame-pointer)
        add_link_options(-fsanitize=address,undefined)
    endif()
endif()

# Create a library from source files
# STATIC or SHARED depends on BUILD_SHARED_LIBS option
add_library(mylib
    src/library/feature_a.cpp
    src/library/feature_b.cpp
    src/library/utilities.cpp
)

# Set library properties
target_include_directories(mylib
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/src/library
)

# Find and link external libraries
# REQUIRED means CMake will error if not found
find_package(Threads REQUIRED)
target_link_libraries(mylib PUBLIC Threads::Threads)

# Optional: Find and use OpenSSL if available
find_package(OpenSSL)
if(OpenSSL_FOUND)
    target_link_libraries(mylib PRIVATE OpenSSL::SSL OpenSSL::Crypto)
    target_compile_definitions(mylib PRIVATE HAS_OPENSSL=1)
endif()

# Create the main executable
add_executable(${PROJECT_NAME} src/main.cpp)
target_link_libraries(${PROJECT_NAME} PRIVATE mylib)

# Build tests if enabled
if(BUILD_TESTS)
    enable_testing()

    # Find Google Test framework
    find_package(GTest CONFIG)

    if(GTest_FOUND)
        add_executable(unit_tests
            tests/test_feature_a.cpp
            tests/test_feature_b.cpp
        )
        target_link_libraries(unit_tests PRIVATE mylib GTest::gtest_main)

        # Register tests with CTest
        include(GoogleTest)
        gtest_discover_tests(unit_tests)
    else()
        message(WARNING "Google Test not found, tests will not be built")
    endif()
endif()

# Installation rules
include(GNUInstallDirs)

install(TARGETS ${PROJECT_NAME} mylib
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
)

install(DIRECTORY include/
    DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
)

# Package configuration
include(CMakePackageConfigHelpers)
write_basic_package_version_file(
    "${CMAKE_CURRENT_BINARY_DIR}/${PROJECT_NAME}ConfigVersion.cmake"
    VERSION ${PROJECT_VERSION}
    COMPATIBILITY SameMajorVersion
)
```

### Building with CMake

```bash
# Standard out-of-source build workflow
# Always build in a separate directory to keep source clean

# Create and enter build directory
mkdir build && cd build

# Configure the project
# CMAKE_BUILD_TYPE options: Debug, Release, RelWithDebInfo, MinSizeRel
cmake -DCMAKE_BUILD_TYPE=Release ..

# Build the project
# -j$(nproc) uses all available CPU cores
cmake --build . -j$(nproc)

# Run tests (if configured)
ctest --output-on-failure

# Install (may need sudo)
sudo cmake --install .

# --- Alternative: Using Ninja for faster builds ---
# Configure with Ninja generator
cmake -G Ninja -DCMAKE_BUILD_TYPE=Release ..

# Build with Ninja
ninja

# --- Clean build ---
# Remove build directory and start fresh
cd .. && rm -rf build && mkdir build && cd build
```

---

## Working with Libraries and Header Files

Understanding how to use libraries is crucial for C/C++ development.

### System Header and Library Locations

```bash
# Standard system locations for headers and libraries
#
# Headers:
#   /usr/include          - System headers
#   /usr/local/include    - Locally installed headers
#
# Libraries:
#   /lib                  - Essential system libraries
#   /usr/lib              - Standard libraries
#   /usr/local/lib        - Locally installed libraries

# Find where a header file is located
find /usr -name "stdio.h" 2>/dev/null

# Find a specific library file
find /usr -name "libm.so*" 2>/dev/null

# List libraries in a directory
ls -la /usr/lib/x86_64-linux-gnu/ | head -20

# Check what libraries an executable needs
ldd /usr/bin/ls
```

### Installing Development Libraries

```bash
# Install common development libraries
# The '-dev' suffix indicates development files (headers + static libs)

# SSL/TLS library
sudo apt install libssl-dev -y

# JSON parsing library
sudo apt install libjsoncpp-dev -y

# Compression libraries
sudo apt install zlib1g-dev libbz2-dev liblzma-dev -y

# Database libraries
sudo apt install libsqlite3-dev libpq-dev -y

# Image processing
sudo apt install libpng-dev libjpeg-dev -y

# Boost C++ libraries (comprehensive collection)
sudo apt install libboost-all-dev -y

# GUI libraries
sudo apt install libgtk-3-dev libqt5-dev -y

# Search for available development packages
apt-cache search lib | grep "\-dev" | less
```

### Using pkg-config

pkg-config simplifies finding compiler and linker flags for installed libraries:

```bash
# Install pkg-config
sudo apt install pkg-config -y

# List all known packages
pkg-config --list-all

# Get compiler flags for a library
pkg-config --cflags openssl
# Output: -I/usr/include/openssl

# Get linker flags
pkg-config --libs openssl
# Output: -lssl -lcrypto

# Get both together
pkg-config --cflags --libs jsoncpp

# Use in compilation command
gcc $(pkg-config --cflags --libs libpng) -o png_example png_example.c
```

### Example: Using an External Library

```c
/* png_example.c - Example using libpng to create an image
 *
 * Compile: gcc $(pkg-config --cflags --libs libpng) -o png_example png_example.c
 */

#include <stdio.h>
#include <stdlib.h>
#include <png.h>  /* libpng header */

/* Function to create a simple gradient PNG image */
int create_gradient_png(const char *filename, int width, int height) {
    FILE *fp = NULL;
    png_structp png_ptr = NULL;
    png_infop info_ptr = NULL;
    png_bytep row = NULL;

    /* Open file for writing */
    fp = fopen(filename, "wb");
    if (fp == NULL) {
        fprintf(stderr, "Error: Cannot open file %s for writing\n", filename);
        return -1;
    }

    /* Initialize PNG write structure */
    png_ptr = png_create_write_struct(PNG_LIBPNG_VER_STRING, NULL, NULL, NULL);
    if (png_ptr == NULL) {
        fprintf(stderr, "Error: png_create_write_struct failed\n");
        fclose(fp);
        return -1;
    }

    /* Initialize PNG info structure */
    info_ptr = png_create_info_struct(png_ptr);
    if (info_ptr == NULL) {
        fprintf(stderr, "Error: png_create_info_struct failed\n");
        png_destroy_write_struct(&png_ptr, NULL);
        fclose(fp);
        return -1;
    }

    /* Set up error handling */
    if (setjmp(png_jmpbuf(png_ptr))) {
        fprintf(stderr, "Error during PNG creation\n");
        png_destroy_write_struct(&png_ptr, &info_ptr);
        fclose(fp);
        free(row);
        return -1;
    }

    png_init_io(png_ptr, fp);

    /* Write header (8-bit RGB) */
    png_set_IHDR(png_ptr, info_ptr, width, height,
                 8,                        /* Bit depth */
                 PNG_COLOR_TYPE_RGB,       /* Color type */
                 PNG_INTERLACE_NONE,
                 PNG_COMPRESSION_TYPE_DEFAULT,
                 PNG_FILTER_TYPE_DEFAULT);

    png_write_info(png_ptr, info_ptr);

    /* Allocate memory for one row (3 bytes per pixel for RGB) */
    row = (png_bytep)malloc(3 * width * sizeof(png_byte));

    /* Write image data row by row */
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            /* Create a gradient effect */
            row[x * 3 + 0] = (png_byte)(255 * x / width);      /* Red */
            row[x * 3 + 1] = (png_byte)(255 * y / height);     /* Green */
            row[x * 3 + 2] = (png_byte)(128);                  /* Blue */
        }
        png_write_row(png_ptr, row);
    }

    /* Finish writing */
    png_write_end(png_ptr, NULL);

    /* Clean up */
    png_destroy_write_struct(&png_ptr, &info_ptr);
    fclose(fp);
    free(row);

    printf("Successfully created %s (%dx%d)\n", filename, width, height);
    return 0;
}

int main(void) {
    return create_gradient_png("gradient.png", 256, 256);
}
```

---

## Static vs Shared Libraries

Understanding the difference between static and shared libraries is essential for proper application deployment.

### Static Libraries

Static libraries (`.a` files) are linked directly into the executable at compile time:

```bash
# Creating a static library

# Step 1: Write the source files
# math_utils.c - Implementation
```

```c
/* math_utils.c - Mathematical utility functions */

#include "math_utils.h"

/* Add two integers with overflow checking */
int safe_add(int a, int b, int *result) {
    /* Check for overflow before performing addition */
    if ((b > 0 && a > INT_MAX - b) || (b < 0 && a < INT_MIN - b)) {
        return -1;  /* Overflow would occur */
    }
    *result = a + b;
    return 0;  /* Success */
}

/* Calculate factorial recursively */
unsigned long factorial(unsigned int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

/* Calculate greatest common divisor using Euclidean algorithm */
int gcd(int a, int b) {
    /* Ensure positive values */
    if (a < 0) a = -a;
    if (b < 0) b = -b;

    /* Euclidean algorithm */
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}
```

```c
/* math_utils.h - Header file for math utilities */

#ifndef MATH_UTILS_H
#define MATH_UTILS_H

#include <limits.h>

/* Safe addition with overflow detection
 * Returns 0 on success, -1 on overflow */
int safe_add(int a, int b, int *result);

/* Calculate factorial of n
 * Warning: Will overflow for large values of n */
unsigned long factorial(unsigned int n);

/* Calculate greatest common divisor of a and b */
int gcd(int a, int b);

#endif /* MATH_UTILS_H */
```

```bash
# Step 2: Compile to object file
# -c: Compile only, don't link
# -fPIC: Position Independent Code (good practice, required for shared libs)
gcc -c -fPIC -Wall -O2 math_utils.c -o math_utils.o

# Step 3: Create the static library
# ar: Archive tool for creating static libraries
# rcs: r=insert, c=create, s=add index
ar rcs libmathutils.a math_utils.o

# Inspect the library contents
ar -t libmathutils.a        # List object files in archive
nm libmathutils.a           # List symbols in library

# Step 4: Use the static library
# Write a program that uses the library
```

```c
/* main.c - Program using the math utilities library */

#include <stdio.h>
#include "math_utils.h"

int main(void) {
    int result;

    /* Test safe_add */
    if (safe_add(100, 200, &result) == 0) {
        printf("100 + 200 = %d\n", result);
    }

    /* Test factorial */
    printf("10! = %lu\n", factorial(10));

    /* Test GCD */
    printf("GCD(48, 18) = %d\n", gcd(48, 18));

    return 0;
}
```

```bash
# Compile and link with the static library
# -L.: Look for libraries in current directory
# -lmathutils: Link with libmathutils.a
gcc -Wall -o main main.c -L. -lmathutils

# The static library is embedded in the executable
# No runtime dependency on libmathutils.a
./main

# Verify no dynamic dependency on our library
ldd main  # Won't show libmathutils
```

### Shared Libraries

Shared libraries (`.so` files) are loaded at runtime:

```bash
# Creating a shared library

# Compile with position-independent code
gcc -c -fPIC -Wall -O2 math_utils.c -o math_utils.o

# Create the shared library
# -shared: Create a shared library
# -Wl,-soname: Set the library's internal name
gcc -shared -Wl,-soname,libmathutils.so.1 -o libmathutils.so.1.0.0 math_utils.o

# Create symbolic links (standard versioning convention)
# libmathutils.so.1.0.0  - Actual library (major.minor.patch)
# libmathutils.so.1      - soname link (major version)
# libmathutils.so        - linker link (development)
ln -sf libmathutils.so.1.0.0 libmathutils.so.1
ln -sf libmathutils.so.1 libmathutils.so

# Compile program using the shared library
gcc -Wall -o main_shared main.c -L. -lmathutils

# The program needs the library at runtime
# Set library path or install system-wide
export LD_LIBRARY_PATH=.:$LD_LIBRARY_PATH
./main_shared

# Or install to system location
sudo cp libmathutils.so.1.0.0 /usr/local/lib/
sudo ldconfig  # Update library cache

# Verify the dynamic dependency
ldd main_shared  # Will show libmathutils.so.1
```

### Comparing Static vs Shared

```bash
# Compare executable sizes
ls -la main main_shared

# Static: Larger executable, no runtime dependencies
# Shared: Smaller executable, requires library at runtime

# Check dependencies
file main
file main_shared

ldd main          # Fewer dependencies
ldd main_shared   # Shows libmathutils.so

# When to use which:
# Static libraries:
#   - Self-contained executables
#   - No concern about library versioning
#   - Deployment to systems without the library
#
# Shared libraries:
#   - Multiple programs use the same library
#   - Reduce total disk/memory usage
#   - Update library without recompiling programs
#   - Plugin systems
```

---

## Package Managers: vcpkg and Conan

Modern C++ package managers simplify dependency management significantly.

### vcpkg Installation and Usage

vcpkg is Microsoft's cross-platform package manager for C/C++ libraries:

```bash
# Prerequisites
sudo apt install git curl zip unzip tar -y

# Clone vcpkg repository
git clone https://github.com/microsoft/vcpkg.git ~/.vcpkg
cd ~/.vcpkg

# Bootstrap vcpkg (builds the vcpkg executable)
./bootstrap-vcpkg.sh

# Add vcpkg to PATH (add to ~/.bashrc for persistence)
export PATH="$HOME/.vcpkg:$PATH"
export VCPKG_ROOT="$HOME/.vcpkg"

# Verify installation
vcpkg --version
```

Using vcpkg:

```bash
# Search for packages
vcpkg search json
vcpkg search boost

# Install packages
# Packages are built from source for your specific configuration
vcpkg install nlohmann-json
vcpkg install fmt
vcpkg install spdlog
vcpkg install boost-filesystem

# List installed packages
vcpkg list

# Install with specific triplet (target architecture/platform)
# x64-linux: 64-bit Linux, dynamic libraries
# x64-linux-static: 64-bit Linux, static libraries
vcpkg install openssl:x64-linux

# Integrate with CMake
# Add this to your CMake command:
# cmake -DCMAKE_TOOLCHAIN_FILE=$VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake ..
```

Example CMakeLists.txt with vcpkg:

```cmake
# CMakeLists.txt - Using vcpkg packages

cmake_minimum_required(VERSION 3.16)
project(VcpkgExample)

set(CMAKE_CXX_STANDARD 17)

# vcpkg packages are found automatically when using the toolchain file
find_package(fmt CONFIG REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)
find_package(spdlog CONFIG REQUIRED)

add_executable(${PROJECT_NAME} main.cpp)

target_link_libraries(${PROJECT_NAME} PRIVATE
    fmt::fmt
    nlohmann_json::nlohmann_json
    spdlog::spdlog
)
```

### Conan Installation and Usage

Conan is a decentralized C/C++ package manager:

```bash
# Install Conan using pip (Python package manager)
sudo apt install python3-pip -y
pip3 install conan

# Initialize Conan (creates default profile)
conan profile detect

# View and edit the default profile
conan profile show
cat ~/.conan2/profiles/default

# Search for packages on Conan Center
conan search "*json*" -r conancenter
```

Example Conan project setup:

```ini
# conanfile.txt - Conan dependencies file

[requires]
# Specify packages and versions
nlohmann_json/3.11.2
fmt/10.1.1
spdlog/1.12.0
boost/1.83.0

[generators]
# CMakeDeps: Generate CMake find_package files
# CMakeToolchain: Generate CMake toolchain file
CMakeDeps
CMakeToolchain

[options]
# Configure package options
boost/*:without_python=True
boost/*:without_test=True
```

```bash
# Install dependencies
mkdir build && cd build
conan install .. --output-folder=. --build=missing

# Configure and build with CMake
cmake .. -DCMAKE_TOOLCHAIN_FILE=conan_toolchain.cmake -DCMAKE_BUILD_TYPE=Release
cmake --build .
```

Alternative using `conanfile.py` for more control:

```python
# conanfile.py - Python-based Conan configuration

from conan import ConanFile
from conan.tools.cmake import CMakeToolchain, CMake, cmake_layout

class MyProjectConan(ConanFile):
    name = "myproject"
    version = "1.0"

    # Dependencies
    requires = [
        "nlohmann_json/3.11.2",
        "fmt/10.1.1",
        "spdlog/1.12.0",
        "gtest/1.14.0",
    ]

    # Build settings
    settings = "os", "compiler", "build_type", "arch"

    # Generators
    generators = "CMakeDeps"

    def layout(self):
        cmake_layout(self)

    def generate(self):
        tc = CMakeToolchain(self)
        tc.generate()

    def build(self):
        cmake = CMake(self)
        cmake.configure()
        cmake.build()

    def package(self):
        cmake = CMake(self)
        cmake.install()
```

---

## VS Code Setup with C/C++ Extension

Visual Studio Code provides an excellent C/C++ development experience with the right extensions.

### Installing VS Code

```bash
# Download and install VS Code from the official repository
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -D -o root -g root -m 644 packages.microsoft.gpg /etc/apt/keyrings/packages.microsoft.gpg
sudo sh -c 'echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/keyrings/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list'
rm -f packages.microsoft.gpg

sudo apt update
sudo apt install code -y

# Or download the .deb package directly
# wget -O vscode.deb 'https://code.visualstudio.com/sha/download?build=stable&os=linux-deb-x64'
# sudo dpkg -i vscode.deb
```

### Essential Extensions

```bash
# Install extensions from the command line
# C/C++ extension (IntelliSense, debugging, code browsing)
code --install-extension ms-vscode.cpptools

# C/C++ Extension Pack (includes CMake tools and more)
code --install-extension ms-vscode.cpptools-extension-pack

# CMake Tools (CMake integration)
code --install-extension ms-vscode.cmake-tools

# clangd (alternative to Microsoft's IntelliSense, often faster)
code --install-extension llvm-vs-code-extensions.vscode-clangd

# CodeLLDB (LLDB debugger, alternative to GDB)
code --install-extension vadimcn.vscode-lldb

# Makefile Tools
code --install-extension ms-vscode.makefile-tools
```

### VS Code Configuration Files

Create `.vscode` directory in your project for configuration:

```json
// .vscode/c_cpp_properties.json
// Configures IntelliSense for C/C++
{
    "configurations": [
        {
            "name": "Linux",
            "includePath": [
                "${workspaceFolder}/**",
                "${workspaceFolder}/include",
                "/usr/include",
                "/usr/local/include"
            ],
            "defines": [
                "_DEBUG",
                "UNICODE"
            ],
            "compilerPath": "/usr/bin/g++",
            "cStandard": "c11",
            "cppStandard": "c++17",
            "intelliSenseMode": "linux-gcc-x64",
            "configurationProvider": "ms-vscode.cmake-tools",
            "compileCommands": "${workspaceFolder}/build/compile_commands.json"
        }
    ],
    "version": 4
}
```

```json
// .vscode/tasks.json
// Defines build tasks
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Build with CMake",
            "type": "shell",
            "command": "cmake",
            "args": [
                "--build",
                "${workspaceFolder}/build",
                "--config",
                "Debug",
                "-j",
                "$(nproc)"
            ],
            "group": {
                "kind": "build",
                "isDefault": true
            },
            "problemMatcher": ["$gcc"],
            "detail": "CMake build task"
        },
        {
            "label": "Configure CMake",
            "type": "shell",
            "command": "cmake",
            "args": [
                "-S",
                "${workspaceFolder}",
                "-B",
                "${workspaceFolder}/build",
                "-DCMAKE_BUILD_TYPE=Debug",
                "-DCMAKE_EXPORT_COMPILE_COMMANDS=ON"
            ],
            "problemMatcher": []
        },
        {
            "label": "Clean Build",
            "type": "shell",
            "command": "rm",
            "args": ["-rf", "${workspaceFolder}/build/*"],
            "problemMatcher": []
        },
        {
            "label": "Build with Make",
            "type": "shell",
            "command": "make",
            "args": ["-j$(nproc)"],
            "options": {
                "cwd": "${workspaceFolder}"
            },
            "group": "build",
            "problemMatcher": ["$gcc"]
        }
    ]
}
```

```json
// .vscode/launch.json
// Configures debugging
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Debug with GDB",
            "type": "cppdbg",
            "request": "launch",
            "program": "${workspaceFolder}/build/myprogram",
            "args": [],
            "stopAtEntry": false,
            "cwd": "${workspaceFolder}",
            "environment": [],
            "externalConsole": false,
            "MIMode": "gdb",
            "miDebuggerPath": "/usr/bin/gdb",
            "setupCommands": [
                {
                    "description": "Enable pretty-printing for GDB",
                    "text": "-enable-pretty-printing",
                    "ignoreFailures": true
                },
                {
                    "description": "Set disassembly flavor to Intel",
                    "text": "-gdb-set disassembly-flavor intel",
                    "ignoreFailures": true
                }
            ],
            "preLaunchTask": "Build with CMake"
        },
        {
            "name": "Debug with LLDB",
            "type": "lldb",
            "request": "launch",
            "program": "${workspaceFolder}/build/myprogram",
            "args": [],
            "cwd": "${workspaceFolder}",
            "preLaunchTask": "Build with CMake"
        },
        {
            "name": "Attach to Process",
            "type": "cppdbg",
            "request": "attach",
            "program": "${workspaceFolder}/build/myprogram",
            "processId": "${command:pickProcess}",
            "MIMode": "gdb"
        }
    ]
}
```

```json
// .vscode/settings.json
// Workspace-specific settings
{
    "files.associations": {
        "*.h": "c",
        "*.hpp": "cpp",
        "*.tpp": "cpp",
        "array": "cpp",
        "vector": "cpp",
        "string": "cpp",
        "iostream": "cpp"
    },
    "C_Cpp.default.cppStandard": "c++17",
    "C_Cpp.default.cStandard": "c11",
    "C_Cpp.clang_format_style": "file",
    "C_Cpp.clang_format_fallbackStyle": "Google",
    "editor.formatOnSave": true,
    "cmake.configureOnOpen": true,
    "cmake.buildDirectory": "${workspaceFolder}/build",
    "[cpp]": {
        "editor.defaultFormatter": "ms-vscode.cpptools"
    },
    "[c]": {
        "editor.defaultFormatter": "ms-vscode.cpptools"
    }
}
```

---

## Debugging with GDB

GDB (GNU Debugger) is the standard debugger for C/C++ on Linux systems.

### Installing and Basic Usage

```bash
# GDB should be installed with build-essential
# If not, install it separately
sudo apt install gdb -y

# Check version
gdb --version

# Compile with debugging symbols
# -g: Include debug information
# -O0: Disable optimization (makes debugging easier)
gcc -g -O0 -Wall -o program program.c

# Start GDB with your program
gdb ./program

# Or start GDB and load program later
gdb
(gdb) file ./program
```

### Essential GDB Commands

```bash
# --- Inside GDB ---

# Running the program
(gdb) run                    # Run the program
(gdb) run arg1 arg2          # Run with arguments
(gdb) start                  # Run and stop at main()

# Breakpoints
(gdb) break main             # Set breakpoint at main function
(gdb) break filename.c:42    # Set breakpoint at line 42
(gdb) break function_name    # Set breakpoint at function
(gdb) break *0x4005a0        # Set breakpoint at address
(gdb) info breakpoints       # List all breakpoints
(gdb) delete 1               # Delete breakpoint 1
(gdb) disable 1              # Disable breakpoint 1
(gdb) enable 1               # Enable breakpoint 1
(gdb) clear main             # Clear breakpoints at main

# Conditional breakpoints
(gdb) break loop.c:10 if i == 50    # Break when condition is true

# Stepping through code
(gdb) next                   # Step over (execute line, skip functions)
(gdb) step                   # Step into (enter functions)
(gdb) finish                 # Step out (run until current function returns)
(gdb) continue               # Continue execution until next breakpoint
(gdb) until 100              # Continue until line 100

# Examining variables
(gdb) print variable         # Print variable value
(gdb) print *pointer         # Print dereferenced pointer
(gdb) print array[5]         # Print array element
(gdb) print sizeof(struct)   # Print size of type
(gdb) display variable       # Print variable after each step
(gdb) info locals            # Show all local variables
(gdb) info args              # Show function arguments

# Print formats
(gdb) print/x variable       # Print in hexadecimal
(gdb) print/d variable       # Print as decimal
(gdb) print/t variable       # Print as binary
(gdb) print/c variable       # Print as character

# Memory examination
(gdb) x/10xw &variable       # Examine 10 words in hex at address
(gdb) x/s string_ptr         # Examine as string
(gdb) x/i $pc                # Examine instructions at program counter

# Call stack
(gdb) backtrace              # Show call stack
(gdb) frame 2                # Select stack frame 2
(gdb) info frame             # Information about current frame
(gdb) up                     # Go up one stack frame
(gdb) down                   # Go down one stack frame

# Modifying execution
(gdb) set variable = value   # Change variable value
(gdb) return value           # Force return from function
(gdb) jump *address          # Jump to address (dangerous!)

# Watchpoints (break when variable changes)
(gdb) watch variable         # Break when variable changes
(gdb) rwatch variable        # Break when variable is read
(gdb) awatch variable        # Break on read or write

# Source code
(gdb) list                   # Show source code around current line
(gdb) list function          # Show source of function
(gdb) list 1,50              # Show lines 1-50

# Other useful commands
(gdb) info registers         # Show CPU registers
(gdb) disassemble function   # Show assembly code
(gdb) quit                   # Exit GDB
(gdb) help command           # Get help on a command
```

### GDB Init File for Better Experience

```bash
# Create ~/.gdbinit for persistent settings

cat > ~/.gdbinit << 'EOF'
# Enable command history
set history save on
set history size 10000
set history filename ~/.gdb_history

# Enable pretty printing for STL containers
set print pretty on
set print array on
set print array-indexes on

# Disable pagination for long output
set pagination off

# Show source code in TUI mode
# Use 'layout src' to enable
set tui border-kind space

# Python pretty printers for STL (if available)
python
import sys
sys.path.insert(0, '/usr/share/gcc/python')
from libstdcxx.v6.printers import register_libstdcxx_printers
register_libstdcxx_printers (None)
end

# Custom commands
define xxd
  dump binary memory /tmp/dump.bin $arg0 $arg0+$arg1
  shell xxd /tmp/dump.bin
end
document xxd
  Dump memory as hex: xxd address length
end

# Print std::string properly
define pstring
  print $arg0.c_str()
end
EOF
```

### Example Debug Session

```c
/* debug_example.c - A buggy program for debugging practice */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Structure to hold person data */
typedef struct {
    char name[50];
    int age;
    float salary;
} Person;

/* Function with a bug: doesn't handle NULL */
void print_person(Person *p) {
    printf("Name: %s\n", p->name);      /* BUG: No NULL check */
    printf("Age: %d\n", p->age);
    printf("Salary: %.2f\n", p->salary);
}

/* Function with array bounds bug */
void fill_array(int *arr, int size) {
    for (int i = 0; i <= size; i++) {   /* BUG: Off-by-one error */
        arr[i] = i * 10;
    }
}

int main(void) {
    /* Create and initialize a person */
    Person *employee = malloc(sizeof(Person));
    if (employee == NULL) {
        fprintf(stderr, "Memory allocation failed\n");
        return 1;
    }

    strcpy(employee->name, "John Doe");
    employee->age = 30;
    employee->salary = 75000.50;

    print_person(employee);

    /* Array with bounds issue */
    int numbers[5];
    fill_array(numbers, 5);

    /* Print array */
    for (int i = 0; i < 5; i++) {
        printf("numbers[%d] = %d\n", i, numbers[i]);
    }

    /* Bug: Using pointer after free */
    free(employee);
    print_person(employee);  /* BUG: Use after free */

    return 0;
}
```

```bash
# Debug session example
gcc -g -O0 -Wall -o debug_example debug_example.c

gdb ./debug_example
(gdb) break main
(gdb) run
(gdb) next                # Step through line by line
(gdb) print *employee     # Examine the structure
(gdb) break fill_array
(gdb) continue
(gdb) print size          # Check the size parameter
(gdb) watch numbers[5]    # Watch for out-of-bounds write
(gdb) continue
```

### Using AddressSanitizer (Alternative to GDB for Memory Bugs)

```bash
# Compile with AddressSanitizer to catch memory errors automatically
gcc -g -fsanitize=address -fno-omit-frame-pointer -o debug_asan debug_example.c

# Run - it will automatically detect memory errors
./debug_asan
# Output will show exact location of memory bugs
```

---

## Code Formatting with clang-format

Consistent code formatting improves readability and reduces merge conflicts. clang-format automatically formats C/C++ code.

### Installing clang-format

```bash
# Install clang-format
sudo apt install clang-format -y

# Check version
clang-format --version

# Install specific version if needed
sudo apt install clang-format-17 -y
```

### Using clang-format

```bash
# Format a single file (outputs to stdout)
clang-format main.cpp

# Format file in-place (modifies the file)
clang-format -i main.cpp

# Format multiple files
clang-format -i src/*.cpp include/*.hpp

# Format all C/C++ files recursively
find . -name "*.cpp" -o -name "*.hpp" -o -name "*.c" -o -name "*.h" | xargs clang-format -i

# Check if files are properly formatted (useful for CI)
clang-format --dry-run --Werror main.cpp
```

### Creating .clang-format Configuration

```yaml
# .clang-format - Configuration file for clang-format
# Place in project root directory

# Base style: LLVM, Google, Chromium, Mozilla, WebKit, Microsoft
# Start with a base and customize
BasedOnStyle: Google

# Language (Cpp covers both C and C++)
Language: Cpp

# Indentation
IndentWidth: 4
TabWidth: 4
UseTab: Never
IndentCaseLabels: true
IndentPPDirectives: BeforeHash
NamespaceIndentation: None

# Line length
ColumnLimit: 100

# Braces
BreakBeforeBraces: Attach
# Attach: func() {
# Allman: func()
#         {
# Linux: if () {  but func()
#                     {

# Function declarations
AllowShortFunctionsOnASingleLine: Empty
AllowShortIfStatementsOnASingleLine: Never
AllowShortLoopsOnASingleLine: false
AlwaysBreakAfterReturnType: None
AlwaysBreakTemplateDeclarations: Yes

# Alignment
AlignAfterOpenBracket: Align
AlignConsecutiveAssignments: false
AlignConsecutiveDeclarations: false
AlignEscapedNewlines: Left
AlignOperands: true
AlignTrailingComments: true

# Spacing
SpaceAfterCStyleCast: false
SpaceAfterTemplateKeyword: true
SpaceBeforeAssignmentOperators: true
SpaceBeforeParens: ControlStatements
SpaceInEmptyParentheses: false
SpacesInAngles: false
SpacesInCStyleCastParentheses: false
SpacesInParentheses: false
SpacesInSquareBrackets: false

# Includes
SortIncludes: true
IncludeBlocks: Regroup
IncludeCategories:
  # Main header (same name as source file)
  - Regex: '^"[^/]*\.h(pp)?"'
    Priority: 1
  # Project headers
  - Regex: '^"'
    Priority: 2
  # System headers
  - Regex: '^<.*>'
    Priority: 3

# Pointers and references
PointerAlignment: Left
# Left: int* ptr
# Right: int *ptr
# Middle: int * ptr

# Other
FixNamespaceComments: true
MaxEmptyLinesToKeep: 1
ReflowComments: true
SortUsingDeclarations: true

# C++11 and later
Standard: c++17
Cpp11BracedListStyle: true

# Penalties (trade-offs for line breaking)
PenaltyBreakBeforeFirstCallParameter: 19
PenaltyBreakComment: 300
PenaltyBreakFirstLessLess: 120
PenaltyBreakString: 1000
PenaltyExcessCharacter: 1000000
PenaltyReturnTypeOnItsOwnLine: 60
```

### Example: Before and After Formatting

Before formatting:

```cpp
// unformatted.cpp
#include<iostream>
#include<vector>
#include "myheader.h"
using namespace std;
class MyClass{
public:
int getValue()const{return value_;}
void setValue(int v){value_=v;}
private:
int value_;};
int main(){
vector<int>numbers={1,2,3,4,5};
for(auto&n:numbers){cout<<n<<" ";}
cout<<endl;
return 0;}
```

After `clang-format -i unformatted.cpp`:

```cpp
// unformatted.cpp
#include <iostream>
#include <vector>

#include "myheader.h"

using namespace std;

class MyClass {
   public:
    int getValue() const { return value_; }
    void setValue(int v) { value_ = v; }

   private:
    int value_;
};

int main() {
    vector<int> numbers = {1, 2, 3, 4, 5};
    for (auto& n : numbers) {
        cout << n << " ";
    }
    cout << endl;
    return 0;
}
```

### Git Pre-commit Hook for clang-format

```bash
#!/bin/bash
# .git/hooks/pre-commit
# Automatically format staged C/C++ files before commit

# Find all staged C/C++ files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(cpp|hpp|c|h)$')

if [ -n "$STAGED_FILES" ]; then
    echo "Running clang-format on staged files..."

    for file in $STAGED_FILES; do
        clang-format -i "$file"
        git add "$file"  # Re-stage formatted file
    done

    echo "Formatting complete."
fi

exit 0
```

---

## Static Analysis Tools

Static analysis tools examine your code without executing it, finding bugs, security vulnerabilities, and code quality issues.

### Cppcheck

Cppcheck is a static analysis tool for C/C++ code:

```bash
# Install cppcheck
sudo apt install cppcheck -y

# Basic usage
cppcheck main.cpp

# Check entire project with all checks enabled
cppcheck --enable=all --std=c++17 src/

# Generate XML report
cppcheck --enable=all --xml --xml-version=2 src/ 2> cppcheck_report.xml

# Suppress specific warnings
cppcheck --suppress=missingInclude src/

# Check with specific platform/configuration
cppcheck --platform=unix64 --std=c++17 src/

# Create suppressions file for false positives
# .cppcheck-suppressions
# missingInclude
# unusedFunction:src/debug_utils.cpp
cppcheck --suppressions-list=.cppcheck-suppressions src/
```

Example output:

```bash
$ cppcheck --enable=all example.cpp
[example.cpp:15]: (error) Memory leak: ptr
[example.cpp:22]: (warning) Possible null pointer dereference: data
[example.cpp:30]: (style) Variable 'x' is assigned a value that is never used
[example.cpp:45]: (performance) Prefer prefix ++/-- operators for non-primitive types
```

### Clang Static Analyzer

The Clang Static Analyzer provides deep analysis:

```bash
# Install clang tools
sudo apt install clang-tools -y

# Analyze a single file
clang --analyze main.cpp

# Use scan-build to analyze entire project
# Wraps your build command and analyzes during compilation
scan-build make

# With CMake
scan-build cmake --build .

# Generate HTML report
scan-build -o ./analysis_report make

# Enable specific checkers
scan-build -enable-checker security.insecureAPI.strcpy make

# List available checkers
clang --analyze -Xclang -analyzer-checker-help main.cpp
```

### Clang-Tidy

Clang-tidy provides linting and automatic fixes:

```bash
# Install clang-tidy
sudo apt install clang-tidy -y

# Basic usage
clang-tidy main.cpp -- -std=c++17

# With specific checks
clang-tidy -checks='modernize-*,readability-*' main.cpp -- -std=c++17

# Apply automatic fixes
clang-tidy -fix main.cpp -- -std=c++17

# Check entire project (requires compile_commands.json)
clang-tidy -p build/ src/*.cpp

# List available checks
clang-tidy -list-checks -checks='*'
```

Create `.clang-tidy` configuration file:

```yaml
# .clang-tidy - Configuration file

# Enable these check categories
Checks: >
  -*,
  bugprone-*,
  cert-*,
  clang-analyzer-*,
  cppcoreguidelines-*,
  misc-*,
  modernize-*,
  performance-*,
  readability-*,
  -modernize-use-trailing-return-type,
  -readability-magic-numbers,
  -cppcoreguidelines-avoid-magic-numbers

# Treat warnings as errors
WarningsAsErrors: ''

# Header filter (only check project headers)
HeaderFilterRegex: '.*'

# Format style for fixes
FormatStyle: file

# Check options
CheckOptions:
  - key: readability-identifier-naming.ClassCase
    value: CamelCase
  - key: readability-identifier-naming.FunctionCase
    value: camelBack
  - key: readability-identifier-naming.VariableCase
    value: lower_case
  - key: readability-identifier-naming.ConstantCase
    value: UPPER_CASE
  - key: readability-identifier-naming.PrivateMemberSuffix
    value: '_'
  - key: modernize-use-nullptr.NullMacros
    value: 'NULL'
  - key: cppcoreguidelines-special-member-functions.AllowSoleDefaultDtor
    value: true
```

### Valgrind for Runtime Analysis

Valgrind detects memory errors at runtime:

```bash
# Install valgrind
sudo apt install valgrind -y

# Basic memory check
valgrind ./program

# Detailed memory leak check
valgrind --leak-check=full --show-leak-kinds=all ./program

# Track origins of uninitialized values
valgrind --track-origins=yes ./program

# Generate suppression file for false positives
valgrind --gen-suppressions=all ./program

# Use suppressions file
valgrind --suppressions=valgrind.supp ./program

# Profiling with callgrind (CPU profiler)
valgrind --tool=callgrind ./program
# View results with kcachegrind
kcachegrind callgrind.out.*

# Memory profiling with massif
valgrind --tool=massif ./program
ms_print massif.out.*
```

### Comprehensive Static Analysis Script

```bash
#!/bin/bash
# analyze.sh - Run all static analysis tools

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$PROJECT_DIR/build"
REPORT_DIR="$PROJECT_DIR/analysis_reports"

echo "=== C/C++ Static Analysis Suite ==="
echo "Project: $PROJECT_DIR"
echo ""

# Create report directory
mkdir -p "$REPORT_DIR"

# 1. Cppcheck
echo "[1/4] Running Cppcheck..."
cppcheck \
    --enable=all \
    --std=c++17 \
    --xml \
    --xml-version=2 \
    --output-file="$REPORT_DIR/cppcheck.xml" \
    "$PROJECT_DIR/src" 2>&1 || true
echo "  Report: $REPORT_DIR/cppcheck.xml"

# 2. Clang Static Analyzer
echo "[2/4] Running Clang Static Analyzer..."
if [ -d "$BUILD_DIR" ]; then
    scan-build \
        -o "$REPORT_DIR/clang-analyzer" \
        cmake --build "$BUILD_DIR" --clean-first 2>&1 || true
    echo "  Report: $REPORT_DIR/clang-analyzer/"
fi

# 3. Clang-Tidy
echo "[3/4] Running Clang-Tidy..."
if [ -f "$BUILD_DIR/compile_commands.json" ]; then
    clang-tidy \
        -p "$BUILD_DIR" \
        "$PROJECT_DIR/src/"*.cpp \
        > "$REPORT_DIR/clang-tidy.txt" 2>&1 || true
    echo "  Report: $REPORT_DIR/clang-tidy.txt"
fi

# 4. Check formatting
echo "[4/4] Checking code formatting..."
find "$PROJECT_DIR/src" "$PROJECT_DIR/include" \
    -name "*.cpp" -o -name "*.hpp" -o -name "*.c" -o -name "*.h" | \
    xargs clang-format --dry-run --Werror 2>&1 > "$REPORT_DIR/format-check.txt" || true
echo "  Report: $REPORT_DIR/format-check.txt"

echo ""
echo "=== Analysis Complete ==="
echo "Reports saved to: $REPORT_DIR"
```

---

## Putting It All Together: Complete Project Example

Here's a complete example project structure incorporating everything we've covered:

```bash
# Create project structure
mkdir -p myproject/{src,include,tests,build,scripts,.vscode}
cd myproject
```

### Project Files

```cpp
/* include/calculator.hpp - Calculator class header */

#ifndef CALCULATOR_HPP
#define CALCULATOR_HPP

#include <stdexcept>
#include <string>

namespace math {

/**
 * @brief A simple calculator class demonstrating C++ best practices
 *
 * This class provides basic arithmetic operations with error handling
 * and serves as an example of proper C++ class design.
 */
class Calculator {
public:
    /**
     * @brief Construct a new Calculator object
     * @param precision Number of decimal places for results (default: 2)
     */
    explicit Calculator(int precision = 2);

    /**
     * @brief Add two numbers
     * @param a First operand
     * @param b Second operand
     * @return double The sum of a and b
     */
    double add(double a, double b) const noexcept;

    /**
     * @brief Subtract two numbers
     * @param a First operand
     * @param b Second operand
     * @return double The difference (a - b)
     */
    double subtract(double a, double b) const noexcept;

    /**
     * @brief Multiply two numbers
     * @param a First operand
     * @param b Second operand
     * @return double The product of a and b
     */
    double multiply(double a, double b) const noexcept;

    /**
     * @brief Divide two numbers
     * @param a Dividend
     * @param b Divisor
     * @return double The quotient (a / b)
     * @throws std::invalid_argument if b is zero
     */
    double divide(double a, double b) const;

    /**
     * @brief Get the current precision setting
     * @return int Number of decimal places
     */
    int getPrecision() const noexcept { return precision_; }

    /**
     * @brief Set the precision for results
     * @param precision Number of decimal places (must be >= 0)
     */
    void setPrecision(int precision);

private:
    int precision_;

    /**
     * @brief Round a number to the configured precision
     * @param value The value to round
     * @return double The rounded value
     */
    double roundToPrecision(double value) const noexcept;
};

}  // namespace math

#endif  // CALCULATOR_HPP
```

```cpp
/* src/calculator.cpp - Calculator class implementation */

#include "calculator.hpp"

#include <cmath>
#include <limits>

namespace math {

Calculator::Calculator(int precision) : precision_(precision) {
    if (precision < 0) {
        throw std::invalid_argument("Precision must be non-negative");
    }
}

double Calculator::add(double a, double b) const noexcept {
    return roundToPrecision(a + b);
}

double Calculator::subtract(double a, double b) const noexcept {
    return roundToPrecision(a - b);
}

double Calculator::multiply(double a, double b) const noexcept {
    return roundToPrecision(a * b);
}

double Calculator::divide(double a, double b) const {
    /* Check for division by zero using epsilon comparison */
    if (std::abs(b) < std::numeric_limits<double>::epsilon()) {
        throw std::invalid_argument("Division by zero is not allowed");
    }
    return roundToPrecision(a / b);
}

void Calculator::setPrecision(int precision) {
    if (precision < 0) {
        throw std::invalid_argument("Precision must be non-negative");
    }
    precision_ = precision;
}

double Calculator::roundToPrecision(double value) const noexcept {
    double multiplier = std::pow(10.0, precision_);
    return std::round(value * multiplier) / multiplier;
}

}  // namespace math
```

```cpp
/* src/main.cpp - Main application entry point */

#include <iostream>
#include <iomanip>

#include "calculator.hpp"

int main() {
    std::cout << "=== C++ Calculator Demo ===" << std::endl;
    std::cout << std::fixed << std::setprecision(4);

    try {
        /* Create calculator with 4 decimal places precision */
        math::Calculator calc(4);

        double a = 10.5;
        double b = 3.7;

        std::cout << "\nOperations with a=" << a << " and b=" << b << ":\n";
        std::cout << "  Addition:       " << calc.add(a, b) << std::endl;
        std::cout << "  Subtraction:    " << calc.subtract(a, b) << std::endl;
        std::cout << "  Multiplication: " << calc.multiply(a, b) << std::endl;
        std::cout << "  Division:       " << calc.divide(a, b) << std::endl;

        /* Test precision change */
        calc.setPrecision(2);
        std::cout << "\nWith precision=2:\n";
        std::cout << "  Division:       " << calc.divide(a, b) << std::endl;

        /* Test division by zero */
        std::cout << "\nTesting division by zero..." << std::endl;
        calc.divide(a, 0);  /* This will throw */

    } catch (const std::invalid_argument& e) {
        std::cerr << "Error: " << e.what() << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "Unexpected error: " << e.what() << std::endl;
        return 1;
    }

    std::cout << "\n=== Demo Complete ===" << std::endl;
    return 0;
}
```

```cmake
# CMakeLists.txt - Build configuration

cmake_minimum_required(VERSION 3.16)

project(CalculatorDemo
    VERSION 1.0.0
    DESCRIPTION "C++ Calculator demonstration project"
    LANGUAGES CXX
)

# Options
option(BUILD_TESTS "Build unit tests" ON)
option(ENABLE_COVERAGE "Enable code coverage" OFF)

# C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Export compile commands for IDE integration
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Compiler warnings
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    add_compile_options(
        -Wall -Wextra -Wpedantic
        -Wconversion -Wsign-conversion
    )

    if(ENABLE_COVERAGE)
        add_compile_options(--coverage -O0 -g)
        add_link_options(--coverage)
    endif()
endif()

# Library
add_library(calculator src/calculator.cpp)
target_include_directories(calculator PUBLIC include)

# Executable
add_executable(${PROJECT_NAME} src/main.cpp)
target_link_libraries(${PROJECT_NAME} PRIVATE calculator)

# Tests
if(BUILD_TESTS)
    enable_testing()

    find_package(GTest CONFIG)
    if(GTest_FOUND)
        add_executable(calculator_tests tests/test_calculator.cpp)
        target_link_libraries(calculator_tests PRIVATE calculator GTest::gtest_main)

        include(GoogleTest)
        gtest_discover_tests(calculator_tests)
    endif()
endif()

# Custom targets
add_custom_target(format
    COMMAND clang-format -i
        ${CMAKE_SOURCE_DIR}/src/*.cpp
        ${CMAKE_SOURCE_DIR}/include/*.hpp
    COMMENT "Formatting source files..."
)

add_custom_target(analyze
    COMMAND cppcheck --enable=all --std=c++17
        ${CMAKE_SOURCE_DIR}/src
        ${CMAKE_SOURCE_DIR}/include
    COMMENT "Running static analysis..."
)
```

### Build and Run

```bash
# Configure
cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug

# Build
cmake --build build -j$(nproc)

# Run
./build/CalculatorDemo

# Run tests (if Google Test is installed)
cd build && ctest --output-on-failure

# Format code
cmake --build build --target format

# Run static analysis
cmake --build build --target analyze
```

---

## Monitoring Your C/C++ Applications with OneUptime

After developing and deploying your C/C++ applications, proper monitoring becomes essential for maintaining reliability and performance. **OneUptime** provides comprehensive infrastructure and application monitoring that works seamlessly with applications written in any language, including C and C++.

### Why Monitor Your C/C++ Applications

C/C++ applications often run critical systems: servers, embedded devices, real-time systems, and high-performance computing workloads. Monitoring helps you:

- **Detect memory leaks** before they crash your application
- **Track resource usage** (CPU, memory, network) in production
- **Monitor service availability** with uptime checks
- **Set up alerts** for performance degradation or failures
- **Analyze logs** from your applications
- **Track incidents** and coordinate responses

### OneUptime Features for C/C++ Developers

1. **Infrastructure Monitoring**: Monitor the servers and containers running your C/C++ applications
2. **Uptime Monitoring**: Ensure your services are responding correctly
3. **Log Management**: Aggregate and analyze logs from your applications
4. **Alerting**: Get notified via email, SMS, Slack, or PagerDuty when issues arise
5. **Status Pages**: Communicate service status to users
6. **On-Call Management**: Coordinate incident response

### Getting Started

Visit [OneUptime](https://oneuptime.com) to create a free account and start monitoring your C/C++ applications today. The platform provides easy integration through various methods including HTTP endpoints, agents, and Prometheus-compatible metrics collection.

For C/C++ applications specifically, you can:
- Use the HTTP API to send custom metrics and events
- Configure log forwarding to aggregate application logs
- Set up synthetic monitors to test your service endpoints
- Create dashboards to visualize application performance

By combining a robust C/C++ development environment with comprehensive monitoring from OneUptime, you can build and maintain reliable, high-performance applications with confidence.
