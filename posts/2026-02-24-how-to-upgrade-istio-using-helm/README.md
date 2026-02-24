# How to Upgrade Istio Using Helm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Helm, Upgrade, Kubernetes, Service Mesh

Description: A step-by-step guide to safely upgrading Istio using Helm charts, covering in-place upgrades, canary upgrades, pre-upgrade checks, and rollback procedures.

---

Upgrading Istio is one of those operations that makes people nervous, and honestly, a healthy amount of caution is warranted. A bad upgrade can affect every service in your mesh. But with Helm, the upgrade process is well-structured and repeatable, and you always have a clear rollback path.

Istio supports upgrading one minor version at a time (e.g., 1.22 to 1.23, not 1.22 to 1.24). Patch version upgrades within the same minor version are generally safe and straightforward.

## Pre-Upgrade Checklist

Before touching anything, run through these checks:

```bash
# 1. Current version
helm list -n istio-system
istioctl version

# 2. Check for deprecated APIs in your config
istioctl analyze --all-namespaces

# 3. Read the upgrade notes for the target version
# Always check: https://istio.io/latest/news/releases/

# 4. Verify current installation is healthy
kubectl get pods -n istio-system
istioctl proxy-status

# 5. Back up current values
helm get values istiod -n istio-system > current-istiod-values.yaml
helm get values istio-base -n istio-system > current-base-values.yaml
helm get values istio-ingress -n istio-ingress > current-gateway-values.yaml 2>/dev/null

# 6. Back up all Istio configuration
kubectl get virtualservices,destinationrules,gateways,serviceentries,authorizationpolicies --all-namespaces -o yaml > istio-config-backup.yaml
```

## Updating the Helm Repository

Make sure you have the latest chart versions:

```bash
helm repo update istio

# Check available versions
helm search repo istio/istiod --versions | head -10
```

## Standard In-Place Upgrade

For most upgrades, this is the process:

**Step 1: Upgrade the base chart first**

```bash
helm upgrade istio-base istio/base \
  -n istio-system \
  --version 1.24.0
```

This updates the CRDs. The CRDs are backward-compatible, so existing resources continue to work.

**Step 2: Upgrade Istiod**

```bash
helm upgrade istiod istio/istiod \
  -n istio-system \
  -f istiod-values.yaml \
  --version 1.24.0 \
  --wait
```

Watch the upgrade progress:

```bash
kubectl get pods -n istio-system -w
```

Istiod performs a rolling update. The old pod stays running until the new one is ready, so there's no control plane downtime.

**Step 3: Upgrade gateways**

```bash
helm upgrade istio-ingress istio/gateway \
  -n istio-ingress \
  -f gateway-values.yaml \
  --version 1.24.0 \
  --wait
```

**Step 4: Restart workloads to pick up new sidecar version**

This is the part that takes the longest. Each workload needs to be restarted to get the new sidecar proxy version:

```bash
# Restart namespace by namespace
for ns in $(kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  echo "Restarting deployments in $ns..."
  kubectl rollout restart deployment -n "$ns"
done
```

You can do this gradually, namespace by namespace, to limit the blast radius.

## Canary Upgrade

For critical environments, a canary upgrade lets you run two versions of Istiod simultaneously and gradually migrate workloads:

**Step 1: Install the new version alongside the old one using revisions**

```bash
helm install istiod-1-24 istio/istiod \
  -n istio-system \
  --set revision=1-24 \
  -f istiod-values.yaml \
  --version 1.24.0
```

Now you have two Istiod deployments: the old one and the new one (tagged with revision `1-24`).

**Step 2: Migrate namespaces to the new revision**

```bash
# Change the namespace label from injection to revision-based
kubectl label namespace my-namespace istio-injection- istio.io/rev=1-24 --overwrite

# Restart pods in that namespace
kubectl rollout restart deployment -n my-namespace
```

**Step 3: Verify the namespace is working with the new version**

```bash
# Check that proxies are connected to the new Istiod
istioctl proxy-status

# The ISTIOD column should show the revision
```

**Step 4: Migrate remaining namespaces**

Repeat step 2 for each namespace, verifying after each one.

**Step 5: Remove the old revision**

Once all namespaces are migrated:

```bash
# Remove the old Istiod
helm uninstall istiod -n istio-system

# Rename the new one (optional, for consistency)
# Or just keep using the revision-based naming
```

## Handling Values Changes Between Versions

Helm values can change between Istio versions. Some keys get deprecated or renamed. Always check your values against the new chart:

```bash
# Compare your values with the new defaults
helm show values istio/istiod --version 1.24.0 > new-defaults.yaml
diff current-istiod-values.yaml new-defaults.yaml
```

If a value you're using has been deprecated, the upgrade might still work but you'll get warnings. Update your values file to use the new keys.

## Post-Upgrade Verification

After the upgrade, run a thorough verification:

```bash
# 1. Check versions
istioctl version
helm list -n istio-system

# 2. Verify all components are running
kubectl get pods -n istio-system
kubectl get pods -n istio-ingress

# 3. Check proxy sync status
istioctl proxy-status

# 4. Run analysis
istioctl analyze --all-namespaces

# 5. Check sidecar versions across the mesh
istioctl proxy-status | awk '{print $NF}' | sort | uniq -c

# 6. Test traffic flow
kubectl exec deploy/sleep -n default -- curl -s http://httpbin.default:8080/get

# 7. Check metrics
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics | grep "pilot_info"
```

## Upgrade Monitoring

During the upgrade, monitor key metrics:

```bash
# Watch for proxy sync errors
kubectl logs -n istio-system deploy/istiod -f | grep -i "error\|reject"

# Monitor gateway health
kubectl logs -n istio-ingress deploy/istio-ingress --tail=20

# Check for 503 errors (sign of connection issues during upgrade)
# If you have access logs enabled:
kubectl logs deploy/my-app -c istio-proxy -n my-namespace | grep "503"
```

## Dealing with Failed Upgrades

If something goes wrong during the upgrade:

```bash
# Check what happened
helm history istiod -n istio-system

# Roll back to the previous release
helm rollback istiod -n istio-system

# Verify the rollback
kubectl get pods -n istio-system
istioctl proxy-status
```

For canary upgrades, the rollback is even simpler since the old version is still running:

```bash
# Switch namespaces back to the old version
kubectl label namespace my-namespace istio.io/rev- istio-injection=enabled --overwrite
kubectl rollout restart deployment -n my-namespace

# Remove the failed new revision
helm uninstall istiod-1-24 -n istio-system
```

## Automating Upgrades

For teams that want to automate the upgrade process:

```bash
#!/bin/bash
# upgrade-istio.sh

TARGET_VERSION=$1

if [ -z "$TARGET_VERSION" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

echo "Upgrading Istio to $TARGET_VERSION"

# Pre-checks
echo "Running pre-checks..."
istioctl analyze --all-namespaces || { echo "Analysis found issues. Fix before upgrading."; exit 1; }

# Backup
echo "Backing up current values..."
helm get values istiod -n istio-system > "backup-values-$(date +%Y%m%d).yaml"

# Upgrade
echo "Upgrading base..."
helm upgrade istio-base istio/base -n istio-system --version "$TARGET_VERSION"

echo "Upgrading istiod..."
helm upgrade istiod istio/istiod -n istio-system -f istiod-values.yaml --version "$TARGET_VERSION" --wait --timeout=300s

echo "Upgrading gateway..."
helm upgrade istio-ingress istio/gateway -n istio-ingress -f gateway-values.yaml --version "$TARGET_VERSION" --wait --timeout=300s

# Post-checks
echo "Running post-checks..."
istioctl version
istioctl proxy-status

echo "Upgrade complete. Don't forget to restart workloads."
```

Upgrading Istio with Helm is a well-defined process that, when followed carefully, is reliable and repeatable. The key is preparation: back up everything, read the release notes, run pre-checks, and always have a rollback plan ready. Take your time, especially with the first upgrade. It gets easier with practice.
