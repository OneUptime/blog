# Validation Summary: Monitor IPv6 Control Plane with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes dual-stack and IPv6 networking
- BGP and BIRD/BIRD6
- calicoctl
- kubectl
- Prometheus and PrometheusRule

## Sources Consulted
- Calico documentation: Configure dual stack or IPv6 only: https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico documentation: Configure Kubernetes control plane to operate over IPv6: https://docs.tigera.io/calico/latest/networking/ipam/ipv6-control-plane
- Calico documentation: calicoctl node status: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: Troubleshooting commands, including BIRD route inspection: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico documentation: BGPPeer resource: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico documentation: IPPool resource: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation: Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Enterprise documentation: BGP metrics, including `bgp_peers` labels: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/bgp-metrics
- Calico API Go documentation for CalicoNodeStatus BGP IPv6 fields: https://pkg.go.dev/github.com/projectcalico/api/pkg/apis/projectcalico/v3
- Calico documentation: View flow logs in Calico Whisker: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Cilium documentation: Hubble is Cilium observability: https://docs.cilium.io/en/stable/observability/hubble/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The prerequisites said nodes need IPv6 addresses on their primary interfaces. Calico's documented requirement is that hosts have IPv6 addresses reachable from the other hosts, so the wording was corrected.
- The IPv6 IPPool command filtered only RFC1918 IPv4 ranges, which could still show public IPv4 pools. It now filters the CIDR column for IPv6 addresses.
- The post referred to BIRD2, but Calico documentation and examples describe Calico's BIRD/BIRD6 daemons. Updated the wording.
- The BIRD detail commands used the default `birdcl` socket, which queries IPv4 BIRD. Updated IPv6 checks to use `/var/run/calico/bird6.ctl`.
- The BIRD IPv6 route command used `show route protocol kernel6`, which is not a portable documented Calico troubleshooting command. Replaced it with `show route` against the BIRD6 socket.
- The BGPPeer grep pipeline matched every `asNumber:` line because YAML key/value lines contain colons. Replaced it with an `awk` range that starts at IPv6 `peerIP` lines.
- The pod IPv6 extraction assumed `.status.podIPs[1]` is always IPv6. Kubernetes pod IP order depends on the cluster's configured primary IP family, so the command now selects the address containing `:`.
- The Prometheus BGP alert used non-documented metrics `felix_bgp_num_node_to_node_peers_established_total` and `felix_bgp_num_node_to_node_peers_total`. Replaced it with the documented Calico BGP metric `bgp_peers{ip_version="IPv6",status!="Established"}` and clarified that the rule applies when BGP metrics are exported.
- The route-install alert used `felix_ipset_errors_total`, but Calico documents `felix_ipset_errors` without `_total`, and IP set errors are not route installation failures. Replaced the alert with `rate(felix_int_dataplane_failures[5m]) > 0`, which matches Felix dataplane failure semantics.
- The best-practices section recommended Hubble, which is Cilium observability rather than Calico. Replaced it with Calico flow logs.

## Review Notes
The examples assume an operator-managed Calico installation using the `calico-system` namespace and BIRD-based routing. Manifest installs may use `kube-system`, and clusters using overlays or eBPF without BGP will need different checks. The Prometheus `bgp_peers` alert requires Calico BGP metrics to be exported; plain Felix metrics alone do not provide that `bgp_peers` metric.
