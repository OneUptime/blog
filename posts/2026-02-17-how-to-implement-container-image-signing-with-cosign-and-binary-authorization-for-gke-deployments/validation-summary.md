# Validation Summary: How to Use Container Image Signing with Cosign and Binary Authorization

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine
- Google Cloud Binary Authorization
- Google Cloud Artifact Analysis / Container Analysis API
- Google Cloud KMS
- Artifact Registry
- Cosign / Sigstore
- Cloud Build
- Docker
- kubectl

## Sources Consulted
- Google Cloud Binary Authorization attestor creation guide: https://docs.cloud.google.com/binary-authorization/docs/creating-attestors-cli
- Google Cloud Binary Authorization attestation creation guide: https://docs.cloud.google.com/binary-authorization/docs/making-attestations
- Google Cloud Binary Authorization policy YAML reference: https://docs.cloud.google.com/binary-authorization/docs/policy-yaml-reference
- Google Cloud Binary Authorization GKE cluster setup guide: https://docs.cloud.google.com/binary-authorization/docs/creating-cluster
- Google Cloud SDK reference for `gcloud container binauthz attestors public-keys add`: https://docs.cloud.google.com/sdk/gcloud/reference/container/binauthz/attestors/public-keys/add
- Google Cloud SDK reference for `gcloud alpha container binauthz attestations sign-and-create`: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/container/binauthz/attestations/sign-and-create
- Artifact Analysis REST API `projects.notes.create`: https://docs.cloud.google.com/artifact-analysis/docs/reference/rest/v1/projects.notes/create
- Sigstore Cosign KMS key management documentation: https://docs.sigstore.dev/cosign/key_management/overview/
- Sigstore Cosign container signing documentation: https://docs.sigstore.dev/cosign/signing/signing_with_containers/

## Issues Found
- The post described Binary Authorization as directly checking the Cosign image signature stored in Artifact Registry. Updated the flow and explanatory text to distinguish Cosign OCI signatures from Binary Authorization attestations.
- The required API enablement list omitted Cloud KMS and Artifact Registry. Added `cloudkms.googleapis.com` and `artifactregistry.googleapis.com`.
- The Artifact Analysis note creation request used the wrong REST endpoint shape. Updated it to create the note with `?noteId=build-attestor`.
- The attestor setup omitted the required Artifact Analysis note IAM binding for the Binary Authorization service agent. Added commands to grant `roles/containeranalysis.notes.occurrences.viewer`.
- The Binary Authorization policy YAML omitted the required `name` field. Added `name: projects/my-project/policy`.
- The policy manually allowlisted older/incomplete system image patterns even though `globalPolicyEvaluationMode: ENABLE` handles Google-managed system images. Removed the stale allowlist and kept the system policy setting.
- The Cloud Build attestation step used the non-beta `gcloud container binauthz attestations sign-and-create` form, while the official docs expose this command under beta/alpha. Updated it to `gcloud beta container binauthz attestations sign-and-create`.
- The conclusion said images only need to be signed before GKE allows them to run. Updated it to say images must be signed and attested.

## Review Notes
The tutorial now describes a combined Cosign plus Binary Authorization attestation workflow. Google Cloud also has a separate Binary Authorization continuous validation Sigstore signature check for Cosign signatures stored alongside Artifact Registry images, but that is a different, preview-stage workflow from the deploy-time attestor policy used here.
