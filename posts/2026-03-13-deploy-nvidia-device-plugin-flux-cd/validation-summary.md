# Validation Summary: How to Deploy NVIDIA Device Plugin with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Flux CD v2
- Kubernetes
- NVIDIA Kubernetes device plugin
- HelmRelease and HelmRepository custom resources
- Kustomize
- kubectl
- NVIDIA GPU scheduling

## Sources Consulted
- NVIDIA k8s-device-plugin README and Helm chart documentation: https://github.com/NVIDIA/k8s-device-plugin
- NVIDIA k8s-device-plugin Helm repository index: https://nvidia.github.io/k8s-device-plugin/index.yaml
- NVIDIA k8s-device-plugin Helm chart values: https://github.com/NVIDIA/k8s-device-plugin/blob/main/deployments/helm/nvidia-device-plugin/values.yaml
- Flux HelmRelease guide: https://v2-7.docs.fluxcd.io/flux/guides/helmreleases/
- Flux Helm API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Kubernetes GPU scheduling documentation: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Kubernetes Pod lifecycle and Pod conditions documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The introduction claimed the guide covered both HelmRelease and raw DaemonSet approaches, but the post only included the HelmRelease approach. Updated the wording to match the actual content.
- The HelmRelease pinned `nvidia-device-plugin` to `0.14.*`, which is outdated relative to the current NVIDIA Helm repository line. Updated the chart constraint to `0.19.*`.
- The Helm values included `resourceName: "nvidia.com/gpu"`, which is not a supported top-level value in the NVIDIA device plugin chart values. Removed it.
- The `deviceListStrategy: volume-mounts` comments described it as more secure than environment variables, but the NVIDIA documentation only defines it as an alternate device list passing strategy. Reworded the comments and best practice to avoid an unsupported security claim.
- The verification command used `kubectl wait --for=condition=Completed` against a Pod. Kubernetes Pods do not have a built-in `Completed` condition; completion is reflected as the `Succeeded` phase. Updated the command to wait on `.status.phase=Succeeded` with JSONPath.
- The GPU capacity custom-columns JSONPath used unnecessary quoted field syntax. Updated it to the Kubernetes-documented escaped-key form for keys such as `nvidia.com/gpu`.
- The best practice suggested monitoring DaemonSet rollout health with Flux Kustomization health checks, but the Flux Kustomization directly applies a HelmRelease, not the Helm-managed DaemonSet. Updated the wording to monitor HelmRelease rollout health.

## Review Notes
The post assumes GPU drivers and NVIDIA container runtime integration are already configured on the host, which matches the NVIDIA device plugin deployment model. The example uses direct Helm values for global plugin settings; NVIDIA also documents ConfigMap-based plugin configuration as the preferred method for more complex per-node configuration.
