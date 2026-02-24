# How to Upgrade Istio in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Upgrade, Kubernetes, Operations

Description: Step-by-step guide to upgrading Istio ambient mode installations including istiod, ztunnel, istio-cni, and waypoint proxies.

---

Upgrading Istio in ambient mode is simpler than upgrading a sidecar deployment because you do not need to restart application pods. The mesh components - istiod, ztunnel, and istio-cni - are infrastructure that runs independently of your workloads. When you upgrade them, your application pods keep running without interruption.

That said, there is a specific order to follow and some gotchas to watch out for.

## Before You Start

Check your current version:

```bash
istioctl version
```

Review the upgrade notes for the target version. Istio publishes release notes and known issues for each version:

```bash
# Download the new version
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.24.1 sh -
export PATH=$HOME/istio-1.24.1/bin:$PATH

# Verify the new istioctl
istioctl version --remote=false
```

Run the pre-upgrade check:

```bash
istioctl x precheck
```

This validates that your cluster and current installation are compatible with the target version.

## Upgrade Order

The components should be upgraded in this order:

1. **istio-base / CRDs** (if using Helm)
2. **istiod** (control plane)
3. **istio-cni** (CNI plugin)
4. **ztunnel** (data plane)
5. **Waypoint proxies** (L7 data plane)
6. **Ingress gateways** (if installed)

The control plane must be upgraded before the data plane. Istio supports the control plane being one minor version ahead of the data plane, but not the other way around.

## Upgrading with istioctl

### In-Place Upgrade

The simplest approach for non-production clusters:

```bash
istioctl install --set profile=ambient -y
```

Running `istioctl install` with a newer istioctl binary automatically upgrades the existing installation. It updates istiod, ztunnel, and istio-cni.

### Canary Upgrade (Recommended for Production)

For production, use a canary upgrade to run two control plane versions side by side:

```bash
# Install the new control plane revision
istioctl install --set profile=ambient \
  --set revision=1-24-1 -y
```

This creates a new istiod deployment named `istiod-1-24-1` alongside the existing one. Both run simultaneously.

Verify both revisions are running:

```bash
kubectl get pods -n istio-system -l app=istiod
```

Now migrate workloads to the new revision. For ambient mode, update the namespace labels:

```bash
# Remove old label and add new one
kubectl label namespace bookinfo istio.io/rev=1-24-1 --overwrite
```

After all namespaces are migrated, remove the old control plane:

```bash
istioctl uninstall --revision=default -y
```

## Upgrading with Helm

Helm upgrades give you the most control and are easier to automate in CI/CD pipelines.

### Step 1: Update CRDs

```bash
helm repo update
helm upgrade istio-base istio/base -n istio-system
```

### Step 2: Upgrade istiod

```bash
helm upgrade istiod istio/istiod -n istio-system --wait
```

Verify the new version:

```bash
kubectl get pods -n istio-system -l app=istiod -o jsonpath='{.items[0].spec.containers[0].image}'
```

### Step 3: Upgrade istio-cni

```bash
helm upgrade istio-cni istio/cni -n istio-system --wait
```

Check that CNI pods are updated on all nodes:

```bash
kubectl get ds istio-cni-node -n istio-system
kubectl rollout status ds/istio-cni-node -n istio-system
```

### Step 4: Upgrade ztunnel

```bash
helm upgrade ztunnel istio/ztunnel -n istio-system --wait
```

Monitor the DaemonSet rollout:

```bash
kubectl rollout status ds/ztunnel -n istio-system
```

The ztunnel DaemonSet rolls out one node at a time by default. During the rollout, the old ztunnel on a node is terminated and a new one starts. Traffic for workloads on that node is briefly interrupted (typically under a second) as the new ztunnel initializes.

### Step 5: Upgrade Waypoint Proxies

Waypoint proxies are managed through the Kubernetes Gateway API. To upgrade them, update the waypoint deployment:

```bash
# List waypoint proxies
kubectl get gateways -A -l istio.io/waypoint-for

# Restart waypoint proxies to pick up new version
kubectl rollout restart deployment -l gateway.networking.k8s.io/gateway-name -n bookinfo
```

Or if you created waypoints with istioctl:

```bash
istioctl waypoint apply -n bookinfo --enroll-namespace
```

### Step 6: Upgrade Ingress Gateways

```bash
helm upgrade istio-ingress istio/gateway -n istio-system --wait
```

## Verifying the Upgrade

After all components are upgraded, run verification:

```bash
# Check all component versions
istioctl version

# Verify ztunnel is healthy
istioctl ztunnel-config workloads

# Check proxy status
istioctl proxy-status
```

Verify that traffic is flowing correctly:

```bash
# If you have the bookinfo sample app
kubectl exec deploy/ratings-v1 -n bookinfo -- curl -s productpage:9080/productpage
```

Check ztunnel logs for any errors:

```bash
kubectl logs -l app=ztunnel -n istio-system --tail=20 --since=5m
```

## Rollback

If something goes wrong, rollback depends on your installation method.

### istioctl Rollback

```bash
# Use the old istioctl binary
export PATH=$HOME/istio-1.24.0/bin:$PATH
istioctl install --set profile=ambient -y
```

### Helm Rollback

```bash
helm rollback ztunnel -n istio-system
helm rollback istio-cni -n istio-system
helm rollback istiod -n istio-system
```

Rollback in reverse order: data plane first, then control plane.

## Handling ztunnel Rollout Disruption

The ztunnel DaemonSet upgrade is the most sensitive part because it affects live traffic. By default, ztunnel uses a `RollingUpdate` strategy with `maxUnavailable: 1`, meaning one node at a time.

If you need to be more conservative, you can adjust the update strategy:

```yaml
# ztunnel-values.yaml for Helm
updateStrategy:
  rollingUpdate:
    maxUnavailable: 1
  type: RollingUpdate
terminationGracePeriodSeconds: 30
```

To minimize disruption, consider:

1. Running the upgrade during a maintenance window
2. Draining nodes before ztunnel updates (overkill for most cases)
3. Having pod disruption budgets on critical workloads

In practice, the ztunnel restart is fast enough that most applications with proper retry logic do not notice it.

## Upgrade Checklist

Before the upgrade:
- [ ] Back up Istio configuration: `kubectl get istiooperator,authorizationpolicy,peerauthentication,virtualservice,destinationrule,gateway -A -o yaml > istio-backup.yaml`
- [ ] Check release notes for breaking changes
- [ ] Run `istioctl x precheck`
- [ ] Verify current installation is healthy

During the upgrade:
- [ ] Upgrade CRDs (if Helm)
- [ ] Upgrade istiod
- [ ] Upgrade istio-cni
- [ ] Upgrade ztunnel
- [ ] Upgrade waypoint proxies
- [ ] Upgrade gateways

After the upgrade:
- [ ] Run `istioctl version` to confirm
- [ ] Run `istioctl verify-install`
- [ ] Test application traffic
- [ ] Check ztunnel and waypoint logs for errors
- [ ] Monitor metrics for anomalies

The whole process typically takes 10-15 minutes for a small cluster and 30-60 minutes for larger ones, mostly spent on the ztunnel DaemonSet rollout.
