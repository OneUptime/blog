# Validation Summary: How to Migrate from Istio Operator to Helm-Based Installation

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Istio
- Istio in-cluster Operator
- Kubernetes
- Helm
- Istio control plane revisions
- Istio custom resources

## Sources Consulted
- Istio in-cluster operator deprecation announcement: https://istio.io/latest/blog/2024/in-cluster-operator-deprecation-announcement/
- Istio install with Helm documentation: https://istio.io/latest/docs/setup/install/helm/
- Istio upgrade with Helm documentation: https://istio.io/latest/docs/setup/upgrade/helm/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Helm chart values and templates from the official chart repository: https://istio-release.storage.googleapis.com/charts
- Helm install command reference: https://helm.sh/docs/helm/helm_install/
- Helm upgrade command reference: https://helm.sh/docs/v3/helm/helm_upgrade/

## Issues Found
- Clarified that the deprecated component is the in-cluster Istio Operator, not all use of IstioOperator YAML. Istio's announcement explicitly scopes the deprecation to the in-cluster operator workflow.
- Changed the backup command from claiming to export all Istio custom resources with a short alias list to exporting a broader explicit set of common Istio resources, including AuthorizationPolicy, Telemetry, and WasmPlugin.
- Corrected the Helm base chart migration guidance. Helm does not automatically adopt existing CRDs; the guide now uses `--take-ownership` and provides the official label/annotation fallback for existing Istio CRDs.
- Added `--set revision=helm` to the gateway install command so the gateway is tied to the Helm-managed revision.
- Updated the control plane verification command to show the `istio.io/rev` label.
- Replaced `istioctl operator remove` with current Kubernetes cleanup commands for the in-cluster operator deployment and IstioOperator CRD.
- Reworked the manual adoption example to avoid incorrectly labeling the `istio` ConfigMap for a revisioned `istiod-helm` release, since revisioned istiod charts render revision-specific resources such as `istio-helm`.
- Added revision/defaultRevision settings to future `helm upgrade` and `helm diff` commands so later upgrades preserve the revisioned installation.

## Review Notes
Local `istioctl`, `helm`, and `kubectl` binaries were not installed in the workspace, so command validation was performed against official documentation and the official Istio Helm chart contents fetched from the Istio chart repository.
