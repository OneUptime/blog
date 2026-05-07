# Validation Summary: How to Configure Secrets Encryption in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE (RKE1)
- RKE2
- Kubernetes
- etcd
- Kubernetes encryption at rest
- Kubernetes KMS provider
- Kubernetes audit logging

## Sources Consulted
- RKE2 Secrets Encryption: https://docs.rke2.io/security/secrets_encryption
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- Rancher Encryption Key Rotation: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/manage-clusters/rotate-encryption-key
- Rancher RKE Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.10/reference-guides/cluster-configuration/rancher-server-configuration/rke1-cluster-configuration
- RKE Kubernetes API Server service options: https://rancher.com/docs/rke/latest/en/config-options/services/
- Kubernetes Encrypting Confidential Data at Rest: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Kubernetes Using a KMS provider for data encryption: https://kubernetes.io/docs/tasks/administer-cluster/kms-provider/

## Issues Found
- The RKE2 section treated secrets encryption as something that must be enabled manually with `secrets-encryption: true`. I changed this to reflect current RKE2 behavior: current releases manage the encryption configuration automatically and should be verified with `rke2 secrets-encrypt status`.
- The post implied RKE clusters were a normal current prerequisite. I clarified that RKE1 is legacy, noted its July 31, 2025 end-of-life, and noted that Rancher 2.12+ no longer supports provisioning or managing downstream RKE1 clusters.
- The custom RKE2 encryption configuration section used a manual `EncryptionConfiguration` file and `kube-apiserver-arg` override, which is not how current RKE2 documentation describes configuring secrets encryption. I replaced that section with the supported `secrets-encryption-provider` workflow for switching to `secretbox`.
- The RKE2 key rotation section used the older classic `prepare` / `rotate` / `reencrypt` flow as the main procedure. I updated it to the current `rke2 secrets-encrypt rotate-keys` flow and added the HA restart requirement plus a note for older releases.
- The manual key rotation sequence for a Kubernetes `EncryptionConfiguration` had the new key order wrong. I corrected it to match Kubernetes guidance: add the new key second, restart, move it to first, restart again, re-encrypt, then remove the old key.
- The external KMS examples used deprecated KMS v1-style configuration by omitting `apiVersion: v2` and using `cachesize`. I updated the examples to KMS v2 syntax and clarified that the provider plugin deployment is plugin-specific.
- The verification section implied provider-specific prefixes without documentation for all variants. I narrowed it to the documented `aescbc` prefix and more general verification wording.
- The troubleshooting section said `kubectl top` monitors API server latency, which is inaccurate. I corrected this to API server resource usage.
- The performance guidance recommended `aescbc` as the best general balance, which conflicts with current Kubernetes guidance. I replaced it with version-accurate guidance: prefer KMS v2 for external key management, keep `aescbc` for RKE2 default/FIPS cases, and note `secretbox` support on newer RKE2 releases.

## Review Notes
- `secretbox` support in RKE2 is version-gated to the April 2025 RKE2 releases and later.
- Kubernetes KMS v1 has been deprecated since Kubernetes v1.28 and is disabled by default starting in v1.29.
- The audit policy is technically valid, but `RequestResponse` logging for Secrets can record sensitive request payloads and should be used carefully in production environments.
