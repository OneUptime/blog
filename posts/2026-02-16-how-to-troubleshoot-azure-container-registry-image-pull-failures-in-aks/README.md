# How to Troubleshoot Azure Container Registry Image Pull Failures in AKS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, ACR, AKS, Container Registry, Kubernetes, Troubleshooting, Docker

Description: Diagnose and fix Azure Container Registry image pull failures in AKS clusters covering authentication, network rules, and image reference issues.

---

Your AKS deployment is stuck. Pods are in ImagePullBackOff status, and `kubectl describe pod` shows errors like "unauthorized" or "manifest unknown." The container image exists in your Azure Container Registry, you can pull it from your laptop, but AKS just cannot get to it.

Image pull failures are one of the most common issues when deploying to AKS with ACR. The causes range from authentication problems to network restrictions to simple typos. Let us work through them systematically.

## Step 1: Identify the Error

Start by looking at the pod events to understand what type of pull failure you are dealing with.

```bash
# Describe the failing pod to see events
kubectl describe pod <pod-name> -n <namespace>
```

Look for these error messages in the Events section:

- **"unauthorized: authentication required"** - AKS does not have permission to pull from ACR
- **"manifest unknown"** - the image tag does not exist in the registry
- **"name unknown: repository not found"** - the repository name is wrong
- **"connection refused" or "timeout"** - network connectivity issue
- **"denied: requested access to the resource is denied"** - RBAC permission issue

Each error has a different fix.

## Error: "unauthorized: authentication required"

This is the most common error. AKS needs to authenticate to ACR, and that authentication is not working.

### Fix 1: Attach ACR to AKS

The simplest and recommended approach is to use the AKS-ACR integration, which automatically configures the managed identity.

```bash
# Check if ACR is already attached to AKS
az aks check-acr \
  --resource-group aks-rg \
  --name my-aks-cluster \
  --acr myacr.azurecr.io

# Attach ACR to AKS (creates role assignment for the kubelet identity)
az aks update \
  --resource-group aks-rg \
  --name my-aks-cluster \
  --attach-acr myacr
```

This command grants the AKS kubelet managed identity the AcrPull role on your ACR. After running it, wait a minute and try deploying again.

### Fix 2: Verify the Role Assignment

If ACR is already attached but pulls still fail, the role assignment might be broken.

```bash
# Get the kubelet identity client ID
KUBELET_ID=$(az aks show \
  --resource-group aks-rg \
  --name my-aks-cluster \
  --query "identityProfile.kubeletidentity.clientId" \
  --output tsv)

# Get the ACR resource ID
ACR_ID=$(az acr show \
  --resource-group acr-rg \
  --name myacr \
  --query "id" \
  --output tsv)

# Check existing role assignments
az role assignment list \
  --assignee "$KUBELET_ID" \
  --scope "$ACR_ID" \
  --output table

# If no AcrPull role is listed, create it manually
az role assignment create \
  --assignee "$KUBELET_ID" \
  --role AcrPull \
  --scope "$ACR_ID"
```

### Fix 3: Use an Image Pull Secret

If the managed identity approach does not work (for example, with cross-tenant ACRs), use a Kubernetes image pull secret.

```bash
# Create a service principal with AcrPull access
SP_CREDS=$(az ad sp create-for-rbac \
  --name acr-pull-sp \
  --role AcrPull \
  --scopes "$ACR_ID" \
  --query "{appId:appId, password:password}" \
  --output json)

APP_ID=$(echo $SP_CREDS | jq -r '.appId')
PASSWORD=$(echo $SP_CREDS | jq -r '.password')

# Create a Kubernetes secret with the credentials
kubectl create secret docker-registry acr-secret \
  --docker-server=myacr.azurecr.io \
  --docker-username="$APP_ID" \
  --docker-password="$PASSWORD" \
  -n <namespace>
```

Then reference the secret in your deployment:

```yaml
# Add imagePullSecrets to your pod spec
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      # Reference the pull secret
      imagePullSecrets:
      - name: acr-secret
      containers:
      - name: my-app
        image: myacr.azurecr.io/my-app:v1.0
```

## Error: "manifest unknown"

The image tag you specified does not exist in the registry.

```bash
# List available tags for the repository
az acr repository show-tags \
  --name myacr \
  --repository my-app \
  --output table

# Check if the specific tag exists
az acr repository show-manifests \
  --name myacr \
  --repository my-app \
  --query "[?tags[0]=='v1.0']" \
  --output json
```

Common causes:

- Typo in the tag name (e.g., `v1.0` vs `1.0` vs `latest`)
- The CI/CD pipeline has not pushed the image yet
- The tag was overwritten and the old manifest is gone
- Multi-architecture images where the manifest list does not include the node's architecture

**Fix**: Verify the exact tag exists and update your deployment to use it.

```bash
# Check the image reference in your deployment
kubectl get deployment my-app -n <namespace> \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

## Error: Network Connectivity Issues

If your ACR has firewall rules or is configured with a private endpoint, AKS might not be able to reach it.

### Check ACR Network Rules

```bash
# Check if ACR has network restrictions
az acr show \
  --name myacr \
  --query "{PublicAccess:publicNetworkAccess, NetworkRuleSet:networkRuleSet}" \
  --output json
```

If public access is disabled, AKS must access ACR through a private endpoint.

### Fix: Configure Private Endpoint for ACR

```bash
# Create a private endpoint for ACR in the AKS VNet
az network private-endpoint create \
  --resource-group aks-rg \
  --name acr-private-endpoint \
  --vnet-name aks-vnet \
  --subnet aks-subnet \
  --private-connection-resource-id "$ACR_ID" \
  --group-id registry \
  --connection-name acr-connection

# Set up private DNS zone
az network private-dns zone create \
  --resource-group aks-rg \
  --name "privatelink.azurecr.io"

az network private-dns zone vnet-link create \
  --resource-group aks-rg \
  --zone-name "privatelink.azurecr.io" \
  --name acr-dns-link \
  --virtual-network aks-vnet \
  --registration-enabled false

az network private-endpoint dns-zone-group create \
  --resource-group aks-rg \
  --endpoint-name acr-private-endpoint \
  --name default \
  --private-dns-zone "privatelink.azurecr.io" \
  --zone-name acr
```

### Verify DNS Resolution from AKS

After setting up the private endpoint, verify that AKS nodes resolve the ACR hostname to the private IP.

```bash
# Run a DNS lookup from inside the cluster
kubectl run dns-test --image=busybox:1.36 --rm -it --restart=Never -- nslookup myacr.azurecr.io

# It should resolve to a private IP (10.x.x.x), not a public IP
```

If it resolves to a public IP, the private DNS zone is not linked to the AKS VNet or the DNS zone group is misconfigured.

## Error: Image Size or Timeout Issues

Very large images (multi-gigabyte) can cause pull timeouts, especially on smaller node sizes with limited bandwidth.

**Fix**: Optimize your container images.

```dockerfile
# Use multi-stage builds to reduce image size
FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build

# Final stage - smaller base image
FROM node:18-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

Also consider using ACR artifact streaming (if available in your region) which allows AKS to start containers before the entire image is pulled.

## Error: Geo-Replicated ACR Issues

If you use ACR geo-replication, make sure the AKS cluster pulls from the nearest replica.

```bash
# Check ACR replication status
az acr replication list --registry myacr --output table

# If AKS is in eastus, make sure there is a replication in eastus
az acr replication create --registry myacr --location eastus
```

## Debugging Checklist

When image pulls fail, run through this checklist:

```bash
# 1. Verify the image exists
az acr repository show-tags --name myacr --repository my-app

# 2. Verify AKS can authenticate to ACR
az aks check-acr --resource-group aks-rg --name my-aks --acr myacr.azurecr.io

# 3. Check the kubelet identity role assignment
az role assignment list --assignee $(az aks show -g aks-rg -n my-aks --query "identityProfile.kubeletidentity.clientId" -o tsv) --scope $(az acr show -n myacr --query id -o tsv)

# 4. Check ACR network rules
az acr show --name myacr --query publicNetworkAccess

# 5. Check pod events for the specific error
kubectl describe pod <pod-name> -n <namespace> | grep -A 5 "Events"

# 6. Test pulling the image manually on a node (debug container)
kubectl debug node/<node-name> -it --image=mcr.microsoft.com/cbl-mariner/busybox:2.0
```

Image pull failures are frustrating because they prevent your application from even starting. But the errors are usually specific enough to point you in the right direction. Authentication issues are the most common cause, and the `az aks update --attach-acr` command fixes most of them. For network issues, private endpoint configuration with correct DNS is the answer. For everything else, check the image reference carefully - a typo in the tag or repository name is more common than you would think.
