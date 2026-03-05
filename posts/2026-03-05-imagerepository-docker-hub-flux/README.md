# How to Configure ImageRepository for Docker Hub in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, ImageRepository, Docker Hub

Description: Learn how to configure a Flux ImageRepository to scan Docker Hub for container image tags.

---

Docker Hub is the most widely used public container registry. Flux can scan Docker Hub repositories for new image tags using the ImageRepository resource. This guide covers how to configure ImageRepository for both public and private Docker Hub images.

## Prerequisites

- A Kubernetes cluster with Flux and image automation controllers installed
- A Docker Hub account (required for private images and to avoid rate limits)
- kubectl access to your cluster

## Understanding Docker Hub Image References

Docker Hub images follow these conventions:

- Official images: `docker.io/library/<image>` (e.g., `docker.io/library/nginx`)
- User/org images: `docker.io/<namespace>/<image>` (e.g., `docker.io/myorg/myapp`)

When specifying images for Flux, always use the fully qualified image path including `docker.io`.

## Step 1: Scan a Public Docker Hub Image

For public images, no authentication is required. However, Docker Hub enforces rate limits for unauthenticated requests.

```yaml
# imagerepository-nginx.yaml
# Scan the official nginx image on Docker Hub
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: nginx
  namespace: flux-system
spec:
  image: docker.io/library/nginx
  interval: 5m0s
```

Apply the manifest.

```bash
# Apply the ImageRepository for nginx
kubectl apply -f imagerepository-nginx.yaml
```

## Step 2: Configure Authentication for Docker Hub

To scan private images or to avoid rate limiting, configure Docker Hub credentials.

```bash
# Create a Docker Hub credentials secret
kubectl create secret docker-registry dockerhub-credentials \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=your-dockerhub-username \
  --docker-password=your-dockerhub-access-token \
  -n flux-system
```

It is recommended to use a Docker Hub access token instead of your account password. Generate one from Docker Hub under Account Settings > Security > Access Tokens.

## Step 3: Scan a Private Docker Hub Image

Reference the credentials Secret in the ImageRepository.

```yaml
# imagerepository-private-dockerhub.yaml
# Scan a private Docker Hub image with authentication
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-private-app
  namespace: flux-system
spec:
  image: docker.io/myorg/my-private-app
  interval: 5m0s
  secretRef:
    name: dockerhub-credentials
```

Apply the manifest.

```bash
# Apply the ImageRepository for the private Docker Hub image
kubectl apply -f imagerepository-private-dockerhub.yaml
```

## Step 4: Scan a User or Organization Image

For images published under a Docker Hub user or organization namespace, use the full path.

```yaml
# imagerepository-org.yaml
# Scan an organization image on Docker Hub
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: myorg-webapp
  namespace: flux-system
spec:
  image: docker.io/myorg/webapp
  interval: 10m0s
  secretRef:
    name: dockerhub-credentials
  exclusionList:
    # Exclude development tags
    - "^dev-"
    # Exclude tags containing 'rc'
    - ".*rc.*"
```

## Step 5: Handle Docker Hub Rate Limits

Docker Hub enforces pull rate limits. For unauthenticated users the limit is 100 pulls per 6 hours. For authenticated free users it is 200 pulls per 6 hours. To stay within limits:

1. Increase the scan interval to reduce the number of requests.
2. Always use authentication even for public images.
3. Use the exclusion list to reduce the number of tags processed.

```yaml
# imagerepository-rate-limited.yaml
# Scan Docker Hub with a longer interval to respect rate limits
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: nginx
  namespace: flux-system
spec:
  image: docker.io/library/nginx
  interval: 30m0s
  secretRef:
    name: dockerhub-credentials
  exclusionList:
    # Exclude alpha and beta tags
    - ".*alpha.*"
    - ".*beta.*"
    # Exclude very old tags
    - "^1\\.[0-9]$"
```

## Step 6: Verify the Docker Hub ImageRepository

Check that the image repository scan is working.

```bash
# Get the status of all image repositories
flux get image repository -n flux-system
```

You should see a successful scan result with the last scan time and tag count.

For detailed information, use kubectl.

```bash
# Describe the ImageRepository for detailed status
kubectl describe imagerepository nginx -n flux-system
```

## Step 7: Use the Flux CLI to Create the Resource

The Flux CLI can generate the ImageRepository manifest.

```bash
# Generate an ImageRepository manifest for a Docker Hub image
flux create image repository my-app \
  --image=docker.io/myorg/my-app \
  --interval=5m \
  --secret-ref=dockerhub-credentials \
  --namespace=flux-system \
  --export > imagerepository-my-app.yaml
```

Commit the generated file to your Git repository for GitOps management.

## Troubleshooting

If you encounter errors scanning Docker Hub images:

- **Rate limit exceeded**: Increase the interval or add authentication.
- **Unauthorized**: Verify that your Docker Hub credentials are correct and the Secret is in the `flux-system` namespace.
- **Image not found**: Ensure the image path uses the full Docker Hub format (`docker.io/library/...` for official images).

```bash
# Check image reflector controller logs for Docker Hub errors
kubectl logs -n flux-system deployment/image-reflector-controller | grep -i "dockerhub\|docker.io\|rate"
```

## Summary

You have configured Flux ImageRepository resources to scan Docker Hub for container image tags. Whether you are tracking public official images or private organizational images, configuring authentication and appropriate scan intervals ensures reliable image discovery. With the ImageRepository in place, you can pair it with an ImagePolicy to select the correct tag for your deployments.
