# How to Migrate from Istio 1.18 to 1.20

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Migration, Upgrade, Kubernetes, Service Mesh

Description: A detailed guide for migrating from Istio 1.18 to 1.20, covering breaking changes, canary upgrades, configuration updates, and rollback procedures.

---

Migrating from Istio 1.18 to 1.20 spans two minor versions, which means you need to be aware of breaking changes and deprecations from both the 1.19 and 1.20 releases. While Istio supports skipping one minor version during upgrades (so 1.18 to 1.20 is within the supported range), you should still review the changes from both intermediate releases carefully.

This guide takes you through the migration step by step, with real commands and configuration changes you need to make.

## Pre-Migration Assessment

Before touching anything, assess your current installation:

```bash
# Check current Istio version
istioctl version

# Check proxy versions across the mesh
istioctl proxy-status

# Check for configuration issues
istioctl analyze --all-namespaces

# Export current configuration
kubectl get istiooperator -n istio-system -o yaml > current-config-backup.yaml
```

Save the output of these commands. You will need them for comparison after the migration.

## Breaking Changes to Review

### Changes in Istio 1.19

1. **Gateway API v1beta1 became the default**: If you were using v1alpha2 Gateway API resources, they need updating.

2. **ExternalName service handling changed**: Services of type ExternalName are no longer automatically included in the mesh. You need explicit ServiceEntry resources.

3. **`meshConfig.enablePrometheusMerge` default changed**: This now defaults to true, meaning Prometheus annotations on pods merge with Istio metrics.

### Changes in Istio 1.20

1. **Minimum Kubernetes version bumped to 1.25**: If your cluster is on 1.24 or earlier, upgrade Kubernetes first.

2. **`IstioOperator` v1alpha1 changes**: Several fields were deprecated or restructured.

3. **Ambient mesh changes**: If you were using experimental ambient features, the API changed significantly.

4. **Telemetry API became the standard**: The legacy mixer-based telemetry configuration is fully removed.

## Verify Kubernetes Compatibility

Istio 1.20 requires Kubernetes 1.25 or newer:

```bash
kubectl version --short
```

If you are on Kubernetes 1.24, upgrade your cluster first before proceeding with the Istio migration.

## Backup Everything

```bash
# Backup all Istio custom resources
for crd in $(kubectl get crds | grep istio | awk '{print $1}'); do
  kubectl get $crd --all-namespaces -o yaml > "backup-$crd.yaml"
done

# Backup secrets
kubectl get secrets -n istio-system -o yaml > backup-secrets.yaml

# Backup Helm releases if using Helm
helm get values istiod -n istio-system > istiod-values-backup.yaml
helm get values istio-base -n istio-system > base-values-backup.yaml
```

## Migration Strategy: Canary Upgrade

The recommended approach for this kind of version jump is a canary (revision-based) upgrade. You run Istio 1.20 alongside 1.18, migrate workloads gradually, and then remove the old version.

### Step 1: Download Istio 1.20

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.20.0 sh -
cd istio-1.20.0
export PATH=$PWD/bin:$PATH
```

### Step 2: Install Istio 1.20 as a Canary

If using istioctl:

```bash
istioctl install --set revision=1-20 --set profile=default -y
```

If using Helm:

```bash
helm install istiod-1-20 istio/istiod \
  --namespace istio-system \
  --version 1.20.0 \
  --set revision=1-20 \
  -f your-values.yaml \
  --wait
```

Verify both versions are running:

```bash
kubectl get pods -n istio-system -l app=istiod
```

You should see both the old istiod and the new `istiod-1-20` running.

### Step 3: Update Your Configuration

Before migrating workloads, update your Istio configuration for 1.20 compatibility.

If you had custom EnvoyFilter resources, check that they are compatible:

```bash
kubectl get envoyfilter --all-namespaces -o yaml
```

EnvoyFilter resources that reference specific Envoy API versions may need updating. Istio 1.20 ships with a newer version of Envoy, and some filter names or config structures may have changed.

Update any deprecated fields in your DestinationRules:

```yaml
# Old (1.18)
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule

# New (1.20) - use v1beta1
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
```

### Step 4: Migrate Namespaces

Switch namespaces from the old revision to the new one:

```bash
# Remove the old injection label
kubectl label namespace default istio-injection-

# Add the new revision label
kubectl label namespace default istio.io/rev=1-20

# Restart pods to pick up the new sidecar
kubectl rollout restart deployment -n default
```

Verify the new sidecar version:

```bash
istioctl proxy-status | grep default
```

The proxies should show the 1.20 version.

### Step 5: Test Thoroughly

After migrating a namespace, verify everything works:

```bash
# Check for proxy errors
kubectl logs deploy/my-app -c istio-proxy --tail=50

# Verify mTLS is working
istioctl authn tls-check deploy/my-app -n default

# Check routes
istioctl proxy-config routes deploy/my-app -n default

# Run analysis
istioctl analyze -n default
```

### Step 6: Migrate All Namespaces

Repeat Step 4 for each namespace. Do it one at a time and verify after each:

```bash
for ns in namespace1 namespace2 namespace3; do
  kubectl label namespace $ns istio-injection-
  kubectl label namespace $ns istio.io/rev=1-20
  kubectl rollout restart deployment -n $ns
  echo "Waiting for $ns to stabilize..."
  sleep 60
  istioctl proxy-status | grep $ns
done
```

### Step 7: Migrate the Ingress Gateway

Update the gateway to use the new version:

```bash
# If using Helm
helm upgrade istio-ingressgateway istio/gateway \
  --namespace istio-system \
  --version 1.20.0 \
  --set revision=1-20
```

Or if using istioctl, the gateway should already be part of the revision installation.

### Step 8: Remove the Old Version

Once all workloads are on 1.20 and everything is verified:

```bash
# Remove old control plane
istioctl uninstall --revision default

# Or with Helm
helm uninstall istiod -n istio-system

# Clean up old revision labels
# The label will be removed when you switch to default
```

Then switch from revision-based to the default:

```bash
# Finalize by removing the revision tag
istioctl tag set default --revision 1-20 --overwrite
```

## Post-Migration Verification

```bash
# Verify single version running
istioctl version

# Full proxy status
istioctl proxy-status

# Comprehensive analysis
istioctl analyze --all-namespaces

# Verify metrics are flowing
kubectl top pods -n istio-system
```

## Rollback Procedure

If something goes wrong, you can roll back by switching namespaces back to the old revision:

```bash
kubectl label namespace default istio.io/rev-
kubectl label namespace default istio-injection=enabled
kubectl rollout restart deployment -n default
```

The old istiod is still running (you have not removed it yet), so it will pick up these workloads immediately.

## Common Issues

**Proxy version mismatch warnings**: Normal during the canary period. They go away once all workloads are on the same version.

**EnvoyFilter breakage**: If custom EnvoyFilters break, check the Envoy changelog for the versions shipped with Istio 1.19 and 1.20. Filter names and configurations may have changed.

**Gateway 503 errors**: If the gateway starts returning 503s after migration, check that the gateway pod is running the correct version and that VirtualService/DestinationRule configurations are compatible.

The canary upgrade approach gives you the safety of running both versions simultaneously, so you can verify everything works before committing to the new version. Take your time with each namespace and do not rush the migration.
