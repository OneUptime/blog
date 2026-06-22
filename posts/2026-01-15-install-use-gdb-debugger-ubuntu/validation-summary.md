# Validation Summary: How to Install and Use GDB Debugger on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- GDB (GNU Debugger)
- GCC / G++ (debug symbol compilation: `-g`, `-g1/-g2/-g3`, `-gdwarf-4`, `-O0`, `-Wall`, `-Wextra`, `-fno-omit-frame-pointer`)
- C and C++ (example programs)
- gdbserver (remote debugging)
- GDB Python API (custom commands, breakpoints, pretty printers, event handlers)
- GDB TUI mode and SingleKey mode
- Core dump analysis (`ulimit`, `core_pattern`)
- Valgrind (mentioned as a complementary tool)
- Ubuntu / APT package management

## Sources Consulted
- Local GDB 15.0.50 (Ubuntu 24.04 toolchain) — verified commands, abbreviations, and help text directly via `gdb -batch -ex "help ..."`
- GDB User Manual — Backtrace / "Selecting a Frame" (negative COUNT prints outermost frames): https://sourceware.org/gdb/current/onlinedocs/gdb/Backtrace.html
- GDB User Manual — Set Catchpoints / Listing breakpoints (catchpoints are listed by `info breakpoints`): https://sourceware.org/gdb/current/onlinedocs/gdb/Set-Catchpoints.html
- GDB User Manual — Reverse Execution (`reverse-step`/`rs`, `reverse-next`/`rn`, `reverse-continue`/`rc`): https://sourceware.org/gdb/current/onlinedocs/gdb/Reverse-Execution.html
- GDB Python API docs (gdb.Command, gdb.Breakpoint, gdb.Function, pretty printers, events): https://sourceware.org/gdb/current/onlinedocs/gdb/Python-API.html
- GCC Debugging Options (`-g`, `-g1/-g2/-g3`, `-gdwarf`): https://gcc.gnu.org/onlinedocs/gcc/Debugging-Options.html
- Local filesystem verification of the libstdc++ pretty-printer path `/usr/share/gcc/python/libstdcxx/v6/printers.py`

## Issues Found
1. **Non-existent command `info catchpoints`** (Catchpoints section). GDB has no `info catchpoints` command (`Undefined info command: "catchpoints"`). Catchpoints are listed together with breakpoints and watchpoints by `info breakpoints` (verified: a `catch fork` entry appears in `info breakpoints` output). Changed the command to `(gdb) info breakpoints` and updated the comment to clarify catchpoints are shown there.
2. **Incorrect frame direction for `bt N` / `bt -N`** (Call Stack Navigation). The post labeled `bt 5` as "Show only N frames" and `bt -5` as "Show inner N frames". Per the GDB manual and local `help backtrace` ("With a negative COUNT, print outermost -COUNT frames"), `bt N` prints the innermost N frames and `bt -N` prints the outermost N frames. Relabeled to "Show innermost N frames" and "Show outermost N frames" respectively.

## Review Notes
- The reverse-debugging abbreviations `rs`, `rn`, `rc` were verified against the local GDB and are correct.
- The command abbreviations in the reference tables (`do` for `down`, `disp` for `display`, `fin`, `i b`, `i lo`, `i ar`, `pt`, etc.) were spot-checked and resolve correctly.
- The libstdc++ pretty-printer path `/usr/share/gcc/python` used in the sample `.gdbinit` is correct on current Ubuntu (confirmed `libstdcxx/v6/printers.py` exists there).
- Minor (not changed): in the core-dump section, `(gdb) info signal` is commented as "Check signal that caused the crash." `info signal` is a valid command (alias of `info signals`/`info handle`) but it reports how GDB *handles* signals rather than which signal terminated the program. The terminating signal is actually shown by GDB's load banner ("Program terminated with signal SIGSEGV…") and by `bt`. The command itself is valid, so it was left in place; readers should note the comment slightly overstates what the command shows.
- Illustrative example outputs (addresses, register values, "Deleted node with data: 0" after a use-after-free) are plausible demonstrations; exact values are environment-dependent, which is normal for tutorial output and not an error.
- All installation packages referenced (`gdb`, `build-essential`, `libc6-dbg`, `gdb-doc`, `valgrind`, `gdbserver`) exist in the Ubuntu repositories.
