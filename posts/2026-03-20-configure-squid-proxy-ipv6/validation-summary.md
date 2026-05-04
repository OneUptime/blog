# Validation Summary: How to Configure Squid Proxy for IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Squid Proxy (caching HTTP forward proxy)
- IPv6 networking (addressing, CIDR, link-local, loopback)
- Squid `http_port`, `acl`, `http_access`, `dns_v4_first`, `tcp_outgoing_address`, `dns_nameservers` directives
- SSL Bump (HTTPS interception with `ssl_bump`)
- Squid `logformat` / `access_log`
- systemd (`systemctl`)
- `ss` (socket statistics) and `curl` for verification

## Sources Consulted
- Squid Configuration Manual — http_port: https://www.squid-cache.org/Doc/config/http_port/
- Squid Configuration Manual — acl: https://www.squid-cache.org/Doc/config/acl/
- Squid Configuration Manual — dns_v4_first: https://www.squid-cache.org/Doc/config/dns_v4_first/
- Squid Configuration Manual — tcp_outgoing_address: https://www.squid-cache.org/Doc/config/tcp_outgoing_address/
- Squid Configuration Manual — dns_nameservers: https://www.squid-cache.org/Doc/config/dns_nameservers/
- Squid Configuration Manual — ssl_bump: https://www.squid-cache.org/Doc/config/ssl_bump/
- Squid Configuration Manual — logformat: https://www.squid-cache.org/Doc/config/logformat/
- Squid v6 manual page (squid command-line options): https://www.squid-cache.org/Versions/v6/manuals/squid.html

## Issues Found

1. **Incorrect command for validating Squid configuration.** The post originally instructed `squid -k check`, but `-k check` only sends signal 0 to a running squid daemon to verify it is alive — it does not parse or validate the configuration file. The correct command for syntax validation is `squid -k parse`. Changed `squid -k check` to `squid -k parse` in Step 6.

2. **Invalid IPv6 placeholder addresses (`2001:db8::proxy`).** IPv6 address fields must be hexadecimal; the literal "proxy" contains non-hex characters (`p`, `r`, `o`, `x`, `y`) and would be rejected as a parse error by both Squid and curl. Replaced three occurrences of `2001:db8::proxy` with the syntactically valid documentation address `2001:db8::1`:
   - Comment example for `http_port` in Step 1.
   - Comment example for `tcp_outgoing_address` in Step 3.
   - Live `curl` test command in Step 6 (this one was particularly important because it was an executable command, not a comment, and would have failed immediately with "URL rejected: Bad hostname").

## Review Notes

- **`cert=` / `key=` (Step 4)** are legacy aliases that still work in Squid 4.x/5.x/6.x but the official documentation now lists them as `tls-cert=` / `tls-key=`. Migration to the modern names is recommended for new configurations but the current snippet remains functional.
- **`ssl_bump server-first all` (Step 4)** uses a backward-compatibility action. The Squid 4+ official guidance is to use the `peek` / `stare` / `splice` / `bump` actions (typically `ssl_bump peek step1` followed by `ssl_bump bump all`). The current snippet still works on supported versions but should eventually be migrated.
- **Custom `combined` logformat (Step 5)** redefines the name of a Squid built-in logformat. Squid will use the redefined version, but readers who expect the canonical Apache-style `combined` format (with Referer / User-Agent fields) may be surprised. Renaming to e.g. `combined_v6` would avoid the shadowing.
- **`safe_ports` ACL (Step 2)** is defined but never referenced in any `http_access` rule, so it has no effect as written. Default Squid configurations use `http_access deny !Safe_ports` (note capitalization) to enforce safe-port restrictions. This is an editorial completeness issue rather than a technical error and was left as-is.
- **IPv6 transparent interception (`http_port [::]:3129 intercept`)** requires a kernel and netfilter/nftables stack that supports IPv6 NAT (Linux 3.7+); the configuration line itself is syntactically valid.
