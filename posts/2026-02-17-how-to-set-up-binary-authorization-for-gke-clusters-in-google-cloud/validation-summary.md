# Validation Summary: How to Set Up Binary Authorization for GKE Clusters in Google Cloud

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud
- Google Kubernetes Engine
- Binary Authorization
- Kubernetes
- Artifact Registry
- Container Analysis API
- Cloud KMS
- Cloud Audit Logs
- gcloud CLI

## Sources Consulted
- Google Cloud Binary Authorization: Get started using the Google Cloud CLI (GKE): https://cloud.google.com/binary-authorization/docs/getting-started-cli
- Google Cloud Binary Authorization: Quickstart: Configure a Binary Authorization policy with GKE: https://cloud.google.com/binary-authorization/docs/configure-policy-gke
- Google Cloud Binary Authorization: Policy YAML reference: https://cloud.google.com/binary-authorization/docs/policy-yaml-reference
- Google Cloud Binary Authorization: Create attestations: https://cloud.google.com/binary-authorization/docs/making-attestations
- Google Cloud Binary Authorization: Use breakglass (GKE, Distributed Cloud): https://cloud.google.com/binary-authorization/docs/using-breakglass
- Google Cloud Binary Authorization: View audit logs for GKE: https://cloud.google.com/binary-authorization/docs/viewing-audit-logs
- Google Cloud SDK: gcloud artifacts docker images describe: https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/describe
- Google Cloud Artifact Registry: Prepare for Container Registry shutdown: https://cloud.google.com/artifact-registry/docs/transition/prepare-gcr-shutdown

## Issues Found
- The opening explanation said images are signed by attestors. Updated it to say images have signed attestations from trusted authorities, which matches Binary Authorization's attestation model.
- The flow diagram and image examples used Container Registry-style `gcr.io` paths. Updated them to use Artifact Registry because Container Registry is deprecated and writes to Container Registry are shut down.
- The prerequisites and API enablement command omitted Artifact Registry and Cloud KMS, both needed by the tutorial's current image storage and KMS signing steps. Added `artifactregistry.googleapis.com` and `cloudkms.googleapis.com`.
- The default policy example included legacy allowlist entries and omitted the policy `name`. Replaced it with the current default policy shape shown in Google Cloud documentation.
- The attestation policy snippet allowlisted the user's registry, which would bypass the required attestation rule for those images. Removed that allowlist and kept `globalPolicyEvaluationMode: ENABLE` for Google-managed system images.
- The policy snippet omitted the required `name` field. Added `name: projects/my-project-id/policy`.
- The Container Analysis note JSON used `humanReadableName`; the official Binary Authorization cURL example uses `human_readable_name`. Updated the field name to match the documented request body.
- The digest lookup used `gcloud container images describe` for Container Registry. Updated it to `gcloud artifacts docker images describe` for Artifact Registry.
- The attestation creation command did not validate the created attestation. Added `--validate`, matching the documented Cloud KMS attestation flow.
- The audit log query only checked pod create failures with `Forbidden`. Updated it to include create and update events, the Cloud Audit Logs activity log, failure status, and both `VIOLATES_POLICY` and `Forbidden` reasons.
- The break-glass example used the old alpha annotation. Updated it to the current `image-policy.k8s.io/break-glass` pod label.

## Review Notes
The post is now accurate as a single-project tutorial. A future improvement would be to add a separate note for production multi-project setups, where build, attestor, attestation, and deployment projects are often separated for stronger supply-chain controls.
