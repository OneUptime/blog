# Validation Summary: How to Handle Functions in Bash Scripts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Bash shell scripting
- Bash functions
- Bash positional parameters and parameter expansion
- Bash local variables and return statuses
- curl command-line options

## Sources Consulted
- GNU Bash Reference Manual: Shell Functions - https://www.gnu.org/software/bash/manual/html_node/Shell-Functions.html
- GNU Bash Reference Manual: Shell Parameters - https://www.gnu.org/software/bash/manual/html_node/Shell-Parameters.html
- GNU Bash Reference Manual: Shell Parameter Expansion - https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html
- GNU Bash Reference Manual: Bourne Shell Builtins - https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html
- GNU Bash Reference Manual: Bash Builtin Commands - https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html
- curl man page - https://curl.se/docs/manpage.html
- Local Bash 5.2.21 help output for `function`, `local`, `return`, and `test`
- Local curl 8.5.0 help output for `--connect-timeout`, `--fail`, `--silent`, and `--output`

## Issues Found
- The variable scope diagram said local variables are "Only inside function". In Bash, `local` variables are visible to the function where they are defined and its child function calls because Bash uses dynamic scoping for shell variables. Changed the diagram text to "Inside function and child calls".
- The `backup_database` example printed the progress message to stdout before echoing the backup file path. Because the caller captures stdout with command substitution, `backup_file=$(backup_database ...)` would capture both the progress message and the path. Changed the progress message to write to stderr so stdout remains the function's return data.

## Review Notes
The examples are Bash-specific because they use `local`, `[[ ... ]]`, and `=~`, which are Bash features rather than portable POSIX `sh` features. The post title and shebang consistently frame the examples as Bash scripts.
