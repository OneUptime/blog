# Validation Summary: How to Test QoS Controls with Calico with Live Workloads

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico
- Kubernetes
- CNI bandwidth plugin
- Linux traffic control (tc)
- iperf3

## Sources Consulted
- Calico documentation: Configure QoS Controls, https://docs.tigera.io/calico/latest/networking/configuring/qos-controls
- Kubernetes documentation: Well-Known Labels, Annotations and Taints, https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes documentation: Network Plugins, https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- CNI documentation: bandwidth plugin, https://www.cni.dev/plugins/current/meta/bandwidth/
- iPerf documentation, https://iperf.fr/
- networkstatic/iperf3 Docker image documentation, https://hub.docker.com/r/networkstatic/iperf3/

## Issues Found
- The sample pod used the `nginx` image, but the later test executes `iperf3` inside that pod. Changed the pod image to `networkstatic/iperf3` and added a sleep command so the pod remains running and can be used as the iperf3 client.
- The iperf3 server command passed `iperf3 -s` as container arguments. The `networkstatic/iperf3` image already uses `iperf3` as its entrypoint, so changed the Kubernetes command to pass only `-s`.
- The introduction said Calico QoS controls "prioritize" pod network bandwidth. The post only demonstrates bandwidth limits, and Calico's documented bandwidth annotations limit maximum bit rate rather than granting priority. Changed this wording to focus on limiting bandwidth.
- The architecture diagram labeled egress as `tc tbf` and ingress as `tc ingress policing`, including a typo in "egress". Simplified the labels to ingress and egress limits to avoid implying the wrong tc mechanism for all supported Calico/CNI configurations.

## Review Notes
- Kubernetes documents `kubernetes.io/ingress-bandwidth` and `kubernetes.io/egress-bandwidth` as experimental annotations that require traffic shaping support from the CNI configuration.
- Calico's current documentation also supports Calico-specific `qos.projectcalico.org/*` annotations; the Kubernetes annotations are honored when the Calico-specific annotations are not present.
