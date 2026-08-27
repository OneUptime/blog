# Validation Summary: How to Detect Certificate Serial, Fingerprint, Issuer, or Key Changes

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- TLS and X.509 certificates
- OpenSSL 3.x command-line tools (`s_client`, `x509`, `pkey`, and `dgst`)
- Prometheus blackbox exporter v0.28.0
- Prometheus and PromQL
- Bash and YAML

## Sources Consulted

- OpenSSL `s_client` documentation — https://docs.openssl.org/master/man1/openssl-s_client/
- OpenSSL `x509` documentation — https://docs.openssl.org/master/man1/openssl-x509/
- OpenSSL `pkey` documentation — https://docs.openssl.org/master/man1/openssl-pkey/
- OpenSSL `dgst` documentation — https://docs.openssl.org/master/man1/openssl-dgst/
- OpenSSL certificate verification options — https://docs.openssl.org/master/man1/openssl-verification-options/
- Prometheus blackbox exporter v0.28.0 release — https://github.com/prometheus/blackbox_exporter/releases/tag/v0.28.0
- Prometheus blackbox exporter configuration reference — https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/CONFIGURATION.md
- Prometheus blackbox exporter HTTP probe implementation — https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/http.go
- Prometheus blackbox exporter TLS metric implementation — https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/tls.go
- Prometheus query functions (`changes` and `count_over_time`) — https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators and aggregation semantics — https://prometheus.io/docs/prometheus/latest/querying/operators/
- PromQL selectors, range vectors, regex anchoring, and staleness — https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus jobs and instances — https://prometheus.io/docs/concepts/jobs_instances/
- RFC 5280, Internet X.509 PKI Certificate and CRL Profile — https://www.rfc-editor.org/rfc/rfc5280

## Issues Found

1. **The certificate-capture pipeline could report success after failure and destroy the last good file.** The original `s_client | awk > leaf.pem` pipeline truncated `leaf.pem` before collection succeeded, and the shell returned the status of `awk`; an unreachable endpoint could therefore produce status 0 and a zero-byte file. The command now enables `pipefail`, drains and validates the first complete certificate, writes to a same-directory temporary file, verifies it with `openssl x509`, and renames it to `leaf.pem` only after every check succeeds.

2. **The expiry description conflated `notAfter` with overall certificate validity.** An expiry check measures time until `notAfter`; it does not establish that the certificate is currently valid, trusted, hostname-correct, or acceptable under revocation policy. The opening description now states the narrower and accurate `notAfter` behavior.

3. **The SPKI pipeline did not propagate upstream failures.** Without `pipefail`, `openssl dgst` could successfully hash empty input after `x509` or `pkey` failed. The SPKI example now enables pipeline failure propagation.

4. **The certificate-change query counted raw Prometheus series rather than distinct certificate identities.** Multiple jobs, replicas, or other non-certificate labels could make the original `count by (instance)` expression remain true without a rotation. The query now collapses raw series by `(job, instance, fingerprint_sha256)` and then counts fingerprints per `(job, instance)`. The issuer query was similarly scoped, and the text now tells operators to preserve any additional stable route, region, or module labels in each grouping clause.

5. **The change-event duration was stated too exactly.** The alert does not necessarily remain true for exactly the configured range; it remains true until the last old-identity sample ages out, which is roughly the range length and depends on scrape timing and gaps. The wording now reflects that behavior.

6. **The fingerprint allowlist could fail open when the info metric is absent.** TLS handshake and verification failures can prevent `probe_ssl_last_chain_info` from being emitted, so the allowlist expression alone cannot detect those failures. The post now requires a separate `probe_success == 0` alert.

7. **Several X.509 identity statements were broader than the standards or exporter data.** Numeric serial numbers are unique only within a CA/issuer scope, so the rotation policy now requires the issuer-plus-serial identity, rather than the serial alone, to change. The SAN wording now explicitly concerns DNS SANs, documents that blackbox exporter's `subjectalternative` label excludes non-DNS SAN types, and replaces a universal monotonic-date requirement with comparison against the approved validity window.

## Review Notes

- The OpenSSL capture example intentionally records the certificate presented by the endpoint. `s_client` normally continues after certificate-verification errors, and `-servername` sends SNI but does not itself perform hostname verification. A standalone collector that must also validate the endpoint should use the intended trust store together with `-verify_return_error` and `-verify_hostname`; the blackbox exporter example already performs trust and hostname validation because `insecure_skip_verify` is false.
- The blackbox exporter metric schema, lowercase colon-free fingerprint format, redirect behavior, YAML keys, and absence of an SPKI label were verified against v0.28.0 and current upstream source.
- The `subjectalternative` metric label preserves certificate order and contains only comma-joined DNS SAN values. Issuer distinguished names are also names rather than cryptographic CA identities; stricter issuer-key continuity requires evidence such as the issuer certificate fingerprint/SPKI or an appropriately validated authority key identifier.
- A blackbox HTTP target should include an explicit `https://` scheme. With redirects disabled, a 3xx response does not satisfy the default 2xx status policy even though TLS certificate information for that response can still be emitted.
- Certificate selection can vary by resolved address, address family, region, and ClientHello capabilities. The post correctly advises probing each relevant path and treating intentionally diverse certificates as an approved set.
