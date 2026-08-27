# Validation Summary: How to Monitor SMTP, IMAP, LDAP, and FTP Certificates That Require STARTTLS

## Status

validated

## Post Type

Technical guide / monitoring tutorial

## Technologies Covered

- STARTTLS and implicit TLS
- SMTP relay and message submission
- IMAP
- LDAP
- FTP and explicit FTPS
- OpenSSL `s_client`
- Prometheus Blackbox Exporter
- Prometheus scrape configuration and PromQL
- X.509 certificate chain, hostname, SNI, and expiry validation

## Sources Consulted

- [OpenSSL 3.6 `s_client` documentation](https://docs.openssl.org/3.6/man1/openssl-s_client/)
- [OpenSSL certificate verification options](https://docs.openssl.org/3.6/man1/openssl-verification-options/)
- [OpenSSL 3.6 `s_client` implementation](https://github.com/openssl/openssl/blob/openssl-3.6.4/apps/s_client.c)
- [Blackbox Exporter v0.28.0 configuration reference](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/CONFIGURATION.md#tcp_probe)
- [Blackbox Exporter v0.28.0 query-response implementation](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/query_response.go)
- [Blackbox Exporter v0.28.0 example configuration](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/example.yml)
- [Prometheus multi-target exporter guide](https://prometheus.io/docs/guides/multi-target-exporter/)
- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)
- [Prometheus `time()` function documentation](https://prometheus.io/docs/prometheus/latest/querying/functions/#time)
- [Prometheus arithmetic and comparison binary operators](https://prometheus.io/docs/prometheus/latest/querying/operators/#binary-operators)
- [RFC 3207: SMTP Service Extension for Secure SMTP over TLS](https://www.rfc-editor.org/rfc/rfc3207.html)
- [RFC 5321: Simple Mail Transfer Protocol](https://www.rfc-editor.org/rfc/rfc5321.html)
- [RFC 6409: Message Submission for Mail](https://www.rfc-editor.org/rfc/rfc6409.html)
- [RFC 8314: Cleartext Considered Obsolete for Email Submission and Access](https://www.rfc-editor.org/rfc/rfc8314.html)
- [RFC 2595: Using TLS with IMAP, POP3 and ACAP](https://www.rfc-editor.org/rfc/rfc2595.html)
- [RFC 9051: IMAP Version 4rev2](https://www.rfc-editor.org/rfc/rfc9051.html)
- [RFC 4511: LDAP StartTLS operation and BER encoding](https://www.rfc-editor.org/rfc/rfc4511.html#section-4.14)
- [RFC 4217: Securing FTP with TLS](https://www.rfc-editor.org/rfc/rfc4217.html)
- [RFC 959: FTP reply syntax](https://www.rfc-editor.org/rfc/rfc959.html)
- [IANA Service Name and Port Number Registry](https://www.iana.org/assignments/service-names-port-numbers/)
- [RFC 8461: SMTP MTA Strict Transport Security](https://www.rfc-editor.org/rfc/rfc8461.html)
- [RFC 7672: SMTP Security via DANE TLSA](https://www.rfc-editor.org/rfc/rfc7672.html)

## Issues Found

- The service table treated SMTP relay and submission as if both had an implicit-TLS alternative on port 465. Port 465 is for implicit-TLS message submission; MX relay remains on port 25 with no standardized implicit-TLS port. The table now distinguishes the relay and submission mappings.
- The FTP row described the implicit-TLS port as deployment-specific even though TCP port 990 is the IANA-registered and commonly used implicit FTPS control port. The table now lists port 990 while retaining port 21 for the RFC 4217 `AUTH TLS` flow.
- The OpenSSL guidance incorrectly discouraged `-verify_quiet`. That option only limits verification output to errors and does not weaken verification or suppress exit status. The text now describes it as optional, refers to a private CA certificate as a trusted root, and retains the requirement to preserve the command's exit status.
- The SMTP Blackbox patterns could match a `220-`, `250-`, or other continuation line and advance before the complete multiline reply had been consumed. The module now waits for final `220` reply lines, uses an exact case-insensitive `STARTTLS` capability match, and consumes the final `250` EHLO line before sending `STARTTLS`. The text also documents the alternate single expectation needed when `STARTTLS` is the final `250` line.
- The IMAP capability pattern was case-sensitive, could match `STARTTLS` as part of a larger token, and did not require the tagged completion of the `a001 CAPABILITY` command before sending `a002 STARTTLS`. The regexes are now case-insensitive and token-aware, and the module waits for `a001 OK` before issuing the upgrade command.
- The IMAP explanation overstated RFC 2595 by treating the post-TLS `CAPABILITY` command as mandatory. The RFC requires discarding cached capabilities but only recommends reissuing `CAPABILITY`; the wording now preserves that distinction.
- The FTP Blackbox patterns could begin the next step from a multiline `220-` or `234-` continuation reply. They now require the final reply line before sending `AUTH TLS` or starting the TLS handshake.
- The alerting text referred to a post-upgrade timeout even though these certificate-only modules stop after completing the TLS handshake. It now identifies a TLS handshake timeout as the relevant failure mode.

## Review Notes

- All OpenSSL flags and all four `-starttls` protocol names are current. The revised Blackbox module fields and regular expressions are valid for Blackbox Exporter v0.28.0, the latest release at review time.
- OpenSSL's SMTP and IMAP modes try the upgrade even when `STARTTLS` was not advertised, and its FTP mode relies on the subsequent TLS handshake rather than strictly parsing response code `234`. The stricter Blackbox capability and response checks in the post remain important.
- The PromQL expression is valid. In production, an additional `up{job="blackbox-starttls"} == 0` alert can distinguish inability to scrape the exporter from a completed probe that reports `probe_success == 0`.
- Every external link already present in the post resolved successfully and pointed to the intended official documentation or RFC.
