# Validation Summary: How to Install ClickHouse from Source

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- ClickHouse (source build)
- Clang/LLVM toolchain
- CMake build system
- Ninja build tool
- Git (submodules)
- systemd / Linux service setup

## Sources Consulted
- ClickHouse official build documentation: https://clickhouse.com/docs/en/development/build
- ClickHouse developer instructions: https://clickhouse.com/docs/en/development/developer-instruction
- ClickHouse GitHub repository tag listing (`git ls-remote --tags https://github.com/ClickHouse/ClickHouse.git`)
- ClickHouse GitHub source tree: https://github.com/ClickHouse/ClickHouse/tree/master/programs/server
- LLVM apt install script: https://apt.llvm.org/llvm.sh

## Issues Found

1. **Outdated Clang version (Clang 15).** The official ClickHouse build docs state that, as of February 2026, Clang 21 or higher is required. Installing `clang-15` would fail to build current ClickHouse sources. Replaced the direct `apt-get install clang-15 clang++-15 lld-15` with LLVM's `llvm.sh 21` installer and updated the CMake compiler flags to reference `clang-21`/`clang++-21`.

2. **Missing build packages.** The original apt-get list was missing `build-essential`, `ccache`, `nasm`, `lsb-release`, `wget`, `software-properties-common`, and `gnupg`, all of which are part of the official recommended package set. Added these. `nasm` in particular is required because ClickHouse uses NASM for some assembly sources.

3. **Incorrect git tag format.** The post used `git checkout v24.3-lts`, but no such tag exists. ClickHouse LTS tags follow the `vMAJOR.MINOR.PATCH.BUILD-lts` pattern (e.g. `v24.3.12.75-lts`). Replaced with a real tag and noted that users should list tags with `git tag --list`.

4. **Wrong binary location after build.** After `ninja clickhouse`, the binary is produced at `build/programs/clickhouse`, not at `build/clickhouse`. The original `sudo cp clickhouse /usr/local/bin/` would fail with "No such file or directory". Updated the copy path and clarified the binary location.

5. **Non-canonical server config flag.** Changed `--config /etc/...` to `--config-file=/etc/...`, which is the canonical Poco-style option that `clickhouse server` exposes and matches the official documentation examples.

## Review Notes

- The post still has the user run the server as root with `sudo clickhouse server ...`. This works but is not best practice — running under the `clickhouse` system user (as the Debian/RPM packages do) would be safer. Left as-is since it is technically functional and changing it would alter the post's structure.
- Using the `v24.3` LTS as the specific tag example is getting dated (v25.x is current in 2026), but 24.3 LTS is still under long-term support, so the example remains valid. Future revisions may want to reference a more recent LTS.
- The "30–60 minutes on a 16-core machine" estimate is approximate and will vary significantly with disk speed, compiler cache, and selected build type; it is reasonable guidance.
- `ENABLE_TESTS=OFF` and `ENABLE_UTILS=OFF` are valid CMake options for a minimal build. For an even smaller footprint, `ENABLE_LIBRARIES=OFF` is the canonical minimal-build switch, but the original flags are not wrong.
