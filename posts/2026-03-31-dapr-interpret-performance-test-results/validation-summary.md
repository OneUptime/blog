# Validation Summary: How to Interpret Dapr Performance Test Results

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (service invocation, sidecar architecture, mTLS, app-max-concurrency)
- hey (HTTP load testing tool)
- Python (illustrative analysis script)
- Bash (command-line comparison workflow)

## Sources Consulted
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr concurrency control documentation: https://docs.dapr.io/operations/configuration/control-concurrency/
- Dapr mTLS documentation: https://docs.dapr.io/operations/security/mtls/
- hey HTTP load generator repository and source code: https://github.com/rakyll/hey
- hey requester/report.go (histogram bar character definition): https://github.com/rakyll/hey/blob/master/requester/report.go

## Issues Found
1. **Code fence language for `hey` output was `toml`**: Changed to `text`. The `hey` tool output is plain text, not TOML format. Using `toml` would cause incorrect syntax highlighting.
2. **Histogram bar character was `*` (asterisk)**: Changed to `■` (U+25A0, Black Square). The `hey` tool uses the Unicode block character `■` for histogram bars, as defined in its source code (`barChar = "■"` in `requester/report.go`).
3. **Status code distribution count mismatch**: The response time histogram entries summed to 100,000 but the status code distribution summed to 100,002 (99,997 + 3 + 2). Changed `[200] 99997 responses` to `[200] 99995 responses` so the total (99,995 + 3 + 2 = 100,000) is consistent with the histogram.

## Review Notes
- The claim that mTLS certificate rotation causes periodic latency spikes is plausible but not strongly documented in official Dapr sources. It is presented as a diagnostic pattern to investigate rather than a definitive cause, which is acceptable framing.
- The Python evaluation script is illustrative pseudocode demonstrating how to programmatically assess results. It is syntactically correct and logically sound.
- The Dapr service invocation URL format, default port (3500), `hey` command flags (`-n`, `-c`), and `app-max-concurrency` configuration option are all verified correct against official documentation.
