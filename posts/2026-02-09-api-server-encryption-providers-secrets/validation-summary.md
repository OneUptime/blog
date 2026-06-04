# Validation Summary: How to Configure API Server Encryption Providers for Secrets at Rest

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes API server
- Kubernetes Secrets
- EncryptionConfiguration
- AES-CBC, AES-GCM, Secretbox
- Kubernetes KMS provider
- etcd
- kubeadm static pod manifests
- kubectl

## Sources Consulted
- Kubernetes documentation: Encrypting Confidential Data at Rest - https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Kubernetes documentation: Using a KMS provider for data encryption - https://kubernetes.io/docs/tasks/administer-cluster/kms-provider/
- Kubernetes API server configuration API v1 reference - https://kubernetes.io/docs/reference/config-api/apiserver-config.v1/
- Kubernetes SIG AWS aws-encryption-provider documentation - https://github.com/kubernetes-sigs/aws-encryption-provider
- Amazon EKS documentation: Default envelope encryption for all Kubernetes API Data - https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-encryption.html

## Issues Found
- Corrected the opening claim that Secrets are stored in etcd as base64-encoded data. Kubernetes exposes Secret data as base64-encoded API values, but the important default storage behavior is that etcd stores the Secret content unencrypted.
- Updated KMS examples to use KMS v2 by adding `apiVersion: v2` and removing `cachesize`, because KMS v1 is deprecated and disabled by default in Kubernetes 1.29 and later, and KMS v2 does not support `cachesize`.
- Replaced the AWS KMS DaemonSet example with a generic KMS v2-compatible static pod pattern. The original DaemonSet used an unsupported image reference and did not match Kubernetes guidance that the KMS plugin should run on the same host as the API server.
- Added the Kubernetes AES-GCM caveat that AES-GCM keys require automated rotation before 200,000 writes.
- Replaced an architecture-dependent Secretbox speed comparison with Kubernetes' documented caution about Secretbox using relatively new encryption technologies.
- Changed the custom resource example from `customresource.example.com` to `widgets.example.com` to better match Kubernetes resource naming (`resource.group`).
- Updated KMS plugin monitoring and troubleshooting commands to match the corrected static pod naming pattern.

## Review Notes
The post is now technically accurate for current Kubernetes guidance. Local key providers such as AES-CBC, AES-GCM, and Secretbox still require careful host-level key protection; KMS v2 is the preferred production path where a compatible plugin or managed control plane integration is available.
