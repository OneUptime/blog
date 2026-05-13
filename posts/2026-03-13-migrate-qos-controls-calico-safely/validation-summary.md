# Validation Summary: How to Migrate to QoS Controls with Calico Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico QoS controls
- Kubernetes pod annotations
- CNI bandwidth plugin behavior
- Linux traffic control (tc)
- kubectl
- iperf3

## Sources Consulted
- Calico Open Source documentation: Configure QoS Controls: https://docs.tigera.io/calico/latest/networking/configuring/qos-controls
- Kubernetes documentation: Network Plugins, Support traffic shaping: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/#support-traffic-shaping
- CNI plugins documentation: bandwidth plugin: https://www.cni.dev/plugins/current/meta/bandwidth/
- Docker Hub / networkstatic iperf3 image information: https://hub.docker.com/r/networkstatic/iperf3/

## Issues Found
- The post described Calico bandwidth limits using only the older Kubernetes bandwidth annotations. Current Calico QoS documentation uses `qos.projectcalico.org/ingressBandwidth` and `qos.projectcalico.org/egressBandwidth`, while still honoring Kubernetes bandwidth annotations when Calico-specific annotations are absent. Updated the manifest to use the Calico-specific annotations and clarified the fallback behavior.
- The prerequisite `Calico v3.20+ with bandwidth plugin enabled` conflated Kubernetes CNI bandwidth plugin behavior with Calico's native QoS controls. Updated it to require Calico with QoS controls enabled.
- The sample pod used `nginx`, but the later `kubectl exec` command runs `iperf3` inside that pod. Updated the sample pod to use the `networkstatic/iperf3` image and keep it running with a sleep command.
- The `kubectl run iperf3-server` command passed `iperf3 -s` as arguments to an image whose entrypoint is already `iperf3`. Updated the command to pass only `-s`.
- The architecture diagram contained a typo in `egress` and over-specified implementation details. Updated the labels to describe ingress and egress tc limits accurately.
- The conclusion stated that limits are enforced specifically with token bucket filters on the pod's veth interface. Updated it to the broader, documented statement that Calico enforces the limits using Linux tc on pod interfaces.

## Review Notes
The `tc` inspection commands are illustrative and require the reviewer to identify the actual Calico host-side interface for the pod on the node. Calico's native QoS behavior differs from the standalone Kubernetes CNI bandwidth plugin: Calico-specific QoS annotations take precedence, and Calico documentation states that native bandwidth limits take effect immediately, while bandwidth-plugin changes require pod recreation.
