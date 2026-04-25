# How to Add Google Artifact Registry to Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Google Cloud, Artifact Registry, Registry, DevOps

Description: Learn how to configure Google Artifact Registry (GAR) as a container registry in Portainer for deploying images from Google Cloud.

## Introduction

Google Artifact Registry (GAR) is Google Cloud's universal package and container registry, replacing the older Google Container Registry (GCR). Portainer can pull images from GAR using a service account key with appropriate IAM permissions. This guide covers the setup process.

## Prerequisites

- Portainer CE or BE installed
- A Google Cloud project with Artifact Registry enabled
- A container repository in Artifact Registry
- `gcloud` CLI installed (for setup steps)

## Google Artifact Registry URL Format

```text
{location}-docker.pkg.dev/{project-id}/{repository-name}/{image-name}:{tag}

# Examples:

us-central1-docker.pkg.dev/myproject/myrepo/myapp:latest
europe-west1-docker.pkg.dev/myproject/api-images/api:v2.0
```

## Step 1: Enable Artifact Registry API

```bash
# Get the current project ID
PROJECT_ID=$(gcloud config get-value project)

# Enable the API if not already enabled
gcloud services enable artifactregistry.googleapis.com

# Verify
gcloud services list --enabled --filter="name:artifactregistry.googleapis.com"
```

## Step 2: Create an Artifact Registry Repository

```bash
# Create a Docker repository
gcloud artifacts repositories create myrepo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Production container images"

# List repositories
gcloud artifacts repositories list
```

## Step 3: Create a Service Account for Portainer

```bash
# Create dedicated service account
gcloud iam service-accounts create portainer-reader \
  --display-name="Portainer Registry Reader" \
  --description="Used by Portainer to pull images from Artifact Registry"

# Get the service account email
SA_EMAIL="portainer-reader@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Service Account: $SA_EMAIL"
```

## Step 4: Grant Artifact Registry Reader Permission

```bash
# Option A: Grant read access to a specific repository
gcloud artifacts repositories add-iam-policy-binding myrepo \
  --location=us-central1 \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/artifactregistry.reader"

# Option B: Grant read access to all repositories in the project
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/artifactregistry.reader"
```

## Step 5: Create and Download a Service Account Key

```bash
# Create key file
gcloud iam service-accounts keys create portainer-key.json \
  --iam-account=$SA_EMAIL

# View the key structure (you'll need the content)
cat portainer-key.json
```

The key file looks like:

```json
{
  "type": "service_account",
  "project_id": "myproject",
  "private_key_id": "xxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "portainer-reader@myproject.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

## Step 6: Add GAR in Portainer

1. Go to **Registries** in Portainer
2. Click **+ Add registry**
3. Select **Custom registry**
4. Enable **Authentication** and configure:

```text
Name:      Google Artifact Registry
URL:       us-central1-docker.pkg.dev
Authentication: Enabled
Username:  _json_key
Password:  {paste entire contents of portainer-key.json as a single line}
```

**Important:** The username is literally `_json_key` - this is the special username Docker uses for GCP service account key authentication.

For the password, paste the entire JSON key file content. In Portainer, ensure it is entered as a single string (no line breaks when pasting).

5. Click **Add registry**

## Step 7: Alternatively, Use Access Token Authentication

For temporary access (testing), use a short-lived access token:

```bash
# Generate an access token (valid for 1 hour)
gcloud auth print-access-token

# Use in Docker
gcloud auth print-access-token | docker login \
  --username oauth2accesstoken \
  --password-stdin https://us-central1-docker.pkg.dev
```

For Portainer, this requires manual refresh every hour - use the service account key method for production.

## Step 8: Push Images to GAR

```bash
# Configure Docker to authenticate with GAR
gcloud auth configure-docker us-central1-docker.pkg.dev

# Tag image
docker tag myapp:latest \
  us-central1-docker.pkg.dev/myproject/myrepo/myapp:latest

# Push
docker push us-central1-docker.pkg.dev/myproject/myrepo/myapp:latest
```

## Step 9: Use GAR Images in Portainer Stacks

```yaml
version: "3.8"

services:
  app:
    image: us-central1-docker.pkg.dev/myproject/myrepo/myapp:latest
    # Portainer uses the stored GAR credentials for this environment

  api:
    image: us-central1-docker.pkg.dev/myproject/myrepo/api:v2.0
    ports:
      - "3000:3000"
```

## Step 10: Rotate Service Account Keys

Service account keys should be rotated regularly:

```bash
# List existing keys
gcloud iam service-accounts keys list --iam-account=$SA_EMAIL

# Create new key
gcloud iam service-accounts keys create new-portainer-key.json \
  --iam-account=$SA_EMAIL

# Update Portainer registry credentials with new key
# Then delete old key:
gcloud iam service-accounts keys delete $OLD_KEY_ID \
  --iam-account=$SA_EMAIL
```

## Troubleshooting

### Permission Denied

```text
Error: denied: Permission "artifactregistry.repositories.downloadArtifacts" denied
```

Grant the service account `roles/artifactregistry.reader` role.

### Invalid Credentials

```text
Error: unauthorized: failed to verify authentication
```

Verify the JSON key is pasted correctly and the username is exactly `_json_key`.

### Repository Not Found

Ensure the location prefix matches your repository location:

```text
us-central1-docker.pkg.dev  ← Correct for us-central1
```

## Conclusion

Integrating Google Artifact Registry with Portainer requires creating a dedicated service account with read-only Artifact Registry access, generating a service account key, and configuring Portainer with the `_json_key` username pattern. Once set up, Portainer environments with access to that registry can use the stored credentials to pull images from your GAR repositories securely.
