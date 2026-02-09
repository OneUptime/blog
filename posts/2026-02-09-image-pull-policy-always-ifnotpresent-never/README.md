# How to Configure imagePullPolicy and Always, IfNotPresent, Never Strategies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Containers, Images

Description: Master Kubernetes imagePullPolicy settings with Always, IfNotPresent, and Never strategies to control when container images are pulled, optimize startup time, and manage registry bandwidth effectively.

---

Every time Kubernetes starts a container, it must ensure the container image is available on the node. The imagePullPolicy determines when Kubernetes pulls images from the registry. The wrong policy wastes bandwidth pulling unnecessary images or runs outdated code by not pulling new versions.

Understanding imagePullPolicy helps you balance freshness, startup speed, and registry load. Different workloads need different strategies.

## Understanding Image Pull Policies

Kubernetes offers three image pull policies:

Always pulls the image every time the container starts, even if the image exists locally. Use Always when you need the latest version.

IfNotPresent only pulls the image if it does not exist on the node. Use IfNotPresent for stable tagged images to save bandwidth.

Never never pulls images. The image must already exist on the node or the container fails to start. Use Never for pre-loaded images or air-gapped environments.

The default policy depends on the image tag. Images tagged :latest default to Always. Images with specific version tags default to IfNotPresent.

## Always Pull Policy

Always pulls the image on every container start:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: always-pull-pod
spec:
  containers:
  - name: app
    image: myregistry.com/myapp:latest
    imagePullPolicy: Always
```

This ensures you always get the latest image, even if the tag has been overwritten.

Use cases for Always:
- Development environments with frequently updated images
- Images tagged :latest
- Continuous deployment with image overwrites
- When you need guaranteed fresh images

Deployment with Always:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dev-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dev-app
  template:
    metadata:
      labels:
        app: dev-app
    spec:
      containers:
      - name: app
        image: dev-registry.com/app:latest
        imagePullPolicy: Always
```

Every pod restart pulls the latest image, ensuring you run the newest code.

## IfNotPresent Pull Policy

IfNotPresent checks if the image exists locally before pulling:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ifnotpresent-pod
spec:
  containers:
  - name: app
    image: myregistry.com/myapp:v1.2.3
    imagePullPolicy: IfNotPresent
```

If the node already has myapp:v1.2.3, it uses the local copy. Otherwise, it pulls from the registry.

Use cases for IfNotPresent:
- Production deployments with immutable tags
- Optimizing startup time
- Reducing registry bandwidth
- Offline or slow registry access

Deployment with IfNotPresent:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prod-app
spec:
  replicas: 10
  selector:
    matchLabels:
      app: prod-app
  template:
    metadata:
      labels:
        app: prod-app
    spec:
      containers:
      - name: app
        image: prod-registry.com/app:v2.5.1
        imagePullPolicy: IfNotPresent
```

After the first pod pulls the image, subsequent pods on the same node use the cached image, starting faster.

## Never Pull Policy

Never refuses to pull images from the registry:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: never-pull-pod
spec:
  containers:
  - name: app
    image: myapp:v1.0.0
    imagePullPolicy: Never
```

The image must exist on the node or the pod fails with ImagePullBackOff.

Use cases for Never:
- Air-gapped environments
- Pre-loaded images on nodes
- Testing with locally built images
- Reducing external dependencies

Pre-loading images:

```bash
# On each node, manually load the image
docker pull myapp:v1.0.0

# Or load from a tar file
docker load -i myapp-v1.0.0.tar
```

Then deploy pods with imagePullPolicy: Never.

## Default Pull Policy Behavior

Kubernetes sets default policies based on the image tag:

```yaml
# Uses Always (latest tag)
image: myapp:latest

# Uses IfNotPresent (specific tag)
image: myapp:v1.2.3

# Uses IfNotPresent (no tag defaults to latest but policy is IfNotPresent)
image: myapp
```

Explicitly set imagePullPolicy to override defaults:

```yaml
# Force IfNotPresent even with :latest tag
image: myapp:latest
imagePullPolicy: IfNotPresent
```

This reduces pulls but risks running stale images if the tag is reused.

## Impact on Startup Time

Image pull policy significantly affects pod startup time.

With Always policy:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: always-test
spec:
  containers:
  - name: app
    image: nginx:latest
    imagePullPolicy: Always
```

Measure startup time:

```bash
kubectl apply -f always-test.yaml
kubectl get pod always-test -w
```

Each start includes pull time. For a 500MB image over slow network, this adds 30+ seconds.

With IfNotPresent policy:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ifnotpresent-test
spec:
  containers:
  - name: app
    image: nginx:1.25.0
    imagePullPolicy: IfNotPresent
```

First start pulls the image. Subsequent starts skip the pull, starting in seconds.

## Multi-Container Pods

Each container can have its own pull policy:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-container-pod
spec:
  containers:
  - name: app
    image: myapp:v1.2.3
    imagePullPolicy: IfNotPresent
  - name: sidecar
    image: sidecar:latest
    imagePullPolicy: Always
  - name: init-tools
    image: tools:stable
    imagePullPolicy: Never
```

The app uses a stable version with IfNotPresent. The sidecar always gets the latest version. Tools must be pre-loaded.

## Image Pull Secrets

Image pull policies work with private registries using imagePullSecrets:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: private-registry-pod
spec:
  imagePullSecrets:
  - name: regcred
  containers:
  - name: app
    image: private-registry.com/myapp:v1.0.0
    imagePullPolicy: IfNotPresent
```

The secret provides authentication for pulling images.

Create image pull secret:

```bash
kubectl create secret docker-registry regcred \
  --docker-server=private-registry.com \
  --docker-username=myuser \
  --docker-password=mypassword \
  --docker-email=myemail@example.com
```

## Development vs Production Strategies

Development environment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dev-deployment
  namespace: development
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
      env: dev
  template:
    metadata:
      labels:
        app: myapp
        env: dev
    spec:
      containers:
      - name: app
        image: dev-registry.com/myapp:latest
        imagePullPolicy: Always  # Always get fresh code
```

Production environment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prod-deployment
  namespace: production
spec:
  replicas: 10
  selector:
    matchLabels:
      app: myapp
      env: prod
  template:
    metadata:
      labels:
        app: myapp
        env: prod
    spec:
      containers:
      - name: app
        image: prod-registry.com/myapp:v2.5.1  # Specific immutable tag
        imagePullPolicy: IfNotPresent  # Cache for faster scaling
```

## Handling Image Updates

Update strategy with IfNotPresent:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 5
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myregistry.com/myapp:v1.2.4  # Updated version
        imagePullPolicy: IfNotPresent
```

When you update the image tag, Kubernetes pulls the new image because the tag differs from cached images.

Force pull with Always:

```yaml
containers:
- name: app
  image: myregistry.com/myapp:v1.2.4
  imagePullPolicy: Always
```

Guarantees the latest image is pulled even if v1.2.4 was previously cached.

## Troubleshooting Image Pull Issues

Check image pull status:

```bash
kubectl describe pod my-pod
```

Look for events:

```
Events:
  Type     Reason     Message
  ----     ------     -------
  Normal   Pulling    Pulling image "myapp:v1.0.0"
  Normal   Pulled     Successfully pulled image
```

Or errors:

```
Warning  Failed     Failed to pull image "myapp:v1.0.0": rpc error: code = NotFound
Warning  Failed     Error: ImagePullBackOff
```

Common issues:

Image not found (wrong tag or repository):

```bash
# Verify image exists
docker pull myregistry.com/myapp:v1.0.0
```

Authentication failed:

```bash
# Check image pull secret exists
kubectl get secret regcred

# Verify secret data
kubectl get secret regcred -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d
```

Network issues preventing pull:

```bash
# Test registry connectivity from node
curl https://myregistry.com/v2/
```

Image too large for node:

```bash
# Check node disk space
kubectl describe node worker-node-1 | grep -A 5 "Capacity:"
```

## Optimizing Registry Bandwidth

For clusters with many nodes, Always policy creates excessive registry load.

Use IfNotPresent with immutable tags:

```yaml
containers:
- name: app
  image: myregistry.com/myapp:v1.2.3-20260209-abc123
  imagePullPolicy: IfNotPresent
```

Include commit hash or build timestamp in tags to ensure uniqueness while enabling caching.

Pre-pull images on nodes:

```bash
# DaemonSet to pre-pull images
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: image-prepuller
spec:
  selector:
    matchLabels:
      name: prepuller
  template:
    metadata:
      labels:
        name: prepuller
    spec:
      initContainers:
      - name: prepull-app
        image: myregistry.com/myapp:v1.2.3
        imagePullPolicy: IfNotPresent
        command: ['sh', '-c', 'echo Image pulled']
      containers:
      - name: pause
        image: gcr.io/google_containers/pause:3.1
```

This pulls the image to all nodes, then actual workloads use IfNotPresent to use the cached image.

## Air-Gapped Environments

For clusters without internet access, use Never policy with pre-loaded images.

Load images on all nodes:

```bash
#!/bin/bash
# load-images.sh

IMAGES=(
  "myapp:v1.0.0"
  "nginx:1.25.0"
  "postgres:14"
)

for img in "${IMAGES[@]}"; do
  echo "Loading $img"
  docker load -i "${img//:/-}.tar"
done
```

Deploy workloads with Never policy:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: airgap-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: airgap
  template:
    metadata:
      labels:
        app: airgap
    spec:
      containers:
      - name: app
        image: myapp:v1.0.0
        imagePullPolicy: Never
```

## Monitoring Image Pulls

Track image pull metrics:

```bash
# Count image pulls
kubectl get events -A | grep "Pulling image" | wc -l

# Find which images are pulled most
kubectl get events -A -o json | jq -r '.items[] | select(.reason == "Pulling") | .message' | sort | uniq -c | sort -rn
```

Alert on failed pulls:

```yaml
# PrometheusRule
groups:
- name: image-pull-alerts
  rules:
  - alert: ImagePullFailed
    expr: |
      kube_pod_container_status_waiting_reason{reason="ImagePullBackOff"} > 0
    for: 5m
    annotations:
      summary: "Pod {{ $labels.pod }} cannot pull image"
```

Monitor registry bandwidth:

```bash
# Check registry metrics (registry-specific)
curl http://registry.example.com/metrics
```

## Best Practices

Use IfNotPresent for production workloads with immutable tags. This balances freshness with startup speed.

Use Always for development environments with :latest tags to ensure fresh code.

Use Never only in air-gapped environments or when images are guaranteed to be pre-loaded.

Tag images with version numbers, not :latest in production. This enables IfNotPresent caching.

Include build metadata in tags (commit hash, timestamp) for unique, immutable tags.

Pre-pull images to nodes before deploying large-scale updates.

Monitor image pull failures and registry bandwidth.

Document which policy is used and why for each deployment.

Test image pull policies in development before production deployment.

## Conclusion

imagePullPolicy controls when Kubernetes pulls container images from registries. Use Always for development with frequently changing images, IfNotPresent for production with immutable tags, and Never for air-gapped environments.

Choose policies that balance image freshness, startup speed, and registry bandwidth. Use immutable tags with IfNotPresent for optimal production performance. Monitor image pull operations and troubleshoot failures systematically.

Master imagePullPolicy configuration to optimize container startup time and manage registry resources effectively.
