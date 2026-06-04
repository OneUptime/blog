# Validation Summary: Upgrading Crossplane Providers Safely in Production Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Crossplane providers and ProviderRevisions
- Kubernetes custom resources and kubectl
- Upbound AWS Crossplane providers
- PrometheusRule monitoring
- Renovate custom managers
- Helm and kind

## Sources Consulted
- Crossplane Providers documentation: https://docs.crossplane.io/latest/packages/providers/
- Crossplane Metrics documentation: https://docs.crossplane.io/latest/guides/metrics/
- Crossplane Managed Resources documentation: https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Crossplane API reference: https://docs.crossplane.io/latest/api/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Upbound Marketplace RDS Instance resource reference: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v1.0.0/resources/rds.aws.upbound.io/Instance/v1beta2
- Renovate custom managers documentation: https://docs.renovatebot.com/modules/manager/regex/

## Issues Found
- The post described a staged rollout using multiple ProviderConfigs as a way to canary a provider upgrade. This was inaccurate because ProviderConfigs control authentication and external provider settings, while Crossplane allows only one active ProviderRevision for a Provider. I changed the section to recommend a staging or canary Crossplane cluster for testing the new provider version.
- The monitoring example used `crossplane_managed_resource_ready{status!="True"}` and `crossplane_provider_revision_healthy{status!="True"}`. The official Crossplane metrics documentation lists `crossplane_managed_resource_ready`, `crossplane_managed_resource_synced`, and `crossplane_managed_resource_exists`, but not those status-label forms or a `crossplane_provider_revision_healthy` metric. I changed the alerts to compare documented managed-resource count metrics and removed the unsupported provider-revision metric.
- The provider upgrade explanation stated that there is definitely a period with no controller reconciling resources. I adjusted the wording to the documented ProviderRevision model: only one revision is active, and reconciliation can be briefly interrupted while the new active revision becomes healthy.
- The Renovate example used `fileMatch` in a `customManagers` entry. Current Renovate custom regex manager documentation uses `managerFilePatterns`, so I updated the snippet accordingly.

## Review Notes
The remaining examples are version-sensitive because Upbound provider API groups and scopes changed across major provider versions, especially around Crossplane v2 namespace-scoped managed resources. The post uses v1-style examples, which are still coherent for the package versions shown, but future updates should call out Crossplane/provider major-version assumptions explicitly.
