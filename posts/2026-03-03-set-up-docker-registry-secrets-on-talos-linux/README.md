# How to Set Up Docker Registry Secrets on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Docker, Container Registry, Secrets, Image Pull

Description: Complete guide to configuring Docker registry Secrets on Talos Linux so your pods can pull images from private container registries.

---

When your Kubernetes workloads need to pull container images from private registries, you need to provide authentication credentials. On Talos Linux, this is done through Kubernetes Secrets of type `kubernetes.io/dockerconfigjson`. These secrets store the registry credentials that the kubelet uses when pulling images for your pods.

This guide covers creating registry secrets, attaching them to pods and service accounts, and handling multiple registries on Talos Linux.

## Why Registry Secrets Matter on Talos Linux

Talos Linux does not have a Docker daemon or a local Docker configuration file. You cannot log into a registry on the node itself. Everything goes through Kubernetes, so registry credentials must be provided as Kubernetes Secrets. This is actually a cleaner approach since your credentials are managed centrally through the Kubernetes API rather than scattered across node filesystems.

## Prerequisites

- A running Talos Linux cluster
- `kubectl` configured for your cluster
- Credentials for your private container registry (Docker Hub, GitHub Container Registry, AWS ECR, Google Artifact Registry, or any private registry)

```bash
# Verify cluster access
kubectl get nodes
```

## Creating a Registry Secret from the Command Line

The simplest way to create a registry secret is using `kubectl create secret docker-registry`:

```bash
# Create a Docker registry secret
kubectl create secret docker-registry my-registry-secret \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password='mypassword' \
  --docker-email=myuser@example.com \
  --namespace=default
```

For Docker Hub specifically:

```bash
# Docker Hub registry secret
kubectl create secret docker-registry dockerhub-secret \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=mydockerhubuser \
  --docker-password='my-access-token' \
  --docker-email=user@example.com
```

For GitHub Container Registry:

```bash
# GitHub Container Registry (ghcr.io) secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=my-github-username \
  --docker-password='ghp_xxxxxxxxxxxxxxxxxxxx' \
  --docker-email=user@example.com
```

## Creating a Registry Secret from a Docker Config File

If you already have a Docker configuration file (from running `docker login` on your workstation), you can use it directly:

```bash
# Create secret from existing Docker config
kubectl create secret generic my-registry-secret \
  --from-file=.dockerconfigjson=$HOME/.docker/config.json \
  --type=kubernetes.io/dockerconfigjson
```

Be careful with this approach - your local Docker config might contain credentials for multiple registries, and you would be uploading all of them to Kubernetes.

## Creating a Registry Secret with YAML

For declarative management, create the secret using a YAML manifest. First, generate the authentication string:

```bash
# Create the auth string (base64 of username:password)
AUTH=$(echo -n 'myuser:mypassword' | base64)

# Create the dockerconfigjson content
CONFIG_JSON=$(cat << EOF
{
  "auths": {
    "registry.example.com": {
      "username": "myuser",
      "password": "mypassword",
      "auth": "${AUTH}"
    }
  }
}
EOF
)

# Base64 encode the entire config
CONFIG_B64=$(echo -n "$CONFIG_JSON" | base64 | tr -d '\n')

echo "Use this value in your YAML: $CONFIG_B64"
```

Then create the YAML manifest:

```yaml
# registry-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-registry-secret
  namespace: default
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-config-json>
```

Or use `stringData` to avoid manual base64 encoding:

```yaml
# registry-secret-stringdata.yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-registry-secret
  namespace: default
type: kubernetes.io/dockerconfigjson
stringData:
  .dockerconfigjson: |
    {
      "auths": {
        "registry.example.com": {
          "username": "myuser",
          "password": "mypassword",
          "auth": "bXl1c2VyOm15cGFzc3dvcmQ="
        }
      }
    }
```

```bash
kubectl apply -f registry-secret-stringdata.yaml
```

## Using Registry Secrets in Pods

Once the secret exists, reference it in your pod spec using `imagePullSecrets`:

```yaml
# pod-with-private-image.yaml
apiVersion: v1
kind: Pod
metadata:
  name: private-app
spec:
  containers:
  - name: app
    image: registry.example.com/myorg/myapp:latest
    ports:
    - containerPort: 8080
  imagePullSecrets:
  - name: my-registry-secret
```

```bash
# Deploy the pod
kubectl apply -f pod-with-private-image.yaml

# Check if the image was pulled successfully
kubectl get pod private-app
kubectl describe pod private-app | grep -A 5 "Events"
```

## Using Registry Secrets in Deployments

For production workloads:

```yaml
# deployment-private-registry.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: registry.example.com/myorg/myapp:v1.2.3
        ports:
        - containerPort: 8080
      imagePullSecrets:
      - name: my-registry-secret
```

## Attaching Registry Secrets to Service Accounts

Instead of adding `imagePullSecrets` to every pod spec, you can attach the secret to a service account. All pods using that service account will automatically have access to the registry:

```bash
# Attach the secret to the default service account
kubectl patch serviceaccount default \
  -p '{"imagePullSecrets": [{"name": "my-registry-secret"}]}'
```

For a more structured approach:

```yaml
# service-account-with-registry.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
  namespace: default
imagePullSecrets:
- name: my-registry-secret
- name: another-registry-secret
```

Then reference the service account in your pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  serviceAccountName: myapp-sa
  containers:
  - name: app
    image: registry.example.com/myorg/myapp:latest
```

## Multiple Registries

If your application uses images from multiple private registries, you have two options:

### Option 1: Multiple secrets in imagePullSecrets

```yaml
spec:
  imagePullSecrets:
  - name: dockerhub-secret
  - name: ghcr-secret
  - name: ecr-secret
  containers:
  - name: app
    image: ghcr.io/myorg/frontend:latest
  - name: sidecar
    image: registry.example.com/tools/proxy:v1
```

### Option 2: One secret with multiple registries

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: multi-registry-secret
type: kubernetes.io/dockerconfigjson
stringData:
  .dockerconfigjson: |
    {
      "auths": {
        "https://index.docker.io/v1/": {
          "username": "dockerhub-user",
          "password": "dockerhub-token",
          "auth": "base64-encoded-creds"
        },
        "ghcr.io": {
          "username": "github-user",
          "password": "github-token",
          "auth": "base64-encoded-creds"
        },
        "registry.example.com": {
          "username": "private-user",
          "password": "private-pass",
          "auth": "base64-encoded-creds"
        }
      }
    }
```

## AWS ECR Integration

AWS Elastic Container Registry tokens expire every 12 hours, which requires special handling:

```bash
# Get ECR login token
AWS_ACCOUNT=123456789012
AWS_REGION=us-east-1
ECR_TOKEN=$(aws ecr get-login-password --region $AWS_REGION)

# Create or update the secret
kubectl create secret docker-registry ecr-secret \
  --docker-server=${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com \
  --docker-username=AWS \
  --docker-password="${ECR_TOKEN}" \
  --dry-run=client -o yaml | kubectl apply -f -
```

For automated rotation, consider using a CronJob or a tool like `ecr-credential-helper` deployed as a pod in your Talos cluster.

## Configuring Registry Mirrors on Talos Linux

Talos Linux also supports configuring registry mirrors and authentication at the node level through the machine configuration. This can be useful for cluster-wide registry access:

```yaml
# Talos machine config snippet
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://my-mirror.example.com
    config:
      registry.example.com:
        auth:
          username: myuser
          password: mypassword
```

Apply with talosctl:

```bash
talosctl patch machineconfig --nodes <node-ip> --patch @registry-config.yaml
```

This configures containerd on the Talos node directly, which means you do not need `imagePullSecrets` for registries configured this way. However, the Kubernetes Secret approach is more flexible and easier to manage per-namespace.

## Troubleshooting

```bash
# Check for image pull errors
kubectl describe pod <pod-name> | grep -A 10 "Events"

# Common errors:
# - ErrImagePull: credentials might be wrong
# - ImagePullBackOff: repeated failures, check the secret exists
# - unauthorized: authentication failed

# Verify the secret data is correct
kubectl get secret my-registry-secret -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d | python3 -m json.tool

# Make sure the secret is in the right namespace
kubectl get secret my-registry-secret -n <namespace>
```

## Wrapping Up

Docker registry Secrets on Talos Linux are your gateway to pulling images from private registries. Since Talos does not have a Docker daemon, all registry authentication flows through Kubernetes. Create your secrets with `kubectl create secret docker-registry`, attach them to pods or service accounts, and use Talos machine configuration for cluster-wide registry settings. For registries with rotating tokens like AWS ECR, automate the credential refresh to avoid pod scheduling failures.
