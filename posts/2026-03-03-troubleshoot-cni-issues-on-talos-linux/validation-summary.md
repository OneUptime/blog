# Validation Summary: How to Troubleshoot CNI Issues on Talos Linux

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Container Network Interface (CNI)
- Cilium
- Calico
- Flannel
- CoreDNS
- Helm

## Sources Consulted
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli
- Talos Linux networking resources: https://docs.siderolabs.com/talos/v1.9/learn-more/networking-resources/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico troubleshooting and diagnostics: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico calicoctl IPAM command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show

## Issues Found
- Corrected the node readiness wording from `NetworkReady: False` to Kubernetes node `Ready: False` with `NetworkPluginNotReady` or `network plugin is not ready`, which better matches kubelet and node condition output.
- Added the `kube-system` namespace as an alternate location for Calico `calico-node` pods because manifest-based installs can use it instead of `calico-system`.
- Updated in-pod Cilium diagnostic commands from `cilium` to `cilium-dbg` and specified the `cilium-agent` container, matching current Cilium troubleshooting guidance.
- Corrected the Calico IPPool block size explanation: `blockSize: 24` is a larger IPv4 allocation block than the default `/26`, not a smaller one.
- Fixed the same-node connectivity test so it pings a second pod on the same node instead of pinging the source pod's own IP.
- Replaced `talosctl routes` with `talosctl get routes`, which is the Talos resource command for route status.
- Clarified overlay and encryption ports by CNI: Calico VXLAN uses UDP 4789, Cilium VXLAN uses UDP 8472, Cilium WireGuard uses UDP 51871, and Calico WireGuard defaults to UDP 51820/51821.
- Updated the Calico health check command from the unsupported `-felix-live` form to the readiness command shown in Calico manifests, `calico-node -bird-ready -felix-ready`.
- Replaced the invalid shell placeholder `[your-values]` in the Helm install command with a valid command and a comment telling readers to add values or `--set` flags as needed.

## Review Notes
Several commands are installation-dependent, especially Calico namespace placement, Cilium Helm values, and whether `calicoctl node status` can run from the operator's workstation. The post now notes the most important namespace variation, but future improvements could add short caveats for environments using Cilium native routing, Calico eBPF mode, or custom service CIDRs.
