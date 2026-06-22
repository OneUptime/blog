# Validation Summary: How to Handle Regular Expressions in Bash

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bash regular expression matching with `[[ ... =~ ... ]]`
- `BASH_REMATCH`
- GNU grep / POSIX grep regular expression modes
- GNU sed regular expression substitutions
- POSIX extended regular expressions

## Sources Consulted
- GNU Bash Reference Manual, Conditional Constructs: https://www.gnu.org/software/bash/manual/bash.html#Conditional-Constructs
- GNU Bash local help for `[[ ... ]]` via `help [[`
- GNU grep manual, Pattern Syntax and CLI options: https://www.gnu.org/software/grep/manual/grep.html
- GNU grep local help and man page for `-E`, `-P`, `-o`, `-i`, and `-c`
- GNU sed manual, Basic and Extended Regular Expressions: https://www.gnu.org/software/sed/manual/html_node/BRE-vs-ERE.html
- GNU sed manual, Extended Regexps: https://www.gnu.org/software/sed/manual/html_node/Extended-regexps.html
- GNU sed local help and man page for `-E`

## Issues Found
- The IPv4 validation comment said each octet was 0-255, but the regex accepted any one to three digits, including values like 999. Updated the Bash ERE to enforce octets from 0 through 255.
- The GNU grep `-E` function-definition example used `\s`, which is not POSIX ERE syntax. Replaced it with `[[:space:]]` character classes.
- The sed HTML-tag example claimed `.*?` was non-greedy extended regex syntax, but GNU/POSIX ERE does not support PCRE-style lazy quantifiers. Reworded the comment to match the actual `[^>]+` pattern.
- The cheat sheet listed `\b`, `\s`, and `(?:...)` without noting that they are flavor-specific. Added PCRE/GNU grep caveats so readers do not expect them to work in Bash ERE or sed ERE.
- The password-strength pattern used PCRE lookaheads, which Bash `[[ =~ ]]` does not support. Replaced it with separate Bash-compatible regex pieces for the required password components.
- The regex-escaping helper produced an ERE-style escaped pattern but demonstrated it with default `grep` BRE mode. Updated the helper and example to use `sed -E` and `grep -E` consistently.
- The Apache log parser pattern used an escaped `]` inside a bracket expression in a way that did not match the sample in Bash. Replaced it with the Bash-compatible `[^]]+` bracket expression.
- The performance section implied Bash compiles a pattern variable once and reuses the compiled regex. Bash documentation does not guarantee that behavior. Reworded the guidance to say pattern variables improve readability and consistency.

## Review Notes
- `grep -P` is GNU grep's Perl-compatible regex mode and may not be available on every non-GNU platform. The post now identifies that example as GNU grep-specific.
- Several validation regexes are intentionally basic examples rather than full standards-compliant validators, such as email, URL, semantic versioning, and dates.
