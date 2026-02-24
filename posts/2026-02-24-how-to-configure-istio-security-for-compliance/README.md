# How to Configure Istio Security for Compliance (PCI DSS, HIPAA)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Compliance, PCI DSS, HIPAA, Security, Service Mesh

Description: How to configure Istio to meet PCI DSS and HIPAA compliance requirements including encryption, access control, logging, and audit trails.

---

Compliance frameworks like PCI DSS and HIPAA have specific technical requirements around encryption, access control, and audit logging. Istio can help you meet many of these requirements at the infrastructure level, which is a huge win because it means you do not have to implement them in every single microservice.

This guide maps specific PCI DSS and HIPAA requirements to Istio configurations. It is not a replacement for working with your compliance team and auditors, but it gives you a solid technical foundation.

## PCI DSS Requirements Mapped to Istio

### Requirement 2: Do Not Use Vendor-Supplied Defaults

Change default passwords and settings. For Istio, this means customizing default configurations:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    # Change default trust domain from cluster.local
    trustDomain: payments.mycompany.com
    # Disable permissive mTLS (default)
    meshMTLS:
      minProtocolVersion: TLSV1_2
```

### Requirement 4: Encrypt Transmission of Cardholder Data

All cardholder data must be encrypted in transit. Strict mTLS covers this:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: pci-strict-mtls
  namespace: cardholder-data
spec:
  mtls:
    mode: STRICT
```

Configure minimum TLS 1.2 (PCI DSS requires this as of version 3.2.1):

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: payment-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: payment-tls
        minProtocolVersion: TLSV1_2
        cipherSuites:
          - ECDHE-ECDSA-AES256-GCM-SHA384
          - ECDHE-RSA-AES256-GCM-SHA384
          - ECDHE-ECDSA-AES128-GCM-SHA256
          - ECDHE-RSA-AES128-GCM-SHA256
      hosts:
        - "payments.example.com"
```

### Requirement 7: Restrict Access to Cardholder Data by Business Need to Know

Only services that need access to cardholder data should have it:

```yaml
# Deny all access by default
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: cardholder-data
spec:
  {}
---
# Only payment processing service can access card data
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-payment-processing
  namespace: cardholder-data
spec:
  selector:
    matchLabels:
      app: card-vault
  rules:
    - from:
        - source:
            principals:
              - "payments.mycompany.com/ns/cardholder-data/sa/payment-processor"
      to:
        - operation:
            methods: ["POST"]
            paths: ["/api/v1/tokenize", "/api/v1/charge"]
```

### Requirement 10: Track and Monitor All Access

Log all access to cardholder data environments:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: pci-audit-logging
  namespace: cardholder-data
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "true"
```

Create a comprehensive audit log configuration:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: audit-all-cardholder-access
  namespace: cardholder-data
spec:
  action: AUDIT
  rules:
    - {}
```

This audits every request entering the cardholder data namespace.

## HIPAA Requirements Mapped to Istio

### Access Control (164.312(a)(1))

Control access to electronic protected health information (ePHI):

```yaml
# Isolate the PHI namespace
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: phi-access-control
  namespace: healthcare-data
spec:
  selector:
    matchLabels:
      app: patient-records
  rules:
    - from:
        - source:
            principals:
              - "healthcare.mycompany.com/ns/healthcare-data/sa/clinical-app"
              - "healthcare.mycompany.com/ns/healthcare-data/sa/billing-app"
      to:
        - operation:
            methods: ["GET", "POST", "PUT"]
```

### Transmission Security (164.312(e)(1))

Encrypt ePHI in transit:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: hipaa-encryption
  namespace: healthcare-data
spec:
  mtls:
    mode: STRICT
```

### Audit Controls (164.312(b))

Record access to ePHI:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: hipaa-audit
  namespace: healthcare-data
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "true"
```

### Person or Entity Authentication (164.312(d))

Verify the identity of entities accessing ePHI. Combine mTLS (service identity) with JWT validation (user identity):

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: user-auth
  namespace: healthcare-data
spec:
  selector:
    matchLabels:
      app: patient-records
  jwtRules:
    - issuer: "https://auth.healthcare.example.com"
      jwksUri: "https://auth.healthcare.example.com/.well-known/jwks.json"
      audiences: ["patient-records-api"]
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-user-auth
  namespace: healthcare-data
spec:
  selector:
    matchLabels:
      app: patient-records
  rules:
    - from:
        - source:
            requestPrincipals: ["https://auth.healthcare.example.com/*"]
      when:
        - key: request.auth.claims[role]
          values: ["clinician", "admin"]
```

## Network Segmentation for Compliance

Both PCI DSS and HIPAA benefit from strong network segmentation:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: isolate-sensitive-data
  namespace: cardholder-data
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              pci-zone: "true"
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              pci-zone: "true"
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - port: 53
          protocol: UDP
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
```

## Certificate Management for Compliance

Compliance frameworks require proper certificate management. Configure certificate rotation and key sizes:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        # Shorter certificate TTL for compliance
        SECRET_TTL: "12h"
  values:
    pilot:
      env:
        # Use stronger key size
        CITADEL_SELF_SIGNED_CA_RSA_KEY_SIZE: "4096"
```

For production compliance environments, use an external CA with proper HSM-backed key storage rather than Istio's self-signed CA.

## Compliance Monitoring Dashboard

Create a monitoring dashboard that tracks compliance-relevant metrics:

```yaml
# Prometheus rules for compliance monitoring
groups:
  - name: compliance-monitoring
    rules:
      - alert: PlaintextTrafficInPCIZone
        expr: istio_requests_total{connection_security_policy="none", destination_workload_namespace="cardholder-data"} > 0
        labels:
          severity: critical
          compliance: pci-dss
        annotations:
          summary: "Unencrypted traffic detected in PCI zone"

      - alert: UnauthorizedPHIAccess
        expr: rate(istio_requests_total{response_code="403", destination_workload_namespace="healthcare-data"}[5m]) > 0
        labels:
          severity: warning
          compliance: hipaa
        annotations:
          summary: "Unauthorized access attempt to PHI detected"

      - alert: MissingMTLS
        expr: count(istio_requests_total{connection_security_policy="none"}) by (destination_workload_namespace) > 0
        labels:
          severity: critical
        annotations:
          summary: "Services communicating without mTLS"
```

## Documenting Compliance Controls

For auditors, document how each Istio configuration maps to compliance requirements:

| Requirement | Istio Control | Resource | Namespace |
|---|---|---|---|
| PCI 4.1 - Encrypt transmissions | Strict mTLS | PeerAuthentication | cardholder-data |
| PCI 7.1 - Limit access | Default deny + allow list | AuthorizationPolicy | cardholder-data |
| PCI 10.1 - Audit trails | Access logging | Telemetry | cardholder-data |
| HIPAA 164.312(a) - Access control | Identity-based AuthZ | AuthorizationPolicy | healthcare-data |
| HIPAA 164.312(b) - Audit controls | Full access logging | Telemetry | healthcare-data |
| HIPAA 164.312(e) - Transmission security | Strict mTLS + TLS 1.2+ | PeerAuthentication + Gateway | healthcare-data |

Export your Istio configuration as evidence for audits:

```bash
# Export all security-related Istio configuration
kubectl get peerauthentication --all-namespaces -o yaml > evidence/peer-auth.yaml
kubectl get authorizationpolicy --all-namespaces -o yaml > evidence/authz-policies.yaml
kubectl get requestauthentication --all-namespaces -o yaml > evidence/request-auth.yaml
kubectl get gateway --all-namespaces -o yaml > evidence/gateways.yaml
kubectl get networkpolicy --all-namespaces -o yaml > evidence/network-policies.yaml
```

Istio does not make you compliant by itself, but it provides the technical controls that compliance frameworks require. The key is mapping those controls to specific requirements, monitoring them continuously, and being able to demonstrate to auditors that they are working correctly.
