# Validation Summary: How to Configure Egress Rules with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes NetworkPolicy
- CiliumNetworkPolicy
- kubectl
- Prometheus / PrometheusRule
- Calico Enterprise policy metrics
- Cloud provider metadata services

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/network-policy-v1/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Cilium DNS/FQDN policy documentation: https://docs.cilium.io/en/latest/security/dns/
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Calico Enterprise policy metrics documentation: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/policy-metrics
- AWS EC2 Instance Metadata Service documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- Google Compute Engine metadata server documentation: https://docs.cloud.google.com/compute/docs/metadata/querying-metadata
- Azure Instance Metadata Service documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/instance-metadata-service

## Issues Found
- The DNS egress policy used a separate `namespaceSelector` and `ipBlock`, which are ORed as separate peers and allowed all port 53 traffic to the namespace plus a service CIDR. Changed it to a combined `namespaceSelector` and `podSelector` peer for kube-dns/CoreDNS pods.
- The external API examples labeled two static IPs as Stripe API IPs. Changed the comments to clarify they are example external API IPs and should be replaced with provider-published CIDRs.
- The cloud metadata block used `metadata.google.internal/32` inside `ipBlock.except`, but Kubernetes requires `except` entries to be CIDRs. Replaced the provider-specific duplicate entries with the shared metadata IPv4 endpoint `169.254.169.254/32`, which AWS, GCP, and Azure document for metadata service access.
- The PreSync validation Job referenced `/policies/`, but the example Job did not mount or create that path. Replaced it with an inline server-side dry-run of a representative NetworkPolicy manifest.
- The Calico Prometheus examples used `calico_denied_packets_total{direction="egress"}`, but the documented Calico Enterprise metrics use `calico_denied_packets` without a direction label or `cnx_policy_rule_packets` with policy direction/action labels. Updated the query and alert to use `cnx_policy_rule_packets{action="deny", traffic_direction="egress"}`.
- The Cilium drop query grouped `cilium_drop_count_total` by `namespace`, but the documented metric labels are `reason` and `direction`. Removed the namespace grouping from that example.

## Review Notes
The Kubernetes API server `ipBlock` example assumes the API server Service IP is stable and that the network plugin evaluates the connection in a way that matches that IP; Kubernetes documents that Service IP rewriting order can vary by plugin. For SaaS APIs with changing addresses, Cilium FQDN policy or provider-published CIDR lists are more reliable than hard-coded IPs.
