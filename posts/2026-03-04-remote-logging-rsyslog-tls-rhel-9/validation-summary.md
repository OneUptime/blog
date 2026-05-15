# Validation Summary: How to Set Up Remote Logging with rsyslog Over TLS on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- rsyslog
- GnuTLS / rsyslog-gnutls
- TLS and mutual TLS certificates
- certtool / gnutls-utils
- firewalld
- OpenSSL s_client

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation, "Configuring TLS-encrypted remote logging": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- rsyslog gtls network stream driver documentation: https://docs.rsyslog.com/doc/concepts/ns_gtls.html
- rsyslog imtcp PermittedPeer parameter documentation: https://www.rsyslog.com/doc/reference/parameters/imtcp-permittedpeer.html
- rsyslog imtcp StreamDriver.AuthMode parameter documentation: https://docs.rsyslog.com/doc/reference/parameters/imtcp-streamdriver-authmode.html
- rsyslog omfwd module documentation: https://docs.rsyslog.com/doc/configuration/modules/omfwd.html

## Issues Found
- The server-side `x509/name` TLS configuration did not list permitted client certificate identities. Added `PermittedPeer="client1.example.com"` so the server authorizes the client certificate name, matching the client certificate template and rsyslog's documented peer restriction behavior.
- The server example used `StreamDriver.Authmode`; corrected it to the documented `StreamDriver.AuthMode` spelling.
- The certificate overview said client certificates were optional, but the main configuration uses mutual TLS with `x509/name`. Clarified that client certificates are required for the configuration shown.
- The TLS connection check used `ss -tlnp`, which shows listening sockets rather than active connections. Changed it to `ss -tnp` for active TCP connections.
- The `openssl s_client` examples did not provide the client certificate and key, which can fail against the mutual-TLS listener. Added `-cert` and `-key` options.
- The anonymous TLS note understated the security limitation. Updated it to state that anonymous TLS lacks peer authentication and is vulnerable to man-in-the-middle attacks.

## Review Notes
- Port 6514 is appropriate for syslog over TLS, and the `rsyslog-gnutls`, `gnutls-utils`, `certtool`, `firewall-cmd`, `logger`, and `rsyslogd -N1` commands are technically valid for this tutorial.
- Red Hat's RHEL 9 documentation also documents OpenSSL (`ossl`) as an available stream driver and provides RHEL system-role based TLS logging examples. The post's GnuTLS-focused approach remains valid.
