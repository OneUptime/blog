# Using Operator Prometheus TLS Configuration in Cilium Observability

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Observability, Prometheus, TLS, Operator, Security

Description: Configure TLS encryption for Prometheus metric scraping from the Cilium Operator to protect sensitive metrics data in transit and meet security compliance requirements.

---

## Introduction

The Cilium Operator exposes Prometheus metrics that include sensitive operational data - policy enforcement statistics, endpoint counts, identity information, and cluster topology details. In environments with strict security requirements, these metrics must be encrypted in transit using TLS to prevent eavesdropping and tampering.

Configuring TLS for the Operator's Prometheus endpoint involves certificate management, Cilium Helm value configuration, and Prometheus scraper updates. This guide covers the complete setup process.

## Prerequisites

- Kubernetes cluster with Cilium installed
- Prometheus Operator or standalone Prometheus
- cert-manager installed (recommended for certificate management)
- `kubectl` and `helm` CLI tools
- Understanding of TLS certificate chains

## Generating TLS Certificates

Use cert-manager to create certificates for the Cilium Operator metrics endpoint:

```yaml
# cilium-operator-metrics-cert.yaml

apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: cilium-operator-metrics-tls
  namespace: kube-system
spec:
  secretName: cilium-operator-metrics-tls
  duration: 8760h # 1 year
  renewBefore: 720h # 30 days
  issuerRef:
    name: cluster-issuer
    kind: ClusterIssuer
  dnsNames:
    - cilium-operator.kube-system.svc
    - cilium-operator.kube-system.svc.cluster.local
  usages:
    - server auth
```

```bash
# Apply the certificate
kubectl apply -f cilium-operator-metrics-cert.yaml

# Verify the certificate was issued
kubectl get certificate -n kube-system cilium-operator-metrics-tls
kubectl get secret -n kube-system cilium-operator-metrics-tls
```

If not using cert-manager, generate certificates manually:

```bash
# Generate CA key and certificate
openssl genrsa -out ca.key 4096
openssl req -new -x509 -key ca.key -out ca.crt -days 365 -subj "/CN=Cilium Metrics CA"

# Generate operator metrics key and CSR
openssl genrsa -out operator-metrics.key 4096
openssl req -new -key operator-metrics.key -out operator-metrics.csr \
    -subj "/CN=cilium-operator.kube-system.svc"

# Sign the certificate
openssl x509 -req -in operator-metrics.csr -CA ca.crt -CAkey ca.key \
    -CAcreateserial -out operator-metrics.crt -days 365 \
    -extfile <(printf "subjectAltName=DNS:cilium-operator.kube-system.svc,DNS:cilium-operator.kube-system.svc.cluster.local\nextendedKeyUsage=serverAuth\n")

# Create Kubernetes secret with the keys Cilium and Prometheus need
kubectl create secret generic cilium-operator-metrics-tls \
    --from-file=tls.crt=operator-metrics.crt \
    --from-file=tls.key=operator-metrics.key \
    --from-file=ca.crt=ca.crt \
    -n kube-system
```

## Configuring the Cilium Operator for TLS

Update the Cilium Helm values to enable TLS on the Operator metrics endpoint:

```yaml
# cilium-values-tls.yaml
operator:
  prometheus:
    enabled: true
    metricsService: true
    port: 9963
    serviceMonitor:
      enabled: false
    tls:
      enabled: true
      server:
        existingSecret: cilium-operator-metrics-tls
```

```bash
# Upgrade Cilium with TLS configuration
helm upgrade cilium cilium/cilium \
    --namespace kube-system \
    --reuse-values \
    -f cilium-values-tls.yaml
```

```mermaid
flowchart LR
    A[Prometheus] -->|TLS| B[Cilium Operator :9963]
    B --> C[cert-manager]
    C --> D[TLS Certificate Secret]
    D --> B
    A --> E[CA Certificate]
    E --> F[Trust Validation]
```

## Configuring Prometheus for TLS Scraping

Update Prometheus to use TLS when scraping the Cilium Operator:

```yaml
# operator-servicemonitor-tls.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cilium-operator
  namespace: kube-system
spec:
  selector:
    matchLabels:
      io.cilium/app: operator
      name: cilium-operator
  namespaceSelector:
    matchNames:
      - kube-system
  endpoints:
    - port: metrics
      interval: 30s
      scheme: https
      tlsConfig:
        ca:
          secret:
            name: cilium-operator-metrics-tls
            key: ca.crt
        serverName: cilium-operator.kube-system.svc
        insecureSkipVerify: false
```

```bash
kubectl apply -f operator-servicemonitor-tls.yaml
```

For standalone Prometheus, update the scrape config:

```yaml
# prometheus.yml addition
scrape_configs:
  - job_name: cilium-operator
    scheme: https
    tls_config:
      ca_file: /etc/prometheus/cilium-ca.crt
      server_name: cilium-operator.kube-system.svc
    kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names:
            - kube-system
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_label_name]
        action: keep
        regex: cilium-operator
      - source_labels: [__meta_kubernetes_endpoint_port_name]
        action: keep
        regex: metrics
```

## Verifying TLS Configuration

Test the TLS connection:

```bash
# Export the CA certificate for local verification
kubectl get secret -n kube-system cilium-operator-metrics-tls \
    -o jsonpath='{.data.ca\.crt}' | base64 -d > ca.crt

# Forward the service locally in another terminal
kubectl -n kube-system port-forward svc/cilium-operator 9963:9963

# Test TLS connection through the port-forward
curl -v --noproxy '*' --cacert ca.crt \
    --resolve cilium-operator.kube-system.svc:9963:127.0.0.1 \
    https://cilium-operator.kube-system.svc:9963/metrics

# Check certificate details through the port-forward
openssl s_client -connect 127.0.0.1:9963 \
    -servername cilium-operator.kube-system.svc -showcerts 2>/dev/null | \
    openssl x509 -noout -text | head -20

# Verify Prometheus is scraping successfully
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job == "cilium-operator") | {health: .health, lastError: .lastError}'
```

## Verification

Confirm the complete TLS setup is working:

```bash
# Check certificate is valid and not expired
kubectl get certificate -n kube-system cilium-operator-metrics-tls -o yaml | grep -A5 "status:"

# Check Prometheus target health
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job | contains("operator")) | .health'

# Verify metrics are flowing
curl -s "http://localhost:9090/api/v1/query?query=up%7Bjob%3D~%22.*cilium-operator.*%22%7D" | jq '.data.result | length'

# Verify the operator was configured to serve metrics with TLS
kubectl get configmap -n kube-system cilium-config \
    -o jsonpath='{.data.operator-prometheus-enable-tls}'
```

## Troubleshooting

**Problem: Prometheus scrape fails with TLS handshake error**
Verify the CA certificate in Prometheus matches the issuer that signed the operator certificate. Check certificate expiry dates.

**Problem: Certificate not found by the operator**
Verify `operator.prometheus.tls.server.existingSecret` matches the Secret name and that the Secret contains `tls.crt` and `tls.key`. Check `kubectl describe pod` for Secret projection or volume mount errors.

**Problem: cert-manager fails to issue certificate**
Check the ClusterIssuer status: `kubectl get clusterissuer -o yaml`. Verify the issuer is ready and has the required CA credentials.

**Problem: Metrics endpoint returns empty response over TLS**
Verify the operator ConfigMap contains `operator-prometheus-enable-tls: "true"` and that the operator pod has rolled after the Helm upgrade. If it has not restarted, delete the operator pod to trigger a restart: `kubectl delete pod -n kube-system -l name=cilium-operator`.

## Conclusion

Configuring TLS for Cilium Operator Prometheus metrics protects sensitive operational data in transit. Using cert-manager for automatic certificate lifecycle management reduces operational overhead. The configuration involves three components: certificate generation, operator TLS configuration through Helm values, and Prometheus scraper TLS configuration through ServiceMonitor or scrape config. Always verify the complete chain from Prometheus through TLS to the operator metrics endpoint after configuration changes.
