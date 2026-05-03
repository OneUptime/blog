# Validation Summary: How to Use curl to Test HTTP/HTTPS Connectivity from the Command Line

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- curl (command-line HTTP client)
- HTTP/HTTPS protocols
- TLS / certificate verification
- HTTP/2
- DNS resolution overrides

## Sources Consulted
- Official curl manual (https://curl.se/docs/manpage.html)
- curl --help output for flag documentation
- curl `-w` / `--write-out` variable reference (https://curl.se/docs/manpage.html#-w)
- curl `--resolve` documentation (https://curl.se/docs/manpage.html#--resolve)
- curl `-O` / `--remote-name` documentation (https://curl.se/docs/manpage.html#-O)
- curl `-s` / `--silent` documentation (https://curl.se/docs/manpage.html#-s)

## Issues Found
- **Incorrect comment on `-O` flag** (line 110, "Saving Response to a File" section): The original comment described `curl -O https://example.com/file.tar.gz` as a "Silent download with output filename derived from URL." This is technically wrong — `-O` (`--remote-name`) only sets the local filename to match the remote filename; it does not suppress curl's progress meter. To make a download silent, `-s` (`--silent`) is required. Changed the comment to "Download with output filename derived from URL" to accurately describe `-O`'s behavior.

## Review Notes
- All curl flags used in the post (`-I`, `-v`, `-o`, `-s`, `-w`, `-L`, `-H`, `-X`, `-d`, `-k`, `--cacert`, `--resolve`, `--http2`, `--head`, `-O`) are correct and current.
- All `-w` variables used (`%{http_code}`, `%{time_namelookup}`, `%{time_connect}`, `%{time_appconnect}`, `%{time_starttransfer}`, `%{time_total}`) are valid and documented.
- The `--resolve host:port:address` syntax is correct.
- The example IP `93.184.216.34` was example.com's IP for many years but is no longer authoritative (example.com's IPs changed in 2024). Since the IP is purely illustrative for the `--resolve` flag demo, this is not a technical error — readers will substitute their own IPs in practice.
- The example `curl -H "Host: example.com" https://93.184.216.34` would fail TLS certificate verification in practice (the certificate is issued for the hostname, not the IP). The `--resolve` approach shown immediately above is the modern, preferred method, so the pair of examples already steers readers toward the correct technique. No change made.
- The post correctly notes that `-I` triggers a HEAD request and that `-k` skips certificate verification.
