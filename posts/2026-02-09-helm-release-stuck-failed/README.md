# Fix Kubernetes Helm Release Stuck in Failed State from Conflicting Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Helm, Troubleshooting

Description: Learn how to diagnose and fix Helm releases stuck in failed state due to resource conflicts with step-by-step remediation strategies.

---

Helm releases can get stuck in a failed state when resource conflicts prevent successful deployment. This leaves your application in an inconsistent state until you correct the underlying issue with another upgrade, rollback, or cleanup action. Understanding how to recover from failed releases is essential for maintaining Helm-managed applications.

## Understanding Helm Release States

Helm tracks release history and state in Kubernetes secrets or configmaps. Each deployment creates a new release revision with a status: deployed, failed, superseded, or pending. When a release fails, Helm records the failure but doesn't automatically clean up.

Failed releases occur when resources can't be created due to conflicts, validation errors, or timeout issues. The previous successful release may remain deployed, but you need to resolve the failed revision with a successful upgrade, rollback, or cleanup.

## Identifying Failed Releases

Check release status to see if any are stuck in failed state.

```bash
# List releases across all namespaces

helm list -A

# Show all releases including failed ones
helm list -A --all

# Check specific release status
helm status my-app -n production

# View release history
helm history my-app -n production
```

Failed releases show STATUS as "failed" with a description of what went wrong.

## Viewing Helm Release Details

Get detailed information about what caused the failure.

```bash
# Show release details
helm get all my-app -n production

# View release manifest
helm get manifest my-app -n production

# Check release values
helm get values my-app -n production

# View release notes
helm get notes my-app -n production

# Check specific revision
helm get manifest my-app -n production --revision 5
```

The manifest shows what resources Helm tried to create. Compare this to actual cluster state.

## Common Causes of Resource Conflicts

Resource conflicts happen when Helm tries to create resources that already exist but aren't managed by Helm, or when two releases try to manage the same resource.

Immutable field changes are another common cause. Resources like Services have immutable fields that can't be updated, requiring deletion and recreation.

Validation errors from admission webhooks or PSA policies can cause failures. Missing CRDs that the chart depends on also trigger failures.

## Example: Service ClusterIP Conflict

A common conflict occurs when a chart changes how it renders immutable Service fields.

```bash
# Original deployment
helm install my-app ./chart --set service.clusterIP=10.96.10.20

# Attempt to remove or change the allocated ClusterIP
helm upgrade my-app ./chart --set service.clusterIP=""

Error: UPGRADE FAILED: cannot patch "my-app" with kind Service:
Service "my-app" is invalid: spec.clusterIP: Invalid value: "": field is immutable
```

The release enters failed state because the Service update was rejected.

## Rolling Back Failed Releases

The simplest solution is rolling back to the last successful revision.

```bash
# View release history to find last successful revision
helm history my-app -n production

# Rollback to previous successful revision
helm rollback my-app -n production

# Rollback to specific revision
helm rollback my-app 3 -n production

# View status after rollback
helm status my-app -n production
```

Rollback restores the previous successful state and marks the failed release as superseded.

## Manually Fixing Resource Conflicts

When rollback isn't suitable, manually fix the conflicting resources.

```bash
# Identify conflicting resources from error message
helm upgrade my-app ./chart -n production --dry-run=server --debug

# Delete the conflicting resource
kubectl delete service my-app -n production

# Retry the upgrade
helm upgrade my-app ./chart -n production

# Or force resource replacement
helm upgrade my-app ./chart -n production --force-replace
```

The `--force-replace` flag forces resource updates through a replacement strategy.

## Cleaning Up Failed Release Metadata

Sometimes you need to clean up failed release metadata after deciding the failed release should be uninstalled.

```bash
# Uninstall the release and keep its history
helm uninstall my-app -n production --keep-history

# Or delete specific release metadata manually
kubectl delete secret -n production \
  sh.helm.release.v1.my-app.v5

# List helm secrets
kubectl get secrets -n production | grep sh.helm.release

# View release history after cleanup
helm history my-app -n production
```

Be careful with manual metadata deletion as it can leave Helm history inconsistent.

## Adopting Existing Resources

When resources exist but aren't managed by Helm, adopt them into the release.

```bash
# Annotate existing resources to adopt them
kubectl annotate deployment my-app -n production --overwrite \
  meta.helm.sh/release-name=my-app \
  meta.helm.sh/release-namespace=production

kubectl label deployment my-app -n production --overwrite \
  app.kubernetes.io/managed-by=Helm

# Retry Helm operation
helm upgrade my-app ./chart -n production
```

This tells Helm to take ownership of existing resources.

## Handling CRD Dependencies

Charts depending on CRDs fail if CRDs aren't installed first.

```bash
# Check if required CRDs exist
kubectl get crd | grep required-crd

# Install CRDs separately
kubectl apply -f https://example.com/crds.yaml

# Or use separate Helm chart for CRDs
helm install my-crds ./crd-chart -n production

# Then install main chart
helm install my-app ./app-chart -n production
```

Separate CRD installation from application deployment prevents conflicts.

## Using Helm Upgrade --force-replace

The force-replace flag recreates resources that have conflicts.

```bash
# Force replacement where needed
helm upgrade my-app ./chart -n production --force-replace

# Combine with wait for completion
helm upgrade my-app ./chart -n production --force-replace --wait --timeout 10m

# Force with rollback on failure
helm upgrade my-app ./chart -n production --force-replace --rollback-on-failure
```

Force-replace upgrades can cause brief downtime as resources are replaced.

## Debugging with Dry Run

Test upgrades before applying them to identify potential conflicts.

```bash
# Dry run with debug output
helm upgrade my-app ./chart -n production --dry-run=server --debug

# Validate chart without installing
helm template my-app ./chart -n production | kubectl apply --dry-run=server -f -

# Check what would change
helm diff upgrade my-app ./chart -n production
```

Dry run shows exactly what Helm will do without making changes.

## Helm Plugin for Diff

Install helm-diff plugin for better visibility into changes.

```bash
# Install helm-diff plugin
helm plugin install https://github.com/databus23/helm-diff

# Compare current and proposed release
helm diff upgrade my-app ./chart -n production

# See what resources would be created/modified/deleted
helm diff revision my-app 4 5 -n production
```

This helps identify potential conflicts before they cause failures.

## Timeout Issues

Releases fail if they exceed timeout limits waiting for resources.

```bash
# Increase timeout for slow resources
helm upgrade my-app ./chart -n production --timeout 15m

# Disable wait to prevent timeout
helm upgrade my-app ./chart -n production --wait=false

# Check why resources aren't ready
kubectl get pods -n production -l app=my-app
kubectl describe pod my-app-xxx -n production
```

StatefulSets and complex applications often need longer timeouts.

## Rollback-on-Failure Upgrades

Use rollback-on-failure to automatically rollback on failure.

```bash
# Upgrade with auto-rollback on failure
helm upgrade my-app ./chart -n production --rollback-on-failure --timeout 10m

# If upgrade fails, Helm automatically rolls back
# No manual intervention needed
```

Rollback-on-failure upgrades prevent stuck failed states by auto-recovering.

## Cleaning Up Release Completely

To completely remove a stuck release and start fresh.

```bash
# Uninstall release (removes all resources)
helm uninstall my-app -n production

# Verify resources are gone
kubectl get all -n production -l app=my-app

# Reinstall from scratch
helm install my-app ./chart -n production
```

This is the nuclear option when other approaches fail.

## Post-Render Hooks

Use post-render hooks to modify resources before application.

```bash
# Create post-render script
cat > post-render.sh <<'EOF'
#!/bin/bash
# Modify resources before applying
cat <&0 | sed 's/replicas: 1/replicas: 3/'
EOF
chmod +x post-render.sh

# Use post-render during upgrade
helm upgrade my-app ./chart -n production --post-renderer ./post-render.sh
```

Post-render hooks help work around chart limitations.

## Monitoring Helm Releases

Track Helm release states with monitoring.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
  namespace: monitoring
data:
  helm-rules.yml: |
    groups:
    - name: helm_releases
      interval: 60s
      rules:
      - alert: HelmReleaseFailed
        expr: |
          helm_release_info{status="failed"} == 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Helm release {{ $labels.release }} failed"
          description: "Release in namespace {{ $labels.namespace }} is in failed state"
```

This assumes you're running a Helm exporter for Prometheus.

## Best Practices

Always test Helm upgrades in staging environments first. Use `--dry-run` and `helm diff` to preview changes.

Set appropriate timeouts for your workloads. Complex applications need more time to deploy.

Use `--rollback-on-failure` flag for production upgrades to automatically rollback on failure.

Keep Helm charts versioned and stored in chart repositories. This makes rollbacks reliable.

Document custom values and configuration for each release. Future operators need this context.

Monitor release states and set up alerts for failures. Quick response prevents extended outages.

## Conclusion

Helm releases get stuck in failed state due to resource conflicts, timeouts, or validation errors. Diagnose failures by examining release history and manifests, then choose the appropriate fix: rollback, force upgrade, or manual resource cleanup. Use dry-run and diff tools to prevent conflicts before they occur. With proper testing and monitoring, you can maintain reliable Helm-managed applications and recover quickly when failures do happen.
