# Validation Summary: How to Verify Pod Networking with Calico on Bare Metal with Containers

## Status
validated

## Post Type
Tutorial / verification guide

## Technologies Covered
- Kubernetes
- Calico
- Calico BGP networking
- Calico IPAM
- `kubectl`
- `calicoctl`
- Linux routing
- `iperf3`

## Sources Consulted
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico BGP peering: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico IP pool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico `TigeraStatus` reference: https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- Calico `calico/node` configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- iperf3 documentation: https://software.es.net/iperf/invoking.html

## Issues Found
- The introduction stated that bare metal Calico routing depends on BGP sessions with physical switches. Calico can use node-to-node mesh, route reflectors, or top-of-rack routers, and BGP may be disabled for overlay-only designs. Updated the wording and prerequisites to scope the guide to BGP-enabled Calico.
- The Calico namespace and `TigeraStatus` checks were written as if they apply to every install. Calico documentation distinguishes operator-based `calico-system` installs from manifest-based `kube-system` installs, and `TigeraStatus` is operator-managed. Added that caveat.
- The `kubectl run ... -- sleep 3600` examples passed `sleep 3600` as container args rather than the command. Added `--command` so the generated pod explicitly runs `sleep 3600`.
- Step 4 was labeled as intra-node communication even though the pods are scheduled on different worker nodes. Renamed it to cross-node communication.
- The routing-table check assumed pod routes begin with `10.`. Calico's default pool may use other CIDRs, and official troubleshooting examples identify Calico BGP-learned routes with `bird`. Replaced the CIDR-specific grep with `grep bird`.
- The BGP next-hop explanation was too specific to one physical-switch topology. Updated it to describe topology-dependent next hops.
- The iperf3 server command started a persistent server in the background. Added `-1` so the server exits after a single test, matching iperf3's documented one-off mode.
- The throughput statement gave a fixed 5-9 Gbps expectation for 10GbE. Reworded it to avoid over-promising because actual results depend on host, NIC, MTU, CPU, policy, and offload settings.
- The conclusion described BGP and routing checks as unique to bare metal. Updated it to say they are especially important in bare metal environments.

## Review Notes
The commands are now technically valid for a BGP-enabled Calico deployment. Future improvements could include a cleanup step for the test pods and an explicit note that network policy may block ICMP, curl, or iperf3 traffic in clusters with restrictive policies.
