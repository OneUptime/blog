# How to Configure Dapr for Compliance Requirements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Compliance, Security, mTLS, Audit, GDPR

Description: Configure Dapr to meet compliance requirements including mTLS encryption, audit logging, secret management, and network policy restrictions for regulated environments.

---

Regulated industries require Dapr deployments to meet specific security and audit requirements. Dapr provides mTLS out of the box, fine-grained access controls, and integrations with secret managers that help satisfy common compliance frameworks like SOC 2, HIPAA, and GDPR.

## Enforcing mTLS for All Service Communication

Dapr enables mTLS by default. Verify it is not disabled in your Configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: default
  namespace: default
spec:
  mtls:
    enabled: true
    workloadCertTTL: "24h"
    allowedClockSkew: "15m"
```

Never set `enabled: false` in production. Rotate certificates regularly by adjusting `workloadCertTTL`.

## Access Control Policies

Restrict which services can call each other using access control lists:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: payment-service-config
spec:
  accessControl:
    defaultAction: deny
    trustDomain: "cluster.local"
    policies:
    - appId: order-service
      defaultAction: allow
      namespace: "production"
      operations:
      - name: /payments/*
        httpVerb: POST
        action: allow
    - appId: audit-service
      defaultAction: allow
      namespace: "production"
      operations:
      - name: /payments/history
        httpVerb: GET
        action: allow
```

## Storing Secrets in HashiCorp Vault

Avoid plaintext secrets in component definitions by using a secrets store:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault-secret-store
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.company.com:8200"
  - name: vaultToken
    secretKeyRef:
      name: vault-token
      key: token
  - name: enginePath
    value: "secret"
```

Reference vault secrets in other components:

```yaml
  - name: redisPassword
    secretKeyRef:
      name: redis-password
      key: password
      store: vault-secret-store
```

## Audit Logging with OpenTelemetry

Configure Dapr to emit audit-relevant traces to your SIEM:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: audit-config
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "http://otel-collector:4317"
      isSecure: false
      protocol: grpc
```

Setting `samplingRate: "1"` captures 100% of traces for full audit trails.

## Network Policies for Dapr Isolation

Restrict traffic to Dapr components using Kubernetes NetworkPolicy:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dapr-system-isolation
  namespace: dapr-system
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          dapr-managed: "true"
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          dapr-managed: "true"
```

## Data Residency with Namespace Scoping

Scope components to specific namespaces to enforce data residency:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: eu-statestore
  namespace: eu-production
spec:
  type: state.redis
  version: v1
  scopes:
  - eu-payment-service
  - eu-user-service
```

Only applications in the `eu-production` namespace with the listed app IDs can use this component.

## Summary

Dapr compliance configurations leverage built-in mTLS, access control lists, external secret store integrations, and namespace scoping to address regulatory requirements. Combined with 100% trace sampling for audit trails and Kubernetes NetworkPolicies for network isolation, Dapr can operate in SOC 2 and HIPAA-compliant environments.
