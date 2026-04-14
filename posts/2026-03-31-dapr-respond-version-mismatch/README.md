# How to Respond to Dapr Version Mismatch Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Versioning, Upgrade, Kubernetes, Troubleshooting

Description: Identify and resolve Dapr version mismatch issues between the control plane, sidecars, and CLI to restore compatibility and prevent unexpected behavior.

---

## Why Version Mismatches Occur

Dapr version mismatches happen when the control plane (Helm/CLI managed) is upgraded without restarting application pods, or when different teams deploy services with different sidecar version annotations. The Dapr project maintains compatibility within a minor version range, but major and cross-minor mismatches cause problems.

## Step 1 - Check the Control Plane Version

```bash
dapr status -k
```

Output:

```text
NAME                   NAMESPACE    HEALTHY  STATUS   VERSION  AGE
dapr-operator          dapr-system  True     Running  1.13.0   14d
dapr-sentry            dapr-system  True     Running  1.13.0   14d
dapr-placement-server  dapr-system  True     Running  1.13.0   14d
dapr-dashboard         dapr-system  True     Running  0.14.0   14d
```

## Step 2 - Check Running Sidecar Versions

List sidecar versions across all pods:

```bash
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{range .spec.containers[*]}{.image}{"\n"}{end}{end}' | grep daprd
```

Or use a label selector:

```bash
kubectl get pods -A -l dapr.io/sidecar-injected=true \
  -o custom-columns="NAMESPACE:.metadata.namespace,POD:.metadata.name,IMAGE:.spec.containers[1].image"
```

Look for pods showing an older Dapr sidecar image tag.

## Step 3 - Force Sidecar Version Update

The sidecar image is injected at pod creation time based on the current injector configuration. To update sidecars to the new version, rolling restart all Dapr-enabled deployments:

```bash
# Restart all deployments in a namespace
for deploy in $(kubectl get deployment -n my-namespace -o name); do
  kubectl rollout restart "$deploy" -n my-namespace
done
```

Or restart cluster-wide across all namespaces:

```bash
kubectl get deployments -A -l app.kubernetes.io/managed-by=Helm \
  -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}' \
  | while IFS='/' read ns deploy; do
    kubectl rollout restart deployment/"$deploy" -n "$ns"
  done
```

## Step 4 - Pin a Specific Sidecar Version

If you need to temporarily pin a service to a specific Dapr version, use the annotation:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "orders-api"
  dapr.io/sidecar-image: "daprio/daprd:1.12.5"
```

Remove this annotation once you have validated compatibility with the new version.

## Step 5 - Validate CLI Version Compatibility

The Dapr CLI version should match the control plane version:

```bash
dapr --version
# CLI version: 1.13.0
# Runtime version: 1.13.0
```

Update the CLI to match:

```bash
# macOS
brew upgrade dapr-cli

# Linux
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash
```

## Step 6 - Review Release Notes for Breaking Changes

Before upgrading, always check the migration guide:

```bash
# Check what changed between versions
open https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-upgrade/
```

Pay attention to component version changes - a state store component may need its `version` field updated.

## Summary

Dapr version mismatches are resolved by auditing control plane and sidecar versions, rolling restarting all Dapr-enabled pods to pick up the new injected sidecar version, and ensuring the CLI matches the runtime. Use sidecar image pinning only as a temporary measure during staged rollouts, and always review migration guides before major version upgrades.
