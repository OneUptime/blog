# How to Set Up CMake for C/C++ Projects on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, CMake, C++, Build System, Development

Description: A practical guide to setting up CMake on Ubuntu for C and C++ projects, covering project structure, targets, dependencies, testing, and packaging.

---

CMake is the de facto build system generator for C and C++ projects. It does not compile code directly - instead it generates build files for your native build system (Makefiles on Linux, Ninja, Visual Studio projects on Windows). This abstraction means a single `CMakeLists.txt` can build your project on any platform. Most major C++ libraries and frameworks (Qt, OpenCV, LLVM, Boost) use CMake, which makes integration straightforward.

## Installing CMake

```bash
# Install CMake from Ubuntu repositories
sudo apt update
sudo apt install cmake cmake-doc ninja-build build-essential -y

# Verify the installed version
cmake --version

# For a newer version than the Ubuntu repos provide, use Kitware's repo
wget -O - https://apt.kitware.com/keys/kitware-archive-latest.asc 2>/dev/null | \
    gpg --dearmor - | sudo tee /usr/share/keyrings/kitware-archive-keyring.gpg >/dev/null

echo "deb [signed-by=/usr/share/keyrings/kitware-archive-keyring.gpg] https://apt.kitware.com/ubuntu/ $(lsb_release -cs) main" | \
    sudo tee /etc/apt/sources.list.d/kitware.list

sudo apt update
sudo apt install cmake -y
cmake --version
```

## Recommended Project Structure

A typical CMake project layout:

```
myproject/
├── CMakeLists.txt          # Root CMake file
├── src/
│   ├── CMakeLists.txt      # Sources CMake file
│   ├── main.cpp
│   └── utils.cpp
├── include/
│   └── myproject/
│       └── utils.h
├── tests/
│   ├── CMakeLists.txt      # Tests CMake file
│   └── test_utils.cpp
├── cmake/
│   └── FindSomeLib.cmake   # Custom find modules
└── build/                  # Build directory (never committed to git)
```

## Root CMakeLists.txt

```cmake
# CMakeLists.txt - Root file for myproject

# Minimum CMake version required
cmake_minimum_required(VERSION 3.20)

# Project declaration
project(
    myproject
    VERSION 1.0.0
    DESCRIPTION "A sample C++ project"
    LANGUAGES CXX
)

# Set C++ standard globally
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Build type handling (default to Release if not specified)
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
endif()

message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "C++ standard: ${CMAKE_CXX_STANDARD}")

# Project-wide compile options
add_compile_options(
    -Wall
    -Wextra
    -Wpedantic
    $<$<CONFIG:Debug>:-g -O0 -DDEBUG>
    $<$<CONFIG:Release>:-O3 -DNDEBUG>
)

# Add source directory
add_subdirectory(src)

# Enable testing (before adding test subdirectory)
enable_testing()
add_subdirectory(tests)
```

## Source CMakeLists.txt

```cmake
# src/CMakeLists.txt

# Collect source files
set(SOURCES
    main.cpp
    utils.cpp
    parser.cpp
)

# Create a library from utility sources
add_library(mylib STATIC
    utils.cpp
    parser.cpp
)

# Set include directories for the library
target_include_directories(mylib
    PUBLIC
        # Headers available to users of this library
        ${CMAKE_SOURCE_DIR}/include
    PRIVATE
        # Internal headers (not exposed to users)
        ${CMAKE_CURRENT_SOURCE_DIR}
)

# Set library compile options
target_compile_features(mylib
    PUBLIC
        cxx_std_17
)

# Create the executable
add_executable(myapp main.cpp)

# Link the executable against our library
target_link_libraries(myapp
    PRIVATE
        mylib
)

# Install rules
install(TARGETS myapp mylib
    RUNTIME DESTINATION bin       # Executables
    LIBRARY DESTINATION lib       # Shared libraries
    ARCHIVE DESTINATION lib       # Static libraries
)

install(DIRECTORY ${CMAKE_SOURCE_DIR}/include/
    DESTINATION include
)
```

## Building the Project

```bash
# Create a build directory (out-of-source build)
mkdir build && cd build

# Configure with CMake (generates Makefiles by default)
cmake ..

# Configure with specific build type
cmake -DCMAKE_BUILD_TYPE=Release ..

# Configure using Ninja (faster builds)
cmake -G Ninja -DCMAKE_BUILD_TYPE=Release ..

# Build the project
cmake --build .

# Build with multiple cores
cmake --build . -- -j$(nproc)

# Build a specific target
cmake --build . --target myapp
cmake --build . --target mylib

# Install
sudo cmake --install .

# Install to custom prefix
cmake --install . --prefix /usr/local
```

## Finding and Using External Libraries

### Using find_package

```cmake
# Find Boost
find_package(Boost 1.74 REQUIRED COMPONENTS
    filesystem
    program_options
)

target_link_libraries(myapp
    PRIVATE
        Boost::filesystem
        Boost::program_options
)

# Find OpenSSL
find_package(OpenSSL REQUIRED)
target_link_libraries(myapp PRIVATE OpenSSL::SSL OpenSSL::Crypto)

# Find threads (portable way to link pthreads)
find_package(Threads REQUIRED)
target_link_libraries(myapp PRIVATE Threads::Threads)

# Optional package handling
find_package(ZLIB)
if(ZLIB_FOUND)
    target_link_libraries(myapp PRIVATE ZLIB::ZLIB)
    target_compile_definitions(myapp PRIVATE HAS_ZLIB=1)
endif()
```

### Using pkg-config

```cmake
# Find libraries via pkg-config
find_package(PkgConfig REQUIRED)
pkg_check_modules(LIBCURL REQUIRED libcurl)

target_include_directories(myapp PRIVATE ${LIBCURL_INCLUDE_DIRS})
target_link_libraries(myapp PRIVATE ${LIBCURL_LIBRARIES})
target_compile_options(myapp PRIVATE ${LIBCURL_CFLAGS_OTHER})
```

### Using FetchContent (CMake 3.14+)

Download and build dependencies automatically:

```cmake
include(FetchContent)

# Download and build GoogleTest
FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG        v1.14.0
)

# Download fmt library
FetchContent_Declare(
    fmt
    GIT_REPOSITORY https://github.com/fmtlib/fmt.git
    GIT_TAG        10.2.1
)

# Make both available
FetchContent_MakeAvailable(googletest fmt)

# Link against them
target_link_libraries(myapp PRIVATE fmt::fmt)
target_link_libraries(mytest PRIVATE GTest::gtest_main)
```

## Testing with CTest

```cmake
# tests/CMakeLists.txt

# FetchContent to get GoogleTest if not already fetched
include(FetchContent)
FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG        v1.14.0
)
FetchContent_MakeAvailable(googletest)

# Create test executable
add_executable(myproject_tests
    test_utils.cpp
    test_parser.cpp
)

target_link_libraries(myproject_tests
    PRIVATE
        mylib               # Our library to test
        GTest::gtest_main   # Google Test framework
)

# Register tests with CTest
include(GoogleTest)
gtest_discover_tests(myproject_tests)
```

```bash
# Run tests with CTest
cd build
ctest

# Run with verbose output
ctest -V

# Run tests matching a pattern
ctest -R "utils"

# Run tests in parallel
ctest -j$(nproc)

# Show output on failure
ctest --output-on-failure
```

## Compile Options Per Configuration

```cmake
# Set different options for Debug vs Release
target_compile_options(myapp PRIVATE
    # Options for all builds
    -Wall
    -Wextra

    # Debug-only options
    $<$<CONFIG:Debug>:-g -O0 -fsanitize=address,undefined>

    # Release-only options
    $<$<CONFIG:Release>:-O3 -march=native -DNDEBUG>

    # RelWithDebInfo options
    $<$<CONFIG:RelWithDebInfo>:-O2 -g>
)

# Linker flags for sanitizers in debug builds
target_link_options(myapp PRIVATE
    $<$<CONFIG:Debug>:-fsanitize=address,undefined>
)
```

## Generating Compilation Database for IDE Support

```bash
# Generate compile_commands.json for IDE integration (clangd, VSCode, etc.)
cmake -DCMAKE_EXPORT_COMPILE_COMMANDS=ON ..

# The file is created at build/compile_commands.json
# Link it to the project root for IDEs to find automatically
ln -s build/compile_commands.json compile_commands.json
```

## CMakePresets.json

CMake 3.19+ supports presets for standardized configurations:

```json
{
    "version": 3,
    "configurePresets": [
        {
            "name": "default",
            "displayName": "Default Config",
            "description": "Default build with Ninja",
            "generator": "Ninja",
            "binaryDir": "${sourceDir}/build/${presetName}",
            "cacheVariables": {
                "CMAKE_BUILD_TYPE": "Debug",
                "CMAKE_EXPORT_COMPILE_COMMANDS": "ON"
            }
        },
        {
            "name": "release",
            "displayName": "Release Build",
            "inherits": "default",
            "cacheVariables": {
                "CMAKE_BUILD_TYPE": "Release"
            }
        }
    ],
    "buildPresets": [
        {
            "name": "default",
            "configurePreset": "default"
        },
        {
            "name": "release",
            "configurePreset": "release"
        }
    ],
    "testPresets": [
        {
            "name": "default",
            "configurePreset": "default",
            "output": {"outputOnFailure": true}
        }
    ]
}
```

```bash
# Use presets
cmake --preset default
cmake --build --preset default
ctest --preset default

cmake --preset release
cmake --build --preset release
```

## Common CMake Patterns and Tips

```cmake
# Get the compiler name for conditional compilation
if(CMAKE_CXX_COMPILER_ID STREQUAL "GNU")
    message(STATUS "GCC detected")
elseif(CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
    message(STATUS "Clang detected")
endif()

# Print all CMake variables for debugging
# get_cmake_property(_variableNames VARIABLES)
# foreach(_variableName ${_variableNames})
#     message(STATUS "${_variableName}=${${_variableName}}")
# endforeach()

# Set position-independent code for shared libraries
set_property(TARGET mylib PROPERTY POSITION_INDEPENDENT_CODE ON)

# Alias target (useful for consistent naming)
add_library(myproject::mylib ALIAS mylib)
```

CMake's target-based model (where properties like include directories and compile flags are attached to targets and propagate automatically) is its most important feature. Understanding `PRIVATE`, `PUBLIC`, and `INTERFACE` in `target_link_libraries` and `target_include_directories` unlocks most of what CMake does well, and makes large multi-library projects manageable.
