# Validation Summary: How to Secure QoS Controls with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (CNI)
- Kubernetes pod bandwidth annotations
- Linux traffic control (tc), Token Bucket Filter (TBF), ingress policing
- bandwidth CNI plugin
- iperf3 (testing)

## Sources Consulted
- Calico documentation, "Bandwidth and QoS controls": https://docs.tigera.io/calico/latest/networking/configuring/qos
- containernetworking/plugins, bandwidth meta plugin: https://www.cni.dev/plugins/current/meta/bandwidth/
- Kubernetes documentation, "Support traffic shaping": https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/#support-traffic-shaping
- Linux man pages: tc(8), tc-tbf(8), tc-police(8)

## Issues Found
- Mermaid edge label contained the Unicode character `é` where a newline + `e` was intended (`tc tbf\négress limit`). Corrected to `tc tbf\negress limit` so the label renders as expected. No other technical errors found.

## Review Notes
- The annotations `kubernetes.io/ingress-bandwidth` and `kubernetes.io/egress-bandwidth` are the correct standard Kubernetes annotations consumed by the bandwidth CNI meta plugin, which Calico chains in to enforce TBF on egress and ingress policing on the pod's host-side veth (cali...) interface. This matches the post's description.
- The "Verify QoS Rules are Applied" section is intentionally illustrative — `NODE=`, `POD_UID=`, and `cali<iface>` are placeholders that the reader must fill in. This is acceptable for a short walkthrough but readers should know they need to find the pod's veth (e.g., via `ip link` on the node hosting the pod, or by mapping container netns) before running the `tc` commands.
- The "Calico v3.20+" prerequisite is conservative; bandwidth plugin support via CNI chaining has been available in Calico for longer, but stating v3.20+ is not incorrect.
- The bandwidth plugin must be present in the CNI plugin directory and chained into the Calico CNI configuration for the annotations to take effect; this prerequisite is implied by "with bandwidth plugin enabled" but readers new to CNI chaining may want to consult the linked Calico docs for the exact `installation` operator settings or manual conflist edits required.
