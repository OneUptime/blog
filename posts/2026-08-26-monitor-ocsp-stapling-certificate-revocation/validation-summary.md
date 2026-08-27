# Validation Summary: How to Monitor OCSP Stapling and Certificate Revocation Without Treating notAfter as Enough

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- TLS and X.509 certificate validation
- OCSP, direct OCSP queries, and OCSP stapling
- RFC 7633 TLS Feature (OCSP Must-Staple)
- Certificate Revocation Lists (CRLs) and CRL Distribution Points
- OpenSSL 3.6 and 4.0 command-line tools
- Prometheus Blackbox Exporter certificate-expiry metrics

## Sources Consulted

- [RFC 6960: Online Certificate Status Protocol](https://www.rfc-editor.org/rfc/rfc6960.html), especially Sections 2.2, 2.4, 3.2, and 4.2.2.1
- [RFC 6066: TLS Certificate Status Request](https://www.rfc-editor.org/rfc/rfc6066.html#section-8)
- [RFC 7633: TLS Feature Extension](https://www.rfc-editor.org/rfc/rfc7633.html), especially Sections 3, 4.1, 4.2.3.1, and 4.3.3
- [RFC 9325: TLS revocation recommendations](https://www.rfc-editor.org/rfc/rfc9325.html#section-7.5)
- OpenSSL 3.6 documentation for [`s_client`](https://docs.openssl.org/3.6/man1/openssl-s_client/), [`ocsp`](https://docs.openssl.org/3.6/man1/openssl-ocsp/), [`x509`](https://docs.openssl.org/3.6/man1/openssl-x509/), [`verify`](https://docs.openssl.org/3.6/man1/openssl-verify/), and [verification options](https://docs.openssl.org/3.6/man1/openssl-verification-options/)
- [OpenSSL 3.6 release notes](https://www.openssl-library.org/news/openssl-3.6-notes/) and [CVE-2026-54876 advisory](https://www.openssl-library.org/news/vulnerabilities-3.6/#CVE-2026-54876)
- OpenSSL 3.6.4 source for [built-in OCSP verification](https://github.com/openssl/openssl/blob/openssl-3.6.4/crypto/x509/x509_vfy.c), [`OCSP_check_validity`](https://github.com/openssl/openssl/blob/openssl-3.6.4/crypto/ocsp/ocsp_cl.c), the [`openssl ocsp` application's exit handling](https://github.com/openssl/openssl/blob/openssl-3.6.4/apps/ocsp.c), and the [`-crl_download` callback](https://github.com/openssl/openssl/blob/openssl-3.6.4/apps/lib/apps.c)
- Prometheus Blackbox Exporter v0.28.0 source for [`probe_ssl_earliest_cert_expiry` calculation](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/tls.go) and [metric definition](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/prober.go)

## Issues Found

- The OpenSSL 3.6 section was titled as enforced staple checking even though `-ocsp_check_leaf` enforces certificate-status checking and can fall back to CRLs when CRL checking is enabled. The heading now says “Enforced Status Checking.”
- The post did not account for OCSP-specific defects in earlier OpenSSL 3.6 and 4.0 patch releases. It now directs readers to patched releases and identifies 3.6.4 and 4.0.2 as the releases that fixed the relevant OCSP-response-checking memory leak.
- The built-in `s_client` status check did not fully implement the freshness policy described earlier in the post: OpenSSL permits five minutes of clock skew, including after `nextUpdate`, and supplies no maximum age when `nextUpdate` is absent. This limitation and the need for a structured checker under stricter policy are now explicit.
- `openssl x509 -ocsp_uri` can print multiple responder URLs. Capturing all output in one shell variable could pass an invalid multiline value to `openssl ocsp -url`. The example now selects the first URL and tells the reader to override that selection when the CA advertises several.
- The explanation of `-status_age` was too narrow and the automation warning was incomplete. `-status_age` checks the age of `thisUpdate` even when `nextUpdate` is present, while `openssl ocsp` only warns about invalid status times. Cryptographically valid `revoked` and `unknown` statuses and invalid status times do not necessarily cause a nonzero exit. The post now requires parsing and enforcing both freshness and a `good` status.
- The CRL example did not state that OpenSSL's `-crl_download` helper only uses HTTP distribution points and does not cache downloads. It is now identified as a diagnostic helper, with a cached scheme-aware fetcher recommended for production monitoring.
- The policy table allowed a stale or invalid served staple to be rescued by a direct query. RFC 6066 requires a client that receives an unsatisfactory stapled response to abort the handshake; a direct query is useful for diagnosis but does not repair that handshake. The table now keeps the condition critical and uses the direct query only diagnostically.
- The Must-Staple explanation used the weaker phrase “expected to supply.” RFC 7633 requires a server presenting such a certificate to satisfy a client's request for the advertised feature, so the text now states that requirement directly.

## Review Notes

All other commands and flags are valid for OpenSSL 3.6. The `-status` command correctly remains diagnostic-only; `-ocsp_check_leaf` and `-ocsp_check_all` have the documented staple-first and optional CRL-fallback behavior; the direct OCSP command performs signature, signer-chain, and responder-authorization verification; and the CRL verification command correctly distinguishes leaf-only from full-chain checking. Explicitly setting `-validity_period 300` matches OpenSSL's five-minute default but is harmless and makes the policy visible. The Blackbox Exporter metric is correctly described as the earliest presented-certificate `NotAfter` Unix timestamp and, by itself, conveys no OCSP or CRL result. All documentation links resolved to the intended official resources.
