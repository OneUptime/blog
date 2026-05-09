# Validation Summary: How to Troubleshoot Service IP Advertisement with Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes Services
- Kubernetes EndpointSlices
- BGP
- BIRD
- kube-proxy
- iptables
- calicoctl
- kubectl

## Sources Consulted
- Calico documentation: Advertise Kubernetes service IP addresses, https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico documentation: BGPConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico documentation: Configuring calico/node, https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico documentation: Component architecture, https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico documentation: LoadBalancer IP address management, https://docs.tigera.io/calico/latest/networking/ipam/service-loadbalancer
- Kubernetes documentation: EndpointSlices, https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes blog: Kubernetes v1.33 Endpoints deprecation, https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes documentation: kube-proxy reference, https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/

## Issues Found
- The post used `calicoctl get bgpconfiguration` and `calicoctl patch bgpconfiguration`. The Calico documentation uses the `bgpconfig` resource name in these commands, so the examples were updated to match the documented CLI usage.
- The post said service advertisement is handled by `calico-kube-controllers`, not Felix. Calico documentation describes service IP advertisement as BGP configuration consumed by `calico-node` components, where `confd` renders BIRD configuration. The section was corrected to check `calico-node` and its BGP-related logs.
- The post recommended checking `/etc/calico/felix.cfg` when service CIDRs do not appear in BIRD routes. Service advertisement is configured through `BGPConfiguration`, not Felix configuration, so that command was replaced with checks for `bgpconfig` and `calico-node` logs.
- The iptables chain extraction used `awk '{print $3}'` against `iptables -L` output, which selects the protocol column rather than the jump target. The command now uses `iptables -S` and extracts the `KUBE-SVC-*` target after `-j`.
- The endpoint health check used the deprecated Kubernetes Endpoints API. Kubernetes v1.33 deprecates Endpoints in favor of EndpointSlice, so the commands were updated to query EndpointSlices by the `kubernetes.io/service-name` label.
- The troubleshooting flow and conclusion repeated the incorrect kube-controllers claim. They were updated to point at `calico-node`, `confd`, and BIRD.

## Review Notes
The examples assume kube-proxy is running in iptables mode. Clusters using IPVS, nftables, or Calico eBPF service handling need different data-plane inspection commands.
