# Validation Summary: How to Use GKE Node Local DNS Cache to Reduce DNS Latency for Pods

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Kubernetes Engine
- NodeLocal DNSCache
- Kubernetes DNS
- kube-dns
- Cloud DNS for GKE
- gcloud CLI
- kubectl
- Cloud Monitoring and Managed Service for Prometheus

## Sources Consulted
- Google Cloud documentation: Set up NodeLocal DNSCache: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/nodelocal-dns-cache
- Google Cloud SDK documentation: gcloud container clusters update: https://cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Google Cloud SDK documentation: gcloud container clusters create: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Kubernetes documentation: Using NodeLocal DNSCache in Kubernetes Clusters: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- Google Cloud documentation: Configure metrics collection for GKE: https://cloud.google.com/kubernetes-engine/docs/how-to/configure-metrics

## Issues Found
- The post described Node Local DNS Cache as forwarding every cache miss to kube-dns. Updated this to distinguish cluster-domain queries, custom stub domains/upstream name servers, and Cloud DNS for GKE external-query forwarding through the local metadata server.
- The post implied Node Local DNS Cache must be manually enabled on all GKE clusters. Updated this to note that it is enabled by default on Autopilot clusters and newer Standard clusters, while older Standard clusters can enable it as an add-on.
- The gcloud examples used `--zone` and `--addons=NodeLocalDNS`. Updated examples to use the current documented `--location` form and explicit `--addons=NodeLocalDNS=ENABLED` syntax for new clusters.
- The post omitted the operational impact of enabling the add-on on existing Standard clusters. Added that enabling it can require node re-creation and may follow node upgrade and maintenance policies.
- The under-the-hood section described GKE specifically modifying iptables rules. Updated this to the more generally accurate node DNS routing behavior, because GKE networking can differ by dataplane and Cloud DNS configuration.
- The cache TTL description said records follow the upstream TTL without qualification. Updated it to reflect GKE's documented TTL cap of 30 seconds.
- The negative cache TTL was listed as 30 seconds. Corrected it to GKE's documented 5-second `NXDOMAIN` cache period.
- The configuration section said the cache listens on 169.254.20.10 for cluster DNS and on the kube-dns service IP. Updated this to reflect the Cloud DNS for GKE case, where pods use 169.254.20.10, and the kube-dns service IP case used by other configurations.
- The monitoring section implied Managed Service for Prometheus automatically collects the cache metrics. Updated this to state that the node-local-dns pods expose CoreDNS-style metrics and that metrics collection must be configured to scrape them.
- The troubleshooting section said `/etc/resolv.conf` should always point to the kube-dns service IP. Updated it to include the Cloud DNS for GKE case, where the nameserver should be 169.254.20.10.

## Review Notes
The example `kubectl` commands are syntactically valid. The latency numbers remain framed as typical examples rather than guaranteed results, so they were left unchanged.
