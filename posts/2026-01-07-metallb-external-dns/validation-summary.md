# Validation Summary: How to Integrate MetalLB with External-DNS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Services, Deployments, NetworkPolicy, and kubectl
- MetalLB IPAddressPool, L2Advertisement, and service annotations
- External-DNS Helm chart, annotations, flags, and TXT registry
- AWS Route53
- Cloudflare DNS
- Google Cloud DNS
- Azure DNS
- Helm

## Sources Consulted
- External-DNS official documentation: https://kubernetes-sigs.github.io/external-dns/
- External-DNS Helm chart documentation: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- External-DNS annotations reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- External-DNS flags reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/flags/
- External-DNS AWS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- External-DNS Cloudflare tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/cloudflare/
- External-DNS Azure DNS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/azure/
- External-DNS GKE tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/gke/
- MetalLB usage documentation: https://metallb.universe.tf/usage/
- MetalLB configuration documentation: https://metallb.universe.tf/configuration/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- Corrected the AWS IAM action `route53:ListTagsForResource` to `route53:ListTagsForResources`, matching the External-DNS AWS tutorial and Route53 IAM action name.
- Corrected the Kubernetes manifest deployment claim. The post said raw manifests were shown in the provider-specific sections, but those sections use Helm values; it now points readers to the provider-specific External-DNS tutorials for raw manifests.
- Added the Cloudflare token scope caveat that tokens should have access to all zones, or `--zone-id-filter` should be configured for zone-restricted tokens.
- Fixed a misleading Cloudflare values comment that described proxy mode under the `CF_API_TOKEN` environment variable. It now correctly identifies the token as Cloudflare API authentication.
- Corrected the Azure DNS authentication description. The shown Azure example mounts `azure.json` from a Kubernetes secret and does not configure Azure Workload Identity labels/annotations.
- Fixed the DNS record type example. An empty `external-dns.alpha.kubernetes.io/target` annotation does not explicitly request an A record; External-DNS derives A/AAAA targets from the Service status unless a target override is provided.
- Removed misleading Route53 alias-record guidance from the Service annotation example. The remaining example focuses on supported routing policy annotations and associating an existing health check.
- Fixed the complete nginx deployment example so its liveness and readiness probes use `/`, which the stock nginx image serves, instead of `/health` and `/ready`.
- Removed the `443` Service port from the complete nginx example because the stock nginx container shown only serves HTTP on port 80.
- Corrected namespace filtering guidance from multiple `--namespace` entries to a single namespace, consistent with the External-DNS flag reference.
- Replaced the invalid high-availability example using `replicaCount: 2` and `--leader-elect=true`. The current official Helm chart limits `replicaCount` to `0` or `1`; the section now recommends a single active replica.
- Fixed the NetworkPolicy Kubernetes API egress example. The previous pod/namespace selector for `kube-apiserver` was not generally valid; the example now uses an `ipBlock` placeholder for the cluster's API server endpoint or service IP.

## Review Notes
Helm and kubectl were not installed in the local environment, so local CLI help checks could not be run. The review was completed against official upstream documentation and current chart values from the External-DNS repository.
