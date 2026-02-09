# How to Create Prometheus Alerts for Kubernetes Certificate Expiration Using x509 Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Kubernetes, Security

Description: Learn how to configure Prometheus to monitor Kubernetes certificate expiration using x509 exporter metrics and create proactive alerts to prevent certificate-related outages in your cluster.

---

Certificate expiration is one of those silent killers in Kubernetes clusters. Your cluster runs smoothly until one day, when a critical certificate expires, and suddenly your API server is unreachable, pods can't communicate, or authentication breaks down. Setting up proper certificate monitoring prevents these painful incidents.

The x509 certificate exporter provides detailed metrics about certificate validity periods, making it the perfect tool for tracking certificate expiration across your Kubernetes infrastructure. This guide walks you through implementing comprehensive certificate monitoring with Prometheus alerts.

## Understanding x509 Certificate Metrics

The x509 certificate exporter exposes several key metrics that help you monitor certificate health:

- `x509_cert_not_after` - The Unix timestamp when the certificate expires
- `x509_cert_not_before` - The Unix timestamp when the certificate becomes valid
- `x509_read_errors` - Counter for certificate read errors
- `x509_cert_expired` - Binary metric indicating if a certificate has expired

These metrics form the foundation for building robust certificate monitoring.

## Deploying the x509 Certificate Exporter

First, deploy the x509 certificate exporter in your Kubernetes cluster. Create a deployment that monitors your certificate files:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: x509-certificate-exporter
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: x509-certificate-exporter
  template:
    metadata:
      labels:
        app: x509-certificate-exporter
    spec:
      containers:
      - name: x509-certificate-exporter
        image: enix/x509-certificate-exporter:3.6.0
        args:
        - --watch-dir=/var/run/secrets/kubernetes.io/serviceaccount
        - --watch-kubeconf=/home/kubeconf/.kube/config
        - --trim-path-components=3
        - --port=9793
        ports:
        - containerPort: 9793
          name: metrics
        volumeMounts:
        - name: kubeconfig
          mountPath: /home/kubeconf/.kube
          readOnly: true
      volumes:
      - name: kubeconfig
        secret:
          secretName: kubeconfig
---
apiVersion: v1
kind: Service
metadata:
  name: x509-certificate-exporter
  namespace: monitoring
  labels:
    app: x509-certificate-exporter
spec:
  ports:
  - port: 9793
    name: metrics
  selector:
    app: x509-certificate-exporter
```

This deployment monitors certificates in the service account directory and any kubeconfig files you specify.

## Configuring Prometheus to Scrape Certificate Metrics

Add a scrape configuration to your Prometheus setup to collect x509 metrics:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    scrape_configs:
    - job_name: 'x509-certificate-exporter'
      static_configs:
      - targets: ['x509-certificate-exporter.monitoring.svc.cluster.local:9793']
      metric_relabel_configs:
      # Add cluster label for multi-cluster setups
      - source_labels: [__address__]
        target_label: cluster
        replacement: production
```

This configuration ensures Prometheus scrapes certificate metrics every 30 seconds (default interval).

## Creating Certificate Expiration Alerts

Now comes the critical part - setting up alerts. Create a PrometheusRule resource with comprehensive certificate monitoring:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: certificate-expiration-alerts
  namespace: monitoring
spec:
  groups:
  - name: certificates
    interval: 30s
    rules:
    # Alert when certificates expire within 30 days
    - alert: CertificateExpiringIn30Days
      expr: |
        (x509_cert_not_after - time()) / 86400 < 30
      for: 1h
      labels:
        severity: warning
        component: security
      annotations:
        summary: "Certificate {{ $labels.filename }} expiring soon"
        description: "Certificate {{ $labels.filename }} will expire in {{ $value | humanizeDuration }}. Renew it before it causes service disruption."

    # Critical alert for certificates expiring within 7 days
    - alert: CertificateExpiringIn7Days
      expr: |
        (x509_cert_not_after - time()) / 86400 < 7
      for: 30m
      labels:
        severity: critical
        component: security
      annotations:
        summary: "CRITICAL: Certificate {{ $labels.filename }} expiring very soon"
        description: "Certificate {{ $labels.filename }} expires in {{ $value | humanizeDuration }}. IMMEDIATE ACTION REQUIRED."

    # Alert for already expired certificates
    - alert: CertificateExpired
      expr: |
        x509_cert_expired == 1
      for: 5m
      labels:
        severity: critical
        component: security
      annotations:
        summary: "Certificate {{ $labels.filename }} has EXPIRED"
        description: "Certificate {{ $labels.filename }} expired on {{ $labels.not_after }}. Services may be failing."

    # Alert for certificate read errors
    - alert: CertificateReadErrors
      expr: |
        rate(x509_read_errors[5m]) > 0
      for: 10m
      labels:
        severity: warning
        component: security
      annotations:
        summary: "Certificate read errors detected"
        description: "Certificate exporter is encountering read errors. Check certificate file permissions and validity."
```

These alert rules create a tiered warning system. You get early warnings at 30 days, urgent notifications at 7 days, and critical alerts for expired certificates.

## Advanced Certificate Monitoring Patterns

For production environments, implement more sophisticated monitoring:

```yaml
# Alert on certificates that expire within different timeframes by type
- alert: APIServerCertificateExpiringSoon
  expr: |
    (x509_cert_not_after{filename=~".*apiserver.*"} - time()) / 86400 < 60
  for: 1h
  labels:
    severity: warning
    component: control-plane
  annotations:
    summary: "API Server certificate expiring in {{ $value }} days"
    description: "Critical API server certificate {{ $labels.filename }} expires soon. Plan rotation carefully."

# Monitor kubelet certificates separately
- alert: KubeletCertificateExpiring
  expr: |
    (x509_cert_not_after{filename=~".*kubelet.*"} - time()) / 86400 < 30
  for: 1h
  labels:
    severity: warning
    component: node
  annotations:
    summary: "Kubelet certificate expiring on {{ $labels.instance }}"
    description: "Node {{ $labels.instance }} kubelet certificate expires in {{ $value }} days."

# Alert on certificate chain issues
- alert: CertificateChainNearExpiry
  expr: |
    min by (filename) ((x509_cert_not_after - time()) / 86400) < 30
  for: 2h
  labels:
    severity: warning
  annotations:
    summary: "Certificate chain component expiring"
    description: "Part of certificate chain {{ $labels.filename }} expires in {{ $value }} days."
```

## Monitoring Ingress and Service Mesh Certificates

Don't forget about certificates outside the control plane. Monitor ingress controller and service mesh certificates:

```yaml
- alert: IngressTLSCertificateExpiring
  expr: |
    (x509_cert_not_after{filename=~".*ingress.*|.*tls.*"} - time()) / 86400 < 14
  for: 1h
  labels:
    severity: warning
    component: ingress
  annotations:
    summary: "Ingress TLS certificate expiring soon"
    description: "Ingress certificate {{ $labels.filename }} expires in {{ $value }} days. Update it to prevent HTTPS failures."

- alert: ServiceMeshCertificateExpiring
  expr: |
    (x509_cert_not_after{filename=~".*istio.*|.*linkerd.*"} - time()) / 86400 < 21
  for: 1h
  labels:
    severity: warning
    component: service-mesh
  annotations:
    summary: "Service mesh certificate expiring"
    description: "Service mesh certificate {{ $labels.filename }} expires in {{ $value }} days. Plan rotation to avoid mTLS failures."
```

## Setting Up Dashboard Visualization

Create a Grafana dashboard to visualize certificate expiration timelines. Use this PromQL query to show days until expiration:

```promql
# Days until certificate expires
(x509_cert_not_after - time()) / 86400

# Certificates expiring within 90 days
sort_desc((x509_cert_not_after - time()) / 86400 < 90)

# Group certificates by expiration window
count by (le) (
  label_replace(
    (x509_cert_not_after - time()) / 86400,
    "le",
    "$1",
    "le",
    "(.*)"
  )
)
```

## Automating Certificate Rotation

While monitoring is critical, the ultimate goal is automated rotation. Use cert-manager for automatic certificate renewal:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: example-com-tls
  namespace: default
spec:
  secretName: example-com-tls
  duration: 2160h  # 90 days
  renewBefore: 720h  # Renew 30 days before expiration
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - example.com
  - www.example.com
```

Cert-manager integrates with the x509 exporter, so your Prometheus alerts work alongside automated renewal.

## Testing Your Alert Rules

Before relying on these alerts in production, test them thoroughly:

```bash
# Check if Prometheus is scraping x509 metrics
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Visit http://localhost:9090/targets

# Query certificate metrics directly
curl http://localhost:9090/api/v1/query?query=x509_cert_not_after

# Test alert rules
promtool test rules /path/to/certificate-alerts.yaml
```

## Conclusion

Certificate expiration monitoring using x509 metrics and Prometheus provides the safety net your Kubernetes cluster needs. The combination of early warning alerts, critical notifications, and certificate-specific monitoring prevents the dreaded "certificate expired" outages that plague production systems.

Start with basic expiration alerts, then expand to cover specific certificate types. Combine monitoring with automated rotation using cert-manager for a comprehensive certificate management strategy. Your future self will thank you when these alerts catch an expiring certificate before it takes down production.
