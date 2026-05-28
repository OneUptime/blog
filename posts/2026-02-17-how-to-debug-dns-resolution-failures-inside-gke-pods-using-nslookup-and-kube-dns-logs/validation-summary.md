# Validation Summary: How to Debug DNS Resolution Failures Inside GKE Pods Using nslookup

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes DNS
- kube-dns
- Cloud DNS for GKE
- NodeLocal DNSCache
- kubectl
- nslookup and dig
- Kubernetes NetworkPolicy

## Sources Consulted
- Kubernetes: Debugging DNS Resolution - https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes: DNS for Services and Pods - https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Google Cloud: About kube-dns for GKE - https://docs.cloud.google.com/kubernetes-engine/docs/concepts/kube-dns
- Google Cloud: Troubleshoot kube-dns in GKE - https://docs.cloud.google.com/kubernetes-engine/docs/troubleshooting/kube-dns
- Google Cloud: Set up NodeLocal DNSCache - https://docs.cloud.google.com/kubernetes-engine/docs/how-to/nodelocal-dns-cache
- Google Cloud: Use Cloud DNS for GKE - https://docs.cloud.google.com/kubernetes-engine/docs/how-to/cloud-dns

## Issues Found
- The post used `10.96.0.10` as the kube-dns Service IP. This is not reliable in GKE because the kube-dns `ClusterIP` is cluster-specific. I changed the command to discover the Service IP with `kubectl get svc kube-dns -n kube-system -o jsonpath='{.spec.clusterIP}'`.
- The post implied all GKE pods use kube-dns. Current GKE can use kube-dns, Cloud DNS for GKE, and NodeLocal DNSCache depending on cluster mode and configuration. I added a short caveat and clarified expected nameserver values.
- Related wording treated `ClusterFirst` and internal DNS failures as kube-dns-specific in all clusters. I changed those references to the cluster DNS provider or cluster DNS records, while preserving kube-dns wording where the section is explicitly about kube-dns.
- The sample `/etc/resolv.conf` omitted GKE-specific search suffixes. I updated the example to include `c.PROJECT_ID.internal` and `google.internal`, matching GKE documentation.
- The `ndots:5` explanation understated the number of search-suffix lookups in GKE. I clarified that the three-query sequence is a minimal Kubernetes search list and that GKE can add additional suffixes.
- The stale DNS cache section described a Service IP changing without context. Kubernetes Service `ClusterIP` values are not normally changed in place, so I clarified that this applies when a Service is recreated with a different ClusterIP.
- The metrics command queried `localhost:10054` from the sidecar container and listed `skydns_*` metrics. GKE documentation recommends port-forwarding metrics ports, uses `kubedns_dnsmasq_*` metrics for legacy kube-dns, and uses port `9153` for GKE 1.36+ CoreDNS-based kube-dns. I updated the command and metric names.

## Review Notes
The `kubectl run`, `kubectl exec`, `kubectl logs`, `kubectl describe`, NetworkPolicy, `dnsPolicy`, and `dnsConfig` examples are consistent with Kubernetes usage. The local environment did not have `kubectl` installed, so CLI syntax was verified against official documentation rather than local `--help` output.
