# How to Troubleshoot HelmRelease Not Ready Status in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Troubleshooting, Not Ready, Status Conditions

Description: A comprehensive troubleshooting guide for diagnosing and resolving HelmRelease Not Ready status in Flux CD across all common failure scenarios.

---

A HelmRelease with a `Not Ready` status in Flux CD means the reconciliation has not completed successfully. This is a broad state that can result from dozens of different issues -- chart source problems, template errors, API rejections, timeout failures, dependency issues, and more. This guide provides a structured approach to systematically diagnose and resolve any `Not Ready` condition.

## Understanding the Not Ready Status

The `Ready` condition on a HelmRelease is a summary condition. When it is `False`, you need to look at the `reason` and `message` fields to understand the specific failure. Common reasons include:

- `ArtifactFailed` -- Chart source is not available
- `InstallFailed` -- Helm install operation failed
- `UpgradeFailed` -- Helm upgrade operation failed
- `TestFailed` -- Helm test hooks failed
- `RollbackFailed` -- Rollback after a failed upgrade also failed
- `DependencyNotReady` -- A dependency listed in `dependsOn` is not ready
- `ReconciliationFailed` -- General reconciliation error

## Step 1: Get the Full Status

Start with a complete picture of the HelmRelease state:

```bash
# Quick status overview
flux get helmrelease --all-namespaces

# Detailed status for a specific HelmRelease
flux get helmrelease my-app -n default

# Full YAML status with all conditions
kubectl get helmrelease my-app -n default -o yaml
```

## Step 2: Read the Status Conditions

The conditions array contains the detailed failure information:

```bash
# Extract all conditions
kubectl get helmrelease my-app -n default \
  -o jsonpath='{range .status.conditions[*]}{.type}{": "}{.status}{" - "}{.reason}{" - "}{.message}{"\n"}{end}'
```

This will output something like:

```
Ready: False - UpgradeFailed - Helm upgrade failed: timed out waiting for the condition
Released: False - UpgradeFailed - Helm upgrade failed: timed out waiting for the condition
```

## Step 3: Diagnose by Reason

### ArtifactFailed / Source Not Ready

The chart source (HelmRepository, GitRepository, OCIRepository, or Bucket) is not available:

```bash
# Check all sources
flux get sources all -A

# Check the specific source referenced by the HelmRelease
flux get source helm my-repo -n flux-system

# If using GitRepository
flux get source git my-repo -n flux-system

# Force source reconciliation
flux reconcile source helm my-repo -n flux-system
```

Common fixes:
- Verify the source URL is correct
- Check authentication credentials
- Ensure the chart name and version exist in the source

### DependencyNotReady

A HelmRelease listed in `dependsOn` is not ready:

```bash
# Check the status of all HelmReleases to find the failing dependency
flux get helmrelease --all-namespaces

# Check specific dependency
flux get helmrelease my-dependency -n default
```

Fix the dependency first, then the dependent HelmRelease will automatically reconcile.

### InstallFailed

The Helm install operation failed. See the helm-controller logs for details:

```bash
# Check controller logs for install errors
kubectl logs -n flux-system deployment/helm-controller | grep "my-app" | grep -i "install"
```

Refer to the install failures debugging guide for detailed resolution steps.

### UpgradeFailed

The Helm upgrade operation failed:

```bash
# Check controller logs for upgrade errors
kubectl logs -n flux-system deployment/helm-controller | grep "my-app" | grep -i "upgrade"

# Check Helm release history
helm history my-app -n default
```

### Timeout Waiting for Ready

The install or upgrade succeeded but pods did not become ready within the timeout:

```bash
# Check pod status
kubectl get pods -n default -l app.kubernetes.io/name=my-app

# Check pod events for the reason they are not ready
kubectl describe pod -n default -l app.kubernetes.io/name=my-app

# Common issues: ImagePullBackOff, CrashLoopBackOff, Pending (scheduling)
kubectl get events -n default --sort-by='{.lastTimestamp}' | grep my-app
```

Fix the pod issue (image, resources, config) or increase the timeout:

```yaml
# Increase the timeout for slow-starting applications
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  install:
    timeout: 10m
  upgrade:
    timeout: 10m
```

## Step 4: Check the Helm Controller

The helm-controller itself may be having issues:

```bash
# Check if the helm-controller is running
kubectl get pods -n flux-system -l app=helm-controller

# Check controller resource usage (may be OOM or CPU throttled)
kubectl top pod -n flux-system -l app=helm-controller

# Check controller logs for general errors
kubectl logs -n flux-system deployment/helm-controller --since=10m | grep -i "error\|panic\|oom"
```

If the controller is OOM-killed or crashlooping, it cannot reconcile any HelmRelease.

## Step 5: Verify the Chart and Values

Render the chart locally to verify it produces valid output:

```bash
# If you have the chart locally
helm template my-app ./charts/my-app -f values.yaml

# Validate against the cluster
helm template my-app ./charts/my-app -f values.yaml | kubectl apply --dry-run=server -f -
```

## Step 6: Force Reconciliation

After fixing the underlying issue:

```bash
# Force reconciliation
flux reconcile helmrelease my-app -n default

# Watch the result
flux get helmrelease my-app -n default --watch
```

If the HelmRelease is stuck and reconciliation does not help:

```bash
# Suspend and resume to reset the state
flux suspend helmrelease my-app -n default
flux resume helmrelease my-app -n default
```

## Comprehensive Troubleshooting Checklist

Use this checklist to systematically work through a Not Ready HelmRelease:

```bash
# 1. Check the HelmRelease status and conditions
flux get helmrelease my-app -n default

# 2. Check the chart source
flux get sources all -n flux-system

# 3. Check dependencies
flux get helmrelease --all-namespaces | grep -v "True"

# 4. Check helm-controller logs
kubectl logs -n flux-system deployment/helm-controller --since=15m | grep "my-app"

# 5. Check the Helm release in the cluster
helm list -n default -a | grep my-app
helm history my-app -n default

# 6. Check the pods deployed by the release
kubectl get pods -n default -l app.kubernetes.io/instance=my-app

# 7. Check events in the namespace
kubectl get events -n default --sort-by='{.lastTimestamp}' | tail -20

# 8. Check for resource quota issues
kubectl describe resourcequota -n default

# 9. Force reconciliation
flux reconcile helmrelease my-app -n default
```

## Common Not Ready Scenarios and Fixes

| Symptom | Diagnosis Command | Fix |
|---|---|---|
| Source not ready | `flux get sources all` | Fix source URL, credentials, or network |
| Chart not found | Controller logs | Verify chart name and version |
| Template error | Controller logs | Fix values or chart templates |
| Pods not ready | `kubectl get pods` | Fix image, resources, or config |
| Dependency not ready | `flux get hr -A` | Fix the dependency first |
| Timeout | HelmRelease conditions | Increase timeout or fix pod startup |
| Retries exhausted | HelmRelease conditions | Fix root cause, suspend/resume |
| Controller down | `kubectl get pods -n flux-system` | Fix controller resource limits |

## Best Practices

1. **Check conditions first, not just the Ready status.** The reason and message fields tell you exactly what went wrong.
2. **Work from the source outward.** Verify the chart source before debugging the HelmRelease.
3. **Fix dependencies before dependents.** If a dependency is not ready, fixing the dependent release will not help.
4. **Monitor the helm-controller.** A resource-starved controller causes all HelmReleases to appear stuck.
5. **Set up Flux notifications.** Get alerted on failure conditions before they cascade.

## Conclusion

A Not Ready HelmRelease in Flux can stem from many different issues, but a systematic approach -- checking status conditions, verifying sources, examining controller logs, and inspecting cluster resources -- will lead you to the root cause. The key is reading the `reason` and `message` fields in the status conditions and following the appropriate debugging path from there.
