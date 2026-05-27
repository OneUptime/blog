# Validation Summary: How to Use tcpdump to Debug MetalLB Traffic Not Reaching Pods

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes Services and kube-proxy
- MetalLB Layer 2 mode
- tcpdump
- Linux ARP / neighbor tables
- iptables, IPVS, and nftables
- Kubernetes ephemeral debug containers
- Linux conntrack

## Sources Consulted
- MetalLB Layer 2 mode documentation: https://metallb.io/concepts/layer2/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- MetalLB release notes for current labels: https://metallb.io/release-notes/
- Kubernetes Virtual IPs and Service Proxies documentation: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes Discovery API reference for EndpointSlice lookup labels: https://kubernetes.io/docs/reference/kubernetes-api/discovery/
- tcpdump local help output, version 4.99.4
- iptables local help output, version 1.8.10
- iproute2 local help output for `ip neigh`
- conntrack-tools project documentation: https://www.iptables.org/projects/conntrack-tools/

## Issues Found
- The post only mentioned iptables and IPVS kube-proxy modes. Kubernetes also supports nftables mode, and IPVS mode is deprecated in newer releases. Updated the traffic flow and kube-proxy inspection guidance to include nftables and note the IPVS deprecation.
- The MetalLB active speaker lookup relied on speaker logs and implied that listing speaker pods identifies the active ARP announcer. MetalLB documents the active announcer through Service events, so the command now uses `kubectl describe svc` and the speaker pod command is described as showing candidate speaker nodes.
- The ARP check used `arp -an` on the node and said it showed whether the node was advertising its MAC. A node's ARP cache does not prove that clients are resolving the LoadBalancer IP correctly. Updated this to check the client or upstream router neighbor table with `ip neigh` and to use a tcpdump ARP filter instead of piping packet output through `grep`.
- The pod-network capture text assumed `cbr0` or `cni0` always exists. Updated it to say those bridge interfaces apply only when the CNI uses a bridge.
- The `kubectl debug --target` comment incorrectly said the flag shares the network namespace. Ephemeral containers share the pod network namespace because they are in the same pod; `--target` targets another container's process namespace when supported. Updated the comment.
- The health check used the legacy Endpoints API. Since Kubernetes 1.33 deprecates Endpoints in favor of EndpointSlices, updated the command to `kubectl get endpointslice -l kubernetes.io/service-name=my-service`.
- The `externalTrafficPolicy: Local` explanation was too tied to the MetalLB speaker node. Updated it to match Kubernetes behavior: kube-proxy only sends external traffic to ready node-local endpoints.

## Review Notes
The remaining tcpdump, iptables, IPVS, nftables, `kubectl debug`, and conntrack command shapes are syntactically valid. Some commands still require cluster-specific details such as namespace, CNI interface name, kube-proxy mode, pod name, container name, and installed host tools.
