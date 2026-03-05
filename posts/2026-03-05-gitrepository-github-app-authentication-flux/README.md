# How to Configure GitRepository with GitHub App Authentication in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Source Controller, GitRepository, GitHub App, Authentication

Description: Learn how to configure Flux CD GitRepository sources to authenticate with GitHub repositories using GitHub App installation tokens for fine-grained, auditable access.

---

## Introduction

GitHub App authentication provides several advantages over personal access tokens and SSH deploy keys for Flux CD. GitHub Apps offer fine-grained permissions scoped to specific repositories, higher API rate limits, auditable access logs, and tokens that are not tied to individual user accounts. This makes GitHub Apps the preferred authentication method for organizations running Flux CD at scale.

Flux CD supports GitHub App authentication by allowing you to store the App ID, installation ID, and private key in a Kubernetes Secret. The Source Controller uses these credentials to generate short-lived installation tokens automatically.

## Prerequisites

- A Kubernetes cluster with Flux CD v2.1.0 or later installed
- `kubectl` and the `flux` CLI installed locally
- A GitHub organization or personal account with permission to create GitHub Apps
- `openssl` or similar tool for handling the private key

## Step 1: Create a GitHub App

Navigate to your GitHub organization settings and create a new GitHub App.

1. Go to **Organization Settings > Developer settings > GitHub Apps > New GitHub App**
2. Set the following fields:
   - **GitHub App name**: Choose a descriptive name like `flux-cd-source-controller`
   - **Homepage URL**: Your organization URL or any valid URL
   - **Webhook**: Uncheck "Active" (Flux does not need webhooks from the App)
3. Under **Repository permissions**, set:
   - **Contents**: Read-only (this is all Flux needs to clone repositories)
4. Under **Where can this GitHub App be installed**, select "Only on this account"
5. Click **Create GitHub App**

After creation, note the **App ID** displayed on the App settings page.

## Step 2: Generate and Download the Private Key

On the GitHub App settings page, scroll down to the **Private keys** section and click **Generate a private key**. This downloads a `.pem` file to your computer.

```bash
# Verify the private key file was downloaded
ls -la *.pem
```

Keep this file secure. You will need it to create the Kubernetes Secret.

## Step 3: Install the GitHub App

The App must be installed on the repositories that Flux needs to access.

1. From the GitHub App settings page, click **Install App** in the left sidebar
2. Select your organization
3. Choose either **All repositories** or **Only select repositories** and pick the specific repositories Flux needs
4. Click **Install**

After installation, note the **Installation ID**. You can find it in the URL of the installation page. The URL will look like `https://github.com/organizations/my-org/settings/installations/12345678` where `12345678` is the installation ID.

## Step 4: Create the Kubernetes Secret

Create a Secret containing the GitHub App credentials. Flux expects three fields: `githubAppID`, `githubAppInstallationID`, and `githubAppPrivateKey`.

```bash
# Create the GitHub App authentication Secret
kubectl create secret generic my-app-github-app \
  --namespace=flux-system \
  --from-literal=githubAppID=123456 \
  --from-literal=githubAppInstallationID=12345678 \
  --from-file=githubAppPrivateKey=./my-github-app.2026-03-05.private-key.pem
```

Here is the equivalent declarative YAML manifest.

```yaml
# github-app-secret.yaml - GitHub App authentication Secret
apiVersion: v1
kind: Secret
metadata:
  name: my-app-github-app
  namespace: flux-system
type: Opaque
stringData:
  # The GitHub App ID (found on the App settings page)
  githubAppID: "123456"
  # The installation ID (found in the installation URL)
  githubAppInstallationID: "12345678"
  # The private key content (PEM format)
  githubAppPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    <YOUR_PRIVATE_KEY_CONTENT>
    -----END RSA PRIVATE KEY-----
```

## Step 5: Configure the GitRepository Resource

Create a GitRepository resource that references the GitHub App Secret. The URL must use the HTTPS format.

```yaml
# gitrepository-github-app.yaml - GitRepository with GitHub App authentication
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  # Must use HTTPS URL format for GitHub App auth
  url: https://github.com/my-org/my-app
  ref:
    branch: main
  # Reference the Secret containing GitHub App credentials
  secretRef:
    name: my-app-github-app
```

Apply the resources to your cluster.

```bash
# Apply the GitRepository manifest
kubectl apply -f gitrepository-github-app.yaml
```

## Step 6: Verify the Configuration

Check that the Source Controller can authenticate and fetch the repository.

```bash
# Verify the GitRepository reconciles successfully
flux get sources git my-app -n flux-system
```

You should see the resource in a ready state. If there are issues, check the controller logs.

```bash
# Check the Source Controller logs for GitHub App related messages
kubectl logs -n flux-system deployment/source-controller | tail -20
```

## Using GitHub App with GitHub Enterprise Server

If you are using GitHub Enterprise Server, you need to specify the API base URL by adding a `githubAppBaseURL` field to the Secret.

```yaml
# github-app-secret-ghe.yaml - GitHub App Secret for GitHub Enterprise Server
apiVersion: v1
kind: Secret
metadata:
  name: my-app-github-app-ghe
  namespace: flux-system
type: Opaque
stringData:
  githubAppID: "123456"
  githubAppInstallationID: "12345678"
  githubAppPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    <YOUR_PRIVATE_KEY_CONTENT>
    -----END RSA PRIVATE KEY-----
  # Specify the GitHub Enterprise Server API URL
  githubAppBaseURL: https://github.example.com/api/v3
```

The corresponding GitRepository uses the Enterprise Server URL.

```yaml
# gitrepository-ghe.yaml - GitRepository for GitHub Enterprise Server
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app-ghe
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.example.com/my-org/my-app
  ref:
    branch: main
  secretRef:
    name: my-app-github-app-ghe
```

## Authentication Flow

The following diagram shows how Flux authenticates using a GitHub App.

```mermaid
sequenceDiagram
    participant SC as Source Controller
    participant GH as GitHub API
    participant Repo as Git Repository
    SC->>SC: Read App ID, Installation ID, Private Key from Secret
    SC->>SC: Generate JWT from App ID and Private Key
    SC->>GH: Request installation token using JWT
    GH-->>SC: Return short-lived installation token
    SC->>Repo: Clone/fetch using installation token
    Repo-->>SC: Repository contents
    SC->>SC: Store artifact
```

## Advantages Over Other Authentication Methods

GitHub App authentication provides several benefits:

- **Not tied to a user**: Tokens are generated by the App, so they survive employee departures and do not consume a user seat.
- **Fine-grained permissions**: You can grant read-only access to specific repositories rather than broad organization access.
- **Higher rate limits**: GitHub Apps have a rate limit of 5,000 requests per hour per installation, compared to 5,000 per hour for personal access tokens.
- **Short-lived tokens**: Installation tokens expire after one hour, reducing the risk if a token is compromised. The Source Controller automatically generates new tokens as needed.
- **Audit trail**: All actions performed by the App are logged and visible in the organization audit log.

## Troubleshooting

If authentication fails, check the following.

```bash
# Look for authentication-related errors in the Source Controller
kubectl logs -n flux-system deployment/source-controller | grep -i "github\|app\|auth\|token"
```

Common issues include:

- **Invalid private key**: Ensure the private key in the Secret is the complete PEM file content, including the header and footer lines.
- **Wrong installation ID**: Verify the installation ID matches the installation for your organization, not the App ID.
- **Insufficient permissions**: Ensure the GitHub App has `Contents: Read-only` repository permission and is installed on the target repository.
- **Expired private key**: If you regenerated the private key on GitHub, the old key stored in the Secret is no longer valid. Update the Secret with the new key.

## Conclusion

GitHub App authentication is the most robust and enterprise-friendly way to connect Flux CD to GitHub repositories. It provides fine-grained permissions, automatic token rotation, and clear audit trails. While the initial setup requires a few more steps than personal access tokens, the long-term benefits in security and maintainability make it the recommended approach for production deployments.
