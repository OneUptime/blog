# Validation Summary: How to Inspect SSL Certificates with openssl s_client on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenSSL (s_client, x509 subcommands)
- TLS/SSL protocols (TLS 1.0, 1.1, 1.2, 1.3)
- STARTTLS for SMTP, IMAP, LDAP, MySQL, PostgreSQL
- OCSP stapling
- X.509 certificates (SANs, expiry, chain validation)
- Bash scripting (date arithmetic, awk)
- Ubuntu Linux

## Sources Consulted
- OpenSSL 3.0 `openssl s_client` man page and `-help` output (verified on local OpenSSL 3.0.13)
- OpenSSL 3.0 `openssl x509` man page and `-help` output (`-checkend` behavior confirmed)
- OpenSSL `s_client -starttls` supported protocols list (verified via local `openssl s_client -starttls foo` error output): smtp, pop3, imap, ftp, xmpp, xmpp-server, telnet, irc, mysql, postgres, lmtp, nntp, sieve, ldap
- OpenSSL `X509_V_*` error code definitions (verify return codes 2, 10, 18, 19, 20, 21)
- RFC 8446 (TLS 1.3) cipher suite naming conventions
- MySQL Reference Manual: TLS connection requires STARTTLS-style negotiation, not raw TLS on 3306
- PostgreSQL documentation: TLS negotiated via SSLRequest protocol message, not raw TLS on 5432

## Issues Found

1. **MySQL TLS example (port 3306)**: The original example `openssl s_client -connect db.example.com:3306` would not perform a TLS handshake because MySQL does not speak raw TLS on its default port — TLS must be negotiated via MySQL's own protocol. Fixed by adding `-starttls mysql` and a clarifying comment. OpenSSL supports `-starttls mysql` (verified in OpenSSL 3.0.13).

2. **PostgreSQL TLS example (port 5432)**: Same root cause as MySQL — PostgreSQL clients send an `SSLRequest` message before the TLS handshake. Direct `openssl s_client -connect` will not work. Fixed by adding `-starttls postgres` and a clarifying comment. OpenSSL supports `-starttls postgres`.

3. **"List cipher suites the server prefers" comment**: The original comment was misleading because the command `openssl s_client ... | grep "Cipher"` only shows the single cipher suite that was negotiated for the current connection, not all cipher suites the server prefers (which would require iterating through ciphers with `-cipher`/`-ciphersuites`, or using a tool like `nmap --script ssl-enum-ciphers`). Updated comment to accurately describe what the command does.

## Review Notes

- The `-checkend` flag exit-code behavior is correctly described (exit 0 if cert will NOT expire within N seconds, exit 1 if it will).
- The X509 verify return codes listed (2, 10, 18, 19, 20, 21) all match the `X509_V_*` constants in OpenSSL.
- The Redis port 6380 example is fine because TLS-only Redis ports do speak raw TLS (per the official Redis TLS docs); the "typically" caveat in the comment is appropriate.
- The `-cipher` flag controls TLS 1.2 and below cipher suite selection; for TLS 1.3 you would use `-ciphersuites`. Since `-cipher` does not constrain TLS 1.3, the cipher-suite test example will still work (the connection may simply fall back to TLS 1.3 with default ciphers). This is a minor caveat but not incorrect.
- The awk + shell loop for parsing chain certificates is more convoluted than necessary (something like `csplit` would be simpler), but it is functionally correct.
- The `-proxy`, `-proxy_user`, and `-proxy_pass` options were confirmed to exist in OpenSSL 3.0.13 `s_client -help`.
- Ubuntu typically ships OpenSSL 3.x on 22.04+ and 1.1.1 on older releases; all flags used in the post are supported across these versions.
