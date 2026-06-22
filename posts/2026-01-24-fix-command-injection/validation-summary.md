# Validation Summary: How to Fix 'Command Injection' Vulnerabilities

## Status
validated

## Post Type
Security tutorial / secure coding guide

## Technologies Covered
- Python subprocess, shlex, pathlib, and pytest
- Node.js child_process, fs, and path modules
- PHP shell execution operators
- Go os/exec
- Dockerfile container hardening
- Shell command injection prevention
- OWASP command injection guidance
- DNS hostname validation

## Sources Consulted
- Python subprocess documentation: https://docs.python.org/3/library/subprocess.html
- Python pathlib documentation: https://docs.python.org/3/library/pathlib.html
- Node.js child_process documentation: https://nodejs.org/api/child_process.html
- Go os/exec package documentation: https://pkg.go.dev/os/exec
- PHP execution operators documentation: https://www.php.net/manual/en/language.operators.execution.php
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- OWASP OS Command Injection Defense Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html
- RFC 1035 domain name size limits: https://datatracker.ietf.org/doc/html/rfc1035

## Issues Found
- The Python secure path checks used string prefix comparisons, which can permit sibling paths such as `/var/database` when `/var/data` is intended. Updated the examples to resolve paths and use `Path.is_relative_to()`.
- The Python shell fallback example validated a raw log file string and quoted that raw value. Updated it to validate and quote the resolved path, and added a timeout to the subprocess call.
- The Node.js `execFile` example did not include a timeout despite the post recommending timeouts for command execution. Added a 30-second timeout.
- The Node.js `spawn` example did not include timeout or abort handling. Added `AbortController` handling and an `error` listener.
- The Node.js path containment check did not resolve the allowed directory before comparison. Updated it to compare resolved paths and still prevent sibling-prefix bypasses.
- The Go example imported `strings` but never used it, which would prevent compilation. Removed the unused import.
- The Go command examples did not use timeouts. Updated them to use `context.WithTimeout()` and `exec.CommandContext()`.
- The Go map literal was made explicit with `[]string{...}` values for clarity and compatibility in a tutorial snippet.

## Review Notes
Python and Node.js code snippets were syntax checked locally. PHP CLI and Go were not installed in the local environment, so PHP and Go examples were reviewed against official documentation and by static inspection.
