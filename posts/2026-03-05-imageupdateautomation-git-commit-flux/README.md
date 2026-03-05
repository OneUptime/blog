# How to Configure ImageUpdateAutomation Git Commit Settings in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, ImageUpdateAutomation, Image Automation, Git Commits

Description: Learn how to configure all Git commit settings for Flux CD's ImageUpdateAutomation including author, message template, and signing.

---

Flux CD's ImageUpdateAutomation controller automates the process of updating container image references in your Git repository. The Git commit settings control how these automated commits are created, including the author identity, commit message format, and optional signing. This guide covers all available Git commit configuration options.

## The Git Commit Configuration Block

The commit settings live under `spec.git.commit` in the ImageUpdateAutomation resource. Here is the full structure:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
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
        email: flux@example.com
        name: Flux Bot
      messageTemplate: 'Automated image update'
      signingKey:
        secretRef:
          name: signing-key
    push:
      branch: main
  update:
    path: ./clusters/my-cluster
    strategy: Setters
```

Let us examine each section in detail.

## Checkout Configuration

The `checkout` section tells the controller which branch to check out before making changes:

```yaml
spec:
  git:
    checkout:
      ref:
        branch: main
```

You can also reference a specific tag or commit, but branch is the most common choice for image automation since you want to update the latest state of a branch:

```yaml
spec:
  git:
    checkout:
      ref:
        branch: main
```

## Author Configuration

The author field is required and specifies who the commit is attributed to:

```yaml
spec:
  git:
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
```

Both `name` and `email` are required. Without them, the controller cannot create valid Git commits. Use a dedicated bot account email to distinguish automated commits from human ones.

## Message Template Configuration

The `messageTemplate` field supports Go template syntax. The template has access to the `.AutomationObject` variable (the namespace/name of the ImageUpdateAutomation) and the `.Changed` variable containing details about what was modified.

A minimal template:

```yaml
spec:
  git:
    commit:
      messageTemplate: 'Automated image update'
```

A detailed template with all available fields:

```yaml
spec:
  git:
    commit:
      messageTemplate: |
        Automated image update by {{ .AutomationObject }}

        Files changed:
        {{ range $filename, $_ := .Changed.FileChanges -}}
        - {{ $filename }}
        {{ end -}}

        Objects updated:
        {{ range $resource, $_ := .Changed.Objects -}}
        - {{ $resource.Resource.Kind }} {{ $resource.Resource.Namespace }}/{{ $resource.Resource.Name }}
        {{ end -}}
```

## Signing Key Configuration

To sign automated commits with a GPG key, reference a Kubernetes secret containing the private key:

```yaml
spec:
  git:
    commit:
      signingKey:
        secretRef:
          name: signing-key
```

Create the secret from a GPG private key:

```bash
gpg --export-secret-keys --armor flux@example.com > private.key

kubectl create secret generic signing-key \
  --namespace=flux-system \
  --from-file=git.asc=private.key

rm private.key
```

The secret must contain the key in the `git.asc` field. The controller uses this key to sign every commit it creates.

## Push Configuration

The `push` section controls where the commit is pushed. The simplest configuration pushes to the same branch that was checked out:

```yaml
spec:
  git:
    push:
      branch: main
```

You can push to a different branch to create pull requests instead of direct pushes:

```yaml
spec:
  git:
    push:
      branch: flux-image-updates
```

When pushing to a different branch, the controller creates the branch from the checkout ref if it does not exist.

## Complete Example with All Settings

Here is a complete ImageUpdateAutomation resource demonstrating all Git commit settings:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: image-updater
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      messageTemplate: |
        chore(images): automated update

        Automation: {{ .AutomationObject }}

        {{ range $filename, $_ := .Changed.FileChanges -}}
        - {{ $filename }}
        {{ end -}}
      signingKey:
        secretRef:
          name: signing-key
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

## Interval Configuration

The `interval` field controls how often the controller checks for new image updates:

```yaml
spec:
  interval: 10m
```

A shorter interval means faster deployments but more Git operations. A longer interval reduces Git API calls but delays deployments. For most environments, 10 to 30 minutes is reasonable.

## Source Reference

The `sourceRef` points to the GitRepository resource that the controller will clone and modify:

```yaml
spec:
  sourceRef:
    kind: GitRepository
    name: flux-system
```

This must reference a GitRepository that has write access configured (deploy key with write permission or a token with push access).

## Update Path and Strategy

The `update` section tells the controller where to look for image policy markers and which strategy to use:

```yaml
spec:
  update:
    path: ./clusters/my-cluster
    strategy: Setters
```

The `path` limits the scope of changes to a specific directory. The `strategy` field currently only supports `Setters`, which uses marker comments in YAML files to identify fields to update.

## Verifying Git Commit Settings

After applying the configuration, verify that commits are created correctly:

```bash
# Check automation status
flux get image update image-updater

# View controller logs for commit details
kubectl -n flux-system logs deployment/image-automation-controller --tail=20

# Check the latest commit in your repository
git log -1 --show-signature
```

## Troubleshooting

**Commit author errors**: Both `name` and `email` are mandatory. Check that they are properly indented under `spec.git.commit.author`.

**Template rendering failures**: Invalid Go template syntax causes the controller to skip the commit. Check controller logs for template errors.

**Signing failures**: Ensure the GPG key secret exists in the correct namespace and contains the key in the `git.asc` field. Verify the key is not expired or revoked.

**Push failures**: Verify the GitRepository source has write access. Check that the target branch is not protected in a way that blocks the push.

**No commits created**: If no image policies have selected new tags, the controller has nothing to update. Verify your ImagePolicy resources are selecting tags correctly with `flux get image policy --all-namespaces`.

Getting the Git commit settings right ensures your automated image updates create clean, auditable, and properly attributed commits in your GitOps repository.
