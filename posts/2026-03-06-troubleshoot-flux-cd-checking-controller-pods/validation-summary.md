# Validation Summary: How to Troubleshoot Flux CD by Checking Controller Pods

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Flux CD
- Kubernetes
- kubectl
- Kustomize patches
- jq
- Kubernetes RBAC
- Kubernetes ephemeral debug containers

## Sources Consulted
- Flux GitOps Toolkit components: https://fluxcd.io/flux/components/
- Flux bootstrap command reference: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux optional components documentation: https://v2-6.docs.fluxcd.io/flux/installation/configuration/optional-components/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux vertical scaling documentation: https://v2-6.docs.fluxcd.io/flux/installation/configuration/vertical-scaling/
- Flux install manifests from latest release: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes controller-runtime healthz implementation: https://github.com/kubernetes-sigs/controller-runtime/blob/main/pkg/healthz/healthz.go

## Issues Found
- The controller arguments example piped JSONPath output into `jq`, but the JSONPath expression emits a non-JSON list. Changed it to fetch the Deployment as JSON and extract `.spec.template.spec.containers[0].args` with `jq`.
- The loop for printing controller arguments used `tr ',' '\n'`, but Kubernetes container args are not emitted as comma-separated values by that JSONPath expression. Changed it to `jq -r '.spec.template.spec.containers[0].args[]'`.
- The health endpoint example used port `8080` and expected a JSON response. Flux controller options and current manifests use port `9440` for health probes, while `8080` is the Prometheus metrics port. The controller-runtime health handler returns plain text `ok` on success, so the port-forward and expected output were corrected.
- The RBAC example described `flux-system-source-controller`, which is not a ClusterRoleBinding in current Flux install manifests. Updated the example to select Flux ClusterRoleBindings by label and describe the `crd-controller` binding.
- The network connectivity examples assumed the Flux controller image includes `wget` and `nslookup`. Updated them to use `kubectl debug` with a network tools image attached to the source-controller pod, matching Kubernetes' recommended debug workflow for containers that may not include troubleshooting tools.

## Review Notes
- The post is technically relevant and contains executable commands and configuration snippets.
- The Flux image automation controllers are optional components, while the default bootstrap components are source-controller, kustomize-controller, helm-controller, and notification-controller.
- `kubectl` was not installed in the local review environment, so CLI behavior was checked against the official generated Kubernetes kubectl reference and official Flux manifests/documentation.
