# How to Catch Certificate Changes in Serial Number, Fingerprint, Issuer, or Key After Rotation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSL Monitoring, TLS, X.509, Certificate Rotation, Prometheus, OpenSSL

Description: Detect expected and unexpected TLS certificate changes after rotation by tracking serial numbers, SHA-256 fingerprints, issuers, and public-key identities.

---

An expiry check answers only one question: how long the certificate currently served by an endpoint remains valid. It does not tell you that a rotation happened, that every backend received the new certificate, or that the new certificate has the expected issuer and key.

A reliable rotation check records several identities because each one answers a different question:

| Field | What a change normally means | Important limitation |
| --- | --- | --- |
| Certificate SHA-256 fingerprint | Any byte in the leaf certificate changed | It changes on every reissue, even when the key is reused |
| Issuer and serial number | The CA issued a different certificate | A serial number is unique only within an issuer's scope |
| Issuer distinguished name | The issuing CA or intermediate changed | A legitimate CA chain change can alter it |
| SPKI SHA-256 hash | The leaf public key changed | It stays the same if a renewal reuses the key |
| Subject alternative names | The covered DNS names changed | Ordering and formatting should be normalized before comparison |

Treat a planned change as an auditable deployment event. Treat an unplanned change as a security or routing signal, not automatically as an outage.

## Capture the Certificate Actually Served

Do not inspect only the certificate file on disk. Connect to the same host, port, network path, and address family that a client uses. SNI is essential when several names share an address.

```bash
endpoint_host=api.example.com
endpoint_port=443

openssl s_client \
  -connect "${endpoint_host}:${endpoint_port}" \
  -servername "${endpoint_host}" \
  -showcerts </dev/null 2>/dev/null \
  | awk '
      /-----BEGIN CERTIFICATE-----/ { capture = 1 }
      capture { print }
      /-----END CERTIFICATE-----/ { exit }
    ' > leaf.pem
```

The first PEM object is the leaf certificate selected by the server. Fail the collection job if the TLS command or PEM extraction fails; an empty fingerprint must never overwrite the last good observation.

Inspect the leaf:

```bash
openssl x509 -in leaf.pem -noout \
  -subject -issuer -serial -dates \
  -fingerprint -sha256 \
  -ext subjectAltName
```

Calculate an SPKI hash separately:

```bash
openssl x509 -in leaf.pem -pubkey -noout \
  | openssl pkey -pubin -outform DER \
  | openssl dgst -sha256
```

This hashes the DER-encoded `SubjectPublicKeyInfo`, which includes the public-key algorithm and parameters as well as the key. It is a better key identity than scraping human-readable output. Never export or hash the private key just to monitor a public endpoint.

## Use the Blackbox Exporter Certificate Info Metric

Current Prometheus blackbox exporter HTTP probes expose:

```text
probe_ssl_last_chain_info{
  fingerprint_sha256="...",
  issuer="...",
  serialnumber="...",
  subject="...",
  subjectalternative="..."
} 1
```

The metric describes the leaf certificate from the final HTTPS response. Keep `insecure_skip_verify` false so a probe also detects trust and hostname failures.

```yaml
modules:
  https_certificate:
    prober: http
    timeout: 10s
    http:
      fail_if_not_ssl: true
      follow_redirects: false
      tls_config:
        insecure_skip_verify: false
```

Disabling redirects is useful when certificate identity matters. Otherwise, the recorded certificate can belong to the redirect destination instead of the original endpoint.

The blackbox exporter does not currently put the SPKI hash in this info metric. Add a small, explicitly named custom collector when key continuity or mandatory key rotation is part of policy.

## Detect a Change Without Pinning Forever

Each distinct certificate identity becomes a distinct Prometheus label set. `changes(probe_ssl_last_chain_info[...])` is therefore the wrong expression: the sample value remains `1`; the labels change.

Count distinct label sets observed in a bounded window instead:

```promql
count by (instance) (
  count_over_time(probe_ssl_last_chain_info[30m]) > 0
) > 1
```

With a scrape interval well below 30 minutes, this detects the overlap between the old and new identities after rotation. It is best used as an informational change event because it intentionally remains true for the window length.

To focus on issuer changes while ignoring ordinary fingerprint and serial changes:

```promql
count by (instance) (
  count by (instance, issuer) (
    count_over_time(probe_ssl_last_chain_info[30m]) > 0
  )
) > 1
```

For strict endpoints, compare the current fingerprint with a deployment-managed allowlist:

```promql
probe_ssl_last_chain_info{
  fingerprint_sha256!~"approved_fingerprint_1|approved_fingerprint_2"
} == 1
```

Use the blackbox exporter's lowercase, colon-free fingerprint representation in that matcher. During a rollout, allow both old and new fingerprints, then remove the old value only after every route and backend is confirmed. Updating a permanent pin by hand after every automated renewal is brittle; use it only where change control actually requires it.

## Decide What Is Expected During Rotation

A rotation policy should state the intended transitions before deployment:

- fingerprint and serial must change on reissuance;
- SPKI must change if key rotation is mandatory, or remain stable if key continuity is deliberate;
- issuer may change only during an approved CA or chain migration;
- SANs must equal the approved hostname set;
- `notBefore` and `notAfter` must move forward;
- every IPv4 address, IPv6 address, region, load-balancer node, and origin path must converge.

Fingerprint equality is not a universal availability requirement. A CDN may intentionally use different valid certificates at different edges, and some services serve RSA and ECDSA certificates according to client capabilities. In those designs, validate each observed certificate against an approved set and the required names, trust roots, algorithms, and validity—not against one global fingerprint.

## Keep Evidence and Avoid Cardinality Surprises

Store the observation time, endpoint, resolved address, IP family, SNI value, certificate fingerprint, issuer, serial, SPKI hash, SANs, and expiry. Retain a compact change log outside the time-series label set if long-term audit history is required.

Certificate identity labels create a new series on every rotation. That is usually bounded, but it can become expensive when accidental rapid reissuance or arbitrary targets are allowed. Restrict probe targets, use fixed endpoint labels, and keep raw certificate artifacts in object storage or an audit database rather than embedding full PEM data in metric labels.

## Official Documentation

- [OpenSSL `s_client` command](https://docs.openssl.org/master/man1/openssl-s_client/)
- [OpenSSL `x509` command](https://docs.openssl.org/master/man1/openssl-x509/)
- [OpenSSL `pkey` command](https://docs.openssl.org/master/man1/openssl-pkey/)
- [Prometheus blackbox exporter configuration](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md)
- [Prometheus blackbox exporter TLS metric implementation](https://github.com/prometheus/blackbox_exporter/blob/master/prober/tls.go)
- [RFC 5280: Internet X.509 PKI Certificate and CRL Profile](https://www.rfc-editor.org/rfc/rfc5280)

## Conclusion

Monitor rotations as identity transitions, not merely as resets of an expiry clock. A certificate fingerprint catches any reissue, issuer plus serial identifies the issuance, and an SPKI hash tells you whether the key changed. Capture those values from the live endpoint, compare them with an explicit rollout policy, and keep enough network context to locate a backend that did not converge.
