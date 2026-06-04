# Validation Summary: How to Debug DNS Resolution Issues in Kubernetes Pods

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes DNS for Services and Pods
- CoreDNS
- kubectl
- NetworkPolicy
- Pod DNS policy and dnsConfig
- DNS troubleshooting tools: nslookup, dig, nc, tcpdump

## Sources Consulted
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes debugging nodes with kubectl: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl create service clusterip reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_service_clusterip/
- CoreDNS loop plugin documentation: https://coredns.io/plugins/loop/
- CoreDNS kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/

## Issues Found
- The `wget` fallback used `http://...:443`, which targets the HTTPS Kubernetes API port with an HTTP URL. Changed it to use `https://kubernetes.default.svc.cluster.local:443/version` with certificate checking disabled so the example forces DNS resolution and uses the correct scheme.
- The raw DNS test used `sh -c "echo 'test' > /dev/udp/..."`, which is shell-dependent and does not send a valid DNS query. Replaced it with an `nc` TCP connectivity check to the DNS service.
- The Debian/Ubuntu package installation example placed `apt-get install` outside `kubectl exec` because of shell operator precedence. Wrapped both commands in `sh -c` so they run inside the target container.
- The CoreDNS connectivity section only tested TCP while the surrounding text discussed DNS on UDP/TCP. Kept the TCP checks and added UDP `nc` examples with a note that support depends on the `nc` implementation.
- The NetworkPolicy example used separate `namespaceSelector` and `podSelector` peers, which would match all pods in the selected namespace OR matching pods in the policy namespace, not CoreDNS pods in `kube-system`. Combined both selectors into one peer and used the standard `kubernetes.io/metadata.name: kube-system` namespace label.
- The node DNS loop command read `/etc/resolv.conf` from the debug container, not the node filesystem. Changed it to `/host/etc/resolv.conf`, matching Kubernetes node-debug behavior.
- The debug pod section used `dig +trace` for an internal `cluster.local` name, which is misleading because trace follows public delegation rather than querying CoreDNS for cluster-local service records. Replaced it with a direct CoreDNS query using `dig @10.96.0.10`.

## Review Notes
The post uses common default names such as the `kube-dns` Service, `k8s-app=kube-dns` labels, `cluster.local`, and `10.96.0.10`. These are valid defaults in many clusters but can vary by installation or managed Kubernetes provider, so readers should verify them in their own cluster as the post already recommends.
