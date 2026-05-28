# Validation Summary: How to Create Attestors for Binary Authorization Using KMS Keys

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Binary Authorization
- Google Cloud KMS
- Artifact Analysis / Container Analysis notes
- Google Cloud CLI
- Binary Authorization policy YAML
- IAM roles for Cloud KMS signing

## Sources Consulted
- Binary Authorization: Create attestors using the gcloud CLI - https://docs.cloud.google.com/binary-authorization/docs/creating-attestors-cli
- Binary Authorization: Create attestations - https://docs.cloud.google.com/binary-authorization/docs/making-attestations
- Binary Authorization: Policy YAML reference - https://docs.cloud.google.com/binary-authorization/docs/policy-yaml-reference
- Binary Authorization: Get started using the Google Cloud CLI - https://docs.cloud.google.com/binary-authorization/docs/getting-started-cli
- Cloud KMS: Key rotation - https://docs.cloud.google.com/kms/docs/key-rotation
- Cloud KMS IAM roles and permissions - https://docs.cloud.google.com/iam/docs/roles-permissions/cloudkms
- Google Cloud SDK: gcloud kms keys versions create - https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/versions/create

## Issues Found
- The introduction described Cloud KMS key storage as hardware-backed in all cases. Cloud KMS supports software-backed keys by default and HSM-backed keys when configured with the HSM protection level, so the wording was changed to "managed key storage" with "optional HSM-backed protection."
- The Binary Authorization policy YAML omitted the required `name: projects/my-project-id/policy` field. Added the field to match the official policy YAML reference.
- The key rotation section said KMS supports automatic key rotation for the asymmetric signing keys used by attestors and used `gcloud kms keys update --rotation-period`. Cloud KMS does not support automatic rotation for asymmetric keys, so the section now describes manual rotation with `gcloud kms keys versions create` and then adding the new key version to the attestor.

## Review Notes
The core Binary Authorization attestor, KMS key creation, public key registration, attestation creation, attestation listing, and KMS IAM role examples match current official Google Cloud documentation. The examples still use `gcr.io` image paths, which Binary Authorization supports, but new deployments may prefer Artifact Registry image paths.
