# Validation Summary: How to Enable Encryption at Rest in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE1
- RKE2
- Kubernetes
- etcd
- Kubernetes API server encryption at rest

## Sources Consulted
- Kubernetes: Encrypting Confidential Data at Rest — https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Kubernetes: Secrets — https://kubernetes.io/docs/concepts/configuration/secret/
- RKE2: Secrets Encryption — https://docs.rke2.io/security/secrets_encryption
- RKE2: Server Configuration Reference — https://docs.rke2.io/reference/server_config
- Rancher Manager: RKE Cluster Configuration Reference — https://ranchermanager.docs.rancher.com/v2.10/reference-guides/cluster-configuration/rancher-server-configuration/rke1-cluster-configuration
- Rancher Manager: Encryption Key Rotation — https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/manage-clusters/rotate-encryption-key
- RKE1: Encrypting Secret Data at Rest — https://rke.docs.rancher.com/config-options/secrets-encryption

## Issues Found
- The introduction said Kubernetes stores secrets as "base64-encoded plaintext in etcd." I corrected this to the more accurate upstream wording: secrets are stored unencrypted in etcd, and base64 encoding alone does not protect the values.
- The RKE2 section treated secrets encryption as something that must be enabled with `secrets-encryption: true`. I updated it to the current documented RKE2 behavior: secrets encryption is managed automatically, `aescbc` is the default provider, provider selection is done with `secrets-encryption-provider`, and status is checked with `rke2 secrets-encrypt status`.
- The RKE2 verification command only read secrets through the Kubernetes API, which does not validate encryption at rest. I replaced it with the documented `rke2 secrets-encrypt status` workflow and kept direct etcd verification in a later section.
- The Rancher RKE YAML example used the wrong path. I corrected it to the Rancher-managed RKE structure under `rancher_kubernetes_engine_config.services.kube_api.secrets_encryption_config`.
- The custom `EncryptionConfiguration` example was attached to an RKE2 workflow that is not how current RKE2 documents secrets encryption. I moved that example to RKE, where `custom_config` is officially documented.
- The custom config YAML embedded shell substitution directly inside YAML. I replaced it with a placeholder key and kept key generation as a separate shell command, which is the valid approach.
- The manual "encrypt existing secrets" section implied that enabling encryption only affects new secrets in all cases. I corrected this to note that RKE managed encryption rewrites secrets automatically, while manual rewrite remains useful after custom configuration changes.
- The etcd verification command used incorrect RKE2 certificate filenames. I corrected them to `client.crt` and `client.key`, and updated the expected output description to match the generic `k8s:enc:<provider>:v1:` prefix format.
- The RKE2 key rotation section used a manual upstream Kubernetes process instead of the current documented RKE2 `rotate-keys` workflow. I replaced it with `rke2 secrets-encrypt rotate-keys` and the HA restart sequence from the official RKE2 docs, and pointed RKE users to Rancher's UI-based rotation flow.
- The key protection section referenced an RKE2 config file path that is not the generated RKE2 encryption config path. I updated it to `/var/lib/rancher/rke2/server/cred/encryption-config.json` and added the RKE `cluster.rkestate` caveat from the RKE docs.

## Review Notes
- RKE/RKE1 reached end of life on July 31, 2025. Rancher v2.12 and later no longer manage downstream RKE clusters, so the RKE-specific parts of the post apply only to Rancher versions that still support RKE management.
- RKE2 support for choosing `secretbox` as the built-in provider is version-gated to releases from April 2025 onward.
- On older RKE2 releases, key rotation may require the older "classic" workflow instead of `rke2 secrets-encrypt rotate-keys`.
