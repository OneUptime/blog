# Validation Summary: Validate Legacy Firewalls with Calico IPAM

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico IPAM and IPPool resources
- Calico encapsulation modes: IP-in-IP and VXLAN
- Calico BGP routing
- Kubernetes pods and kubectl
- Legacy firewall rule validation

## Sources Consulted
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico system and network requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico outgoing NAT documentation: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- `calicoctl get ... -o jsonpath=...` was not valid for current `calicoctl`; the official `calicoctl get` reference lists `yaml`, `json`, `ps`, `wide`, `custom-columns`, `go-template`, and `go-template-file`. Changed those examples to `-o yaml`.
- `kubectl run net-test --image=nicolaka/netshoot -- sleep 3600` passed `sleep 3600` as container args rather than the container command. Changed it to `kubectl run net-test --image=nicolaka/netshoot --command -- sleep 3600`, matching the Kubernetes CLI reference for overriding the command.
- The native routing note implied `Never` always means pure BGP. Changed it to say that no encapsulation requires pod CIDRs to be routed, and that TCP 179 is required when Calico BGP is used for routing.
- The egress firewall summary implied pod CIDRs are always the egress source. Changed it to account for node IPs when Calico outgoing NAT/SNAT is enabled.
- Tightened the Service CIDR note to apply only when the network exposes service IPs directly.

## Review Notes
The post is technically relevant and the remaining commands and claims align with current Calico and Kubernetes documentation. `default-ipv4-ippool` is a common default pool name, but clusters with custom pools should substitute the actual IPPool name from `calicoctl get ippool -o wide`.
