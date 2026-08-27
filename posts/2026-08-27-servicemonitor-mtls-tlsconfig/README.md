# How to Scrape an mTLS Metrics Endpoint with ServiceMonitor `tlsConfig`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Prometheus Operator, ServiceMonitor, mTLS, Kubernetes Secrets, TLS

Description: Configure server trust, hostname verification, and a client certificate for mutual-TLS metric scrapes using ServiceMonitor Secret references.

---

Mutual TLS requires both peers to authenticate:

1. Prometheus verifies the metrics server certificate against a trusted CA and hostname.
2. The metrics server verifies the client certificate that Prometheus presents.

In a ServiceMonitor, `scheme: https` enables HTTPS and `tlsConfig` supplies the CA, client certificate, private key, and optional verification name. Each piece has a different purpose; swapping the server CA and client identity is a common failure.

## Prepare the TLS Material

Assume the metrics server certificate is issued by `metrics-server-ca.crt`, while Prometheus has a client identity in `prometheus-client.crt` and `prometheus-client.key`.

Store the public server CA in a ConfigMap:

```bash
kubectl create configmap metrics-server-ca \
  --namespace=monitoring \
  --from-file=ca.crt=metrics-server-ca.crt
```

Store the client certificate and private key in a TLS Secret:

```bash
kubectl create secret tls prometheus-metrics-client \
  --namespace=monitoring \
  --cert=prometheus-client.crt \
  --key=prometheus-client.key
```

The client certificate must be valid for client authentication according to the server's trust policy. The server certificate must be valid for server authentication and contain a name that Prometheus can verify.

Inspect certificate identity and lifetime before installing it:

```bash
openssl x509 -in prometheus-client.crt \
  -noout -subject -issuer -dates -ext extendedKeyUsage
openssl x509 -in metrics-server-ca.crt \
  -noout -subject -issuer -dates
```

Do not store a private key in a ConfigMap. Kubernetes Secrets also require RBAC and encryption-at-rest controls; base64 storage alone is not encryption.

## Configure the ServiceMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: secure-api
  namespace: monitoring
  labels:
    prometheus: platform
spec:
  namespaceSelector:
    matchNames:
      - applications
  selector:
    matchLabels:
      app.kubernetes.io/name: secure-api
  endpoints:
    - port: https-metrics
      scheme: https
      path: /metrics
      tlsConfig:
        ca:
          configMap:
            name: metrics-server-ca
            key: ca.crt
        cert:
          secret:
            name: prometheus-metrics-client
            key: tls.crt
        keySecret:
          name: prometheus-metrics-client
          key: tls.key
        serverName: secure-api.applications.svc
        minVersion: TLS12
```

The fields mean:

- `ca` verifies the server certificate;
- `cert` is the client certificate sent by Prometheus;
- `keySecret` is the matching client private key;
- `serverName` controls SNI and hostname verification;
- `minVersion` rejects older TLS versions.

`minVersion` requires Prometheus 2.35 or newer. The related `maxVersion` field requires Prometheus 2.41 or newer. Confirm the Prometheus version before adding version-gated fields. The accepted values are `TLS10`, `TLS11`, `TLS12`, and `TLS13`.

All referenced Secrets and ConfigMaps belong in the ServiceMonitor's namespace, here `monitoring`, not the selected Service's namespace. The Operator must be able to read them.

## Why `serverName` Often Matters in Kubernetes

ServiceMonitor discovery normally gives Prometheus Pod or endpoint IP addresses. A server certificate, however, is often issued for a Service DNS name such as:

```text
secure-api.applications.svc
```

Without `serverName`, the TLS client can try to verify an endpoint IP against a certificate containing only the DNS name. The handshake then fails with a hostname or IP SAN error. Set `serverName` to a DNS name in the server certificate's Subject Alternative Name extension, and make sure the server presents that certificate on every selected endpoint.

Do not solve a name mismatch with:

```yaml
insecureSkipVerify: true
```

That disables server certificate validation. Encryption without identity verification permits an active attacker to impersonate the target. Use the correct CA and verification name instead.

## Validate the Handshake Independently

From a network location that can reach an endpoint, test all three client-side TLS inputs:

```bash
openssl s_client \
  -connect POD_OR_ENDPOINT_IP:PORT \
  -servername secure-api.applications.svc \
  -verify_hostname secure-api.applications.svc \
  -CAfile metrics-server-ca.crt \
  -cert prometheus-client.crt \
  -key prometheus-client.key \
  -verify_return_error </dev/null
```

This proves the TLS handshake from that test location. It does not prove that NetworkPolicy permits the Prometheus Pods or that the ServiceMonitor has been selected.

Interpret common failures by boundary:

| Error | Likely cause |
| --- | --- |
| `certificate signed by unknown authority` | wrong or incomplete server CA chain |
| certificate valid for another name | wrong `serverName` or server SAN |
| `remote error: tls: certificate required` | client cert not presented |
| `bad certificate` or `unknown ca` from server | server does not trust the client chain or client usage is wrong |
| private key does not match public key | `cert` and `keySecret` are from different identities |
| protocol version error | incompatible TLS min/max settings |
| HTTP `401` or `403` after TLS succeeds | application authorization, not the TLS handshake |

Check ServiceMonitor rejection Events for missing Secret keys or invalid configuration:

```bash
kubectl get events -n monitoring \
  --field-selector=involvedObject.kind=ServiceMonitor,involvedObject.name=secure-api \
  --sort-by=.lastTimestamp
```

Then use Prometheus **Status > Targets** for the error seen by the real scraper.

## Rotate Without Mixing Certificate Generations

A client certificate and private key are a pair. Update both keys atomically in one Secret update. If the server CA is rotating, publish a CA bundle that trusts old and new issuers during the overlap, replace server certificates, and remove the old CA only after all endpoints have moved.

Monitor certificate expiry before rotation. After a Secret or ConfigMap update, verify that the Operator reconciles the generated configuration and that targets stay healthy. A Prometheus Pod restart is normally not the first step; it can hide a bad rotation sequence and create an avoidable gap.

## Official Documentation

- [Prometheus Operator Endpoint API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.Endpoint)
- [Prometheus Operator TLSConfig API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.TLSConfig)
- [Kubernetes TLS Secrets](https://kubernetes.io/docs/concepts/configuration/secret/#tls-secrets)
- [Kubernetes ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Prometheus TLS configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#tls_config)

## Conclusion

An mTLS scrape needs server trust, hostname verification, and a matching client certificate and key. Reference each through `tlsConfig`, set `serverName` when discovery uses endpoint IPs but certificates use Service DNS, and keep verification enabled. Validate TLS independently, then use the real Prometheus target error to separate handshake, authorization, and network failures.
