# Validation Summary: Validate Cilium Fragment Handling

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- IP fragmentation
- MTU and path MTU discovery
- Linux `ping`
- iperf3

## Sources Consulted
- Cilium Fragment Handling documentation: https://docs.cilium.io/en/latest/network/concepts/fragmentation.html
- Cilium `cilium-agent` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-agent/
- Cilium `cilium-dbg bpf frag list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_frag_list.html
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium troubleshooting documentation for `cilium-dbg monitor --type drop`: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium routing and encapsulation MTU documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics.html
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Linux `ping(8)` manual: https://www.man7.org/linux/man-pages/man8/ping.8.html
- iperf3 documentation: https://software.es.net/iperf/

## Issues Found
- The description referred to confirming fragment reassembly behavior. Cilium documents fragment tracking for Layer 4 lookups rather than Cilium performing general packet reassembly, so this was changed to "fragmented packet handling."
- The introduction described fragment tracking as necessary for connection tracking and policy enforcement. This was made more precise by adding Layer 4 lookups, matching Cilium's documented purpose for fragment tracking.
- The fragment tracking check implied the ConfigMap key must always be present. Cilium enables IPv4 and IPv6 fragment tracking by default, so a note was added that the key may be absent when defaults are used.
- The prerequisites listed the local `cilium` CLI even though the examples use `cilium-dbg` inside Cilium agent pods. This was corrected.
- The eBPF fragment map command used `cilium bpf maps list | grep fragment`, which is not the current documented command. It was changed to `cilium-dbg bpf frag list`.
- The large ping test used `-M dont` while describing a "Message too long" path MTU test. `ping -M do` is the correct mode for setting DF and getting local PMTU rejection, so the command and comments were corrected.
- The drop monitoring command used `cilium monitor --type drop`. Current Cilium troubleshooting documentation uses `cilium-dbg monitor --type drop`, so the command was updated.
- The Step 4 heading and lead-in only mentioned eBPF fragment drops, but the corrected validation uses both monitor output and metrics. The wording was updated accordingly.
- The metrics example referenced `cilium_drop_count_total{reason="Fragmented packet"}` as the fragment signal. Cilium's fragment handling documentation recommends fragment map pressure metrics and MTU error message metrics, so the command and best practice were updated to use `cilium_bpf_map_pressure` and `cilium_mtu_error_message_total`.
- The iperf3 client pod command passed `sleep 3600` as image arguments rather than overriding the container command. It was changed to `kubectl run ... --command -- sleep 3600`.
- The iperf3 example used a TCP test with a large write buffer, which does not reliably exercise IP fragmentation. It was changed to a UDP test with datagrams larger than the pod MTU.

## Review Notes
The guide is technically relevant and useful after corrections. Future improvements could mention that IPv6 fragmentation behavior differs from IPv4 because routers do not fragment IPv6 packets, but that was outside the narrow corrections needed for this post.
