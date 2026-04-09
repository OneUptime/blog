# Validation Summary: How to Manage CRD Installation with Rook Helm Chart

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (v1.13.0, v1.14.0)
- Ceph
- Kubernetes (CRDs)
- Helm 3

## Sources Consulted
- Helm official documentation on CRDs: https://helm.sh/docs/chart_best_practices/custom_resource_definitions/
- Rook GitHub repository (v1.13.0 and v1.14.0 tags) to verify CRD file paths
- Verified raw GitHub URLs: `https://raw.githubusercontent.com/rook/rook/v1.13.0/deploy/examples/crds.yaml` (200 OK) and `https://raw.githubusercontent.com/rook/rook/v1.14.0/deploy/examples/crds.yaml` (200 OK)
- Verified that `deploy/charts/rook-ceph/crds.yaml` returns 404 for both versions

## Issues Found

1. **Incorrect CRD file URL paths (2 locations)**: The post referenced `deploy/charts/rook-ceph/crds.yaml` which returns 404 on GitHub. The correct path is `deploy/examples/crds.yaml`. Fixed both URLs (for v1.13.0 and v1.14.0).

2. **Incorrect claim about Helm auto-updating CRDs**: The post stated that Helm-managed CRDs in the `crds/` directory are "updated automatically" on chart upgrade. Per Helm documentation, CRDs in the `crds/` directory are installed on `helm install` but are explicitly NOT updated on `helm upgrade` and NOT deleted on `helm uninstall`. Fixed the description to accurately reflect this behavior.

3. **Incorrect claim about CRD deletion on helm uninstall**: The post stated "CRDs created by Helm are deleted on `helm uninstall`." This is false for CRDs in the `crds/` directory — Helm intentionally does not delete them. Corrected to clarify that this applies to CRDs managed as regular templates, and reframed the annotation step as a defensive measure.

## Review Notes
- The `grep -A1000 "CustomResourceDefinition"` approach for extracting CRDs from `helm template` output is fragile. A more robust approach would be to use a YAML-aware tool like `yq` to filter by `kind: CustomResourceDefinition`. However, this is a minor usability concern, not a correctness issue.
- The CRD list shown is a subset of all Rook CRDs, but the post correctly uses the phrase "Expected CRDs include" to indicate it is not exhaustive.
- Rook v1.13.0 and v1.14.0 are not the latest versions, but they are used as examples and the commands/patterns shown are still applicable to newer releases.
