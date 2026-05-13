# Validation Summary: How to Configure Image Automation with Custom Git Email in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux ImageUpdateAutomation
- Flux image-reflector-controller and image-automation-controller
- Kubernetes custom resources
- Git commit metadata and log filtering
- GitHub noreply emails and commit signature verification
- GitLab commit email attribution
- GPG commit signing
- GitHub CLI

## Sources Consulted
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- GitHub Docs, Email addresses reference: https://docs.github.com/account-and-profile/reference/email-addresses-reference
- GitHub Docs, About commit signature verification: https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification
- GitHub Docs, Using a verified email address in your GPG key: https://docs.github.com/en/authentication/troubleshooting-commit-signature-verification/using-a-verified-email-address-in-your-gpg-key
- GitHub Docs, Why are my commits linked to the wrong user?: https://docs.github.com/en/pull-requests/committing-changes-to-your-project/troubleshooting-commits/why-are-my-commits-linked-to-the-wrong-user
- GitLab Docs, User account and private commit email: https://docs.gitlab.com/user/profile/
- GitLab Docs, Email settings and private commit email hostname: https://docs.gitlab.com/administration/settings/email/
- Git documentation, git-log: https://git-scm.com/docs/git-log
- GitHub CLI help output for `gh api --jq`

## Issues Found
- The GitLab section said a service account email should match the account's primary email. GitLab also supports a private commit email, so the wording was corrected to say the email should match an email configured for the account, such as the primary email or private commit email.
- The GPG signing section said signature verification will fail when the commit author email does not match the GPG key. GitHub's documented check is based on the committer or tagger email matching an identity in the GPG key and a verified email on the account. The wording was corrected to avoid overstating Git's behavior and to describe platform verification accurately.
- The GitHub verification section said commits are marked "Verified" when the committer email matches a verified account email. GitHub requires a cryptographically valid GPG, SSH, or S/MIME signature, or a GitHub signing flow. The section was corrected to require signing and adding the public key to the account.
- The `git log --invert-grep --author="flux"` example was incorrect because `--invert-grep` inverts `--grep` message matching, not author matching. It was replaced with a Perl-compatible negative lookahead author filter.

## Review Notes
The Flux `ImageUpdateAutomation` examples use the current `image.toolkit.fluxcd.io/v1` API shape, including `spec.git.commit.author.email`, `messageTemplate`, optional `signingKey.secretRef.name`, and `update.strategy: Setters`. The GitHub noreply format shown is valid for ID-based noreply addresses; GitHub also documents a legacy username-only noreply format for some older accounts.
