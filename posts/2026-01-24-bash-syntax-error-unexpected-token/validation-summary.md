# Validation Summary: How to Fix 'Syntax Error Near Unexpected Token' in Bash

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Bash shell scripting
- POSIX sh compatibility
- ShellCheck
- GNU/Linux command-line tools: cat, sed, grep, tr, file, iconv, hexdump
- dos2unix
- EditorConfig

## Sources Consulted
- GNU Bash Reference Manual: Shell Functions: https://www.gnu.org/software/bash/manual/html_node/Shell-Functions.html
- GNU Bash Reference Manual: Looping Constructs: https://www.gnu.org/software/bash/manual/html_node/Looping-Constructs.html
- GNU Bash local manual/help output for quoting, control structures, `set -n`, `set -x`, `set -v`, and `pipefail`
- ShellCheck official site: https://www.shellcheck.net/
- ShellCheck SC2039 wiki note: https://www.shellcheck.net/wiki/SC2039
- ShellCheck SC3014 wiki: https://www.shellcheck.net/wiki/SC3014
- EditorConfig Specification 0.17.2: https://spec.editorconfig.org/
- dos2unix official project page: https://dos2unix.sourceforge.io/
- Local GNU tool help/man output for `cat -A`, `grep -P`, `sed -i`, `tr -d`, `file`, `iconv`, and `hexdump`

## Issues Found
- The missing closing quote example claimed Bash reports `syntax error near unexpected token echo`. Bash actually reports an unexpected EOF while looking for the matching double quote. Updated the error comment.
- The `message="He said "Hello" to me"` example was labeled as a syntax error, but it is valid Bash syntax because adjacent quoted and unquoted word parts are concatenated. Replaced it with an actual unescaped apostrophe inside a single-quoted string and corrected the fix.
- The `function greet ( )` example was labeled invalid for older Bash, but GNU Bash accepts that form. Replaced it with an invalid attempt to declare a named parameter in the function parentheses and updated the correct examples to use `$1`.
- The missing `then` examples claimed Bash reports an unexpected `echo` or `then`; the shown scripts report an unexpected `fi` during syntax checking. Updated the error comments to match actual Bash behavior.
- The `file script.sh` verification note implied a fixed file must show `ASCII text`. That is too narrow because a valid script may be UTF-8 or another text encoding. Updated the note to say it should no longer show CRLF line terminators.
- The ShellCheck sample used retired rule `SC2039` for POSIX `sh` use of `==`. Updated it to current rule `SC3014`.

## Review Notes
- Several commands shown are GNU/Linux-oriented (`grep -P`, `sed -i`, and `\x` escapes in sed scripts can vary across non-GNU systems). This is acceptable for the post's Linux-focused tags, but a future portability pass could call out GNU vs BSD/macOS differences.
