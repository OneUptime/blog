# Validation Summary: How to Configure GCP Binary Authorization with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Binary Authorization
- Google Cloud KMS
- Artifact Analysis / Container Analysis notes
- Google Kubernetes Engine (GKE)
- OpenTofu / Terraform HCL
- Google Cloud IAM

## Sources Consulted
- Google Cloud Binary Authorization concepts: https://docs.cloud.google.com/binary-authorization/docs/key-concepts
- Google Cloud Binary Authorization policy YAML reference: https://docs.cloud.google.com/binary-authorization/docs/policy-yaml-reference
- Google Cloud Binary Authorization attestor creation (REST): https://docs.cloud.google.com/binary-authorization/docs/creating-attestors-rest
- Google Cloud Binary Authorization attestor creation (console): https://docs.cloud.google.com/binary-authorization/docs/creating-attestors-console
- Google Cloud Binary Authorization attestations: https://docs.cloud.google.com/binary-authorization/docs/making-attestations
- Google Cloud Binary Authorization Cloud Build attestation guide: https://docs.cloud.google.com/binary-authorization/docs/cloud-build
- Google Cloud IAM roles for Binary Authorization: https://cloud.google.com/iam/docs/roles-permissions/binaryauthorization
- Terraform Google provider docs for `google_binary_authorization_attestor`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/binary_authorization_attestor.html.markdown
- Terraform Google provider docs for `google_binary_authorization_policy`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/binary_authorization_policy.html.markdown
- Terraform Google provider docs for `google_container_analysis_note`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/container_analysis_note.html.markdown
- Terraform Google provider docs for `google_container_analysis_note_iam_*`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/container_analysis_note_iam.html.markdown
- Terraform Google provider docs for `google_kms_crypto_key_version`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/d/kms_crypto_key_version.html.markdown
- Terraform Google provider docs for `google_kms_crypto_key_iam_*`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/google_kms_crypto_key_iam.html.markdown

## Issues Found
- The post description claimed both project-level and cluster-level coverage, but the content only documents a project-level policy. I updated the description to match the actual implementation.
- The overview said the post integrated with Cloud Build specifically, but the code uses a generic CI/CD service account. I corrected the wording to describe CI/CD attestation automation more accurately.
- The Terraform attestor example referenced an undefined `data.google_kms_crypto_key_version.key_version` data source. I added the missing `google_kms_crypto_key_version` data source and updated the references to use it.
- The attestor snippet hard-coded `ECDSA_P256_SHA256` even though the provider example reads the signature algorithm from the KMS key version metadata. I changed the snippet to use `data.google_kms_crypto_key_version.attestor_key_version.public_key[0].algorithm`.
- The setup enabled Binary Authorization and Container Analysis but omitted the Cloud KMS API required by the KMS resources in the post. I added `cloudkms.googleapis.com`.
- The policy snippet manually allowlisted Google-managed system images while also enabling `global_policy_evaluation_mode = "ENABLE"`. Current Google Cloud docs recommend using the Google-maintained global policy instead of manually maintaining those image allowlists, so I removed the outdated whitelist entries and kept `global_policy_evaluation_mode = "ENABLE"`.
- The CI IAM section granted `roles/binaryauthorization.attestorsVerifier`, which is intended for image verification and multi-project deployer access, not routine attestor read access for creating attestations. I changed it to `roles/binaryauthorization.attestorsViewer`.
- The CI IAM section omitted the KMS signer/verifier permission required for KMS-backed signing. I added a `google_kms_crypto_key_iam_member` binding for `roles/cloudkms.signerVerifier`.
- The post omitted the note IAM binding needed so Binary Authorization can read attestation occurrences at deploy time. I added `roles/containeranalysis.notes.occurrences.viewer` for the attestor delegation service account.

## Review Notes
- The final post is technically aligned with a project-level Binary Authorization policy and KMS-backed CI/CD attestations. It does not cover cluster-specific admission rules; that would require a separate example using `cluster_admission_rules`.
- OpenTofu uses the same HCL syntax and Google provider resource schema shown here, so the provider documentation used for validation applies to OpenTofu as well.
