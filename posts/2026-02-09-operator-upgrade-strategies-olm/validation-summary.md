# Validation Summary: How to Implement Operator Upgrade Strategies with OLM

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Operator Lifecycle Manager (OLM)
- ClusterServiceVersion (CSV)
- OLM Subscriptions and InstallPlans
- File-based catalogs
- Operator SDK
- opm
- Go controller-runtime

## Sources Consulted
- OLM ClusterServiceVersion documentation: https://olm.operatorframework.io/docs/concepts/crds/clusterserviceversion/
- OLM update graph documentation: https://olm.operatorframework.io/docs/concepts/olm-architecture/operator-catalog/creating-an-update-graph/
- OLM channel naming documentation: https://olm.operatorframework.io/docs/best-practices/channel-naming/
- OLM catalog creation documentation: https://olm.operatorframework.io/docs/tasks/creating-a-catalog/
- Operator SDK generate bundle CLI documentation: https://sdk.operatorframework.io/docs/cli/operator-sdk_generate_bundle/
- Operator SDK bundle generation and validation documentation: https://sdk.operatorframework.io/docs/olm-integration/generation/
- Operator SDK run bundle-upgrade CLI documentation: https://sdk.operatorframework.io/docs/cli/operator-sdk_run_bundle-upgrade/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- OperatorHub.io contribution documentation: https://operatorhub.io/contribute

## Issues Found
- The post claimed OLM provides rollback capabilities. OLM does not provide automatic rollback, so the claim was narrowed to structured upgrade paths and dependency management.
- The upgrade path examples used `replaces` and `skips` in a CSV. Current file-based catalog documentation makes catalog channel entries the source of truth for upgrade edges, so those snippets were changed to `olm.channel` examples.
- The update channels example used a Kubernetes-style `Package` resource. That was replaced with file-based catalog `olm.package` and `olm.channel` records.
- The Go migration example was missing imports for `time` and `controller-runtime`, and used lexicographic string comparison for versions. Imports were added and version comparison was changed to semantic version parsing.
- The testing workflow applied CSV files directly and waited with `condition=Succeeded`. It now uses `operator-sdk run bundle` and `operator-sdk run bundle-upgrade`, and waits for `.status.phase` to equal `Succeeded`.
- The rollback-safety Go example used lexicographic version comparison. It now uses semantic version parsing.
- The multi-tenant subscription snippets were missing required package and catalog source fields. Added `name`, `source`, and `sourceNamespace`.
- The publishing workflow used the invalid `operator-sdk bundle create` command and an older index-image flow. It now uses `operator-sdk generate bundle`, `operator-sdk bundle validate`, bundle image build/push, file-based catalog generation, `opm render`, explicit channel entries, `opm validate`, and a matching `CatalogSource`.
- The final `CatalogSource` name did not match the `Subscription` examples. It was aligned to `my-catalog`.

## Review Notes
The post is technically valid after correction. OLM v0 is in maintenance mode and file-based catalogs are the current catalog format in the official OLM documentation; future updates should avoid legacy package-manifest or SQLite index workflows unless explicitly labeled as legacy.
