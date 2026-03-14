# How to Configure Custom Health Checks for Custom CRDs in Flux Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, Health Check, CRD, Custom Resources, Kustomization

Description: Learn how to configure custom health checks for Custom Resource Definitions and custom resources in Flux Kustomization using CEL expressions and status conditions.

---

## Introduction

Custom Resource Definitions (CRDs) extend the Kubernetes API with new resource types. Operators and controllers that manage these custom resources often expose health status through standard Kubernetes conditions. Flux Kustomization can health check these custom resources if they follow the standard status conventions, and starting with Flux v2.3, you can use CEL (Common Expression Language) expressions to evaluate health for resources with non-standard status formats.

## Prerequisites

- A Kubernetes cluster running version 1.25 or later
- Flux v2.3 or later installed on the cluster
- kubectl configured to access the cluster
- A Git repository connected to Flux via a GitRepository source
- Custom resources deployed through operators (cert-manager, Prometheus, Crossplane, etc.)

## How Flux Evaluates Custom Resource Health

Flux uses a standard approach to determine custom resource health. It looks for a `Ready` condition in the resource's `status.conditions` array. If the condition has `status: "True"`, the resource is healthy. If `status: "False"`, it is unhealthy. If the condition is not present, Flux continues waiting until the timeout.

Many Kubernetes operators follow this convention, making their custom resources automatically compatible with Flux health checks.

## Health Checking Resources with Standard Conditions

For custom resources that follow the standard `Ready` condition pattern, health checks work the same as built-in resources:

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

Cert-manager Certificates have a `Ready` condition that Flux checks automatically:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-tls
  namespace: production
spec:
  secretName: wildcard-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - "*.example.com"
    - "example.com"
```

## Health Checking CRD Installation

Before deploying custom resources, ensure the CRDs themselves are installed. Health check the CRD Kustomization before the resources that depend on them:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager-crds
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/cert-manager/crds
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 2m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/cert-manager/controller
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: cert-manager-crds
  wait: true
  timeout: 5m
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
    - name: cert-manager
  timeout: 10m
  healthChecks:
    - apiVersion: cert-manager.io/v1
      kind: Certificate
      name: wildcard-tls
      namespace: production
```

## Using CEL Expressions for Non-Standard Resources

Some custom resources do not use the standard `Ready` condition. Flux v2.3 introduced CEL expression support for evaluating health of such resources. Use the `spec.healthCheckExprs` field at the spec level (not nested inside `healthChecks` items):

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: crossplane-resources
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/crossplane
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 15m
  healthChecks:
    - apiVersion: database.aws.crossplane.io/v1beta1
      kind: RDSInstance
      name: production-db
      namespace: crossplane-system
  healthCheckExprs:
    - apiVersion: database.aws.crossplane.io/v1beta1
      kind: RDSInstance
      current: >-
        status.conditions.filter(e, e.type == 'Ready').all(e, e.status == 'True')
        && status.conditions.filter(e, e.type == 'Synced').all(e, e.status == 'True')
      failed: >-
        status.conditions.filter(e, e.type == 'Ready').all(e, e.status == 'False')
```

This CEL expression requires both the `Ready` and `Synced` conditions to be `True` before considering the resource healthy.

## Health Checking Prometheus Operator Resources

Prometheus Operator resources like ServiceMonitors and PrometheusRules do not have status conditions by default. You can check them using `wait: true` which verifies they are successfully applied:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: monitoring-rules
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/monitoring/rules
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
```

For the Prometheus resource itself, use a health check since it does have status conditions:

```yaml
healthChecks:
  - apiVersion: monitoring.coreos.com/v1
    kind: Prometheus
    name: main
    namespace: monitoring
```

## Health Checking Sealed Secrets

Sealed Secrets expose a `Synced` condition. Use a CEL expression to check it via `spec.healthCheckExprs`:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: sealed-secrets
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/secrets
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 5m
  healthChecks:
    - apiVersion: bitnami.com/v1alpha1
      kind: SealedSecret
      name: database-credentials
      namespace: production
  healthCheckExprs:
    - apiVersion: bitnami.com/v1alpha1
      kind: SealedSecret
      current: >-
        status.conditions.filter(e, e.type == 'Synced').all(e, e.status == 'True')
      failed: >-
        status.conditions.filter(e, e.type == 'Synced').all(e, e.status == 'False')
```

## Multiple Custom Resources

Check multiple custom resources across different APIs:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: platform-resources
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/platform
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 15m
  healthChecks:
    - apiVersion: cert-manager.io/v1
      kind: Certificate
      name: api-tls
      namespace: production
    - apiVersion: cert-manager.io/v1
      kind: ClusterIssuer
      name: letsencrypt-prod
    - apiVersion: externaldns.k8s.io/v1alpha1
      kind: DNSEndpoint
      name: api-dns
      namespace: production
    - apiVersion: monitoring.coreos.com/v1
      kind: Prometheus
      name: main
      namespace: monitoring
```

## Debugging Custom Resource Health Check Failures

When a custom resource health check fails:

```bash
# Check Kustomization status
flux get kustomization certificates

# Check the custom resource status
kubectl get certificate wildcard-tls -n production -o yaml

# Check conditions specifically
kubectl get certificate wildcard-tls -n production -o jsonpath='{.status.conditions}' | jq .

# Check the operator controller logs
kubectl logs -n cert-manager deploy/cert-manager --tail=50

# Check events
kubectl get events -n production --field-selector involvedObject.name=wildcard-tls
```

Common custom resource health check failure causes:

- The operator controller is not installed or not running
- CRDs are not installed (resource type not recognized)
- The operator failed to reconcile the resource (check operator logs)
- The resource's status does not follow the standard `Ready` condition pattern (use CEL expressions)
- Dependencies of the custom resource are not met (external services, credentials)

## Conclusion

Custom health checks for CRDs in Flux Kustomization extend your GitOps health monitoring to cover operator-managed resources like certificates, database instances, and monitoring configurations. Resources that follow the standard `Ready` condition pattern work automatically with Flux health checks. For resources with non-standard status formats, CEL expressions provide a flexible way to define exactly what constitutes a healthy state. Combined with dependency chains that ensure CRDs and operators are installed before custom resources are created, you get a comprehensive health checking pipeline for your entire platform.
