# Validation Summary: How to Manage Secrets with ArgoCD and Sealed Secrets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes Secrets
- Bitnami Sealed Secrets
- kubeseal CLI
- Helm
- Kustomize repository layout

## Sources Consulted
- Bitnami Sealed Secrets official README: https://github.com/bitnami-labs/sealed-secrets
- Bitnami Sealed Secrets latest release: https://github.com/bitnami-labs/sealed-secrets/releases/tag/v0.36.6
- Bitnami Sealed Secrets Helm repository index: https://bitnami-labs.github.io/sealed-secrets/index.yaml
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/sync-waves/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/application-specification/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- Updated the Sealed Secrets Helm chart version from `2.14.0` to `2.18.5`, matching the current chart version in the official Helm repository as of 2026-05-20.
- Updated the Linux `kubeseal` install version from `0.27.0` to `0.36.6`, matching the latest official Sealed Secrets release as of 2026-05-20.
- Corrected the key-handling explanation. The original wording said the private key never leaves the cluster, but the official backup/restore workflow exports the key material for secure storage. The post now says the private key is stored in a Kubernetes Secret and should only leave the cluster for secure backup or restore.
- Qualified the multi-cluster statement. SealedSecrets encrypted for one cluster cannot normally be decrypted by another, but this is no longer true if the same sealing key is intentionally restored or shared.
- Corrected the key rotation troubleshooting note. Sealed Secrets keeps old sealing keys so existing SealedSecrets can continue to decrypt; re-encryption is recommended after intentional key renewal or compromise, not automatically required for every old SealedSecret after normal key renewal.

## Review Notes
The Argo CD Application examples, sync-wave annotation, `kubectl create secret generic` commands, `kubeseal --raw`, `kubeseal --fetch-cert`, backup selector, and default strict scope behavior matched the official documentation. Local `helm`, `kubectl`, and `kubeseal` binaries were not installed in this environment, so CLI behavior was verified against official documentation and the official Helm repository metadata rather than local help output.
