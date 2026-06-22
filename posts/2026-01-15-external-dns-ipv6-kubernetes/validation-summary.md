# Validation Summary: How to Set Up External-DNS for IPv6 in Kubernetes

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- External-DNS (v0.14.0)
- Kubernetes (Services, Ingress, dual-stack `ipFamilies`/`ipFamilyPolicy`)
- Gateway API (Gateway, HTTPRoute)
- IPv6 / dual-stack networking (A and AAAA records)
- DNS providers: Cloudflare, AWS Route 53, Google Cloud DNS, Azure DNS, CoreDNS (etcd)
- Cloud load balancers: AWS NLB, GCP L4, MetalLB
- CNI plugins: Calico, Cilium, Flannel, Weave, AWS VPC CNI, Azure CNI
- Helm, RBAC, NetworkPolicy, External Secrets Operator
- Prometheus / ServiceMonitor monitoring

## Sources Consulted
- External-DNS official docs (v0.14.0/latest) — https://kubernetes-sigs.github.io/external-dns/
- External-DNS AWS tutorial (`--aws-prefer-cname`, ALIAS vs CNAME) — https://github.com/kubernetes-sigs/external-dns/blob/master/docs/tutorials/aws.md
- External-DNS Cloudflare tutorial (`--cloudflare-dns-records-per-page`, max 5000) — https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/cloudflare/
- External-DNS annotations reference — https://kubernetes-sigs.github.io/external-dns/v0.14.0/annotations/annotations/
- External-DNS FAQ / dual-stack & AAAA behavior — https://github.com/kubernetes-sigs/external-dns/blob/master/docs/faq.md
- Kubernetes dual-stack docs (`ipFamilyPolicy`, `ipFamilies`) — https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- AWS public IPv4 address pricing ($0.005/hour) — https://aws.amazon.com/blogs/aws/new-aws-public-ipv4-address-charge-public-ip-insights/

## Issues Found
The post is technically accurate. Verified as correct (no change needed):
- `external-dns` v0.14.0 image, Helm repo URL, provider flags (`--provider`, `--policy=sync`, `--registry=txt`, `--txt-owner-id`, `--txt-prefix`, `--domain-filter`).
- `--aws-prefer-cname`, `--aws-batch-change-size`, `--aws-batch-change-interval`, `--aws-zone-type` — all valid AWS-provider flags.
- `--cloudflare-dns-records-per-page=5000` — valid; 5000 is the documented maximum.
- `--google-zone-visibility`, `--google-project`, `--azure-resource-group`, `--azure-subscription-id`, `--coredns-prefix` and the `ETCD_URLS` env var — all valid.
- Prometheus metrics on port 7979 (`--metrics-address`) and listed metric names (`external_dns_source_endpoints_total`, `external_dns_registry_endpoints_total`, `external_dns_controller_last_sync_timestamp_seconds`, `external_dns_source_errors_total`, `external_dns_registry_errors_total`) — all real.
- Dual-stack Service specs (`ipFamilyPolicy: PreferDualStack`/`SingleStack`, `ipFamilies`), AWS LB annotations (`aws-load-balancer-ip-address-type: dualstack`), Gateway API `gateway.networking.k8s.io/v1`, MetalLB `IPAddressPool`/`L2Advertisement` v1beta1, and the RBAC ClusterRole — all correct.
- AWS public IPv4 charge of $0.005/hour — correct (effective Feb 2024).

Corrections made — three misleading code comments (the surrounding commands themselves were correct and unchanged):
1. The comment `# IPv6 specific arguments` above `--txt-owner-id`/`--txt-prefix` was inaccurate — these are registry/ownership arguments, not IPv6-specific. Reworded to `# Registry/ownership configuration`.
2. The comment `# Enable both A and AAAA record creation` above `policy: sync`/`registry: txt` implied those settings toggle AAAA records. AAAA records are created automatically from a service's IPv6 address; clarified the comment to state this and that `policy: sync` lets External-DNS create/delete both record types.
3. The comment `# Enable both A and AAAA records` above `--cloudflare-dns-records-per-page=5000` was wrong — that flag controls API pagination only. Reworded to `# Cloudflare API pagination (max 5000 records per page)`.

## Review Notes
- `kubernetes.io/ingress.class: nginx` (NGINX Ingress example) is deprecated in favor of `spec.ingressClassName` but still functions; acceptable for a tutorial and left as-is.
- The Helm `values.yaml` mixes chart top-level values (`policy`, `registry`, `provider`) with `extraArgs` that duplicate some of the same concepts; this works but readers should avoid setting the same option in both places to prevent conflicting/duplicate flags.
- AAAA record creation depends on the LoadBalancer/cloud provider actually assigning an IPv6 address to the service (`status.loadBalancer.ingress`); the post correctly emphasizes that the whole stack — CNI, LB, VPC/subnet — must support IPv6.
