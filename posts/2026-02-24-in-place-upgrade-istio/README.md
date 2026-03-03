# How to Perform an In-Place Upgrade of Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Service Mesh, Upgrade, In-Place Upgrade

Description: A practical guide to performing an in-place upgrade of Istio using istioctl, covering preparation, execution, and post-upgrade validation steps.

---

An in-place upgrade replaces your existing Istio control plane with a newer version directly. Unlike a canary upgrade where you run two control planes side by side, an in-place upgrade swaps istiod in one shot. It is simpler and faster, which makes it a popular choice for development and staging environments, or for production clusters where you have strong confidence in the target version.

That said, it carries more risk than a canary approach because there is a brief window where the control plane version and the data plane proxies are mismatched. Here is how to do it safely.

## When to Use In-Place Upgrades

In-place upgrades work well when:

- You are upgrading between patch versions (e.g., 1.21.0 to 1.21.3)
- Your cluster is in a non-production environment
- You have a solid rollback plan
- You want a simpler, faster process than canary

For major or minor version jumps in production, consider a canary upgrade instead. But for patch releases with bug fixes, in-place is usually fine.

## Prerequisites

Make sure you have:

- The new version of `istioctl` matching your target Istio version
- Cluster admin access via `kubectl`
- A backup of your Istio configuration (IstioOperator resource, Helm values, or istioctl flags)
- Monitoring dashboards ready to watch during the upgrade

Check the current version:

```bash
istioctl version
```

Output:

```text
client version: 1.21.0
control plane version: 1.20.5
data plane version: 1.20.5 (35 proxies)
```

## Step 1: Review the Release Notes

Before touching anything, read the release notes for the target version. Look for:

- Deprecated features you are using
- Changed default values
- Required configuration changes
- Known issues

```bash
# Check what will change
istioctl manifest diff <old-manifest.yaml> <new-manifest.yaml>
```

If you saved your install manifest previously, you can generate a diff. If not, at minimum review the official Istio changelog.

## Step 2: Back Up Your Configuration

Export your current Istio configuration so you can restore it if needed:

```bash
# Export IstioOperator config if you used operator-based install
kubectl get istiooperator -n istio-system -o yaml > istio-backup.yaml

# Export all Istio custom resources
kubectl get virtualservices,destinationrules,gateways,serviceentries,sidecars --all-namespaces -o yaml > istio-resources-backup.yaml
```

Also take note of your current install method and flags. If you installed with:

```bash
istioctl install --set profile=default --set meshConfig.accessLogFile=/dev/stdout
```

You will need the same flags for the upgrade.

## Step 3: Download the New Version

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.21.0 sh -
cd istio-1.21.0
export PATH=$PWD/bin:$PATH
```

Verify the client version:

```bash
istioctl version --remote=false
```

## Step 4: Run Pre-Upgrade Checks

Istio provides a pre-upgrade check that catches common issues:

```bash
istioctl x precheck
```

This checks for:

- API version compatibility
- Deprecated resource usage
- Configuration issues that would cause problems after upgrade

Fix any issues it reports before proceeding.

## Step 5: Perform the Upgrade

With `istioctl`, the upgrade command is straightforward:

```bash
istioctl upgrade -y
```

If you have custom settings, pass them the same way you did during install:

```bash
istioctl upgrade --set profile=default --set meshConfig.accessLogFile=/dev/stdout -y
```

The upgrade process will:

1. Update the istiod deployment to the new version
2. Update any Istio gateways
3. Update webhooks and other control plane components

Watch the rollout:

```bash
kubectl rollout status deployment/istiod -n istio-system
```

## Step 6: Verify the Control Plane

After the upgrade completes, check that the control plane is running the new version:

```bash
istioctl version
```

The control plane version should now show the new version, while the data plane version still shows the old version (because sidecar proxies have not been restarted yet).

```text
client version: 1.21.0
control plane version: 1.21.0
data plane version: 1.20.5 (35 proxies)
```

Check that istiod is healthy:

```bash
kubectl get pods -n istio-system
kubectl logs -n istio-system -l app=istiod --tail=50
```

Look for any error messages or crash loops.

## Step 7: Update the Data Plane

The sidecar proxies are still running the old version. Istio maintains backward compatibility between the control plane and data plane for one minor version, so your mesh will continue working. But you should update the proxies soon.

Restart workloads namespace by namespace:

```bash
kubectl rollout restart deployment -n my-app
```

Or if you want to restart everything across all mesh-enabled namespaces:

```bash
for ns in $(kubectl get ns -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  echo "Restarting deployments in $ns"
  kubectl rollout restart deployment -n $ns
done
```

After restarting, verify the proxy versions:

```bash
istioctl proxy-status
```

All proxies should now show the new version and status SYNCED.

## Step 8: Post-Upgrade Validation

Run the Istio analyzer to catch any configuration issues:

```bash
istioctl analyze --all-namespaces
```

Check that all VirtualServices, DestinationRules, and other Istio resources are valid:

```bash
kubectl get virtualservices --all-namespaces
kubectl get destinationrules --all-namespaces
```

Verify traffic is flowing correctly by checking your application health endpoints and monitoring dashboards. Pay attention to:

- HTTP error rates (4xx and 5xx)
- Request latency (p50, p95, p99)
- Connection failures
- TLS handshake errors

## Rolling Back If Something Goes Wrong

If you notice problems after the upgrade, you can roll back by installing the old version:

```bash
# Use the old istioctl binary
./istio-1.20.5/bin/istioctl install --set profile=default -y
```

Then restart your workloads again to get the old sidecar version:

```bash
kubectl rollout restart deployment -n my-app
```

This is the main downside of in-place upgrades - rolling back requires another full upgrade cycle, and your workloads experience another round of restarts.

## Handling Ingress Gateways

If you are running Istio ingress gateways, they are upgraded as part of the control plane upgrade. However, verify they picked up the new version:

```bash
kubectl get pods -n istio-system -l istio=ingressgateway
```

If your gateways are in a different namespace or managed separately, you may need to restart them manually:

```bash
kubectl rollout restart deployment/istio-ingressgateway -n istio-system
```

## Tips for Smoother In-Place Upgrades

**Always upgrade one minor version at a time.** Jumping from 1.19 to 1.21 is not supported. Go 1.19 to 1.20, validate, then 1.20 to 1.21.

**Schedule upgrades during low-traffic periods.** While Istio maintains backward compatibility during the upgrade window, reducing traffic gives you more breathing room if something goes wrong.

**Have your monitoring ready before you start.** You should be watching error rates and latency in real time during the upgrade. If you do not have dashboards set up, set them up first.

**Keep both istioctl binaries around.** Having the old binary available makes rollback much faster.

**Document your install flags.** If you cannot reproduce your installation command, upgrading becomes much harder. Keep your IstioOperator YAML or Helm values file in version control.

## Summary

In-place upgrades are the simplest way to update Istio. Download the new istioctl, run the upgrade command, restart your workloads, and validate. The process works well for patch version bumps and non-production environments. For production minor version upgrades, weigh the simplicity against the risk and consider whether a canary upgrade would be more appropriate for your situation.
