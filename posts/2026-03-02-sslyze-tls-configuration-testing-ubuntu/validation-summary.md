# Validation Summary: How to Use SSLyze for TLS Configuration Testing on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- SSLyze (Python TLS/SSL scanner, current major versions 5.x/6.x)
- Python 3 (CLI invocation and programmatic API)
- Ubuntu (apt, pip-based installation)
- TLS/SSL protocols (SSL 2.0/3.0, TLS 1.0/1.1/1.2/1.3)
- Cipher suites, certificate chains, HSTS
- Vulnerability tests: Heartbleed, ROBOT, OpenSSL CCS injection (CVE-2014-0224)
- Bash shell scripting (cron-style monitoring scripts)

## Sources Consulted
- SSLyze GitHub repository (release branch): https://github.com/nabla-c0d3/sslyze
- SSLyze CLI source: `sslyze/cli/command_line_parser.py`
- SSLyze plugin sources for scan-command flags (e.g. `certificate_info/_cli_connector.py`, `openssl_cipher_suites/implementation.py`, `_RobotCliConnector`, `_HeartbleedCliConnector`, `_OpenSslCcsInjectionCliConnector`, `_HttpHeadersCliConnector`, `session_resumption/implementation.py`, `_EarlyDataCliConnector`)
- SSLyze Python API: `Scanner`, `ServerScanRequest`, `ServerNetworkLocation`, `ScanCommand`, `ServerScanStatusEnum`, `ScanCommandAttemptStatusEnum`
- SSLyze JSON schema (`SslyzeOutputAsJson`, `_ServerNetworkLocationAsJson`, `AllScanCommandsAttemptsAsJson`, `HeartbleedScanResult`)
- SSLyze documentation: https://nabla-c0d3.github.io/sslyze/documentation/
- Python `cryptography` library — `Certificate.not_valid_after_utc` (replaced deprecated `not_valid_after` in cryptography 42.0)
- Empirical verification: installed SSLyze 6.3.1 from PyPI and exercised `--version` / `--help` behavior

## Issues Found

1. **`sslyze --version` is not a real flag.** The post used it to verify the installation, but SSLyze does not register a `--version` argument (no `action="version"` anywhere in the code; the version only appears in the `--help` description text). Running `sslyze --version` errors with `unrecognized arguments: --version` and exits with code 2.
   - **Fix:** Replaced with `sslyze --help | head -1`, which is sufficient to confirm SSLyze is installed and to display the version line.

2. **The Python API's connectivity-failure check was wrong.** The original example used `isinstance(scan_result, ConnectionToServerFailed)` inside the `scanner.get_results()` loop. `get_results()` yields `ServerScanResult` objects (never exceptions), so that `isinstance` check would never match and connection failures would be silently ignored. Additionally, comparing `status == "COMPLETED"` happens to work today (because the enums subclass `str`), but the idiomatic API check uses the enum value.
   - **Fix:** Replaced the import of `ConnectionToServerFailed` with `ServerScanStatusEnum` and `ScanCommandAttemptStatusEnum` (both exported from the top-level `sslyze` package). Changed the connectivity check to `scan_result.scan_status == ServerScanStatusEnum.ERROR_NO_CONNECTIVITY` and the per-command status checks to `... == ScanCommandAttemptStatusEnum.COMPLETED`.

## Review Notes

- **Default CLI behavior:** In SSLyze 5.x/6.x, running `sslyze example.com` with no scan-command flags defaults to a Mozilla "intermediate" TLS configuration compliance check (`--mozilla_config=intermediate`). It does not run the full battery of scans (Heartbleed, ROBOT, every cipher-suite version, etc.). The illustrative output block in the "Basic TLS Scan" section is conceptually instructive about cipher-suite scan output but doesn't precisely match what a bare `sslyze example.com` produces in current versions. Left as-is because it is clearly labeled as illustrative key sections rather than verbatim output.
- **JSON field naming nuance:** In the JSON output, the certificate expiry field is `not_valid_after`, even though the underlying Python attribute on the `cryptography` `Certificate` object is `not_valid_after_utc`. The Python parsing script in the post (`leaf_cert.get('not_valid_after', '')`) correctly reads the JSON field name, so no fix needed.
- **`Let's Encrypt Authority X3`** in the example certificate output is a long-retired intermediate (replaced by `R3` years ago, and R3 itself is being phased out). Left as-is because it's clearly a synthetic example value, not a factual claim about current Let's Encrypt PKI.
- **Trust store version strings** in the certificate output example (e.g. `Mozilla CA Store (2022-10-24)`, `Apple CA Store (iOS 16, MacOS 13)`) are illustrative snapshots; the actual labels shipped with SSLyze change over time as `--update_trust_stores` runs. Not a correctness issue.
- **Avoid `sudo pip3 install` on modern Ubuntu (PEP 668):** Ubuntu 23.04+ marks the system Python as externally-managed and will refuse `pip install` without `--break-system-packages` or a virtualenv. The post's recommendation to use `pip3 install --user sslyze` or `pipx install sslyze` would be the cleaner path on 24.04/25.04; the current text is fine for older Ubuntu LTS releases but worth a future tweak.
