# Validation Summary: How to Handle Shared Libraries in ArgoCD Git Repos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications and multiple sources
- Kubernetes manifests and JSON Patch
- Kustomize remote resources, patches, and components
- Helm library charts and chart dependencies
- Prometheus Operator ServiceMonitor resources
- Renovate custom regex managers
- Git tags for version pinning

## Sources Consulted
- Argo CD documentation: Multiple Sources for an Application - https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD documentation: Helm values files from external repositories - https://argo-cd.readthedocs.io/en/stable/user-guide/helm/
- Helm documentation: Library Charts - https://helm.sh/docs/topics/library_charts/
- Helm documentation: Template Function List - https://helm.sh/docs/chart_template_guide/function_list/
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes kubectl documentation: kubectl kustomize URL support - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- RFC 6902: JavaScript Object Notation (JSON) Patch - https://www.rfc-editor.org/rfc/rfc6902
- Renovate documentation: Custom Manager Support using Regex - https://docs.renovatebot.com/modules/manager/regex/
- Renovate documentation: Configuration Options for customManagers and managerFilePatterns - https://docs.renovatebot.com/configuration-options/
- Renovate documentation: Full Config Presets - https://docs.renovatebot.com/presets-config/
- OKD/OpenShift ServiceMonitor API reference - https://docs.okd.io/4.20/rest_api/monitoring_apis/servicemonitor-monitoring-coreos-com-v1.html

## Issues Found
- The ServiceMonitor Kustomize JSON patch used `replace` for `/spec/selector/matchLabels/app.kubernetes.io~1name`, but the base ServiceMonitor did not contain that key. RFC 6902 requires the target location of a `replace` operation to exist. Changed the patch to replace the existing `matchLabels` map with the service-specific selector.
- The Helm library chart template used nested `.Values.resources.*` and `.Values.healthCheck.path` lookups before applying `default`. These can fail when an intermediate map is omitted. Changed those defaults to use Helm/Sprig `dig` so omitted nested values resolve to the intended defaults.
- The Kustomize component JSON patch added keys under `/spec/template/metadata/annotations` without ensuring that the `annotations` map exists. Changed the patch to add the annotations map with the Prometheus keys.
- The Renovate example used the older `fileMatch` custom manager option. Current Renovate documentation uses `managerFilePatterns`, so the example was updated.
- The Renovate example extended `config:base`, while current Renovate documentation recommends `config:recommended`. Updated the preset.

## Review Notes
- Argo CD multiple sources and external Helm values are accurate for Argo CD 2.6 and later.
- Kustomize components still use the `kustomize.config.k8s.io/v1alpha1` Component API, so the post's alpha-feature caveat is appropriate.
- The sample repository URLs use placeholder organizations and are structurally plausible rather than live resources.
