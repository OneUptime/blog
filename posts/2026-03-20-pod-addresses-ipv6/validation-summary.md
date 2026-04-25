# Validation Summary: How to Verify IPv6 Pod Addresses in Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- kubectl
- IPv4/IPv6 dual-stack pod networking
- Linux iproute2 and iputils networking tools

## Sources Consulted
- Kubernetes dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes Downward API documentation (`status.podIPs` semantics): https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Kubernetes API reference (`PodStatus.podIPs`): https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.35/
- Kubernetes Node API reference (`NodeSpec.podCIDRs`): https://kubernetes.io/zh-cn/docs/reference/kubernetes-api/cluster-resources/node-v1/
- `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- `ip-address(8)` Linux manual: https://man7.org/linux/man-pages/man8/ip-address.8.html
- `ping(8)` / `ping6(8)` iputils manual: https://manpages.debian.org/unstable/iputils-ping/ping6.8.en.html

## Issues Found
- The introduction incorrectly described `status.podIPs` as part of the pod spec. I corrected this to pod status.
- Several examples treated `kubectl` JSONPath output as JSON arrays. Kubernetes documents that JSONPath results are printed using the object's `String()` representation, so commands like `-o jsonpath='{.status.podIPs}'` do not reliably emit JSON. I replaced those examples with ranged JSONPath expressions that emit only IP values.
- The original `grep ":"` filters and the batch verification script could produce false positives because they were matching JSONPath string formatting rather than just IPv6 addresses. I rewrote those commands so the `grep` checks run only against raw IP output.
- The post used `ping6`. Current `iputils` documents `ping` as the unified command for IPv4 and IPv6, using `-6` to force IPv6. I updated the examples accordingly.
- The expected in-container IPv6 address and route output were too CNI-specific. Prefix lengths, interface details, and route layout vary by CNI plugin, so I replaced those lines with accurate CNI-agnostic guidance.
- The Calico log example now uses `--all-pods=true` so it inspects the whole DaemonSet during troubleshooting.

## Review Notes
- The in-container checks assume the image includes `ip` and `ping`. Minimal images often do not, so operators may need a debug container or toolbox image.
- ICMP tests can fail because of network policy or missing tooling even when IPv6 assignment itself is correct.
- Interface names, prefix lengths, and IPv6 route layout inside Pods are implementation-specific and depend on the CNI plugin.
