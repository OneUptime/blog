# Validation Summary: How to Scan Container Images for Vulnerabilities Using Artifact Analysis in GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Artifact Analysis
- Artifact Registry
- Container Scanning API
- On-Demand Scanning API
- Google Cloud CLI
- Cloud Build
- Pub/Sub
- SBOM export
- Kubernetes deployment via Cloud Build

## Sources Consulted
- Google Cloud Artifact Analysis container scanning overview: https://docs.cloud.google.com/artifact-analysis/docs/container-scanning-overview
- Google Cloud automatic OS package scanning documentation: https://docs.cloud.google.com/artifact-analysis/docs/scan-os-automatically
- Google Cloud on-demand OS package scanning documentation: https://docs.cloud.google.com/artifact-analysis/docs/scan-os-on-demand
- `gcloud artifacts docker images scan` reference: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/scan
- `gcloud artifacts docker images list-vulnerabilities` reference: https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/list-vulnerabilities
- `gcloud artifacts docker images describe` reference: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/describe
- `gcloud artifacts docker images list` reference: https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/list
- `gcloud artifacts sbom export` reference: https://cloud.google.com/sdk/gcloud/reference/artifacts/sbom/export
- Artifact Analysis Pub/Sub notifications documentation: https://docs.cloud.google.com/artifact-analysis/docs/pub-sub-notifications
- Cloud Build substitution variables documentation: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values

## Issues Found
- The post used `gcloud artifacts docker images list-vulnerabilities` with an image URI for automatic scanning results. That command lists vulnerabilities for an On-Demand Scanning scan resource, so I changed automatic scan occurrence listing to `gcloud artifacts docker images list --show-occurrences` with a vulnerability occurrence filter.
- The on-demand scan examples used `--location=us-central1`, but the On-Demand Scanning API accepts multi-regions: `us`, `europe`, and `asia`. I changed the examples to `--location=us`.
- The remote on-demand scan examples omitted `--remote`. I added `--remote` for Artifact Registry image scans.
- The local scan example pushed an image to Artifact Registry before scanning even though on-demand scanning supports local images directly. I simplified it to scan `my-app:latest` locally.
- The post used deprecated `--additional-package-types` and the invalid value `PYPI`. I replaced that section with the current default behavior and a `--skip-package-types` example.
- The Pub/Sub notification example created a custom topic, but Artifact Analysis publishes occurrence updates to `container-analysis-occurrences-v1`. I updated the topic and subscription example accordingly.
- The SBOM export example used `--resource`, but the current `gcloud artifacts sbom export` command requires `--uri`. I corrected the flag.
- The automatic scanning wording implied unconditional scanning for every repository. I clarified that scanning applies to Artifact Registry Docker repositories with scanning enabled.

## Review Notes
The Cloud Build example remains illustrative. In a production pipeline, teams should also ensure the Cloud Build service account has the required Artifact Registry, On-Demand Scanning, and Kubernetes permissions, and should decide whether to gate on all fixable critical vulnerabilities or only vulnerabilities relevant to their runtime risk model.
