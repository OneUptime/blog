# How to Troubleshoot ImagePullBackOff Errors When Pulling from ACR in AKS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, ACR, ImagePullBackOff, Kubernetes, Troubleshooting, Azure, Container Registry

Description: Practical troubleshooting guide for fixing ImagePullBackOff errors when AKS pods fail to pull container images from Azure Container Registry.

---

Few things are as frustrating as deploying to Kubernetes and seeing your pods stuck in ImagePullBackOff. The pod just sits there, retrying with exponentially increasing delays, while you dig through logs trying to figure out what went wrong. When pulling from Azure Container Registry (ACR), the problem usually comes down to authentication, network access, or a simple typo in the image reference. This guide covers every common cause and how to fix each one.

## Understanding the Error

ImagePullBackOff means the kubelet on the node tried to pull the container image and failed. Kubernetes then applies an exponential backoff, waiting longer between each retry - 10 seconds, 20 seconds, 40 seconds, up to a maximum of 5 minutes. The error sequence typically looks like this:

1. **ErrImagePull** - First attempt to pull the image fails.
2. **ImagePullBackOff** - Kubernetes backs off and retries.

To see what is actually happening, describe the pod.

```bash
# Get detailed information about the failing pod
# The Events section at the bottom shows the pull error details
kubectl describe pod <pod-name> -n <namespace>
```

The Events section reveals the actual error message. Common messages include:

- `unauthorized: authentication required`
- `manifest unknown`
- `repository not found`
- `dial tcp: i/o timeout`

Each points to a different root cause.

## Cause 1: AKS-ACR Integration Not Configured

The most common cause is that the AKS cluster does not have permission to pull from the ACR. AKS needs the AcrPull role on the container registry.

**Check the current integration.**

```bash
# Check if the AKS cluster is attached to any ACR
az aks check-acr \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --acr myregistry.azurecr.io
```

**Fix it by attaching ACR to AKS.**

```bash
# Attach ACR to AKS - grants the AcrPull role to the cluster's managed identity
az aks update \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --attach-acr myregistry
```

This command assigns the AcrPull role to the AKS cluster's kubelet managed identity on the ACR. It takes a few minutes to propagate. After running this, delete the failing pods so they retry with the new permissions.

```bash
# Delete the failing pods to trigger a fresh pull attempt
kubectl delete pod <pod-name> -n <namespace>
```

## Cause 2: Wrong Image Reference

A surprisingly common cause is a typo in the image name, tag, or registry URL.

```yaml
# Wrong - registry name has a typo
image: myregisty.azurecr.io/my-app:latest

# Wrong - missing the .azurecr.io suffix
image: myregistry/my-app:latest

# Correct - full ACR URL with correct registry name and tag
image: myregistry.azurecr.io/my-app:1.0.0
```

**Verify the image exists in ACR.**

```bash
# List repositories in the registry
az acr repository list --name myregistry --output table

# List tags for a specific repository
az acr repository show-tags --name myregistry --repository my-app --output table

# Check if a specific tag exists
az acr repository show-manifests \
  --name myregistry \
  --repository my-app \
  --query "[?tags[?contains(@, '1.0.0')]]"
```

## Cause 3: ACR Admin Account Disabled and No Service Principal

If you are using imagePullSecrets instead of the AKS-ACR integration, the secret might be invalid or expired.

**Check if the secret exists and is referenced correctly.**

```bash
# List image pull secrets in the namespace
kubectl get secrets -n <namespace> | grep -i pull

# Check the pod spec for imagePullSecrets
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.spec.imagePullSecrets}'
```

**Create or update an imagePullSecret.**

```bash
# Enable admin account on ACR (only for testing, not recommended for production)
az acr update --name myregistry --admin-enabled true

# Get the admin credentials
ACR_USERNAME=$(az acr credential show --name myregistry --query username --output tsv)
ACR_PASSWORD=$(az acr credential show --name myregistry --query "passwords[0].value" --output tsv)

# Create the Kubernetes secret
kubectl create secret docker-registry acr-secret \
  --docker-server=myregistry.azurecr.io \
  --docker-username="$ACR_USERNAME" \
  --docker-password="$ACR_PASSWORD" \
  --namespace default
```

Then reference it in your pod spec.

```yaml
# Add imagePullSecrets to the pod spec
spec:
  imagePullSecrets:
  - name: acr-secret
  containers:
  - name: my-app
    image: myregistry.azurecr.io/my-app:1.0.0
```

For production, use the managed identity approach (AKS-ACR attachment) instead of admin credentials. Admin credentials are a shared secret that cannot be audited per user.

## Cause 4: Network Restrictions

If your ACR has network rules enabled (firewall, private endpoint, or service endpoint), the AKS nodes might not be able to reach it.

**Check ACR network rules.**

```bash
# View the network rule configuration of the ACR
az acr show \
  --name myregistry \
  --query "networkRuleSet" \
  --output json
```

**If ACR is behind a firewall, add the AKS subnet.**

```bash
# Get the AKS subnet ID
AKS_SUBNET_ID=$(az aks show \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --query "agentPoolProfiles[0].vnetSubnetId" \
  --output tsv)

# Add the AKS subnet to the ACR network rules
az acr network-rule add \
  --name myregistry \
  --subnet "$AKS_SUBNET_ID"
```

**If ACR uses a private endpoint, verify DNS resolution.**

```bash
# From inside a pod, check if the ACR DNS resolves to a private IP
kubectl run dns-test --rm -it --image=busybox -- nslookup myregistry.azurecr.io

# The result should show a private IP (10.x.x.x or 172.x.x.x)
# If it shows a public IP, the private DNS zone is not linked to the AKS VNet
```

## Cause 5: Image Platform Mismatch

If your AKS nodes run Linux but the image was built for Windows (or the other way around), the pull will fail with a cryptic "manifest unknown" error.

```bash
# Check the image's platform/architecture
az acr manifest list-metadata \
  --registry myregistry \
  --name my-app \
  --query "[].{digest: digest, os: platform.os, arch: platform.architecture}" \
  --output table
```

Make sure the image platform matches your node pool's operating system. If you have mixed Linux and Windows node pools, use node selectors in your pod spec.

```yaml
# Ensure the pod schedules on a Linux node
spec:
  nodeSelector:
    kubernetes.io/os: linux
```

## Cause 6: ACR Throttling

ACR has rate limits based on the SKU tier. Basic allows 1,000 read operations per minute, Standard allows 10,000, and Premium allows 50,000. If you deploy many pods simultaneously, you might hit these limits.

**Check for throttling errors.**

```bash
# View ACR diagnostic logs for throttled requests
az monitor activity-log list \
  --resource-group myResourceGroup \
  --resource-id "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.ContainerRegistry/registries/myregistry" \
  --query "[?contains(operationName.value, 'Pull')]" \
  --output table
```

**Mitigate throttling.**

- Upgrade the ACR SKU from Basic to Standard or Premium.
- Use `imagePullPolicy: IfNotPresent` to avoid pulling images that are already cached on the node.
- Stagger deployments to avoid large simultaneous pulls.

## Cause 7: Expired Service Principal Credentials

If you used a service principal (not managed identity) for AKS-ACR integration, the credentials might have expired. Service principal passwords expire after 1 year by default.

```bash
# Check the service principal's credential expiration
az ad sp credential list --id <sp-object-id> --query "[].endDateTime" --output table

# Reset the service principal password
az ad sp credential reset --id <sp-object-id>

# Update the AKS cluster with the new credentials
az aks update-credentials \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --reset-service-principal \
  --service-principal <sp-app-id> \
  --client-secret <new-password>
```

To avoid this entirely, migrate to managed identity.

```bash
# Migrate from service principal to managed identity
az aks update \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --enable-managed-identity
```

## Systematic Debugging Checklist

When you hit ImagePullBackOff, work through this checklist:

1. Run `kubectl describe pod` to get the exact error message.
2. Verify the image reference (registry URL, repository name, tag).
3. Confirm the image exists in ACR with `az acr repository show-tags`.
4. Check AKS-ACR integration with `az aks check-acr`.
5. Verify network connectivity if ACR has firewall or private endpoint.
6. Check the image platform matches the node OS.
7. Look for throttling if deploying many pods.

Most of the time, it is one of the first three items. The fix is usually a one-liner - either correcting the image reference or running `az aks update --attach-acr`.

## Summary

ImagePullBackOff errors when pulling from ACR in AKS almost always trace back to authentication, a wrong image reference, or network restrictions. The fastest path to resolution is reading the exact error from `kubectl describe pod`, then checking the corresponding cause. Use the managed identity AKS-ACR integration instead of imagePullSecrets for the most reliable and maintainable setup. And always verify that the image and tag actually exist in the registry before investigating more complex causes.
