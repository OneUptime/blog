# How to Configure Image Automation with Branch Protection Rules in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, image-automation, branch-protection, github, gitops, kubernetes, security

Description: Learn how to configure Flux ImageUpdateAutomation to work with Git branch protection rules that require reviews, status checks, or signed commits.

---

## Introduction

Branch protection rules enforce quality and security standards on important branches like `main` or `production`. They can require pull request reviews, passing status checks, signed commits, and more. When Flux ImageUpdateAutomation tries to push directly to a protected branch, it will fail if these requirements are not met.

This guide covers strategies for making Flux image automation work with branch protection rules, from using separate branches with pull requests to configuring bypass permissions for bot accounts.

## Prerequisites

- A Kubernetes cluster with Flux v2 installed
- The image-reflector-controller and image-automation-controller deployed
- A GitHub, GitLab, or Bitbucket repository with branch protection configured
- An ImageUpdateAutomation resource configured

## Common Branch Protection Rules

Branch protection typically includes one or more of these requirements:

- Require pull request reviews before merging
- Require status checks to pass before merging
- Require signed commits
- Require linear history (no merge commits)
- Restrict who can push to the branch
- Do not allow bypassing the above settings

## Strategy 1: Push to a Separate Branch (Recommended)

The most compatible approach is to push image updates to a separate branch and create a pull request:

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
      messageTemplate: |
        chore: automated image update

        {{ range .Changed.Changes -}}
        - {{ .OldValue }} -> {{ .NewValue }}
        {{ end -}}
    push:
      branch: flux/image-updates
  update:
    path: ./clusters/production
    strategy: Setters
```

Then use a GitHub Actions workflow to create a PR:

```yaml
name: Create Image Update PR
on:
  push:
    branches:
      - flux/image-updates

permissions:
  contents: read
  pull-requests: write

jobs:
  create-pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: flux/image-updates
          fetch-depth: 0

      - name: Create Pull Request
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          EXISTING_PR=$(gh pr list --head flux/image-updates --json number --jq '.[0].number')
          if [ -z "$EXISTING_PR" ]; then
            gh pr create \
              --title "chore: automated image updates" \
              --body "Automated image tag updates from Flux" \
              --head flux/image-updates \
              --base main
          fi
```

## Strategy 2: Allow Bot Account to Bypass Protection

On GitHub, you can add a machine user or GitHub App to the list of actors that can bypass branch protection:

1. Create a GitHub machine user or GitHub App
2. Give it write access to the repository
3. In branch protection settings, add the user to "Allow specified actors to bypass required pull requests"
4. Use that account's SSH key or token for Flux

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-bot-credentials
  namespace: flux-system
type: Opaque
stringData:
  identity: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    <bot-account-ssh-key>
    -----END OPENSSH PRIVATE KEY-----
  known_hosts: |
    github.com ssh-rsa AAAA...
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  interval: 5m
  url: ssh://git@github.com/myorg/my-repo.git
  ref:
    branch: main
  secretRef:
    name: git-bot-credentials
```

Then the automation can push directly to the protected branch:

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
        name: flux-bot
        email: flux-bot@users.noreply.github.com
      messageTemplate: "chore: automated image update"
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

## Strategy 3: Signed Commits for Protection Rules

If branch protection requires signed commits, configure GPG signing:

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
      signingKey:
        secretRef:
          name: gpg-signing-key
      messageTemplate: "chore: automated image update"
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

Add the public key to the bot's GitHub account so commits show as "Verified."

## Strategy 4: GitHub App Token for PR Auto-Merge

Using a GitHub App provides fine-grained permissions and can auto-merge PRs:

```yaml
name: Auto-Merge Image Updates
on:
  pull_request:
    types: [opened, synchronize]
    branches: [main]

jobs:
  auto-merge:
    if: github.actor == 'flux-bot[bot]'
    runs-on: ubuntu-latest
    steps:
      - name: Enable auto-merge
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh pr merge ${{ github.event.pull_request.number }} \
            --auto --squash
```

## Handling Required Status Checks

If branch protection requires status checks, ensure the PR branch triggers them:

```yaml
name: CI Checks
on:
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate manifests
        run: |
          kubectl apply --dry-run=client -f clusters/production/ -R
      - name: Run policy checks
        run: |
          kustomize build clusters/production | conftest test -
```

These checks will run on the Flux image update PR, satisfying the branch protection requirement.

## Troubleshooting

If automation fails to push, check the controller logs:

```bash
kubectl -n flux-system logs deployment/image-automation-controller | grep -i error
```

Common errors include:

- `pre-receive hook declined` - Branch protection is blocking the push
- `required status check` - Status checks have not passed
- `review required` - Pull request review is needed

## Conclusion

Branch protection rules and Flux image automation can coexist through several strategies. The recommended approach is pushing to a separate branch and creating pull requests, which works with all protection rules. For teams that need faster deployment, allowing a dedicated bot account to bypass protection provides direct commit capability while maintaining security through credential management. Choose the strategy that best matches your organization's security requirements and deployment speed needs.
