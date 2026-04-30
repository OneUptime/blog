# Validation Summary: How to Set Up GKE Binary Authorization with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Binary Authorization
- OpenTofu / HCL
- Google Cloud Terraform provider
- Cloud KMS
- Artifact Analysis / Container Analysis

## Sources Consulted
- Google Cloud Binary Authorization overview and attestations: https://cloud.google.com/binary-authorization/docs/attestations
- Google Cloud Binary Authorization setup for GKE: https://cloud.google.com/binary-authorization/docs/setting-up
- Google Cloud Binary Authorization getting started with the CLI: https://cloud.google.com/binary-authorization/docs/getting-started-cli
- Google Cloud Binary Authorization attestor creation guide: https://cloud.google.com/binary-authorization/docs/creating-attestors-cli
- Google Cloud Binary Authorization policy YAML reference: https://cloud.google.com/binary-authorization/docs/policy-yaml-reference
- Google Cloud Binary Authorization key concepts: https://cloud.google.com/binary-authorization/docs/key-concepts
- Google Cloud Binary Authorization RPC reference: https://cloud.google.com/binary-authorization/docs/reference/rpc
- Google Kubernetes Engine API reference: https://cloud.google.com/kubernetes-engine/docs/reference/rest/
- Google Cloud KMS API reference: https://cloud.google.com/kms/docs/reference/rest
- Google Cloud Artifact Analysis docs: https://cloud.google.com/artifact-analysis/docs/locations
- Google Cloud Artifact Analysis audit logging docs: https://cloud.google.com/artifact-analysis/docs/artifact-analysis-audit-logging
- Terraform provider docs for `google_binary_authorization_policy`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/binary_authorization_policy.html.markdown
- Terraform provider docs for `google_binary_authorization_attestor`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/binary_authorization_attestor.html.markdown
- Terraform provider docs for `google_container_analysis_note`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/container_analysis_note.html.markdown
- Terraform provider docs for `google_container_analysis_note_iam_*`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/container_analysis_note_iam.html.markdown
- Terraform provider docs for `google_kms_crypto_key`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/kms_crypto_key.html.markdown
- Terraform provider docs for `google_kms_crypto_key_version`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/d/kms_crypto_key_version.html.markdown
- Terraform provider docs for `google_container_cluster`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/container_cluster.html.markdown
- Terraform provider docs for `google_project_service`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/google_project_service.html.markdown

## Issues Found
- The post said attestors sign images. That is incorrect. In Binary Authorization, a signer uses a private key to create an attestation, and the attestor stores the public key Binary Authorization uses to verify that attestation. I corrected the overview, inline attestor comment, and summary.
- The overview implied Binary Authorization enforces all container images. Google’s GKE setup documentation notes that Binary Authorization does not enforce init containers. I added that caveat.
- Step 1 enabled only the Binary Authorization and Container Analysis APIs, but the post also provisions a Cloud KMS key and a GKE cluster. I added `cloudkms.googleapis.com` and `container.googleapis.com` to the required API list.
- The attestor snippet referenced `data.google_kms_crypto_key_version.attestor_key_version` without defining it. I added the missing `google_kms_crypto_key_version` data source in the KMS step.
- The post omitted the IAM grant that allows the Binary Authorization service account to read attestation occurrences on the Container Analysis note. I added `google_container_analysis_note_iam_member` with `roles/containeranalysis.notes.occurrences.viewer`, which is required by Google’s attestor setup docs.
- The policy manually allowlisted GKE system image paths using old-style patterns and one incorrect path (`gcr.io/google-containers/*` instead of Google’s documented `gcr.io/google_containers/*`). Current Google docs recommend enabling `globalPolicyEvaluationMode` instead of manually allowlisting Google-managed system images. I replaced the manual allowlist with `global_policy_evaluation_mode = "ENABLE"`.
- The cluster-specific rule used the wrong cluster identifier format by prefixing the project ID. Binary Authorization policy docs and the provider docs both require `location.name` / `location.clusterId`. I changed it to `us-central1.dev-cluster`.
- The `google_container_cluster` example omitted `initial_node_count`, which the provider requires when using the default node pool. I added `initial_node_count = 1`.

## Review Notes
- The post is now technically correct for the resources and concepts it shows, but it still stops at setup. Readers still need a CI/CD step that creates attestations with the private key before deployments will satisfy the policy.
- The Terraform provider docs still use `require_attestations_by = [google_binary_authorization_attestor.<name>.name]` in examples, so that form was preserved.
- `google_project_service` itself depends on the Service Usage API being available in the project bootstrap path. That prerequisite is documented by the provider and is common across Terraform-managed API enablement.
- A live `tofu apply` was not run in this environment because that would require a real Google Cloud project, credentials, and billable infrastructure.
