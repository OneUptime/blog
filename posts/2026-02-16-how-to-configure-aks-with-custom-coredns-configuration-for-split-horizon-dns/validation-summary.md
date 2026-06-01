# Validation Summary: How to Configure AKS with Custom CoreDNS Configuration for Split-Horizon DNS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes DNS and Services
- CoreDNS ConfigMaps
- CoreDNS rewrite, hosts, forward, and cache plugins
- kubectl
- cert-manager
- TLS certificate Subject Alternative Names

## Sources Consulted
- Microsoft Learn: Customize CoreDNS for Azure Kubernetes Service (AKS): https://learn.microsoft.com/azure/aks/coredns-custom
- CoreDNS rewrite plugin documentation: https://coredns.io/plugins/rewrite/
- CoreDNS hosts plugin documentation: https://coredns.io/plugins/hosts/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- CoreDNS cache plugin documentation: https://coredns.io/plugins/cache/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- CA/Browser Forum guidance on deprecated internal server names: https://cabforum.org/2013/02/04/guidance-on-the-deprecation-of-internal-server-names-and-reserved-ip-addresses/

## Issues Found
- The traffic-flow explanation said pod DNS queries go directly to a public DNS server and make a round trip through the internet. In Kubernetes, pods normally query the cluster DNS service first, and CoreDNS forwards external names to upstream resolvers. The traffic may then use an external-facing load balancer path, but it is not necessarily a literal internet round trip. Updated the wording to describe CoreDNS forwarding to the upstream resolver and traffic going through the external-facing load balancer path.
- The cert-manager example used a `letsencrypt-prod` ClusterIssuer while requesting a certificate for `api-service.production.svc.cluster.local`. Publicly trusted CAs should not issue certificates for internal-only names such as `cluster.local`. Removed the internal service DNS name from the Let's Encrypt example and added a note to keep public ACME SANs to domain names controlled in public DNS.

## Review Notes
The AKS `coredns-custom` ConfigMap naming conventions, `.server` and `.override` behavior, CoreDNS rewrite syntax, hosts `fallthrough`, forward rules, cache syntax, and `kubectl rollout restart` commands match current official documentation. The hosts plugin can only be used once per CoreDNS server block, so future examples should avoid adding multiple `.override` snippets that each define a `hosts` block in the same server block.
