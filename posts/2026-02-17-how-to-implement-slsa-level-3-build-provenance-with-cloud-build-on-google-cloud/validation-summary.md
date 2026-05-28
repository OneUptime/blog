# Validation Summary: How to Implement SLSA Level 3 Build Provenance with Cloud Build on Google Cloud

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Build
- SLSA build provenance
- Artifact Registry
- Artifact Analysis vulnerability scanning
- Binary Authorization
- Google Cloud CLI
- Terraform Google provider
- Python Google Cloud client libraries
- Cloud KMS
- GKE deployment

## Sources Consulted
- Google Cloud Build: Generate and validate build provenance: https://cloud.google.com/build/docs/securing-builds/generate-validate-build-provenance
- Google Cloud SDK: `gcloud artifacts docker images describe`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/describe
- SLSA v0.1 requirements: https://slsa.dev/spec/v0.1/requirements
- Binary Authorization: Deploy only images built by Cloud Build: https://docs.cloud.google.com/binary-authorization/docs/deploy-cloud-build
- Binary Authorization: Create attestations: https://docs.cloud.google.com/binary-authorization/docs/making-attestations
- Google Cloud SDK: `gcloud beta container binauthz attestations sign-and-create`: https://docs.cloud.google.com/sdk/gcloud/reference/beta/container/binauthz/attestations/sign-and-create
- Terraform Google provider: `google_artifact_registry_repository`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/artifact_registry_repository
- Terraform Google provider: `google_binary_authorization_policy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/binary_authorization_policy
- Artifact Analysis: Create custom notes and occurrences: https://docs.cloud.google.com/artifact-analysis/docs/create-notes-occurrences
- Artifact Analysis: Investigate vulnerabilities: https://cloud.google.com/artifact-analysis/docs/investigate-vulnerabilities

## Issues Found
- The Cloud Build examples used explicit `docker push` steps. Cloud Build documentation states that provenance is generated when images are stored through the top-level `images` field and cannot be generated when the image is pushed with an explicit `docker push` step. Removed explicit push steps and kept the `images` field.
- The first build example tagged `latest` while the Artifact Registry repository enabled immutable tags. Repeated builds would fail once `latest` already existed. Removed the mutable `latest` tag from the provenance example.
- The Artifact Registry Terraform snippet described `docker_config.immutable_tags` as vulnerability scanning. Added the supported `vulnerability_scanning_config` block and kept `immutable_tags` as tag immutability.
- The Cloud Build service account IAM example hard-coded the legacy Cloud Build service account. Updated it to use the actual configured Cloud Build service account email.
- The provenance verification command omitted the documented `--provenance-path` flow for `slsa-verifier`. Added the provenance export command and passed the resulting JSON file to `slsa-verifier`.
- The Binary Authorization Terraform snippet created a custom attestor but described it as validating Cloud Build provenance. Replaced it with the documented `built-by-cloud-build` attestor reference for enforcing images built by Cloud Build.
- The Python custom attestation example used incorrect Container Analysis imports and client construction. Updated it to use `google.cloud.devtools.containeranalysis_v1.ContainerAnalysisClient()` and `get_grafeas_client()`.
- The Python vulnerability filter used a tag-style image URL and `noteProjectId`; the Artifact Analysis documentation expects a full `https://...@sha256:...` resource URL with a `kind="VULNERABILITY"` filter. Updated the filter accordingly.
- The single "complete pipeline" tried to scan and attest before Cloud Build's `images` upload completed. Split it into a two-stage flow: one Cloud Build config for provenance-producing build and one follow-up config for scanning, custom attestation, and deployment.
- The pipeline's custom attestation step called a Python script with CLI flags that the snippet did not implement. Replaced that step with the documented `gcloud beta container binauthz attestations sign-and-create` command.

## Review Notes
Cloud Build's SLSA support is version-specific: Google documents SLSA Level 3 provenance based on SLSA v0.1 and v1.0, and both v0.1 and v1.0 provenance are available only for trigger-based builds. The post now avoids invalid examples, but a future improvement would be to explicitly call out trigger-based builds and the difference between built-by-Cloud-Build enforcement and richer SLSA policy checks.
