# How to Upgrade Multi-Cluster Istio Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Upgrade, Multi-Cluster, Kubernetes, Operations

Description: Step-by-step process for safely upgrading Istio across a multi-cluster mesh using canary upgrades and revision-based deployment strategies.

---

Upgrading Istio in a single cluster is already a careful process. When you have multiple clusters in a mesh, the upgrade becomes even more delicate because you need to maintain compatibility between different Istio versions running simultaneously during the rollout. The good news is that Istio supports canary upgrades with revision labels, which lets you upgrade one cluster at a time without breaking cross-cluster communication.

## Istio Version Compatibility

Istio supports running mixed versions across clusters during upgrades. The general rule is that the control plane and data plane should be within one minor version of each other. For example:

- Istiod 1.20 can manage proxies running 1.19 or 1.20
- Istiod 1.19 can work alongside Istiod 1.20 in a multi-primary mesh

This gives you a window to upgrade clusters one at a time without rushing.

## Upgrade Strategy: Canary with Revisions

The recommended upgrade strategy uses Istio revisions. Instead of upgrading the existing Istiod in place, you install a new version of Istiod alongside the old one. Then you gradually migrate workloads to the new version.

### Step 1: Check Current Version

```bash
istioctl version --context="${CTX_CLUSTER1}"
istioctl version --context="${CTX_CLUSTER2}"
```

Also check the proxy versions:

```bash
istioctl proxy-status --context="${CTX_CLUSTER1}"
```

### Step 2: Install the New Version with a Revision

Install the new version of Istiod alongside the existing one using a revision label:

```yaml
# cluster1-upgrade.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  revision: 1-21
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster1
      network: network1
```

```bash
istioctl install --context="${CTX_CLUSTER1}" -f cluster1-upgrade.yaml -y
```

This creates a new Istiod deployment named `istiod-1-21` alongside the existing `istiod`. Both run simultaneously.

Verify both versions are running:

```bash
kubectl get pods -n istio-system --context="${CTX_CLUSTER1}" -l app=istiod
```

You should see pods for both the old and new Istiod.

### Step 3: Migrate Namespaces to the New Revision

Instead of the `istio-injection=enabled` label, use the revision label to point workloads at the new Istiod:

```bash
# Remove the old injection label
kubectl label namespace sample istio-injection- --context="${CTX_CLUSTER1}"

# Add the revision label
kubectl label namespace sample istio.io/rev=1-21 --context="${CTX_CLUSTER1}"
```

Then restart workloads in that namespace to get new sidecars:

```bash
kubectl rollout restart deployment -n sample --context="${CTX_CLUSTER1}"
```

Verify the new proxies are connected to the new Istiod:

```bash
istioctl proxy-status --context="${CTX_CLUSTER1}" --revision=1-21
```

### Step 4: Validate

Run your test suite against the upgraded namespace. Check:

- Cross-cluster communication still works
- mTLS is functioning
- Metrics are being collected
- No increase in error rates

```bash
# Quick connectivity test
for i in $(seq 1 20); do
  kubectl exec -n sample -c sleep deployment/sleep --context="${CTX_CLUSTER1}" -- \
    curl -sS helloworld.sample:5000/hello
done
```

### Step 5: Migrate Remaining Namespaces

Once you are confident the new version works, migrate all namespaces:

```bash
for NS in $(kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}' --context="${CTX_CLUSTER1}"); do
  kubectl label namespace $NS istio-injection- --context="${CTX_CLUSTER1}"
  kubectl label namespace $NS istio.io/rev=1-21 --context="${CTX_CLUSTER1}"
  kubectl rollout restart deployment -n $NS --context="${CTX_CLUSTER1}"
done
```

### Step 6: Upgrade Gateways

Do not forget the ingress and east-west gateways:

```bash
# Upgrade the east-west gateway
samples/multicluster/gen-eastwest-gateway.sh \
  --network network1 \
  --revision 1-21 | \
  istioctl install --context="${CTX_CLUSTER1}" -y -f -
```

For ingress gateways, follow the same revision-based approach.

### Step 7: Remove the Old Control Plane

After all workloads and gateways are migrated to the new revision:

```bash
istioctl uninstall --revision=default --context="${CTX_CLUSTER1}" -y
```

Or if the old version also used a revision:

```bash
istioctl uninstall --revision=1-20 --context="${CTX_CLUSTER1}" -y
```

## Multi-Cluster Upgrade Order

The order you upgrade clusters matters:

### Multi-Primary Upgrade Order

In multi-primary setups, upgrade one cluster at a time:

1. Upgrade cluster1 control plane (install new revision)
2. Migrate cluster1 workloads to new revision
3. Validate cross-cluster communication
4. Upgrade cluster2 control plane
5. Migrate cluster2 workloads
6. Remove old revisions from both clusters

### Primary-Remote Upgrade Order

For primary-remote, always upgrade the primary first:

1. Upgrade the primary cluster's Istiod (new revision)
2. Migrate primary cluster workloads
3. Update the remote cluster configuration to point to the new Istiod revision
4. Restart remote cluster workloads to get new sidecars
5. Remove old revision from the primary

The remote cluster does not have its own Istiod to upgrade, but its sidecar proxies need to be compatible with the new primary Istiod.

## Updating Remote Secrets During Upgrade

If you regenerate remote secrets during the upgrade (for example, because service account tokens were rotated), apply them carefully:

```bash
# Regenerate and apply
istioctl create-remote-secret \
  --context="${CTX_CLUSTER2}" \
  --name=cluster2 | \
  kubectl apply -f - --context="${CTX_CLUSTER1}"
```

The new Istiod revision will pick up the updated secret. The old revision will also see it, which is fine since the secret format has not changed between versions.

## Rollback Plan

If something goes wrong during the upgrade, rolling back is straightforward with revisions:

```bash
# Switch namespaces back to the old revision
kubectl label namespace sample istio.io/rev- --context="${CTX_CLUSTER1}"
kubectl label namespace sample istio-injection=enabled --context="${CTX_CLUSTER1}"

# Restart workloads to get old sidecars back
kubectl rollout restart deployment -n sample --context="${CTX_CLUSTER1}"

# Remove the new revision
istioctl uninstall --revision=1-21 --context="${CTX_CLUSTER1}" -y
```

## Pre-Upgrade Checklist

Before starting the upgrade:

```bash
# 1. Check for deprecated APIs
istioctl analyze --all-namespaces --context="${CTX_CLUSTER1}"

# 2. Verify current mesh health
istioctl proxy-status --context="${CTX_CLUSTER1}"
istioctl proxy-status --context="${CTX_CLUSTER2}"

# 3. Check version compatibility
istioctl version --context="${CTX_CLUSTER1}"

# 4. Backup custom resources
kubectl get virtualservices,destinationrules,gateways,serviceentries,authorizationpolicies \
  --all-namespaces --context="${CTX_CLUSTER1}" -o yaml > backup-cluster1.yaml
```

## Summary

Upgrading multi-cluster Istio is safest with revision-based canary upgrades. Install the new version alongside the old one, migrate workloads gradually, validate at each step, and remove the old version only after everything is confirmed working. For multi-primary, upgrade one cluster at a time. For primary-remote, always start with the primary. And always have a rollback plan ready.
