# Validation Summary: How to Deploy External DNS with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Kubernetes
- Helm
- ExternalDNS
- AWS Route 53 and EKS IRSA
- Google Cloud DNS and GKE Workload Identity
- Azure DNS and Azure managed identity

## Sources Consulted
- ExternalDNS Helm chart documentation: https://kubernetes-sigs.github.io/external-dns/v0.15.0/charts/external-dns/
- ExternalDNS flags documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/flags/
- ExternalDNS AWS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- ExternalDNS GKE tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/gke/
- ExternalDNS Azure DNS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/azure/
- ExternalDNS annotations documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- ExternalDNS TTL documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/advanced/ttl/
- AWS Route 53 service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonroute53.html
- ExternalDNS chart 1.14.0 values and templates from kubernetes-sigs/external-dns: https://github.com/kubernetes-sigs/external-dns/tree/external-dns-helm-chart-1.14.0/charts/external-dns

## Issues Found
- The Helm examples used provider-specific values such as `aws`, `google`, and `azure`. The pinned ExternalDNS chart version does not consume those nested values for these providers, so those settings would be ignored. Changed provider configuration to `provider.name` and moved provider options to `extraArgs` or environment variables as appropriate.
- The AWS Route 53 IAM policy used `route53:ListTagsForResource` and grouped all read actions under `"*"`. Updated the hosted-zone scoped permissions to include `route53:ListResourceRecordSets` and `route53:ListTagsForResources`, and left `route53:ListHostedZones` on `"*"`, matching Route 53 action scoping.
- The GCP example set the Cloud DNS project under an ignored `google.project` Helm value. Replaced it with the supported `--google-project` ExternalDNS flag via `extraArgs`.
- The Azure example put Azure DNS configuration under an ignored Helm value and did not mount the required `azure.json` provider configuration file. Added a Terraform-managed namespace, Kubernetes secret, and Helm `extraVolumes` / `extraVolumeMounts` configuration for `/etc/kubernetes/azure.json`.
- The zone ID filtering example used `zoneIdFilters`, which is not a chart value in the pinned chart. Replaced it with repeated `--zone-id-filter` flags in `extraArgs`.
- The dry-run example used `dryRun = true`, which is not a chart value in the pinned chart. Replaced it with the supported `--dry-run` flag in `extraArgs`.

## Review Notes
The post is technically relevant and the remaining examples are consistent with the pinned ExternalDNS Helm chart structure. Local `helm` and `terraform` binaries were not installed in the review environment, so validation was performed against official documentation and the chart's upstream values/templates rather than by rendering or planning locally.
