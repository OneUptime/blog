# Validation Summary: How to Scale OpenStack Connectivity with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenStack
- Project Calico
- Calico Felix
- Calico BGP and route reflectors
- calicoctl
- Linux conntrack sysctls
- Prometheus

## Sources Consulted
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico OpenStack system requirements: https://docs.tigera.io/calico/latest/getting-started/openstack/requirements
- Calico BGP peering and route reflector documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico BGPPeer resource reference and selector syntax: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico Node resource reference: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Project Calico API reference for FelixConfiguration fields: https://pkg.go.dev/github.com/projectcalico/api/pkg/apis/projectcalico/v3
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico eBPF dataplane installation requirements: https://docs.tigera.io/calico/latest/operations/ebpf/install
- calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl node status command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Linux kernel conntrack sysctl reference: https://docs.kernel.org/5.17/networking/nf_conntrack-sysctl.html

## Issues Found
- The BGPPeer example used `nodeSelector: "!route-reflector == 'true'"`. Calico selectors support negation, but the documented and clearer non-match form for a label value is `route-reflector != 'true'`, so the selector was updated.
- The Felix eBPF comment said kernel 5.3+ was required. Current Calico Open Source documentation lists 5.10+ for the base eBPF dataplane on supported distributions, with RHEL backports as an exception, so the comment was corrected.
- The `bpfConntrackTimeouts.tcpEstablished` value was an unqualified integer. Calico documents these timers as durations or `Auto`, so it was changed to `2h`.
- The FelixConfiguration example used `datastoreConnectionTimeout`, which is not a current Project Calico FelixConfiguration API field. It was replaced with the documented `netlinkTimeout` field, and the comment was updated to describe kernel netlink operations.
- The BPF conntrack tuning comment did not make clear that `bpfConntrackTimeouts` applies to the BPF dataplane. The comment now states that it is used only when `bpfEnabled` is true.
- The monitoring example used a Kubernetes Prometheus Operator `ServiceMonitor` selecting `k8s-app: calico-node`, which is not appropriate for an OpenStack compute-node deployment. It was replaced with a Prometheus `scrape_configs` example using static Felix metrics targets.
- The metric checks referenced `felix_iptables_save_time` and `felix_route_table_update`, which are not listed in current Felix metrics documentation. They were changed to documented metrics: `felix_iptables_save_calls` and `felix_route_table_list_seconds`; the troubleshooting note was updated to match.
- The verification script used `calicoctl get nodes -l route-reflector=true -o wide`, but the current `calicoctl get` reference does not document a `-l` selector flag. It was changed to use the documented Go template output support.
- The verification script used `calicoctl get nodes -o name` and ran `calicoctl node status` locally inside a loop, which would not produce per-node BGP status. It now uses documented Go template output to list nodes and runs `calicoctl node status` over SSH on each node.

## Review Notes
The post is technically relevant and salvageable. Route reflector examples, BGPConfiguration usage, core OpenStack architecture claims, conntrack sysctls, and `calicoctl node status` usage align with the consulted documentation. In a production OpenStack environment, the exact Prometheus target discovery mechanism and conntrack sizing should still be adapted to the deployment's host inventory, kernel defaults, traffic profile, and automation system.
