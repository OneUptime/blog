# Validation Summary: How to Configure Image Automation with Custom Git Author in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux v2
- Flux ImageUpdateAutomation
- Flux image-reflector-controller and image-automation-controller
- Kubernetes custom resources
- Git commit author metadata
- GitHub Actions
- GitHub noreply commit email addresses
- GPG-signed Git commits

## Sources Consulted
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux ImageUpdateAutomation v1 API reference: https://fluxcd.io/flux/components/image/automation-api/v1/
- Flux CLI documentation for `flux get images update`: https://fluxcd.io/flux/cmd/flux_get_images_update/
- Git `git-log` documentation: https://git-scm.com/docs/git-log
- GitHub email addresses reference: https://docs.github.com/account-and-profile/reference/email-addresses-reference
- GitHub GPG signature verification documentation: https://docs.github.com/en/authentication/troubleshooting-commit-signature-verification/using-a-verified-email-address-in-your-gpg-key

## Issues Found
- The post referred to the author configuration as `commit.author`. Changed it to `spec.git.commit.author` to match the Flux ImageUpdateAutomation API.
- The GitHub noreply email example used the legacy `USERNAME@users.noreply.github.com` style. Updated the example to the current ID-based `ID+USERNAME@users.noreply.github.com` format and clarified that users should copy the exact address from the bot account's GitHub email settings.
- The command `git log --invert-grep --author="Flux Bot" --oneline` does not show non-Flux authors in current Git; `--invert-grep` only inverts `--grep` message matches. Replaced it with a display-oriented filter using `git log --format=... | grep -v ...`.
- The GPG section incorrectly stated that the author email must match the email in the GPG key. Updated the wording to explain that GitHub verified signatures depend on a commit email matching a GPG key identity and being verified on the account.

## Review Notes
The Flux YAML snippets use the current `image.toolkit.fluxcd.io/v1` API shape, valid `spec.git.commit.author` fields, `signingKey.secretRef.name`, and the supported `Setters` update strategy. The `flux get image update image-updates` command is consistent with the Flux CLI examples, although the official page is titled `flux get images update`.
