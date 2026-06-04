# Validation Summary: How to implement kube-proxy ipvs mode with masquerade

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- Kubernetes
- kube-proxy
- IPVS proxy mode
- iptables NAT and MASQUERADE rules
- NodePort and LoadBalancer Services
- `externalTrafficPolicy`
- Linux conntrack and sysctl tuning
- Kubernetes `ip-masq-agent`

## Sources Consulted
- Kubernetes kube-proxy configuration API reference: https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- Kubernetes kube-proxy command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- Kubernetes Virtual IPs and Service Proxies reference: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes Debug Services task: https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- Kubernetes Using Source IP tutorial: https://kubernetes.io/docs/tutorials/services/source-ip/
- Kubernetes IP Masquerade Agent User Guide: https://kubernetes.io/docs/tasks/administer-cluster/ip-masq-agent/

## Issues Found
- The post described kube-proxy masquerading as general pod-to-external egress SNAT. Updated the wording to clarify that kube-proxy's `masqueradeAll` and `KUBE-MARK-MASQ` behavior apply to Service traffic, while general pod egress masquerading is normally handled by the CNI plugin or `ip-masq-agent`.
- The nginx Deployment exposed `containerPort: 8080` and Services targeted port 8080, but the stock `nginx:1.21` image listens on port 80 by default. Changed the Service `targetPort` and container port examples to 80.
- The NodePort test used `127.0.0.1` from inside a pod. Kubernetes documents that localhost NodePorts are not supported in IPVS mode, so the example now targets a node IP.
- The `externalTrafficPolicy: Local` discussion said nodes without local pods return connection refused. Kubernetes documents that kube-proxy does not forward traffic for that Service when no local endpoints exist, so the text now says those nodes do not forward the traffic.
- Removed the `ss -tlnp | grep 30080` troubleshooting step because kube-proxy does not expose IPVS NodePorts as normal listening sockets.
- Added a Kubernetes v1.35 deprecation caveat for IPVS proxy mode and noted that nftables mode is the recommended replacement for newer clusters.
- Corrected the `masqueradeAll` fallback section so it says all Service ClusterIP traffic is SNATed, not all pod traffic regardless of destination.

## Review Notes
The kube-proxy configuration schema fields used in the examples are valid in the current `kubeproxy.config.k8s.io/v1alpha1` reference. Operational commands such as `ipvsadm`, `iptables`, `conntrack`, `sysctl`, and `tcpdump` are context-dependent and require node-level privileges and the relevant packages/kernel modules.
