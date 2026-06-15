# Validation Summary: How to Set Up External DNS with Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- ExternalDNS
- Helm
- AWS Route53 and EKS IRSA
- Cloudflare DNS
- Google Cloud DNS
- Kubernetes Ingresses, Services, RBAC, and Secrets

## Sources Consulted
- ExternalDNS official AWS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- ExternalDNS official Cloudflare tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/cloudflare/
- ExternalDNS official Helm chart documentation: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- ExternalDNS official flags reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/flags/
- ExternalDNS official annotations reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- ExternalDNS upstream README: https://github.com/kubernetes-sigs/external-dns

## Issues Found
- The Helm install example used the deprecated chart value `provider=aws`. Changed it to `provider.name=aws`, which is the current value documented by the official ExternalDNS Helm chart.
- The Route53 IAM policy omitted `route53:ListTagsForResources` and placed `route53:ListResourceRecordSets` under the wildcard resource statement. Updated the policy to match the current official ExternalDNS AWS policy shape for hosted-zone record access.
- The provider Deployment examples pinned ExternalDNS `v0.14.0`, while the current official tutorials use newer releases and the AWS tutorial requires `>=0.15.0`. Updated the examples to `v0.21.0`.
- The namespace filtering section showed `--namespace=production,staging`, but the official flag reference describes `--namespace` as a single namespace filter. Removed the incorrect multi-namespace example.
- The RBAC example used the older `endpoints` resource and omitted `watch` for nodes. Updated the rules to include `discovery.k8s.io` `endpointslices` and node `watch`, matching current official ExternalDNS manifest examples.

## Review Notes
The remaining examples are technically valid, but some authentication choices are intentionally simplified. For production GKE deployments, Workload Identity is generally preferable to static service account keys even though static credentials remain supported.
