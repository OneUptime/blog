# Validation Summary: How to Configure GPU Resource Requests in Flux Managed Workloads

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Flux CD
- Kustomize
- NVIDIA Kubernetes device plugin / GPU Operator
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- kubectl
- jq

## Sources Consulted
- Kubernetes documentation: Schedule GPUs - https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Kubernetes documentation: Resource Management for Pods and Containers - https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes documentation: Resource Quotas - https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes documentation: Limit Ranges - https://kubernetes.io/docs/concepts/policy/limit-range/
- Flux documentation: Kustomization API reference v1 - https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux documentation: Kustomization guide - https://fluxcd.io/flux/components/kustomize/kustomizations/
- NVIDIA documentation: NVIDIA Kubernetes device plugin - https://github.com/NVIDIA/k8s-device-plugin
- NVIDIA documentation: GPU Operator GPU sharing - https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/25.3/gpu-sharing.html

## Issues Found
- The introduction said incorrect GPU requests can lead to OOM-killed containers. OOM kills are a memory resource failure mode, not a direct GPU request failure mode, so this was changed to rejected pod specs.
- The scope sentence said the guide covered Flux-managed Deployments and Jobs, but the post only includes a Deployment example. This was changed to Deployments.
- The GPU resource model wording said users must set GPU requests equal to limits. Kubernetes allows GPU limits without explicit requests because the limit is used as the request; when both are set, they must be equal. The explanation was updated to reflect this.
- The ResourceQuota example included `limits.nvidia.com/gpu`. Kubernetes ResourceQuota only supports `requests.` quota keys for extended resources such as `nvidia.com/gpu`, so the invalid limits quota key was removed.
- The best-practice note said Kubernetes ignores GPU requests without matching limits. Kubernetes does not allow GPU requests without limits, so the note was updated to recommend specifying GPU resources in limits or matching requests and limits when both are included.
- The Flux health-check note said scheduling failures surface immediately. Flux reports health-check failures after the configured/default timeout, so the wording was corrected.

## Review Notes
- The YAML examples were parsed locally and are syntactically valid.
- The `LimitRange` example uses min/max constraints for the extended resource. This is technically valid, but teams should test admission behavior in their target Kubernetes version because LimitRange policies apply namespace-wide.
