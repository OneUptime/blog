# Validation Summary: How to Set Up Automated Security Scanning in CI/CD Pipelines Using Cloud Build

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Artifact Analysis / Container Analysis API
- Google Cloud Artifact Registry
- Google Cloud Build
- Google Cloud CLI
- On-Demand Scanning
- Cloud Run
- Cloud Scheduler
- Cloud Monitoring dashboards
- Docker
- Node.js
- Python Google Cloud client libraries
- jq and yq
- Gitleaks

## Sources Consulted
- Google Cloud Artifact Analysis container scanning overview: https://docs.cloud.google.com/artifact-analysis/docs/container-scanning-overview
- Google Cloud Artifact Analysis automatic scanning settings: https://docs.cloud.google.com/artifact-analysis/docs/enable-automatic-scanning
- Google Cloud Artifact Analysis On-Demand Scanning in Cloud Build: https://docs.cloud.google.com/artifact-analysis/docs/ods-cloudbuild
- Google Cloud CLI reference for `gcloud artifacts docker images scan`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/scan
- Google Cloud CLI reference for `gcloud artifacts docker images list-vulnerabilities`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/list-vulnerabilities
- Google Cloud CLI reference for `gcloud artifacts docker images describe`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/describe
- Google Cloud CLI reference for `gcloud artifacts repositories update`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/repositories/update
- Google Cloud CLI reference for `gcloud artifacts vulnerabilities list`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/vulnerabilities/list
- Google Cloud Build configuration schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Python Artifact Registry `DockerImage` reference: https://docs.cloud.google.com/python/docs/reference/artifactregistry/latest/google.cloud.artifactregistry_v1.types.DockerImage
- Google Cloud Python Container Analysis client reference: https://docs.cloud.google.com/python/docs/reference/containeranalysis/latest/google.cloud.devtools.containeranalysis_v1.services.container_analysis.ContainerAnalysisClient
- Node.js official release schedule: https://github.com/nodejs/Release
- Gitleaks GitHub releases: https://github.com/gitleaks/gitleaks/releases
- Google Cloud Container Registry shutdown notice: https://cloud.google.com/artifact-registry/docs/transition/prepare-gcr-shutdown

## Issues Found
- The post used `gcloud artifacts settings update --scanning=on --scanning-level=STANDARD`, but current Google Cloud CLI documentation uses repository-level `gcloud artifacts repositories update ... --allow-vulnerability-scanning`. Updated the command accordingly.
- The API enablement list omitted `cloudbuild.googleapis.com` and `ondemandscanning.googleapis.com`, which are required for the Cloud Build and On-Demand Scanning workflow shown. Added both APIs.
- The Cloud Build service account roles required for On-Demand Scanning were not stated. Added the documented `roles/ondemandscanning.admin` and `roles/artifactregistry.writer` requirements.
- The Cloud Build sample waited for automatic scan output using an undocumented `image_summary.vulnerabilities` field and later queried `.package_vulnerability[]`. Replaced this with the documented On-Demand Scanning flow: `gcloud artifacts docker images scan` followed by `gcloud artifacts docker images list-vulnerabilities`.
- The vulnerability policy jq expressions expected a non-matching JSON shape. Updated them to process the Grafeas occurrence list returned by `list-vulnerabilities`.
- The Node.js examples used Node 20, which is End-of-Life as of April 30, 2026. Updated examples to Node 24.
- The Dockerfile used deprecated `npm ci --only=production`. Updated it to `npm ci --omit=dev`.
- The Dockerfile health check depended on `curl`, which is not guaranteed in slim images. Replaced it with a Node-based health check.
- The continuous monitoring Python example referenced undefined `get_vulnerabilities` and `send_alert` functions and imported an unused Monitoring client. Reworked it to use the Container Analysis client to list vulnerability occurrences and print alert payloads for integration with an alerting system.
- The waiver jq filter referenced the old vulnerability JSON shape and used unsafe shell expansion. Updated it to match the occurrence list and preserve newline handling.
- The post referred to Container Registry as a current push target. Removed that claim because Container Registry writes have been shut down; the examples now focus on Artifact Registry.
- The Gitleaks download was pinned to an old release. Updated it to the current 8.30.1 release available during review.

## Review Notes
The dashboard section assumes custom metrics such as `custom.googleapis.com/container/vulnerabilities` and `custom.googleapis.com/build/security_gate` are already written by the pipeline or monitoring function. That is a reasonable example for a dashboard, but a future revision could include the metric-writing code for completeness.
