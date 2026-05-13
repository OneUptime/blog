# Validation Summary: How to Configure Flux for Mixed Linux and Windows Node Pools

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- kubectl
- Windows containers
- Linux and Windows Kubernetes node pools
- AKS

## Sources Consulted
- Kubernetes Windows containers user guide: https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes Windows containers overview: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux bootstrap customization documentation: https://fluxcd.io/flux/installation/configuration/bootstrap-customization/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The repository structure example implied that cross-platform workloads typically use Linux because Linux nodes are the default. Kubernetes does not have a Linux scheduling default in mixed OS clusters; without a node selector, a Pod can be scheduled on either Linux or Windows. Updated the example to say cross-platform workloads should choose the target OS explicitly per overlay.
- The Flux controller patch enumerated only four controller Deployments. This can miss optional Flux controllers, such as image automation controllers, when installed. Replaced it with a JSON6902 patch targeted at Flux Deployments by `app.kubernetes.io/part-of=flux`, matching the Flux documentation's recommended customization pattern.
- The Windows workload example presented the toleration as universally required. A toleration is only needed when Windows nodes are tainted, such as with `os=windows:NoSchedule`. Updated the workload comment, best practices, and conclusion to make that condition explicit.
- The Linux workload example still referred to Linux as a default scheduling target. Removed that wording to avoid contradicting Kubernetes mixed-OS scheduling guidance.

## Review Notes
The YAML snippets were parsed successfully with `js-yaml`. Local `kubectl` and `flux` binaries were not installed in the workspace, so command and API validation was performed against official Kubernetes and Flux documentation instead of local `--help` output.
