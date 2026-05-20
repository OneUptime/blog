# Validation Summary: Understanding ArgoCD Application Source Types

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications
- Kubernetes manifests
- Helm charts and Helm repositories
- Kustomize overlays
- Jsonnet
- Argo CD Config Management Plugins
- Argo CD multi-source Applications

## Sources Consulted
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Directory source documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/directory/
- Argo CD Tool Detection documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/tool_detection/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Jsonnet documentation: https://argo-cd.readthedocs.io/en/release-2.6/user-guide/jsonnet/
- Argo CD Multiple Sources documentation: https://argo-cd.readthedocs.io/en/release-3.1/user-guide/multiple_sources/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/config-management-plugins/

## Issues Found
- The Kustomize detection section said Argo CD detects a file named `Kustomize`. Official Argo CD tool detection documents `kustomization.yaml`, `kustomization.yml`, or `Kustomization`. Changed `Kustomize` to `Kustomization`.
- The custom plugin example said to define the plugin in a ConfigMap or sidecar. Legacy `argocd-cm` plugin installation was deprecated and removed in modern Argo CD; current CMPs are installed through repo-server sidecars, optionally with plugin configuration mounted from a ConfigMap. Changed the example comment to say the plugin is defined in a sidecar.

## Review Notes
The examples use valid Argo CD Application fields for directory, Helm, Kustomize, Jsonnet, plugin, and multi-source configurations. Multi-source Applications should generally stay limited to closely related sources such as an external Helm chart plus Git-hosted values; the official docs caution against using `sources` as a generic grouping mechanism for unrelated applications.
