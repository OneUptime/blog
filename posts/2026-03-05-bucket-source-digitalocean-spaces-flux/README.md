# How to Configure Bucket Source with DigitalOcean Spaces in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, DigitalOcean, Spaces, Bucket, S3

Description: Learn how to configure Flux CD to pull Kubernetes manifests from DigitalOcean Spaces using the generic S3-compatible Bucket source provider.

---

## Introduction

DigitalOcean Spaces is an S3-compatible object storage service that integrates well with Flux CD. Since Spaces uses the S3 API, you can configure Flux's Bucket source with the `generic` provider to pull Kubernetes manifests from a Space. This guide covers creating a Space, uploading manifests, configuring authentication, and setting up the Bucket source in Flux.

## Prerequisites

- Flux CD v2.0 or later installed on your Kubernetes cluster
- A DigitalOcean account with Spaces enabled
- `doctl` CLI or DigitalOcean API access
- An S3-compatible CLI tool (e.g., `s3cmd` or `aws` CLI)
- `kubectl` access to your cluster

## Creating a DigitalOcean Space

Create a Space through the DigitalOcean console or CLI.

```bash
# Create a Space using doctl
doctl spaces create flux-manifests --region nyc3
```

## Generating Spaces Access Keys

DigitalOcean Spaces uses access keys that are separate from your DigitalOcean API token. Generate them from the DigitalOcean console under API > Spaces Keys, or use the API.

Once you have your access key and secret key, configure your S3 client.

```bash
# Configure the AWS CLI to work with DigitalOcean Spaces
aws configure --profile spaces
# Access Key ID: your-spaces-access-key
# Secret Access Key: your-spaces-secret-key
# Default region: nyc3
# Default output format: json
```

## Uploading Manifests to Spaces

Upload your Kubernetes manifests to the Space.

```bash
# Upload manifests using the AWS CLI with the Spaces endpoint
aws s3 sync ./manifests/ s3://flux-manifests/ \
  --endpoint-url https://nyc3.digitaloceanspaces.com \
  --profile spaces

# Verify the upload
aws s3 ls s3://flux-manifests/ \
  --endpoint-url https://nyc3.digitaloceanspaces.com \
  --profile spaces
```

## Creating Flux Credentials

Create a Kubernetes secret with your Spaces access keys.

```bash
# Create a secret with DigitalOcean Spaces credentials
kubectl create secret generic spaces-bucket-creds \
  --namespace flux-system \
  --from-literal=accesskey=YOUR_SPACES_ACCESS_KEY \
  --from-literal=secretkey=YOUR_SPACES_SECRET_KEY
```

## Configuring the Bucket Source

Create a Bucket source using the `generic` provider with the DigitalOcean Spaces endpoint.

```yaml
# flux-system/spaces-bucket-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  # Use generic provider for S3-compatible storage
  provider: generic
  bucketName: flux-manifests
  # DigitalOcean Spaces endpoint format: {region}.digitaloceanspaces.com
  endpoint: nyc3.digitaloceanspaces.com
  region: nyc3
  secretRef:
    name: spaces-bucket-creds
```

Apply and verify.

```bash
# Apply the Bucket source
kubectl apply -f spaces-bucket-source.yaml

# Check the status
flux get sources bucket -n flux-system
```

## Using Prefixes for Organization

If you store manifests for multiple applications or environments in the same Space, use prefixes to scope what Flux downloads.

```yaml
# flux-system/spaces-bucket-staging.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: my-app-staging
  namespace: flux-system
spec:
  interval: 5m
  provider: generic
  bucketName: flux-manifests
  endpoint: nyc3.digitaloceanspaces.com
  region: nyc3
  # Only download files from the staging prefix
  prefix: staging/my-app/
  secretRef:
    name: spaces-bucket-creds
```

## Multi-Environment Setup

A common pattern is to organize one Space with multiple environment prefixes.

```bash
# Upload manifests for different environments
aws s3 sync ./manifests/staging/ s3://flux-manifests/staging/my-app/ \
  --endpoint-url https://nyc3.digitaloceanspaces.com --profile spaces

aws s3 sync ./manifests/production/ s3://flux-manifests/production/my-app/ \
  --endpoint-url https://nyc3.digitaloceanspaces.com --profile spaces
```

Create separate Bucket sources for each environment.

```yaml
# flux-system/spaces-production.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: my-app-production
  namespace: flux-system
spec:
  interval: 10m
  provider: generic
  bucketName: flux-manifests
  endpoint: nyc3.digitaloceanspaces.com
  region: nyc3
  prefix: production/my-app/
  secretRef:
    name: spaces-bucket-creds
```

## Connecting a Kustomization

Deploy manifests from the Spaces Bucket source.

```yaml
# flux-system/my-app-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: my-app
  sourceRef:
    kind: Bucket
    name: my-app
  path: ./
  prune: true
  wait: true
```

## CI/CD Integration with GitHub Actions

Automate manifest uploads to DigitalOcean Spaces from your CI/CD pipeline.

```yaml
# .github/workflows/upload-to-spaces.yaml
name: Upload Manifests to DigitalOcean Spaces
on:
  push:
    branches: [main]
    paths: ['manifests/**']

jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install AWS CLI
        run: |
          sudo apt-get update && sudo apt-get install -y awscli

      - name: Upload manifests to Spaces
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.SPACES_ACCESS_KEY }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.SPACES_SECRET_KEY }}
        run: |
          # Sync manifests to DigitalOcean Spaces
          aws s3 sync ./manifests/ s3://flux-manifests/ \
            --endpoint-url https://nyc3.digitaloceanspaces.com \
            --delete
```

## Using with DigitalOcean Kubernetes (DOKS)

When running Flux on DigitalOcean Kubernetes, the Spaces endpoint is accessible over the public internet. For better performance, use the internal network endpoint if available.

```yaml
# flux-system/spaces-internal.yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  provider: generic
  bucketName: flux-manifests
  # Use the internal endpoint for DOKS clusters in the same region
  endpoint: nyc3.digitaloceanspaces.com
  region: nyc3
  secretRef:
    name: spaces-bucket-creds
```

## Verifying the Setup

```bash
# Check Bucket source status
flux get sources bucket -n flux-system

# Describe for detailed information
kubectl describe bucket my-app -n flux-system

# Verify the Kustomization
flux get kustomizations -n flux-system
```

## Troubleshooting

**Error: Access Denied (403)**

The Spaces access key does not have permission. Verify the key is valid and has not been revoked in the DigitalOcean console.

**Error: NoSuchBucket**

The bucket name is incorrect or the Space does not exist in the specified region. Verify the Space name and region.

```bash
# List your Spaces
doctl spaces list
```

**Error: connection refused or timeout**

The endpoint URL may be incorrect. Ensure it follows the format `{region}.digitaloceanspaces.com` without the `https://` prefix (Flux adds it automatically).

## Best Practices

1. **Use separate access keys for Flux.** Generate a dedicated Spaces access key pair for Flux rather than reusing keys from other services.

2. **Enable CDN only for public content.** Do not enable the Spaces CDN for Flux manifests as they should remain private.

3. **Restrict CORS and access policies.** Keep the Space private and only allow access through the API keys.

4. **Use lifecycle policies.** Configure lifecycle rules to clean up old versions of manifests if you are using versioned keys.

5. **Match the region.** Deploy your DOKS cluster and Space in the same region for lower latency.

## Conclusion

DigitalOcean Spaces integrates smoothly with Flux CD through the `generic` S3-compatible provider. By creating a Space, generating access keys, and configuring the Bucket source, you can deliver Kubernetes manifests through DigitalOcean's object storage. Combined with a CI/CD pipeline that uploads manifests on code changes, this provides a complete GitOps workflow for DigitalOcean-based infrastructure.
