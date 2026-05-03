# Validation Summary: How to Enable Debug Logging with TF_LOG in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (tofu CLI)
- TF_LOG environment variable
- TF_LOG_PATH, TF_LOG_CORE, TF_LOG_PROVIDER environment variables
- Bash shell (for command examples and filtering with grep)

## Sources Consulted
- OpenTofu official debugging documentation: https://opentofu.org/docs/internals/debugging/
- General knowledge of POSIX shell semantics for `2>&1`, `grep`, `export`, and `unset`

## Issues Found
No technical issues found.

The post accurately describes:
- The five log levels (ERROR, WARN, INFO, DEBUG, TRACE) and their relative verbosity. The table orders them from least to most verbose, which is consistent with the official docs (which order them most-to-least verbose) — both orderings are correct, just inverted.
- That logs are written to stderr by default.
- The behavior of `TF_LOG_PATH` for persisting logs to a file (and that normal stdout output from `tofu plan`/`apply` is unaffected).
- The use of `TF_LOG_CORE` and `TF_LOG_PROVIDER` to set separate verbosity for the core engine and providers.
- All shell snippets (`TF_LOG=DEBUG tofu plan`, `2>&1 | grep ...`, `export`, `unset`) are syntactically correct.

The example debug output (timestamps, provider name, request/response lines) is illustrative and stylized rather than a verbatim capture, which is reasonable for a tutorial.

## Review Notes
- The official OpenTofu docs also document `TF_LOG=JSON` for machine-readable trace output. The post does not mention this; it is not an error, just a possible future addition.
- TRACE-level logs may contain sensitive information such as credentials and request bodies. The post's example already hints at this by showing an `Authorization: AWS4-HMAC-SHA256 Credential=AKIA...` header, but a brief explicit warning could be a future improvement (not required for technical correctness).
- The note about `TF_LOG_PATH` requiring `TF_LOG` to also be set in order for logging to occur is implicit in the post's example (which sets both) but is not called out explicitly. Again, not an error, just a potential clarification.
