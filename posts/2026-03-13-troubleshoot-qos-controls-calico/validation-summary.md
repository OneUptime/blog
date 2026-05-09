# Validation Summary: How to Troubleshoot QoS Controls with Calico

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico QoS controls
- Kubernetes pod annotations
- CNI bandwidth plugin
- Linux traffic control (`tc`)
- iperf3

## Sources Consulted
- Calico documentation, Configure QoS Controls: https://docs.tigera.io/calico/latest/networking/configuring/qos-controls
- Kubernetes documentation, Network Plugins / Support traffic shaping: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- CNI plugins documentation, bandwidth plugin: https://www.cni.dev/plugins/current/meta/bandwidth/
- Calico documentation, WorkloadEndpoint resource: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Local `tc qdisc help` and `tc class help` output

## Issues Found
- The post described Calico bandwidth controls as both limiting and prioritizing bandwidth. Calico bandwidth QoS limits maximum usage; prioritization is a separate DiffServ capability, so the introduction now focuses on bandwidth limiting.
- The prerequisites said "Calico v3.20+ with bandwidth plugin enabled." Current Calico documentation describes native QoS controls and says the Kubernetes bandwidth plugin annotations are honored when Calico-specific annotations are absent. I updated the prerequisite to cover current Calico QoS controls and older bandwidth-plugin-based installations.
- The pod example used only Kubernetes bandwidth annotations. Those are valid compatibility annotations, but current Calico-specific annotations are `qos.projectcalico.org/ingressBandwidth` and `qos.projectcalico.org/egressBandwidth`, so the primary example now uses them and notes the Kubernetes alternatives.
- The example pod used the `nginx` image, then later tried to run `iperf3` inside it. I changed the image to `networkstatic/iperf3` and added a long-running command so the later `kubectl exec ... iperf3` command can work.
- The `tc` verification block had unset placeholders and an invalid literal `cali<iface>` device name. I replaced it with commands to retrieve the pod node and IP, find the route to the pod IP on the node, and inspect the discovered Calico interface.
- The architecture diagram said ingress used `tc ingress policing` and contained a typo in "égress". The CNI bandwidth plugin documentation describes TBF shaping and IFB use for ingress, while Calico documentation describes tc-based bandwidth QoS; the diagram now says tc shaping for ingress and egress.
- The conclusion said limits are enforced specifically with token bucket filters on the pod veth interface. That is too narrow for current Calico and not accurate for CNI bandwidth-plugin ingress, which uses an IFB device. I changed it to tc-based shaping.

## Review Notes
- `kubectl` was not installed in this workspace, so Kubernetes CLI syntax was verified against official Kubernetes documentation rather than local `kubectl --help`.
- The `networkstatic/iperf3` image is commonly used in Kubernetes iperf examples, but production environments may prefer a pinned, internally approved image.
