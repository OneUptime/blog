# Validation Summary: How to Optimize QoS Controls with Calico for Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico CNI
- Kubernetes
- Linux Traffic Control (tc)
- CNI bandwidth plugin
- Token Bucket Filter (TBF)
- iperf3
- veth interfaces

## Sources Consulted
- Calico documentation on bandwidth control: https://docs.tigera.io/calico/latest/networking/configuring/bandwidth
- Kubernetes network bandwidth annotations docs: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/#support-traffic-shaping
- CNI bandwidth plugin source/docs: https://www.cni.dev/plugins/current/meta/bandwidth/
- Linux tc(8) manpage and TBF qdisc documentation
- containernetworking/plugins repository (bandwidth plugin implementation using TBF + ifb)

## Issues Found
- Mermaid diagram label contained a typo: `tc tbf\négress limit` (with an accented `é`). Changed to `tc tbf\negress limit` so the `\n` is correctly interpreted as a line break and the word reads "egress".

## Review Notes
- The Kubernetes annotations `kubernetes.io/ingress-bandwidth` and `kubernetes.io/egress-bandwidth` are correct and use Kubernetes quantity format (e.g., `10M` = 10 Mbps).
- Calico v3.20+ as a minimum is conservative; the bandwidth plugin integration has been supported well before that.
- The diagram's "tc ingress policing" arrow is a simplification — the CNI bandwidth plugin actually implements ingress shaping by redirecting traffic to an IFB (Intermediate Functional Block) device and applying TBF on it, rather than using the tc ingress qdisc with the `police` action. This level of simplification is acceptable for an architectural overview but could be clarified in a future revision.
- The post description mentions "burst sizes, and traffic classification for multi-tenant clusters" but the post does not deeply explore burst tuning or multi-class QoS. This is a description/scope mismatch rather than a technical inaccuracy.
- The `NODE=` and `POD_UID=` lines in the verification section are intentional placeholders for the reader to fill in.
