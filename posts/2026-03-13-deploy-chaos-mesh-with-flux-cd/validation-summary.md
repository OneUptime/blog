# Validation Summary: How to Deploy Chaos Mesh with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- Helm
- Chaos Mesh
- GitOps
- Chaos engineering

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Chaos Mesh Helm chart repository: https://charts.chaos-mesh.org/
- Chaos Mesh 2.8.2 chart values and CRDs: https://charts.chaos-mesh.org/chaos-mesh-2.8.2.tgz
- Chaos Mesh supported releases: https://chaos-mesh.org/supported-releases/
- Chaos Mesh namespace filtering documentation: https://chaos-mesh.org/docs/configure-enabled-namespace/
- Chaos Mesh PodChaos documentation: https://chaos-mesh.org/docs/simulate-pod-chaos-on-kubernetes/
- Chaos Mesh scheduling documentation: https://chaos-mesh.org/docs/define-scheduling-rules/

## Issues Found
- The prerequisites said Kubernetes 1.24+, which is not accurate for current Flux and Chaos Mesh 2.8.x support. I changed this to require a Kubernetes version supported by the selected Flux CD and pinned Chaos Mesh chart versions.
- The introduction said everything in Chaos Mesh is a CRD. I narrowed this to Chaos Mesh experiments, which is the relevant GitOps-managed surface.
- The HelmRelease used `version: "2.x.x"` while describing a pinned chart. I changed it to the current Chaos Mesh chart version `2.8.2`.
- The namespace filtering explanation referred to namespace labels, but Chaos Mesh FilterNamespace uses the `chaos-mesh.org/inject=enabled` namespace annotation. I corrected the wording.
- The scheduled PodChaos example used a `scheduler` field inside `PodChaos`, which is not the current Chaos Mesh scheduling API. I changed it to a `Schedule` resource with `type: "PodChaos"` and `podChaos`.
- The Flux Kustomization example placed the Flux `Kustomization` manifest as `kustomization.yaml` in the same path it reconciled. That conflicts with Kustomize's reserved `kustomization.yaml` file behavior. I changed the example to put the Flux Kustomization manifest outside the reconciled directories.
- The experiment resources were shown in the same reconciliation path as the Helm install, which can race Chaos Mesh CRD installation. I split the example into install and experiment Kustomizations and added `dependsOn`.
- The verification commands listed and described `podchaos` directly, but the corrected recurring example creates a `Schedule`. I updated the commands to use `schedules` and `schedule`.

## Review Notes
The examples assume containerd and the default containerd socket path. Clusters using Docker, CRI-O, K3s, MicroK8s, or a custom runtime socket need matching `chaosDaemon.runtime` and `chaosDaemon.socketPath` values.
