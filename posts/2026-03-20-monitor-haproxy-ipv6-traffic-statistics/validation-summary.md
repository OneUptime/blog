# Validation Summary: How to Monitor HAProxy IPv6 Traffic Statistics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HAProxy (stats page, runtime API via Unix socket, Prometheus exporter, log format)
- IPv6 networking
- socat (Unix-domain socket client)
- Prometheus metrics
- Standard Unix tools: awk, cut, grep, sed, watch, curl

## Sources Consulted
- HAProxy Management Guide (CSV stats format and CLI commands): https://docs.haproxy.org/2.4/management.html#9.1
- HAProxy Configuration Manual (bind, stats, log-format directives): https://docs.haproxy.org/2.4/configuration.html
- HAProxy Prometheus Exporter (built-in since HAProxy 2.0): https://github.com/haproxy/haproxy/tree/master/addons/promex
- HAProxy log-format reference (`%ci`, `%cp`, etc.): https://docs.haproxy.org/2.4/configuration.html#8.2.4
- socat man page (UNIX-CONNECT and GOPEN address types)

## Issues Found
1. **Wrong CSV column numbers in the awk script under "Key Metrics for IPv6 Monitoring".** The script filtered on `$1 == "BACKEND"`, but in HAProxy's CSV stats, column 1 is `pxname` (proxy name); the `BACKEND`/`FRONTEND` literal lives in column 2 (`svname`). Also, `$48` is `req_rate_max` (not total HTTP requests — that's `$49`/`req_tot`), and `$18` is `status` (not errors — request errors are `$13`/`ereq`). Fixed the filter to `$2 == "BACKEND"`, switched the printed proxy name to `$1`, changed total requests to `$49`, and changed errors to `$13` with a more accurate "Request errors" label.

2. **Wrong column for the "connection rate" `watch` command.** The `cut -f1,2,48` extracted `req_rate_max` (max HTTP requests/sec ever observed), which is neither current nor a connection rate. Replaced with `cut -f1,2,5,34` so the watch output shows current sessions (`scur`, `$5`) and current session rate (`rate`, `$34`), matching the stated intent.

3. **`grep ':' /var/log/haproxy.log | ... | cut -d: -f1` is broken for IPv6 log analysis.** Almost every HAProxy log line contains a colon (timestamps, syslog header), so the grep was a no-op filter. More importantly, `cut -d: -f1` truncates an IPv6 client `2001:db8::1:54321` to just `2001`, defeating the whole purpose. Replaced with a pipeline that extracts field 6 (the `%ci:%cp` token), filters with a regex requiring at least two `hex:` groups (so it matches IPv6 only), and uses `sed 's/:[0-9]\+$//'` to strip the trailing port without destroying the IPv6 address.

4. **`grep ':' | wc -l` for "active IPv6 sessions" was over-permissive.** Most lines of `show sess` output contain colons (timestamps, address ports), so the count would not be IPv6-specific. Replaced with the same multi-hex-group regex used elsewhere to keep IPv6-only matches.

5. **Misleading log-format comment.** The comment claimed `%ci = client IPv6 address`. Per HAProxy's log-format reference, `%ci` is the client IP address — IPv4 or IPv6. Updated the comment to reflect this and softened the heading comment in the same block.

## Review Notes
- The `bind *:8404` + `bind [::]:8404` pair is correct on Linux: HAProxy sets `IPV6_V6ONLY` on `[::]` listeners by default, so listing both wildcards is the standard way to bind IPv4 and IPv6 separately. Worth noting in a future revision that `bind :::8404 v4v6` is an alternate single-line form on some platforms.
- The example URL `http://[2001:db8::haproxy]:8404/stats` uses `haproxy` as part of the address — that is not a valid IPv6 hex group. It is clearly a placeholder, but a stricter example like `[2001:db8::1]` would avoid confusion. Left as-is to preserve the author's intent that this is sample text.
- The bare-path socat invocation (`socat stdio /var/run/haproxy/admin.sock`) is the form HAProxy's own management guide uses; socat treats the bare path as `GOPEN`, which connects to a UNIX socket. `UNIX-CONNECT:/path` would be more explicit but both work in practice.
- The Prometheus exporter section is correct for HAProxy 2.0+. The `stats enable` / `stats uri /stats` directives inside the prometheus frontend are technically harmless but unnecessary if only `/metrics` is used; left as-is since the author may want both endpoints on the same listener.
