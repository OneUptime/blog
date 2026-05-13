# Validation Summary: Deploy ExternalDNS with AWS Route 53 Using Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ExternalDNS
- AWS Route 53
- AWS IAM credentials
- Kubernetes Services and Ingresses
- Flux CD HelmRepository, HelmRelease, and Kustomization resources
- Helm chart configuration

## Sources Consulted
- ExternalDNS Helm chart values for chart 1.14.5: https://raw.githubusercontent.com/kubernetes-sigs/external-dns/external-dns-helm-chart-1.14.5/charts/external-dns/values.yaml
- ExternalDNS AWS Route 53 tutorial: https://raw.githubusercontent.com/kubernetes-sigs/external-dns/master/docs/tutorials/aws.md
- ExternalDNS annotations documentation: https://raw.githubusercontent.com/kubernetes-sigs/external-dns/master/docs/annotations/annotations.md
- ExternalDNS flags documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/flags/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Amazon Route 53 IAM documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/auth-and-access-control.html

## Issues Found
- The Helm values used `provider: route53`, but the ExternalDNS chart and ExternalDNS provider name for Route 53 use AWS. Changed it to `provider.name: aws` for the pinned 1.14.x chart.
- The post configured `annotationFilter` as a direct Helm value, but ExternalDNS chart 1.14.x does not expose that value. Changed it to `extraArgs: ["--annotation-filter=..."]`, which maps to the supported ExternalDNS flag.
- The AWS credential secret and environment variable example used a generic `PROVIDER_KEY`, which ExternalDNS/AWS SDK would not use. Changed the secret keys and environment variables to `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.
- The metrics example used `metrics.serviceMonitor.enabled`, but chart 1.14.x exposes `serviceMonitor.enabled` as a top-level value. Updated the HelmRelease values accordingly.
- The opt-in annotation key in the Service and Ingress examples did not match the annotation filter because it omitted the hyphen in `external-dns`. Updated both examples to match the filter.
- The HelmRelease file comment pointed at a file while the Flux Kustomization path pointed at a directory. Updated the comment to use a manifest path under the directory.

## Review Notes
- The static AWS credential example is now technically valid, but IRSA is preferable on EKS because it avoids long-lived AWS keys in Kubernetes Secrets.
- `policy: sync` is correct, but it can delete records that ExternalDNS believes it owns. The post already recommends starting with `upsert-only` during testing.
