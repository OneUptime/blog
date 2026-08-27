# Validation Summary: What Should an SSL Monitor Validate Besides Expiry?

## Status

validated

## Post Type

Technical guide and reference

## Technologies Covered

- TLS and HTTPS endpoint validation
- X.509 certificates and public key infrastructure (PKI)
- OpenSSL 3.6 command-line tools
- OCSP, OCSP stapling, and certificate revocation lists (CRLs)
- Prometheus blackbox exporter and PromQL
- Certificate Transparency, Chromium CRLSets, and Mozilla CRLite
- CA/Browser Forum TLS Baseline Requirements

## Sources Consulted

- [OpenSSL 3.6 `s_client` documentation](https://docs.openssl.org/3.6/man1/openssl-s_client/)
- [OpenSSL 3.6 `verify` documentation](https://docs.openssl.org/3.6/man1/openssl-verify/)
- [OpenSSL 3.6 certificate verification options](https://docs.openssl.org/3.6/man1/openssl-verification-options/)
- [OpenSSL 3.6 hostname verification flags](https://docs.openssl.org/3.6/man3/X509_VERIFY_PARAM_set_hostflags/)
- [Prometheus blackbox exporter configuration on `master`](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md)
- [Prometheus blackbox exporter CRL implementation](https://github.com/prometheus/blackbox_exporter/blob/master/prober/crl.go)
- [Prometheus blackbox exporter HTTP prober implementation](https://github.com/prometheus/blackbox_exporter/blob/master/prober/http.go)
- [Blackbox exporter CRL support commit `372bf83`](https://github.com/prometheus/blackbox_exporter/commit/372bf83b8e4b49860df77ef9d8cec0b94839027c)
- [Blackbox exporter v0.28.0 release](https://github.com/prometheus/blackbox_exporter/releases/tag/v0.28.0)
- [RFC 5280: Internet X.509 PKI Certificate and CRL Profile](https://www.rfc-editor.org/rfc/rfc5280.html)
- [RFC 6960: Online Certificate Status Protocol](https://www.rfc-editor.org/rfc/rfc6960.html)
- [RFC 9525: Service Identity in TLS](https://www.rfc-editor.org/rfc/rfc9525.html)
- [CA/Browser Forum TLS Baseline Requirements v2.2.9](https://cabforum.org/working-groups/server/baseline-requirements/requirements/)
- [Chromium CRLSets documentation](https://www.chromium.org/Home/chromium-security/crlsets/)
- [Mozilla CRLite documentation](https://blog.mozilla.org/en/firefox/crlite/)
- [Chrome Certificate Transparency policy](https://googlechrome.github.io/CertificateTransparency/ct_policy.html)

## Issues Found

- The introduction implied that an absent server-authentication EKU is inherently invalid. Under RFC 5280, an EKU restricts use when present; an absent EKU is generally unrestricted unless application policy requires it. Changed the wording to describe key usage or EKU that excludes server authentication.
- The offline `openssl verify` example used `-CAfile`, which does not by itself disable OpenSSL's default CA directory and store, and it omitted a TLS-server purpose check. Replaced `-CAfile` with `-trusted` to isolate the supplied roots and added `-purpose sslserver` so server key-usage and EKU rules are evaluated.
- The OCSP-stapling guidance omitted response-to-certificate binding and signer authorization and referred to `nextUpdate` without noting that RFC 6960 makes it optional. Updated the guidance to require certificate binding, signature and signer-authorization validation, status evaluation, and freshness checks using `thisUpdate` and `nextUpdate` when present.
- The CRL guidance was limited to directly issuer-signed CRLs, although RFC 5280 permits authorized indirect CRL issuers. It also did not state that OpenSSL needs CRL checking enabled for supplied or downloaded CRLs. Added indirect-issuer handling, `-extended_crl`, and the required `-crl_check -crl_download` combination.
- The blackbox exporter example presented `check_revoked` as generally current, but the feature was merged to upstream `master` in commit `372bf83` and is not present in v0.28.0, the latest tagged release on the validation date. Version 0.28.0 rejects the unknown field and does not expose the referenced metrics. Added the exact build/release requirement and identified the documentation as upstream `master` documentation.
- The statement about deriving the verification name from the target hostname did not account for explicit `tls_config.server_name` or HTTP `Host` overrides. Qualified the behavior as the default.

## Review Notes

- OpenSSL 3.6 `-verify_hostname` retains legacy subject Common Name fallback and compatibility wildcard behavior. The command is a valid OpenSSL diagnostic, but by itself it is not a strict RFC 9525 SAN-only conformance test.
- The OpenSSL and blackbox exporter links in the post point to mutable `master` documentation or source. The commands were checked against OpenSSL 3.6.2, and the exporter behavior was checked against the merged CRL implementation as well as v0.28.0.
- The CA/Browser Forum page is a moving latest-version document; it reported TLS Baseline Requirements v2.2.9, dated August 6, 2026, during this review.
- All Markdown links in the post resolved successfully during validation.
