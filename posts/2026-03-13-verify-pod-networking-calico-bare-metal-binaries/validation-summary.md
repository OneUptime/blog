# Validation Summary: How to Verify Pod Networking with Calico on Bare Metal with Binaries

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Container Network Interface (CNI)
- Calico IPAM
- Felix
- BGP routing
- Linux systemd, journalctl, ip route, and iptables
- BusyBox

## Sources Consulted
- Calico binary install without package manager: https://docs.tigera.io/calico/latest/getting-started/bare-metal/installation/binary
- Calico CNI plugin installation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-cni-plugin
- Calico CNI plugin configuration: https://docs.tigera.io/calico/latest/reference/cni-plugin/configuration
- Calico calicoctl IPAM show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico troubleshooting commands for routing and BGP checks: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico BGP configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- BusyBox wget reference: https://busybox.net/BusyBox.html

## Issues Found
- The post referred to a `calico-node` systemd service. Current Calico binary-install documentation describes running the Felix binary under systemd, with the example service started as `calico-felix`, so the service name and related text were changed to `calico-felix`.
- The introduction and prerequisites implied that all of Calico pod networking runs as one native systemd service. This was adjusted to distinguish Felix running as a service from the Calico CNI plugin binaries that Kubernetes invokes on each node.
- The routing-table check only searched for `proto bird`. Calico troubleshooting examples also show Calico routes using numeric route protocols and overlay interfaces, so the command and explanation were broadened to include `proto 80`, `tunl0`, and `vxlan.calico`.
- The iptables check did not account for privileges or Calico dataplane mode. The command now uses `sudo`, and the surrounding text clarifies that this check applies to the iptables dataplane.
- The egress test used `wget --timeout=5` with a BusyBox image. BusyBox documents `-T SEC` for network read timeout, so the command was changed to `wget -qO- -T 5`.

## Review Notes
The post is technically relevant and remains valid as a verification workflow for an environment that intentionally combines Calico CNI plugin binaries with a systemd-managed Felix binary. Current Calico Kubernetes installation paths more commonly use the operator, manifests, or a DaemonSet, so future updates could clarify the exact installation model and Calico version being assumed.
