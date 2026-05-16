# Validation Summary: How to Set Up Operator Lifecycle Manager on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Operator Lifecycle Manager (OLM)
- Operator SDK
- OperatorHub.io catalog
- Kubernetes custom resources and CRDs
- kubectl

## Sources Consulted
- Operator Lifecycle Manager QuickStart: https://olm.operatorframework.io/docs/getting-started/
- Operator Lifecycle Manager install documentation: https://operator-framework.github.io/olm-book/docs/install-olm.html
- Operator Lifecycle Manager install operator task: https://olm.operatorframework.io/docs/tasks/install-operator-with-olm/
- Operator Lifecycle Manager architecture documentation: https://olm.operatorframework.io/docs/concepts/olm-architecture/
- Operator Lifecycle Manager OperatorGroup documentation: https://olm.operatorframework.io/docs/concepts/crds/operatorgroup/
- Operator Lifecycle Manager OperatorGroup scoping documentation: https://olm.operatorframework.io/docs/advanced-tasks/operator-scoping-with-operatorgroups/
- Operator SDK installation documentation: https://sdk.operatorframework.io/docs/installation/
- Operator SDK OLM status command reference: https://sdk.operatorframework.io/docs/cli/operator-sdk_olm_status/
- Operator Lifecycle Manager GitHub releases: https://github.com/operator-framework/operator-lifecycle-manager/releases
- OperatorHub.io Prometheus install manifest: https://operatorhub.io/install/prometheus.yaml
- Talos Linux Quickstart: https://www.talos.dev/docs/latest/introduction/quickstart/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The Operator SDK download URL used `v1.33.0`, which is outdated. Updated it to `v1.42.2`, matching the current Operator SDK installation documentation.
- The direct OLM manifest install used `v0.27.0`, which is outdated. Updated it to `v0.38.0`, matching the current OLM release assets.
- The list of OLM CRDs omitted current CRDs created by OLM, including `OLMConfig`, `OperatorCondition`, and `Operator`. Added them to keep the CRD list accurate.
- The PackageManifest examples omitted the `olm` namespace. Updated PackageManifest commands to use `-n olm`, matching OLM quickstart examples for the default OperatorHub catalog.
- The Prometheus Operator example created an extra OperatorGroup in the default `operators` namespace. OLM installs a `global-operators` OperatorGroup there by default, and multiple OperatorGroups in one namespace cause CSV failures with `TooManyOperatorGroups`. Updated the example to create and use a dedicated `monitoring` namespace.
- The namespace creation command was not idempotent. Changed it to render the Namespace YAML with `--dry-run=client -o yaml` and apply it.
- The custom CatalogSource verification command omitted the `olm` namespace for PackageManifest lookup. Added `-n olm`.
- The "Namespace-Scoped Operator" example targeted two namespaces, which is a multi-namespace OperatorGroup. Renamed that heading to "Multi-Namespace Operator".
- The single-namespace OperatorGroup example reused the earlier `monitoring` namespace and would create a second OperatorGroup there if applied. Changed the example namespace to `logging`.
- The monitoring and resource-usage commands checked the `operators` namespace even though the worked example installs the Prometheus Operator in `monitoring`. Updated those commands to use `monitoring`.
- The uninstall example hard-coded `prometheusoperator.v0.65.1`, which is version-specific and stale. Replaced it with commands to list the installed CSV and delete the actual CSV name in the target namespace.

## Review Notes
- OLM behavior is mostly independent of Talos Linux once the Talos Kubernetes cluster is reachable with `kubectl`; no Talos-specific OLM configuration was required.
- The example uses the OperatorHub.io Prometheus package and `beta` channel, which were verified from the current OperatorHub.io install manifest.
- Operators must support the OperatorGroup install mode being used; OLM documents `OwnNamespace`, `SingleNamespace`, `MultiNamespace`, and `AllNamespaces` as separate install modes.
