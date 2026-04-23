# Validation Summary: How to Set Up External DNS with Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- ExternalDNS
- Helm
- AWS Route53
- AWS IAM
- Cloudflare
- Route53 public/private hosted zones

## Sources Consulted
- ExternalDNS AWS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- ExternalDNS Cloudflare tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/cloudflare/
- ExternalDNS flags reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/flags/
- ExternalDNS annotations reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- ExternalDNS TTL documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/advanced/ttl/
- ExternalDNS chart documentation: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- Bitnami `external-dns` chart values: https://github.com/bitnami/charts/blob/main/bitnami/external-dns/values.yaml
- Bitnami `external-dns` deployment template: https://github.com/bitnami/charts/blob/main/bitnami/external-dns/templates/deployment.yaml
- Bitnami `external-dns` service account template: https://github.com/bitnami/charts/blob/main/bitnami/external-dns/templates/serviceaccount.yaml
- Bitnami `external-dns` ServiceMonitor template: https://github.com/bitnami/charts/blob/main/bitnami/external-dns/templates/servicemonitor.yaml
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes well-known annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- AWS IAM `create-policy` CLI reference: https://docs.aws.amazon.com/cli/latest/reference/iam/create-policy.html
- Amazon Route 53 service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonroute53.html

## Issues Found
- The Route53 IAM policy used `route53:ListTagsForResource`; current ExternalDNS AWS docs use `route53:ListTagsForResources`. I updated the policy to the current documented action set and scoped the hosted-zone read actions to `arn:aws:route53:::hostedzone/*`.
- The Bitnami chart values mixed incorrect keys from different chart variants. I changed `aws.zoneTagFilter` to `aws.zoneTags`, moved the IRSA annotation to `serviceAccount.annotations`, and changed the Prometheus configuration to `metrics.enabled` plus `metrics.serviceMonitor`, which is what the current Bitnami chart renders.
- The public AWS example filtered both `example.com` and `internal.example.com` while also forcing `aws.zoneType: "public"`. I removed `internal.example.com` from that example so it matches the public-zone setup shown in the post.
- The ingress example used the deprecated `kubernetes.io/ingress.class` annotation and also set a TTL without a hostname annotation. I replaced it with `spec.ingressClassName` and added `external-dns.alpha.kubernetes.io/hostname`, which is required for the TTL annotation to apply and also matches the guide’s `annotationFilter`.
- The Cloudflare values example used a top-level `env:` block and a secret key named `api-token`, which do not match the current Bitnami chart conventions. I switched it to `cloudflare.secretName` and updated the secret key to `cloudflare_api_token`.
- The Step 5 manifests were invalid `apps/v1` Deployments because they omitted the required selector and pod template labels. I added `replicas`, `selector.matchLabels`, `template.metadata.labels`, and `serviceAccountName`.
- The Step 5 example pinned `registry.k8s.io/external-dns/external-dns:v0.14.0`, which is outdated relative to current ExternalDNS releases and Kubernetes compatibility guidance. I updated it to `v0.21.0`.
- The Step 5 example used `--annotation-filter=external-dns.alpha.kubernetes.io/target=...`, which would change record targets instead of acting as a safe public/private marker. I removed those flags.
- The conflict-handling section suggested `external-dns.alpha.kubernetes.io/exclude=true`, but that annotation has no standalone effect in the configuration used earlier in the post. I replaced it with removal of the hostname annotation, which correctly stops ExternalDNS from managing that service under this guide’s setup.
- The Route53 verification query filtered only A records and projected TTL, which is not reliable for Route53 alias records. I changed it to query the specific record name and include the alias target field.

## Review Notes
- The post is now technically consistent with the current Bitnami `external-dns` Helm chart rather than the upstream ExternalDNS chart.
- `annotationFilter: "external-dns.alpha.kubernetes.io/hostname"` is valid because ExternalDNS uses label-selector semantics for annotation filters, and a bare key matches resources where that annotation exists.
- The public/private Route53 example uses different domain filters (`example.com` vs `internal.example.com`). If the intent is true split-horizon DNS for the same hostname in both public and private zones, ExternalDNS’s current split-horizon guidance recommends separate instances with distinct annotation prefixes or other explicit resource scoping.
