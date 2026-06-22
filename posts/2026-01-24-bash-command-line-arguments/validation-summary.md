# Validation Summary: How to Handle Command Line Arguments in Bash

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bash scripting
- Bash positional parameters and special parameters
- Bash `getopts`
- Manual command-line argument parsing
- GNU/Linux command-line conventions
- GNU Coreutils `rm`

## Sources Consulted
- GNU Bash Reference Manual: Bourne Shell Builtins / `getopts` - https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html
- GNU Bash Reference Manual: Special Parameters - https://www.gnu.org/software/bash/manual/html_node/Special-Parameters.html
- POSIX Programmer's Manual: `getopts(1p)` - https://man7.org/linux/man-pages/man1/getopts.1p.html
- GNU Coreutils Manual: `rm` invocation - https://www.gnu.org/software/coreutils/manual/html_node/rm-invocation.html
- Local verification with GNU Bash 5.2.21 and GNU Coreutils `rm` 9.4

## Issues Found
- The basic `getopts` example included a `:)` case for missing option arguments, but the optstring did not start with `:`, so Bash would set the option variable to `?`, unset `OPTARG`, and print its own diagnostic instead of entering that branch. Updated the example to use `OPTERR=0` and `while getopts ":vf:o:h" opt; do` so the custom invalid-option and missing-argument branches work as shown.
- The combined short-options example said `-fv input.txt` "won't work" because `-f` needs an argument. In `getopts`, the characters following an option that requires an argument are interpreted as that argument, so `-fv input.txt` sets `OPTARG` to `v`. Updated the comment to say it is not equivalent because `-f` consumes `v` as its argument.
- The complete script template uses `set -u` but read `$2` directly for options requiring arguments. Running it with a missing argument such as `--config` would produce an unbound variable error instead of the script's intended validation behavior. Added explicit argument checks for `--config`, `--output`, `--workers`, and `--log-level` before reading `$2`.

## Review Notes
All Bash fenced code blocks pass `bash -n` syntax validation after the fixes. The manual parsing examples intentionally reject separate option arguments that begin with `-`; users can still pass such values with the `--option=value` forms shown in the post.
