# How to Configure Egress Policies for Compliance Requirements

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Egress, Compliance, Security, Audit, Service Mesh

Description: How to configure Istio egress policies that meet compliance requirements like PCI DSS, SOC 2, HIPAA, and GDPR for controlling outbound network traffic.

---

Compliance frameworks like PCI DSS, SOC 2, HIPAA, and GDPR all have requirements around controlling and monitoring outbound network traffic. If you are running workloads in an Istio service mesh, the mesh gives you powerful tools to enforce these requirements. But knowing which Istio features map to which compliance controls takes some work.

This guide connects specific compliance requirements to concrete Istio configurations.

## Common Compliance Requirements for Egress

While each framework has its own language, the egress-related requirements boil down to a few common themes:

1. **Restrict outbound traffic** to only what is necessary (principle of least privilege)
2. **Log all outbound connections** for audit purposes
3. **Encrypt traffic** in transit
4. **Monitor for unauthorized outbound access** and alert on anomalies
5. **Maintain an inventory** of external service connections
6. **Enforce segmentation** so different workloads have different levels of external access

## Requirement 1: Restrict Outbound Traffic

PCI DSS Requirement 1.3.4 states you should not allow unauthorized outbound traffic. SOC 2 CC6.1 requires logical access controls. The Istio implementation:

### Enable REGISTRY_ONLY Mode

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
```

### Create Explicit Allow Lists

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: approved-external-services
  namespace: payment-processing
  labels:
    compliance: pci-dss
    approved-by: security-team
    approval-date: "2026-01-15"
spec:
  hosts:
  - "api.stripe.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
  exportTo:
  - "."
```

Adding labels like `compliance`, `approved-by`, and `approval-date` creates a paper trail directly in the Kubernetes resource. Auditors can query these:

```bash
kubectl get serviceentry --all-namespaces -l compliance=pci-dss
```

### Enforce with NetworkPolicy as Backup

Defense in depth. Don't rely solely on Istio:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: pci-egress-restriction
  namespace: payment-processing
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector: {}
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: istio-system
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
    ports:
    - port: 53
      protocol: UDP
```

## Requirement 2: Log All Outbound Connections

SOC 2 CC7.2 and PCI DSS Requirement 10 require logging of all access to network resources. HIPAA requires audit controls.

### Enable Comprehensive Access Logging

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: compliance-logging
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: envoy
```

### Route All Egress Through a Gateway for Centralized Logging

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stripe-api
  namespace: payment-processing
spec:
  hosts:
  - "api.stripe.com"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: compliance-egress
  namespace: istio-system
spec:
  selector:
    istio: egressgateway
  servers:
  - port:
      number: 443
      name: tls
      protocol: TLS
    hosts:
    - "api.stripe.com"
    tls:
      mode: PASSTHROUGH
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: stripe-via-egress
  namespace: payment-processing
spec:
  hosts:
  - "api.stripe.com"
  gateways:
  - istio-system/compliance-egress
  - mesh
  tls:
  - match:
    - gateways:
      - mesh
      port: 443
      sniHosts:
      - "api.stripe.com"
    route:
    - destination:
        host: istio-egressgateway.istio-system.svc.cluster.local
        port:
          number: 443
  - match:
    - gateways:
      - istio-system/compliance-egress
      port: 443
      sniHosts:
      - "api.stripe.com"
    route:
    - destination:
        host: api.stripe.com
        port:
          number: 443
```

The egress gateway logs provide a single audit point for all outbound traffic:

```bash
kubectl logs -n istio-system deploy/istio-egressgateway --tail=100
```

### Export Logs to a SIEM

Forward egress gateway logs to your SIEM (Splunk, Elasticsearch, etc.) for long-term retention. Use Fluentd or Fluent Bit:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
data:
  fluent-bit.conf: |
    [INPUT]
        Name              tail
        Path              /var/log/containers/istio-egressgateway*.log
        Parser            docker
        Tag               egress.*

    [OUTPUT]
        Name              es
        Match             egress.*
        Host              elasticsearch.logging.svc.cluster.local
        Port              9200
        Index             istio-egress-audit
```

## Requirement 3: Encrypt Traffic in Transit

PCI DSS Requirement 4.1 requires encryption of data in transit. HIPAA requires encryption of PHI in transit. GDPR Article 32 requires appropriate technical measures.

### Enforce mTLS Within the Mesh

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

### TLS for External Connections

Use TLS origination at the egress gateway for external services:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: stripe-tls
spec:
  host: api.stripe.com
  trafficPolicy:
    portLevelSettings:
    - port:
        number: 443
      tls:
        mode: SIMPLE
        sni: api.stripe.com
```

This ensures traffic is encrypted from the mesh to the external service. Combined with mesh-internal mTLS, data is encrypted at every hop.

## Requirement 4: Monitor for Unauthorized Access

SOC 2 CC7.3 requires detection of unauthorized activities. Set up Prometheus alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: compliance-egress-alerts
  namespace: istio-system
spec:
  groups:
  - name: compliance-egress
    rules:
    - alert: UnauthorizedEgressAttempt
      expr: |
        sum(rate(istio_requests_total{
          response_code="502",
          reporter="source"
        }[5m])) by (source_workload, source_workload_namespace) > 0
      for: 1m
      labels:
        severity: critical
        compliance: true
      annotations:
        summary: "Workload {{ $labels.source_workload }} in {{ $labels.source_workload_namespace }} attempted unauthorized egress"

    - alert: NewExternalServiceAccessed
      expr: |
        count(count by (destination_service_name) (
          istio_requests_total{
            reporter="source",
            destination_service_namespace!~"default|kube-system|istio-system"
          }
        )) > count(count by (destination_service_name) (
          istio_requests_total{
            reporter="source",
            destination_service_namespace!~"default|kube-system|istio-system"
          } offset 24h
        ))
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "New external service detected in egress traffic"
```

## Requirement 5: Maintain an External Service Inventory

Use ServiceEntry labels and annotations to maintain a compliance inventory:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stripe-api
  namespace: payment-processing
  labels:
    compliance-scope: pci
    data-classification: cardholder
    business-owner: payments-team
    risk-level: high
  annotations:
    approval-ticket: "SEC-2026-0142"
    last-reviewed: "2026-01-15"
    next-review: "2026-07-15"
spec:
  hosts:
  - "api.stripe.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
  exportTo:
  - "."
```

Generate a compliance report:

```bash
kubectl get serviceentry --all-namespaces -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
HOSTS:.spec.hosts[*],\
SCOPE:.metadata.labels.compliance-scope,\
CLASSIFICATION:.metadata.labels.data-classification,\
OWNER:.metadata.labels.business-owner,\
TICKET:.metadata.annotations.approval-ticket
```

## Requirement 6: Enforce Segmentation

PCI DSS requires network segmentation between cardholder data environments and other networks:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: pci-external
  namespace: pci-scope
spec:
  hosts:
  - "api.stripe.com"
  - "api.paypal.com"
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
  exportTo:
  - "."              # Only visible in pci-scope namespace
```

Non-PCI workloads cannot access these services because the ServiceEntry is scoped to the `pci-scope` namespace.

Use AuthorizationPolicy for additional enforcement:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: pci-egress-only
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: egressgateway
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces:
        - pci-scope
    to:
    - operation:
        hosts:
        - "api.stripe.com"
        - "api.paypal.com"
```

## Audit-Ready Configuration Summary

Here is a checklist for compliance audits:

```bash
# 1. Verify REGISTRY_ONLY mode is active
kubectl get configmap istio -n istio-system -o yaml | grep outboundTrafficPolicy

# 2. List all allowed external services
kubectl get serviceentry --all-namespaces

# 3. Verify mTLS is enforced
kubectl get peerauthentication --all-namespaces

# 4. Check egress gateway is deployed
kubectl get pods -n istio-system -l istio=egressgateway

# 5. Verify access logging is enabled
kubectl get telemetry --all-namespaces

# 6. Check NetworkPolicies are in place
kubectl get networkpolicy --all-namespaces

# 7. Verify AlertManager rules
kubectl get prometheusrule --all-namespaces
```

## Summary

Configuring Istio egress policies for compliance maps directly to common framework requirements. REGISTRY_ONLY mode provides default-deny egress. ServiceEntry resources create auditable allow lists. Egress gateways centralize logging for audit trails. Mesh-wide mTLS and TLS origination ensure encryption in transit. Prometheus alerts detect unauthorized access attempts. And Kubernetes labels and annotations on ServiceEntry resources maintain the external service inventory that auditors ask for. The key is using Istio's native features together to build a compliance posture that is both enforceable and auditable.
