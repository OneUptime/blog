# How to Troubleshoot ImagePullBackOff Errors in Portainer - Troubleshoot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, ImagePullBackOff, Troubleshooting, Docker Registry

Description: Diagnose and resolve ImagePullBackOff errors in Kubernetes pods managed via Portainer by checking registry credentials, image names, and network connectivity.

---

ImagePullBackOff means Kubernetes cannot pull the container image for your pod. After a few failed attempts, it enters BackOff and retries with exponential delay. Portainer surfaces this in the pod events view and makes it easy to diagnose the root cause.

## Common Causes

| Cause | Symptom in Events |
|---|---|
| Wrong image name or tag | "repository does not exist" |
| Missing registry credentials | "unauthorized: authentication required" |
| Private registry not configured | "no basic auth credentials" |
| Network unreachable to registry | "dial tcp: connection refused" |
| Image tag deleted | "manifest unknown" |

## Step 1: Read the Pod Events

In Portainer, open the failing pod and check the Events section:

```text
Events:
  Warning  Failed     Failed to pull image "my-registry.internal/api:v1.5": ...
  Normal   BackOff    Back-off pulling image "my-registry.internal/api:v1.5"
  Warning  Failed     Error: ImagePullBackOff
```

The exact error message in the Failed event tells you which cause applies.

## Step 2: Verify the Image Name

Check that the image reference in your stack/manifest is spelled correctly:

```bash
## Verify the image exists and is accessible
docker pull my-registry.internal/api:v1.5

## Check available tags
curl -u user:pass https://my-registry.internal/v2/api/tags/list
```

## Step 3: Check Registry Credentials in Portainer

Go to **Cluster > Registries** in the Kubernetes environment and verify the registry is configured:

1. Registry URL matches the image reference
2. Credentials (username/password) are correct
3. The registry is associated with the correct Portainer environment

## Step 4: Create an Image Pull Secret for Kubernetes

If using Kubernetes, ensure `imagePullSecrets` is referenced in the pod template for your workload:

```yaml
spec:
  template:
    spec:
      imagePullSecrets:
        - name: registry-credentials
      containers:
        - name: api
          image: my-registry.internal/api:v1.5
```

Create the secret:

```bash
kubectl create secret docker-registry registry-credentials   --docker-server=my-registry.internal   --docker-username=user   --docker-password=pass   -n production
```

## Step 5: Test Network Access

If the error indicates a network issue:

```bash
## From inside a debug pod, test registry connectivity
kubectl run debug --image=curlimages/curl --rm -it --restart=Never --command -- /bin/sh
curl -v https://my-registry.internal/v2/
```

## Summary

ImagePullBackOff is almost always caused by an incorrect image reference, missing credentials, or network connectivity to the registry. Portainer's application Events tab shows the exact error message, and the Registries configuration panel lets you update registry configuration and namespace access.
