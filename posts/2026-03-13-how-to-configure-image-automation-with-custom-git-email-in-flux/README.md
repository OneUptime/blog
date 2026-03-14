# How to Configure Image Automation with Custom Git Email in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, image-automation, Git-Email, GitOps, Kubernetes

Description: Learn how to configure a custom Git email address for Flux ImageUpdateAutomation commits for proper attribution and platform integration.

---

## Introduction

The Git email address associated with automated commits serves multiple purposes beyond simple attribution. It links commits to user accounts on Git platforms, affects how commits appear in contribution graphs, and plays a role in GPG signature verification. Choosing the right email for Flux image automation commits ensures proper integration with your Git platform and your team's workflows.

This guide covers how to configure custom Git email addresses for Flux ImageUpdateAutomation, how to integrate with different Git platforms, and how to handle email-related requirements like verified commits.

## Prerequisites

- A Kubernetes cluster with Flux v2 installed
- The image-reflector-controller and image-automation-controller deployed
- An ImageUpdateAutomation resource configured
- A GitRepository source with write access

## Setting the Git Email

The email is configured alongside the author name in the `commit.author` section:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: image-updates
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: Flux Bot
        email: flux-bot@example.com
      messageTemplate: "chore: automated image update"
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

## GitHub Noreply Email Integration

GitHub provides a noreply email address for each account. Using this email associates commits with the GitHub account without exposing a real email:

```yaml
spec:
  git:
    commit:
      author:
        name: flux-bot
        email: 12345678+flux-bot@users.noreply.github.com
```

The format is `{user-id}+{username}@users.noreply.github.com`. You can find the user ID on the GitHub API or in the account settings.

For GitHub Apps, the email format is different:

```yaml
spec:
  git:
    commit:
      author:
        name: flux-bot[bot]
        email: 12345678+flux-bot[bot]@users.noreply.github.com
```

## GitLab Email Integration

For GitLab, use the user's commit email or a dedicated service account email:

```yaml
spec:
  git:
    commit:
      author:
        name: Flux Bot
        email: flux-bot@gitlab.example.com
```

If using a GitLab service account, the email should match the account's primary email for proper attribution.

## Using a Team or Group Email

For organizations that want automated commits attributed to a team rather than an individual bot:

```yaml
spec:
  git:
    commit:
      author:
        name: Platform Team Automation
        email: platform-team@example.com
```

This can be useful for compliance purposes where commits need to be traceable to a responsible team.

## Email for GPG Signing

When using GPG-signed commits, the email in the commit author must match the email in the GPG key. If they do not match, the signature verification will fail:

```yaml
spec:
  git:
    commit:
      author:
        name: Flux Bot
        email: flux-bot@example.com
      signingKey:
        secretRef:
          name: gpg-signing-key
```

Make sure the GPG key was generated with the User ID containing `flux-bot@example.com`:

```bash
gpg --list-keys flux-bot@example.com
```

## Environment-Specific Emails

Use different emails for different environments to make it clear which cluster generated the commit:

```yaml
# Staging automation
spec:
  git:
    commit:
      author:
        name: Flux Bot
        email: flux-staging@example.com

# Production automation
spec:
  git:
    commit:
      author:
        name: Flux Bot
        email: flux-production@example.com
```

## Email and Commit Verification on GitHub

GitHub marks commits as "Verified" when the committer email matches a verified email on the account. To get verified badges on automated commits:

1. Create a machine user account on GitHub
2. Add and verify the email address on that account
3. Use that email in the ImageUpdateAutomation
4. Optionally add GPG signing for cryptographic verification

```yaml
spec:
  git:
    commit:
      author:
        name: myorg-flux
        email: myorg-flux@example.com
```

## Filtering by Email in Git

The email address enables precise filtering of automated commits:

```bash
# Find all commits from the staging automation
git log --author="flux-staging@example.com" --oneline

# Find all commits from any flux automation
git log --author="flux.*@example.com" --oneline --perl-regexp

# Exclude automated commits
git log --invert-grep --author="flux" --oneline
```

## Complete Configuration Example

Here is a full ImageUpdateAutomation with properly configured author email:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: production-image-updates
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: Flux Production Bot
        email: 98765432+flux-prod-bot@users.noreply.github.com
      messageTemplate: |
        chore(production): update container images

        {{ range .Changed.Changes -}}
        - {{ .OldValue }} -> {{ .NewValue }}
        {{ end -}}
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

## Verifying the Email Configuration

Check the email on recent automated commits:

```bash
git log -1 --format="Author: %an <%ae>"
git log -1 --format="Committer: %cn <%ce>"
```

Check if the commit shows as verified on GitHub:

```bash
gh api repos/myorg/my-repo/commits/HEAD --jq '.commit.verification.verified'
```

## Conclusion

The Git email address in Flux ImageUpdateAutomation connects automated commits to identities on your Git platform. Using platform-specific email formats like GitHub's noreply addresses ensures proper attribution and enables verified commit badges. The email also needs to match your GPG key if you use signed commits. Choose email addresses that are consistent, traceable, and compatible with your platform's verification mechanisms to get the most value from your automated commit history.
