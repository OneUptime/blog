# How to Configure Private Registry Authentication with ImagePullSecrets Per Namespace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Container Registry

Description: Learn how to configure ImagePullSecrets for authenticating with private container registries on a per-namespace basis to secure access and manage credentials effectively in Kubernetes.

---

Private container registries require authentication to pull images. Kubernetes uses ImagePullSecrets to store registry credentials and attach them to pods. Managing these secrets per namespace provides better security isolation, enables different teams to use different registries, and simplifies credential rotation.

This guide demonstrates how to configure and manage ImagePullSecrets across namespaces effectively.

## Understanding ImagePullSecrets

ImagePullSecrets are Kubernetes secrets that contain Docker registry credentials. When a pod needs to pull an image from a private registry, it references these secrets to authenticate. You can configure ImagePullSecrets in three ways:

- **Per-pod specification**: Explicitly reference secrets in pod spec
- **Service account default**: Attach secrets to service accounts
- **Admission webhook injection**: Automatically inject secrets

## Prerequisites

Ensure you have:

- Kubernetes cluster with access to create secrets
- Private container registry credentials
- kubectl with namespace creation privileges
- Understanding of Kubernetes service accounts

## Creating ImagePullSecrets

Create a secret for Docker registry authentication:

```bash
# Using docker-registry secret type
kubectl create secret docker-registry regcred \
  --docker-server=myregistry.azurecr.io \
  --docker-username=myusername \
  --docker-password=mypassword \
  --docker-email=myemail@example.com \
  --namespace=production
```

For multiple namespaces:

```bash
for ns in production staging development; do
  kubectl create secret docker-registry regcred \
    --docker-server=myregistry.azurecr.io \
    --docker-username=myusername \
    --docker-password=mypassword \
    --docker-email=myemail@example.com \
    --namespace=$ns
done
```

Verify the secret:

```bash
kubectl get secret regcred -n production -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d
```

## Using ImagePullSecrets in Pods

Reference the secret in pod specifications:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: private-app
  namespace: production
spec:
  containers:
  - name: app
    image: myregistry.azurecr.io/myapp:v1.2.3
  imagePullSecrets:
  - name: regcred
```

For deployments:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      imagePullSecrets:
      - name: regcred
      containers:
      - name: app
        image: myregistry.azurecr.io/webapp:v2.1.0
```

## Attaching to Service Accounts

Automatically apply ImagePullSecrets to all pods using a service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa
  namespace: production
imagePullSecrets:
- name: regcred
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
  namespace: production
spec:
  template:
    spec:
      serviceAccountName: app-sa
      containers:
      - name: app
        image: myregistry.azurecr.io/webapp:v2.1.0
```

Patch existing service accounts:

```bash
kubectl patch serviceaccount default \
  -n production \
  -p '{"imagePullSecrets": [{"name": "regcred"}]}'
```

## Managing Multiple Registry Credentials

Store credentials for multiple registries:

```bash
# Azure Container Registry
kubectl create secret docker-registry acr-secret \
  --docker-server=mycompany.azurecr.io \
  --docker-username=$ACR_USERNAME \
  --docker-password=$ACR_PASSWORD \
  --namespace=production

# Docker Hub
kubectl create secret docker-registry dockerhub-secret \
  --docker-server=docker.io \
  --docker-username=$DOCKER_USERNAME \
  --docker-password=$DOCKER_PASSWORD \
  --namespace=production

# Google Container Registry
kubectl create secret docker-registry gcr-secret \
  --docker-server=gcr.io \
  --docker-username=_json_key \
  --docker-password="$(cat gcr-key.json)" \
  --namespace=production
```

Reference multiple secrets:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-registry-app
spec:
  imagePullSecrets:
  - name: acr-secret
  - name: dockerhub-secret
  - name: gcr-secret
  containers:
  - name: app1
    image: mycompany.azurecr.io/app1:v1
  - name: app2
    image: docker.io/myorg/app2:v2
  - name: app3
    image: gcr.io/myproject/app3:v3
```

## Namespace-Specific Configuration

Create different registry access per namespace:

```yaml
# Production namespace - ACR only
apiVersion: v1
kind: Namespace
metadata:
  name: production
---
apiVersion: v1
kind: Secret
metadata:
  name: regcred
  namespace: production
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-acr-credentials>
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: default
  namespace: production
imagePullSecrets:
- name: regcred

---
# Development namespace - Docker Hub
apiVersion: v1
kind: Namespace
metadata:
  name: development
---
apiVersion: v1
kind: Secret
metadata:
  name: regcred
  namespace: development
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-dockerhub-credentials>
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: default
  namespace: development
imagePullSecrets:
- name: regcred
```

## Automating Secret Creation

Create a script to provision secrets across namespaces:

```bash
#!/bin/bash
# create-registry-secrets.sh

NAMESPACES=("production" "staging" "development")
REGISTRY_SERVER="myregistry.azurecr.io"
REGISTRY_USER="myusername"
REGISTRY_PASS="mypassword"

for ns in "${NAMESPACES[@]}"; do
  echo "Creating registry secret in namespace: $ns"
  
  kubectl create namespace $ns --dry-run=client -o yaml | kubectl apply -f -
  
  kubectl create secret docker-registry regcred \
    --docker-server=$REGISTRY_SERVER \
    --docker-username=$REGISTRY_USER \
    --docker-password=$REGISTRY_PASS \
    --namespace=$ns \
    --dry-run=client -o yaml | kubectl apply -f -
  
  kubectl patch serviceaccount default \
    -n $ns \
    -p '{"imagePullSecrets": [{"name": "regcred"}]}'
done

echo "Registry secrets created successfully"
```

## Using External Secrets Operator

Sync registry credentials from external secret managers:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: azure-keyvault
  namespace: production
spec:
  provider:
    azurekv:
      vaultUrl: "https://myvault.vault.azure.net"
      authSecretRef:
        clientId:
          name: azure-creds
          key: client-id
        clientSecret:
          name: azure-creds
          key: client-secret
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: registry-credentials
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-keyvault
    kind: SecretStore
  target:
    name: regcred
    creationPolicy: Owner
    template:
      type: kubernetes.io/dockerconfigjson
      data:
        .dockerconfigjson: |
          {
            "auths": {
              "{{ .registry }}": {
                "username": "{{ .username }}",
                "password": "{{ .password }}",
                "auth": "{{ printf "%s:%s" .username .password | b64enc }}"
              }
            }
          }
  data:
  - secretKey: registry
    remoteRef:
      key: acr-registry-server
  - secretKey: username
    remoteRef:
      key: acr-username
  - secretKey: password
    remoteRef:
      key: acr-password
```

## Credential Rotation

Rotate registry credentials without downtime:

```bash
#!/bin/bash
# rotate-registry-credentials.sh

NEW_PASSWORD="new-password-here"
NAMESPACES=$(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}')

for ns in $NAMESPACES; do
  if kubectl get secret regcred -n $ns &>/dev/null; then
    echo "Rotating credentials in namespace: $ns"
    
    # Create new secret
    kubectl create secret docker-registry regcred-new \
      --docker-server=myregistry.azurecr.io \
      --docker-username=myusername \
      --docker-password=$NEW_PASSWORD \
      --namespace=$ns
    
    # Update service account
    kubectl patch serviceaccount default -n $ns \
      -p '{"imagePullSecrets": [{"name": "regcred-new"}]}'
    
    # Delete old secret
    kubectl delete secret regcred -n $ns
    
    # Rename new secret
    kubectl get secret regcred-new -n $ns -o yaml | \
      sed 's/regcred-new/regcred/' | \
      kubectl apply -f -
    
    kubectl delete secret regcred-new -n $ns
  fi
done
```

## Troubleshooting Image Pull Failures

Debug ImagePullSecret issues:

```bash
# Check if secret exists
kubectl get secret regcred -n production

# Verify secret content
kubectl get secret regcred -n production -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d | jq

# Check pod events
kubectl describe pod <pod-name> -n production

# Common error: "ImagePullBackOff"
# Solution: Verify credentials and registry URL

# Test credentials manually
docker login myregistry.azurecr.io -u myusername -p mypassword
```

Check service account configuration:

```bash
kubectl get serviceaccount default -n production -o yaml
# Should show imagePullSecrets section
```

## Security Best Practices

Follow these practices for secure credential management:

**Use namespace isolation**: Don't share secrets across namespaces unnecessarily

**Rotate credentials regularly**: Implement automated rotation every 90 days

**Use least privilege**: Grant only necessary registry access per namespace

**Audit secret access**: Monitor who accesses registry credentials

**Encrypt at rest**: Ensure secrets encryption is enabled in etcd

**Use external secret managers**: Integrate with HashiCorp Vault or cloud KMS

## Monitoring Registry Authentication

Monitor image pull success rates:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: registry-monitoring
data:
  queries.promql: |
    # Failed image pulls
    rate(kubelet_image_pull_errors_total[5m])
    
    # Image pull latency
    histogram_quantile(0.95, rate(kubelet_image_pull_duration_seconds_bucket[5m]))
    
    # Authentication failures
    increase(kubelet_image_pull_errors_total{reason="ImagePullBackOff"}[1h])
```

## Conclusion

Properly managing ImagePullSecrets per namespace provides secure, isolated access to private registries while simplifying credential management. By attaching secrets to service accounts, automating provisioning, and implementing regular rotation, you maintain security without adding operational burden.

Configure namespace-specific registry access, use external secret managers for credential storage, automate rotation processes, and monitor authentication failures. Track registry health and authentication metrics with OneUptime to ensure reliable image pulls across all namespaces.
