# How to Implement Dapr Security Baseline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Security, mTLS, Kubernetes, Hardening

Description: A practical guide to establishing a Dapr security baseline covering mTLS configuration, secret management, network policies, and sidecar hardening for production deployments.

---

## What Is a Dapr Security Baseline?

A security baseline is a minimum set of security controls that must be applied to all Dapr deployments. It covers transport security, secret management, access controls, network isolation, and sidecar hardening. Establishing a baseline ensures that security fundamentals are consistently applied across all services and environments.

## Enabling mTLS for Service-to-Service Communication

Dapr enables mTLS by default but verify it is active and configure certificate rotation:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: security-baseline-config
  namespace: production
spec:
  mtls:
    enabled: true
    workloadCertTTL: "24h"
    allowedClockSkew: "15m"
  accessControl:
    defaultAction: deny
    trustDomain: "cluster.local"
    policies:
    - appId: payment-service
      defaultAction: deny
      namespace: production
      operations:
      - name: /payments/*
        httpVerb: ["POST", "GET"]
        action: allow
```

## Using External Secret Stores

Never put secrets in Dapr component metadata directly. Use a secret store component:

```yaml
# First configure the secret store
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault-secretstore
  namespace: production
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.internal:8200"
  - name: skipVerify
    value: "false"
  - name: tlsCACert
    secretKeyRef:
      name: vault-ca-cert
      key: ca.crt
  - name: vaultTokenMountPath
    value: "/var/run/secrets/vault/token"
```

```yaml
# Reference secrets from vault in other components
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: production
spec:
  type: state.redis
  version: v1
  auth:
    secretStore: vault-secretstore
  metadata:
  - name: redisHost
    value: "redis-service:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-credentials
      key: password
```

## Sidecar Resource Limits and Security Context

Apply resource limits and a restricted security context to the Dapr sidecar:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: production
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "my-service"
        dapr.io/sidecar-cpu-limit: "500m"
        dapr.io/sidecar-memory-limit: "256Mi"
        dapr.io/sidecar-cpu-request: "100m"
        dapr.io/sidecar-memory-request: "64Mi"
        dapr.io/disable-builtin-k8s-secret-store: "true"
```

## Network Policies for Dapr Traffic

Restrict network access to only necessary Dapr ports:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dapr-baseline-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: my-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app.kubernetes.io/name: dapr-sidecar
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: dapr-system
    ports:
    - protocol: TCP
      port: 50001
    - protocol: TCP
      port: 6500
```

## Security Baseline Verification Script

```bash
#!/bin/bash
# verify-dapr-security-baseline.sh

echo "=== Checking mTLS Status ==="
kubectl get configuration -A -o json | \
  jq '.items[] | {name: .metadata.name, mtls: .spec.mtls.enabled}'

echo "=== Checking for Components Using Inline Secrets ==="
kubectl get components -A -o json | \
  jq '.items[] | select(.spec.metadata[] | .value? | type == "string" and test("password|key|secret|token"; "i")) |
  {name: .metadata.name, namespace: .metadata.namespace}'

echo "=== Checking Sidecars Without Resource Limits ==="
kubectl get pods -A -o json | \
  jq '.items[] | select(.spec.containers[] | .name == "daprd" and .resources.limits == null) |
  .metadata.name'
```

## Summary

A Dapr security baseline requires enabling mTLS with short-lived certificates, referencing all secrets from an external secret store rather than inline in component definitions, applying CPU and memory limits to sidecar containers, and enforcing network policies that restrict Dapr traffic to authorized ports and peers. Run the baseline verification script regularly and integrate it into CI/CD pipelines to detect security drift before it reaches production.
