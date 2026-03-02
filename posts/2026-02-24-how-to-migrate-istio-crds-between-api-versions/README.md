# How to Migrate Istio CRDs Between API Versions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, CRD, Migration, Kubernetes, API Versions

Description: A practical walkthrough for migrating Istio Custom Resource Definitions from older API versions like v1alpha3 and v1beta1 to the stable v1 API.

---

If you've been running Istio for a while, your cluster probably has resources created with older API versions like `v1alpha3` or `v1beta1`. While Kubernetes handles version conversion automatically at the API level, you should migrate your stored manifests and in-cluster resources to the latest stable version. This ensures compatibility with future Istio upgrades that may drop support for older versions.

## Identifying Resources That Need Migration

Start by finding all Istio resources and their API versions. The tricky part is that `kubectl get` returns resources in the version you request, not the version they were created with. To see what's actually stored, check the CRD storage version:

```bash
kubectl get crd virtualservices.networking.istio.io -o jsonpath='{.spec.versions[?(@.storage==true)].name}'
```

To find resources that were originally created with old API versions, you can check your source manifests in version control. If your YAML files reference `networking.istio.io/v1alpha3`, those need updating.

For a quick audit of what's in the cluster, list all Istio resource types:

```bash
kubectl api-resources --api-group=networking.istio.io
kubectl api-resources --api-group=security.istio.io
kubectl api-resources --api-group=telemetry.istio.io
```

Then list resources across all namespaces:

```bash
kubectl get virtualservices -A
kubectl get destinationrules -A
kubectl get gateways -A
kubectl get serviceentries -A
kubectl get sidecars -A
kubectl get peerauthentications -A
kubectl get authorizationpolicies -A
kubectl get requestauthentications -A
kubectl get telemetries -A
kubectl get envoyfilters -A
```

## Step 1: Export All Existing Resources

Export each resource type to YAML files:

```bash
mkdir -p istio-migration/networking
mkdir -p istio-migration/security
mkdir -p istio-migration/telemetry

# Networking resources
kubectl get virtualservices -A -o yaml > istio-migration/networking/virtualservices.yaml
kubectl get destinationrules -A -o yaml > istio-migration/networking/destinationrules.yaml
kubectl get gateways -A -o yaml > istio-migration/networking/gateways.yaml
kubectl get serviceentries -A -o yaml > istio-migration/networking/serviceentries.yaml
kubectl get sidecars -A -o yaml > istio-migration/networking/sidecars.yaml
kubectl get envoyfilters -A -o yaml > istio-migration/networking/envoyfilters.yaml

# Security resources
kubectl get peerauthentications -A -o yaml > istio-migration/security/peerauthentications.yaml
kubectl get authorizationpolicies -A -o yaml > istio-migration/security/authorizationpolicies.yaml
kubectl get requestauthentications -A -o yaml > istio-migration/security/requestauthentications.yaml

# Telemetry resources
kubectl get telemetries -A -o yaml > istio-migration/telemetry/telemetries.yaml
```

## Step 2: Update API Versions in the Exports

For networking resources, change from v1alpha3 or v1beta1 to v1:

```bash
# Preview changes first
grep -rn "networking.istio.io/v1alpha3\|networking.istio.io/v1beta1" istio-migration/

# Apply changes
find istio-migration/ -name "*.yaml" -exec sed -i '' \
  -e 's|networking.istio.io/v1alpha3|networking.istio.io/v1|g' \
  -e 's|networking.istio.io/v1beta1|networking.istio.io/v1|g' \
  -e 's|security.istio.io/v1beta1|security.istio.io/v1|g' \
  -e 's|telemetry.istio.io/v1alpha1|telemetry.istio.io/v1|g' \
  {} \;
```

## Step 3: Clean Up Metadata

The exported YAML includes metadata that shouldn't be reapplied, like `resourceVersion`, `uid`, and `creationTimestamp`. Clean these up:

```bash
# For each file, remove cluster-specific metadata
for file in $(find istio-migration/ -name "*.yaml"); do
  python3 -c "
import yaml, sys
with open('$file') as f:
    docs = list(yaml.safe_load_all(f))
for doc in docs:
    if doc and 'items' in doc:
        for item in doc['items']:
            meta = item.get('metadata', {})
            for key in ['resourceVersion', 'uid', 'creationTimestamp', 'generation', 'managedFields']:
                meta.pop(key, None)
            item.get('metadata', {}).pop('annotations', {}).pop('kubectl.kubernetes.io/last-applied-configuration', None)
with open('$file', 'w') as f:
    yaml.dump_all(docs, f, default_flow_style=False)
"
done
```

Alternatively, if you don't want to use Python, you can manually remove these fields or use `yq`:

```bash
# Using yq (if installed)
yq eval 'del(.items[].metadata.resourceVersion, .items[].metadata.uid, .items[].metadata.creationTimestamp, .items[].metadata.generation, .items[].metadata.managedFields)' -i istio-migration/networking/virtualservices.yaml
```

## Step 4: Validate Before Applying

Use `istioctl analyze` to check the modified files:

```bash
istioctl analyze istio-migration/networking/virtualservices.yaml
istioctl analyze istio-migration/networking/destinationrules.yaml
```

Also do a dry-run apply:

```bash
kubectl apply -f istio-migration/networking/virtualservices.yaml --dry-run=server
```

The `--dry-run=server` flag sends the request to the API server for validation without actually creating or updating the resource.

## Step 5: Apply the Updated Resources

Apply the updated resources:

```bash
kubectl apply -f istio-migration/networking/
kubectl apply -f istio-migration/security/
kubectl apply -f istio-migration/telemetry/
```

Since the resources already exist, `kubectl apply` will update them with the new API version.

## Step 6: Verify the Migration

Check that resources are now using the correct version:

```bash
kubectl get vs -A -o yaml | head -20
```

The output should show `apiVersion: networking.istio.io/v1`.

Run `istioctl analyze` across the whole cluster:

```bash
istioctl analyze -A
```

This checks for any remaining issues with the migrated resources.

## Handling Schema Differences

Most Istio networking resources have identical schemas between v1alpha3, v1beta1, and v1. However, there are some edge cases:

**EnvoyFilter**: This resource has remained at v1alpha3 for a long time because it's considered an advanced, potentially unstable API. Check the current Istio version's documentation for the latest supported version.

**WasmPlugin**: Introduced as an alternative to EnvoyFilter for Wasm extensions. Uses its own API group `extensions.istio.io`.

**Telemetry**: Moved from `telemetry.istio.io/v1alpha1` to `telemetry.istio.io/v1` with some structural changes in how providers are configured.

## Updating Source Manifests

Beyond the in-cluster resources, update your source manifests in Git. This is actually the more important step because the in-cluster resources get regenerated from your source manifests during deployments.

Search your repository:

```bash
grep -rn "networking.istio.io/v1alpha3" k8s/ helm/ manifests/
grep -rn "networking.istio.io/v1beta1" k8s/ helm/ manifests/
grep -rn "security.istio.io/v1beta1" k8s/ helm/ manifests/
```

Update all instances to the stable v1 version. If you use Helm charts with Istio resources, update the chart templates too.

## Handling Helm-Managed Resources

If your Istio resources are managed by Helm, the migration approach differs slightly. You need to update the chart values and templates, then do a Helm upgrade:

```bash
# Update the templates in your chart
# Then upgrade
helm upgrade my-release ./my-chart -n my-namespace
```

Make sure the chart templates use the new API version. Helm tracks the version of applied resources, so the upgrade will update them correctly.

## Rollback Plan

Before migration, take a snapshot of your current Istio configuration:

```bash
kubectl get vs,dr,gw,se,sc,pa,ap,ra,telemetry -A -o yaml > istio-backup-pre-migration.yaml
```

If something goes wrong after migration, you can reapply the backup:

```bash
kubectl apply -f istio-backup-pre-migration.yaml
```

Since the old API versions are still served (just not stored), the old manifests will work fine as a rollback.

## Automating Future Migrations

Add a check to your CI/CD pipeline that warns about deprecated API versions:

```bash
# In your CI pipeline
DEPRECATED=$(grep -rn "v1alpha3\|v1beta1" manifests/ || true)
if [ -n "$DEPRECATED" ]; then
  echo "Warning: Found deprecated Istio API versions:"
  echo "$DEPRECATED"
  exit 1
fi
```

This prevents new resources from being created with old API versions and keeps your codebase clean going forward.

Migrating CRDs between API versions is mostly mechanical work. The schemas are compatible in most cases, so it's really about updating the version string and reapplying. The key is to do it proactively before an Istio upgrade removes support for the old version.
