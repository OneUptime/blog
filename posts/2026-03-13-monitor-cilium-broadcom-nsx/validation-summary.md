# Validation Summary: Monitor Cilium with Broadcom NSX Integration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- Broadcom VMware NSX
- Prometheus Operator ServiceMonitor
- eBPF networking observability

## Sources Consulted
- Cilium documentation: Installation on Broadcom VMware ESXi / NSX - https://docs.cilium.io/en/stable/installation/k8s-install-broadcom-vmware-esxi-nsx/
- Cilium documentation: cilium status command reference - https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium documentation: Hubble setup and port-forwarding - https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium documentation: cilium hubble port-forward command reference - https://docs.cilium.io/en/latest/cmdref/cilium_hubble_port-forward/
- Cilium documentation: Monitoring and metrics - https://docs.cilium.io/en/stable/observability/metrics/
- Cilium documentation: Endpoint lifecycle and cilium-dbg endpoint commands - https://docs.cilium.io/en/latest/security/policy/lifecycle/
- Cilium source: Hubble observe command flags and JSON output formats - https://github.com/cilium/cilium/blob/main/hubble/cmd/observe/flows.go
- Cilium Helm chart source: Cilium agent metrics Service and ServiceMonitor values - https://github.com/cilium/cilium/blob/main/install/kubernetes/cilium/templates/cilium-agent/service.yaml
- Kubernetes documentation: kubectl debug command reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Broadcom NSX-T Data Center REST API: ContainerCluster schema - https://developer.broadcom.com/xapis/nsx-t-data-center-rest-api/latest/types_ContainerCluster.html

## Issues Found
- The introduction described a Cilium and NSX "integration" as though NSX directly provides unified policy enforcement with Cilium. Cilium's documentation supports installing Cilium on VMware vSphere with or without NSX, but not a direct NSX/Cilium policy integration. Updated the wording to describe running Cilium on NSX-backed vSphere nodes alongside NSX controls.
- The CiliumNode command comment said to verify "NSX-assigned IPs." CiliumNode exposes Cilium node IPAM and address details, not NSX-assigned pod endpoint IPs. Updated the comment to verify node IPAM/address details against the expected NSX-backed node network.
- The Hubble JSON `jq` example used `.flow.ip.source` and `.flow.ip.destination`. Current Hubble JSON/protobuf output uses `.flow.IP.source` and `.flow.IP.destination`. Updated the field paths.
- The endpoint policy command used `cilium endpoint list` inside a Cilium pod. Current Cilium documentation uses `cilium-dbg endpoint list` for endpoint inspection from the agent context. Updated the command.
- The Hubble dropped-flow comment implied dropped flows indicate NSX DFW blocks. Hubble reports Cilium-observed drops, while NSX DFW drops may occur outside the Cilium datapath. Updated the wording to recommend correlation with NSX DFW events.
- The ServiceMonitor endpoint used `port: prometheus`. The Cilium chart exposes the Service port as `metrics` and uses `prometheus` as the targetPort. Updated the ServiceMonitor to use `port: metrics`.
- The metric comments implied Cilium drop/forward metrics directly identify NSX DFW blocks and cross-segment success. Updated the comments to describe them as Cilium metrics to correlate with NSX events and connectivity tests.

## Review Notes
The post is technically relevant and the remaining examples are environment-dependent placeholders. The ServiceMonitor example assumes Cilium metrics are enabled and a Cilium agent metrics Service exists; Cilium's Helm chart can also create ServiceMonitor resources directly when configured.
