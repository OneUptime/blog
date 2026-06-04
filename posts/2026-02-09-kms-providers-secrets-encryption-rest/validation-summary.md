# Validation Summary: How to Use KMS Providers for Kubernetes Secrets Encryption at Rest

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes encryption at rest
- Kubernetes KMS v2 provider API
- AWS KMS
- Azure Key Vault
- Google Cloud KMS
- etcd
- systemd
- kubectl, etcdctl, aws, az, and gcloud CLIs

## Sources Consulted
- Kubernetes documentation: Using a KMS provider for data encryption: https://kubernetes.io/docs/tasks/administer-cluster/kms-provider/
- Kubernetes documentation: Encrypting Confidential Data at Rest: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- kubernetes-sigs AWS Encryption Provider README and source: https://github.com/kubernetes-sigs/aws-encryption-provider
- Azure Key Vault KMS plugin README and manual install / rotation docs: https://github.com/Azure/kubernetes-kms
- Google Cloud KMS Kubernetes plugin README and source: https://github.com/GoogleCloudPlatform/k8s-cloudkms-plugin
- AWS KMS key rotation documentation: https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html
- AWS CLI KMS create-alias documentation: https://docs.aws.amazon.com/cli/latest/reference/kms/create-alias.html
- Microsoft Learn: Configure cryptographic key auto-rotation in Azure Key Vault: https://learn.microsoft.com/en-us/azure/key-vault/keys/how-to-configure-key-rotation
- Google Cloud KMS key rotation documentation: https://docs.cloud.google.com/kms/docs/rotate-key
- Google Cloud SDK KMS key creation reference: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/create

## Issues Found
- Corrected the KMS architecture explanation. Kubernetes KMS uses envelope encryption and the external KMS wraps or unwraps key material; it does not mean all encryption keys never exist on cluster nodes.
- Added the etcd v3 prerequisite required for Kubernetes KMS.
- Replaced nonexistent GitHub binary release download commands for AWS, Azure, and Google KMS plugins with source build commands based on the official repositories.
- Fixed systemd heredoc commands to use `sudo tee`; `sudo cat <<EOF > file` would not write to privileged paths because shell redirection is not elevated.
- Fixed Azure plugin command flags and binary name. The current Azure plugin uses `kubernetes-kms`, `--listen-addr`, `--key-version`, and Azure cloud config rather than the post's `azure-kms`, environment variables, and `--listen` flag.
- Captured the Azure Key Vault key version during key creation because the Azure KMS plugin requires a key version.
- Fixed Google Cloud plugin binary name and socket flag from `--listen` to `--path-to-unix-socket`.
- Added missing socket-directory creation before starting Azure and Google systemd services.
- Clarified the HA health-check Service applies when KMS plugins run as pods and changed `targetPort` to a numeric port so the snippet is self-contained.
- Clarified key rotation caveats for Kubernetes KMS plugins that pin a key ID or key version, especially Azure Key Vault plugin rotation.
- Updated the Google Cloud KMS `--next-rotation-time` example from a past date to a future date relative to this review.
- Narrowed overbroad security claims so the post no longer implies that a cluster compromise can never expose encryption keys or decrypted secrets.

## Review Notes
- I could not compile-test the provider binaries locally because Go is not installed in this workspace. I verified flags, build targets, and configuration fields against the official upstream repositories and documentation instead.
- The guide uses self-managed control plane examples. Managed Kubernetes offerings such as EKS, AKS, and GKE often provide managed encryption-at-rest integrations with different setup flows.
