# Validation Summary: How to Use Dapr with Kratix Marketplace

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- Kratix (platform-as-a-product framework)
- Kubernetes (CRDs, Namespaces, Helm)
- yq (YAML processing CLI)
- HelmChart controller (helm.cattle.io)

## Sources Consulted
- Kratix source code and API types at github.com/syntasso/kratix (api/v1alpha1 types)
- Kratix API migration history (commit 3fd01915, July 2023: xaasCrd -> api, workerClusterResources -> dependencies, xaasRequestPipeline -> workflows)
- Kratix Promise reference documentation at https://docs.kratix.io/main/reference/promises/intro
- Kratix Pipeline documentation at https://docs.kratix.io/main/reference/promises/workflows
- Validated sibling post `2026-03-31-dapr-kratix-promise-based-platform` which uses the current Kratix API field names
- Dapr Helm chart repository at https://dapr.github.io/helm-charts/
- Dapr Configuration CRD reference at https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr release policy at https://docs.dapr.io/operations/support/support-release-policy/

## Issues Found

1. **`xaasCrd` field renamed to `api`**: Kratix renamed this field in July 2023. Updated `xaasCrd` to `api` in the Promise YAML and the "Understanding Kratix Promises" explanation section.

2. **`workerClusterResources` field renamed to `dependencies`**: Kratix renamed this field in July 2023. Updated `workerClusterResources` to `dependencies` in the Promise YAML and the "Understanding Kratix Promises" explanation section.

3. **`xaasRequestPipeline` replaced by `workflows` structure**: Kratix restructured the pipeline definition. The old flat array format under `xaasRequestPipeline` was replaced with a nested `workflows.resource.configure` structure that uses Pipeline resources with a `containers` array. Updated the YAML to use the current format and updated the explanation section.

4. **Pipeline paths incorrect**: The pipeline script used `/input/object.yaml` and `/output/` but Kratix uses `/kratix/input/object.yaml` and `/kratix/output/`. Fixed both paths in the pipeline script.

5. **CRD schema missing required fields**: The OpenAPI v3 schema was missing `type: object` at both the root and `spec` levels, and the version entry was missing `served: true` and `storage: true`. These are required by the Kubernetes CRD specification. Added all missing fields.

6. **Dapr Helm chart version outdated**: Version 1.13.0 (March 2024) is no longer supported. Updated to 1.17.4 (April 2026), consistent with the validated sibling post.

7. **Unnecessary `cat` piping in pipeline script**: Changed `cat /input/object.yaml | yq` to `yq '.spec...' /kratix/input/object.yaml` for cleaner usage, consistent with the sibling post's style.

## Review Notes
- The Dapr Helm chart repository URL `https://dapr.github.io/helm-charts/` is correct.
- The Dapr Configuration CRD (`dapr.io/v1alpha1`, kind `Configuration`) with `spec.tracing.samplingRate` and `spec.mtls.enabled` fields is correct and current.
- The Dapr Helm values `global.ha.enabled` and `global.logAsJson` are valid.
- Kratix now uses the term "Destination" rather than "worker cluster" for target environments. The post's use of "worker cluster" is older terminology but not incorrect. Not changed to preserve readability.
- The `helm.cattle.io/v1` HelmChart resource is specific to K3s/RKE2 environments. This is a valid approach but limits portability. Not changed since it is a legitimate choice for the tutorial.
- The Kratix Promise API version `platform.kratix.io/v1alpha1` is correct and current.
