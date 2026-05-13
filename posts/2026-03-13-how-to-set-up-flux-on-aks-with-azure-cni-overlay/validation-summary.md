# Validation Summary: How to Set Up Flux on AKS with Azure CNI Overlay

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI Overlay
- Azure CLI
- Kubernetes NetworkPolicy
- Kubernetes Service and LoadBalancer resources
- Flux CD bootstrap, Kustomization, and Receiver resources

## Sources Consulted
- Microsoft Learn: Configure Azure CNI Overlay networking in AKS, https://learn.microsoft.com/en-in/azure/aks/azure-cni-overlay
- Microsoft Learn: Azure Kubernetes Service CNI networking overview, https://learn.microsoft.com/en-us/azure/aks/concepts-network-cni-overview
- Microsoft Learn: Azure CLI `az aks` reference, https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn: Secure pod traffic with network policies in AKS, https://learn.microsoft.com/en-us/azure/aks/use-network-policies
- Microsoft Learn: AKS LoadBalancer service annotations, https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard
- Kubernetes documentation: Network Policies, https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Flux documentation: `flux bootstrap github`, https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux documentation: Webhook Receivers, https://fluxcd.io/flux/guides/webhook-receivers/
- Flux documentation: Receiver API, https://fluxcd.io/flux/components/notification/receivers/

## Issues Found
- The AKS creation command included NetworkPolicy examples later in the tutorial but did not enable an AKS network policy engine. Added `--network-policy azure` so the NetworkPolicy manifests are enforced.
- The pod CIDR explanation said the range can overlap across clusters without mentioning AKS' documented subnet overlap restriction. Updated the text to state that the pod CIDR must not overlap subnet IP ranges.
- The Flux bootstrap command used `--owner=my-org` with `--personal`, but Flux uses `--personal` when the owner is a GitHub user rather than an organization. Removed `--personal` from the organization-owned repository example.
- The Flux Receiver manifest referenced `webhook-token` but did not define the required Secret with a `token` key. Added an Opaque Secret manifest before the Receiver.
- The service connectivity and troubleshooting guidance blurred internal and public webhook reachability and incorrectly implied external rules should allow the overlay CIDR. Updated the text to distinguish public LoadBalancer/Ingress from internal LoadBalancer use and to note that overlay pod egress is SNATed to the node IP.

## Review Notes
- Azure Network Policy Manager for Linux is documented as retiring on September 30, 2028. The example is valid today, but future revisions should consider Azure CNI Powered by Cilium for new production clusters.
- The webhook LoadBalancer example is technically valid, but public GitHub webhooks require a publicly reachable endpoint; the internal load balancer example elsewhere in the post is only reachable from connected private networks.
