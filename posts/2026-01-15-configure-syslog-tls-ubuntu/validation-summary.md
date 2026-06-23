# Validation Summary: How to Configure Syslog with TLS on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (step-by-step configuration walkthrough)

## Technologies Covered
- rsyslog (imtcp, omfwd, gtls/GnuTLS netstream driver)
- syslog-ng (TLS source/destination, disk-buffer)
- TLS / X.509 PKI with OpenSSL (CA, server, and client certificates, SANs, mTLS)
- Ubuntu 22.04 / 24.04 LTS
- UFW and iptables firewall configuration
- keepalived (VRRP active-passive HA)
- HAProxy (TCP/TLS load balancing)
- Syslog over TLS on IANA port 6514 (RFC 5425)

## Sources Consulted
- rsyslog network stream driver docs — https://docs.rsyslog.com/doc/concepts/netstrm_drvr.html (confirms gtls is a netstream driver referenced by name, not loaded via `module(load=)`)
- rsyslog GitHub issues on gtls/lmnsd_gtls loading and imtcp StreamDriver config — https://github.com/rsyslog/rsyslog/issues/2859 , https://github.com/rsyslog/rsyslog/issues/4706 , https://github.com/rsyslog/rsyslog/issues/5424
- rsyslog imtcp / omfwd / TLS configuration conventions (StreamDriver.Mode, StreamDriver.AuthMode anon/x509/fingerprint/x509/name, PermittedPeer)
- syslog-ng OSE default Debian/Ubuntu configuration (default system source is `s_src`, not `s_sys`)
- RFC 5425 (TLS Transport Mapping for Syslog) — IANA port 6514
- OpenSSL `req`, `x509`, `genrsa`, `s_client`, `verify` command references
- HAProxy and keepalived configuration references

## Issues Found
1. **Invalid `module(load="gtls")` calls (4 occurrences).** The mTLS server, mTLS client, performance-optimized client, and HA client config snippets loaded the GnuTLS driver with `module(load="gtls" ...)`. `gtls` (lmnsd_gtls) is a *network stream driver* selected by name via `StreamDriver.Name` / `DefaultNetstreamDriver` and loaded automatically — it is not a loadable module, so `module(load="gtls")` produces a "could not load module" error and fails config validation. This also directly contradicted the post's own (correct) guidance in the earlier server/client sections. Fixed:
   - mTLS server: replaced `module(load="imtcp")` + `module(load="gtls" ...)` with a single `module(load="imtcp" StreamDriver.Name="gtls" StreamDriver.Mode="1" StreamDriver.AuthMode="x509/name")` (matching the working server example earlier in the post).
   - mTLS client, performance client, HA client: removed the `module(load="gtls" ...)` line(s); the driver is already referenced by name in `global(DefaultNetstreamDriver="gtls" ...)`. Added a clarifying comment in each.
2. **syslog-ng client referenced `source(s_sys)`.** `s_sys` is the default source name in the RHEL/CentOS syslog-ng package; on Ubuntu/Debian (the post's target OS) the default source defined in `/etc/syslog-ng/syslog-ng.conf` is `s_src`. Referencing `s_sys` would fail with an "unresolved reference" error. Changed to `source(s_src)` with an updated comment.

## Review Notes
- The early rsyslog server and client TLS sections were already correct (imtcp with StreamDriver params; gtls referenced by name; `@`/`@@` UDP/TCP note; PermittedPeer on input vs StreamDriverPermittedPeers on action). The fixes above bring the later sections into line with them.
- `module(load="omfwd")` in the performance config is technically unnecessary (omfwd is a built-in output module) but is tolerated by rsyslog and not an error, so it was left as-is.
- Port 6514, RFC 3164/5424 parsing claims, OpenSSL certificate-generation commands, `openssl s_client` flags (`-brief`, `-quiet`, `-verify_return_error`), `ss`/`tcpdump` usage, UFW/iptables rules, keepalived VRRP, and the HAProxy TCP-mode TLS frontend/backend config are all accurate for current Ubuntu LTS releases.
- Self-signed-CA approach with 4096-bit CA / 2048-bit leaf keys, SHA-256, SANs, and 1-year leaf validity are reasonable and standards-compliant.
- Minor non-blocking suggestion for the future: `peer-verify(required-trusted)` in the syslog-ng server requires clients to present trusted certificates (i.e. mandatory mTLS); a brief note that this enforces client-cert auth (as opposed to `optional-untrusted` for encryption-only) could help readers, but it is not incorrect as written.
