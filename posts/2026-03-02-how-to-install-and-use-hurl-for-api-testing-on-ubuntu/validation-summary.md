# Validation Summary: How to Install and Use hurl for API Testing on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Hurl
- HTTP API testing
- Hurl assertions, captures, variables, and reports
- GitLab CI
- GitHub Actions
- Cargo / Rust installation

## Sources Consulted
- Hurl installation documentation: https://hurl.dev/docs/installation.html
- Hurl manual: https://hurl.dev/docs/manual.html
- Hurl asserting response documentation: https://hurl.dev/docs/asserting-response.html
- Hurl response and capture documentation: https://hurl.dev/docs/response.html
- Hurl running tests and reports documentation: https://hurl.dev/docs/running-tests.html
- Hurl 8.0.0 release announcement: https://hurl.dev/blog/2026/04/27/announcing-hurl-8.0.0.html
- Ubuntu hurlfmt man page: https://manpages.ubuntu.com/manpages/stonking/man1/hurlfmt.1.html

## Issues Found
- The post used Hurl 4.3.0 while describing the package as the latest release. Updated the examples to Hurl 8.0.0, matching current Hurl documentation and release notes.
- Debian/Ubuntu installation examples used `dpkg -i`, which does not resolve package dependencies. Updated them to install the local `.deb` with `apt install`.
- Cargo installation examples used `cargo install hurl`. Updated them to the documented `cargo install --locked hurl`.
- Environment variable examples used `HURL_base_url` and `HURL_api_token`. Updated them to the documented `HURL_VARIABLE_base_url` and `HURL_VARIABLE_api_token` format.
- Examples used `isCollection`, which is not in the current assertion predicate list. Updated list-like JSON assertions to `isList`.
- Recursive test examples used `tests/**/*.hurl`, which depends on shell glob behavior. Updated all recursive examples to pass the `tests/` directory directly, which Hurl supports recursively for `.hurl` files.
- The JSON report example passed a file path to `--report-json`, but current Hurl expects a directory. Updated it to a report directory.
- CI examples wrote reports under `results/` without creating the directory. Added `mkdir -p results` before report generation.
- The troubleshooting section used undocumented `hurl --dry-run` for syntax checking. Replaced it with `hurlfmt api-tests.hurl > /dev/null`, which parses the Hurl file and exits nonzero on parse errors.

## Review Notes
The examples still use placeholder `api.example.com` endpoints and illustrative response shapes, so they are structurally valid Hurl examples rather than runnable tests against a real public API.
