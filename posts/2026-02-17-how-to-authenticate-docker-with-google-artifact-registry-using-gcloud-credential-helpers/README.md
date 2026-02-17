# How to Authenticate Docker with Google Artifact Registry Using gcloud Credential Helpers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Artifact Registry, Docker, Authentication, gcloud, DevOps

Description: Learn the different methods to authenticate Docker with Google Artifact Registry, including gcloud credential helpers, service account keys, and access tokens.

---

Before you can push or pull images from Google Artifact Registry, Docker needs to authenticate with GCP. The gcloud credential helper is the simplest and most secure way to handle this. It automatically generates short-lived access tokens so you never have to manage static credentials for Docker operations.

Let me cover the different authentication methods, when to use each one, and how to troubleshoot common issues.

## Method 1: gcloud Credential Helper (Recommended)

The gcloud credential helper plugs into Docker's authentication system. When Docker needs to access Artifact Registry, it calls gcloud to get a fresh access token.

```bash
# Configure Docker to use gcloud as the credential helper for Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev
```

This command modifies your `~/.docker/config.json` file to add a credential helper entry. After running it, your config will look something like this:

```json
{
  "credHelpers": {
    "us-central1-docker.pkg.dev": "gcloud"
  }
}
```

If you use repositories in multiple regions, configure them all at once:

```bash
# Configure Docker for multiple Artifact Registry locations
gcloud auth configure-docker \
  us-central1-docker.pkg.dev,us-east1-docker.pkg.dev,europe-west1-docker.pkg.dev
```

Once configured, Docker commands work transparently:

```bash
# These commands now authenticate automatically
docker push us-central1-docker.pkg.dev/my-project/my-repo/my-app:v1.0
docker pull us-central1-docker.pkg.dev/my-project/my-repo/my-app:v1.0
```

### How It Works Under the Hood

When Docker needs credentials for `us-central1-docker.pkg.dev`, it runs the `docker-credential-gcloud` binary. This binary calls the gcloud CLI, which returns an access token from your current gcloud authentication session. The token is short-lived (typically 1 hour) and automatically refreshes.

This means you need to be authenticated with gcloud first:

```bash
# Make sure you are logged in to gcloud
gcloud auth login

# Verify your identity
gcloud auth list
```

## Method 2: Standalone Credential Helper

If you do not want to depend on the full gcloud CLI, you can install the standalone credential helper:

```bash
# Install the standalone Docker credential helper for GCR/Artifact Registry
# On Linux
VERSION=2.1.8
curl -fsSL "https://github.com/GoogleCloudPlatform/docker-credential-gcr/releases/download/v${VERSION}/docker-credential-gcr_linux_amd64-${VERSION}.tar.gz" \
  | tar xz docker-credential-gcr

sudo mv docker-credential-gcr /usr/local/bin/

# Configure it
docker-credential-gcr configure-docker --registries=us-central1-docker.pkg.dev
```

This is useful in environments where installing the full gcloud SDK is not practical.

## Method 3: Access Token Authentication

For CI/CD systems or scripts, you can use a short-lived access token directly:

```bash
# Get an access token and use it with docker login
gcloud auth print-access-token | docker login \
  -u oauth2accesstoken \
  --password-stdin \
  https://us-central1-docker.pkg.dev
```

The username is always `oauth2accesstoken` - that is not a placeholder, it is the literal string Docker expects. The password is the access token.

Access tokens expire after about 1 hour, so this method is best for short-lived operations. For long-running processes, use the credential helper instead.

## Method 4: Service Account Key File

For automated systems that cannot use gcloud interactively, you can authenticate using a service account key file:

```bash
# Create a service account for Docker operations
gcloud iam service-accounts create docker-pusher \
  --display-name="Docker Image Pusher" \
  --project=my-project

# Grant it write access to the repository
gcloud artifacts repositories add-iam-policy-binding my-repo \
  --location=us-central1 \
  --member="serviceAccount:docker-pusher@my-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer" \
  --project=my-project

# Create and download a key file
gcloud iam service-accounts keys create key.json \
  --iam-account=docker-pusher@my-project.iam.gserviceaccount.com

# Authenticate Docker using the key file
cat key.json | docker login \
  -u _json_key \
  --password-stdin \
  https://us-central1-docker.pkg.dev
```

The username `_json_key` tells Docker that the password is a JSON service account key. This method works but has a downside: you are managing a static credential that needs to be rotated and secured.

## Method 5: Workload Identity Federation (Best for CI/CD)

If you are running builds in GitHub Actions, GitLab CI, or another external CI system, Workload Identity Federation lets you authenticate without storing any GCP credentials:

```yaml
# .github/workflows/build.yml - GitHub Actions with Workload Identity
name: Build and Push
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # Required for WIF

    steps:
      - uses: actions/checkout@v4

      # Authenticate to GCP using Workload Identity Federation
      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: 'projects/123456/locations/global/workloadIdentityPools/github/providers/my-repo'
          service_account: 'docker-pusher@my-project.iam.gserviceaccount.com'

      # Configure Docker credentials
      - uses: google-github-actions/setup-gcloud@v2
      - run: gcloud auth configure-docker us-central1-docker.pkg.dev

      # Build and push
      - run: |
          docker build -t us-central1-docker.pkg.dev/my-project/my-repo/my-app:${{ github.sha }} .
          docker push us-central1-docker.pkg.dev/my-project/my-repo/my-app:${{ github.sha }}
```

## Authentication in GKE

GKE clusters pull images from Artifact Registry using the node's service account. If both the cluster and repository are in the same project, this works automatically.

For cross-project access, grant the GKE node service account read permissions:

```bash
# Get the GKE node service account
NODE_SA=$(gcloud container clusters describe my-cluster \
  --zone=us-central1-a \
  --format='value(nodeConfig.serviceAccount)')

# Grant it read access to the Artifact Registry repository
gcloud artifacts repositories add-iam-policy-binding my-repo \
  --location=us-central1 \
  --member="serviceAccount:${NODE_SA}" \
  --role="roles/artifactregistry.reader" \
  --project=my-image-project
```

## Troubleshooting Authentication Issues

### "Permission denied" Errors

The most common error. Check that:

```bash
# Verify your current identity
gcloud auth list

# Check if you have access to the repository
gcloud artifacts repositories list --location=us-central1 --project=my-project

# Verify IAM permissions on the repository
gcloud artifacts repositories get-iam-policy my-repo \
  --location=us-central1 \
  --project=my-project
```

### "Credential helper not found" Errors

This usually means gcloud is not in your PATH:

```bash
# Find where gcloud is installed
which gcloud

# Verify the credential helper exists
which docker-credential-gcloud

# If it is missing, it should be in the gcloud SDK bin directory
ls $(gcloud info --format='value(installation.sdk_root)')/bin/docker-credential-gcloud
```

### Docker Config File Conflicts

If you have manually added credentials that conflict with the credential helper, Docker might get confused:

```bash
# Check your Docker config for conflicting entries
cat ~/.docker/config.json
```

Make sure there are no `auths` entries for the same registry that has a `credHelpers` entry. The credential helper should take priority, but sometimes old entries cause issues.

### Token Expiration Issues

If you get authentication errors after some time, your gcloud session may have expired:

```bash
# Refresh your gcloud credentials
gcloud auth login

# Or for service accounts
gcloud auth activate-service-account --key-file=key.json
```

## Which Method Should You Use?

Here is a quick decision guide:

- **Local development**: Use the gcloud credential helper (Method 1). It is the simplest and most secure.
- **Cloud Build**: No configuration needed - Cloud Build authenticates automatically.
- **GKE**: Automatic for same-project, IAM binding for cross-project.
- **External CI/CD**: Use Workload Identity Federation if your provider supports it, access tokens otherwise.
- **Scripts and automation**: Access tokens for short-lived scripts, service account keys for long-running processes (but prefer WIF when possible).

## Wrapping Up

The gcloud credential helper is the right choice for most situations. It handles token generation and refresh automatically, does not require storing any static credentials, and works seamlessly with Docker commands. For CI/CD systems, Workload Identity Federation is the modern approach that avoids credential management entirely. Whichever method you choose, avoid storing service account key files whenever possible - they are the least secure option and the hardest to manage.
