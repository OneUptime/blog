# Validation Summary: Diagnosing ClusterIP Reachability Errors in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes Services and ClusterIP networking
- kube-proxy
- iptables/IPVS
- Calico eBPF dataplane
- kubectl
- calicoctl

## Sources Consulted
- Calico documentation: Kubernetes services - https://docs.tigera.io/calico-enterprise/latest/network-policy/get-started/about-kubernetes-services
- Calico documentation: Use IPVS kube-proxy - https://docs.tigera.io/calico/latest/networking/configuring/use-ipvs
- Calico documentation: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Troubleshoot eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl node - https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico documentation: calicoctl node diags - https://docs.tigera.io/calico/latest/reference/calicoctl/node/diags
- Calico documentation: calicoctl ipam - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico documentation: FelixConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes documentation: kubectl logs - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes documentation: kubectl run - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: kubectl debug - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: kubectl auth can-i - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes documentation: kubectl top - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/

## Issues Found
- The post described Calico as generally "interfering with service traffic." I changed this to the more precise causes documented by Calico: Calico eBPF service handling issues or network policy blocking traffic to selected backend pods.
- The `calicoctl node status` example implied it could check every node from any location. I clarified that it should be run on the affected node, matching Calico's documentation for node-specific commands.
- The diagnostic bundle command used `calicoctl node diag`, but the documented subcommand is `calicoctl node diags`. I corrected the command and clarified that it runs on the affected node.
- The `kubectl debug node/<name>` troubleshooting example omitted the required debug image for the documented node debugging workflow. I changed it to `kubectl debug node/<name> -it --image=busybox`.
- The `kubectl auth can-i` example combined a specific permission check with `--list`. Kubernetes documents `--list` as a separate mode for listing allowed actions. I replaced it with explicit create and update permission checks for Calico GlobalNetworkPolicy resources.

## Review Notes
The post assumes Calico is installed in the `calico-system` namespace, which is correct for common operator-based installations. Some older or manifest-based deployments may use `kube-system`, so readers may need to adjust namespace arguments for their environment.
