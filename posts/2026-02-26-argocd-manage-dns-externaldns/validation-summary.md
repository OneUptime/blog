# Validation Summary: How to Manage DNS Records with ArgoCD and ExternalDNS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- ExternalDNS
- Kubernetes Ingress and Service resources
- ExternalDNS DNSEndpoint CRD
- AWS Route53
- Google Cloud DNS
- Azure DNS
- Prometheus metrics

## Sources Consulted
- ExternalDNS Helm chart documentation: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- ExternalDNS flags reference: https://kubernetes-sigs.github.io/external-dns/latest/docs/flags/
- ExternalDNS AWS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- ExternalDNS GKE / Google Cloud DNS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/gke/
- ExternalDNS Azure DNS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/azure/
- ExternalDNS metrics documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/monitoring/metrics/
- ExternalDNS MX record with CRD source documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/mx-record/
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/application-specification/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/

## Issues Found
- The ExternalDNS Helm examples used chart version `1.14.0` and legacy/deprecated provider values such as `provider: aws`. Updated the examples to chart version `1.20.0` and current `provider.name` syntax.
- The AWS example used non-current chart values under `aws.region` and `aws.zoneType`. Replaced them with `AWS_DEFAULT_REGION` and `extraArgs.aws-zone-type`, matching ExternalDNS provider flags and chart values.
- The Google Cloud DNS example used unsupported current-chart values for service account secret mounting. Replaced them with `extraArgs.google-project`, `GOOGLE_APPLICATION_CREDENTIALS`, `extraVolumes`, and `extraVolumeMounts`.
- The Azure DNS snippet used provider-specific nested values that are not current chart values. Reworked it to use `provider.name`, `extraArgs.azure-resource-group`, Azure config secret mounting, and workload identity labels/annotations.
- The DNSEndpoint CRD section included MX and TXT examples without noting that those record types must be enabled. Added `managedRecordTypes: [A, AAAA, CNAME, MX, TXT]` to the ExternalDNS values comment.
- The Argo CD deletion safety snippet claimed `PrunePropagationPolicy` and `PruneLast` require manual approval. Replaced the example with `Prune=confirm`, which is the Argo CD sync option for pruning confirmation.
- The monitoring section used `external_dns_controller_last_sync_timestamp`, which is missing the `_seconds` suffix in current ExternalDNS metrics. Corrected it to `external_dns_controller_last_sync_timestamp_seconds`.
- The monitoring section described `rate(external_dns_registry_endpoints_total[1h])` as record change rate, but that metric is a gauge. Replaced it with `rate(external_dns_controller_no_op_runs_total[1h])`, a valid counter-based query for no-change reconciliation loops.

## Review Notes
- The article is technically relevant and includes implementation-focused YAML, Kubernetes resources, and Prometheus queries.
- The examples remain illustrative and still require provider-specific IAM, Google IAM, or Azure identity setup before they can be applied in a real cluster.
