# Validation Summary: How to Troubleshoot MetalLB Intermittent Traffic Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes Services
- Kubernetes EndpointSlices
- Kubernetes readiness probes
- kubectl
- MetalLB Layer 2 mode
- Linux ARP/neighbor cache sysctls
- Linux netfilter conntrack
- MTU/path MTU troubleshooting

## Sources Consulted
- MetalLB Layer 2 concepts: https://metallb.io/concepts/layer2/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes Endpoints API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/endpoints-v1/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- Linux kernel netfilter conntrack sysctl documentation: https://www.kernel.org/doc/html/v5.15/networking/nf_conntrack-sysctl.html
- conntrack-tools man page: https://netfilter.org/projects/conntrack-tools/conntrack-manpage.html

## Issues Found
- The post used `kubectl get endpoints`, but the Kubernetes Endpoints API is deprecated in v1.33+. Changed the example to watch `EndpointSlice` resources with the `kubernetes.io/service-name` label.
- The category diagram and conclusion referenced network policy races as a sixth category, but the article did not contain a corresponding section. Removed that category and changed the conclusion to describe the five categories actually covered.
- The node `NotReady` comment said this forces speaker pods to restart. Changed it to say speakers can become unavailable and ownership can change, which is more accurate for DaemonSet-based speakers.
- The ARP cache section suggested MetalLB could be configured to send additional gratuitous ARPs and implied Linux node sysctls affect upstream device caches. Removed that unsupported MetalLB configuration claim and clarified that the sysctls affect the local Linux host's neighbor cache.
- The conntrack section stated that `externalTrafficPolicy: Cluster` always performs SNAT and that `externalTrafficPolicy: Local` avoids conntrack collisions entirely. Adjusted the wording to reflect that Cluster mode can SNAT cross-node external traffic, while Local mode preserves source IP for external traffic and restricts forwarding to node-local endpoints.
- The conntrack failure check grepped `/proc/net/stat/nf_conntrack`, which typically prints the header rather than decoded counter values. Replaced it with `sudo conntrack -S | grep -E "insert_failed|drop|early_drop"`.
- The conclusion referred to a "monitoring script above" that was not present. Changed it to reference the commands in the guide.

## Review Notes
The commands assume interface names such as `eth0` and `cni0`, which are environment-specific. That is acceptable for an example, but a future revision could mention checking the actual interface names on the affected nodes.
