# How to Handle Container Registry Outages with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Container Registry, outage, Disaster Recovery, Kubernetes, GitOps

Description: A practical guide to keeping Flux CD deployments functional when container registries become unavailable.

---

Container registry outages can halt deployments and prevent pods from starting. When your registry goes down, Flux CD cannot pull new images, and Kubernetes cannot restart existing pods that require image pulls. This guide covers strategies to handle registry outages gracefully.

## Understanding the Impact of Registry Outages

A container registry outage affects Flux CD in two ways:

1. **Image automation stops** - The image-reflector-controller cannot scan for new tags
2. **Deployments fail** - New pods cannot pull container images

Existing running pods are not affected unless they restart, because images are already cached on the node.

## Detecting Registry Outages

### Alert on Image Scan Failures

```yaml
# alerts/registry-outage-alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-registry
  namespace: flux-system
spec:
  type: slack
  channel: registry-alerts
  secretRef:
    name: slack-webhook-url
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: registry-outage-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-registry
  eventSeverity: error
  eventSources:
    # Watch image repositories for scan failures
    - kind: ImageRepository
      name: "*"
    # Watch HelmRepository for chart pull failures
    - kind: HelmRepository
      name: "*"
```

### Prometheus Monitoring for Registry Health

```yaml
# monitoring/registry-health-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: registry-health
  namespace: flux-system
spec:
  groups:
    - name: registry-health
      rules:
        # Alert when image scans are failing
        - alert: ImageScanFailing
          expr: |
            gotk_resource_info{
              kind="ImageRepository",
              ready="False"
            } == 1
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Image scan failing for {{ $labels.name }}"

        # Alert when Helm chart pulls are failing
        - alert: HelmChartPullFailing
          expr: |
            gotk_resource_info{
              kind="HelmChart",
              ready="False"
            } == 1
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "Helm chart pull failing for {{ $labels.name }}"
```

## Strategy 1: Configure Image Pull Policies

Set `imagePullPolicy` to prevent unnecessary pulls when images are already cached.

```yaml
# apps/production/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: registry.example.com/my-app:v1.2.3
          # IfNotPresent prevents pulling if the image
          # is already cached on the node
          imagePullPolicy: IfNotPresent
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
```

## Strategy 2: Use a Registry Mirror or Pull-Through Cache

### Deploy a Pull-Through Cache

```yaml
# infrastructure/registry-cache/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: registry-cache
  namespace: registry-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: registry-cache
  template:
    metadata:
      labels:
        app: registry-cache
    spec:
      containers:
        - name: registry
          image: registry:2
          ports:
            - containerPort: 5000
          env:
            # Configure as a pull-through cache for Docker Hub
            - name: REGISTRY_PROXY_REMOTEURL
              value: "https://registry-1.docker.io"
            - name: REGISTRY_STORAGE_DELETE_ENABLED
              value: "true"
            # Cache images for 7 days
            - name: REGISTRY_PROXY_TTL
              value: "168h"
          volumeMounts:
            - name: registry-data
              mountPath: /var/lib/registry
      volumes:
        - name: registry-data
          persistentVolumeClaim:
            claimName: registry-cache-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: registry-cache
  namespace: registry-system
spec:
  selector:
    app: registry-cache
  ports:
    - port: 5000
      targetPort: 5000
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: registry-cache-pvc
  namespace: registry-system
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
```

### Configure Containerd to Use the Cache

```bash
# On each node, configure containerd to use the pull-through cache
# /etc/containerd/config.toml

# Add the following mirror configuration:
cat <<'EOF'
[plugins."io.containerd.grpc.v1.cri".registry.mirrors."docker.io"]
  endpoint = ["http://registry-cache.registry-system.svc:5000"]

[plugins."io.containerd.grpc.v1.cri".registry.mirrors."ghcr.io"]
  endpoint = ["http://registry-cache.registry-system.svc:5000"]
EOF
```

## Strategy 3: Multi-Registry Image Replication

Replicate critical images across multiple registries.

```yaml
# ci/replicate-images.yaml
# GitHub Actions workflow to replicate images
name: Replicate Images
on:
  workflow_dispatch:
  schedule:
    # Run daily to keep mirrors in sync
    - cron: "0 2 * * *"

jobs:
  replicate:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        image:
          - source: "docker.io/library/nginx:1.25"
            target: "ghcr.io/org/mirrors/nginx:1.25"
          - source: "docker.io/library/redis:7"
            target: "ghcr.io/org/mirrors/redis:7"
    steps:
      - name: Copy image
        uses: akhilerm/tag-push-action@v2.2.0
        with:
          src: ${{ matrix.image.source }}
          dst: ${{ matrix.image.target }}
```

### Configure Flux Image Automation with Multiple Registries

```yaml
# image-automation/image-repo-primary.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app-primary
  namespace: flux-system
spec:
  image: registry.example.com/my-app
  interval: 5m
  secretRef:
    name: primary-registry-creds
---
# image-automation/image-repo-backup.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app-backup
  namespace: flux-system
spec:
  image: ghcr.io/org/my-app
  interval: 5m
  secretRef:
    name: ghcr-creds
  # Suspend by default; activate during primary outage
  suspend: true
```

## Strategy 4: Helm Chart OCI Mirroring

Mirror Helm charts to a secondary OCI registry.

```bash
# Pull chart from primary registry
helm pull oci://registry.example.com/charts/my-chart --version 1.2.3

# Push to backup registry
helm push my-chart-1.2.3.tgz oci://ghcr.io/org/charts/
```

```yaml
# Configure Flux HelmRepository with primary and backup
# infrastructure/helm-repos/primary.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-charts
  namespace: flux-system
spec:
  type: oci
  interval: 10m
  url: oci://registry.example.com/charts
  secretRef:
    name: primary-registry-creds
---
# infrastructure/helm-repos/backup.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-charts-backup
  namespace: flux-system
spec:
  type: oci
  interval: 10m
  url: oci://ghcr.io/org/charts
  secretRef:
    name: ghcr-creds
  suspend: true
```

## Strategy 5: Pre-Pull Critical Images

Ensure critical images are cached on all nodes before they are needed.

```yaml
# infrastructure/image-prepull/daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: image-prepull
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: image-prepull
  template:
    metadata:
      labels:
        app: image-prepull
    spec:
      # Use init containers to pull images, then sleep forever
      initContainers:
        - name: pull-nginx
          image: registry.example.com/nginx:1.25
          command: ["sh", "-c", "echo pulled"]
        - name: pull-redis
          image: registry.example.com/redis:7
          command: ["sh", "-c", "echo pulled"]
        - name: pull-app
          image: registry.example.com/my-app:v1.2.3
          command: ["sh", "-c", "echo pulled"]
      containers:
        - name: pause
          image: registry.k8s.io/pause:3.9
          resources:
            requests:
              cpu: 1m
              memory: 1Mi
```

## Handling an Active Registry Outage

When a registry outage is detected, follow this runbook.

```bash
# Step 1: Suspend image automation to prevent failed updates
flux suspend image repository --all -n flux-system
flux suspend image update --all -n flux-system

# Step 2: Check which pods are affected
kubectl get pods -A --field-selector status.phase!=Running | grep ImagePull

# Step 3: Scale down and scale up affected deployments
# (forces use of cached images with IfNotPresent policy)
kubectl get pods -A | grep -E "ImagePull|ErrImagePull" | \
  awk '{print $1, $2}' | while read ns pod; do
    echo "Pod $pod in namespace $ns has image pull errors"
  done

# Step 4: If using a mirror, switch HelmRepository sources
kubectl patch helmrepository my-charts -n flux-system \
  --type=merge -p '{"spec":{"suspend":true}}'
kubectl patch helmrepository my-charts-backup -n flux-system \
  --type=merge -p '{"spec":{"suspend":false}}'

# Step 5: Update HelmReleases to use backup chart source
kubectl patch helmrelease my-app -n default \
  --type=merge \
  -p '{"spec":{"chart":{"spec":{"sourceRef":{"name":"my-charts-backup"}}}}}'
```

## Recovery After a Registry Outage

```bash
# Step 1: Verify the registry is back
crane ping registry.example.com

# Step 2: Switch back to primary sources
kubectl patch helmrepository my-charts -n flux-system \
  --type=merge -p '{"spec":{"suspend":false}}'
kubectl patch helmrepository my-charts-backup -n flux-system \
  --type=merge -p '{"spec":{"suspend":true}}'

# Step 3: Resume image automation
flux resume image repository --all -n flux-system
flux resume image update --all -n flux-system

# Step 4: Force reconciliation
flux reconcile source helm my-charts -n flux-system
flux reconcile image repository my-app-primary -n flux-system

# Step 5: Verify everything is healthy
flux get sources all -A
flux get image all -A
```

## Best Practices

1. **Use pull-through caches** - Deploy registry mirrors inside your cluster to cache images locally
2. **Set IfNotPresent** - Avoid unnecessary image pulls that fail during outages
3. **Replicate critical images** - Mirror essential images to multiple registries
4. **Pre-pull on nodes** - Use DaemonSets to cache critical images on every node
5. **Monitor scan health** - Alert on ImageRepository and HelmRepository failures
6. **Suspend automation** - Pause image updates during registry outages to prevent bad state
7. **Test failover** - Regularly verify that your registry failover procedures work correctly
