# Validation Summary: How to Write Bash Functions on Ubuntu

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Bash (shell scripting language)
- POSIX shell syntax
- GNU coreutils (`stat`, `df`, `id`, `date`, `cut`, `mkdir`)
- `awk`
- `systemctl` (systemd)
- `iproute2` (`ip addr`)
- `tar`
- `/dev/tcp` (Bash's built-in TCP pseudo-device)
- Ubuntu Linux

## Sources Consulted
- GNU Bash Reference Manual — Shell Functions: https://www.gnu.org/software/bash/manual/html_node/Shell-Functions.html
- GNU Bash Reference Manual — Special Parameters (`$@`, `$*`, `$#`, `$0`): https://www.gnu.org/software/bash/manual/html_node/Special-Parameters.html
- GNU Bash Reference Manual — Bash Builtins (`local`, `command`, `read`): https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html
- GNU Bash Reference Manual — Redirections (here-strings, `/dev/tcp/host/port`): https://www.gnu.org/software/bash/manual/html_node/Redirections.html
- GNU coreutils `stat` format specifiers: https://www.gnu.org/software/coreutils/manual/html_node/stat-invocation.html
- systemd `systemctl(1)` (the `is-active --quiet` flag): https://www.freedesktop.org/software/systemd/man/systemctl.html
- Local execution / sanity check of the function-definition syntax, the recursive factorial, the `stat` format string, and the `read ... <<<` here-string pattern on Ubuntu

## Issues Found
No technical issues found. All code examples were sanity-checked and behave as described:
- The two function-definition styles (`function name() { ... }` and `name() { ... }`) are both accepted by Bash, as documented in the Bash manual (the parentheses are optional when using the `function` keyword).
- `local`, `command`, `return`, `read -r ... <<<`, and `/dev/tcp/host/port` are all correctly used and are documented Bash features (not POSIX, but the post is explicitly Bash-focused).
- `stat -c %s`, `%Y`, `%U` are the correct GNU coreutils format specifiers for size, mtime (epoch seconds), and owner name.
- `systemctl is-active --quiet "$service"` correctly returns exit code 0 when active and non-zero otherwise.
- `command -v "$1" >/dev/null 2>&1` is the recommended portable test for command existence.
- Exit-code range (0–255) and the convention that 0 = success is accurate.
- The `$0` note (it refers to the script, not the function name) is correct; `${FUNCNAME[0]}` would be the function name, but the post's claim is what it intended to state.

## Review Notes
- The description of `$*` as "all arguments as a single string" is a common simplification. Strictly, `"$*"` (when quoted) joins arguments using the first character of `IFS`; unquoted `$*` is subject to word splitting just like `$@`. The post's wording is the typical tutorial-level summary and is not inaccurate enough to need a fix.
- The `rm` override example (and the `command rm` escape hatch) is correct, but in practice such overrides only apply in shells that source the file; users should be aware this won't affect non-interactive scripts that don't source the override. Not an error in the post — just worth noting.
- The `retry` function doubles `delay` after a failed attempt; the variable is not declared `local`, which means it will leak/persist if called from a script that also uses a `delay` variable. Minor stylistic point only — not technically incorrect given the post's own teaching that `local` should be the default.
- Post is Bash-specific (uses `local`, `[[ ]]`, `<<<`, `/dev/tcp`), which matches the title and tags. No portability claims are overstated.
