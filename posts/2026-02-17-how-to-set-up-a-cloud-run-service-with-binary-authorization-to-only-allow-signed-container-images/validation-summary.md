# Validation Summary: How to Set Up a Cloud Run Service with Binary AuthZ to Only Allow Signed

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- Binary Authorization
- Artifact Analysis / Container Analysis API
- Cloud KMS
- Cloud Build
- Artifact Registry
- Google Cloud CLI
- Cloud Logging

## Sources Consulted
- Google Cloud Binary Authorization for Cloud Run: https://docs.cloud.google.com/binary-authorization/docs/run/enabling-binauthz-cloud-run
- Google Cloud Binary Authorization attestors CLI guide: https://docs.cloud.google.com/binary-authorization/docs/creating-attestors-cli
- Google Cloud Binary Authorization attestations overview: https://docs.cloud.google.com/binary-authorization/docs/attestations
- Google Cloud Binary Authorization create attestations guide: https://docs.cloud.google.com/binary-authorization/docs/making-attestations
- Google Cloud Binary Authorization policy YAML reference: https://docs.cloud.google.com/binary-authorization/docs/policy-yaml-reference
- Google Cloud Binary Authorization Cloud Build attestation guide: https://docs.cloud.google.com/binary-authorization/docs/cloud-build
- Google Cloud Binary Authorization dry-run mode guide: https://docs.cloud.google.com/binary-authorization/docs/enabling-dry-run
- Google Cloud Binary Authorization Cloud Run audit logs guide: https://cloud.google.com/binary-authorization/docs/run/viewing-audit-logs-cloud-run
- Google Cloud SDK reference for `gcloud beta container binauthz attestations sign-and-create`: https://docs.cloud.google.com/sdk/gcloud/reference/beta/container/binauthz/attestations/sign-and-create
- Google Cloud SDK reference for `gcloud container binauthz attestors public-keys add`: https://docs.cloud.google.com/sdk/gcloud/reference/container/binauthz/attestors/public-keys/add
- Google Cloud SDK reference for `gcloud artifacts docker images describe`: https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/describe

## Issues Found
- Corrected the opening wording from pushing images to Cloud Run to deploying images to Cloud Run, because Cloud Run deploy permissions allow deploying a referenced container image rather than pushing to the Cloud Run service.
- Corrected the Artifact Analysis explanation. Attestors use Artifact Analysis notes, and attestations are stored as occurrences of those notes; they are not themselves stored as notes.
- Updated the note creation example to include the note resource name and `x-goog-user-project` header, matching the official Artifact Analysis REST examples.
- Added the required IAM grant that lets the Binary Authorization service agent view occurrences on the attestor note.
- Changed the image digest guidance from an absolute requirement to a recommended deployment practice. Binary Authorization verifies image content by digest, but Cloud Run's deploy command accepts image URLs generally.
- Added Cloud Build IAM setup for attestor viewing, Cloud KMS signing, Artifact Analysis note attachment, and occurrence editing so the signing pipeline can create attestations successfully.
- Changed `gcloud container binauthz attestations sign-and-create` to `gcloud beta container binauthz attestations sign-and-create`, because the KMS-backed sign-and-create command is documented under the beta CLI surface.
- Corrected the Cloud Run dry-run audit log query to use Cloud Run revision system event logs and search for dry-run events.
- Removed "base images" from the exemption examples because Binary Authorization admission policy is evaluated for deployed container images, not Dockerfile base images.

## Review Notes
The post is technically valid after the corrections. The examples still assume a single-project setup and the legacy Cloud Build service account format; projects using a different Cloud Build service account should grant the same roles to the service account that runs the build.
