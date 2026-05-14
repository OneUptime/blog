# Validation Summary: How to Configure Image Automation with Signed Commits in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux ImageUpdateAutomation
- Kubernetes Secrets
- Flux CLI
- GnuPG / GPG commit signing
- GitHub and GitLab commit signature verification

## Sources Consulted
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Image update automation API reference v1: https://fluxcd.io/flux/components/image/automation-api/v1/
- Flux CLI `flux reconcile image update` reference: https://fluxcd.io/flux/cmd/flux_reconcile_image_update/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- GitHub Docs, adding a GPG key: https://docs.github.com/en/authentication/managing-commit-signature-verification/adding-a-gpg-key-to-your-github-account
- GitLab Docs, sign commits with GPG: https://docs.gitlab.com/user/project/repository/signed_commits/gpg/
- Local GnuPG 2.4.4 `gpg --version` output
- Flux image-automation-controller source on GitHub for Secret watch permissions: https://github.com/fluxcd/image-automation-controller

## Issues Found
- The post incorrectly said passphrase-protected GPG keys cannot be used for automation. Current Flux documentation says a passphrase-protected private key is supported when the same Secret includes a `passphrase` field, so the troubleshooting text was corrected and an explanatory note was added after the Secret creation example.
- The key rotation steps said to restart the image-automation-controller to pick up the new key. The controller watches Secrets and reads the referenced signing key during reconciliation, so the restart step was replaced with `flux reconcile image update flux-system -n flux-system`.

## Review Notes
The main ImageUpdateAutomation API fields, `git.asc` Secret key name, message template usage with `.Changed.Changes`, `Setters` update strategy, Flux CLI reconciliation command, and GPG export commands are technically correct for current Flux documentation. `kubectl` was not installed in the local environment, so Kubernetes command syntax was checked against official Kubernetes documentation instead of local help output.
