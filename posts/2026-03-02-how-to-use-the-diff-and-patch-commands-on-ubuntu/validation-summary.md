# Validation Summary: How to Use the diff and patch Commands on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- GNU `diff` (diffutils)
- GNU `patch`
- `diff3` (three-way merge)
- `colordiff`
- Ubuntu / Linux command line
- Bash scripting

## Sources Consulted
- GNU diffutils manual / `diff --help` output (https://www.gnu.org/software/diffutils/manual/diffutils.html)
- GNU patch manual / `patch --help` output (https://www.gnu.org/software/diffutils/manual/html_node/Invoking-patch.html)
- Local `man patch` and `man diff` on Ubuntu
- colordiff project page (https://www.colordiff.org/)
- GNU findutils manual for `find -delete` (https://www.gnu.org/software/findutils/manual/)

## Issues Found
1. **`patch -v` mislabeled as "Verbose output"**: In GNU patch, `-v` is the short option for `--version` and prints the version header, not verbose details. The long option `--verbose` exists for extra output. Updated the example to use `patch --verbose` and added a clarifying note that `-v` alone prints the version.
2. **Confusing comment "`-u flag produces unified diff, -N context lines (default 3)`"**: This could be misread as `-N` being a flag for context lines. In reality, `-N` in diff is `--new-file` (treat absent files as empty), and unified context size is controlled with `-U NUM`. Rewrote the comment as "`-u flag produces unified diff with 3 context lines (use -U NUM to change)`".

## Review Notes
- The unified diff timestamp example uses `.000` (milliseconds) precision. Modern GNU diff actually emits nanosecond precision (`.000000000`). This is a cosmetic simplification in the example, not a technical error, so it was left as-is.
- The Normal-format diff example (`3c3` / `5a6`) traces correctly against the implied file contents.
- All other diff flags (`-w`, `-B`, `-i`, `-y`, `-W`, `-q`, `-r`, `-c`, `-u`) match the GNU diffutils documentation.
- All patch flags (`-p0/-p1/-p2`, `-R`, `--dry-run`) match the GNU patch documentation.
- `diff3 -m` for automatic merge with output redirection is correct.
- `colordiff` is in the Ubuntu universe repository and the install command is accurate.
- `find -delete` for cleanup of `.rej` / `.orig` files is correct GNU find syntax.
