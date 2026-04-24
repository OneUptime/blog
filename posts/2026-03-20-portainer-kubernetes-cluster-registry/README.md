# How to Set Up Cluster Registry Access in Portainer for Kubernetes - Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Registry, Cluster, DevOps

Description: Learn how to configure registry access for a Kubernetes cluster in Portainer to enable private image pulls across all namespaces.

## Introduction

Setting up registry access for a Kubernetes cluster in Portainer ensures that deployments can pull images from private registries. Unlike Docker standalone environments, Kubernetes uses namespaced image pull secrets. Portainer lets you grant namespaces access to configured registries from the UI. This guide covers the setup.

## Prerequisites

- Portainer with a Kubernetes environment
- At least one registry configured in Portainer
- Admin access to the cluster

## Step 1: Configure Cluster Registry Access in Portainer

1. Select your Kubernetes environment in Portainer
2. Expand **Cluster** and click **Registries**
3. Find the registry you want to manage and click **Manage access**
4. Select the namespaces that should be able to use that registry
5. Click **Create access**

## Step 2: Create Registry Secrets Per Namespace

Kubernetes requires image pull secrets in each namespace where you pull private images:

```bash
# Create registry secret in a namespace

kubectl create secret docker-registry registry-credentials \
  --docker-server=registry.company.com \
  --docker-username=portainer-user \
  --docker-password=mypassword \
  --docker-email=ops@company.com \
  --namespace=production
```

Portainer can manage this from the namespace view as well:

1. Navigate to **Namespaces → {namespace}**
2. In the **Registries** section, select the registry from **Select registries**
3. Click **Update namespace**

## Step 3: Create Registry Secret Manually via YAML

```bash
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Secret
metadata:
  name: registry-credentials
  namespace: production
type: kubernetes.io/dockerconfigjson
stringData:
  .dockerconfigjson: |
    {
      "auths": {
        "registry.company.com": {
          "username": "user",
          "password": "pass",
          "auth": "dXNlcjpwYXNz"
        }
      }
    }
EOF
```

## Step 4: Patch Service Accounts to Auto-Use Secrets

Patch the default service account to automatically use the registry credentials:

```bash
# Patch default service account in each namespace
kubectl patch serviceaccount default \
  --namespace production \
  -p '{"imagePullSecrets":[{"name":"registry-credentials"}]}'

# Verify
kubectl get serviceaccount default -n production -o yaml
```

Now new pods in the `production` namespace that use the default service account automatically use the pull secret.

## Step 5: Propagate Secrets to All Namespaces

For credentials needed in all namespaces, use a script:

```bash
#!/bin/bash
# create-registry-secret-all-namespaces.sh

REGISTRY="registry.company.com"
USERNAME="portainer-user"
PASSWORD="mypassword"
SECRET_NAME="registry-credentials"

for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
    # Skip system namespaces
    if [[ "$ns" == kube-* ]] || [[ "$ns" == "cert-manager" ]]; then
        continue
    fi

    # Create or update the secret
    kubectl create secret docker-registry "$SECRET_NAME" \
        --docker-server="$REGISTRY" \
        --docker-username="$USERNAME" \
        --docker-password="$PASSWORD" \
        --namespace="$ns" \
        --dry-run=client -o yaml | kubectl apply -f -

    echo "Created secret in namespace: $ns"
done
```

## Step 6: Use Registry Reflector (Automated)

Install Reflector using the published manifest:

```bash
kubectl apply -n kube-system -f \
  https://github.com/emberstack/kubernetes-reflector/releases/latest/download/reflector.yaml
```

Then annotate your source secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: registry-credentials
  namespace: default
  annotations:
    reflector.v1.k8s.emberstack.com/reflection-allowed: "true"
    reflector.v1.k8s.emberstack.com/reflection-allowed-namespaces: "production,staging,development"
    reflector.v1.k8s.emberstack.com/reflection-auto-enabled: "true"
    reflector.v1.k8s.emberstack.com/reflection-auto-namespaces: "production,staging,development"
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-config>
```

## Step 7: Use Registry Secrets in Deployments

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
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
      imagePullSecrets:
        - name: registry-credentials   # Reference the pull secret
      containers:
        - name: app
          image: registry.company.com/myapp:latest
```

## Step 8: Verify Registry Access

```bash
# Test pulling an image in a specific namespace
kubectl run test-pull \
  --image=registry.company.com/myapp:latest \
  --image-pull-policy=Always \
  --namespace=production \
  --overrides='{"spec":{"imagePullSecrets":[{"name":"registry-credentials"}]}}' \
  --restart=Never

# Check pod events for pull status
kubectl describe pod test-pull -n production

# Clean up
kubectl delete pod test-pull -n production
```

## Conclusion

Setting up cluster-wide registry access in Portainer for Kubernetes requires granting namespaces access to the registry and ensuring each namespace has the required image pull secret. For production clusters, automate secret propagation across all namespaces using scripts or the Reflector tool, and patch service accounts to automatically reference the pull secret. This ensures all workloads can pull from private registries without manual secret configuration per deployment.
