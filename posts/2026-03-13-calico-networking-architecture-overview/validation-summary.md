# Validation Summary: How to Understand Calico Networking Architecture

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- CNI
- Felix
- BIRD
- confd
- Typha
- Calico IPAM
- iptables and eBPF dataplanes
- BGP routing

## Sources Consulted
- Calico component architecture: https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico overlay networking and cluster route programming: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico BGP peering: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico data path: https://docs.tigera.io/calico/latest/reference/architecture/data-path
- Calico CNI plugin configuration: https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico WorkloadEndpoint resource: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico component metrics monitoring: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- Felix responsibilities overstated endpoint lifecycle ownership. Changed the Felix bullet from creating and managing WorkloadEndpoints to interface management, because Calico documents Felix as programming routes, ACLs, interfaces, and state, while WorkloadEndpoint lifecycle is generally handled by orchestrator-specific plugins such as the Calico CNI plugin.
- BIRD route flow was inaccurate. Changed the explanation from BIRD making learned routes available for Felix to program to BIRD installing learned routes in the node routing table for the Linux dataplane.
- BIRD optionality was too broad. Corrected the VXLAN/IP-in-IP statement to reflect Calico's current default behavior: VXLAN internal cluster routing does not require BGP, while IP-in-IP and unencapsulated pools use BGP for cluster route distribution by default unless Felix cluster route programming is explicitly enabled.
- The BIRD status command used `kubectl exec -l`, which is not part of the official `kubectl exec` syntax. Replaced it with a two-step command that selects one `calico-node` pod using `kubectl get ... -o jsonpath` and then runs `kubectl exec` against that pod.
- The confd section called BIRD configuration syntax proprietary. Removed that wording because BIRD is open source and the key technical point is that confd renders BIRD configuration files.
- Typha enablement and sizing guidance was imprecise. Updated it to state that operator installations deploy Typha automatically and may run one or more instances depending on scale, while manifest-based installations treat Typha as optional but recommended for high-scale Kubernetes clusters.
- The CNI plugin section incorrectly described notifying Felix via a socket. Updated it to describe creating workload endpoint data that Felix watches and, when configured, waiting for Felix endpoint status before pod startup.
- The Prometheus metrics best practice incorrectly said BIRD exposes metrics. Updated it to list Felix, Typha, and kube-controllers for Prometheus metrics and recommend `calicoctl node status` or `birdcl` for BIRD/BGP health.

## Review Notes
The commands assume the `calico-system` namespace used by operator-based installations. Manifest-based installations often use `kube-system`; future revisions could mention both namespaces, but the current examples are technically valid for the namespace chosen in the post.
