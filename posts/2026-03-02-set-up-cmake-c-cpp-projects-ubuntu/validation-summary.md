# Validation Summary: How to Set Up CMake for C/C++ Projects on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CMake (build system generator, 3.19+ features)
- Ninja (build tool)
- Ubuntu (apt, Kitware APT repository)
- C++17 (language standard)
- GoogleTest (testing framework, v1.14.0)
- fmt (formatting library, v10.2.1)
- Boost (filesystem, program_options)
- OpenSSL
- pkg-config (libcurl example)
- CTest (test runner)
- CMakePresets.json (schema versions 1–3)
- Generator expressions (`$<CONFIG:...>`)
- compile_commands.json (clangd / IDE integration)

## Sources Consulted
- CMake official manual: https://cmake.org/cmake/help/latest/
- CMakePresets schema versions: https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html
- Kitware APT repository: https://apt.kitware.com/
- `find_package` imported targets for Boost, OpenSSL, Threads, ZLIB (CMake `Find*` module docs)
- GoogleTest CMake integration / `gtest_discover_tests`: https://cmake.org/cmake/help/latest/module/GoogleTest.html
- FetchContent module documentation: https://cmake.org/cmake/help/latest/module/FetchContent.html
- `install(TARGETS ...)` documentation (RUNTIME / LIBRARY / ARCHIVE destinations)

## Issues Found
- **CMakePresets version mismatch**: The intro stated "CMake 3.19+ supports presets" but the example JSON uses `"version": 3`, which requires CMake 3.21+ (schema v1 was CMake 3.19, v2 was 3.20, v3 was 3.21). Updated the sentence to clarify that the specific example requires CMake 3.21+ while the general feature is from 3.19.

## Review Notes
- The `SOURCES` variable defined at the top of `src/CMakeLists.txt` is never actually used (the executable uses `main.cpp` directly, and the library lists its sources inline). Harmless but stylistically inconsistent — left as-is since it's not a technical error.
- The FetchContent example links `target_link_libraries(mytest PRIVATE GTest::gtest_main)`, but `mytest` is not declared in that snippet. It is a sketch of usage assuming a target defined elsewhere; not strictly wrong.
- Calling Boost a library that "uses CMake" is a slight stretch — Boost's primary build system is Boost.Build (b2), though it ships CMake config files and is commonly integrated via `find_package(Boost)`. The post's later use of `find_package(Boost ...)` is correct.
- The `cmake --build . -- -j$(nproc)` form is correct; the more modern `cmake --build . --parallel $(nproc)` (CMake 3.12+) is also valid and a slight readability improvement, but the form used works fine.
- `install(TARGETS ...)` with hardcoded `bin`/`lib` destinations works but using `include(GNUInstallDirs)` with `CMAKE_INSTALL_BINDIR` / `CMAKE_INSTALL_LIBDIR` is the modern best practice. Not technically wrong as written.
- The Kitware APT key URL and signed-by pattern are current and correct per https://apt.kitware.com/.
- Imported targets used (`Boost::filesystem`, `OpenSSL::SSL`, `Threads::Threads`, `ZLIB::ZLIB`, `GTest::gtest_main`, `fmt::fmt`) are all valid for the versions referenced.
