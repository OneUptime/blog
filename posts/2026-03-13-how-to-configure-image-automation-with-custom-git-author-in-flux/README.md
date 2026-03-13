# How to Configure Image Automation with Custom Git Author in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, image-automation, Git-Author, GitOps, Kubernetes

Description: Learn how to configure a custom Git author name for Flux ImageUpdateAutomation commits to distinguish automated changes in your Git history.

---

## Introduction

Every Git commit has an author name and email associated with it. When Flux ImageUpdateAutomation creates commits for image tag updates, you can customize the author name to clearly identify these commits as automated. This helps team members quickly distinguish between human and machine-generated commits in the Git log, and it enables filtering and auditing of automated changes.

This guide shows you how to configure custom Git author names for Flux image automation commits and explains best practices for choosing author identities.

## Prerequisites

- A Kubernetes cluster with Flux v2 installed
- The image-reflector-controller and image-automation-controller deployed
- An ImageUpdateAutomation resource configured
- A GitRepository source with write access

## Setting the Git Author Name

The author name is configured in the `commit.author` section of the ImageUpdateAutomation spec:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
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
        email: flux@example.com
      messageTemplate: "chore: automated image update"
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

The `name` field sets the Git author name that appears in the commit log. The `email` field sets the associated email address.

## Choosing an Author Name

The author name should clearly communicate that the commit is automated. Common conventions include:

- `Flux Bot` - Simple and descriptive
- `Flux Image Automation` - More specific
- `flux-cd[bot]` - Following the GitHub bot naming convention
- `deploy-bot` - Generic automation name
- `Platform Team Bot` - Team-specific naming

## Using Environment-Specific Authors

For clusters with multiple environments, you can use different author names to distinguish which environment triggered the commit:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: staging-updates
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
        name: Flux Bot (Staging)
        email: flux-staging@example.com
      messageTemplate: "chore(staging): update images"
    push:
      branch: main
  update:
    path: ./clusters/staging
    strategy: Setters
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: production-updates
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
        name: Flux Bot (Production)
        email: flux-production@example.com
      messageTemplate: "chore(production): update images"
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

## Matching Author with Git Platform Bot Account

If your Git platform supports bot accounts, create a dedicated bot account and use its name and email. For GitHub, you can use a machine user account:

```yaml
spec:
  git:
    commit:
      author:
        name: myorg-flux-bot
        email: myorg-flux-bot@users.noreply.github.com
```

Using the `noreply` email from GitHub associates the commit with the bot account and shows the bot's avatar in the Git log.

## Filtering Commits by Author

Having a consistent author name lets you filter commits in the Git log:

```bash
# Show only automated commits
git log --author="Flux Bot" --oneline

# Show only human commits
git log --invert-grep --author="Flux Bot" --oneline

# Count automated commits in the last month
git log --author="Flux Bot" --since="1 month ago" --oneline | wc -l
```

## Using Author Names in CI Pipelines

CI pipelines can use the author name to skip or modify behavior for automated commits:

```yaml
# GitHub Actions
jobs:
  build:
    if: github.event.head_commit.author.name != 'Flux Bot'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
```

This prevents CI from running on automated image update commits, avoiding unnecessary builds.

## Author Name with GPG Signing

When using GPG-signed commits, the author email must match the email in the GPG key:

```yaml
spec:
  git:
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      signingKey:
        secretRef:
          name: gpg-signing-key
```

Make sure the GPG key was generated with the same email address (`flux@example.com` in this case).

## Multiple Automation Resources with Different Authors

When you have multiple ImageUpdateAutomation resources, each can have its own author:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: app-updates
  namespace: flux-system
spec:
  git:
    commit:
      author:
        name: Flux App Bot
        email: flux-apps@example.com
      messageTemplate: "chore: update app images"
  # ... rest of spec
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: infra-updates
  namespace: flux-system
spec:
  git:
    commit:
      author:
        name: Flux Infra Bot
        email: flux-infra@example.com
      messageTemplate: "chore: update infra images"
  # ... rest of spec
```

## Verifying the Author Configuration

After automation runs, check the commit author:

```bash
git log -1 --format="Author: %an <%ae>"
```

Check the automation status:

```bash
flux get image update image-updates
```

## Conclusion

Setting a custom Git author name for Flux image automation commits is a small configuration change with significant benefits for your Git workflow. It makes automated commits instantly recognizable in the Git log, enables filtering and auditing, and allows CI pipelines to handle automated commits differently from human commits. Choose an author name that is descriptive and consistent across your organization, and consider using environment-specific names when multiple automation resources commit to the same repository.
