# Validation Summary: How to Fix GKE Binary Authorization Attestation Denied Deployment Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Google Cloud Binary Authorization
- Kubernetes admission control
- Google Cloud CLI
- Cloud KMS
- Artifact Analysis / Container Analysis
- Cloud Build
- Docker container images

## Sources Consulted
- Google Cloud Binary Authorization policy YAML reference: https://docs.cloud.google.com/binary-authorization/docs/policy-yaml-reference
- Google Cloud Binary Authorization create attestations guide: https://docs.cloud.google.com/binary-authorization/docs/making-attestations
- Google Cloud Binary Authorization getting started with the CLI for GKE: https://docs.cloud.google.com/binary-authorization/docs/getting-started-cli
- Google Cloud Binary Authorization breakglass guide: https://docs.cloud.google.com/binary-authorization/docs/using-breakglass
- Google Cloud Binary Authorization with Cloud Build: https://docs.cloud.google.com/binary-authorization/docs/deploy-cloud-build
- Google Cloud SDK Binary Authorization attestation command reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/binauthz/attestations

## Issues Found
- The KMS attestation examples used `gcloud container binauthz attestations sign-and-create`, but the documented KMS signing helper is available as `gcloud beta container binauthz attestations sign-and-create`. Updated both occurrences.
- The policy example omitted the required `name` field and did not show `globalPolicyEvaluationMode`. Added both, and updated Google system image allowlist patterns to match current documentation.
- The "from scratch" attestor setup skipped the required Artifact Analysis note creation. Added the note payload and Container Analysis API call before creating the attestor.
- The break-glass example used the older alpha annotation on the Deployment metadata. Updated it to the current `image-policy.k8s.io/break-glass` label on the pod template, and added the required `selector` and matching pod labels for a valid `apps/v1` Deployment.
- The Cloud Build note implied automatic attestation without the current location-specific caveat. Updated it to mention the built-in `built-by-cloud-build` attestor and `requestedVerifyOption: VERIFY_REQUESTED` when a build specifies a location.
- The troubleshooting checklist said the deployment image reference must use a digest. Binary Authorization evaluates resolved digests even when deployments use tags, so this was changed to checking the evaluated digest.

## Review Notes
The examples still use `gcr.io` because the original post is framed around existing GCR-style image names and Google documentation still includes GCR examples. For new projects, Artifact Registry image paths are generally preferred.
