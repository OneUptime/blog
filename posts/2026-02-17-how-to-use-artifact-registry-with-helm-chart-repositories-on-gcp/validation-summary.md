# Validation Summary: How to Use Artifact Registry with Helm Chart Repositories on GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Artifact Registry
- Helm 3 OCI registries
- Kubernetes Helm charts
- Google Cloud CLI
- Cloud Build
- Google Cloud IAM
- Helm chart provenance signing

## Sources Consulted
- Google Cloud Artifact Registry: Work with Helm charts: https://docs.cloud.google.com/artifact-registry/docs/helm
- Google Cloud Artifact Registry: Manage Helm charts: https://docs.cloud.google.com/artifact-registry/docs/helm/manage-charts
- Google Cloud Artifact Registry: Store Helm charts quickstart: https://docs.cloud.google.com/artifact-registry/docs/helm/store-helm-charts
- Google Cloud Artifact Registry: Set up authentication for Helm: https://docs.cloud.google.com/artifact-registry/docs/helm/authentication
- Google Cloud Artifact Registry: Supported formats: https://docs.cloud.google.com/artifact-registry/docs/supported-formats
- Google Cloud Artifact Registry: Cleanup policy overview: https://cloud.google.com/artifact-registry/docs/repositories/cleanup-policy-overview
- Google Cloud SDK reference: gcloud artifacts docker tags list: https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/tags/list
- Helm documentation: Use OCI-based registries: https://helm.sh/docs/v3/topics/registries/
- Helm documentation: helm package: https://helm.sh/docs/v3/helm/helm_package/
- Helm documentation: Provenance and Integrity: https://helm.sh/docs/topics/provenance
- Google Cloud Artifact Analysis: Artifact analysis and vulnerability scanning: https://docs.cloud.google.com/artifact-registry/docs/analysis

## Issues Found
- The chart signing example used `~/.gnupg/pubring.gpg` as the keyring for `helm package --sign`. Helm's signing documentation says signing usually needs a keyring containing secret keys, commonly `~/.gnupg/secring.gpg`, so the example was updated.
- The chart signing section said to push both the chart and provenance file, but the command only runs `helm push` on the `.tgz` file. Helm automatically uploads a colocated `.prov` file when pushing to an OCI registry, so the comment was clarified.
- The wrap-up claimed vulnerability scanning works for Helm charts the same way it works for Docker images. Google Cloud's vulnerability scanning documentation is focused on container images and packages, so that claim was removed while keeping the accurate IAM and cleanup policy statement.

## Review Notes
The core Artifact Registry and Helm OCI workflow is accurate: Helm 3.8.0 and later enables OCI support by default, Artifact Registry stores Helm 3 charts in Docker repositories, `helm push` uses the chart name and version from `Chart.yaml`, and the listed pull/install/dependency patterns match official Helm and Google Cloud documentation. Local `helm` and `gcloud` binaries were not installed in this environment, so CLI verification was performed against official documentation rather than local `--help` output.
