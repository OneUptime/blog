# Validation Summary: Validate Calico Node Configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- Felix
- calicoctl
- eBPF dataplane
- iptables dataplane
- BGP
- Prometheus metrics

## Sources Consulted
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico eBPF enablement documentation: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico eBPF troubleshooting documentation: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico calico/node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl node reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico MTU configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl debug node documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The eBPF validation command used `calico-node -show-bpf-programs`, which is not a documented Calico eBPF troubleshooting command. Replaced it with the documented BPF startup log check and `calico-node -bpf nat dump`.
- The iptables validation command used an Ubuntu debug container directly. Kubernetes node debug containers access the host filesystem at `/host`, and privileged host operations may require a debug profile, so the command now uses `--profile=sysadmin` and `chroot /host`.
- The Felix policy programming example said it checked each node but executed against a single DaemonSet-selected pod. Changed it to loop over all `calico-node` pods and run `/bin/calico-node -felix-live` in the `calico-node` container.
- The metrics note said `felix_active_local_endpoints` should match the number of pods on the node. Calico documents it as active workload plus host endpoints on the host, so the note was corrected.
- The BGP peer status command was shown as a generic local `calicoctl node status` invocation. Calico documents `calicoctl node` commands as host-side commands that must run directly on the compute host running the Calico node instance, so the example now runs it on the target node via SSH.
- The MTU check used `.spec.mtu`, which is not the FelixConfiguration field for Calico MTU settings. Replaced it with `ipipMTU`, `vxlanMTU`, and `wireguardMTU`, and clarified that unset or `0` means auto-detect for that interface type.

## Review Notes
The examples assume an operator-style Calico installation using the `calico-system` namespace. Manifest-based installations commonly use `kube-system`, so operators may need to adjust the namespace for their environment.
