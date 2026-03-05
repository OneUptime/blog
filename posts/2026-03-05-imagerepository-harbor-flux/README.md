# How to Configure ImageRepository for Harbor in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, ImageRepository, Harbor, Private Registry

Description: Learn how to configure a Flux ImageRepository to scan Harbor container registry for image tags.

---

Harbor is an open-source container registry that provides features like vulnerability scanning, access control, and image replication. Flux can scan Harbor registries for image tags using the ImageRepository resource. This guide covers how to configure Flux to work with Harbor, including authentication and TLS settings.

## Prerequisites

- A Kubernetes cluster with Flux and image automation controllers installed
- A Harbor instance with at least one project and image
- Harbor user credentials or a robot account
- kubectl access to your cluster

## Understanding Harbor Image References

Harbor image references follow this format: `<harbor-host>/<project>/<repository>`. For example:

- `harbor.example.com/my-project/my-app`
- `harbor.internal.company.com/production/api-server`

## Step 1: Create Harbor Credentials

Harbor supports user credentials and robot accounts. Robot accounts are preferred for automation because they have limited scope and can be easily rotated.

Create a robot account in Harbor:
1. Log in to the Harbor UI.
2. Navigate to your project.
3. Go to Robot Accounts and create a new robot account with pull permissions.
4. Copy the token.

Create a Kubernetes Secret with the robot account credentials.

```bash
# Create a docker-registry secret for Harbor authentication
kubectl create secret docker-registry harbor-credentials \
  --docker-server=harbor.example.com \
  --docker-username="robot\$my-project+flux-reader" \
  --docker-password=your-robot-account-token \
  -n flux-system
```

Note the escaped dollar sign in the robot account username.

## Step 2: Create an ImageRepository for Harbor

Reference the credentials Secret in the ImageRepository.

```yaml
# imagerepository-harbor.yaml
# Scan a Harbor image with authentication
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: harbor.example.com/my-project/my-app
  interval: 5m0s
  secretRef:
    name: harbor-credentials
```

Apply the manifest.

```bash
# Apply the Harbor ImageRepository
kubectl apply -f imagerepository-harbor.yaml
```

## Step 3: Configure TLS for Self-Signed Certificates

Many Harbor installations use self-signed certificates. You need to configure Flux to trust the Harbor CA certificate.

First, create a Secret with the CA certificate.

```bash
# Create a secret with the Harbor CA certificate
kubectl create secret generic harbor-ca-cert \
  --from-file=ca.crt=/path/to/harbor-ca.crt \
  -n flux-system
```

Then reference the certificate in the ImageRepository.

```yaml
# imagerepository-harbor-tls.yaml
# Scan Harbor with a custom CA certificate
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: harbor.example.com/my-project/my-app
  interval: 5m0s
  secretRef:
    name: harbor-credentials
  certSecretRef:
    name: harbor-ca-cert
```

The `certSecretRef` references a Secret containing the `ca.crt` key with the CA certificate data.

## Step 4: Scan Multiple Harbor Projects

If you have images across multiple Harbor projects, create separate ImageRepository resources and credentials for each.

```yaml
# imagerepository-harbor-multi.yaml
# ImageRepository resources for different Harbor projects
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: frontend
  namespace: flux-system
spec:
  image: harbor.example.com/web-team/frontend
  interval: 5m0s
  secretRef:
    name: harbor-web-credentials
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: backend-api
  namespace: flux-system
spec:
  image: harbor.example.com/api-team/backend-api
  interval: 5m0s
  secretRef:
    name: harbor-api-credentials
```

## Step 5: Filter Tags with Exclusion List

Harbor repositories often contain many tags. Use the exclusion list to filter out unwanted tags.

```yaml
# imagerepository-harbor-filtered.yaml
# Scan Harbor with tag exclusions
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: harbor.example.com/my-project/my-app
  interval: 10m0s
  secretRef:
    name: harbor-credentials
  certSecretRef:
    name: harbor-ca-cert
  exclusionList:
    # Exclude snapshot builds
    - ".*SNAPSHOT.*"
    # Exclude development tags
    - "^dev-"
    # Exclude tags with commit SHAs
    - "^[a-f0-9]{7,40}$"
```

## Step 6: Use Harbor with Insecure Registry (Development Only)

For development environments where Harbor runs without TLS, you may need to configure the image reflector controller to allow insecure connections. This is not recommended for production.

You can add the `--insecure-registry` flag to the image reflector controller deployment. Edit the controller deployment.

```bash
# Patch the image reflector controller to allow insecure registries (dev only)
kubectl patch deployment image-reflector-controller -n flux-system \
  --type=json \
  -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--insecure-registry=harbor.dev.example.com"}]'
```

## Step 7: Verify the Harbor ImageRepository

```bash
# Check the ImageRepository status
flux get image repository my-app -n flux-system

# Get detailed status including discovered tags
kubectl describe imagerepository my-app -n flux-system
```

## Troubleshooting

- **x509 certificate error**: The Harbor CA certificate is not trusted. Provide the CA certificate via `certSecretRef`.
- **Unauthorized**: Verify the robot account credentials. Robot account usernames in Harbor v2 follow the format `robot$project+name`.
- **Connection refused**: Ensure the Harbor hostname is resolvable from within the cluster and the correct port is used.

```bash
# Check image reflector controller logs for Harbor errors
kubectl logs -n flux-system deployment/image-reflector-controller | grep -i "harbor\|tls\|x509\|unauthorized"
```

## Summary

You have configured Flux to scan Harbor container registry for image tags. Harbor is a popular choice for self-hosted registries, and Flux supports it through standard Docker registry authentication with optional custom CA certificates. With the ImageRepository scanning your Harbor instance, you can create ImagePolicy resources to select the appropriate tags for automated deployments.
