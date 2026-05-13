# Validation Summary: How to Configure Flux Controller Sharding by Namespace

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Flux kustomize-controller
- Kubernetes Deployments
- Kubernetes RBAC
- Kubernetes labels and label selectors
- kubectl

## Sources Consulted
- Flux sharding and horizontal scaling: https://fluxcd.io/flux/installation/configuration/sharding/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Flux releases and Kubernetes supported versions: https://fluxcd.io/flux/releases/
- Flux latest install manifest: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
- Kubernetes labels and selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#label

## Issues Found
- The post described the pattern as if Flux controllers directly watched assigned namespaces. Flux's documented sharding mechanism is label-selector based, so I changed the wording to clarify that "namespace-based" sharding works by consistently labeling Flux resources in those namespaces.
- The prerequisites specified Kubernetes v1.25 or later and Flux CLI v2.0 or later. Current Flux documentation supports only upstream-supported Kubernetes versions and requires CLI/controller compatibility, so I replaced the fixed version claims with release-compatible prerequisites.
- The sample shard Deployments used `ghcr.io/fluxcd/kustomize-controller:v1.4.0`, which is outdated for current Flux examples. I updated the examples to `v1.8.5`, matching the latest Flux install manifest available during review.
- The custom kustomize-controller shard Deployment examples omitted runtime environment variables and health probes present in current Flux manifests. I added `RUNTIME_NAMESPACE`, `GOMEMLIMIT`, the health port, and liveness/readiness probes so the examples align more closely with current controller manifests.
- The main-controller step said to exclude the sharded namespace. The actual selector excludes resources with the shard label, so I corrected that wording.
- The multiple-shards section said shards watch different namespaces. I changed it to say each shard watches a different shard label.

## Review Notes
The examples focus on sharding the kustomize-controller only. If source-controller or helm-controller are also sharded, related Flux resources such as GitRepository, HelmRepository, HelmRelease, and generated HelmChart objects must be labeled consistently, as described in the official Flux sharding guide.
