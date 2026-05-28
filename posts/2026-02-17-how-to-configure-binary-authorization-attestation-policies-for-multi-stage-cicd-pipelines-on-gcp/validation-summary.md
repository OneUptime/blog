# Validation Summary: How to Configure Binary AuthZ Attestation Policies for Multi-Stage CI/CD

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Google Cloud Binary Authorization
- Google Kubernetes Engine
- Artifact Analysis / Container Analysis
- Artifact Registry
- Cloud KMS
- Cloud Build
- Google Cloud CLI
- Python Cloud Functions

## Sources Consulted
- Google Cloud Binary Authorization: Create attestors using the gcloud CLI: https://docs.cloud.google.com/binary-authorization/docs/creating-attestors-cli
- Google Cloud Binary Authorization: Policy YAML reference: https://docs.cloud.google.com/binary-authorization/docs/policy-yaml-reference
- Google Cloud Binary Authorization: Create attestations: https://docs.cloud.google.com/binary-authorization/docs/making-attestations
- Google Cloud SDK reference: gcloud beta container binauthz attestations sign-and-create: https://docs.cloud.google.com/sdk/gcloud/reference/beta/container/binauthz/attestations/sign-and-create
- Google Cloud SDK reference: gcloud container binauthz attestations list: https://docs.cloud.google.com/sdk/gcloud/reference/container/binauthz
- Google Cloud SDK reference: gcloud artifacts vulnerabilities list: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/vulnerabilities/list
- Google Kubernetes Engine: About container image digests: https://cloud.google.com/kubernetes-engine/docs/concepts/about-container-images
- Artifact Analysis: Create custom notes and occurrences: https://docs.cloud.google.com/artifact-analysis/docs/create-notes-occurrences
- Google Cloud Python reference: Binary Authorization management client: https://docs.cloud.google.com/python/docs/reference/binaryauthorization/latest/google.cloud.binaryauthorization_v1.services.binauthz_management_service_v1.BinauthzManagementServiceV1Client
- Binary Authorization Grafeas RPC reference: https://docs.cloud.google.com/binary-authorization/docs/reference/rpc/grafeas.v1

## Issues Found
- The Artifact Analysis note payload used `humanReadableName`; changed it to the field name used by Google's current Artifact Analysis examples, `human_readable_name`, and added the note resource name and `x-goog-user-project` header.
- The Binary Authorization policy omitted the required `name` field. Added `name: projects/YOUR_PROJECT/policy`.
- The policy manually allowlisted GKE system images with stale/incomplete patterns. Replaced that block with `globalPolicyEvaluationMode: ENABLE`, which is Google's recommended way to allow Google-managed system images.
- The Cloud Build examples used `gcloud container binauthz attestations sign-and-create`, but the current command is exposed as `gcloud beta container binauthz attestations sign-and-create`. Updated all three attestation commands and added `--validate`.
- The vulnerability scan step used `gcloud artifacts docker images list-vulnerabilities` with an image URI. That command expects an On-Demand Scanning scan resource. Changed it to `gcloud artifacts vulnerabilities list`, which accepts an Artifact Registry image URI.
- The manual approval Python example used `BinauthzManagementServiceV1Client.create_attestation`, which does not exist. Replaced it with a Container Analysis Grafeas occurrence creation flow signed with Cloud KMS.

## Review Notes
The post is now technically valid as a high-level implementation guide. A production version should also document IAM bindings for Cloud Build, Cloud KMS signing, Artifact Analysis note attachment, and attestor verification permissions.
