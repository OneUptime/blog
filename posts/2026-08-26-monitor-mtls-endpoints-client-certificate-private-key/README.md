# How to Monitor mTLS Endpoints with a Client Certificate and Private Key

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: mTLS, Blackbox Exporter, Prometheus, Client Certificate, TLS, Synthetic Monitoring

Description: Configure a least-privilege client identity for Blackbox Exporter, validate both sides of mTLS, and monitor server and client certificate rotation separately.

---

An mTLS probe must complete two independent trust decisions. The monitor validates the server certificate against its server trust roots, while the server validates the monitor's client certificate against its client-authentication roots. The files may come from different PKIs and have different rotation schedules.

Blackbox Exporter supports the client side with `cert_file` and `key_file`. Its standard TLS expiry metric describes certificates sent by the server, not the local client certificate, so a complete design monitors both.

## Create a Dedicated Monitoring Identity

Issue a client certificate specifically for synthetic monitoring. Give it only the authorization required for a safe health endpoint and avoid reusing an operator, administrator, or workload certificate.

Inspect its intended use and validity:

```bash
openssl x509 -in monitor-client.crt -noout \
  -subject -issuer -serial -dates -purpose -fingerprint -sha256
```

If Extended Key Usage is present, it needs to permit client authentication. Confirm that the key matches the leaf without using an RSA-only modulus check:

```bash
set -o pipefail

cert_public_key=$(
  openssl x509 -in monitor-client.crt -pubkey -noout |
  openssl pkey -pubin -outform DER |
  openssl dgst -sha256
)

key_public_key=$(
  openssl pkey -in monitor-client.key -pubout -outform DER |
  openssl dgst -sha256
)

test "$cert_public_key" = "$key_public_key"
```

Store the unencrypted key only where the exporter can read it, with restrictive filesystem permissions and an encrypted storage layer. Blackbox Exporter needs unattended access; putting an interactive passphrase prompt in the probe path is not workable secret management.

## Prove the Handshake with OpenSSL

Test from the exporter's network before changing its module:

```bash
openssl s_client \
  -connect status.internal.example:443 \
  -servername status.internal.example \
  -verify_hostname status.internal.example \
  -verify_return_error \
  -CAfile server-root-ca.pem \
  -cert monitor-client.crt \
  -key monitor-client.key </dev/null
```

If the server needs client intermediates that are not in `monitor-client.crt`, provide them with OpenSSL's `-cert_chain` for this diagnostic. For Blackbox Exporter, place the client leaf first and its required intermediate certificates after it in `cert_file`; keep the matching private key in `key_file`.

Do not confuse the bundles:

- `ca_file` authenticates the **server** to the monitor.
- `cert_file` and `key_file` authenticate the **monitor** to the server.
- the server's client-CA configuration is managed on the server and is not a Blackbox setting.

## Configure the Blackbox Module

Mount all three files read-only and configure a dedicated module:

```yaml
modules:
  mtls_status_api:
    prober: http
    timeout: 10s
    http:
      method: GET
      valid_status_codes: [200]
      fail_if_not_ssl: true
      tls_config:
        ca_file: /etc/blackbox-exporter/mtls/server-root-ca.pem
        cert_file: /etc/blackbox-exporter/mtls/monitor-client-chain.pem
        key_file: /etc/blackbox-exporter/mtls/monitor-client.key
        server_name: status.internal.example
        insecure_skip_verify: false
```

Use the real hostname target when possible:

```yaml
scrape_configs:
  - job_name: mtls-status-api
    metrics_path: /probe
    params:
      module: [mtls_status_api]
    static_configs:
      - targets:
          - https://status.internal.example/health/mtls
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter.monitoring.svc:9115
```

An explicit `server_name` is useful when the connection is pinned to an IP. For a normal hostname target it is redundant but documents the identity this credential is allowed to contact. Do not set `insecure_skip_verify`; mTLS client authentication does not compensate for failing to authenticate the server.

The configured `ca_file` forms the module's server root pool rather than augmenting system roots. Use a separate module for public targets or build a deliberate combined bundle.

## Distinguish TLS and Application Authorization Failures

A completed mTLS handshake proves that each TLS side accepted the other's certificate policy. The application can still return `401` or `403` because the certificate identity lacks route authorization, a proxy failed to forward authenticated identity, or an allowlist changed.

Keeping `valid_status_codes: [200]` makes those failures visible through `probe_success`. Choose a health endpoint that is read-only, inexpensive, and representative of the authorization path. Do not point a privileged client identity at a state-changing URL.

Enable per-probe debug output only on a protected exporter endpoint. Server TLS logs often provide the more precise reason for client rejection, such as unknown client CA, expired client certificate, unsuitable key usage, or signature-algorithm mismatch.

## Monitor the Client Certificate Separately

`probe_ssl_earliest_cert_expiry` iterates over the server's peer certificates. It does not include `monitor-client-chain.pem`. Export or alert on the client leaf's own deadline:

```bash
if ! openssl x509 \
  -in /etc/blackbox-exporter/mtls/monitor-client-chain.pem \
  -noout -checkend 2592000; then
  echo "monitor client certificate expires within 30 days" >&2
  exit 1
fi
```

Track these signals independently:

- server chain expiry from the Blackbox probe;
- client leaf expiry from the mounted certificate or issuing system;
- `probe_success` for the whole mTLS and HTTP transaction;
- Prometheus `up` for exporter scrape health; and
- scanner or secret-delivery freshness.

A failed mTLS handshake can remove the server-expiry metric, so the `probe_success == 0` alert is mandatory.

## Rotate Without Creating a Blind Spot

Before rotating the client identity, confirm the server trusts the new issuing chain. Where policy allows, overlap old and new client CAs, deploy the new certificate and key atomically, verify successful probes from every exporter replica, and then remove old trust.

Certificate and key files must change as one pair. In Kubernetes, a projected Secret volume is updated eventually, but a `subPath` mount does not receive automated Secret updates. Verify how the deployed Blackbox Exporter version reloads TLS files and trigger a controlled rollout if necessary.

Restrict access to the `/probe` endpoint. Anyone who can select this mTLS module and an arbitrary target can make the exporter initiate authenticated requests from its network position. Use network policy, authentication, fixed discovery, and a client identity whose authorization is minimal.

## Official Documentation

- [Blackbox Exporter TLS configuration](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md#tls_config)
- [Prometheus common client-certificate loading](https://github.com/prometheus/common/blob/main/config/http_config.go)
- [Go `tls.LoadX509KeyPair`](https://pkg.go.dev/crypto/tls#LoadX509KeyPair)
- [OpenSSL `s_client` client-certificate options](https://docs.openssl.org/master/man1/openssl-s_client/)
- [OpenSSL certificate purposes](https://docs.openssl.org/master/man1/openssl-x509/)
- [Kubernetes Secret volume update behavior](https://kubernetes.io/docs/concepts/configuration/secret/#using-secrets-as-files-from-a-pod)

## Conclusion

Give the monitor a dedicated, least-privilege client identity, validate the server with an explicit trust root, and keep SNI and hostname checking enabled. Blackbox Exporter can exercise the full mTLS request, but its peer-expiry metric covers only the server. Monitor the client certificate and secret-delivery path separately, then test both sides during every rotation.
