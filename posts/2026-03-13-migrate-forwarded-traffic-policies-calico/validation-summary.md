# Validation Summary: How to Migrate to Calico Forwarded Traffic Host Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico HostEndpoint
- Calico GlobalNetworkPolicy
- calicoctl
- iptables

## Sources Consulted
- Calico HostEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico applyOnForward reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/forwarded
- Calico forwarded host traffic guide: https://docs.tigera.io/calico/latest/network-policy/hosts/host-forwarded-traffic
- Calico host endpoint object documentation: https://docs.tigera.io/calico/latest/reference/host-endpoints/objects
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calico/node configuration and readiness documentation: https://docs.tigera.io/calico/latest/reference/configure-calico-node

## Issues Found
- The GlobalNetworkPolicy rule matched destination ports without specifying a protocol. Calico port matches require a protocol match, so I added `protocol: TCP` to the ingress allow rule.
- The introduction implied forwarded host policies directly protect both pod traffic and host infrastructure. Calico `applyOnForward` host endpoint policy controls traffic transiting host endpoints and complements workload endpoint policy, so I tightened the wording to describe transiting node traffic and the need for `applyOnForward: true`.
- The implementation applied the HostEndpoint before the policy. Calico starts enforcing on a HostEndpoint after it is created, and host endpoint local traffic defaults to deny without matching policy, so I reordered the commands to apply the GlobalNetworkPolicy first.
- The `calicoctl get` examples used the plural `hostendpoints`. The official `calicoctl get` reference documents `hostEndpoint`, so I changed the examples to use that resource name.

## Review Notes
The examples assume the iptables data plane and a Calico node pod in `kube-system`. Operator-based Calico installs commonly use `calico-system`, and eBPF-mode clusters may require different inspection commands than `iptables -L`.
