# How to Configure ImageRepository for Quay in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, ImageRepository, Quay, Red Hat

Description: Learn how to configure a Flux ImageRepository to scan Quay.io container registry for image tags.

---

Quay is a container registry provided by Red Hat, available as a hosted service at quay.io and as a self-hosted solution (Red Hat Quay). Flux can scan Quay registries for image tags using the ImageRepository resource. This guide covers how to configure Flux to work with both hosted and self-hosted Quay instances.

## Prerequisites

- A Kubernetes cluster with Flux and image automation controllers installed
- A Quay.io account or a self-hosted Red Hat Quay instance
- kubectl access to your cluster

## Understanding Quay Image References

Quay image references follow these formats:

- Hosted Quay: `quay.io/<namespace>/<repository>` (e.g., `quay.io/my-org/my-app`)
- Self-hosted Quay: `quay.example.com/<namespace>/<repository>`

## Step 1: Scan a Public Quay Image

Many images on quay.io are public and do not require authentication.

```yaml
# imagerepository-quay-public.yaml
# Scan a public image on quay.io
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: prometheus
  namespace: flux-system
spec:
  image: quay.io/prometheus/prometheus
  interval: 10m0s
```

Apply the manifest.

```bash
# Apply the public Quay ImageRepository
kubectl apply -f imagerepository-quay-public.yaml
```

## Step 2: Create a Quay Robot Account

For private repositories, Quay uses robot accounts for automated access. Create a robot account:

1. Log in to quay.io (or your self-hosted Quay UI).
2. Navigate to your organization or user settings.
3. Go to Robot Accounts and create a new robot account.
4. Grant the robot account read access to the required repositories.
5. Copy the robot account credentials.

## Step 3: Create Kubernetes Credentials for Quay

Store the Quay robot account credentials as a Kubernetes Secret.

```bash
# Create a docker-registry secret for Quay authentication
kubectl create secret docker-registry quay-credentials \
  --docker-server=quay.io \
  --docker-username="my-org+flux-reader" \
  --docker-password=your-robot-account-token \
  -n flux-system
```

Quay robot account usernames follow the format `<namespace>+<robot-name>`.

## Step 4: Scan a Private Quay Image

Reference the credentials Secret in the ImageRepository.

```yaml
# imagerepository-quay-private.yaml
# Scan a private Quay image with robot account authentication
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-private-app
  namespace: flux-system
spec:
  image: quay.io/my-org/my-private-app
  interval: 5m0s
  secretRef:
    name: quay-credentials
```

Apply the manifest.

```bash
# Apply the private Quay ImageRepository
kubectl apply -f imagerepository-quay-private.yaml
```

## Step 5: Use an OAuth Access Token

Quay also supports OAuth access tokens for authentication. Generate an OAuth token from the Quay application settings and use it as the password.

```bash
# Create a secret with an OAuth access token
kubectl create secret docker-registry quay-oauth-credentials \
  --docker-server=quay.io \
  --docker-username='$oauthtoken' \
  --docker-password=your-oauth-access-token \
  -n flux-system
```

## Step 6: Configure Self-Hosted Quay

For a self-hosted Red Hat Quay instance, update the image reference and Docker server accordingly.

```bash
# Create credentials for a self-hosted Quay instance
kubectl create secret docker-registry quay-self-hosted-credentials \
  --docker-server=quay.example.com \
  --docker-username="my-org+flux-reader" \
  --docker-password=your-robot-account-token \
  -n flux-system
```

```yaml
# imagerepository-quay-selfhosted.yaml
# Scan a self-hosted Quay image
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: quay.example.com/my-org/my-app
  interval: 5m0s
  secretRef:
    name: quay-self-hosted-credentials
```

If the self-hosted instance uses a custom CA certificate, provide it via `certSecretRef`.

```yaml
# imagerepository-quay-selfhosted-tls.yaml
# Scan self-hosted Quay with custom CA certificate
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: quay.example.com/my-org/my-app
  interval: 5m0s
  secretRef:
    name: quay-self-hosted-credentials
  certSecretRef:
    name: quay-ca-cert
```

## Step 7: Filter Tags with Exclusion List

```yaml
# imagerepository-quay-filtered.yaml
# Scan Quay with tag exclusions
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: quay.io/my-org/my-app
  interval: 5m0s
  secretRef:
    name: quay-credentials
  exclusionList:
    # Exclude latest tag
    - "^latest$"
    # Exclude tags with build metadata
    - ".*\\+build.*"
    # Exclude nightly builds
    - "^nightly-"
```

## Step 8: Verify the Quay ImageRepository

```bash
# Check the Quay ImageRepository status
flux get image repository -n flux-system

# Get detailed information
kubectl describe imagerepository my-private-app -n flux-system
```

## Troubleshooting

- **401 Unauthorized**: Verify the robot account credentials and ensure the robot has read access to the repository.
- **Repository not found**: Check the image path format. Quay uses `<namespace>/<repository>` without a project level.
- **Rate limiting**: Quay.io may rate limit API calls. Increase the scan interval if you encounter rate limit errors.

```bash
# Check image reflector controller logs for Quay errors
kubectl logs -n flux-system deployment/image-reflector-controller | grep -i "quay\|unauthorized\|rate"
```

## Summary

You have configured Flux to scan Quay container registry for image tags. Whether using the hosted quay.io service or a self-hosted Red Hat Quay instance, Flux can authenticate using robot accounts or OAuth tokens and discover new image tags. With the ImageRepository in place, pair it with an ImagePolicy to automate image selection in your GitOps deployments.
