# How to Track Breaking Changes in Rook Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Upgrade, Breaking Change, Compatibility

Description: Learn how to identify and handle breaking changes in Rook upgrades by reading release notes, checking deprecations, and validating CRD schema changes.

---

Breaking changes in Rook upgrades can cause operator failures, misconfiguration, or data access issues if not addressed before upgrading. Rook follows semantic versioning, but even minor version upgrades can include deprecations and configuration changes that require action.

## Where to Find Breaking Changes

**Official sources in priority order:**

1. Rook upgrade documentation: `https://rook.io/docs/rook/latest/Upgrade/rook-upgrade/`
2. GitHub release notes: `https://github.com/rook/rook/releases`
3. CHANGELOG.md in the Rook repository
4. Helm chart changelog for chart-specific changes

Always read the release notes for every version between your current version and the target, even when skipping patch versions.

## Checking CRD Schema Changes

CRD schema changes can break existing custom resources. Compare the CRD schemas between versions:

```bash
# Export current CRDs
kubectl get crd cephclusters.ceph.rook.io -o yaml > current-cephcluster-crd.yaml

# Download target version CRDs and extract the specific CRD for comparison
ROOK_VERSION="v1.15.0"
curl -sL "https://raw.githubusercontent.com/rook/rook/${ROOK_VERSION}/deploy/examples/crds.yaml" \
  | kubectl slice -f - --kind CustomResourceDefinition --name cephclusters.ceph.rook.io \
  > target-cephcluster-crd.yaml

# Alternatively, use kubectl diff against the full CRD manifest in a staging cluster
kubectl diff -f <(curl -sL "https://raw.githubusercontent.com/rook/rook/${ROOK_VERSION}/deploy/examples/crds.yaml")

# Or compare the openAPIV3Schema sections manually
diff <(kubectl get crd cephclusters.ceph.rook.io -o jsonpath='{.spec.versions[0].schema}' | python3 -m json.tool) \
     <(cat target-cephcluster-crd.yaml | kubectl apply --dry-run=client -o jsonpath='{.spec.versions[0].schema}' | python3 -m json.tool)
```

Pay attention to fields that have moved, been renamed, or had their types changed.

## Identifying Deprecated Fields

Rook marks deprecated fields in the CRD spec with descriptions. Check for deprecation warnings in the operator logs after upgrading to a new minor version:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-operator | grep -i deprecat
```

Check the Rook upgrade guide and release notes for each version to identify deprecated fields specific to your upgrade path. Deprecation details vary between releases, so always consult the official documentation rather than relying on third-party summaries.

## Using helm diff for Pre-Upgrade Analysis

The `helm diff` plugin shows exactly what will change before applying an upgrade:

```bash
helm plugin install https://github.com/databus23/helm-diff

helm diff upgrade rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --version 1.15.0 \
  --reuse-values
```

Review the diff output carefully. Look for:
- Changes to RBAC rules (may indicate new permissions needed)
- Changes to operator Deployment spec
- Changes to default values that override your configuration

## Checking Kubernetes API Deprecations

Rook upgrades sometimes change which Kubernetes API versions they use for internal resources. Check if your Kubernetes version still supports the APIs Rook needs:

```bash
# Check Kubernetes version
kubectl version

# Check deprecated API usage
kubectl api-resources | grep batch
kubectl api-resources | grep policy
```

Rook release notes will specify minimum Kubernetes version requirements.

## Validating CephCluster CR Against New Schema

Before upgrading, validate your existing CephCluster CR against the new CRD schema using dry-run:

```bash
# Export existing cluster CR
kubectl -n rook-ceph get cephcluster rook-ceph -o yaml > my-cephcluster.yaml

# Validate against new CRD (after applying new CRDs in staging)
kubectl apply -f my-cephcluster.yaml --dry-run=server
```

If validation fails, the error message will identify which fields need updating.

## Tracking Changes Across Multiple Versions

If you are multiple versions behind, create a migration checklist:

```bash
#!/bin/bash
# Generate migration notes between versions
CURRENT="v1.13.0"
TARGET="v1.15.0"

echo "Migration path: $CURRENT -> $TARGET"
echo ""
echo "Release notes to review:"
for ver in v1.13.1 v1.13.2 v1.14.0 v1.14.1 v1.14.2 v1.15.0; do
  echo "- https://github.com/rook/rook/releases/tag/$ver"
done

echo ""
echo "Key things to check:"
echo "1. CRD schema changes (run: kubectl diff -f new-crds.yaml)"
echo "2. Deprecated fields in CephCluster spec"
echo "3. Minimum Kubernetes version requirement"
echo "4. Minimum Ceph version requirement"
echo "5. Helm values changes (run: helm diff upgrade)"
```

## Handling API Removals

If a field is removed (not just deprecated) in the target version, update your CephCluster CR before upgrading. For example, if a configuration field is moved to a different location in the spec:

```yaml
# Before upgrade (old location)
spec:
  storage:
    config:
      osdsPerDevice: "1"

# After upgrade (field moved to device-level config)
spec:
  storage:
    devices:
      - name: sda
        config:
          osdsPerDevice: "1"
```

Apply the updated CR to the existing cluster before upgrading the operator. Consult the release notes for the specific fields affected in your upgrade path.

## Summary

Tracking breaking changes in Rook upgrades requires reading the official upgrade documentation and release notes for every version in your upgrade path, comparing CRD schemas between versions, using `helm diff` to preview changes, validating existing CRs against new CRD schemas in dry-run mode, and updating deprecated or removed fields before upgrading. Staging environment testing with the actual upgrade path is the final validation step before applying changes to production.
