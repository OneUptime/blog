# How to Use Timoni flux-git-sync Module for Git Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, kubernetes, gitops, timoni, git-sync, git

Description: Learn how to use the Timoni flux-git-sync module to configure Git-based deployments with Flux using a simple values-driven approach.

---

## Introduction

Git repositories are the foundation of GitOps workflows with Flux. The Timoni flux-git-sync module provides a streamlined way to configure Flux for Git-based deployments, generating the required GitRepository and Kustomization resources from a simple values file. Instead of writing and maintaining raw Flux manifests, you define your Git sync configuration in a values file, and the module produces validated, type-checked Kubernetes resources.

This guide demonstrates how to use the flux-git-sync module for deploying from Git repositories, covering HTTPS and SSH authentication, branch and tag tracking, and multi-path deployments.

## Prerequisites

- A Kubernetes cluster with Flux installed
- Timoni CLI installed (v0.20 or later)
- A Git repository containing Kubernetes manifests
- `kubectl` configured for your cluster

## Step 1: Explore the Module

Inspect the module's values schema:

```bash
timoni mod values oci://ghcr.io/stefanprodan/modules/flux-git-sync
```

Pull the module locally for deeper inspection:

```bash
timoni mod pull oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --version latest \
  --output ./flux-git-sync-module
```

## Step 2: Basic Git Sync with HTTPS

Create a values file for a public repository:

```yaml
# git-sync-values.yaml
values:
  git:
    url: "https://github.com/your-org/fleet-infra"
    ref:
      branch: "main"
    path: "./clusters/production"
    interval: "5m"
  sync:
    prune: true
    wait: true
    interval: "5m"
    targetNamespace: ""
```

Preview the generated resources:

```bash
timoni build fleet-sync oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --values git-sync-values.yaml \
  --namespace flux-system
```

Apply to the cluster:

```bash
timoni apply fleet-sync oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --values git-sync-values.yaml \
  --namespace flux-system
```

## Step 3: Git Sync with SSH Authentication

For private repositories using SSH:

```yaml
# git-sync-ssh.yaml
values:
  git:
    url: "ssh://git@github.com/your-org/fleet-infra.git"
    ref:
      branch: "main"
    path: "./clusters/production"
    interval: "5m"
    secretRef:
      name: "flux-ssh-key"
  sync:
    prune: true
    wait: true
    interval: "5m"
```

Create the SSH key secret before applying:

```bash
flux create secret git flux-ssh-key \
  --url=ssh://git@github.com/your-org/fleet-infra.git \
  --private-key-file=./deploy-key
```

Then apply the module:

```bash
timoni apply fleet-sync oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --values git-sync-ssh.yaml \
  --namespace flux-system
```

## Step 4: HTTPS Authentication with Token

For private repositories using HTTPS with a personal access token:

```yaml
# git-sync-https.yaml
values:
  git:
    url: "https://github.com/your-org/fleet-infra.git"
    ref:
      branch: "main"
    path: "./clusters/production"
    interval: "5m"
    secretRef:
      name: "git-credentials"
  sync:
    prune: true
    wait: true
```

Create the credentials secret:

```bash
kubectl create secret generic git-credentials \
  -n flux-system \
  --from-literal=username=git \
  --from-literal=password=ghp_your_token_here
```

## Step 5: Track Tags and Semver Ranges

Instead of tracking a branch, track a specific tag or semver range:

```yaml
# git-sync-tag.yaml
values:
  git:
    url: "https://github.com/your-org/fleet-infra.git"
    ref:
      tag: "v1.5.0"
    path: "./releases/v1"
    interval: "30m"
  sync:
    prune: true
    wait: true
    timeout: "10m"
```

For semver tracking:

```yaml
# git-sync-semver.yaml
values:
  git:
    url: "https://github.com/your-org/fleet-infra.git"
    ref:
      semver: ">=1.0.0 <2.0.0"
    path: "./releases"
    interval: "10m"
  sync:
    prune: true
```

## Step 6: Multi-Path Deployments

Deploy multiple paths from the same repository by creating multiple instances:

```bash
# Infrastructure components
timoni apply infra-sync oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --values infra-values.yaml \
  --namespace flux-system

# Application deployments
timoni apply apps-sync oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --values apps-values.yaml \
  --namespace flux-system
```

Infrastructure values:

```yaml
# infra-values.yaml
values:
  git:
    url: "https://github.com/your-org/fleet-infra.git"
    ref:
      branch: "main"
    path: "./infrastructure"
    interval: "15m"
  sync:
    prune: true
    wait: true
    timeout: "10m"
```

Application values with dependency on infrastructure:

```yaml
# apps-values.yaml
values:
  git:
    url: "https://github.com/your-org/fleet-infra.git"
    ref:
      branch: "main"
    path: "./apps/production"
    interval: "5m"
  sync:
    prune: true
    wait: true
    dependsOn:
      - name: "infra-sync"
```

## Step 7: Configure Post-Build Substitution

Add variable substitution to your Git sync:

```yaml
# git-sync-substitution.yaml
values:
  git:
    url: "https://github.com/your-org/fleet-infra.git"
    ref:
      branch: "main"
    path: "./clusters/production"
    interval: "5m"
  sync:
    prune: true
    wait: true
    postBuild:
      substitute:
        CLUSTER_NAME: "prod-us-east-1"
        ENVIRONMENT: "production"
        REGION: "us-east-1"
      substituteFrom:
        - kind: ConfigMap
          name: cluster-settings
        - kind: Secret
          name: cluster-secrets
```

## Step 8: Manage Instances

List all Git sync instances:

```bash
timoni list -n flux-system
```

Check a specific instance:

```bash
timoni status fleet-sync -n flux-system
timoni inspect resources fleet-sync -n flux-system
```

Update an instance:

```bash
timoni apply fleet-sync oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --values updated-values.yaml \
  --namespace flux-system
```

Delete an instance:

```bash
timoni delete fleet-sync -n flux-system
```

## Conclusion

The Timoni flux-git-sync module simplifies Git-based Flux deployments by providing a values-driven configuration approach with CUE validation. Instead of manually creating and maintaining GitRepository and Kustomization resources, you define your deployment intent in a simple values file and let the module handle the resource generation. This approach reduces configuration errors, enables consistent patterns across multiple deployments, and makes it easy to manage Git sync configurations across environments.
