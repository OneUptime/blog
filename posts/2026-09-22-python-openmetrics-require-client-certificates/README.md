# How to Require Client Certificates on a Python OpenMetrics Endpoint

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Prometheus, TLS, Security

Description: Require mutual TLS on the Python metrics server, configure Prometheus client credentials, and verify both successful and rejected scrapes.

Enabling HTTPS protects a metrics response in transit. It does not by itself require the scraper to present a certificate. Python's Prometheus client exposes a separate `client_auth_required` setting for that requirement.

This walkthrough uses `prometheus-client` 0.26.0. OpenMetrics negotiation remains an HTTP concern after the TLS handshake succeeds; a failed handshake will never reach the metric serializer.

## Prepare the two trust relationships

The exporter needs its server certificate and private key, plus the CA certificates allowed to issue scraper identities. Prometheus needs its own client certificate and key, plus the CA certificates that authenticate the exporter.

Use your existing certificate authority to provision:

| File | Used by | Purpose |
|---|---|---|
| `exporter-fullchain.pem` | Exporter | Server leaf and intermediate certificates |
| `exporter-key.pem` | Exporter | Private key matching the server leaf |
| `scraper-client-ca.pem` | Exporter | Trust roots for permitted client certificates |
| `prometheus-fullchain.pem` | Prometheus | Client leaf and intermediate certificates |
| `prometheus-key.pem` | Prometheus | Private key matching the client leaf |
| `exporter-server-ca.pem` | Prometheus | Trust roots for the exporter certificate |

The server certificate must cover `metrics.internal.example` in its subject alternative names. Where your PKI specifies extended key usage, issue server-authentication and client-authentication certificates for the respective roles. Keep the two CA bundles distinct if they represent different trust domains, and grant each process read access only to the keys it needs.

## Start an endpoint that requires client authentication

Save `exporter.py`:

```python
import ssl
import threading

from prometheus_client import CollectorRegistry, Gauge, start_http_server

registry = CollectorRegistry()
ready = Gauge("inventory_ready", "Inventory is ready", registry=registry)
ready.set(1)

if __name__ == "__main__":
    start_http_server(
        9443,
        addr="0.0.0.0",
        registry=registry,
        certfile="/etc/metrics-tls/exporter-fullchain.pem",
        keyfile="/etc/metrics-tls/exporter-key.pem",
        client_cafile="/etc/metrics-tls/scraper-client-ca.pem",
        client_auth_required=True,
        tls_min_version=ssl.TLSVersion.TLSv1_2,
    )
    threading.Event().wait()
```

The [Python HTTP/HTTPS documentation](https://prometheus.github.io/client_python/exporting/http/) describes these server options. Supplying a client CA without enabling the requirement is insufficient. The [client implementation](https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/exposition.py) sets `ssl.CERT_REQUIRED` when `client_auth_required` is true.

Certificate-chain validation is not an application identity allowlist. The built-in server does not map an individual client subject or SAN to a per-user metrics policy. A dedicated client CA can restrict issuance; use an authorizing reverse proxy when you need finer identity rules. Python's [SSL verification documentation](https://docs.python.org/3/library/ssl.html#ssl.CERT_REQUIRED) distinguishes certificate validation from hostname checking.

## Give Prometheus its client identity

Use paths visible inside the Prometheus process or container:

```yaml
scrape_configs:
  - job_name: inventory-mtls
    scheme: https
    metrics_path: /metrics
    static_configs:
      - targets: ['metrics.internal.example:9443']
    tls_config:
      ca_file: /etc/prometheus/tls/exporter-server-ca.pem
      cert_file: /etc/prometheus/tls/prometheus-fullchain.pem
      key_file: /etc/prometheus/tls/prometheus-key.pem
      min_version: TLS12
```

Prometheus verifies the server name using the target hostname. If the connection address must be an IP while the certificate names a DNS host, configure `server_name` to that intended identity. Do not replace verification with `insecure_skip_verify`. These fields are defined in the [Prometheus TLS configuration](https://prometheus.io/docs/prometheus/3.13/configuration/configuration/#tls_config).

## Test authentication and OpenMetrics separately

Run this from a machine allowed to reach the listener, substituting the actual certificate paths:

```bash
curl --fail --silent --show-error \
  --cacert exporter-server-ca.pem \
  --cert prometheus-fullchain.pem --key prometheus-key.pem \
  -H 'Accept: application/openmetrics-text; version=1.0.0' \
  -D response.headers \
  https://metrics.internal.example:9443/metrics
```

Expect `inventory_ready 1.0`, an OpenMetrics content type, and `# EOF`. Repeat without `--cert` and `--key`; the request must fail. Also test a certificate issued by an unrelated CA. A successful request without a client certificate means you reached another listener or a proxy that terminates TLS without enforcing the same requirement.

For failures, distinguish server trust errors reported by curl from client-certificate rejection reported during the handshake. Check certificate dates, intermediate chains, matching keys, and whether mounted files are readable by the service account. A plaintext request to port 9443 is not a useful HTTP-level test.

Plan certificate rotation as part of deployment. The Python server loads its TLS context when it starts; replacing PEM files alone does not refresh that context. Restart or recreate the listener after updating credentials, and verify both positive and negative cases again. In a redundant deployment, rotate instances sequentially so Prometheus continues receiving metrics during the change.
