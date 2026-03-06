# How to Use CEL Expressions for Custom CRD Health in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, CEL, CRD, Custom Resource, Health Check, Kubernetes, GitOps, Operator

Description: A practical guide to writing CEL health check expressions for custom CRDs from popular Kubernetes operators in Flux CD Kustomizations.

---

## Introduction

Kubernetes operators extend the platform with Custom Resource Definitions (CRDs) that Flux CD does not natively understand. Without health checks, Flux will apply these resources and immediately consider them healthy, even if the operator has not finished reconciling them. CEL expressions solve this by letting you define health criteria based on the actual status fields of any CRD.

This guide provides ready-to-use CEL health check expressions for popular CRDs from widely used Kubernetes operators.

## Prerequisites

- Flux CD v2.5+ with CEL health check support
- Kubernetes cluster with one or more operators installed
- kubectl access to your cluster

## General Approach to Writing CRD Health Checks

Before writing a CEL expression for any CRD, follow these steps:

### Step 1: Examine the CRD Status

```bash
# Get an existing resource and inspect its status
kubectl get <resource> <name> -n <namespace> -o yaml

# Check what status fields the CRD defines
kubectl get crd <crd-name> -o jsonpath='{.spec.versions[0].schema.openAPIV3Schema.properties.status}'
```

### Step 2: Identify Health Signals

Look for these common patterns in the status:

- **Conditions array**: Most CRDs follow the Kubernetes conditions convention
- **Phase field**: Some use a simple phase string (e.g., "Running", "Ready")
- **observedGeneration**: Indicates the controller has processed the latest spec
- **Ready replicas**: For workload-type CRDs

### Step 3: Write the Expression

Flux uses the `.spec.healthCheckExprs` field for CEL-based health checks on custom resources. Each entry specifies an `apiVersion`, `kind`, and CEL expressions for `current` (healthy) and `failed` (unhealthy) states. The expressions match all resources of that kind managed by the Kustomization.

## Cert-Manager Resources

### Certificate and ClusterIssuer

```yaml
healthCheckExprs:
  # Certificate is ready when issued successfully
  - apiVersion: cert-manager.io/v1
    kind: Certificate
    failed: status.conditions.filter(e, e.type == 'Ready').all(e, e.status == 'False')
    current: status.conditions.filter(e, e.type == 'Ready').all(e, e.status == 'True')
  # ClusterIssuer is healthy when ready to issue certificates
  - apiVersion: cert-manager.io/v1
    kind: ClusterIssuer
    failed: status.conditions.filter(e, e.type == 'Ready').all(e, e.status == 'False')
    current: status.conditions.filter(e, e.type == 'Ready').all(e, e.status == 'True')
```

## Crossplane Resources

### Managed Resources (AWS, GCP, Azure)

```yaml
healthCheckExprs:
  # Crossplane managed resources need both Synced and Ready conditions
  - apiVersion: rds.aws.upbound.io/v1beta1
    kind: Instance
    failed: status.conditions.filter(e, e.type == 'Synced').all(e, e.status == 'False' && e.reason == 'ReconcileError')
    current: status.conditions.filter(e, e.type == 'Ready').all(e, e.status == 'True')
```

### Crossplane Provider

```yaml
healthCheckExprs:
  - apiVersion: pkg.crossplane.io/v1
    kind: Provider
    failed: status.conditions.filter(e, e.type == 'Healthy').all(e, e.status == 'False')
    current: status.conditions.filter(e, e.type == 'Healthy').all(e, e.status == 'True')
```

## Istio Resources

### VirtualService and DestinationRule

```yaml
healthCheckExprs:
  - apiVersion: networking.istio.io/v1
    kind: VirtualService
    failed: status.conditions.filter(e, e.type == 'Reconciled').all(e, e.status == 'False')
    current: status.conditions.filter(e, e.type == 'Reconciled').all(e, e.status == 'True')
  - apiVersion: networking.istio.io/v1
    kind: DestinationRule
    failed: status.conditions.filter(e, e.type == 'Reconciled').all(e, e.status == 'False')
    current: status.conditions.filter(e, e.type == 'Reconciled').all(e, e.status == 'True')
```

## Prometheus Operator Resources

### Prometheus Instance

```yaml
healthCheckExprs:
  - apiVersion: monitoring.coreos.com/v1
    kind: Prometheus
    failed: status.conditions.filter(e, e.type == 'Available').all(e, e.status == 'False')
    current: >-
      status.conditions.filter(e, e.type == 'Available').all(e, e.status == 'True') &&
      status.conditions.filter(e, e.type == 'Reconciled').all(e, e.status == 'True')
```

## Sealed Secrets

```yaml
healthCheckExprs:
  - apiVersion: bitnami.com/v1alpha1
    kind: SealedSecret
    failed: status.conditions.filter(e, e.type == 'Synced').all(e, e.status == 'False')
    current: status.conditions.filter(e, e.type == 'Synced').all(e, e.status == 'True')
```

## Strimzi Kafka Operator

### Kafka Cluster and Topic

```yaml
healthCheckExprs:
  # Kafka cluster is healthy when all components are ready
  - apiVersion: kafka.strimzi.io/v1beta2
    kind: Kafka
    failed: status.conditions.filter(e, e.type == 'Ready').all(e, e.status == 'False')
    current: status.conditions.filter(e, e.type == 'Ready').all(e, e.status == 'True')
  - apiVersion: kafka.strimzi.io/v1beta2
    kind: KafkaTopic
    failed: status.conditions.filter(e, e.type == 'Ready').all(e, e.status == 'False')
    current: status.conditions.filter(e, e.type == 'Ready').all(e, e.status == 'True')
```

## KEDA Scaled Objects

```yaml
healthCheckExprs:
  - apiVersion: keda.sh/v1alpha1
    kind: ScaledObject
    failed: status.conditions.filter(e, e.type == 'Ready').all(e, e.status == 'False')
    current: status.conditions.filter(e, e.type == 'Ready').all(e, e.status == 'True')
```

## Complete Multi-CRD Application Example

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: full-application
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/production
  prune: true
  timeout: 20m
  # Standard health checks for built-in Kubernetes resources
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: web-app
      namespace: app
  # CEL health check expressions for custom resources
  healthCheckExprs:
    # TLS Certificate from cert-manager
    - apiVersion: cert-manager.io/v1
      kind: Certificate
      failed: status.conditions.filter(e, e.type == 'Ready').all(e, e.status == 'False')
      current: status.conditions.filter(e, e.type == 'Ready').all(e, e.status == 'True')
    # Cloud database from Crossplane
    - apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      failed: status.conditions.filter(e, e.type == 'Synced').all(e, e.status == 'False' && e.reason == 'ReconcileError')
      current: status.conditions.filter(e, e.type == 'Ready').all(e, e.status == 'True')
    # Kafka topic from Strimzi
    - apiVersion: kafka.strimzi.io/v1beta2
      kind: KafkaTopic
      failed: status.conditions.filter(e, e.type == 'Ready').all(e, e.status == 'False')
      current: status.conditions.filter(e, e.type == 'Ready').all(e, e.status == 'True')
    # Auto-scaler from KEDA
    - apiVersion: keda.sh/v1alpha1
      kind: ScaledObject
      failed: status.conditions.filter(e, e.type == 'Ready').all(e, e.status == 'False')
      current: status.conditions.filter(e, e.type == 'Ready').all(e, e.status == 'True')
```

## Debugging Custom CRD Health Checks

```bash
# List all status conditions for a custom resource
kubectl get <kind> <name> -n <namespace> \
  -o jsonpath='{.status.conditions[*]}'

# Check if the resource has a status field at all
kubectl get <kind> <name> -n <namespace> \
  -o jsonpath='{.status}'

# View the Flux Kustomization health check failure message
kubectl describe kustomization <name> -n flux-system | grep -A 5 "health check"
```

## Best Practices

### Use Both current and failed Expressions

Define both `current` (healthy) and `failed` (unhealthy) expressions. The `failed` expression provides faster feedback by detecting failure states without waiting for the health check timeout.

### Follow the Conditions Convention

Most well-designed operators use the standard conditions pattern. Check for `Ready`, `Available`, or `Synced` conditions as the primary health signal.

### Separate healthChecks and healthCheckExprs

Use `.spec.healthChecks` for built-in Kubernetes resource types (Deployments, StatefulSets, Services) that Flux already understands. Use `.spec.healthCheckExprs` for custom resources that need CEL-based evaluation. Both fields can be used together in the same Kustomization.

### Document Your Health Checks

Add comments in your Kustomization YAML explaining what each CEL expression checks and why. This helps team members understand the health criteria.

### Test with kubectl First

Before adding a CEL expression to Flux, manually verify the resource status matches your expectations using kubectl.

## Conclusion

CEL expressions make Flux CD extensible to any custom resource in your cluster. By writing targeted health checks for each CRD, you ensure that Flux waits for operators to fully reconcile resources before proceeding. This prevents deployment failures caused by partially provisioned infrastructure, unconfigured services, or pending certificates.
