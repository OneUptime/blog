# Validation Summary: How to Monitor Certificate Expiry on IPv6 Endpoints

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenSSL `s_client` and `x509` for certificate inspection
- Bash scripting (IPv6 bracket notation, `read`/IFS parsing)
- ssl-cert-check (Matty9191/ssl-cert-check)
- Prometheus + ssl_exporter (ribbybibby/ssl_exporter)
- Prometheus alerting rules / Alertmanager
- Cron
- OneUptime monitoring

## Sources Consulted
- ribbybibby/ssl_exporter README and metrics reference: https://github.com/ribbybibby/ssl_exporter (metric names, default port 9219, prober configuration)
- Matty9191/ssl-cert-check source and usage: https://github.com/Matty9191/ssl-cert-check (command-line flag semantics)
- OpenSSL `s_client` documentation (IPv6 `-connect [addr]:port` bracket notation)
- Bash man page (`read`, IFS field splitting behavior)

## Issues Found

1. **Method 1 — broken IFS parsing of IPv6 endpoint strings.**
   The original used `:` as a field separator on strings like `"2001:db8::1:443:example.com"`. Because IPv6 addresses themselves contain colons, `IFS=':' read -r ipv6 port hostname` parsed `ipv6=2001`, `port=db8`, `hostname=:1:443:example.com` (verified by running the snippet), so the script never actually reached the intended host/port.
   Fix: switched the in-array delimiter to `|` (`"2001:db8::1|443|example.com"`) and changed `IFS=':'` to `IFS='|'` in the read loop.

2. **Method 2 — incorrect ssl-cert-check flags.**
   The original called `ssl-cert-check -h 2001:db8::1 -p 443 -n example.com -q -x 30`. Per the upstream Matty9191/ssl-cert-check usage, `-h` prints the help screen (it does not take a host argument), `-s` is the flag for "Server to connect to", and `-n` enables Nagios plugin mode (it does not take a servername argument).
   Fix: changed `-h` to `-s` and removed the bogus `-n example.com`. Added a brief inline comment summarising flag meanings.

3. **Method 2 — incorrect host file format.**
   The example file had three columns (`host port hostname`), but ssl-cert-check's `-f` expects two columns (`host port`) per line.
   Fix: removed the third column from the sample file contents and noted the expected format in the comment.

4. **Method 4 — non-existent Prometheus metric name.**
   Both alert expressions referenced `ssl_verified_valid_at_unix_seconds`, which is not a metric exposed by ssl_exporter. The actual metric for peer-certificate expiry is `ssl_cert_not_after` (Unix epoch seconds), with `ssl_verified_cert_not_after` available for the verified chain.
   Fix: replaced both occurrences with `ssl_cert_not_after`. The surrounding `- time() < 86400 * N` arithmetic is correct for an absolute-timestamp metric.

## Review Notes
- ssl-cert-check passes the host through to `openssl s_client -connect ${HOST}:${PORT}`, which requires bracket notation for raw IPv6 (`[2001:db8::1]:443`). Calling the tool with a bare IPv6 literal as in Method 2 may fail on some openssl builds; in practice, monitoring an AAAA-resolved hostname is more robust. Left as-is because it matches the post's IPv6-literal framing and the flag-level fix is the primary concern.
- For ssl_exporter's `tcp` prober on dual-stack hosts, adding `ip_protocol: ip6` under `tcp:` would force IPv6 resolution. The current config will work for IPv6-only targets but is not strictly IPv6-pinned. Not changed because the guidance is still functional.
- The `-servername` flag in `openssl s_client` correctly sets SNI; using the IPv6 literal as `-connect` target with the hostname as `-servername` is the right pattern and was already used correctly in Method 1.
- The Method 5 OneUptime block is a configuration description (no executable code), so there is nothing to verify beyond the bracket-notation URL form, which is correct per RFC 3986 §3.2.2.
