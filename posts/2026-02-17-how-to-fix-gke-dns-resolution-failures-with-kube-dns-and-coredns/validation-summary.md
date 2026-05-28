# Validation Summary: How to Fix GKE DNS Resolution Failures with kube-dns and CoreDNS

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes DNS
- kube-dns
- CoreDNS-based kube-dns
- Cloud DNS for GKE
- NodeLocal DNSCache
- Kubernetes NetworkPolicy
- kubectl
- gcloud CLI
- Linux resolver configuration

## Sources Consulted
- GKE service discovery and DNS documentation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/service-discovery
- GKE kube-dns concepts and optimization guidance: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/kube-dns
- GKE kube-dns usage documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/kube-dns
- GKE NodeLocal DNSCache setup documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/nodelocal-dns-cache
- GKE Cloud DNS documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/cloud-dns
- Kubernetes DNS debugging documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- kubectl set resources reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/
- Google Cloud SDK gcloud container clusters update reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Linux resolv.conf manual page: https://man7.org/linux/man-pages/man5/resolv.conf.5.html

## Issues Found
- Corrected the opening GKE DNS description to distinguish GKE Standard kube-dns, newer CoreDNS-based kube-dns, and Cloud DNS configurations.
- Fixed the DNS flow diagram so kubelet writes `/etc/resolv.conf` but does not forward runtime DNS queries.
- Qualified the cluster DNS Service IP explanation because NodeLocal DNSCache and Cloud DNS for GKE can change the nameserver IP used by Pods.
- Updated the DNS logs command to include `--all-containers=true`, which works better across legacy multi-container kube-dns and CoreDNS-based deployments.
- Replaced a fragile JSON Patch example with `kubectl set resources`, matching the official kubectl resource update command pattern.
- Corrected the GKE DNS autoscaler ConfigMap name from `dns-autoscaler` to `kube-dns-autoscaler`.
- Added the required `selector` and matching Pod labels to the `apps/v1` Deployment example so the manifest is valid.
- Corrected the external DNS troubleshooting section to avoid claiming kube-dns always forwards external queries directly to the metadata server. GKE behavior depends on kube-dns upstream resolvers, Cloud DNS for GKE, and NodeLocal DNSCache.
- Replaced a non-portable command that executed `nslookup` inside a DNS pod with a debug-pod query against the `kube-dns` Service.
- Fixed the NetworkPolicy allow-all-egress example from `to: []` to `- {}`, because an omitted destination matches all destinations while an empty destination list does not express that intent clearly.
- Corrected the verification label from "Headless service" to "DNS service" because `kube-dns.kube-system.svc.cluster.local` is a regular Service.
- Qualified the `single-request-reopen` guidance as applying to glibc-based resolver behavior.
- Clarified that manual kube-dns scaling is only useful for quick tests because the GKE DNS autoscaler can adjust the replica count again.

## Review Notes
The post is now technically valid for a GKE Standard-focused troubleshooting guide. Future updates could add separate paths for Autopilot clusters and Cloud DNS for GKE, because some kube-dns configuration steps do not apply there.
