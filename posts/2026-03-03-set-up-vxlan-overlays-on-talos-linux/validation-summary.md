# Validation Summary: How to Set Up VXLAN Overlays on Talos Linux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- VXLAN
- Kubernetes CNI
- Flannel
- Calico
- Cilium
- Linux iproute2 networking commands
- Kubernetes debug pods and DaemonSets

## Sources Consulted
- RFC 7348: Virtual eXtensible Local Area Network (VXLAN): https://www.rfc-editor.org/rfc/rfc7348
- Talos Linux MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux Flannel CNI guide: https://docs.siderolabs.com/kubernetes-guides/cni/flannel
- Talos Linux Cilium CNI guide: https://docs.siderolabs.com/kubernetes-guides/cni/deploying-cilium
- Talos Linux ingress firewall guide: https://docs.siderolabs.com/talos/v1.12/networking/ingress-firewall/
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium routing and encapsulation documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Flannel backend documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md
- Linux ip-link manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/#debugging-via-a-shell-on-the-node

## Issues Found
- The Cilium Helm example used the older `tunnel=vxlan` value and omitted Talos-specific Cilium settings. Changed it to `tunnelProtocol=vxlan` and added the Talos-documented capability and cgroup settings.
- The post stated VXLAN uses UDP 4789 everywhere. Updated this to clarify that 4789 is the standard/default VXLAN port, while CNI implementations can differ, with Cilium using UDP 8472 by default.
- The firewall guidance only mentioned UDP 4789. Updated it to include Talos-documented CNI defaults: UDP 4789 for Flannel/Calico and UDP 8472 for Cilium.
- The custom CNI URL pointed to a nonexistent Cilium `quick-install.yaml` URL. Replaced it with a valid Flannel manifest URL.
- The manual machine file section implied that a systemd-networkd `.netdev` file would create a VXLAN device on Talos. Updated the text to state that Talos does not run systemd-networkd, so placing that file alone will not create the interface.
- The Talos `machine.files` permission value used `0644`. Updated it to `0o644`, matching Talos configuration examples.
- The MTU troubleshooting note said that `1400` working while `1450` failed meant the MTU was configured correctly. Corrected it to say that this indicates the path MTU is lower than the larger test packet.

## Review Notes
The manual VXLAN DaemonSet is a conceptual example and still requires adapting interface names, node addressing, IP allocation, and multicast support for a real environment. The post now calls out the main Talos-specific caveat, but a production-ready manual overlay would need a stronger control-plane mechanism for VTEP discovery and address management.
