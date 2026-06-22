# Validation Summary: How to Handle Input Validation in Bash Scripts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Bash scripting
- Bash conditional expressions, regular expression matching, functions, and builtins
- GNU Coreutils `realpath`, `date`, and `tr`
- Linux file and directory validation
- Input sanitization and path traversal prevention

## Sources Consulted
- GNU Bash Reference Manual: Conditional Constructs - https://www.gnu.org/software/bash/manual/bash.html#Conditional-Constructs
- GNU Bash Reference Manual: Bash Builtins (`read`, `printf`) - https://www.gnu.org/software/bash/manual/bash.html#Bash-Builtins
- GNU Coreutils manual: `realpath` invocation - https://www.gnu.org/software/coreutils/manual/html_node/realpath-invocation.html
- GNU Coreutils manual: `date` invocation - https://www.gnu.org/software/coreutils/manual/html_node/date-invocation.html
- GNU Coreutils manual: `tr` invocation - https://www.gnu.org/software/coreutils/manual/html_node/tr-invocation.html
- OWASP Foundation: Path Traversal - https://owasp.org/www-community/attacks/Path_Traversal
- Local GNU Bash 5.2.21 builtin help for `test`, `read`, and `printf`
- Local GNU Coreutils help output for `realpath`, `date`, and `tr`

## Issues Found
- Updated interactive `read` examples to use `read -r -p` so backslashes in user input are read literally rather than treated as escape characters.
- Fixed the port range check to use base-10 arithmetic with `10#`, avoiding Bash's octal interpretation of values with leading zeroes such as `08`.
- Fixed the path traversal example. The original prefix check could accept sibling paths such as `/var/www/uploads_evil`; it now canonicalizes the base directory and accepts only the base path itself or paths below `base/`.
- Replaced `echo "$input" | tr ...` with `printf '%s' "$input" | tr ...` in sanitization examples to avoid `echo` option and escape-sequence edge cases.
- Corrected the expected output comment for the strict sanitizer example. The configured allowlist keeps spaces and hyphens, so `; rm -rf /` becomes ` rm -rf `, not `rm rf`.
- Updated reusable numeric helpers to use base-10 arithmetic for positive integers, ranges, and IP octets, avoiding incorrect behavior or arithmetic errors for leading-zero input.
- Quoted the validator command in the interactive validation loop and switched its input read to `read -r -p`.

## Review Notes
The examples are accurate for Bash on GNU/Linux. `realpath -m` and `date -d` are GNU Coreutils options and are not portable to every Unix-like system without compatible implementations.
