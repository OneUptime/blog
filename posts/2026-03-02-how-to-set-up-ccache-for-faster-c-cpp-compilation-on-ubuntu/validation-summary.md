# Validation Summary: How to Set Up ccache for Faster C/C++ Compilation on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ccache (compiler cache, 4.x)
- GCC / G++ (C/C++ compilers)
- Ubuntu (apt package management)
- CMake (`CMAKE_<LANG>_COMPILER_LAUNCHER`)
- Meson / Ninja
- distcc (distributed compilation)
- GitHub Actions (actions/checkout@v4, actions/cache@v4)
- GitLab CI

## Sources Consulted
- ccache official manual: https://ccache.dev/manual/latest.html
- ccache GitHub: https://github.com/ccache/ccache
- Ubuntu package info for ccache: https://packages.ubuntu.com/search?keywords=ccache
- CMake docs for COMPILER_LAUNCHER: https://cmake.org/cmake/help/latest/variable/CMAKE_LANG_COMPILER_LAUNCHER.html
- GitHub Actions cache docs: https://github.com/actions/cache
- distcc documentation: https://github.com/distcc/distcc

## Issues Found
- **Invalid ccache config option `statistics_update_interval`**: The sample `ccache.conf` included `statistics_update_interval = 0` with a comment "Keep extended statistics". This option does not exist in ccache 4.x. Replaced it with a commented-out reference to the real `stats_log` option, which is the correct mechanism for logging statistics updates.

## Review Notes
- The wrapper script directory `/usr/lib/ccache/` is correct for Ubuntu's ccache package.
- The `--show-stats` sample output matches the format used by ccache 4.x ("Summary" + "Primary storage" sections with Direct/Preprocessed/Misses/Uncacheable categories).
- The default `max_size` of 5G is correct as of recent ccache versions.
- The config file path `~/.config/ccache/ccache.conf` follows the XDG Base Directory spec used by ccache 4.x; the legacy `~/.ccache/ccache.conf` is not mentioned but is still supported as a fallback.
- The `compression_level = 6` value is valid for the default zstd compressor (range is roughly -131 to 22; 6 is a reasonable middle-ground).
- `sloppiness = time_macros` is a valid sloppiness flag for ignoring `__DATE__`/`__TIME__`/`__TIMESTAMP__` macros.
- `CCACHE_PREFIX`, `CCACHE_DIR`, `CCACHE_UMASK`, and `CCACHE_LOGFILE` are all real, correctly-named environment variables.
- CMake's `CMAKE_C_COMPILER_LAUNCHER` / `CMAKE_CXX_COMPILER_LAUNCHER` mechanism is correctly described.
- GitHub Actions snippet uses current major versions (`actions/checkout@v4`, `actions/cache@v4`).
- The `chmod 2775` with setgid bit on the shared cache directory is the right pattern for group-shared caches.
- The order `ccache distcc gcc` (ccache outermost) is the recommended ordering per the official ccache docs.
