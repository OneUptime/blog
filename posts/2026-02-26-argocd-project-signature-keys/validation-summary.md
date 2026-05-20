# Validation Summary: How to Configure Project Signature Keys in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD AppProject signature verification
- Argo CD GnuPG key management
- Kubernetes ConfigMaps
- Git commit and tag signing
- GnuPG
- GitHub Actions

## Sources Consulted
- Argo CD latest documentation: Git GnuPG signature verification and Source Integrity Verification: https://argo-cd.readthedocs.io/en/latest/user-guide/source-integrity-git-gpg/
- Argo CD latest documentation: legacy GPG signature verification deprecation notice: https://argo-cd.readthedocs.io/en/latest/user-guide/gpg-verification/
- Argo CD release 2.9 documentation: GnuPG verification, `signatureKeys`, ConfigMap format, and CLI commands: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/gpg-verification/
- Argo CD command reference: `argocd gpg add`: https://argo-cd.readthedocs.io/en/release-2.5/user-guide/commands/argocd_gpg_add/
- Argo CD command reference: `argocd proj add-signature-key`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_add-signature-key/
- Git documentation: `git-config` signing options: https://git-scm.com/docs/git-config
- Git documentation: `git-log --show-signature`: https://git-scm.com/docs/git-log
- GitHub Docs: configuring Git for GPG commit and tag signing: https://docs.github.com/en/authentication/managing-commit-signature-verification/telling-git-about-your-signing-key

## Issues Found
- The prerequisites stated "ArgoCD v2.4 or later." Argo CD documentation says project-level GnuPG verification was introduced in v1.7, while current documentation marks legacy `signatureKeys` as deprecated in favor of Source Integrity Verification. Updated the prerequisite to reflect both facts.
- The ConfigMap example said the key name was arbitrary. Argo CD documentation says entries in `argocd-gpg-keys-cm` should use the public GnuPG key ID as the ConfigMap data key. Updated the example keys and comment accordingly.

## Review Notes
- The `signatureKeys` examples and `argocd proj add-signature-key` command are technically valid for legacy project-wide verification, but current Argo CD documentation recommends migrating new configurations to `.spec.sourceIntegrity.git.policies`.
- Argo CD GnuPG verification applies to Git sources and does not verify Helm or OCI application sources.
