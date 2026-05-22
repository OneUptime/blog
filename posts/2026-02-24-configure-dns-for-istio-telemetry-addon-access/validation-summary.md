# Validation Summary: How to Configure DNS for Istio Telemetry Addon Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway and VirtualService
- Kubernetes LoadBalancer Services
- DNS A, CNAME, wildcard, and Route 53 Alias records
- external-dns
- AWS Route 53 IAM and CLI configuration
- CoreDNS
- DNS verification with dig, nslookup, and curl

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- external-dns Istio Gateway / VirtualService source documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/istio/
- external-dns TTL documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/advanced/ttl/
- external-dns provider documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/providers/
- external-dns releases / image version references: https://github.com/kubernetes-sigs/external-dns/releases
- CoreDNS hosts plugin documentation: https://coredns.io/plugins/hosts/
- Amazon Route 53 alias versus CNAME documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html
- Amazon Route 53 ELB alias documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-elb-load-balancer.html
- Azure AKS CoreDNS customization documentation: https://learn.microsoft.com/en-us/azure/aks/coredns-custom

## Issues Found
- The Route 53 Alias example used a hard-coded ELB hosted zone ID. I changed it to `<LOAD_BALANCER_HOSTED_ZONE_ID>` because the alias target hosted zone ID depends on the load balancer type and region.
- The external-dns deployment example referenced an older image and omitted the RBAC resources needed to watch Istio Gateways and VirtualServices on RBAC-enabled clusters. I updated the image to `registry.k8s.io/external-dns/external-dns:v0.21.0` and added ServiceAccount, ClusterRole, and ClusterRoleBinding resources with Istio permissions.
- The post did not mention the current external-dns Istio source requirement for Istio 1.22 or later. I added that caveat next to the `--source=istio-virtualservice` explanation.
- The CoreDNS `coredns-custom` ConfigMap pattern is not universal across all Kubernetes distributions. I qualified it as a managed-cluster pattern used by platforms such as AKS.

## Review Notes
The overall DNS flow, A/CNAME/wildcard behavior, Kubernetes LoadBalancer status fields, external-dns source flags, AWS Route 53 Alias guidance, CoreDNS hosts plugin syntax, and verification commands are technically sound after the corrections above. Future improvements could include provider-specific external-dns install examples for GCP and Azure, but the existing high-level credential guidance is accurate.
