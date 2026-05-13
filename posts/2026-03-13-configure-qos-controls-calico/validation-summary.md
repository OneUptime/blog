# Validation Summary: How to Configure QoS Controls with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source QoS controls
- Kubernetes pod annotations
- CNI bandwidth plugin
- Linux traffic control (tc)
- kubectl
- iperf3

## Sources Consulted
- Calico Open Source documentation: Configure QoS Controls: https://docs.tigera.io/calico/latest/networking/configuring/qos-controls
- Calico Open Source 3.30 documentation: Configure QoS Controls: https://docs.tigera.io/calico/3.30/networking/configuring/qos-controls
- Kubernetes documentation: Network Plugins, Support traffic shaping: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- CNI documentation: bandwidth plugin: https://www.cni.dev/plugins/current/meta/bandwidth/

## Issues Found
- The post described Calico QoS as using "tc and eBPF" and listed "Calico v3.20+ with bandwidth plugin enabled" as the prerequisite. Current Calico documentation describes native QoS controls in Calico v3.30+ docs, with eBPF dataplane bandwidth QoS requiring Linux kernel 6.6 or later in current docs. I changed the wording to describe native Calico QoS and the bandwidth-plugin fallback accurately.
- The main example used the Kubernetes bandwidth plugin annotations as the primary Calico QoS configuration. Calico-specific annotations are the native QoS controls, while Kubernetes bandwidth annotations are honored only when the Calico-specific annotations are not present. I updated the example to use `qos.projectcalico.org/ingressBandwidth` and `qos.projectcalico.org/egressBandwidth`.
- The test pod used the `nginx` image but later ran `iperf3` inside that pod. The `nginx` image does not provide `iperf3`, so the test command would fail. I changed the pod image to `networkstatic/iperf3` and added a long-running command so the pod can be used as the iperf3 client.
- The verification snippet used `tc class show`, which may not show useful output for these shaping rules. I changed it to `tc filter show` alongside `tc qdisc show`.
- The architecture diagram contained a typo in "egress" and described ingress as policing. The CNI bandwidth plugin documentation describes ingress shaping through tc and IFB devices, so I corrected the label to "tc ingress shaping."

## Review Notes
The post remains a minimal tutorial. Future improvements could include a concrete command for mapping a pod to its host-side `cali*` interface and a note that Calico-specific QoS annotation changes take effect immediately, while Kubernetes bandwidth plugin annotation changes require pod recreation.
