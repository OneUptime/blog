# Validation Summary: How to Use Regular Expressions in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Python standard library `re` module
- Regular expression syntax
- Text matching, extraction, replacement, and validation

## Sources Consulted
- Python 3.14 documentation: `re` - Regular expression operations: https://docs.python.org/3/library/re.html
- Python 3.14 documentation: Regular Expression HOWTO: https://docs.python.org/3/howto/regex.html

## Issues Found
- The `re.search()` example listed the end position for `support@example.com` as `34`; Python's match end index is exclusive and the actual span is `14-33`. Updated the output comment.
- The `\d`, `\w`, and `\s` descriptions used ASCII-only character sets. Python's `str` regular expressions are Unicode-aware by default, with ASCII-only behavior available via `re.ASCII`. Updated the comments to reflect the default behavior.
- The compiling section implied compilation is generally more efficient for repeated patterns. Python caches module-level regular expression calls, so the clearer claim is that explicit compilation saves some overhead especially inside loops. Updated the wording.
- The escaping example said only `.` was the issue in `r'$5.00'`; `$` is also special because it is an end-of-string anchor. Updated the comment.
- The summary listed named groups as `(?P<name>)`, which omits the group pattern. Updated it to `(?P<name>...)`.

## Review Notes
The examples use intentionally simplified email, phone, URL, log, and password patterns for teaching. They are technically valid for the demonstrated inputs, but production-grade validators should use stricter parsing or domain-specific libraries where appropriate.
