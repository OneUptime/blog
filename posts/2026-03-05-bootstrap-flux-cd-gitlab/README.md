# How to Bootstrap Flux CD with GitLab

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, GitLab, CI/CD, Continuous Delivery

Description: A detailed guide to bootstrapping Flux CD with GitLab, including support for GitLab.com, self-managed instances, groups, and subgroups.

---

GitLab is a popular choice for teams that want an all-in-one DevOps platform, and Flux CD integrates with it natively through the `flux bootstrap gitlab` command. This guide walks you through bootstrapping Flux CD with GitLab, covering both GitLab.com (SaaS) and self-managed GitLab instances. You will also learn how to work with GitLab groups and subgroups, which are common in enterprise environments.

## Prerequisites

- A running Kubernetes cluster (v1.26 or later)
- `kubectl` configured to access your cluster
- Flux CLI installed (v2.0 or later)
- A GitLab account with a personal access token

## Step 1: Create a GitLab Personal Access Token

Navigate to GitLab > User Settings > Access Tokens and create a token with the following scopes:

- `api` - Full API access
- `read_repository` - Read access to repositories
- `write_repository` - Write access to repositories

```bash
# Export the GitLab token and username
export GITLAB_TOKEN=<your-gitlab-personal-access-token>
export GITLAB_USER=<your-gitlab-username>
```

## Step 2: Run Flux Pre-flight Checks

Verify your cluster is compatible with Flux CD before bootstrapping.

```bash
# Run pre-flight checks
flux check --pre
```

## Step 3: Bootstrap with GitLab.com

For GitLab.com (the SaaS version), the bootstrap command is straightforward.

```bash
# Bootstrap Flux CD with GitLab.com
flux bootstrap gitlab \
  --owner=$GITLAB_USER \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/production \
  --personal
```

This command creates a project called `fleet-infra` under your GitLab user namespace, pushes the Flux component manifests, and installs the controllers on your cluster.

## Step 4: Bootstrap with a Self-Managed GitLab Instance

If your organization runs a self-managed GitLab instance, use the `--hostname` flag to point Flux to your GitLab server.

```bash
# Bootstrap Flux CD with a self-managed GitLab instance
flux bootstrap gitlab \
  --hostname=gitlab.example.com \
  --owner=$GITLAB_USER \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/production \
  --personal \
  --token-auth
```

The `--token-auth` flag tells Flux to use the personal access token for Git operations over HTTPS instead of using SSH deploy keys. This is often necessary for self-managed instances with custom certificate configurations.

For instances with self-signed certificates, you need to provide the CA certificate:

```bash
# Bootstrap with a custom CA certificate
flux bootstrap gitlab \
  --hostname=gitlab.example.com \
  --owner=$GITLAB_USER \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/production \
  --personal \
  --ca-file=./gitlab-ca.crt
```

## Step 5: Bootstrap with GitLab Groups and Subgroups

GitLab organizes projects within groups and subgroups. Flux supports this hierarchy through the `--owner` flag.

```bash
# Bootstrap with a GitLab group
flux bootstrap gitlab \
  --owner=my-organization \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/production

# Bootstrap with a nested subgroup
flux bootstrap gitlab \
  --owner=my-organization/platform-team/infrastructure \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/production
```

When using groups, omit the `--personal` flag. The token must have permission to create projects in the specified group.

## Step 6: Configure Read-Write Deploy Keys

By default, Flux creates an SSH deploy key for accessing the repository. You can verify and manage these keys.

```bash
# View the deploy key secret
kubectl get secret flux-system -n flux-system -o yaml

# If you need to rotate the deploy key
flux create secret git flux-system \
  --url=ssh://git@gitlab.com/<owner>/fleet-infra.git \
  --namespace=flux-system
```

The deploy key is automatically added to the GitLab project with read-write access during bootstrapping.

## Step 7: Set Up a Multi-Cluster Repository Structure

Organize your repository to manage multiple clusters and environments.

```yaml
# clusters/staging/infrastructure.yaml
# Kustomization for shared infrastructure components
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m0s
  path: ./infrastructure/staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
```

```yaml
# clusters/staging/apps.yaml
# Kustomization for staging applications, depends on infrastructure
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m0s
  path: ./apps/staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: infrastructure
  wait: true
```

The `dependsOn` field ensures infrastructure components are deployed before applications.

## Step 8: Configure GitLab CI Integration

You can trigger Flux reconciliation from GitLab CI pipelines for faster feedback loops.

```yaml
# .gitlab-ci.yml
# Trigger Flux reconciliation after CI pipeline succeeds
stages:
  - deploy

flux-reconcile:
  stage: deploy
  image: ghcr.io/fluxcd/flux-cli:v2.2.0
  script:
    - flux reconcile source git flux-system --namespace=flux-system
    - flux reconcile kustomization flux-system --namespace=flux-system
  only:
    - main
  tags:
    - kubernetes
```

## Step 9: Verify the Installation

Run a comprehensive check of your Flux installation.

```bash
# Full system health check
flux check

# View all sources
flux get sources git

# View all kustomizations
flux get kustomizations

# Check controller pods
kubectl get pods -n flux-system

# View recent Flux events
flux events
```

## Step 10: Set Up Notifications to GitLab

Configure Flux to update commit statuses in GitLab so your team can see deployment status.

```yaml
# clusters/production/notifications/gitlab-provider.yaml
# Provider for GitLab commit status updates
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: gitlab-status
  namespace: flux-system
spec:
  type: gitlab
  address: https://gitlab.com/<owner>/fleet-infra
  secretRef:
    name: gitlab-token
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: gitlab-status
  namespace: flux-system
spec:
  providerRef:
    name: gitlab-status
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

Create the corresponding secret:

```bash
# Create the GitLab token secret for notifications
kubectl create secret generic gitlab-token \
  --from-literal=token=$GITLAB_TOKEN \
  -n flux-system
```

## Troubleshooting

Common issues when bootstrapping with GitLab:

```bash
# Check if the deploy key was added to the project
# Navigate to Project > Settings > Repository > Deploy Keys in GitLab UI

# For SSH connectivity issues, test the connection
ssh -T git@gitlab.com

# For self-managed instances with certificate issues
flux bootstrap gitlab \
  --hostname=gitlab.example.com \
  --owner=$GITLAB_USER \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/production \
  --personal \
  --token-auth \
  --ca-file=/path/to/ca.crt

# Check source-controller logs for Git errors
kubectl logs -n flux-system deploy/source-controller | grep -i error

# Force reconciliation
flux reconcile source git flux-system
```

## Summary

Flux CD's GitLab integration supports the full range of GitLab features, including groups, subgroups, self-managed instances, and deploy keys. The `flux bootstrap gitlab` command handles repository creation, deploy key configuration, and Flux controller installation in a single step. By combining GitLab's built-in CI/CD pipelines with Flux's continuous delivery capabilities, you get a complete DevOps workflow. The bootstrap process is idempotent, so you can safely re-run it to update components or recover from configuration drift.
