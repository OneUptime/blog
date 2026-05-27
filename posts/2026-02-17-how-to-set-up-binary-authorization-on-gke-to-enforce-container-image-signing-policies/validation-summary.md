# Validation Summary: Set Up Binary Authorization on GKE to Enforce Container Image Signing Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Google Cloud Binary Authorization
- Artifact Registry
- Artifact Analysis / Container Analysis
- Cloud KMS
- Cloud Build
- Kubernetes
- gcloud CLI

## Sources Consulted
- Google Cloud Binary Authorization: Get started using the Google Cloud CLI (GKE): https://cloud.google.com/binary-authorization/docs/getting-started-cli
- Google Cloud Binary Authorization: Policy YAML reference: https://cloud.google.com/binary-authorization/docs/policy-yaml-reference
- Google Cloud Binary Authorization: Create attestations: https://cloud.google.com/binary-authorization/docs/making-attestations
- Google Cloud Binary Authorization: Use breakglass: https://cloud.google.com/binary-authorization/docs/using-breakglass
- Google Cloud Binary Authorization: Create a Binary Authorization attestation in a Cloud Build pipeline: https://cloud.google.com/binary-authorization/docs/cloud-build
- Google Kubernetes Engine: About container image digests: https://cloud.google.com/kubernetes-engine/docs/concepts/about-container-images
- Google Cloud SDK reference: gcloud container binauthz attestations sign-and-create: https://cloud.google.com/sdk/gcloud/reference/container/binauthz/attestations/sign-and-create

## Issues Found
- The post described attestors as the entities that sign images. Updated the wording to match Google Cloud's model: signers create attestations, while attestors are verification authorities that store public keys used at deploy time.
- The prerequisites listed Container Registry as a current option. Updated this to Artifact Registry because Container Registry was shut down for writes on March 18, 2025.
- The primary Binary Authorization policy example omitted the required `name` field and manually allowlisted GKE system images. Updated the policy to include `name: projects/YOUR_PROJECT_ID/policy` and use `globalPolicyEvaluationMode: ENABLE`, which is Google's recommended way to exempt Google-maintained system images.
- The Container Analysis note payload used `humanReadableName`; updated it to the documented `human_readable_name` field used in Google's Binary Authorization guide.
- The Cloud Build attestation section omitted required IAM permissions for the build service account. Added a concise note that the build service account needs Binary Authorization Attestor Viewer, Cloud KMS CryptoKey Signer/Verifier, and Artifact Analysis Notes Attacher roles.
- The dry-run and multi-attestor policy snippets were incomplete as standalone policy files. Added the required policy `name` and `globalPolicyEvaluationMode` fields.
- The break-glass example used the older `alpha.image-policy.k8s.io/break-glass` annotation. Updated the snippet to use the current recommended `image-policy.k8s.io/break-glass: "true"` label.

## Review Notes
The `gcloud` CLI is not installed in this workspace, so command verification was performed against official Google Cloud documentation rather than local `gcloud --help` output.
