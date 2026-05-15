# Validation Summary: How to Configure Flux CD Controllers Resource Limits

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize patches
- Flux CLI
- Prometheus / PrometheusRule

## Sources Consulted
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux bootstrap customization documentation: https://fluxcd.io/flux/installation/configuration/bootstrap-customization/
- Flux vertical scaling documentation: https://fluxcd.io/flux/installation/configuration/vertical-scaling/
- Flux install CLI documentation: https://fluxcd.io/flux/cmd/flux_install/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux helm-controller options: https://fluxcd.io/flux/components/helm/options/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Kubernetes resource requests and limits documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Flux latest install manifest from GitHub releases: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml

## Issues Found
- The post stated that without resource limits, Flux controllers can consume unbounded CPU and memory. Current standard Flux install manifests already include default resource requests and limits, so this was changed to explain that tuning may still be needed and that the risk applies when limits are removed or set too high.
- The post said `flux install --export` can patch resources at install time. The command exports install manifests to stdout; it does not patch resources by itself. This was changed to say that you can export the manifests and edit resources before applying them.

## Review Notes
- The Kustomize JSON patch examples are compatible with the current Flux install manifest structure, where controller Deployments have a `resources` field on container index `0`.
- The `--concurrent` flag examples are valid for kustomize-controller, helm-controller, and source-controller according to Flux controller option documentation.
- The local environment did not have `flux` or `kubectl` installed, so CLI verification was performed against official Flux and Kubernetes documentation rather than local `--help` output.
