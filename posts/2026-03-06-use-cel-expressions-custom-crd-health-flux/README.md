# How to Use CEL Expressions for Custom CRD Health in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, cel, crd, custom resources, health checks, kubernetes, gitops, operators

Description: A practical guide to writing CEL health check expressions for custom CRDs from popular Kubernetes operators in Flux CD Kustomizations.

---

## Introduction

Kubernetes operators extend the platform with Custom Resource Definitions (CRDs) that Flux CD does not natively understand. Without health checks, Flux will apply these resources and immediately consider them healthy, even if the operator has not finished reconciling them. CEL expressions solve this by letting you define health criteria based on the actual status fields of any CRD.

This guide provides ready-to-use CEL health check expressions for popular CRDs from widely used Kubernetes operators.

## Prerequisites

- Flux CD v2.4+ with CEL health check support
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

Start with the most specific check and add guards for optional fields.

## Cert-Manager Resources

### Certificate

```yaml
healthChecks:
  - apiVersion: cert-manager.io/v1
    kind: Certificate
    name: my-tls-cert
    namespace: default
    cel:
      # Certificate is ready when issued successfully
      expression: >-
        has(self.status) &&
        has(self.status.conditions) &&
        self.status.conditions.exists(c,
          c.type == 'Ready' && c.status == 'True'
        )
```

### Issuer and ClusterIssuer

```yaml
healthChecks:
  - apiVersion: cert-manager.io/v1
    kind: ClusterIssuer
    name: letsencrypt-prod
    cel:
      # Issuer is healthy when ready to issue certificates
      expression: >-
        self.status.conditions.exists(c,
          c.type == 'Ready' && c.status == 'True'
        )
```

## Crossplane Resources

### Managed Resources (AWS, GCP, Azure)

```yaml
healthChecks:
  # AWS RDS Instance
  - apiVersion: rds.aws.upbound.io/v1beta1
    kind: Instance
    name: production-db
    namespace: crossplane-system
    cel:
      # Crossplane resources need both Synced and Ready conditions
      expression: >-
        has(self.status) &&
        has(self.status.conditions) &&
        self.status.conditions.exists(c,
          c.type == 'Ready' && c.status == 'True'
        ) &&
        self.status.conditions.exists(c,
          c.type == 'Synced' && c.status == 'True'
        )
```

### Composite Resources (XR)

```yaml
healthChecks:
  - apiVersion: database.example.com/v1alpha1
    kind: PostgreSQLInstance
    name: my-db
    namespace: default
    cel:
      # Composite resources should have all composed resources ready
      expression: >-
        has(self.status) &&
        has(self.status.conditions) &&
        self.status.conditions.exists(c,
          c.type == 'Ready' && c.status == 'True'
        ) &&
        self.status.conditions.exists(c,
          c.type == 'Synced' && c.status == 'True'
        ) &&
        (!has(self.status.conditions) ||
         !self.status.conditions.exists(c,
           c.type == 'LastAsyncOperation' && c.status == 'False'
         ))
```

## Istio Resources

### VirtualService and DestinationRule

```yaml
healthChecks:
  - apiVersion: networking.istio.io/v1
    kind: VirtualService
    name: my-app-vs
    namespace: default
    cel:
      # Istio resources are healthy when validation passes
      expression: >-
        has(self.status) &&
        has(self.status.conditions) &&
        self.status.conditions.exists(c,
          c.type == 'Reconciled' && c.status == 'True'
        )
  - apiVersion: networking.istio.io/v1
    kind: DestinationRule
    name: my-app-dr
    namespace: default
    cel:
      expression: >-
        has(self.status) &&
        has(self.status.conditions) &&
        self.status.conditions.exists(c,
          c.type == 'Reconciled' && c.status == 'True'
        )
```

## Prometheus Operator Resources

### ServiceMonitor and PrometheusRule

```yaml
healthChecks:
  # ServiceMonitor does not have status, check it exists
  # by verifying metadata fields
  - apiVersion: monitoring.coreos.com/v1
    kind: ServiceMonitor
    name: my-app-monitor
    namespace: monitoring
    cel:
      # ServiceMonitors are immediately valid once applied
      # Check the resource exists and has expected labels
      expression: >-
        has(self.metadata.name) &&
        self.metadata.name == 'my-app-monitor'
```

### Prometheus Instance

```yaml
healthChecks:
  - apiVersion: monitoring.coreos.com/v1
    kind: Prometheus
    name: prometheus
    namespace: monitoring
    cel:
      # Prometheus instance is healthy when all shards are available
      expression: >-
        has(self.status) &&
        has(self.status.conditions) &&
        self.status.conditions.exists(c,
          c.type == 'Available' && c.status == 'True'
        ) &&
        self.status.conditions.exists(c,
          c.type == 'Reconciled' && c.status == 'True'
        )
```

## Sealed Secrets

```yaml
healthChecks:
  - apiVersion: bitnami.com/v1alpha1
    kind: SealedSecret
    name: app-secrets
    namespace: default
    cel:
      # SealedSecret is healthy when it has been unsealed
      expression: >-
        has(self.status) &&
        has(self.status.conditions) &&
        self.status.conditions.exists(c,
          c.type == 'Synced' && c.status == 'True'
        )
```

## Strimzi Kafka Operator

### Kafka Cluster

```yaml
healthChecks:
  - apiVersion: kafka.strimzi.io/v1beta2
    kind: Kafka
    name: my-cluster
    namespace: kafka
    cel:
      # Kafka cluster is healthy when all components are ready
      expression: >-
        has(self.status) &&
        has(self.status.conditions) &&
        self.status.conditions.exists(c,
          c.type == 'Ready' && c.status == 'True'
        )
```

### Kafka Topic

```yaml
healthChecks:
  - apiVersion: kafka.strimzi.io/v1beta2
    kind: KafkaTopic
    name: my-topic
    namespace: kafka
    cel:
      expression: >-
        has(self.status) &&
        has(self.status.conditions) &&
        self.status.conditions.exists(c,
          c.type == 'Ready' && c.status == 'True'
        )
```

## KEDA Scaled Objects

```yaml
healthChecks:
  - apiVersion: keda.sh/v1alpha1
    kind: ScaledObject
    name: my-app-scaler
    namespace: default
    cel:
      # ScaledObject is healthy when it is active and not in error
      expression: >-
        has(self.status) &&
        has(self.status.conditions) &&
        self.status.conditions.exists(c,
          c.type == 'Ready' && c.status == 'True'
        ) &&
        !self.status.conditions.exists(c,
          c.type == 'Fallback' && c.status == 'True'
        )
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
  healthChecks:
    # Application Deployment
    - apiVersion: apps/v1
      kind: Deployment
      name: web-app
      namespace: app
    # TLS Certificate from cert-manager
    - apiVersion: cert-manager.io/v1
      kind: Certificate
      name: web-app-tls
      namespace: app
      cel:
        expression: >-
          self.status.conditions.exists(c,
            c.type == 'Ready' && c.status == 'True'
          )
    # Cloud database from Crossplane
    - apiVersion: rds.aws.upbound.io/v1beta1
      kind: Instance
      name: app-database
      namespace: crossplane-system
      cel:
        expression: >-
          self.status.conditions.exists(c,
            c.type == 'Ready' && c.status == 'True'
          ) && self.status.conditions.exists(c,
            c.type == 'Synced' && c.status == 'True'
          )
    # Kafka topic from Strimzi
    - apiVersion: kafka.strimzi.io/v1beta2
      kind: KafkaTopic
      name: app-events
      namespace: kafka
      cel:
        expression: >-
          self.status.conditions.exists(c,
            c.type == 'Ready' && c.status == 'True'
          )
    # Auto-scaler from KEDA
    - apiVersion: keda.sh/v1alpha1
      kind: ScaledObject
      name: web-app-scaler
      namespace: app
      cel:
        expression: >-
          self.status.conditions.exists(c,
            c.type == 'Ready' && c.status == 'True'
          )
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

### Always Guard with has()

New resources may not have a status field initially. Always check `has(self.status)` before accessing nested status fields.

### Follow the Conditions Convention

Most well-designed operators use the standard conditions pattern. Check for `Ready`, `Available`, or `Synced` conditions as the primary health signal.

### Include observedGeneration When Available

If the CRD supports `observedGeneration`, include it in your health check to avoid false positives from stale status.

### Document Your Health Checks

Add comments in your Kustomization YAML explaining what each CEL expression checks and why. This helps team members understand the health criteria.

### Test with kubectl First

Before adding a CEL expression to Flux, manually verify the resource status matches your expectations using kubectl.

## Conclusion

CEL expressions make Flux CD extensible to any custom resource in your cluster. By writing targeted health checks for each CRD, you ensure that Flux waits for operators to fully reconcile resources before proceeding. This prevents deployment failures caused by partially provisioned infrastructure, unconfigured services, or pending certificates.
