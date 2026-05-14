# Validation Summary: How to Set Up HelmChart Source from Bucket in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm
- Flux Source Controller `Bucket` and `HelmChart` resources
- Flux Helm Controller `HelmRelease` resources
- AWS S3, S3-compatible storage, MinIO, and Google Cloud Storage
- kubectl and Flux CLI

## Sources Consulted
- Flux Bucket documentation: https://fluxcd.io/flux/components/source/buckets/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux HelmChart documentation: https://fluxcd.io/flux/components/source/helmcharts/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux CLI `get sources` reference: https://fluxcd.io/flux/cmd/flux_get_sources/
- Flux CLI `reconcile source` reference: https://fluxcd.io/flux/cmd/flux_reconcile_source/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The post described `HelmChart.spec.valuesFiles` as paths relative to the chart directory. Flux documents `valuesFiles` as paths relative to the source reference artifact. Updated the text and example to use `./charts/my-app/values.yaml` and `./charts/my-app/values-production.yaml`.

## Review Notes
- The Flux and kubectl CLIs were not installed in the local workspace, so command validation was performed against official CLI documentation.
- The Bucket, HelmChart, and HelmRelease API versions and fields used in the examples are current for Flux v2 with `source.toolkit.fluxcd.io/v1` and `helm.toolkit.fluxcd.io/v2`.
- The GCS example uses static service account credentials. Workload Identity is also supported by Flux, but it requires a Kubernetes service account and controller feature-gate configuration when using object-level workload identity.
