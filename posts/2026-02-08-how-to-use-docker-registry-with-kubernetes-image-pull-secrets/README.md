# How to Use Docker Registry with Kubernetes Image Pull Secrets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Kubernetes, Image Pull Secrets, Docker Registry, Container Security, DevOps

Description: Learn how to configure Kubernetes image pull secrets to authenticate with private Docker registries and pull container images.

---

When your Docker images live in a private registry, Kubernetes nodes cannot pull them without credentials. Public images from Docker Hub work out of the box, but anything behind authentication requires an image pull secret. This Kubernetes resource stores your registry credentials and tells the kubelet how to authenticate when pulling images.

This guide covers creating image pull secrets for various registries, attaching them to pods and service accounts, and managing them across namespaces.

## How Image Pull Secrets Work

When Kubernetes schedules a pod, the kubelet on the target node needs to pull the container image. For private registries, the kubelet looks for credentials in one of two places:

1. An `imagePullSecrets` field in the pod spec
2. An `imagePullSecrets` field on the pod's service account

The secret itself contains a `.dockerconfigjson` entry, which is the same format as the `~/.docker/config.json` file that Docker uses when you run `docker login`.

## Creating an Image Pull Secret

The most common method uses `kubectl create secret docker-registry`.

For Docker Hub:

```bash
# Create an image pull secret for Docker Hub
kubectl create secret docker-registry dockerhub-creds \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=myuser \
  --docker-password=mypassword \
  --docker-email=myuser@example.com
```

For Amazon ECR:

```bash
# Get a temporary ECR authentication token (valid for 12 hours)
ECR_TOKEN=$(aws ecr get-login-password --region us-east-1)

# Create the secret using the ECR token
kubectl create secret docker-registry ecr-creds \
  --docker-server=123456789012.dkr.ecr.us-east-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password="${ECR_TOKEN}"
```

For Google Container Registry (GCR) or Artifact Registry:

```bash
# Create the secret using a GCP service account key
kubectl create secret docker-registry gcr-creds \
  --docker-server=gcr.io \
  --docker-username=_json_key \
  --docker-password="$(cat service-account-key.json)"
```

For GitHub Container Registry (GHCR):

```bash
# Create the secret using a GitHub personal access token
kubectl create secret docker-registry ghcr-creds \
  --docker-server=ghcr.io \
  --docker-username=myuser \
  --docker-password=ghp_xxxxxxxxxxxx
```

For a self-hosted registry:

```bash
# Create the secret for a private registry
kubectl create secret docker-registry private-reg-creds \
  --docker-server=registry.mycompany.com \
  --docker-username=deployer \
  --docker-password=secretpass
```

## Using the Secret in a Pod Spec

Reference the secret in your pod or deployment manifest.

```yaml
# deployment.yaml - Pod spec with imagePullSecrets
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
      # Tell Kubernetes which secret to use for pulling images
      imagePullSecrets:
        - name: dockerhub-creds
      containers:
        - name: myapp
          image: myuser/myapp:v2.1
          ports:
            - containerPort: 8080
```

You can list multiple secrets if your pod pulls images from different registries:

```yaml
# Multiple pull secrets for images from different registries
spec:
  imagePullSecrets:
    - name: dockerhub-creds
    - name: gcr-creds
  containers:
    - name: app
      image: myuser/app:v1.0
    - name: sidecar
      image: gcr.io/myproject/sidecar:v1.0
```

## Attaching Secrets to a Service Account

Adding `imagePullSecrets` to every pod spec is repetitive. A better approach is to attach the secret to a service account. Every pod using that service account automatically gets the credentials.

```bash
# Patch the default service account to include the image pull secret
kubectl patch serviceaccount default \
  -p '{"imagePullSecrets": [{"name": "dockerhub-creds"}]}'
```

Verify the patch worked:

```bash
# Check the service account configuration
kubectl get serviceaccount default -o yaml
```

The output should include:

```yaml
imagePullSecrets:
  - name: dockerhub-creds
```

Now every pod in this namespace that uses the `default` service account can pull from your private registry without specifying `imagePullSecrets` in the pod spec.

For a custom service account:

```yaml
# service-account.yaml - Custom service account with pull secrets
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-deployer
imagePullSecrets:
  - name: dockerhub-creds
  - name: gcr-creds
```

```bash
# Apply the service account
kubectl apply -f service-account.yaml
```

Then reference it in your deployment:

```yaml
# deployment.yaml - Using a custom service account
spec:
  serviceAccountName: app-deployer
  containers:
    - name: myapp
      image: myuser/myapp:v2.1
```

## Creating Secrets from Docker Config

If you have already logged into registries on your machine, you can create a secret directly from your Docker config file.

```bash
# Create a secret from your existing Docker credentials
kubectl create secret generic regcred \
  --from-file=.dockerconfigjson=$HOME/.docker/config.json \
  --type=kubernetes.io/dockerconfigjson
```

Be cautious with this approach. Your Docker config might contain credentials for multiple registries, and credential helpers may store tokens that expire.

## Creating Secrets with YAML

For version-controlled, declarative management, define the secret in YAML. The `.dockerconfigjson` value must be base64-encoded.

```bash
# Generate the base64-encoded Docker config JSON
echo -n '{"auths":{"https://index.docker.io/v1/":{"username":"myuser","password":"mypassword","auth":"bXl1c2VyOm15cGFzc3dvcmQ="}}}' | base64
```

```yaml
# pull-secret.yaml - Declarative image pull secret
apiVersion: v1
kind: Secret
metadata:
  name: dockerhub-creds
type: kubernetes.io/dockerconfigjson
data:
  # Base64-encoded Docker config JSON
  .dockerconfigjson: eyJhdXRocyI6eyJodHRwczovL2luZGV4LmRvY2tlci5pby92MS8iOnsidXNlcm5hbWUiOiJteXVzZXIiLCJwYXNzd29yZCI6Im15cGFzc3dvcmQiLCJhdXRoIjoiYlhsMWMyVnlPbTE1Y0dGemMzZHZjbVE9In19fQ==
```

In production, use a secrets management tool like Sealed Secrets, External Secrets Operator, or Vault to avoid storing credentials in plain YAML files committed to Git.

## Sharing Secrets Across Namespaces

Kubernetes secrets are namespace-scoped. A secret in the `default` namespace is not visible in the `production` namespace. You have several options for sharing them.

Copy the secret to another namespace:

```bash
# Export the secret from one namespace and apply it in another
kubectl get secret dockerhub-creds -n default -o yaml | \
  sed 's/namespace: default/namespace: production/' | \
  kubectl apply -f -
```

Use a tool like Reflector to automatically sync secrets across namespaces:

```bash
# Install Reflector via Helm
helm repo add emberstack https://emberstack.github.io/helm-charts
helm install reflector emberstack/reflector

# Annotate the source secret to enable reflection
kubectl annotate secret dockerhub-creds \
  reflector.v1.k8s.emberstack.com/reflection-allowed="true" \
  reflector.v1.k8s.emberstack.com/reflection-auto-enabled="true" \
  reflector.v1.k8s.emberstack.com/reflection-auto-namespaces="production,staging"
```

## Handling ECR Token Rotation

ECR tokens expire after 12 hours, which makes static secrets problematic. Use a CronJob to refresh the token automatically.

```yaml
# ecr-token-refresh.yaml - CronJob to refresh ECR credentials every 6 hours
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ecr-token-refresh
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: ecr-refresher
          containers:
            - name: ecr-refresh
              image: amazon/aws-cli:latest
              command:
                - /bin/sh
                - -c
                - |
                  TOKEN=$(aws ecr get-login-password --region us-east-1)
                  kubectl delete secret ecr-creds --ignore-not-found
                  kubectl create secret docker-registry ecr-creds \
                    --docker-server=123456789012.dkr.ecr.us-east-1.amazonaws.com \
                    --docker-username=AWS \
                    --docker-password="${TOKEN}"
          restartPolicy: OnFailure
```

Alternatively, use the AWS ECR Credential Helper or the External Secrets Operator with an ECR provider for a cleaner solution.

## Troubleshooting

If pods fail with `ImagePullBackOff`, check these things:

```bash
# Describe the pod to see the exact error message
kubectl describe pod <pod-name>

# Verify the secret exists and is correctly formatted
kubectl get secret dockerhub-creds -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d | jq .

# Test the credentials manually
docker login -u myuser -p mypassword https://index.docker.io/v1/

# Check if the service account has the secret attached
kubectl get serviceaccount default -o yaml
```

Common issues include expired tokens, typos in the registry URL, and secrets created in the wrong namespace.

## Conclusion

Image pull secrets are the bridge between private Docker registries and Kubernetes clusters. For small deployments, creating a secret and referencing it in pod specs works fine. For larger environments, attaching secrets to service accounts reduces repetition, and tools like Reflector or External Secrets Operator handle cross-namespace distribution and automatic rotation. The key is to pick the method that matches your team's workflow and security requirements, then apply it consistently across all namespaces and clusters.
