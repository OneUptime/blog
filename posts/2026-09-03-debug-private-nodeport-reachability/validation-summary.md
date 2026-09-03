# Validation Summary: Why Can kube-hunter Reach a Node Port That Should Be Private? Debugging Firewalls and Security Groups

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes Services (`NodePort`, `LoadBalancer`, and `ClusterIP`)
- kube-proxy (iptables, IPVS, and nftables modes)
- EndpointSlice and kubectl
- Kubernetes NetworkPolicy and CNI plugins
- kube-hunter
- Cloud firewalls, security groups, load balancers, NAT, and host firewalls
- TCP connectivity testing with netcat

## Sources Consulted
- [Kubernetes Service and NodePort behavior](https://kubernetes.io/docs/concepts/services-networking/service/#type-nodeport)
- [Kubernetes virtual IPs and Service proxies](https://kubernetes.io/docs/reference/networking/virtual-ips/)
- [Kubernetes NetworkPolicy behavior](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes kube-proxy command-line reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/)
- [Kubernetes kube-proxy configuration API](https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/)
- [Kubernetes ports and protocols](https://kubernetes.io/docs/reference/networking/ports-and-protocols/)
- [kube-hunter port discovery source](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/ports.py)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)

## Issues Found
- The post stated that an empty/default `--nodeport-addresses` setting accepts all local interfaces without distinguishing kube-proxy modes. Current Kubernetes documentation says the unset default is `all` for iptables and IPVS modes but `primary` for nftables mode. Updated the text to state those mode-specific defaults.

## Review Notes
- The default NodePort range of `30000-32767`, same-port behavior on nodes, ready-endpoint forwarding, and default node-port allocation for LoadBalancer Services are consistent with current Kubernetes documentation.
- The kube-hunter source currently probes a fixed list of Kubernetes-related ports that includes `30000`; it does not scan the entire default NodePort range.
- The `kubectl get` commands use current resource names, flags, label keys, and JSONPath-style custom-column fields.
- The NetworkPolicy caveat accurately reflects Kubernetes documentation: address translation can occur before or after policy processing depending on the network plugin, cloud provider, and Service implementation.
- `nc` option details vary among netcat implementations; the shown `-v`, `-z`, and `-w` usage is valid for common Linux implementations, which is the expected kube-hunter environment.
