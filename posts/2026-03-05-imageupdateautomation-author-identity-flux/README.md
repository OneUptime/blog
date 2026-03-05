# How to Configure ImageUpdateAutomation Author Identity in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, ImageUpdateAutomation, Image Automation, Git Configuration

Description: Learn how to configure the author identity for Git commits created by Flux CD's ImageUpdateAutomation controller.

---

When Flux CD's ImageUpdateAutomation controller updates image tags in your Git repository, it creates commits automatically. By default, these commits need an author identity consisting of a name and email address. Configuring this identity correctly is important for audit trails, compliance, and integration with Git hosting platforms.

## Why Author Identity Matters

Every Git commit requires an author name and email. When Flux creates automated commits, the author identity determines how those commits appear in your Git history. This affects:

- **Audit trails**: Security teams need to distinguish automated changes from human changes.
- **Git platform integration**: GitHub, GitLab, and Bitbucket can link commits to user accounts based on email.
- **Compliance**: Some organizations require all commits to have identifiable authors.
- **Notifications**: Commit notifications may be sent to the email address in the author field.

## Basic Author Identity Configuration

The author identity is configured in the `spec.git.commit.author` field of the ImageUpdateAutomation resource:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: image-updater
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxbot@example.com
        name: Flux Bot
      messageTemplate: 'Automated image update'
    push:
      branch: main
  update:
    path: ./clusters/my-cluster
    strategy: Setters
```

The `author.name` and `author.email` fields are required. Without them, the ImageUpdateAutomation controller will fail to create commits.

## Using a Bot Account

A recommended practice is to use a dedicated bot account for Flux commits. This makes automated changes clearly distinguishable in the Git log.

For GitHub, you can use the noreply email associated with a bot account:

```yaml
spec:
  git:
    commit:
      author:
        email: 12345678+flux-bot[bot]@users.noreply.github.com
        name: flux-bot[bot]
```

For GitLab, use the bot user's email:

```yaml
spec:
  git:
    commit:
      author:
        email: flux-bot@gitlab.example.com
        name: Flux Bot
```

## Linking to a GitHub App

If you use a GitHub App for Flux's Git access, you can configure the author to match the app's identity. GitHub Apps have a specific email format:

```yaml
spec:
  git:
    commit:
      author:
        email: 123456+my-flux-app[bot]@users.noreply.github.com
        name: my-flux-app[bot]
```

Replace `123456` with the GitHub App's ID and `my-flux-app` with the app's slug name. This links the automated commits to the GitHub App in the GitHub UI, showing the app's avatar and badge.

## Per-Environment Author Identity

In multi-cluster setups, you may want each cluster's automation to have a distinct identity. This makes it easy to trace which cluster triggered a particular commit:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: image-updater
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: flux-production@example.com
        name: Flux Bot (Production)
      messageTemplate: |
        Automated image update from production cluster

        Automation name: {{ .AutomationObject }}

        Files:
        {{ range $filename, $_ := .Changed.FileChanges -}}
        - {{ $filename }}
        {{ end -}}
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

For staging, create a separate resource with a different identity:

```yaml
spec:
  git:
    commit:
      author:
        email: flux-staging@example.com
        name: Flux Bot (Staging)
```

## Combining Author Identity with Commit Signing

If your repository requires signed commits, the author identity works alongside GPG or SSH signing. The signing key is configured separately, but the author identity still determines the displayed author:

```yaml
spec:
  git:
    commit:
      author:
        email: fluxbot@example.com
        name: Flux Bot
      signingKey:
        secretRef:
          name: signing-key
```

The signing key secret must contain the GPG private key. The author email should match the UID on the GPG key for consistent verification.

## Verifying Author Identity in Commits

After the ImageUpdateAutomation runs, verify that commits use the correct author:

```bash
# Check the automation status
flux get image update image-updater

# View recent commits in the repository
git log --format='%an <%ae> - %s' -5
```

You should see entries like:

```
Flux Bot <fluxbot@example.com> - Automated image update
```

## Troubleshooting

**Commits not appearing with the correct author**: Verify the `author` field is nested correctly under `spec.git.commit.author`. A common YAML indentation error is placing `author` at the wrong level.

**GitHub not linking commits to a user**: Ensure the email matches exactly what is configured in the GitHub account settings. GitHub links commits based on the email address.

**Automation failing with author errors**: Both `name` and `email` are required fields. If either is missing, the controller will report an error. Check the controller logs:

```bash
kubectl -n flux-system logs deployment/image-automation-controller
```

**Protected branch rejections**: If your Git hosting platform requires commits to come from specific users, ensure the bot account has the necessary permissions to push to the target branch.

## Best Practices

1. **Use a dedicated bot account** rather than a personal email. This avoids confusion and ensures automated commits are clearly identified.

2. **Include the cluster or environment name** in the author identity for multi-cluster setups to aid in troubleshooting.

3. **Match the author email to a real account** on your Git platform so commits are properly attributed and linked in the UI.

4. **Document the bot account** so team members understand the source of automated commits.

Configuring the author identity is a small but important step in setting up Flux image automation. It ensures your Git history remains clean, auditable, and properly attributed.
