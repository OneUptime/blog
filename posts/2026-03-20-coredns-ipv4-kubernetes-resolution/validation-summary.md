# Validation Summary: How to Configure CoreDNS for IPv4 Name Resolution in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CoreDNS (DNS server)
- Kubernetes (kube-system, ConfigMap, Deployments, kubectl)
- CoreDNS plugins: `errors`, `health`, `ready`, `kubernetes`, `prometheus`, `forward`, `cache`, `loop`, `reload`, `loadbalance`
- NodeLocal DNSCache addon
- IPv4 service discovery (`in-addr.arpa`, `ip6.arpa`)
- Corefile syntax / stub zones
- Alpine + busybox `nslookup` for cluster DNS testing

## Sources Consulted
- CoreDNS plugin reference: https://coredns.io/plugins/ (cache, forward, health, kubernetes, ready, reload, loadbalance, prometheus)
- CoreDNS cache plugin: https://coredns.io/plugins/cache/ (verified `success CAPACITY [TTL] [MINTTL]` and `denial CAPACITY [TTL] [MINTTL]` syntax)
- CoreDNS forward plugin: https://coredns.io/plugins/forward/ (verified `prefer_udp` option and `forward FROM TO...` syntax)
- CoreDNS health plugin: https://coredns.io/plugins/health/ (verified `lameduck DURATION` option)
- CoreDNS kubernetes plugin: https://coredns.io/plugins/kubernetes/ (verified zones list, `pods insecure`, `fallthrough`, `ttl`)
- Kubernetes NodeLocal DNSCache documentation: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/ (verified manifest path, `__PILLAR__*__` placeholders, `169.254.20.10` link-local IP)
- Kubernetes kubernetes/kubernetes repo: cluster/addons/dns/nodelocaldns/nodelocaldns.yaml (path is correct on `master` branch)
- kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands (verified `kubectl rollout restart`, `kubectl run --restart=Never`, `kubectl exec`, `kubectl logs --tail`, `-l k8s-app=kube-dns` label selector)
- Kubernetes DNS spec for services and pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/ (verified `<service>.<namespace>.svc.cluster.local` FQDN and search domain order)

## Issues Found
No technical issues found.

## Review Notes
- The default Corefile shown matches the upstream CoreDNS Kubernetes default, including the `health { lameduck 5s }` block, `kubernetes cluster.local in-addr.arpa ip6.arpa` zones, `pods insecure`, `fallthrough`, `forward . /etc/resolv.conf`, `cache 30`, `loop`, `reload`, and `loadbalance` plugins.
- The cache plugin block `cache 300 { success 9984 300; denial 9984 30 }` uses the documented `CAPACITY [TTL]` form. 9984 is also the default capacity, which is a sensible reference value.
- The CoreDNS deployment uses the legacy `k8s-app=kube-dns` label for backward compatibility with the older kube-dns service/selector — using this selector for `kubectl get pods` and `kubectl logs` is correct.
- The `reload` plugin is enabled in the Corefile, so CoreDNS will pick up ConfigMap changes automatically (typically within ~30s). The `kubectl rollout restart deployment/coredns` shown is a valid way to force an immediate reload, which is what most operators prefer for predictability.
- Alpine's BusyBox includes a minimal `nslookup` applet, so the `kubectl exec dnstest -- nslookup ...` example will work without installing extra packages.
- Minor consideration (not an error): on managed Kubernetes distributions (EKS, GKE, AKS) the CoreDNS ConfigMap may be reconciled by an addon controller, so manual `kubectl edit` changes can be reverted. This is out of scope for the post.
- Version note: the `wget` URL pulls from the `master` branch of kubernetes/kubernetes. Pinning to a specific release (e.g. `release-1.30`) would be more reproducible long-term, but using `master` is consistent with the upstream NodeLocal DNSCache documentation.
