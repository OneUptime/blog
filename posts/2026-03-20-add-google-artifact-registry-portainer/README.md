# How to Add Google Artifact Registry to Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Google Cloud, Artifact Registry, Container Registry, GCP

Description: Learn how to connect Google Artifact Registry to Portainer using a service account key for private image pulls.

## Overview

Google Artifact Registry (GAR) is Google Cloud's registry service for container images, replacing the older Google Container Registry (GCR). It uses the format `<location>-docker.pkg.dev/<project>/<repository>/<image>`. For Portainer, a service account JSON key is the most practical option for persistent authentication.

## Creating a Service Account for Portainer

```bash
# Create a service account for Portainer

gcloud iam service-accounts create portainer-puller \
  --display-name="Portainer Image Puller"

# Grant Artifact Registry Reader role to the service account
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:portainer-puller@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# Create and download a JSON key file
gcloud iam service-accounts keys create portainer-key.json \
  --iam-account=portainer-puller@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

## Getting the Registry Password

Google Artifact Registry can authenticate either with a short-lived OAuth access token or with a service account key file. For the JSON key method, the username is always `_json_key`:

```bash
# Generate a short-lived OAuth access token for Docker authentication
gcloud auth print-access-token \
  --impersonate-service-account=portainer-puller@YOUR_PROJECT_ID.iam.gserviceaccount.com

# Or use the JSON key file directly with the username "_json_key"
cat portainer-key.json
```

## Adding Google Artifact Registry to Portainer

1. Go to **Registries** and click **Add registry**.
2. Select **Custom registry**.
3. Enter:
   - **Registry URL**: `us-docker.pkg.dev` (adjust location as needed)
   - **Username**: `_json_key`
   - **Password**: Paste the entire contents of your JSON key file
4. Click **Add registry**.

## Testing Authentication

```bash
# Log in to Artifact Registry using the service account key
cat portainer-key.json | docker login \
  -u _json_key \
  --password-stdin \
  https://us-docker.pkg.dev

# Pull an image to verify
docker pull us-docker.pkg.dev/my-project/my-repo/my-image:latest
```

## Using GAR Images in a Stack

```yaml
version: "3.8"

services:
  app:
    # Portainer uses the stored GCP credentials to pull from Artifact Registry
    image: us-docker.pkg.dev/my-project/my-repo/app:v2.0.0
    deploy:
      replicas: 2
```

## Using Short-Lived Access Tokens

For better security, use short-lived OAuth tokens instead of the key file. Because the token expires after 60 minutes, you must update the saved registry entry before it expires:

```bash
#!/bin/bash
# Refresh the saved GAR credentials in Portainer
PORTAINER_URL="https://portainer.example.com"
TOKEN=$(gcloud auth print-access-token \
  --impersonate-service-account=portainer-puller@YOUR_PROJECT_ID.iam.gserviceaccount.com)

curl -X PUT "${PORTAINER_URL}/api/registries/YOUR_REGISTRY_ID" \
  -H "Authorization: Bearer $PORTAINER_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "google-artifact-registry",
    "URL": "us-docker.pkg.dev",
    "Authentication": true,
    "Username": "oauth2accesstoken",
    "Password": "'"$TOKEN"'"
  }'
```

## Conclusion

Google Artifact Registry integrates with Portainer as a custom registry. Use the `_json_key` authentication method with a least-privilege service account when you need stable stored credentials in Portainer.
