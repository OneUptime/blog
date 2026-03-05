# How to Understand Flux CD Ready Conditions and Status Messages

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Status, Conditions, Troubleshooting, Observability

Description: Learn how to read and interpret Flux CD ready conditions and status messages to understand reconciliation outcomes and diagnose failures.

---

Every Flux CD resource reports its state through Kubernetes status conditions. These conditions tell you whether a resource is healthy, what went wrong if it is not, and when the last state change occurred. Learning to read and interpret these conditions is fundamental to operating Flux CD effectively, as they are the primary way Flux communicates reconciliation outcomes.

This guide explains the condition types Flux uses, how to read status messages, and how to use conditions for monitoring and troubleshooting.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `kubectl` access to the cluster
- The `flux` CLI installed

## The Ready Condition

The most important condition for any Flux resource is the `Ready` condition. It follows the Kubernetes standard conditions pattern:

```yaml
status:
  conditions:
    - type: Ready
      status: "True"
      reason: ReconciliationSucceeded
      message: "Applied revision: main@sha1:abc123def456"
      lastTransitionTime: "2026-03-05T10:30:00Z"
      observedGeneration: 3
```

The fields mean:

- **type**: Always `Ready` for the primary health indicator
- **status**: `True` (healthy), `False` (unhealthy), or `Unknown` (in progress)
- **reason**: A machine-readable reason code
- **message**: A human-readable description of the current state
- **lastTransitionTime**: When the condition last changed from one status to another
- **observedGeneration**: The resource generation that this condition reflects

## Common Reason Codes

Flux controllers use standardized reason codes that help you quickly categorize the state:

**Success reasons**:
- `ReconciliationSucceeded`: The resource was reconciled successfully
- `ArtifactUpToDate`: The source artifact has not changed since the last fetch
- `HealthCheckSucceeded`: All health checks passed

**Failure reasons**:
- `ReconciliationFailed`: An error occurred during reconciliation
- `ArtifactFailed`: The source controller could not fetch or build the artifact
- `HealthCheckFailed`: One or more health checks did not pass
- `DependencyNotReady`: A dependent resource is not ready
- `PruneFailed`: Garbage collection of removed resources failed
- `BuildFailed`: Kustomize build or Helm template rendering failed

**In-progress reasons**:
- `Progressing`: The resource is being reconciled
- `HealthCheckPending`: Waiting for health checks to complete

## Reading Conditions with the CLI

The fastest way to check conditions is through the Flux CLI:

```bash
flux get kustomizations
```

Output:

```text
NAME       READY   MESSAGE                                    REVISION          SUSPENDED
my-app     True    Applied revision: main@sha1:abc123         main@sha1:abc123  False
my-infra   False   kustomize build failed: ...                main@sha1:def456  False
```

For more detail, use kubectl:

```bash
kubectl get kustomization my-app -n flux-system -o yaml
```

To extract just the conditions:

```bash
kubectl get kustomization my-app -n flux-system \
  -o jsonpath='{range .status.conditions[*]}{.type}{"\t"}{.status}{"\t"}{.reason}{"\t"}{.message}{"\n"}{end}'
```

## Multiple Condition Types

Flux resources can have multiple condition types beyond `Ready`. Common additional conditions include:

**Reconciling**: Indicates that the controller is actively processing the resource:

```yaml
- type: Reconciling
  status: "True"
  reason: Progressing
  message: "Building manifests for revision main@sha1:abc123"
```

**Stalled**: Indicates that reconciliation is not making progress:

```yaml
- type: Stalled
  status: "True"
  reason: HealthCheckFailed
  message: "Health check failed after 5m0s, timeout waiting for deployment/my-app"
```

**HealthCheck** (for Kustomizations with health checks configured):

```yaml
- type: Healthy
  status: "False"
  reason: HealthCheckFailed
  message: "Deployment/default/my-app not ready: 0/3 replicas available"
```

## Interpreting Common Status Messages

**Successful reconciliation**:

```text
Applied revision: main@sha1:abc123def456
```

This means Flux successfully applied all manifests from the given Git commit.

**Build failure**:

```text
kustomize build failed: accumulating resources: accumulating resources from 'deployment.yaml': open /tmp/kustomization-123/deployment.yaml: no such file or directory
```

A file referenced in kustomization.yaml does not exist. Check the path and file names in your repository.

**Dependency not ready**:

```text
dependency 'flux-system/infrastructure' is not ready
```

The Kustomization depends on another Kustomization that has not finished reconciling. Check the dependency chain:

```bash
flux tree kustomization my-app
```

**Health check failure**:

```text
Health check failed after 5m0s, timeout waiting for: [Deployment/default/my-app status: 'False']
```

The application was applied but did not become healthy within the timeout period. Check the Deployment status directly:

```bash
kubectl describe deployment my-app -n default
kubectl get events -n default --field-selector involvedObject.name=my-app
```

**Authentication error**:

```text
failed to checkout and determine revision: unable to clone 'ssh://git@github.com/my-org/repo': ssh: handshake failed
```

The SSH key or token used to access the repository is invalid or expired. Update the credentials secret.

## Using Conditions for Monitoring

Flux exports condition data as Prometheus metrics through the `gotk_reconcile_condition` gauge. Each combination of type, status, kind, name, and namespace is a separate metric:

```promql
# Find all resources that are not ready
gotk_reconcile_condition{type="Ready", status="False"} == 1

# Count ready resources by kind
count by (kind) (gotk_reconcile_condition{type="Ready", status="True"} == 1)
```

Set up alerts based on conditions:

```yaml
groups:
  - name: flux-conditions
    rules:
      - alert: FluxResourceNotReady
        expr: gotk_reconcile_condition{type="Ready", status="False"} == 1
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "{{ $labels.kind }}/{{ $labels.name }} is not ready"
```

## The observedGeneration Field

The `observedGeneration` field in each condition indicates which version of the resource spec the condition reflects. Compare it with `metadata.generation`:

```bash
kubectl get kustomization my-app -n flux-system \
  -o jsonpath='generation={.metadata.generation} observed={.status.observedGeneration}'
```

If `observedGeneration` is less than `generation`, the controller has not yet processed the latest spec changes. This is normal during reconciliation but should not persist for more than a few reconciliation cycles.

## Suspended Resources

When a resource is suspended, the `Ready` condition retains its last value but reconciliation stops:

```bash
flux suspend kustomization my-app
flux get kustomizations my-app
```

The output still shows the last known condition, but no updates will occur until the resource is resumed. Check the `spec.suspend` field to distinguish between a genuinely healthy resource and one that was healthy when suspended.

## Summary

Flux CD ready conditions and status messages are the primary interface for understanding what Flux is doing and whether it is working correctly. The `Ready` condition with its status, reason, and message fields tells you at a glance whether reconciliation succeeded. Additional conditions like `Reconciling`, `Stalled`, and `Healthy` provide more granular state information. Learning to read these conditions efficiently, whether through the Flux CLI, kubectl, or Prometheus metrics, is essential for operating Flux CD in production and diagnosing issues quickly when they arise.
