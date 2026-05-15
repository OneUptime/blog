# Validation Summary: How to Install Flux CD Using Helm Charts

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm
- GitOps Toolkit APIs: GitRepository and Kustomization
- Flux CLI
- Docker/container registries
- Prometheus Operator PodMonitor

## Sources Consulted
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux v2.8 GA release notes: https://fluxcd.io/blog/2026/02/flux-v2.8.0/
- Flux CLI `flux create secret git` documentation: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- fluxcd-community Helm charts repository: https://github.com/fluxcd-community/helm-charts
- fluxcd-community `flux2` chart README and values: https://github.com/fluxcd-community/helm-charts/tree/main/charts/flux2
- fluxcd-community Helm repository index: https://fluxcd-community.github.io/helm-charts/index.yaml

## Issues Found
- The prerequisite line said current Flux v2.8 documentation lists Kubernetes v1.33 or later. This was directionally correct but omitted the current patch-level requirement for Kubernetes v1.34. Updated it to mention that v1.34 requires at least v1.34.1.
- The install verification text said all controllers should reach Running state, but the sample values disable the image reflector and image automation controllers. Updated it to say all enabled controllers should reach Running state.
- The Git authentication section showed an HTTPS secret but the following GitRepository example used an SSH URL. Added a note that HTTPS authentication requires an HTTPS repository URL.
- The uninstall section said Helm does not remove CRDs automatically. The current community `flux2` chart templates CRDs conditionally, so CRDs may be managed by the Helm release. Updated the cleanup comment to say "any remaining CRDs" instead.

## Review Notes
- The community `flux2` chart and chart repository commands are valid as of the current chart index, although the current Flux installation page also shows an OCI install form using `oci://ghcr.io/fluxcd-community/charts/flux2`.
- The chart value keys used in the examples, including controller `create`, `resources`, `container.additionalArgs`, `watchAllNamespaces`, `policies.create`, `logLevel`, and `prometheus.podMonitor.create`, match the current community chart values.
- The `source.toolkit.fluxcd.io/v1` GitRepository and `kustomize.toolkit.fluxcd.io/v1` Kustomization examples use current stable Flux APIs.
