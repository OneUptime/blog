# Validation Summary: How to Use Secrets Management in GitOps Using External Secrets Operator

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- External Secrets Operator
- Flux HelmRepository and HelmRelease
- Kubernetes Secrets, ServiceAccounts, and ConfigMaps
- HashiCorp Vault
- AWS Secrets Manager
- Google Secret Manager
- Prometheus metrics and alerts
- Bitnami Sealed Secrets

## Sources Consulted
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator API specification: https://external-secrets.io/v2.4.0/api/spec/
- External Secrets Operator HashiCorp Vault provider documentation: https://external-secrets.io/v2.2.0/provider/hashicorp-vault/
- External Secrets Operator AWS access documentation: https://external-secrets.io/latest/provider/aws-access/
- External Secrets Operator Google Secret Manager provider documentation: https://external-secrets.io/v0.20.3/provider/google-secrets-manager/
- External Secrets Operator metrics documentation: https://external-secrets.io/v0.5.9/guides-metrics/
- External Secrets Operator lifecycle documentation: https://external-secrets.io/latest/guides/ownership-deletion-policy/
- External Secrets Operator templating documentation: https://external-secrets.io/latest/guides/templating/
- External Secrets Operator Helm chart repository index: https://charts.external-secrets.io/index.yaml
- Flux HelmRelease v2 API documentation: https://fluxcd.io/flux/components/helm/api/v2/
- Bitnami Sealed Secrets project documentation: https://github.com/bitnami-labs/sealed-secrets

## Issues Found
- The post used `external-secrets.io/v1beta1` throughout. Updated External Secrets Operator resources to `external-secrets.io/v1`, matching current official examples and API documentation.
- The HelmRelease pinned the External Secrets Operator chart to `0.9.x`, which is outdated. Updated it to `2.5.x`, matching the current chart major/minor available in the official chart repository as of this review.
- The Helm values used `webhook.port: 9443`, but the current chart default is `10250`. Updated the value and enabled `metrics.service.enabled` so the later metrics port-forward example has a service to target.
- The templating example omitted `engineVersion: v2`, while current official templating examples specify it. Added `engineVersion: v2` under `target.template`.
- The rotation section implied ESO configures automatic secret rotation. Revised it to describe periodic sync for credentials that are rotated in the external provider.
- The Prometheus examples used incorrect metric names with the `external_secrets` prefix. Updated them to the documented `externalsecret_sync_calls_total` and `externalsecret_sync_calls_error` metrics.
- The metrics port-forward targeted the webhook service in an `external-secrets-system` namespace even though the HelmRelease installs into `flux-system` and the core sync metrics are exposed through the metrics service when enabled. Updated the command to `svc/external-secrets-metrics` in `flux-system`.
- The Sealed Secrets section implied an automatic fallback relationship with ExternalSecret resources. Reworded it as separate git-encrypted backup manifests to avoid claiming controller-level fallback behavior.
- The best-practice note said a sync failure means applications cannot access credentials. Updated it to say applications may miss updated credentials, since existing Kubernetes Secrets can remain available depending on lifecycle policy and prior sync state.

## Review Notes
The examples are syntactically valid YAML after edits. The provider snippets still assume prerequisite cloud/Vault identity setup, IAM policies, Vault roles, and Secret Manager permissions are configured outside the shown manifests.
