# How to Configure Image Pull Secrets in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Container Registry, Security, Image Pull Secrets

Description: Master the different methods for configuring image pull secrets in Rancher to authenticate container image pulls from private registries.

## Introduction

Image pull secrets are Kubernetes secrets that contain credentials for authenticating with private container registries. Properly managing these secrets is critical for security and operational reliability. This guide covers all methods for configuring image pull secrets in Rancher, from manual creation to automated distribution across namespaces.

## Prerequisites

- Rancher managing one or more clusters
- Access to a private container registry
- kubectl configured for your cluster
- Appropriate RBAC permissions

## Understanding Image Pull Secret Types

Kubernetes supports two approaches:
1. **Pod-level**: Specify `imagePullSecrets` directly in the pod spec
2. **ServiceAccount-level**: Attach secrets to a ServiceAccount so pods using that SA can inherit them

## Step 1: Create an Image Pull Secret

### Method 1: Using kubectl

```bash
# Create a registry secret

kubectl create secret docker-registry my-registry-secret \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password=mypassword \
  --docker-email=admin@example.com \
  --namespace=my-namespace

# Verify creation
kubectl describe secret my-registry-secret -n my-namespace
```

### Method 2: Using Rancher UI

1. Navigate to **Cluster Management**, open your cluster, and click **Explore**.
2. Go to **Storage** > **Secrets** (or **More Resources** > **Core** > **Secrets**).
3. Click **Create** > **Registry**, choose the namespace, and fill in the registry details.

### Method 3: Using a YAML Manifest

```yaml
# image-pull-secret.yaml - Declarative secret creation
apiVersion: v1
kind: Secret
metadata:
  name: my-registry-secret
  namespace: my-namespace
type: kubernetes.io/dockerconfigjson
data:
  # Generate with: kubectl create secret docker-registry ... --dry-run=client -o jsonpath='{.data.\.dockerconfigjson}'
  .dockerconfigjson: eyJhdXRocyI6eyJyZWdpc3RyeS5leGFtcGxlLmNvbSI6eyJ1c2VybmFtZSI6Im15dXNlciIsInBhc3N3b3JkIjoibXlwYXNzd29yZCIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJhdXRoIjoiYlhsMWMyVnlPbTE1Y0dGemQzOWtifT19fQ==
```

## Step 2: Reference Pull Secret in Pod Spec

```yaml
# deployment.yaml - Deployment using image pull secret
apiVersion: apps/v1
kind: Deployment
metadata:
  name: private-app
  namespace: my-namespace
spec:
  replicas: 2
  selector:
    matchLabels:
      app: private-app
  template:
    metadata:
      labels:
        app: private-app
    spec:
      # Specify imagePullSecrets for this pod
      imagePullSecrets:
        - name: my-registry-secret
      containers:
        - name: app
          image: registry.example.com/myorg/private-app:v1.0
          ports:
            - containerPort: 8080
```

## Step 3: Attach Pull Secret to a ServiceAccount

For automatic injection into pods that use the service account and do not define their own `imagePullSecrets`:

```bash
# Set the default service account to use this pull secret
kubectl patch serviceaccount default \
  -n my-namespace \
  -p '{"imagePullSecrets":[{"name":"my-registry-secret"}]}'

# Or set a custom service account to use it
kubectl patch serviceaccount my-app-sa \
  -n my-namespace \
  -p '{"imagePullSecrets":[{"name":"my-registry-secret"}]}'
```

Verify the patch:

```bash
kubectl get serviceaccount default -n my-namespace -o yaml
```

## Step 4: Manage Multiple Registry Secrets

For environments pulling from multiple registries:

```yaml
# multi-registry-deployment.yaml - Multiple registry secrets
apiVersion: apps/v1
kind: Deployment
metadata:
  name: multi-registry-app
  namespace: production
spec:
  selector:
    matchLabels:
      app: multi-registry-app
  template:
    metadata:
      labels:
        app: multi-registry-app
    spec:
      # Multiple image pull secrets
      imagePullSecrets:
        - name: dockerhub-credentials
        - name: ecr-credentials
        - name: harbor-credentials
      containers:
        - name: frontend
          image: myusername/frontend:v2.0  # From Docker Hub
        - name: backend
          image: 123456789.dkr.ecr.us-east-1.amazonaws.com/backend:v2.0  # From ECR
        - name: cache-init
          image: harbor.example.com/infra/redis-init:v1.0  # From Harbor
```

## Step 5: Distribute Secrets Across Namespaces

Use a script or operator to copy secrets across namespaces:

```bash
#!/bin/bash
# distribute-secrets.sh - Copy registry secret to multiple namespaces

SOURCE_NAMESPACE="default"
SECRET_NAME="registry-credentials"
TARGET_NAMESPACES=("development" "staging" "production" "testing")

for NS in "${TARGET_NAMESPACES[@]}"; do
  echo "Copying $SECRET_NAME to namespace: $NS"
  kubectl get secret $SECRET_NAME \
    --namespace=$SOURCE_NAMESPACE \
    -o json | \
    jq --arg ns "$NS" '
      del(
        .metadata.creationTimestamp,
        .metadata.managedFields,
        .metadata.resourceVersion,
        .metadata.uid,
        .metadata.annotations."kubectl.kubernetes.io/last-applied-configuration"
      )
      | .metadata.namespace = $ns
    ' | \
    kubectl apply -f -
done
```

Or use the Kubernetes Reflector operator:

```yaml
# source-secret.yaml - Secret with reflector annotation for auto-distribution
apiVersion: v1
kind: Secret
metadata:
  name: registry-credentials
  namespace: default
  annotations:
    # Automatically replicate to matching namespaces
    reflector.v1.k8s.emberstack.com/reflection-allowed: "true"
    reflector.v1.k8s.emberstack.com/reflection-allowed-namespaces: "development,staging,production"
    reflector.v1.k8s.emberstack.com/reflection-auto-enabled: "true"
    reflector.v1.k8s.emberstack.com/reflection-auto-namespaces: "development,staging,production"
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-config>
```

## Step 6: Use External Secrets Operator for Secret Management

For dynamic secret management from Vault or AWS Secrets Manager:

```yaml
# external-secret.yaml - External Secrets Operator for registry creds
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: registry-credentials
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: my-registry-secret
    template:
      engineVersion: v2
      type: kubernetes.io/dockerconfigjson
      data:
        .dockerconfigjson: '{"auths":{"registry.example.com":{"username":"{{ .username }}","password":"{{ .password }}","auth":"{{ printf "%s:%s" .username .password | b64enc }}"}}}'
  data:
    - secretKey: username
      remoteRef:
        key: registry/credentials
        property: username
    - secretKey: password
      remoteRef:
        key: registry/credentials
        property: password
```

## Step 7: Audit and Rotate Image Pull Secrets

```bash
# List all image pull secrets across namespaces
kubectl get secrets --all-namespaces \
  --field-selector type=kubernetes.io/dockerconfigjson \
  -o custom-columns="NAMESPACE:.metadata.namespace,NAME:.metadata.name,CREATED:.metadata.creationTimestamp"

# Rotate a secret
kubectl create secret docker-registry my-registry-secret \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password=NEW_PASSWORD \
  --namespace=my-namespace \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Troubleshooting

```bash
# Check pod pull errors
kubectl describe pod <pod-name> -n my-namespace | grep -A 5 "Failed\|Error"

# Verify secret format
kubectl get secret my-registry-secret -n my-namespace \
  -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d | jq .

# Test credentials manually
CREDENTIALS=$(kubectl get secret my-registry-secret -n my-namespace \
  -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d)
echo "$CREDENTIALS" | jq '.auths'
```

## Conclusion

Image pull secrets are a fundamental component of running private container images in Kubernetes. Rancher simplifies their management through its UI and namespace- or project-scoped registry credentials. For production environments, consider using the External Secrets Operator or similar tools to manage registry credentials from a centralized secrets manager, enabling automatic rotation and audit trails.
