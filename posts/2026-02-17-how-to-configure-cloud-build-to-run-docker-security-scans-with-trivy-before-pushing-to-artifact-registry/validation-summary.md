# Validation Summary: How to Configure Cloud Build to Run Docker Security Scans with Trivy Before

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Build
- Google Artifact Registry
- Google Cloud CLI
- Trivy
- Docker
- Cloud Storage build artifacts
- YAML configuration

## Sources Consulted
- Google Cloud Build build configuration file schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build container image build and push documentation: https://docs.cloud.google.com/build/docs/building/build-containers
- Google Cloud Build Cloud Storage artifacts documentation: https://docs.cloud.google.com/build/docs/building/store-artifacts-in-cloud-storage
- Google Cloud CLI reference for `gcloud builds triggers create github`: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Trivy image command reference: https://trivy.dev/latest/docs/references/configuration/cli/trivy_image/
- Trivy config command and misconfiguration scanning documentation: https://trivy.dev/docs/latest/references/configuration/cli/trivy_config/
- Trivy configuration file reference: https://trivy.dev/docs/latest/references/configuration/config-file/
- Trivy cache documentation: https://trivy.dev/docs/latest/configuration/cache/
- Aqua Security Trivy advisory GHSA-69fq-xp46-6x23: https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23

## Issues Found
- The examples used `aquasec/trivy:latest`. Current Trivy advisory guidance identifies `v0.69.3` as a known-safe version after the March 2026 Trivy supply-chain incident and notes that `latest` was affected during the exposure window. Updated Cloud Build examples to use `aquasec/trivy:0.69.3`.
- The introductory gate description said only critical vulnerabilities fail the build, but the examples use `--severity CRITICAL,HIGH`. Updated the sentence to say critical or high vulnerabilities.
- The enhanced report step was described as always succeeding. Trivy can still fail on operational scan errors; it just does not fail on vulnerability findings without `--exit-code`. Updated the comment to say it generates a report without failing on vulnerabilities.
- The `trivy.yaml` example placed `ignore-unfixed` and `skip-files` at the top level. Current Trivy config-file schema nests these under `vulnerability.ignore-unfixed` and `scan.skip-files`. Updated the example accordingly.

## Review Notes
- The Cloud Build, Artifact Registry, artifact upload, and trigger command examples are otherwise consistent with current Google Cloud documentation.
- The examples assume the Cloud Storage buckets used for reports and cache already exist and that the Cloud Build service account has permission to read and write them.
