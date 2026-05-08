# Validation Summary: Validate Calico NetworkSet Resource

## Status
validated

## Post Type
Tutorial / operational validation guide

## Technologies Covered
- Calico NetworkSet and GlobalNetworkSet resources
- Calico NetworkPolicy and GlobalNetworkPolicy selectors
- Calico Felix dataplane programming
- Kubernetes `kubectl debug`, `kubectl run`, and `kubectl exec`
- `calicoctl`
- Linux `ipset`
- Python `ipaddress`

## Sources Consulted
- Calico Open Source NetworkSet resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkset
- Calico Open Source GlobalNetworkSet resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkset
- Calico `calicoctl get` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico GlobalNetworkPolicy resource reference and selector semantics: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico FelixConfiguration reference for dataplane and ipset refresh behavior: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes `kubectl debug` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes `kubectl run` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Project Calico Felix `ipsets` package documentation for generated ipset names: https://pkg.go.dev/github.com/projectcalico/felix/ipsets
- Netshoot project documentation for included `ipset` tooling: https://github.com/nicolaka/netshoot

## Issues Found
- The post described Felix as programming IP sets "into the kernel" in all cases. I changed this wording to "dataplane" because Calico supports multiple dataplanes, and direct `ipset` inspection is specifically relevant to the standard Linux iptables dataplane.
- The node debug command used `ubuntu` and ran `ipset` without accounting for missing tooling or privileges. I changed it to use `kubectl debug` with `--profile=sysadmin` and the `nicolaka/netshoot` image, which includes `ipset`.
- The example assumed a literal ipset name of `cali-s:management-hosts`. Calico generates dataplane ipset names and may truncate them, so I changed the guidance to search for Calico-owned ipsets and for expected IP/CIDR entries instead of assuming the resource name appears directly.

## Review Notes
The remaining commands are structurally correct for Calico resources and Kubernetes debugging workflows, but some examples remain environment-specific: Calico namespace, node name, policy labels, dataplane mode, and test IPs must match the target cluster. For nftables or eBPF dataplanes, the direct `ipset list` check should be replaced with dataplane-specific inspection or end-to-end traffic tests.
