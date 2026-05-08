# Validation Summary: Validate Cilium on k0s with k0sctl

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- k0s
- k0sctl
- Helm
- eBPF kube-proxy replacement

## Sources Consulted
- Cilium official k0s/k0sctl installation guide: https://docs.cilium.io/en/stable/installation/k0s/
- Cilium official Kubernetes without kube-proxy guide: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium official Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium CLI command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI command reference for `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- k0s official configuration reference for v1.29.3+k0s.0: https://docs.k0sproject.io/v1.29.3+k0s.0/configuration/
- k0s official Helm Charts documentation: https://docs.k0sproject.io/head/helm-charts/
- k0sctl official README: https://github.com/k0sproject/k0sctl
- Kubernetes official `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The sample enabled Cilium `kubeProxyReplacement: true` but did not disable k0s kube-proxy. Added `spec.network.kubeProxy.disabled: true`, matching Cilium's k0s guidance and k0s' configuration reference.
- The sample used older example versions (`k0s` 1.29.3 and Cilium 1.15.5). Updated them to a compatible newer example pair, `k0s` 1.34.4 and Cilium 1.19.2, based on current Cilium requirements and Cilium's current k0s guide.
- The post referred to a `HelmChart` resource and used `kubectl get helmcharts`; k0s creates `helm.k0sproject.io/v1beta1` `Chart` resources. Updated the wording and command to `kubectl -n kube-system get charts.helm.k0sproject.io`.
- The BusyBox DNS test created a short-lived pod and then immediately called `kubectl logs`, which can be timing-sensitive. Replaced it with `kubectl run --rm -i ...`, which attaches and removes the pod as supported by `kubectl run`.
- The best-practice note said to use k0sctl's `--dry-run` flag generically. Clarified the intended command as `k0sctl apply --dry-run`.

## Review Notes
The remaining commands are valid validation checks, but the `k8sServiceHost` value must be adjusted to the reachable Kubernetes API endpoint for the user's cluster, especially in multi-controller or load-balanced deployments.
