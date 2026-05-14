# Validation Summary: How to Configure ImageUpdateAutomation Signing Key in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD ImageUpdateAutomation
- Kubernetes Secrets
- GPG / OpenPGP commit signing
- Git signed commit verification
- GitHub, GitLab, and Bitbucket commit signature verification

## Sources Consulted
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux ImageUpdateAutomation v1 API reference: https://fluxcd.io/flux/components/image/automation-api/v1/
- GitHub REST API endpoints for GPG keys: https://docs.github.com/en/rest/users/gpg-keys
- GitHub verified email requirement for GPG signatures: https://docs.github.com/en/enterprise-cloud@latest/authentication/troubleshooting-commit-signature-verification/using-a-verified-email-address-in-your-gpg-key
- GitLab GPG signed commits documentation: https://docs.gitlab.com/user/project/repository/signed_commits/gpg/
- Bitbucket Data Center GPG keys documentation: https://confluence.atlassian.com/bitbucketserver/using-gpg-keys-913477014.html
- Bitbucket Data Center commit signature verification documentation: https://confluence.atlassian.com/bitbucketserver/verify-commit-signatures-1279066267.html

## Issues Found
- The post incorrectly stated that ImageUpdateAutomation requires an unprotected GPG private key and that passphrases must be removed. Flux documentation states that a passphrase-protected private key is supported when the same Secret contains a `passphrase` field. Updated the passphrase section to show creating the Secret with both `git.asc` and `passphrase`.
- The post described `rm flux-signing-key.asc` as securely deleting the exported private key. `rm` removes the file entry but is not a secure erase mechanism. Updated the wording to say "delete" instead of "securely delete."

## Review Notes
The main ImageUpdateAutomation manifest uses the current `image.toolkit.fluxcd.io/v1` API and the documented `spec.git.commit.signingKey.secretRef` field. The required Secret key name `git.asc`, Go template fields such as `.AutomationObject` and `.Changed.FileChanges`, and the `Setters` update strategy match current Flux documentation.
