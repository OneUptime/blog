# How to Configure ImageRepository Authentication in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, ImageRepository, Authentication, Container Registry

Description: Learn how to configure authentication for Flux ImageRepository resources to scan private container registries.

---

When working with private container registries, Flux needs credentials to scan for available image tags. The ImageRepository resource supports authentication through Kubernetes Secrets. In this guide, you will learn how to configure various authentication methods for your Flux ImageRepository resources.

## Prerequisites

- A Kubernetes cluster with Flux and the image automation controllers installed
- Access to a private container registry
- kubectl configured to interact with your cluster

## Understanding Authentication in ImageRepository

The ImageRepository resource uses the `secretRef` field to reference a Kubernetes Secret containing registry credentials. The Secret must be of type `kubernetes.io/dockerconfigjson` or `Opaque` with the appropriate keys. The Secret must exist in the same namespace as the ImageRepository resource.

## Step 1: Create a Docker Registry Secret

The most common approach is to create a `docker-registry` type Secret.

```bash
# Create a docker-registry secret for private registry authentication
kubectl create secret docker-registry registry-credentials \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password=mypassword \
  --docker-email=myuser@example.com \
  -n flux-system
```

## Step 2: Reference the Secret in ImageRepository

Point the ImageRepository to the Secret using the `secretRef` field.

```yaml
# imagerepository-auth.yaml
# ImageRepository with authentication for a private registry
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: registry.example.com/my-org/my-app
  interval: 5m0s
  secretRef:
    name: registry-credentials
```

Apply the manifest.

```bash
# Apply the authenticated ImageRepository
kubectl apply -f imagerepository-auth.yaml
```

## Step 3: Create a Secret from an Existing Docker Config

If you already have a Docker config file with credentials, you can create a Secret from it.

```bash
# Create a secret from an existing Docker config file
kubectl create secret generic registry-credentials \
  --from-file=.dockerconfigjson=$HOME/.docker/config.json \
  --type=kubernetes.io/dockerconfigjson \
  -n flux-system
```

## Step 4: Create a Secret Using a Manifest

For a declarative approach, create the Secret as a YAML manifest. You need to base64-encode the Docker config JSON.

```bash
# Generate a base64-encoded Docker config JSON string
echo -n '{"auths":{"registry.example.com":{"username":"myuser","password":"mypassword","auth":"bXl1c2VyOm15cGFzc3dvcmQ="}}}' | base64
```

Then use the encoded value in a Secret manifest.

```yaml
# registry-secret.yaml
# Docker registry credentials as a Kubernetes Secret
apiVersion: v1
kind: Secret
metadata:
  name: registry-credentials
  namespace: flux-system
type: kubernetes.io/dockerconfigjson
data:
  # Base64-encoded Docker config JSON
  .dockerconfigjson: <base64-encoded-docker-config>
```

## Step 5: Use a Service Account for Authentication

Instead of referencing a Secret directly, you can configure a Kubernetes ServiceAccount with image pull secrets and use that for authentication.

```yaml
# service-account.yaml
# ServiceAccount with image pull secrets for registry authentication
apiVersion: v1
kind: ServiceAccount
metadata:
  name: image-reflector
  namespace: flux-system
imagePullSecrets:
  - name: registry-credentials
```

Then reference the ServiceAccount in the ImageRepository.

```yaml
# imagerepository-sa.yaml
# ImageRepository using a ServiceAccount for authentication
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: registry.example.com/my-org/my-app
  interval: 5m0s
  serviceAccountName: image-reflector
```

## Step 6: Rotate Credentials

When registry credentials expire or need rotation, update the Secret.

```bash
# Update the docker-registry secret with new credentials
kubectl create secret docker-registry registry-credentials \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password=new-password \
  --docker-email=myuser@example.com \
  -n flux-system \
  --dry-run=client -o yaml | kubectl apply -f -
```

The image reflector controller will pick up the updated credentials on the next scan interval.

## Step 7: Use Sealed Secrets or SOPS for GitOps

Storing plain-text credentials in Git is not secure. Use Sealed Secrets or Mozilla SOPS to encrypt credentials.

With Sealed Secrets, first create a regular Secret, then seal it.

```bash
# Seal the secret for safe storage in Git
kubeseal --format=yaml \
  --cert=pub-sealed-secrets.pem \
  < registry-secret.yaml \
  > registry-secret-sealed.yaml
```

The resulting SealedSecret can be safely committed to your Git repository.

## Step 8: Verify Authentication

Check that the ImageRepository can authenticate and scan successfully.

```bash
# Verify the ImageRepository status
flux get image repository my-app -n flux-system
```

If authentication fails, the status will show an error message indicating the cause.

```bash
# Check image reflector controller logs for auth errors
kubectl logs -n flux-system deployment/image-reflector-controller | grep -i "auth\|unauthorized\|forbidden"
```

## Troubleshooting Common Authentication Issues

1. **401 Unauthorized** -- The credentials are incorrect or the Secret format is wrong. Verify the username and password.
2. **Secret not found** -- The Secret must be in the same namespace as the ImageRepository. Check the namespace.
3. **Expired tokens** -- Some registries use short-lived tokens. Set up a CronJob or use a cloud provider integration to refresh tokens automatically.
4. **Wrong Secret type** -- Ensure the Secret type is `kubernetes.io/dockerconfigjson` when using `secretRef`.

## Summary

You have learned how to configure authentication for Flux ImageRepository resources. Whether you use a simple docker-registry Secret, a ServiceAccount, or encrypted credentials via Sealed Secrets, proper authentication is essential for scanning private container registries. With authentication in place, Flux can discover new image tags and drive your automated update pipeline.
