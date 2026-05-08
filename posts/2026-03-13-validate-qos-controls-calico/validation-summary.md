# Validation Summary: How to Validate QoS Controls with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico QoS controls
- Kubernetes pod annotations
- CNI bandwidth plugin
- Linux traffic control (tc)
- kubectl
- iperf3

## Sources Consulted
- Calico documentation: Configure QoS Controls: https://docs.tigera.io/calico/latest/networking/configuring/qos-controls
- Kubernetes documentation: Network Plugins, Support traffic shaping: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/#support-traffic-shaping
- Kubernetes documentation: Well-Known Labels, Annotations and Taints: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes kubectl reference: kubectl run: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl reference: kubectl exec: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- CNI plugins documentation: bandwidth plugin: https://www.cni.dev/plugins/current/meta/bandwidth/
- Local `tc qdisc help` and `tc class help` output.

## Issues Found
- The introduction said Calico QoS limits and prioritizes pod bandwidth. Calico QoS bandwidth controls limit maximum usage; prioritization is only indirectly related to DiffServ marking. Updated the wording to focus on bandwidth limiting.
- The post used Kubernetes bandwidth annotations as the primary Calico QoS example. Current Calico documentation prefers `qos.projectcalico.org/*` annotations and honors Kubernetes bandwidth annotations only when Calico-specific annotations are absent. Updated the example to use Calico QoS annotations and preserved the Kubernetes annotation compatibility note.
- The prerequisites said "Calico v3.20+ with bandwidth plugin enabled." Current Calico QoS controls do not require the CNI bandwidth plugin when using Calico-specific QoS annotations. Updated the prerequisite to distinguish Calico QoS controls from the CNI bandwidth plugin path.
- The sample pod used the `nginx` image, but the test later ran `iperf3` inside that pod. Updated the pod image and command so the `kubectl exec ... iperf3` command can work.
- The `kubectl run` server command passed `iperf3 -s` as container arguments. Updated it to use `--command -- iperf3 -s` so the intended process is explicit.
- The `tc` examples used `cali<iface>`, which is shell-unsafe because `<iface>` is parsed as input redirection. Replaced it with a quoted `CALI_IFACE` variable.
- The Mermaid diagram had a typo in "egress" and over-specified implementation details. Updated the labels to describe ingress and egress bandwidth limits without making unsupported claims.
- The conclusion stated that limits are enforced using Linux tc token bucket filters on the pod veth interface. That is accurate for the CNI bandwidth plugin, but current Calico QoS documentation does not present all Calico QoS controls that way. Removed the over-specific implementation claim.

## Review Notes
The verification section still requires the reader to identify the node-side Calico interface for the pod. That is operationally accurate but could be expanded in a future revision with a cluster-specific method for mapping pods to workload interfaces.
