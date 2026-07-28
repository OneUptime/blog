# Validation Summary: Why Does `make -j` Race? Fixing Missing and Order-Only Prerequisites

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- GNU Make
- Parallel builds and dependency graphs
- C and C++ compilation
- GCC-compatible dependency generation
- Recursive Make and the GNU Make jobserver
- POSIX-style shell commands and filesystem operations

## Sources Consulted
- [GNU Make: Parallel Execution](https://www.gnu.org/software/make/manual/html_node/Parallel.html)
- [GNU Make: Writing Rules](https://www.gnu.org/software/make/manual/html_node/Rules.html)
- [GNU Make: Types of Prerequisites](https://www.gnu.org/software/make/manual/html_node/Prerequisite-Types.html)
- [GNU Make: Including Other Makefiles](https://www.gnu.org/software/make/manual/html_node/Include.html)
- [GNU Make: Generating Prerequisites Automatically](https://www.gnu.org/software/make/manual/html_node/Automatic-Prerequisites.html)
- [GNU Make: Phony Targets](https://www.gnu.org/software/make/manual/html_node/Phony-Targets.html)
- [GNU Make: Multiple Targets in a Rule](https://www.gnu.org/software/make/manual/html_node/Multiple-Targets.html)
- [GNU Make: Disabling Parallel Execution](https://www.gnu.org/software/make/manual/html_node/Parallel-Disable.html)
- [GNU Make: Summary of Options](https://www.gnu.org/software/make/manual/html_node/Options-Summary.html)
- [GNU Make: How the `MAKE` Variable Works](https://www.gnu.org/software/make/manual/html_node/MAKE-Variable.html)
- [GNU Make: Sharing Job Slots](https://www.gnu.org/software/make/manual/html_node/Job-Slots.html)
- [GNU Make: Errors in Recipes](https://www.gnu.org/software/make/manual/html_node/Errors.html)
- [GNU Make 4.3 release announcement](https://lists.gnu.org/archive/html/info-gnu/2020-01/msg00004.html)
- [GNU Make 4.4 release announcement](https://lists.gnu.org/archive/html/info-gnu/2022-10/msg00008.html)
- [GCC: Options Controlling the Preprocessor](https://gcc.gnu.org/onlinedocs/gcc/Preprocessor-Options.html)

## Issues Found
- The opening serial-versus-parallel example used a generator path and arguments that did not match the corrected example, and it assumed the output directories already existed. Updated the command to use `scripts/generate-config` with `config/schema.json` and added idempotent directory creation so the example can work from a clean tree while retaining the intended missing dependency edge.
- The action targets `all`, `generate`, `compile`, `test-a`, and `test-b` were not declared phony. Added `.PHONY` declarations so files with those names cannot suppress the user-facing actions.
- The header-dependency guidance mentioned `-MMD -MP` but did not say that Make must read the emitted `.d` files. Added `-include build/*.d` guidance and clarified the distinct roles of `-MMD` and `-MP`; generating a dependency file alone does not add its rules to Make's graph.
- Grouped explicit targets were described without their minimum GNU Make version. Clarified that `&:` requires GNU Make 4.3 or later.
- Target-specific `.NOTPARALLEL` behavior, `.WAIT`, and `--shuffle` were described without their minimum GNU Make version. Clarified that these features require GNU Make 4.4 or later.

## Review Notes
The corrected examples and explanations agree with the GNU Make 4.4.1 manual and GCC documentation. Users on older GNU Make releases should check `make --version` before using grouped targets, target-specific `.NOTPARALLEL`, `.WAIT`, or `--shuffle`. Per-target `$@.tmp` files prevent different targets in one Make invocation from sharing a temporary path, but separate simultaneous Make invocations in the same build tree still require isolated build directories or uniquely named temporary files.
