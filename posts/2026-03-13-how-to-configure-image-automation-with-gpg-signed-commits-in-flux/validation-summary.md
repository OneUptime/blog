# Validation Summary: How to Configure Image Automation with GPG Signed Commits in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux v2 ImageUpdateAutomation
- Flux image-reflector-controller and image-automation-controller
- Kubernetes Secrets and kubectl
- GnuPG / OpenPGP signing keys
- GitHub commit signature verification
- GitHub branch protection

## Sources Consulted
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux ImageUpdateAutomation API reference v1: https://fluxcd.io/flux/components/image/automation-api/v1/
- Flux reconcile image update CLI documentation: https://fluxcd.io/flux/cmd/flux_reconcile_image_update/
- Flux image-automation-controller source code: https://github.com/fluxcd/image-automation-controller
- GitHub Docs, adding a GPG key to your GitHub account: https://docs.github.com/en/authentication/managing-commit-signature-verification/adding-a-gpg-key-to-your-github-account
- GitHub Docs, using a verified email address in your GPG key: https://docs.github.com/en/authentication/troubleshooting-commit-signature-verification/using-a-verified-email-address-in-your-gpg-key
- GitHub Docs, protected branches and required signed commits: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- GnuPG unattended key generation manual: https://gnupg.org/documentation/manuals/gnupg/Unattended-GPG-key-generation.html

## Issues Found
- The post said a GPG key for a bot or service account could be added at the GitHub organization level. GitHub's GPG signing keys are added to user accounts, so this was changed to say the key should be added to the bot or service account's GitHub user account.
- The post said GitHub verification depends on matching the GPG key email to the commit author email. GitHub verifies against an email identity on the GPG key that is verified on the GitHub account owning the key, so the wording was corrected to avoid implying author email alone is sufficient.
- The key rotation example restarted the image-automation-controller to pick up the new key. Flux reads the signing secret during reconciliation, so this was changed to trigger the ImageUpdateAutomation reconciliation with the documented `reconcile.fluxcd.io/requestedAt` annotation.

## Review Notes
The Flux `ImageUpdateAutomation` API version, `.spec.git.commit.signingKey.secretRef.name` field, required `git.asc` secret key, optional `passphrase` secret key, `Setters` update strategy, and kubectl secret commands were verified as current and technically valid. The GnuPG batch key generation example was also tested locally with GnuPG 2.4.4.
