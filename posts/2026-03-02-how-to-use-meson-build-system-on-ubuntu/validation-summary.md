# Validation Summary: How to Use Meson Build System on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Meson build system
- Ninja build backend
- Ubuntu (apt, apt-file)
- pkg-config
- WrapDB (Meson's package registry)
- Cross-compilation toolchains (aarch64-linux-gnu)
- CMake module / pkg-config module integration
- C / C++ projects

## Sources Consulted
- Meson built-in options: https://mesonbuild.com/Builtin-options.html
- Meson commands reference: https://mesonbuild.com/Commands.html
- Meson cross-compilation: https://mesonbuild.com/Cross-compilation.html
- Meson machine files: https://mesonbuild.com/Machine-files.html
- Meson dependencies: https://mesonbuild.com/Dependencies.html
- Meson `summary()` reference: https://mesonbuild.com/Reference-manual_functions_summary.html
- Meson CMake module: https://mesonbuild.com/CMake-module.html
- WrapDB / wraptool: https://mesonbuild.com/Using-wraptool.html
- Configuring a build directory: https://mesonbuild.com/Configuring-a-build-directory.html

## Issues Found

1. **Incorrect default `buildtype`.** The post labeled `debugoptimized` as the default. Per Meson's built-in options docs, the default is `debug`. Fixed the inline comments so `debug` is marked as the default and `debugoptimized` is described as "some optimization + debug".

2. **`ninja -C builddir test --verbose` does not produce verbose test output.** `--verbose` is consumed by ninja itself (making ninja verbose), not forwarded to the test runner. Replaced with `meson test -C builddir --verbose`, which is the documented way to see output even from passing tests.

3. **`ninja -C builddir test --test-args="..."` does not work.** `--test-args` is a flag of `meson test`, not of the ninja `test` target. Replaced with `meson test -C builddir --test-args="..."`.

4. **Incorrect binary key in the cross-file.** The post used `pkgconfig = ...` in the `[binaries]` section. The canonical key per Meson's machine-files / cross-compilation docs is `pkg-config` (hyphenated). Fixed.

## Review Notes
- `pip3 install --user meson` will fail on Ubuntu 23.04+ and 24.04 with a PEP 668 "externally-managed-environment" error unless `--break-system-packages` is added or `pipx` is used. The instructions remain correct on older Ubuntu releases and inside virtualenvs, so left as-is, but readers on the latest LTS may need `pipx install meson` instead.
- All other commands, Meson DSL snippets (`project()`, `executable()`, `shared_library()`, `static_library()`, `install_headers()`, `summary()` with a dict, `dependency('threads')`, fallback subprojects, `pkgconfig.generate()`, `cmake.write_basic_package_version_file()`), `meson configure`/`meson setup --reconfigure`/`--wipe`, introspection subcommands, and `meson wrap list`/`install` were verified correct against the current Meson documentation.
