# Validation Summary: How to Fix 'Cannot Assign to Read-Only' Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Bash
- Shell scripting
- Bash builtins: `readonly`, `declare`, `local`, `source`, `trap`, `printf`
- Linux command-line utilities: `grep`, `sed`, `mapfile`, `wc`

## Sources Consulted
- GNU Bash Reference Manual: Bash Builtin Commands - https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html
- GNU Bash Reference Manual: Bourne Shell Builtins - https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html
- Local Bash 5.2.21 builtin help: `help readonly`, `help declare`, `help local`, `help source`, `help trap`
- Local Bash 5.2.21 behavior tests for readonly assignment, `ERR` traps, readonly attribute detection, and local variable behavior

## Issues Found
- The `is_readonly` helper used a broad glob match that could falsely classify a writable variable as read-only if the variable's displayed value contained `r`. Changed it to match the `r` attribute only in the `declare -...` attribute field.
- The `assign_if_writable` helper used the same broad attribute detection pattern and used `eval` for assignment. Updated the readonly check to inspect only the attribute field and replaced `eval` with `printf -v` to perform the assignment without evaluating shell code.
- The function example said a local variable was shadowing the global read-only variable, but it used a different variable name. Updated the comment to say the local variable is initialized from the global.
- The debugging example claimed an `ERR` trap would run after assigning to a readonly variable. In non-interactive Bash, a readonly assignment error exits before the `ERR` trap runs. Updated the example to call the debug helper before the risky assignment and changed the assignment comment accordingly.
- The summary said subshells should be used for temporary overrides, which could imply overriding the same readonly variable. Updated the wording to "temporary alternate values" to match Bash behavior.

## Review Notes
The remaining examples align with documented Bash behavior: `readonly` and `declare -r` mark variables as immutable, `readonly -p` lists readonly names in reusable input format, `source` executes files in the current shell, and `local` variables are function-scoped but cannot reuse the name of a readonly variable.
