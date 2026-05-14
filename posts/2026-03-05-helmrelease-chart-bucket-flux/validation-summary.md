# Validation Summary: How to Use HelmRelease with Chart from Bucket in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller Bucket resources
- Flux helm-controller HelmRelease resources
- Kubernetes Secrets and custom resources
- Helm charts
- AWS S3
- Google Cloud Storage
- Azure Blob Storage
- MinIO
- AWS CLI

## Sources Consulted
- Flux Bucket source documentation: https://fluxcd.io/flux/components/source/buckets/
- Flux HelmChart source documentation: https://fluxcd.io/flux/components/source/helmcharts/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux CLI `get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux CLI `get sources bucket` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_bucket/
- Flux CLI `create helmrelease` documentation: https://fluxcd.io/flux/cmd/flux_create_helmrelease/

## Issues Found
- The post described all Bucket providers as S3-compatible. Flux's Bucket API supports S3-compatible storage through the generic provider and provider-specific integrations for AWS, Azure, and GCP, so the wording was updated to "object storage" where appropriate.
- The Bucket example comment said `aws`, `gcp`, `azure`, and `generic` were S3-compatible providers. This was changed to "Provider options" to match Flux documentation.
- The Azure Blob Storage example referenced a Secret but did not show the required credential key. Added a Kubernetes Secret example using `accountKey`, which is one of the documented Azure authentication keys for Flux Bucket sources.
- The verification commands used singular Flux CLI resource names: `flux get source bucket` and `flux get helmrelease`. Updated them to the documented commands `flux get sources bucket` and `flux get helmreleases`.

## Review Notes
The HelmRelease examples using `spec.chart.spec.sourceRef.kind: Bucket`, chart paths such as `./my-app`, and `reconcileStrategy: Revision` are consistent with the Flux HelmChart and HelmRelease documentation. Flux also supports packaged chart paths from GitRepository or Bucket sources, so the `.tgz` guidance is valid.
