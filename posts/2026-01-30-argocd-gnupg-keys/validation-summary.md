# Validation Summary: How to Create ArgoCD GnuPG Keys

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- GitOps
- GnuPG / GPG
- Git commit and tag signing
- Kubernetes ConfigMaps and Secrets

## Sources Consulted
- Argo CD Source Integrity Verification overview: https://argo-cd.readthedocs.io/en/latest/user-guide/source-integrity/
- Argo CD Git GnuPG signature verification: https://argo-cd.readthedocs.io/en/latest/user-guide/source-integrity-git-gpg/
- Argo CD legacy GnuPG verification documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/gpg-verification/
- Argo CD `argocd gpg add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_gpg_add/
- Git `verify-commit` documentation: https://git-scm.com/docs/git-verify-commit
- GitHub Docs for signing commits with GPG: https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits
- GnuPG manual for exporting public keys: https://www.gnupg.org/gph/en/manual/x56.html

## Issues Found
- The post implied repository Secret configuration requires signature verification. Argo CD repository Secrets configure repository access, while GPG verification enforcement is configured on AppProjects. Updated Step 4 text to describe repository access only.
- The post said to set `signatureKeys` on the Application, but Argo CD does not use an Application-level `signatureKeys` field for this. Updated Step 5 to associate the Application with the enforcing project.
- The AppProject example used the legacy `spec.signatureKeys` field. Current Argo CD documentation recommends Source Integrity policies under `spec.sourceIntegrity.git.policies`; updated the AppProject manifest accordingly.
- Several placeholder GPG key IDs contained non-hexadecimal characters. Replaced them with hexadecimal placeholder IDs and updated related commands, ConfigMap keys, and revocation filenames.
- The sample GPG key listing used the older `secring.gpg` style. Updated it to the modern `pubring.kbx` output style.

## Review Notes
Argo CD still documents legacy `signatureKeys` behavior for compatibility, but current documentation advises migrating to Source Integrity policies. GPG verification is Git-source specific and does not apply to Helm or OCI application sources.
