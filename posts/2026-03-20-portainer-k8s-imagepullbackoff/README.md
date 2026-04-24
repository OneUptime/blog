# How to Troubleshoot ImagePullBackOff Errors in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, ImagePullBackOff, Troubleshooting, Docker

Description: Diagnose and resolve Kubernetes ImagePullBackOff errors for pods managed through Portainer.

## Introduction

ImagePullBackOff occurs when Kubernetes cannot pull the container image. This can be due to incorrect image names, missing tags, authentication failures, or network issues. Portainer surfaces this error in its Applications view, and this guide shows how to diagnose and fix it.

## Identifying ImagePullBackOff in Portainer

1. **Kubernetes > Applications**: Pods show status "ImagePullBackOff" or "ErrImagePull"
2. **Pod > Events**: Shows "Failed to pull image" with the specific error

## Common Causes and Solutions

### Cause 1: Wrong Image Name or Tag

```bash
# Check the exact error

kubectl describe pod failing-pod -n production | grep -A5 "Events"
# Example error:
# Failed to pull image "myapp:lates": rpc error: code = NotFound

# Fix: Update deployment with correct image tag
# In Portainer: Applications > Your App > Edit > Update image tag

# Verify image exists
docker pull myapp:latest
# Or inspect the manifest without pulling layers
docker manifest inspect myapp:latest
```

### Cause 2: Private Registry Authentication

```bash
# Create a registry credential secret
kubectl create secret docker-registry registry-credentials \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password=mypassword \
  --docker-email=myemail@example.com \
  -n production

# Add imagePullSecrets to the deployment
kubectl patch deployment myapp -n production -p '{
  "spec": {
    "template": {
      "spec": {
        "imagePullSecrets": [{"name": "registry-credentials"}]
      }
    }
  }
}'
```

### Configuring in Portainer

```yaml
# deployment-with-registry.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
spec:
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      imagePullSecrets:
      - name: registry-credentials   # Must be created first
      containers:
      - name: app
        image: registry.example.com/myorg/myapp:1.2.3
```

Also configure in Portainer: **Cluster > Registries > Add Registry**

### Cause 3: Registry Not Accessible from Cluster

```bash
# Test connectivity from within the cluster
kubectl run test --rm -it --restart=Never --image=busybox \
  -n production -- nslookup registry.example.com

# Check if registry is accessible
kubectl run test --rm -it --restart=Never --image=busybox \
  -n production -- wget -qO- https://registry.example.com/v2/

# If your nodes use Docker as the container runtime, configure the Docker daemon proxy settings
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "proxies": {
    "http-proxy": "http://proxy.example.com:3128",
    "https-proxy": "http://proxy.example.com:3128",
    "no-proxy": "localhost,127.0.0.1,10.0.0.0/8"
  }
}
EOF
sudo systemctl restart docker
```

### Cause 4: Image Not Found (404)

```bash
# Verify image exists in registry
docker manifest inspect myimage:mytag

# For an insecure private registry (HTTP or self-signed cert)
docker manifest inspect \
  --insecure registry.example.com/myimage:mytag

# If your registry accepts basic auth, list tags directly
curl -s -u user:password \
  https://registry.example.com/v2/myimage/tags/list
```

## Diagnostic Script

```bash
#!/bin/bash
# diagnose-imagepullbackoff.sh

POD_NAME="$1"
NAMESPACE="${2:-default}"

echo "Diagnosing ImagePullBackOff for $POD_NAME in $NAMESPACE"

# Get the failing image
IMAGE=$(kubectl get pod "$POD_NAME" -n "$NAMESPACE" \
  -o jsonpath='{.spec.containers[0].image}')
echo "Image: $IMAGE"

# Get events
echo ""
echo "Events:"
kubectl describe pod "$POD_NAME" -n "$NAMESPACE" | grep -A20 "Events:"

# Check imagePullSecrets
echo ""
echo "ImagePullSecrets:"
IMAGE_PULL_SECRETS=$(kubectl get pod "$POD_NAME" -n "$NAMESPACE" \
  -o jsonpath='{.spec.imagePullSecrets[*].name}')
echo "${IMAGE_PULL_SECRETS:-None}"

# Check registry credentials exist
echo ""
echo "Registry secrets in namespace:"
kubectl get secrets -n "$NAMESPACE" --field-selector type=kubernetes.io/dockerconfigjson
```

## Portainer Registry Management

1. **Portainer > Cluster > Registries > Add Registry**
2. Select the appropriate registry type (Docker Hub, ECR, custom, or another supported provider)
3. Enter credentials
4. Grant the target namespace access to the registry, then select it when deploying the application

## Conclusion

ImagePullBackOff is always caused by the cluster's inability to pull the specified image. Systematic diagnosis via Portainer's pod events view reveals the specific cause-wrong image name, authentication failure, or network connectivity. Portainer's Registry management feature simplifies credential management for private registries across multiple environments.
