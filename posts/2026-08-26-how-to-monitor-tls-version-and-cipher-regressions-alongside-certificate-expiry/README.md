# How to Monitor TLS Version and Cipher Regressions Alongside Certificate Expiry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSL Monitoring, TLS, Cipher Suites, Prometheus, OpenSSL, Security Monitoring

Description: Monitor negotiated TLS versions and ciphers with certificate expiry, while separately testing whether a server has re-enabled legacy protocol or cipher support.

---

A certificate can be valid for months while the endpoint's TLS posture regresses overnight. A load-balancer policy change can re-enable TLS 1.0, a migration can replace an approved cipher with an unexpected one, or one region can negotiate differently from the rest.

Expiry and TLS configuration are related operational signals, but they answer different questions:

- expiry asks whether the presented certificate chain remains valid long enough;
- negotiated version and cipher describe one successful handshake;
- protocol and cipher enumeration asks what the server would accept from other clients.

One normal TLS probe covers the first two. It cannot, by itself, prove that no weaker alternative remains enabled.

## Set an Explicit Client Policy

Current blackbox exporter TLS configuration accepts `TLS10`, `TLS11`, `TLS12`, and `TLS13` for minimum and maximum versions. Make the production expectation explicit:

```yaml
modules:
  https_tls_policy:
    prober: http
    timeout: 10s
    http:
      fail_if_not_ssl: true
      follow_redirects: false
      tls_config:
        insecure_skip_verify: false
        min_version: TLS12
```

The current Go default minimum is TLS 1.2, but an explicit setting documents intent and protects against ambiguity across versions. Do not set `insecure_skip_verify`; version policy is not a replacement for certificate and hostname verification.

Blackbox HTTP probes expose these relevant metrics:

```text
probe_ssl_earliest_cert_expiry 1.8e+09
probe_tls_version_info{version="TLS 1.3"} 1
probe_tls_cipher_info{cipher="TLS_AES_128_GCM_SHA256"} 1
probe_success 1
```

The exporter records the version and cipher negotiated for that successful connection. The exact cipher names come from Go's `crypto/tls` cipher-suite names.

## Alert on Expiry, Version, and Cipher Independently

```yaml
groups:
  - name: tls-policy
    rules:
      - alert: TLSCertificateExpiresSoon
        expr: probe_ssl_earliest_cert_expiry - time() < 14 * 24 * 60 * 60
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "TLS certificate chain expires within 14 days"

      - alert: TLSNegotiatedLegacyVersion
        expr: probe_tls_version_info{version=~"TLS 1\\.[01]"} == 1
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "{{ $labels.instance }} negotiated {{ $labels.version }}"

      - alert: TLSNegotiatedCipherOutsidePolicy
        expr: |
          probe_tls_cipher_info{
            cipher!~"TLS_AES_128_GCM_SHA256|TLS_AES_256_GCM_SHA384|TLS_CHACHA20_POLY1305_SHA256"
          } == 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "{{ $labels.instance }} negotiated unapproved cipher {{ $labels.cipher }}"

      - alert: TLSProbeFailed
        expr: probe_success{job="blackbox-https"} == 0
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "TLS policy probe failed for {{ $labels.instance }}"
```

The cipher allowlist above is intentionally a narrow example for a TLS-1.3-only endpoint. A service that legitimately negotiates TLS 1.2 needs approved TLS 1.2 suite names too. Build the expression from your written policy and client compatibility requirements rather than copying the sample.

Keep `TLSProbeFailed` separate. If the server no longer has any version or cipher in common with the monitor, the negotiated-info metrics can be absent.

## Detect Negotiated Changes During Rollout

Because version and cipher are labels on info metrics, `changes()` does not detect their transition. Count distinct label sets in a bounded window:

```promql
count by (instance) (
  count_over_time(probe_tls_version_info[30m]) > 0
) > 1
```

```promql
count by (instance) (
  count_over_time(probe_tls_cipher_info[30m]) > 0
) > 1
```

These expressions make good informational rollout events. A change can result from a server update, a different backend, a client-library update, or a server preference change. Preserve region, address family, and vantage labels so the event is diagnosable.

## Do Not Confuse Negotiation with Enumeration

A modern client normally offers modern versions and ciphers. If the server negotiates TLS 1.3, that proves TLS 1.3 works; it does not prove TLS 1.0 is disabled. Likewise, observing `TLS_AES_128_GCM_SHA256` does not prove the server rejects an old CBC suite offered by a legacy client.

Run an authorized, lower-frequency policy scan to enumerate support. Nmap's official `ssl-enum-ciphers` script repeatedly initiates TLS connections while trying suites and protocol versions:

```bash
nmap -sV --script ssl-enum-ciphers -p 443 api.example.com
```

The script is noisy and performs many handshakes. Approve its targets, rate, source, and schedule, especially for appliances and third-party services.

For a focused diagnostic, OpenSSL can require a particular protocol version:

```bash
openssl s_client \
  -connect api.example.com:443 \
  -servername api.example.com \
  -tls1_2 \
  -verify_hostname api.example.com \
  -verify_return_error </dev/null
```

OpenSSL supports `-cipher` for TLS 1.2 and earlier and `-ciphersuites` for TLS 1.3. Availability also depends on the local OpenSSL build, providers, and security level. A local “no ciphers available” error is not evidence that the server rejected the suite, so retain the handshake error and distinguish client incapability from server refusal.

## Test Legacy Versions as Negative Controls

The blackbox exporter can constrain a module to one version with both bounds:

```yaml
modules:
  diagnostic_tls10:
    prober: http
    timeout: 10s
    http:
      follow_redirects: false
      tls_config:
        min_version: TLS10
        max_version: TLS10
        insecure_skip_verify: false
```

If this dedicated probe succeeds, the endpoint accepted TLS 1.0 and also returned an acceptable HTTP response. If it fails, the result is ambiguous: protocol rejection, certificate validation, routing, or HTTP status could all be responsible. Use debug output or an enumeration tool before declaring the negative control healthy.

Run legacy tests less frequently than availability probes and from controlled scanners. Do not weaken the primary production probe to test obsolete compatibility.

## Monitor Every Termination Layer

TLS policy can differ at:

- public CDN edges;
- regional or global load balancers;
- ingress gateways and service meshes;
- direct origins;
- IPv4 and IPv6 listeners;
- alternate ports and STARTTLS services.

An edge's modern policy does not describe the edge-to-origin TLS hop. Monitor each hop independently with its real hostname, trust store, and client policy.

Managed platforms also expose control-plane security policies and connection logs. Reconcile those declarations with black-box observations. A declared policy can drift from a listener attachment, and one observed handshake cannot enumerate every accepted suite.

## Establish a Baseline Without Freezing Progress

Store an approved set rather than one forever-pinned version or cipher. During a planned migration, allow old and new values for a bounded window. After every target converges, remove the retired value. Alert on:

- a value outside the approved set;
- a version or cipher change outside a maintenance window;
- different results across regions or address families;
- reappearance of a retired protocol in enumeration;
- no successful modern-policy handshake;
- certificate expiry or identity change at the same time.

Version and cipher labels create new time series when they change, but their domain is small and bounded. Never turn arbitrary scanner output into unbounded Prometheus labels.

## Official Documentation

- [Prometheus blackbox exporter configuration](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md)
- [Prometheus blackbox exporter TLS metrics](https://github.com/prometheus/blackbox_exporter/blob/master/prober/prober.go)
- [Prometheus blackbox exporter negotiated TLS values](https://github.com/prometheus/blackbox_exporter/blob/master/prober/tls.go)
- [OpenSSL TLS version options](https://docs.openssl.org/master/man1/openssl/)
- [OpenSSL `s_client` command](https://docs.openssl.org/master/man1/openssl-s_client/)
- [Nmap `ssl-enum-ciphers` NSE script](https://nmap.org/nsedoc/scripts/ssl-enum-ciphers.html)
- [RFC 8446: TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446)
- [RFC 8996: Deprecating TLS 1.0 and TLS 1.1](https://www.rfc-editor.org/rfc/rfc8996)

## Conclusion

Pair expiry monitoring with an explicit TLS client policy and alerts on the version and cipher actually negotiated. Then add controlled enumeration or negative probes to answer the separate question of what weaker clients could negotiate. This combination detects both operational breakage and silent security regressions without overstating what one handshake proves.
