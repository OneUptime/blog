# Validation Summary: How to Store Terraform State as Kubernetes Secrets with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Tofu Controller (tf-controller) — Flux IAC controller for Terraform/OpenTofu
- Flux CD
- Terraform / OpenTofu (Kubernetes state backend)
- Kubernetes Secrets
- Velero (backup/restore)
- Kubernetes EncryptionConfiguration (encryption-at-rest)
- kubectl, jq, gzip

## Sources Consulted
- [Tofu Controller documentation](https://flux-iac.github.io/tofu-controller/)
- [Tofu Controller — Backup and restore a Terraform state](https://flux-iac.github.io/tofu-controller/use-tf-controller/backup-and-restore-a-Terraform-state/)
- [Tofu Controller — Use Tofu Controller with a Custom Backend](https://flux-iac.github.io/tofu-controller/use-tf-controller/with-a-custom-backend/)
- [Tofu Controller — Terraform CRD API reference (v1alpha2)](https://flux-iac.github.io/tofu-controller/References/terraform/)
- Tofu Controller source code: `controllers/tf_controller_backend.go` (verified default backend HCL: `backend "kubernetes" { secret_suffix, in_cluster_config, namespace, labels }`)
- [OpenTofu Kubernetes backend documentation](https://opentofu.org/docs/language/settings/backends/kubernetes/)
- OpenTofu source: `internal/backend/remote-state/kubernetes/client.go` — confirms gzip compression, `.data.tfstate` key, and default labels (`tfstate=true`, `tfstateSecretSuffix`, `tfstateWorkspace`, `app.kubernetes.io/managed-by=terraform`); confirms `encoding: gzip` annotation is set on write but not consulted on read (read always decompresses).
- [Velero Schedule API type](https://velero.io/docs/main/api-types/schedule/) — confirms `velero.io/v1` and supported `template` fields
- [Velero Restore Reference](https://velero.io/docs/main/restore-reference/) — confirms `--from-schedule`, `--include-namespaces`, `--selector` flags
- [Kubernetes — Encrypting Confidential Data at Rest](https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/) — confirms `apiserver.config.k8s.io/v1`, provider list, and aescbc padding-oracle vulnerability

## Issues Found

**1. Used deprecated/insecure `aescbc` encryption provider in Step 7.**
- What was wrong: The EncryptionConfiguration example used the `aescbc` provider. Kubernetes documentation notes that `aescbc` uses AES-CBC with PKCS#7 padding without an integrity check, making it susceptible to padding oracle attacks. The official recommendation is to use `aesgcm` (or `secretbox`) instead, especially for production. The post itself frames this section as for production clusters.
- What I changed: Replaced `aescbc:` with `aesgcm:` and updated the inline comment to note that aesgcm is recommended over aescbc due to the padding-oracle issue. The key size (32 bytes / 256 bits) is identical for both providers, so no other changes were required.
- Why: Improves security correctness; aligns with current upstream Kubernetes guidance.

## Review Notes

- The Tofu Controller default backend claim is accurate: when `spec.backendConfig` is omitted (and the `DISABLE_TF_K8S_BACKEND` env var is unset), the controller injects an HCL `backend "kubernetes"` block with `secret_suffix = <Terraform resource name>` and the namespace of the Terraform CR. Verified against `controllers/tf_controller_backend.go`.
- The `tfstate: "true"` label used in the Velero `labelSelector` in Step 4 is set automatically by the upstream OpenTofu/Terraform Kubernetes backend (not added by the Tofu Controller itself, though this distinction doesn't matter operationally — the label will be present on every secret managed by this backend). The post's comment "Tofu Controller labels state secrets with this label" is therefore effectively correct in practice, even though the label actually originates from the OpenTofu Kubernetes backend.
- State storage format (`gzip` → base64 in `.data.tfstate`) is verified against OpenTofu source. The decode pattern `base64 -d | gunzip` in Steps 3 and 6 is correct.
- API versions verified:
  - `infra.contrib.fluxcd.io/v1alpha2` — current stable Terraform CRD version in tofu-controller.
  - `velero.io/v1` — current Schedule API.
  - `apiserver.config.k8s.io/v1` — current EncryptionConfiguration API.
- The Step 6 manual export/import workflow is functionally correct, though more convoluted than necessary: writing gzipped state directly via `--from-file=tfstate=terraform.tfstate.gz` would avoid the base64-encode-then-decode round trip. The official Tofu Controller restore docs also add an `encoding: gzip` annotation; the OpenTofu Kubernetes backend's read path doesn't actually check this annotation (it always decompresses), so omitting it is not a correctness bug — left as-is.
- Caveat not mentioned in the post: the Kubernetes backend is bounded by the Kubernetes Secret 1MB size limit, which can become a real constraint for state files with many resources. Worth flagging in a future update, but not technically incorrect.
- The post correctly notes that Kubernetes Secrets are only encrypted at rest when encryption-at-rest is enabled (Secrets are base64-encoded by default, not encrypted).
