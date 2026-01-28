# How to Use Tekton with ArgoCD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tekton, ArgoCD, GitOps, CI/CD, Kubernetes

Description: Learn how to connect Tekton CI pipelines with ArgoCD GitOps deployments for automated delivery.

---

Tekton handles CI and ArgoCD handles GitOps delivery. Together, they provide a clean CI/CD workflow: Tekton builds and updates Git, ArgoCD deploys changes.

## Workflow Overview

1. Tekton builds and tests
2. Tekton updates a Git repo with new image tags
3. ArgoCD detects Git changes and syncs

## Step 1: Build and Push Image in Tekton

Use a task to build and push a container image.

## Step 2: Update GitOps Repo

Add a task to update the image tag in a GitOps repo and push the change.

## Step 3: ArgoCD Sync

ArgoCD watches the GitOps repo and applies updates automatically.

## Best Practices

- Use a separate GitOps repo for deployment manifests
- Use pull requests for production changes
- Use ArgoCD sync waves if multiple apps depend on each other

## Conclusion

Tekton plus ArgoCD gives you a clean separation of CI and CD. Build in Tekton, deploy via GitOps, and keep production in sync with Git.
