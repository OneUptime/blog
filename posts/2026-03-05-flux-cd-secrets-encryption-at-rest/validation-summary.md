# Validation Summary: How to Configure Flux CD with Kubernetes Secrets Encryption at Rest

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes Secrets
- Kubernetes API server encryption at rest
- etcd
- Kubernetes KMS provider
- AWS EKS
- Google Kubernetes Engine (GKE)
- Azure Kubernetes Service (AKS)
- SOPS

## Sources Consulted
- Kubernetes documentation: Encrypting Confidential Data at Rest: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Kubernetes documentation: Using a KMS provider for data encryption: https://kubernetes.io/docs/tasks/administer-cluster/kms-provider/
- AWS CLI documentation: eks create-cluster: https://docs.aws.amazon.com/cli/latest/reference/eks/create-cluster.html
- AWS CLI documentation: eks associate-encryption-config: https://docs.aws.amazon.com/cli/latest/reference/eks/associate-encryption-config.html
- Amazon EKS User Guide: Encrypt Kubernetes secrets with KMS on existing clusters: https://docs.aws.amazon.com/eks/latest/userguide/enable-kms.html
- Google Cloud documentation: Encrypt secrets at the application layer: https://cloud.google.com/kubernetes-engine/docs/how-to/encrypting-secrets
- Microsoft Learn: Enable KMS data encryption in Azure Kubernetes Service clusters: https://learn.microsoft.com/en-us/azure/aks/kms-data-encryption
- Flux documentation: Manage Kubernetes secrets with SOPS: https://fluxcd.io/flux/guides/mozilla-sops/
- Flux documentation: Bootstrap for Git servers: https://fluxcd.io/flux/installation/bootstrap/generic-git-server/

## Issues Found
- The introduction stated that Kubernetes stores Secrets in etcd as base64-encoded plaintext. Kubernetes stores Secrets unencrypted by default in the API server backing datastore, while base64 encoding is part of the Secret API object representation and is not encryption. Updated the wording to avoid implying base64 is a datastore encryption format.
- The AES-CBC example described AES-CBC as recommended for most use cases. Kubernetes documents KMS v2 as the preferred provider when using third-party key management and classifies AES-CBC as a local provider option. Updated the comment to describe AES-CBC as a simple local provider example.
- The KMS configuration snippet implied an AWS KMS plugin by name. Kubernetes KMS configuration points to a generic KMS plugin Unix socket; managed EKS encryption is configured through EKS APIs rather than this raw API server snippet. Renamed the example to a generic KMS plugin.
- The EKS `create-cluster` example omitted required cluster creation parameters. Added placeholder `--role-arn` and `--resources-vpc-config` values while keeping the encryption configuration intact.
- The GKE example omitted location and project context used in official examples. Added `--location` and `--project` placeholders.
- The AKS example used `--enable-encryption-at-host`, which enables host-based node encryption and is not the AKS KMS data encryption setting for Kubernetes Secrets in etcd. Replaced it with the current AKS KMS data encryption flags for platform-managed keys.
- The key rotation snippet referenced `${OLD_KEY}` without defining it. Added a placeholder assignment for the previous base64-encoded key.

## Review Notes
The post is technically valid after the fixes. For production self-managed Kubernetes clusters, KMS v2 is preferable to storing local encryption keys on the API server host. The AKS KMS data encryption documentation currently marks the new KMS experience as preview and requires Kubernetes 1.33 or later for the platform-managed key example.
