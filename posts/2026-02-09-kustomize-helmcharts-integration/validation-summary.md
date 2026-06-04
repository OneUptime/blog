# Validation Summary: How to use Kustomize helmCharts for integrating Helm with Kustomize

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kustomize
- Helm
- Helm charts
- YAML configuration

## Sources Consulted
- Kustomize helmCharts reference: https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/site/content/en/docs/Reference/API/Kustomization%20File/helmCharts.md
- Kustomize Helm chart example: https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/examples/chart.md
- Kustomize HelmChart and HelmGlobals API types: https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/api/types/helmchartargs.go
- Kustomize Kustomization API types and deprecation warnings: https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/api/types/kustomization.go
- Kubernetes kubectl kustomize command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Helm values files documentation: https://helm.sh/docs/v3/chart_template_guide/values_files/
- Bitnami Redis chart documentation: https://github.com/bitnami/charts/blob/main/bitnami/redis/README.md

## Issues Found
- The post said `kustomize build` would inflate Helm charts automatically without Helm installed. Updated it to use `kustomize build --enable-helm` and clarify that Helm v3 must be installed because Kustomize runs Helm as a subprocess.
- The values-file section claimed multiple values files could be combined but did not show the correct Kustomize field. Added `additionalValuesFiles` and clarified how files and `valuesInline` are combined.
- The Redis patch targeted a `Deployment`, but the Bitnami Redis chart deploys the master as a `StatefulSet` by default. Updated the target kind and surrounding explanation.
- The local chart example used `chartHome` under an individual `helmCharts` entry and described chart archives. Updated it to use `helmGlobals.chartHome` and describe an unpacked local chart directory.
- The environment overlay example implied Kustomize merges partial `helmCharts` entries from overlays into base chart definitions. Reworked the example to define the chart in the base and use an overlay patch against the rendered output.
- The examples used deprecated `bases` and `commonLabels` fields. Replaced them with `resources` and `labels` respectively.
- The troubleshooting section used `kustomize build` without Helm enablement. Updated it to `kustomize build --enable-helm`.

## Review Notes
The pinned chart versions are valid as historical examples, but they may become stale for real deployments. Production workflows should vendor or otherwise control remote charts rather than depending on remote chart repositories at build time.
