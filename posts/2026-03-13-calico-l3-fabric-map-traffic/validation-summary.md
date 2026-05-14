# Validation Summary: How to Map L3 Interconnect Fabric with Calico to Real Kubernetes Traffic

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source networking
- Kubernetes pod networking
- BGP routing
- BIRD routing daemon
- Linux routing table and dataplane
- Source NAT for pod egress
- `kubectl`, `birdcl`, `ip route`, and `tcpdump`

## Sources Consulted
- Calico documentation: Component architecture, including Felix and BIRD responsibilities: https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico documentation: Configure BGP peering: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: Determine best networking option: https://docs.tigera.io/calico/latest/networking/determine-best-networking
- Calico documentation: Configure outgoing NAT: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico documentation: IP address management and IPAM blocks: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico documentation: IP pool block sizes and route aggregation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- BIRD User's Guide: `show route export` command behavior: https://bird.nic.cz/doc/bird-3.0.3.html
- Kubernetes documentation: `kubectl run` generated reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Local `ip route help` and `/etc/iproute2/rt_protos` output for route selector syntax and `bird` protocol name support.

## Issues Found
- The post described Felix as translating BGP-learned routes into Linux routes. Updated the diagrams and pipeline to reflect Calico's documented responsibilities: Felix programs local workload routes and policy, while BIRD distributes routes via BGP and BGP-learned routes appear in the Linux routing table as `proto bird`.
- The packet-flow diagrams implied that Felix processes each packet directly. Updated the diagrams to label per-packet forwarding, filtering, and SNAT as Linux dataplane behavior using Felix-programmed rules.
- The introduction described BGP mode as always non-overlay. Qualified this as "non-overlay L3 BGP mode" because Calico BGP and encapsulation settings are separate configuration choices.
- The route-observation section expected a newly created pod IP to appear directly in the BIRD route table. Updated it to focus on new Calico IPAM block or route creation because Calico commonly aggregates pod addresses into IPAM blocks, such as `/26` for IPv4 by default.
- The post claimed Calico BGP convergence is typically less than one second for new pod routes in small clusters. Replaced this with a topology-dependent statement because the exact convergence time depends on BGP topology, peer configuration, and whether a new route is advertised.
- The conclusion stated BGP native routing is the preferred on-premises mode. Softened this to "a common choice" to avoid an unsupported universal recommendation.

## Review Notes
The remaining commands and examples are plausible for a Calico BGP deployment, but several are environment-specific: `birdcl` must be available in the `calico-node` container, the namespace and labels must match the installation, and router CLI syntax varies by vendor. `kubectl` was not installed in the local review environment, so its syntax was checked against Kubernetes official documentation rather than local help.
