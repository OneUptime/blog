# Validation Summary: How to Set Up External DNS on Talos Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Talos Linux
- Kubernetes Services and Ingresses
- ExternalDNS
- Helm
- AWS Route53
- Cloudflare DNS
- Kubernetes RBAC

## Sources Consulted
- ExternalDNS AWS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- ExternalDNS Cloudflare tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/cloudflare/
- ExternalDNS annotation documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- ExternalDNS Helm chart documentation: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- ExternalDNS Helm chart values and RBAC templates: https://github.com/kubernetes-sigs/external-dns/tree/master/charts/external-dns
- AWS Route53 IAM actions reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonroute53.html

## Issues Found
- The Route53 IAM policy used `route53:ListTagsForResource`. ExternalDNS' current AWS tutorial grants `route53:ListTagsForResources` for hosted zone tag lookup, so the policy was updated to use the plural action.
- The Cloudflare setup described the token as needing only DNS edit permissions. ExternalDNS' Cloudflare documentation requires API tokens to have Zone Read and DNS Edit access, so the wording was corrected.
- The TXT ownership verification command checked `_externaldns.app.example.com`, but the chart values in the post do not configure `txtPrefix`. With the default TXT registry settings, the ownership TXT record is checked at the managed DNS name, so the command was changed to `dig app.example.com TXT +short`.
- The RBAC sample used `endpoints` for service discovery. The current ExternalDNS Helm chart grants access to `discovery.k8s.io` `endpointslices` for the service source, so the sample was updated.

## Review Notes
The ExternalDNS Helm chart values used in the post, including `provider.name`, `env`, `domainFilters`, `policy`, `txtOwnerId`, `sources`, `interval`, `logLevel`, `resources`, `tolerations`, and `annotationFilter`, match the current chart documentation. The Kubernetes Ingress and Service examples use current API versions and valid ExternalDNS annotations.
