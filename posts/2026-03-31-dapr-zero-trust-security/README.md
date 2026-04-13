# How to Implement Zero Trust Security with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Security, Zero Trust, mTLS, Access Control

Description: Learn how to implement zero trust security principles with Dapr by combining mTLS, access control lists, secret scoping, and network policies.

---

## Overview

Zero trust security means "never trust, always verify." Every service must authenticate, every connection must be encrypted, and access must be explicitly authorized at multiple layers. Dapr is well positioned for zero trust because it provides mTLS identity, service-level access control, and secrets management out of the box.

## Pillar 1: Cryptographic Identity with mTLS

Every Dapr sidecar receives a SPIFFE X.509 certificate. This is the cryptographic identity used for authentication. Verify mTLS is active:

```bash
dapr mtls -k
```

Ensure short-lived certificates to reduce exposure window:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprsystem
  namespace: dapr-system
spec:
  mtls:
    enabled: true
    workloadCertTTL: "1h"
    allowedClockSkew: "5m"
```

## Pillar 2: Deny by Default with Access Control Lists

Set `defaultAction: deny` on every service and explicitly allow only required callers:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: payment-service-config
  namespace: default
spec:
  accessControl:
    defaultAction: deny
    trustDomain: "cluster.local"
    policies:
    - appId: checkout-service
      defaultAction: deny
      trustDomain: "cluster.local"
      namespace: "default"
      operations:
      - name: /payment/charge
        httpVerb: ["POST"]
        action: allow
```

## Pillar 3: Least Privilege API Access

Restrict which Dapr APIs each service can use:

```yaml
spec:
  api:
    allowed:
    - name: state
      version: v1.0
      protocol: http
    - name: publish
      version: v1.0
      protocol: http
```

A payment service should not need actor or workflow APIs.

## Pillar 4: Secrets are Never Plaintext

All credentials must be referenced from a secret store, never embedded:

```yaml
metadata:
- name: connectionString
  secretKeyRef:
    name: db-secret
    key: connectionString
auth:
  secretStore: kubernetes
```

## Pillar 5: Network Segmentation

Add NetworkPolicies to block all traffic except explicitly required flows:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: zero-trust-baseline
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          dapr.io/sidecar-injected: "true"
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: dapr-system
  - to:
    - podSelector:
        matchLabels:
          dapr.io/sidecar-injected: "true"
```

## Pillar 6: Audit Everything

Enable tracing and JSON logging for all sidecars:

```yaml
annotations:
  dapr.io/log-as-json: "true"
  dapr.io/log-level: "info"
  dapr.io/config: "tracing-config"
```

## Zero Trust Checklist

Run this checklist before going to production:

```bash
# Verify mTLS is on
dapr mtls -k

# Check all configs have defaultAction: deny
kubectl get configurations -A -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.accessControl.defaultAction}{"\n"}{end}'

# Ensure no plaintext secrets in components
kubectl get components -A -o yaml | grep -E "value:.*password|value:.*secret"
```

## Summary

Zero trust with Dapr combines six pillars: cryptographic identity via mTLS, deny-by-default access control lists, least-privilege API allowlists, secret references instead of plaintext values, network segmentation via Kubernetes policies, and comprehensive audit logging. Implementing all six creates a robust security posture that limits blast radius even if a single service is compromised.
