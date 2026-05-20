# Validation Summary: How to Use Helm Secrets Plugin with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Helm
- helm-secrets
- SOPS
- age
- Kubernetes
- AWS KMS
- GCP Cloud KMS
- Docker

## Sources Consulted
- Argo CD custom tooling documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/custom_tools/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD GitHub releases: https://github.com/argoproj/argo-cd/releases/latest
- helm-secrets Argo CD integration documentation: https://github.com/jkroepke/helm-secrets/wiki/ArgoCD-Integration
- helm-secrets GitHub releases: https://github.com/jkroepke/helm-secrets/releases/latest
- SOPS official repository and documentation links: https://github.com/getsops/sops
- age official repository: https://github.com/FiloSottile/age

## Issues Found
- The post described SOPS as "Mozilla SOPS"; updated this to SOPS because the project is now maintained under getsops/CNCF, while retaining the technical meaning.
- The post stated that decrypted values never touch disk in plaintext. Updated the wording to explain that helm-secrets should be configured to decrypt into a temporary directory so plaintext files are not written beside encrypted files in the repo checkout.
- The Dockerfile pinned Argo CD v2.9.3, SOPS v3.8.1, age v1.1.1, and helm-secrets v4.5.1. Updated the example to current releases checked during review: Argo CD v3.4.2, SOPS v3.13.0, age v1.3.1, and helm-secrets v4.7.6.
- The Dockerfile did not configure helm-secrets wrapper settings recommended for Argo CD integration. Added `HELM_SECRETS_WRAPPER_ENABLED`, `HELM_SECRETS_VALUES_ALLOW_ABSOLUTE_PATH`, `HELM_SECRETS_DECRYPT_SECRETS_IN_TMP_DIR`, and `HELM_SECRETS_HELM_PATH`, plus a wrapper symlink.
- The init-container example installed SOPS and age but did not install the helm-secrets plugin. Added the helm-secrets download and extraction into `HELM_PLUGINS`.
- The init-container example set `HELM_PLUGINS` to `/custom-tools/helm-plugins` but did not mount `/custom-tools` into the repo-server container. Added the shared volume mount and helm wrapper mount.
- The init-container patch used `repo-server` as the container name. Updated it to `argocd-repo-server`, matching the upstream Argo CD deployment container name.
- The post omitted the Argo CD `helm.valuesFileSchemes` configuration required for helm-secrets downloader URL schemes. Added the `argocd-cm` snippet for `secrets`, `secrets+age-import`, `secrets+gpg-import`, and related schemes.
- The `.sops.yaml` example comment claimed only `data` and `stringData` would be encrypted, but the rule had no `encrypted_regex` and would encrypt all values. Updated the comment to describe Helm secrets values files accurately.
- The sample encrypted file still showed SOPS version `3.8.1`; updated it to `3.13.0` to match the revised installation examples.

## Review Notes
- The post remains focused on encrypted Helm values files. helm-secrets does not support encrypting arbitrary Helm templates/manifests in Argo CD through this values-file flow.
- For multi-source Argo CD Applications, helm-secrets has additional limitations and configuration details that are outside this post's current scope.
