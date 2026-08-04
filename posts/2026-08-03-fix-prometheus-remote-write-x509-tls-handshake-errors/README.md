# Fixing x509 and TLS Handshake Errors in Prometheus Remote Write

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Remote Write, TLS, x509, Certificates, mTLS, Troubleshooting

Description: Diagnose Remote Write TLS failures by validating names, chains, trust roots, SNI, client certificates, protocol versions, and every termination hop.

---

Remote Write uses an ordinary HTTP client underneath its protobuf protocol, so TLS must succeed before the receiver can inspect any metric data. An x509 error is a certificate-validation failure. A more general TLS handshake error can also come from protocol versions, mutual TLS, SNI routing, or connecting with the wrong scheme.

Changing queue sizes or retry backoff does not fix TLS. Identify the exact TLS peer Prometheus reaches, validate that peer from the same network, and configure trust without disabling verification.

## Start with the Error Category

Common Go TLS errors point to different faults:

| Error fragment | Likely fault |
| --- | --- |
| `certificate signed by unknown authority` | Issuing CA is absent from the sender trust store, or the server omitted an intermediate |
| `certificate is valid for ..., not ...` | Remote Write URL or `server_name` does not match a certificate SAN |
| `certificate has expired or is not yet valid` | Certificate dates or system clock are wrong |
| `remote error: tls: certificate required` | Receiver requires a client certificate |
| `remote error: tls: bad certificate` | Client certificate is untrusted, expired, malformed, or not authorized |
| `tls: first record does not look like a TLS handshake` | Sender used `https` against a plaintext HTTP listener |
| `handshake failure` or `protocol version not supported` | TLS policy, SNI route, cipher/protocol compatibility, or mTLS negotiation failed |

Read the complete sender log and the server-side TLS log. The same client-visible handshake failure may have a precise reason on the proxy or receiver.

## Validate the Endpoint from the Prometheus Network

Run tests inside the Prometheus container, Pod, or an equivalent debug workload. Testing from a laptop may hit different DNS, a public load balancer, or a different certificate.

```bash
openssl s_client \
  -connect metrics.example.net:443 \
  -servername metrics.example.net \
  -verify_hostname metrics.example.net \
  -showcerts \
  -verify_return_error \
  </dev/null
```

The explicit `-servername` value sends SNI, while `-verify_hostname` performs the separate hostname check. OpenSSL 1.1.1 and newer also derive SNI from a DNS-form `-connect` host by default, but keeping it explicit makes the intended route clear and is necessary when connecting to an IP address or a different DNS name.

Also test with the exact private CA that Prometheus will use:

```bash
curl --fail --show-error \
  --cacert /etc/prometheus/pki/metrics-ca.pem \
  https://metrics.example.net/-/ready
```

The health path may differ for a managed receiver. This test validates DNS, TCP, TLS, and HTTP; it does not validate a Remote Write protobuf request.

## Trust a Private Certificate Authority

Configure the Remote Write client's TLS block:

```yaml
remote_write:
  - name: central
    url: https://metrics.example.net/api/v1/write
    tls_config:
      ca_file: /etc/prometheus/pki/metrics-ca.pem
```

`ca_file` should contain the PEM certificate for the private root or appropriate trust chain, not the receiver's private key. Mount it into the Prometheus process and verify it is readable:

```bash
ls -l /etc/prometheus/pki/metrics-ca.pem
openssl x509 \
  -in /etc/prometheus/pki/metrics-ca.pem \
  -noout -subject -issuer -dates
```

If a public CA certificate still reports an unknown authority, inspect what the server actually sends. Servers normally send their leaf certificate and required intermediates, but not the root. A missing intermediate on the server should be fixed at the TLS terminator rather than copied into every client as an ad hoc exception.

## Fix Hostname and SNI Mismatches

Certificate identity is checked against Subject Alternative Names: DNS names for hostname URLs and IP Address SANs for IP URLs. The legacy Common Name is ignored. Prefer a URL whose hostname appears in a DNS SAN:

```yaml
remote_write:
  - url: https://metrics.example.net/api/v1/write
```

This commonly fails if the certificate covers `metrics.example.net` but the URL uses an IP address or an internal Kubernetes name:

```yaml
remote_write:
  - url: https://10.20.30.40/api/v1/write
```

When network routing genuinely requires a different address, `server_name` controls certificate verification and, when it is a DNS name, TLS SNI:

```yaml
remote_write:
  - url: https://metrics-gateway.monitoring.svc:443/api/v1/write
    tls_config:
      ca_file: /etc/prometheus/pki/metrics-ca.pem
      server_name: metrics.example.net
```

Use this only if the service at that address is intentionally authorized for `metrics.example.net`. It does not change the HTTP URL or bypass trust checks.

## Configure Mutual TLS Correctly

If the receiver requires a client identity, provide a matching client certificate and private key:

```yaml
remote_write:
  - name: central-mtls
    url: https://metrics.example.net/api/v1/write
    tls_config:
      ca_file: /etc/prometheus/pki/server-ca.pem
      cert_file: /etc/prometheus/pki/client.crt
      key_file: /etc/prometheus/pki/client.key
      server_name: metrics.example.net
```

These files have distinct roles:

- `ca_file` verifies the **server** certificate;
- `cert_file` is the sender's **client** certificate and usually includes any client intermediates needed by the server;
- `key_file` is the private key matching `cert_file`.

Check the pair without exposing the private key:

```bash
openssl x509 -in /etc/prometheus/pki/client.crt -pubkey -noout \
  | openssl sha256

openssl pkey -in /etc/prometheus/pki/client.key -pubout \
  | openssl sha256
```

The hashes must match. Then test mTLS:

```bash
curl --fail --show-error \
  --cacert /etc/prometheus/pki/server-ca.pem \
  --cert /etc/prometheus/pki/client.crt \
  --key /etc/prometheus/pki/client.key \
  https://metrics.example.net/-/ready
```

A successful handshake followed by HTTP 401 can be legitimate: mTLS may authenticate the transport while the endpoint also requires a bearer token or tenant authorization.

## Check Certificate Time and System Time

Print the leaf validity interval:

```bash
openssl s_client \
  -connect metrics.example.net:443 \
  -servername metrics.example.net \
  </dev/null 2>/dev/null \
  | openssl x509 -noout -dates -subject -issuer
```

Compare it with the clock in the Prometheus runtime:

```bash
date -u
```

Renew expired certificates, fix the certificate issuance window, and synchronize the node clock. Extending Remote Write timeouts will not change x509 validity.

## Verify TLS Version Policy

Prometheus's current TLS configuration accepts `TLS10`, `TLS11`, `TLS12`, and `TLS13` as names for explicit bounds. The documented default minimum is TLS 1.2 and the Go default maximum is TLS 1.3.

A secure explicit policy can be written as:

```yaml
tls_config:
  ca_file: /etc/prometheus/pki/metrics-ca.pem
  min_version: TLS12
  max_version: TLS13
```

If an obsolete endpoint only supports TLS 1.0 or 1.1, upgrade the endpoint rather than lowering the monitoring client's security policy. If a middlebox breaks TLS 1.3, confirm that with a controlled `openssl s_client -tls1_2` comparison and fix or update the middlebox.

## Trace Every TLS Termination Hop

A typical path may contain two independent TLS connections:

```text
Prometheus -> ingress or load balancer -> receiver
```

The first hop uses Prometheus's `tls_config`. The second hop uses the ingress's upstream TLS configuration. If Prometheus receives a valid public certificate but the ingress logs `x509: certificate signed by unknown authority` for its upstream, changing the Prometheus CA cannot fix the second hop.

For each hop record:

1. the DNS name and resolved address;
2. the TLS server name;
3. the presented leaf and intermediates;
4. the trusted CA bundle;
5. whether a client certificate is required;
6. the permitted TLS versions.

Also confirm scheme and port. `https://receiver:9090` fails if port 9090 is plain HTTP, while `http://receiver:443` sends plaintext to a TLS listener.

## Do Not Leave Verification Disabled

Prometheus supports:

```yaml
tls_config:
  insecure_skip_verify: true
```

This disables server-certificate validation and makes the connection vulnerable to impersonation. It can briefly separate a trust/name problem from a network problem in an isolated diagnostic environment, but it is not a production fix. Install the correct CA and use a certificate with the correct SAN instead.

## Verify Recovery

Validate the configuration before reloading it:

```bash
promtool check config /etc/prometheus/prometheus.yml
```

Then check:

```promql
rate(prometheus_remote_storage_samples_retried_total{remote_name="central"}[5m])
```

```promql
prometheus_remote_storage_samples_pending{remote_name="central"}
```

```promql
prometheus_remote_storage_queue_highest_timestamp_seconds{remote_name="central"}
-
prometheus_remote_storage_queue_highest_sent_timestamp_seconds{remote_name="central"}
```

TLS failures are retriable transport errors, so the queue may drain after trust is repaired if the WAL still contains the unsent samples. Confirm current data at the receiver and check whether the outage exceeded the sender's recoverable WAL window.

## Official Documentation

- [Prometheus TLS client configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#tls_config)
- [Prometheus Remote Write configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus HTTPS and authentication guide](https://prometheus.io/docs/prometheus/latest/configuration/https/)
- [Prometheus exporter-toolkit web TLS configuration](https://github.com/prometheus/exporter-toolkit/blob/master/docs/web-configuration.md)
- [Prometheus Remote Write tuning and WAL behavior](https://prometheus.io/docs/practices/remote_write/)
- [Go certificate verification API](https://pkg.go.dev/crypto/x509#Certificate.VerifyHostname)
- [Go TLS configuration](https://pkg.go.dev/crypto/tls#Config)
