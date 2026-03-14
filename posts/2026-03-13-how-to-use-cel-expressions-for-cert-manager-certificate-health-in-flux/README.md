# How to Use CEL Expressions for Cert-Manager Certificate Health in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, CEL, Cert-Manager, Health Check, Certificates

Description: Learn how to use CEL expressions in Flux to evaluate cert-manager Certificate health status with fine-grained conditions beyond the default Ready check.

---

## Introduction

Cert-manager is one of the most widely used Kubernetes operators for managing TLS certificates. While Flux can health-check cert-manager Certificates using the default `Ready` condition, CEL (Common Expression Language) expressions give you more control over what constitutes a healthy certificate. You can check specific conditions, validate certificate properties, and enforce policies like minimum remaining validity. This guide shows you how to use CEL expressions for comprehensive cert-manager Certificate health checking in Flux.

## Prerequisites

- A Kubernetes cluster running version 1.25 or later
- Flux v2.3 or later installed on the cluster
- Cert-manager v1.12 or later installed
- kubectl configured to access the cluster
- A Git repository connected to Flux via a GitRepository source
- An ACME issuer or other cert-manager issuer configured

## Default Certificate Health Check

Without CEL expressions, Flux checks the standard `Ready` condition:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: certificates
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/certificates
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 10m
  healthChecks:
    - apiVersion: cert-manager.io/v1
      kind: Certificate
      name: wildcard-tls
      namespace: production
```

This works for basic scenarios but does not distinguish between different certificate states or conditions.

## Cert-Manager Certificate Status Structure

A cert-manager Certificate resource has the following status structure that CEL expressions can evaluate:

```yaml
status:
  conditions:
    - type: Ready
      status: "True"
      reason: Ready
      message: Certificate is up to date and has not expired
    - type: Issuing
      status: "False"
      reason: ""
  notBefore: "2026-01-01T00:00:00Z"
  notAfter: "2026-04-01T00:00:00Z"
  renewalTime: "2026-03-01T00:00:00Z"
  revision: 2
```

## Using CEL for Ready Condition

The simplest CEL expression checks the `Ready` condition explicitly:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: certificates
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/certificates
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 10m
  healthChecks:
    - apiVersion: cert-manager.io/v1
      kind: Certificate
      name: wildcard-tls
      namespace: production
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Ready' && c.status == 'True')
```

## Checking Certificate Is Not Currently Issuing

You might want to ensure a certificate is both ready and not in the middle of being re-issued:

```yaml
healthChecks:
  - apiVersion: cert-manager.io/v1
    kind: Certificate
    name: wildcard-tls
    namespace: production
    cel:
      healthyWhen: >-
        status.conditions.exists(c, c.type == 'Ready' && c.status == 'True')
        && !status.conditions.exists(c, c.type == 'Issuing' && c.status == 'True')
```

This expression requires the `Ready` condition to be `True` and the `Issuing` condition to not be `True`.

## Verifying Certificate Revision

If you track certificate rotations, check that the revision is at least a certain value:

```yaml
healthChecks:
  - apiVersion: cert-manager.io/v1
    kind: Certificate
    name: api-tls
    namespace: production
    cel:
      healthyWhen: >-
        status.conditions.exists(c, c.type == 'Ready' && c.status == 'True')
        && has(status.revision)
```

The `has()` function checks that the field exists, confirming the certificate has been issued at least once.

## Health Checking Multiple Certificates

Apply CEL expressions to multiple certificates:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tls-certificates
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/tls
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 15m
  healthChecks:
    - apiVersion: cert-manager.io/v1
      kind: Certificate
      name: frontend-tls
      namespace: production
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Ready' && c.status == 'True')
    - apiVersion: cert-manager.io/v1
      kind: Certificate
      name: api-tls
      namespace: production
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Ready' && c.status == 'True')
    - apiVersion: cert-manager.io/v1
      kind: Certificate
      name: internal-mtls
      namespace: production
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Ready' && c.status == 'True')
```

## Health Checking ClusterIssuers

ClusterIssuers also have status conditions that can be checked with CEL:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: nginx
```

```yaml
healthChecks:
  - apiVersion: cert-manager.io/v1
    kind: ClusterIssuer
    name: letsencrypt-prod
    cel:
      healthyWhen: >-
        status.conditions.exists(c, c.type == 'Ready' && c.status == 'True')
```

## Complete Certificate Pipeline with Dependencies

Set up a full certificate pipeline with health checks at each stage:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/cert-manager
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cluster-issuers
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/issuers
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: cert-manager
  timeout: 5m
  healthChecks:
    - apiVersion: cert-manager.io/v1
      kind: ClusterIssuer
      name: letsencrypt-prod
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Ready' && c.status == 'True')
    - apiVersion: cert-manager.io/v1
      kind: ClusterIssuer
      name: letsencrypt-staging
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Ready' && c.status == 'True')
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: certificates
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/certificates
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: cluster-issuers
  timeout: 10m
  healthChecks:
    - apiVersion: cert-manager.io/v1
      kind: Certificate
      name: wildcard-tls
      namespace: production
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Ready' && c.status == 'True')
```

## Debugging Certificate Health Check Failures

When a certificate health check fails:

```bash
# Check Kustomization status
flux get kustomization certificates

# Check Certificate status
kubectl get certificate wildcard-tls -n production -o yaml

# Check Certificate conditions
kubectl get certificate wildcard-tls -n production -o jsonpath='{.status.conditions}' | jq .

# Check cert-manager logs
kubectl logs -n cert-manager deploy/cert-manager --tail=50

# Check Certificate Request status
kubectl get certificaterequest -n production

# Check Order and Challenge status (for ACME)
kubectl get order -n production
kubectl get challenge -n production
```

Common certificate health check failures:

- ACME account registration failed
- DNS challenge solver not configured
- HTTP challenge solver cannot reach the ingress
- Rate limit exceeded on the ACME server
- Invalid domain name or permissions
- ClusterIssuer not ready

## Conclusion

CEL expressions for cert-manager Certificate health in Flux give you precise control over what constitutes a healthy certificate. Beyond the basic `Ready` condition, you can verify that certificates are not in the process of being re-issued, check for specific revision numbers, and combine multiple conditions. When combined with dependency chains from cert-manager installation through ClusterIssuer setup to Certificate issuance, CEL expressions help build a robust certificate management pipeline in your GitOps workflow.
