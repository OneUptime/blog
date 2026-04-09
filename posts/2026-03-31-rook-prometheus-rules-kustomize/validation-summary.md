# Validation Summary: How to Customize Prometheus Rules for Rook-Ceph with Kustomize

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Kubernetes storage orchestrator)
- Prometheus / Prometheus Operator (PrometheusRule CRD)
- Kustomize (Kubernetes manifest customization)
- Kubernetes (kubectl apply -k)

## Sources Consulted
- Kustomize official documentation — `bases` deprecation and `resources` field behavior (https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/)
- Kustomize remote resource support for raw HTTP URLs (verified supported since Kustomize v3.8.0+)
- Rook repository monitoring examples — `deploy/examples/monitoring/localrules.yaml` for alert expressions and metric value ranges (https://github.com/rook/rook/tree/master/deploy/examples/monitoring)
- Ceph MGR Prometheus module — verified `ceph_pool_percent_used` metric exists and returns 0–100 scale; verified `ceph_osd_apply_latency_ms` metric exists
- Prometheus Operator CRD API — confirmed `monitoring.coreos.com/v1` is the correct API version for PrometheusRule

## Issues Found

1. **`bases` field is deprecated (now errors in Kustomize v5+):** The production overlay `kustomization.yaml` used the `bases` field, which was deprecated in Kustomize v2.1.0 and removed entirely in Kustomize v5.0.0 (bundled with kubectl since Kubernetes 1.27). Changed `bases` to `resources` and merged both resource lists into a single `resources` block to produce valid YAML.

2. **Incorrect description of custom rules as "JSON patch":** The text described the custom PrometheusRule (`custom-rules.yaml`) as being added "using a JSON patch," but the file is actually a standalone PrometheusRule resource included via the `resources` field in `kustomization.yaml` — it is not a patch of any kind. Changed the description to "as a separate PrometheusRule resource."

3. **Duplicate YAML keys after `bases` → `resources` fix:** The original kustomization.yaml had `bases` and `resources` as separate keys. After renaming `bases` to `resources`, this created duplicate `resources` keys (invalid YAML). Merged both into a single `resources` block listing `../../base` and `custom-rules.yaml`.

## Review Notes
- **Strategic merge patch limitation on CRDs:** The strategic merge patch shown for adjusting the `CephPoolNearFull` threshold may replace the entire `spec.groups` list rather than merging individual groups/rules, because CRDs typically lack the `x-kubernetes-list-map-keys` annotations needed for list merging. In practice, users may need to use JSON 6902 patches (`patchesJson6902`) for surgical modifications to individual alert rules, or include all groups in the strategic merge patch file. This is an inherent Kustomize limitation, not an error in the post's syntax.
- **Remote URL references `master` branch:** The base kustomization references a `raw.githubusercontent.com` URL on the `master` branch, which is fragile. Best practice is to pin to a specific Rook release tag (e.g., `?ref=v1.14.0`).
- **Upstream CephPoolNearFull uses a different expression:** The actual upstream Rook `CephPoolNearFull` alert checks `ceph_health_detail{name="POOL_NEAR_FULL"} > 0` rather than directly querying `ceph_pool_percent_used`. The blog's custom expression is valid but differs from upstream Rook defaults.
