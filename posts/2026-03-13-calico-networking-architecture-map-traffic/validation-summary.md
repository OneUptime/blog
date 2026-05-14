# Validation Summary: How to Map Calico Networking Architecture to Real Kubernetes Traffic

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Container Network Interface (CNI)
- Calico Felix
- Calico Typha
- BIRD and BGP routing
- iptables and eBPF dataplanes
- calicoctl and kubectl commands

## Sources Consulted
- Calico Component architecture: https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico data path: IP routing and iptables: https://docs.tigera.io/calico/latest/reference/architecture/data-path
- Calico CNI plugin installation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-cni-plugin
- Calico CNI plugin configuration: https://docs.tigera.io/calico/latest/reference/cni-plugin/configuration
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico Typha installation/reference behavior: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico Felix Prometheus metrics: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The introduction said the post traced three events, but the post contains four. Updated it to describe all four events.
- The pod creation walkthrough said it involved every component. Updated this to "several core components" because not every Calico component participates in that flow.
- The pod creation sequence showed the CNI plugin notifying Felix directly via a socket. Updated it to show endpoint state flowing through the datastore and Typha/Felix watch path, matching Calico's documented architecture.
- The pod creation sequence said Felix exports a route to BIRD through the dataplane. Updated it to show Felix adding routes to the kernel FIB and BIRD observing/distributing those routes in BGP mode.
- The policy propagation section claimed healthy clusters typically enforce policy in under 500ms. Replaced this unsupported fixed latency with a dependency-based explanation.
- The cross-node routing section said the BGP-learned route was programmed by Felix from BIRD. Updated it to state that BIRD learns and installs the remote route, while Felix programs local workload routes.
- The Typha fanout section said one datastore write generates N simultaneous API server watch events. Updated it to explain that, without Typha, each Felix maintains its own watch and receives the update independently; Typha centralizes, caches, deduplicates, and fans out updates.

## Review Notes
The commands are illustrative and depend on cluster installation details such as namespace, labels, selected dataplane, and whether BGP is enabled. The `birdcl` examples apply to Calico BGP deployments using BIRD, not policy-only, VXLAN-only, or eBPF-native deployments without BIRD route distribution.
