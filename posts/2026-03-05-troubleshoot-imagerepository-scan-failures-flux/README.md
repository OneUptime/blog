# How to Troubleshoot ImageRepository Scan Failures in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, Troubleshooting, ImageRepository

Description: A step-by-step guide to diagnosing and fixing ImageRepository scan failures in Flux image automation.

---

## Introduction

The ImageRepository resource in Flux tells the image-reflector-controller to periodically scan a container registry for available image tags. When scans fail, image automation stalls and your deployments stop receiving automatic updates. This guide walks through the most common causes of ImageRepository scan failures and how to resolve them.

## Prerequisites

- A Kubernetes cluster with Flux installed
- The image-reflector-controller deployed
- An ImageRepository resource that is failing to scan

## Step 1: Check the ImageRepository Status

Start by inspecting the current status of the ImageRepository resource.

```bash
# Get the status of all ImageRepository resources
flux get image repository --all-namespaces

# Get detailed status for a specific ImageRepository
kubectl describe imagerepository my-app -n flux-system
```

Look for the `Ready` condition. A failed scan will show `Ready: False` with a reason and message explaining the failure.

## Step 2: Examine Controller Logs

The image-reflector-controller logs contain detailed error information.

```bash
# View recent logs from the image-reflector-controller
kubectl logs -n flux-system deployment/image-reflector-controller --tail=100
```

Common error patterns include authentication failures, network timeouts, and TLS errors.

## Common Failure Scenarios

### Authentication Failures

The most frequent cause of scan failures is incorrect or missing registry credentials. The error message typically contains `401 Unauthorized` or `403 Forbidden`.

Create or update a Docker registry secret and reference it in the ImageRepository.

```yaml
# image-repository-with-secret.yaml
# ImageRepository configured with registry authentication
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: my-registry.example.com/my-org/my-app
  interval: 5m
  secretRef:
    name: registry-credentials
```

Create the secret from your Docker config.

```bash
# Create a Docker registry secret for authentication
kubectl create secret docker-registry registry-credentials \
  --namespace flux-system \
  --docker-server=my-registry.example.com \
  --docker-username=my-user \
  --docker-password=my-token
```

For public registries like Docker Hub, you may still need credentials to avoid rate limiting. Docker Hub applies stricter rate limits to unauthenticated requests.

### Incorrect Image Reference

Verify that the image field contains only the image name without a tag or digest.

```yaml
# Correct - no tag or digest
spec:
  image: ghcr.io/my-org/my-app

# Wrong - includes a tag
# spec:
#   image: ghcr.io/my-org/my-app:latest
```

### TLS Certificate Errors

If your registry uses a self-signed certificate, you will see errors such as `x509: certificate signed by unknown authority`. You need to provide the CA certificate.

```yaml
# image-repository-custom-ca.yaml
# ImageRepository with a custom CA certificate for self-signed registries
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: registry.internal.example.com/my-app
  interval: 5m
  certSecretRef:
    name: registry-ca-cert
  secretRef:
    name: registry-credentials
```

Create the CA certificate secret.

```bash
# Create a secret containing the custom CA certificate
kubectl create secret generic registry-ca-cert \
  --namespace flux-system \
  --from-file=ca.crt=/path/to/ca-certificate.pem
```

### Network Connectivity Issues

If the controller cannot reach the registry, you will see timeout or DNS resolution errors. Common causes include:

- Network policies blocking egress from the flux-system namespace
- Missing DNS configuration for internal registries
- Proxy settings not configured on the controller

Check if the controller pod can reach the registry.

```bash
# Test connectivity from the controller pod's network namespace
kubectl run test-registry --rm -it --restart=Never \
  --namespace flux-system \
  --image=curlimages/curl:latest \
  -- curl -v https://my-registry.example.com/v2/
```

### Rate Limiting

Container registries impose rate limits on API calls. Docker Hub, for example, limits unauthenticated pulls to 100 per 6 hours. If you are hitting rate limits, increase the scan interval.

```yaml
# image-repository-longer-interval.yaml
# Increase the scan interval to reduce API calls and avoid rate limits
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: docker.io/my-org/my-app
  interval: 30m
  secretRef:
    name: dockerhub-credentials
```

### Expired or Rotated Credentials

For registries like AWS ECR, tokens expire after 12 hours. If scans worked initially but started failing, the credentials have likely expired. See the dedicated ECR token refresh guide for a solution using CronJobs or IRSA.

Check if your secret is stale.

```bash
# Inspect the creation time of the registry secret
kubectl get secret registry-credentials -n flux-system -o jsonpath='{.metadata.creationTimestamp}'
```

## Step 3: Verify the Fix

After applying your fix, reconcile the ImageRepository immediately instead of waiting for the next interval.

```bash
# Force reconciliation of the ImageRepository
flux reconcile image repository my-app -n flux-system
```

Then check the status again.

```bash
# Confirm the ImageRepository is now scanning successfully
flux get image repository my-app -n flux-system
```

A successful scan will show `Ready: True` and a `Last scan result` with the number of tags found.

## Step 4: Check Tag Filtering

Even when scans succeed, the ImagePolicy may not find a matching tag. Verify that your ImagePolicy filter and policy settings match actual tags in the registry.

```bash
# List all tags discovered by the ImageRepository
kubectl get imagerepository my-app -n flux-system -o jsonpath='{.status.lastScanResult}'
```

If the tag count is zero or unexpectedly low, the image path may be wrong or the registry may have been cleaned up.

## Monitoring Scan Health

Set up alerts to catch scan failures early.

```yaml
# alert-image-scan.yaml
# Alert on ImageRepository scan failures via a notification provider
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: image-scan-failures
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    - kind: ImageRepository
      name: "*"
```

## Conclusion

ImageRepository scan failures in Flux are almost always caused by authentication issues, network problems, or TLS misconfigurations. By systematically checking the resource status, controller logs, and registry connectivity, you can quickly identify and resolve the underlying problem. Setting up alerts ensures you catch scan failures before they delay your deployments.
