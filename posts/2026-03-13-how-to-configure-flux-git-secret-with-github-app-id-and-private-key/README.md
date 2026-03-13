# How to Configure Flux Git Secret with GitHub App ID and Private Key

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Source Controller, Authentication, Secrets, GitHub, GitHub App, Git

Description: Learn how to authenticate Flux CD with GitHub repositories using a GitHub App installation for fine-grained, organization-level access control.

---

## Introduction

GitHub Apps provide a more powerful and secure alternative to personal access tokens or deploy keys. They offer fine-grained permissions, higher API rate limits, and organization-level management. Flux CD supports authenticating with Git repositories using a GitHub App's installation ID and private key.

This guide explains how to create a GitHub App, install it on your repositories, and configure Flux to use it for authentication.

## Prerequisites

- A Kubernetes cluster (v1.20 or later)
- Flux CD installed on your cluster (v2.x)
- `kubectl` configured to communicate with your cluster
- GitHub organization or personal account with admin access
- Permission to create GitHub Apps

## Step 1: Create a GitHub App

1. Navigate to your GitHub organization settings (or personal settings).
2. Go to Developer settings > GitHub Apps > New GitHub App.
3. Fill in the required details:
   - **GitHub App name**: A unique name (e.g., `flux-cd-source-controller`)
   - **Homepage URL**: Your organization's URL
   - **Webhook**: Uncheck "Active" (Flux does not need webhooks from the App)
4. Set the following repository permissions:
   - **Contents**: Read-only (required to clone repositories)
   - **Metadata**: Read-only (automatically selected)
5. Under "Where can this GitHub App be installed?", select "Only on this account".
6. Click "Create GitHub App".

## Step 2: Generate a Private Key

After creating the App:

1. On the GitHub App settings page, scroll down to "Private keys".
2. Click "Generate a private key".
3. A `.pem` file will be downloaded to your machine.

Note the **App ID** displayed on the App's settings page. You will need it later.

## Step 3: Install the GitHub App

1. On the GitHub App settings page, click "Install App" in the sidebar.
2. Select the organization or account to install it on.
3. Choose "Only select repositories" and pick the repositories Flux needs access to.
4. Click "Install".

After installation, note the **Installation ID** from the URL. When you visit the installation page, the URL will look like `https://github.com/settings/installations/12345678`. The number at the end is the Installation ID.

## Step 4: Create the Kubernetes Secret

Create a Secret containing the GitHub App ID, Installation ID, and private key:

```bash
kubectl create secret generic github-app-credentials \
  --namespace=flux-system \
  --from-literal=githubAppID=123456 \
  --from-literal=githubAppInstallationID=12345678 \
  --from-file=githubAppPrivateKey=./your-app-name.2026-03-13.private-key.pem
```

As a YAML manifest:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-app-credentials
  namespace: flux-system
type: Opaque
stringData:
  githubAppID: "123456"
  githubAppInstallationID: "12345678"
  githubAppPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    <your-github-app-private-key-content>
    -----END RSA PRIVATE KEY-----
```

Apply the manifest:

```bash
kubectl apply -f github-app-secret.yaml
```

## Step 5: Configure the GitRepository Resource

Reference the Secret in your `GitRepository` resource. Use the HTTPS URL format:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/your-repo.git
  ref:
    branch: main
  secretRef:
    name: github-app-credentials
```

Apply the resource:

```bash
kubectl apply -f gitrepository.yaml
```

When Flux detects the `githubAppID`, `githubAppInstallationID`, and `githubAppPrivateKey` fields, it automatically generates a short-lived installation access token and uses it for HTTPS authentication.

## Step 6: Multiple Repositories

One advantage of GitHub Apps is that a single App installation can access multiple repositories. You can reuse the same Secret across multiple `GitRepository` resources:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-one
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/app-one.git
  ref:
    branch: main
  secretRef:
    name: github-app-credentials
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-two
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/app-two.git
  ref:
    branch: main
  secretRef:
    name: github-app-credentials
```

## Verification

Check the status of your GitRepository resources:

```bash
flux get sources git --all-namespaces
```

Detailed status:

```bash
kubectl describe gitrepository my-app -n flux-system
```

Look for successful reconciliation messages in the events.

## Troubleshooting

### 401 Unauthorized - Bad Credentials

1. Verify the App ID is correct:

```bash
kubectl get secret github-app-credentials -n flux-system -o jsonpath='{.data.githubAppID}' | base64 -d
```

2. Check the Installation ID matches the installed App.
3. Ensure the private key is the correct PEM file for this App.

### 403 Forbidden - Resource Not Accessible

1. Verify the GitHub App is installed on the repository you are trying to access.
2. Check that the App has "Contents: Read" permission.
3. If you selected "Only select repositories" during installation, make sure the target repository is included.

### Private Key Format Issues

The private key must be in PEM format. If you encounter parsing errors:

1. Verify the key starts with `-----BEGIN RSA PRIVATE KEY-----`.
2. Check for no extra whitespace or truncation.
3. Ensure the full key content is included, including the header and footer lines.

```bash
kubectl get secret github-app-credentials -n flux-system -o jsonpath='{.data.githubAppPrivateKey}' | base64 -d | head -1
```

### Rate Limiting

GitHub Apps have higher rate limits than personal access tokens (5,000 requests per hour per installation). If you still hit limits with many repositories, consider increasing the `interval` on your `GitRepository` resources.

## Summary

GitHub App authentication is the recommended method for organizations using Flux with GitHub. It provides fine-grained permissions, organization-level management, automatic token generation, and higher rate limits compared to personal access tokens or deploy keys. The setup requires creating a GitHub App, installing it on your repositories, and providing the App credentials to Flux through a Kubernetes Secret.
