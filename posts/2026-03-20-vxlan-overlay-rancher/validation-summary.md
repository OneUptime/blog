# Validation Summary: How to Configure VXLAN Overlay in Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher (v2.7+)
- Kubernetes networking
- CNI (Container Network Interface) plugins
- VXLAN overlay networking
- Calico CNI
- NetworkPolicy (networking.k8s.io/v1)
- Prometheus Operator (PrometheusRule CRD)
- kubectl
- netshoot / busybox debugging images

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- CNI specification: https://github.com/containernetworking/cni/blob/main/SPEC.md
- Calico node status / calicoctl reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico node binary flags: https://github.com/projectcalico/calico/tree/master/node
- Prometheus Operator PrometheusRule CRD: https://prometheus-operator.dev/docs/user-guides/alerting/
- netstat(8) manual page (net-tools)
- kubectl run / exec reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Rancher networking docs: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-clusters/use-windows-clusters/enabling-vxlan
- CNI config standard layout: /etc/cni/net.d/ (per kubelet/CNI spec)

## Issues Found
1. `calico-node -show-status` (Steps 5 and 7): No such flag exists on the `calico-node` binary. The canonical command for viewing node/BGP status is `calicoctl node status`. Changed both occurrences to `calicoctl node status`.
2. `netstat -tunapl` (Step 5): The `-a` (show all sockets) and `-l` (show only listening) flags are mutually contradictory in `netstat` from net-tools. Changed to `netstat -tunap`, which is the commonly used combination for showing all TCP/UDP connections with processes.
3. Conclusion: The phrase "How to Configure VXLAN Overlay in Rancher configuration in Rancher" contained a duplicated "in Rancher" fragment resulting from templated title substitution. Reworded to "VXLAN overlay configuration in Rancher".

## Review Notes
- The post title promises a VXLAN-specific tutorial, but the CNI ConfigMap example uses a placeholder plugin type (`main-cni-plugin`) rather than a real VXLAN-capable backend (e.g., Flannel with `"Type": "vxlan"` backend, Calico with `vxlanMode: Always`, or Cilium with `tunnel: vxlan`). The generic CNI configuration is syntactically valid against the CNI spec, but would not actually configure VXLAN on its own. Readers should substitute their chosen CNI plugin's VXLAN configuration.
- `cniVersion: "0.4.0"` is valid per the CNI spec; current plugins often use `1.0.0` but 0.4.0 remains widely supported.
- The NetworkPolicy example is syntactically correct against the `networking.k8s.io/v1` API.
- The PrometheusRule in Step 6 is syntactically valid for the `monitoring.coreos.com/v1` CRD shipped by Prometheus Operator / Rancher's cattle-monitoring-system.
- `kubectl run ... --rm -it --restart=Never` is the standard pattern for ephemeral debug pods and is correct.
- `journalctl -u kubelet --since "1 hour ago" | grep -i cni` is a valid way to surface CNI-related events from the kubelet.
- The post is quite generic for its stated topic; a future revision could meaningfully improve value by showing a concrete Flannel VXLAN or Calico VXLAN backend configuration.
