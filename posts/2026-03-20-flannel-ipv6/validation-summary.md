# Validation Summary: How to Configure Flannel CNI for IPv6 in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Flannel
- CNI
- IPv6
- Dual-stack networking
- VXLAN
- `kubectl`

## Sources Consulted
- Flannel README: https://github.com/flannel-io/flannel
- Flannel configuration reference: https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/configuration.md
- Flannel backend reference: https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/backends.md
- Flannel release manifest (`kube-flannel.yml`): https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
- Kubernetes dual-stack concepts: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes dual-stack validation task: https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- Kubernetes Downward API reference (`status.podIPs` semantics): https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- `kubectl rollout restart` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- `kubectl rollout status` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/

## Issues Found
- The introduction implied that enabling `IPv6Network` and `EnableIPv6` in Flannel was sufficient on its own. I corrected this to state that the Kubernetes cluster and nodes must already be configured for dual-stack, which matches the Kubernetes dual-stack prerequisites and Flannel dual-stack requirements.
- The troubleshooting example for `/run/flannel/subnet.env` used subnet values ending in `.0/24` and `::/64`. Upstream Flannel documents these values as the node-usable addresses with mask, such as `10.244.x.1/24` and `fd00:10:244:x::1/64`, so I fixed the examples.
- The log command did not specify the container. I updated it to `-c kube-flannel` so it targets the main Flannel container in the current upstream DaemonSet manifest.
- The pod IP inspection command printed `.status.podIPs` directly and showed JSON-style expected output. Kubernetes JSONPath prints objects using their string form rather than JSON serialization, so I changed the command to iterate over `.status.podIPs[*].ip` and updated the expected output accordingly.
- The conclusion originally suggested `kubectl get pod -o jsonpath=...` without naming a Pod. Since `kubectl get pod` without a name returns a list, I corrected the command to `kubectl get pod <pod-name> -o jsonpath=...`.
- The IPv6 connectivity test assumed the IPv6 address was always `.status.podIPs[1]`. Kubernetes documents that `.status.podIPs[0]` always matches the primary `podIP`, so the fixed index is not portable across primary-family choices. I changed the command to extract the IPv6 address by filtering the pod IP list.
- The limitations section incorrectly stated that VXLAN is the only IPv6-capable Flannel backend. Current Flannel documentation says dual-stack is supported with VXLAN, WireGuard, and host-gw on Linux, so I corrected that statement.
- The rollout commands used a less explicit resource form. I updated them to the canonical `daemonset/kube-flannel-ds` form documented by the current `kubectl` reference.

## Review Notes
- The sample `Backend` sets a custom VXLAN `Port` of `4789`. Upstream Flannel documents the Linux default as `8472`, but custom ports are supported as long as all nodes use the same configuration and any firewalls allow the chosen UDP port.
- The post now accurately reflects that Flannel dual-stack configuration depends on an already dual-stack-capable Kubernetes cluster and nodes with IPv4 and IPv6 connectivity.
