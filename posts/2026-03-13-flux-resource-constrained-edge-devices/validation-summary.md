# Validation Summary: How to Configure Flux CD for Resource-Constrained Edge Devices

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- Flux GitRepository and OCIRepository APIs
- Flux Kustomization API
- PrometheusRule monitoring
- kubectl and Flux CLI commands

## Sources Consulted
- Flux CLI documentation for `flux bootstrap github`: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux bootstrap customization documentation: https://fluxcd.io/flux/installation/configuration/bootstrap-customization/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes node status documentation for MemoryPressure: https://kubernetes.io/docs/reference/node/node-status/

## Issues Found
- The `flux bootstrap github` command used `--token-env=GITHUB_TOKEN`, which is not listed in the current official Flux CLI documentation. Updated the example to export `GITHUB_TOKEN`, which Flux documents as the environment variable read during GitHub bootstrap.
- The baseline resource example was labeled as a "default installation" while it included image automation controllers, which are optional extra components rather than part of the documented default component set. Updated the label to "installation with image automation enabled."
- The controller patch set `--kube-api-burst` and `--kube-api-qps` on Flux controller deployments, but current official controller option pages do not list those flags. Removed those flags from the controller deployment example.
- The strategic merge patch replaced controller `args`, which could discard default Flux controller arguments. Updated the example so resource limits are patched separately and `--concurrent=2` is appended to `kustomize-controller` using a JSON patch, matching Flux bootstrap customization guidance.
- The OCI memory usage language was too absolute. Reworded it to describe OCI artifacts as potentially more memory-efficient for packaged deployment artifacts, since actual memory usage depends on repository and artifact characteristics.

## Review Notes
The resource usage numbers remain example benchmark values and should be treated as workload-dependent. The PrometheusRule example assumes Prometheus Operator CRDs and node-exporter-style node memory metrics are installed.
