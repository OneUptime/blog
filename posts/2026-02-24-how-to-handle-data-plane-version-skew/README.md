# How to Handle Data Plane Version Skew

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Data Plane, Version Skew, Upgrade, Kubernetes

Description: How to safely manage version differences between Istio control plane and data plane proxies during upgrades and rollouts.

---

Version skew between the control plane and data plane is one of those things that can quietly cause problems in your Istio mesh if you are not paying attention. When you upgrade istiod but have not yet restarted all your pods to pick up the new sidecar version, you end up with a mix of proxy versions talking to a newer control plane. Istio supports this to a degree, but there are limits and gotchas.

## What Is Version Skew?

Version skew happens when the control plane (istiod) is running a different version than some or all of the Envoy sidecar proxies in the data plane. This is a normal state during upgrades because you upgrade the control plane first, then gradually restart workloads to get the new sidecar injected.

Check your current versions:

```bash
# Control plane version
istioctl version

# See all proxy versions in the mesh
istioctl proxy-status
```

The `istioctl proxy-status` output shows the proxy version for each pod. You will see something like:

```
NAME                              CDS    LDS    EDS    RDS    ISTIOD                    VERSION
my-app-abc.default                SYNCED SYNCED SYNCED SYNCED istiod-7f8b9c6d4-x2k9p   1.20.2
my-app-def.default                SYNCED SYNCED SYNCED SYNCED istiod-7f8b9c6d4-x2k9p   1.19.6
```

In this example, one pod has version 1.20.2 and another has 1.19.6. That is version skew.

## Istio's Version Compatibility Policy

Istio officially supports a version skew of N-1 to N+1 between the control plane and data plane. This means if your control plane is version 1.20, your data plane proxies can be 1.19, 1.20, or 1.21.

Going beyond one minor version of skew is not supported and can lead to:
- xDS protocol incompatibilities
- Missing features that the control plane assumes the proxy supports
- Unexpected behavior with newer API fields
- Potential crashes or connection failures

You can check for unsupported version skew easily:

```bash
istioctl version --short
```

If the versions are more than one minor version apart, you should prioritize getting the lagging proxies updated.

## Detecting Version Skew

Beyond `istioctl proxy-status`, you can also query the version systematically:

```bash
# Get all unique proxy versions
kubectl get pods --all-namespaces -o jsonpath='{range .items[*]}{range .spec.containers[*]}{.image}{"\n"}{end}{end}' | grep proxyv2 | sort -u
```

This shows you all the distinct sidecar images in use across the cluster.

For a more targeted check, use a label selector:

```bash
kubectl get pods -n default -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[?(@.name=="istio-proxy")]}{.image}{end}{"\n"}{end}'
```

## Upgrading Strategy: Canary Approach

The safest way to handle version skew is to use Istio's canary upgrade feature. Instead of doing an in-place upgrade of istiod, you install a second control plane alongside the existing one.

```bash
# Install the new version with a revision label
istioctl install --set revision=1-21 --set tag=1.21.0
```

This creates a new istiod deployment named `istiod-1-21` that runs alongside your existing istiod. Both control planes operate simultaneously.

Then, migrate namespaces one at a time:

```bash
# Switch a namespace to the new control plane
kubectl label namespace my-namespace istio.io/rev=1-21 --overwrite
kubectl label namespace my-namespace istio-injection-

# Restart pods to pick up the new sidecar
kubectl rollout restart deployment -n my-namespace
```

Check that the pods in that namespace are now connected to the new control plane:

```bash
istioctl proxy-status | grep my-namespace
```

You should see them connected to `istiod-1-21`. Once all namespaces are migrated and running smoothly, remove the old control plane:

```bash
istioctl uninstall --revision default
```

## Handling Skew During Rollouts

Even with a good upgrade strategy, you will have a period where some pods have the old proxy and some have the new one. Here is how to handle that safely.

### Keep Configuration Compatible

Do not start using new Istio API features until all proxies have been upgraded. If you use a field that only exists in version 1.21 but some proxies are still on 1.20, those older proxies will ignore the field (at best) or have unexpected behavior.

```yaml
# Do not use this if any proxies are still on a version that does not support it
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
```

Stick to API features that are supported by the oldest proxy version in your mesh.

### Monitor During the Transition

Watch error rates closely during the upgrade window:

```promql
sum(rate(istio_requests_total{response_code=~"5.."}[5m])) by (source_version, destination_version)
```

This query breaks down error rates by the source and destination proxy versions, which helps you spot if a specific version combination is having issues.

### Prioritize Critical Services

Upgrade your most important services first. If something goes wrong with the new version, you want to catch it early on a service you are monitoring closely, not discover it later on a forgotten background service.

```bash
# Restart specific deployments in order of priority
kubectl rollout restart deployment critical-service -n production
# Wait and monitor
kubectl rollout restart deployment important-service -n production
# Wait and monitor
kubectl rollout restart deployment background-service -n production
```

## Dealing with Stuck Pods

Sometimes pods get stuck on the old version because they cannot be restarted easily (maybe they are running batch jobs, or they have long-lived connections). You have a few options.

### Wait for Natural Turnover

If the pods will eventually be replaced (through scaling events, deployments, etc.), just wait. Monitor the version skew and make sure it is converging.

### Force Restart

If you need to speed things up:

```bash
# Restart all deployments in a namespace
kubectl rollout restart deployment -n my-namespace

# For statefulsets
kubectl rollout restart statefulset -n my-namespace

# For daemonsets
kubectl rollout restart daemonset -n my-namespace
```

### In-Place Proxy Upgrade (Experimental)

Istio has been working on in-place proxy upgrades that do not require pod restarts. Check if your version supports it:

```bash
istioctl proxy-config bootstrap my-pod -n default | grep -i version
```

## Automating Version Skew Detection

Set up a simple monitoring check that alerts you when version skew exceeds your comfort level:

```yaml
groups:
- name: istio-version-skew
  rules:
  - alert: IstioVersionSkew
    expr: |
      count(count by (tag) (
        label_replace(
          istio_build{component="proxy"},
          "tag", "$1", "tag", "(.*)"
        )
      )) > 1
    for: 24h
    labels:
      severity: warning
    annotations:
      summary: "Multiple Istio proxy versions detected in mesh for over 24 hours"
```

This fires if there are multiple proxy versions present in the mesh for more than 24 hours, which usually means an upgrade is stalled or incomplete.

## Rollback Plan

If you run into problems after upgrading some proxies, you can roll back by:

1. Reverting the namespace label to the old control plane revision
2. Restarting the affected pods

```bash
kubectl label namespace my-namespace istio.io/rev=1-20 --overwrite
kubectl rollout restart deployment -n my-namespace
```

The old control plane should still be running if you used the canary approach, so the rollback is quick.

Version skew is an expected part of running Istio. The key is to keep it within supported bounds (one minor version), monitor it closely during upgrades, upgrade systematically using canary deployments, and have a rollback plan ready. Taking the time to do upgrades carefully saves you from hard-to-diagnose production issues caused by version incompatibilities between proxies.
