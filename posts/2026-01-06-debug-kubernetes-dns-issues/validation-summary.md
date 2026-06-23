# Validation Summary: How to Debug Kubernetes DNS Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes (kubectl, Services, Endpoints, NetworkPolicy, HPA, Pod dnsConfig/dnsPolicy)
- CoreDNS (Corefile plugins: kubernetes, forward, cache, loop, health, ready, prometheus)
- DNS / resolv.conf (nameserver, search domains, ndots, single-request-reopen)
- NodeLocal DNSCache
- Linux networking (conntrack race condition, UDP/TCP port 53)
- busybox / tutum/dnsutils debug images

## Sources Consulted
- Kubernetes — Debugging DNS Resolution: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes — DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes — Customizing DNS Service: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- CoreDNS prometheus (metrics) plugin: https://coredns.io/plugins/metrics/
- Amazon EKS — Monitor CoreDNS metrics (kube-dns service port 9153): https://docs.aws.amazon.com/eks/latest/userguide/coredns-metrics.html
- kubeadm issue #1360 / containers-roadmap #965 (kube-dns metrics port 9153 history)

## Issues Found
- **DNS flow diagram and explanation incorrectly placed kubelet in the query path.** The original text stated "the request flows through kubelet to CoreDNS" and the Mermaid diagram routed `Pod --> kubelet --> CoreDNS`. This is technically inaccurate: kubelet only configures the pod's `/etc/resolv.conf` (with the CoreDNS ClusterIP as nameserver) at pod creation; it is **not** in the actual DNS query path. The pod's resolver sends queries directly to the CoreDNS ClusterIP (via kube-proxy iptables/IPVS rules). Fixed by removing kubelet from the diagram (`Pod --> CoreDNS`) and rewording the explanation to clarify that kubelet writes the resolv.conf while the query goes directly to CoreDNS. Verified against the official Kubernetes DNS docs.

## Review Notes
- **`kubectl port-forward svc/kube-dns 9153:9153`** is correct on EKS and on clusters where the `kube-dns` Service exposes the metrics port 9153 (now common). On some older/vanilla kubeadm clusters the `kube-dns` Service historically did not expose 9153 (see kubeadm #1360); in that case port-forward to a CoreDNS pod instead. Left as-is since it is valid for the common/managed case.
- **NodeLocal DNSCache manifest** (`nodelocaldns.yaml`) is a template containing placeholders (`__PILLAR__DNS__SERVER__`, `__PILLAR__LOCAL__DNS__`, `__PILLAR__DNS__DOMAIN__`) that must be substituted before applying; a raw `kubectl apply` of the unmodified file will not work without those substitutions. This is a common simplification in guides but worth noting.
- **`single-request-reopen`** is a glibc resolver option. It has no effect in musl-based images (e.g. Alpine) or busybox; the workaround only applies to glibc-based containers. Accurate as written for the typical case.
- **Conntrack race condition "kernel < 5.9"** is a reasonable approximation. Partial fixes for the DNAT/conntrack insert race landed in earlier kernels (~5.0), and the race can still surface depending on configuration; the recommended NodeLocal DNSCache mitigation given in the post is the most robust fix.
- **`busybox:1.28`** is correctly pinned — later busybox releases have a known broken `nslookup` in Kubernetes, so 1.28 is the standard recommendation.
- `tutum/dnsutils` is an older but still-functional debug image; the official docs now favor `registry.k8s.io/e2e-test-images/agnhost` or `dnsutils`, but this is not an error.
- All kubectl commands, the default Corefile, the `autoscaling/v2` HPA (GA since 1.23), the NetworkPolicy egress rule, and per-pod `dnsConfig`/`dnsPolicy` examples are syntactically correct and current.
