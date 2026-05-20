# Validation Summary: ArgoCD Best Practices for Secret Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes Secrets
- Bitnami Sealed Secrets
- kubeseal CLI
- External Secrets Operator
- AWS Secrets Manager
- HashiCorp Vault
- Argo CD Vault Plugin
- SOPS
- KSOPS / Kustomize plugins

## Sources Consulted
- Bitnami Sealed Secrets official README and v0.36.6 release notes: https://github.com/bitnami-labs/sealed-secrets and https://github.com/bitnami-labs/sealed-secrets/releases/tag/v0.36.6
- External Secrets Operator getting started guide, API specification, and GitHub releases: https://external-secrets.io/latest/introduction/getting-started/, https://external-secrets.io/main/api/spec/, and https://github.com/external-secrets/external-secrets/releases
- Argo CD Vault Plugin installation documentation and releases: https://argocd-vault-plugin.readthedocs.io/en/stable/installation/ and https://github.com/argoproj-labs/argocd-vault-plugin/releases
- Argo CD declarative setup documentation for repository and cluster credential Secrets: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- SOPS official documentation and repository: https://getsops.io/docs/ and https://github.com/getsops/sops
- KSOPS official README: https://github.com/viaduct-ai/kustomize-sops
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The Sealed Secrets controller install example used the old `v0.27.0` release URL and a `bash` code fence for YAML. Updated the URL to the current `v0.36.6` controller manifest and changed the fence to `yaml`.
- The External Secrets Operator examples used the deprecated/removed `external-secrets.io/v1beta1` API and an old `0.10.0` chart pin. Updated examples to `external-secrets.io/v1` and the current `2.5.0` Helm chart version.
- The Argo CD Vault Plugin sidecar example omitted the ConfigManagementPlugin registration and required sidecar mounts. Added the plugin ConfigMap, `plugin.yaml` mount, and standard CMP volumes/mounts, and changed the image reference to a custom image placeholder because the official sidecar docs require either downloading the binary or building a sidecar image with AVP installed.
- The SOPS section referred to "Mozilla SOPS" as if it were still a Mozilla project. Updated the wording to "SOPS"; the project was donated to CNCF and is now maintained under `getsops`.
- The KSOPS generator example missed the current KRM exec plugin annotation needed to locate the `ksops` executable. Added `config.kubernetes.io/function` with `exec.path: ksops`.
- The Argo CD secret listing command filtered on `app.kubernetes.io/part-of=argocd`, which may miss repository and cluster credential Secrets. Changed it to list all Secrets in the `argocd` namespace and made the credential Secret comments name-based rather than assuming `repo-*` and `cluster-*` prefixes.

## Review Notes
- The `kubectl create secret generic` command shape is consistent with Kubernetes documentation, but `kubectl` was not installed in this workspace, so local CLI help verification could not be run.
- The `ignoreDifferences` example uses valid Argo CD JSON pointer syntax, but ignoring `/data` for all Secrets is broad and should normally be limited to secrets managed by an external rotation controller.
- The AVP snippet remains an abbreviated patch-style example; real deployments still need AVP authentication configuration for the chosen backend.
