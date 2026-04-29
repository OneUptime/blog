# Validation Summary: How to Replace Flannel with Calico in K3s

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Calico
- Flannel
- Kubernetes NetworkPolicy
- Calico GlobalNetworkPolicy
- BGP
- eBPF

## Sources Consulted
- K3s Basic Network Options: https://docs.k3s.io/networking/basic-network-options
- K3s Networking Services: https://docs.k3s.io/networking/networking-services
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Stopping / Killall Script: https://docs.k3s.io/upgrades/killall
- K3s Server CLI: https://docs.k3s.io/cli/server
- K3s Agent CLI: https://docs.k3s.io/cli/agent
- K3s Cluster Access: https://docs.k3s.io/cluster-access
- Calico Quickstart for K3s: https://docs.tigera.io/calico/latest/getting-started/kubernetes/k3s/quickstart
- Calico On-Premises Installation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico Installation API Reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico CNI Plugin Configuration: https://docs.tigera.io/calico/latest/reference/cni-plugin/configuration
- Calico Install calicoctl: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico BGP Configuration: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGP Peer: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico Configure BGP Peering: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico eBPF Installation: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico Enable eBPF on an Existing Cluster: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico Component Versions: https://docs.tigera.io/calico/latest/reference/component-versions

## Issues Found
- The original introduction and comparison table implied that Flannel in K3s provides no NetworkPolicy support at all. This was corrected to distinguish Flannel itself from K3s's separate built-in network policy controller.
- The post pinned Calico `v3.27.0`, which is outdated relative to the current official docs consulted during validation. The manifest, operator, and `calicoctl` references were updated to `v3.31.5`.
- The operator install path was incomplete for current Calico releases because it omitted `operator-crds.yaml`. The install commands were updated to match the current operator flow.
- The post missed the K3s-specific requirement to enable container IP forwarding in the Calico CNI configuration. `containerIPForwarding: Enabled` was added to the operator example, and the manifest example now adds `container_settings.allow_ip_forwarding`.
- The `calicoctl` install used `latest/download`, which can drift away from the cluster version and break compatibility. It is now pinned to the same Calico version as the manifests, and the required `DATASTORE_TYPE` and `KUBECONFIG` settings were added for K3s.
- The agent-node example incorrectly set `flannel-backend` in the agent config even though Flannel backend settings are server-side in K3s. That line was removed.
- The NetworkPolicy example would not have worked as written: it default-denied both ingress and egress, used port `8080` against an `nginx` backend that listens on `80`, and the validation commands attempted to reach a pod by name without creating a Service. The policy and verification examples were corrected.
- The eBPF section treated K3s kube-proxy like a Kubernetes DaemonSet, which is incorrect for K3s. The section now documents the K3s prerequisites and uses the current Calico operator patch fields instead of the invalid DaemonSet patch.
- The migration section did not account for K3s network-policy cleanup and stale Flannel state on existing nodes. It was updated to use `k3s-killall.sh`, refresh current Calico URLs, and clarify server-versus-agent restart flow.

## Review Notes
- The eBPF section remains intentionally brief because K3s adds control-plane networking prerequisites beyond a standard kubeadm-style cluster. The corrected version now reflects those prerequisites instead of presenting a misleading one-command switch.
- The operator example uses VXLAN for the default IP pool. The post now explicitly notes that this does not use BGP and that BGP-oriented deployments should choose `encapsulation: None` or `IPIPCrossSubnet` instead.
