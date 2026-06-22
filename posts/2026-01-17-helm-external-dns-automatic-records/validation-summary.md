# Validation Summary: How to Deploy External DNS with Helm for Automatic DNS Records

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ExternalDNS
- Helm
- Kubernetes Services and Ingresses
- AWS Route53
- Cloudflare DNS
- Azure DNS
- Google Cloud DNS
- Prometheus and ServiceMonitor
- Grafana

## Sources Consulted
- ExternalDNS official Helm chart documentation: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- ExternalDNS official flags reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/flags/
- ExternalDNS AWS tutorial and IAM policy: https://github.com/kubernetes-sigs/external-dns/blob/master/docs/tutorials/aws.md
- ExternalDNS Cloudflare tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/cloudflare/
- ExternalDNS Azure DNS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/azure/
- ExternalDNS GKE / Google Cloud DNS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/gke/
- ExternalDNS annotations documentation: https://github.com/kubernetes-sigs/external-dns/blob/master/docs/annotations/annotations.md
- ExternalDNS metrics reference in FAQ: https://kubernetes-sigs.github.io/external-dns/v0.13.2/faq/

## Issues Found
- The official ExternalDNS Helm chart now documents `provider.name` as the current provider value and marks legacy `provider: <name>` as deprecated. Updated AWS, Cloudflare, Azure, Google, and multi-provider examples to use `provider.name`.
- The AWS Route53 IAM policy was missing `route53:ListTagsForResources` and placed `route53:ListResourceRecordSets` in the wildcard-resource statement. Updated the policy to match the official ExternalDNS AWS guidance.
- The AWS values used top-level `aws.region` and `aws.zoneType`, which are not current official chart values. Replaced them with the supported `--aws-zone-type` flag through `extraArgs`.
- The Cloudflare values used a top-level `cloudflare.proxied` value, which is not a current official chart value. Replaced it with a note showing the supported `--cloudflare-proxied` flag through `extraArgs`.
- The Cloudflare token guidance omitted the official caveat that restricted tokens require `zoneIdFilters`; otherwise API Token authentication should have access to all zones. Added that clarification.
- The Azure values used a top-level `azure` values block, which is not a current official chart provider-specific values block. Updated the example to mount `azure.json` from a Kubernetes Secret and pass `--azure-config-file`.
- The Google values used a top-level `google` values block and `serviceAccountSecretKey`, which are not current official chart values. Updated the example to use `--google-project`, `GOOGLE_APPLICATION_CREDENTIALS`, and a mounted Secret.
- Namespace creation before provider Secret creation could fail if the namespace already existed. Changed those commands to an idempotent `kubectl create namespace ... --dry-run=client -o yaml | kubectl apply -f -` pattern.
- The Service annotation example repeated the same `external-dns.alpha.kubernetes.io/hostname` key twice, which would cause one value to overwrite the other. Removed the duplicate and kept the multiple-hostnames example.
- The Service TTL example used `60`, which is below Cloudflare's documented minimum TTL when setting a non-automatic TTL. Changed it to `300`.
- The monitoring values used `metrics.enabled`, which is not a current official ExternalDNS Helm chart value. Replaced it with the service port and `serviceMonitor` values supported by the chart.
- The troubleshooting command attempted to filter Services by an annotation using `kubectl -l`, which only filters labels. Replaced it with `kubectl get svc -A -o wide`.

## Review Notes
Local `helm` and `kubectl` binaries were not available in the review environment, so command verification was performed against official documentation rather than local CLI help output. The post is now aligned with the ExternalDNS chart documentation current as of the official chart page dated March 17, 2026.
