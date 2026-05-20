# Validation Summary: How to Enable GnuPG Signature Verification in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- GnuPG / GPG
- Git commit signing
- GitHub Actions

## Sources Consulted
- Argo CD Git GnuPG signature verification documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/source-integrity-git-gpg/
- Argo CD legacy GnuPG signature verification notice: https://argo-cd.readthedocs.io/en/latest/user-guide/gpg-verification/
- Argo CD `argocd gpg add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_gpg_add/
- Argo CD `argocd gpg rm` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_gpg_rm/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_get/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Git commit signing documentation: https://git-scm.com/docs/git-commit/
- Git signing overview: https://git-scm.com/book/en/v2/Git-Tools-Signing-Your-Work
- GnuPG operational command documentation: https://www.gnupg.org/documentation/manuals/gnupg/Operational-GPG-Commands.html
- GitHub commit signature verification documentation: https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification
- GitHub vigilant mode documentation: https://docs.github.com/en/authentication/managing-commit-signature-verification/displaying-verification-statuses-for-all-of-your-commits
- GitHub web-flow public key endpoint, inspected locally with `gpg --show-keys`: https://github.com/web-flow.gpg

## Issues Found
- The post used the legacy `spec.signatureKeys` AppProject field as the primary current configuration. Updated examples and wording to use current Argo CD source integrity policies under `spec.sourceIntegrity.git.policies[].gpg`, while noting that `signatureKeys` is legacy.
- The post claimed Argo CD checks every commit before syncing. Updated this to explain that `head` mode verifies the target revision and strict mode can verify reachable history.
- The post said the repo-server needs to restart after importing keys. Updated this to match the docs: keys may take time to propagate, and a repo-server restart is a troubleshooting step if the keyring remains out of sync.
- The verification status examples queried fields that do not represent GPG verification status, such as `.status.sourceType` and `.status.operationState.syncResult.source`. Replaced them with checks for application sync status and conditions.
- The UI claim about a lock icon or verification badge was not supported by the current Argo CD docs. Reworded it to say verification failures appear in sync or comparison errors.
- The GitHub merge commit section incorrectly tied GitHub signing to vigilant mode and used the expired GitHub web-flow key ID `4AEE18F83AFDEB23`. Updated the explanation to GitHub web-created commits and merge buttons, and changed the allow-list example to the current `B5690EEEBB952194` key found in `https://github.com/web-flow.gpg`.
- The `curl ... | argocd gpg add --from -` example was not aligned with the official CLI reference, which documents `--from` as a file path. Updated it to download the key to a file and pass that file path.
- The disabling section removed `signatureKeys` or set it to an empty array. Updated it to remove `sourceIntegrity` or use `gpg.mode: none` for matching repositories.

## Review Notes
The post is now accurate for current Argo CD source integrity based GPG verification. The legacy `signatureKeys` configuration may still apply to older Argo CD installations, but users on current releases should prefer `sourceIntegrity`.
