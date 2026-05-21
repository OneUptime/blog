# Validation Summary: How to Roll Back a Failed Istio Upgrade

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Kubernetes
- Helm
- Envoy sidecar proxies
- Kubernetes admission webhooks

## Sources Consulted
- Istio Canary Upgrades: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio Install with Helm: https://istio.io/latest/docs/setup/install/helm/
- Istio Supported Releases, control plane/data plane skew: https://istio.io/latest/docs/releases/supported-releases/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Helm rollback command reference: https://helm.sh/docs/helm/helm_rollback/
- Helm history command reference: https://helm.sh/docs/helm/helm_history/
- Kubernetes kubectl label command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes kubectl rollout command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes kubectl exec command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post said newer sidecar proxies should work with an older control plane for one minor version. Istio's supported skew is the opposite direction: the control plane may be one version ahead of the data plane, but the data plane should not be ahead of the control plane. Updated the data-plane rollback guidance to recommend restarting workloads after the control-plane rollback.
- The canary rollback example set `istio.io/rev=stable` but did not remove `istio-injection`. Istio documents that `istio-injection` takes precedence over `istio.io/rev` on namespaces, so the example now removes `istio-injection` while setting the revision label.
- The webhook emergency section described the broken sidecar injector as blocking pod creation across the whole cluster. Automatic injection is selected by namespace or pod labels, so the wording now scopes the impact to injected namespaces.
- The data-plane restart loop only covered namespaces labeled `istio-injection=enabled`. Added a second loop for namespaces using `istio.io/rev` labels.

## Review Notes
The commands and examples are generally valid for standard Istio sidecar-mode installations. Helm rollback does not remove the need to consider CRDs and cluster-scoped resources separately, which the post already calls out in its CRD rollback section.
