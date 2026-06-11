# Validation Summary: How to Create Fuzz Testing Integration

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- AFL++
- LLVM libFuzzer
- C and C++ fuzz targets
- AddressSanitizer, MemorySanitizer, UndefinedBehaviorSanitizer
- Go native fuzzing with `go test -fuzz`
- Rust `cargo-fuzz`
- GitHub Actions
- OSS-Fuzz
- Python crash triage scripting

## Sources Consulted
- AFL++ Fuzzing in Depth: https://aflplus.plus/docs/fuzzing_in_depth/
- AFL++ environment variables documentation: https://github.com/AFLplusplus/AFLplusplus/blob/stable/docs/env_variables.md
- LLVM libFuzzer documentation: https://llvm.org/docs/LibFuzzer.html
- Go fuzzing tutorial: https://go.dev/doc/tutorial/fuzz
- rust-fuzz/cargo-fuzz README and command options: https://github.com/rust-fuzz/cargo-fuzz
- Rust Fuzz Book cargo-fuzz tutorial: https://rust-fuzz.github.io/book/cargo-fuzz/tutorial.html
- OSS-Fuzz new project guide: https://google.github.io/oss-fuzz/getting-started/new-project-guide/
- OSS-Fuzz ideal integration guide: https://google.github.io/oss-fuzz/advanced-topics/ideal-integration/
- GitHub Actions workflow syntax and official action documentation: https://docs.github.com/actions

## Issues Found
- The AFL file-based C harness accessed `argv[1]` without checking `argc`, so running it without the expected `@@` argument would dereference a missing argument. Added an `argc` guard and a negative `ftell` check.
- The libFuzzer C target used `malloc` and `free` without including `<stdlib.h>`. Added the missing include.
- The libFuzzer command example placed explanatory comments after line-continuation backslashes, which makes the shell command invalid. Moved those explanations below the command.
- The email validation example passed a potentially negative `char` to `isalnum`, which is undefined behavior for arbitrary fuzz bytes. Cast the input byte to `unsigned char` before calling `isalnum`.
- The Rust `cargo-fuzz` sanitizer example passed `-sanitizer=address` after `--`, which sends it to libFuzzer instead of cargo-fuzz. Replaced it with the cargo-fuzz `--sanitizer memory` build option and noted that AddressSanitizer is the default.
- The GitHub Actions fuzzing step used `|| true`, which would hide crashes and sanitizer findings, not just timeout exits. Replaced it with status handling that ignores GNU `timeout` exit code 124 but preserves other failures.
- The OSS-Fuzz Dockerfile copied `.` into `$SRC`, which is usually the OSS-Fuzz project config context rather than the upstream project source. Replaced it with a `git clone` pattern matching the OSS-Fuzz guide.

## Review Notes
The examples are intentionally illustrative and still use placeholder project APIs such as `parse_input`, `json_parse`, `ValidateUsername`, and `ParseJSON`; those are acceptable for a tutorial as long as readers adapt them to their project. The OSS-Fuzz `build.sh` remains generic because the exact CMake target and fuzz target names are project-specific.
