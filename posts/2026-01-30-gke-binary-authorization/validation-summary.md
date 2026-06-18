# Validation Summary: How to Build GKE Binary Authorization

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Binary Authorization
- Cloud KMS
- Artifact Registry and Artifact Analysis
- Container Analysis
- Cloud Build
- Kubernetes manifests
- Cloud Logging

## Sources Consulted
- Google Cloud Binary Authorization getting started with gcloud: https://docs.cloud.google.com/binary-authorization/docs/getting-started-cli
- Google Cloud Binary Authorization policy configuration: https://docs.cloud.google.com/binary-authorization/docs/configuring-policy-cli
- Google Cloud Binary Authorization breakglass documentation: https://docs.cloud.google.com/binary-authorization/docs/using-breakglass
- Google Cloud Binary Authorization Cloud Build integration: https://docs.cloud.google.com/binary-authorization/docs/cloud-build
- Google Cloud SDK reference for `gcloud beta container binauthz attestations sign-and-create`: https://docs.cloud.google.com/sdk/gcloud/reference/beta/container/binauthz/attestations/sign-and-create
- Google Cloud SDK reference for `gcloud artifacts docker images describe`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/describe
- Google Cloud Artifact Analysis automatic scanning documentation: https://docs.cloud.google.com/artifact-analysis/docs/scan-os-automatically
- Google Cloud SDK reference for `gcloud logging metrics create`: https://docs.cloud.google.com/sdk/gcloud/reference/logging/metrics/create

## Issues Found
- The introduction said Binary Authorization requires images themselves to be signed. Updated it to say Binary Authorization requires signed attestations from attestors, which matches the Binary Authorization model.
- The required API list omitted `containerscanning.googleapis.com`, which is needed for Artifact Analysis vulnerability scanning, and `cloudbuild.googleapis.com`, which is needed for the Cloud Build pipeline. Added both API enablement commands.
- The policy examples manually allowlisted Google-managed system images while also enabling `globalPolicyEvaluationMode`. Current Google Cloud guidance recommends using system policy evaluation mode for Google-managed GKE system images. Removed those explicit system image allowlist entries and updated the comment.
- The Cloud Build deployment step deployed the image by tag after creating an attestation for a digest. Updated the deployment step to deploy the attested digest.
- The breakglass example used the older `alpha.image-policy.k8s.io/break-glass` annotation. Current Google Cloud documentation recommends the `image-policy.k8s.io/break-glass` label. Updated the Kubernetes manifest, heading, explanatory text, architecture diagram label, and log-based metric filter accordingly.
- The attestation sequence diagram showed Binary Authorization calling KMS at deploy time to verify the signature. Updated it to show signature verification with the attestor public key.
- The Cloud Build vulnerability scan step implied a fixed sleep completes scanning. Added a note that production pipelines should poll scan/discovery status before enforcing scan results.

## Review Notes
The core Binary Authorization, attestor, KMS signing, policy import, cluster enablement, Cloud Build IAM roles, and `gcloud` command structure align with current Google Cloud documentation. The vulnerability scan example remains a simplified pipeline check; a production pipeline should explicitly poll Artifact Analysis discovery status and handle delayed or unavailable scan metadata.
