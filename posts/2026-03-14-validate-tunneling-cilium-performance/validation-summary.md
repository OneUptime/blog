# Validation Summary: Validating Tunneling Performance Issues in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- VXLAN
- Geneve
- Native routing
- iperf3
- netperf
- Linux MTU and fragmentation diagnostics

## Sources Consulted
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Helm Reference: https://docs.cilium.io/en/latest/helm-reference/
- Cilium CLI `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI `config` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config.html
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- iperf3 documentation: https://software.es.net/iperf/
- iputils `ping` manual: https://www.mankier.com/8/ping

## Issues Found
- The Helm example used `tunnel=vxlan` and `tunnel=disabled`, which are not the correct Cilium v1.14+ Helm values. Updated the example to use `routingMode=tunnel`, `tunnelProtocol=vxlan`, and `routingMode=native`.
- The native routing example omitted the native routing CIDR required by Cilium's routing documentation. Added `ipv4NativeRoutingCIDR=$POD_CIDR` and a note to set `POD_CIDR`.
- The Helm upgrade example did not preserve existing values, which could unintentionally reset unrelated Cilium settings. Added `--reuse-values`.
- The fragmentation counter check only inspected one pod from the Cilium DaemonSet while describing cluster-wide validation. Updated it to iterate over all Cilium pods.
- The cross-node validation loop used an undefined `$DST_IP`. Updated it to resolve the destination server pod IP for each destination node.
- The verification command grepped `cilium status --verbose` for fields that are not reliable Cilium CLI status output. Replaced it with `cilium config view` filtered for routing and tunnel settings.
- The performance-node tainting step did not mention that test pods need a matching toleration. Added a short note to prevent the example from leaving test pods unschedulable.

## Review Notes
The remaining commands are environment-dependent examples. They assume the referenced benchmark pods exist with matching names, `iperf3`, `jq`, and `ping` are installed in the relevant containers, and native routing is supported by the underlying network.
