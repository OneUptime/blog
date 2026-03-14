# How to Set Up Flux with Backup Container Registry Mirror

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Disaster Recovery, Container Registry, Harbor, Image Mirror

Description: Configure a backup container registry mirror for Flux CD to ensure image availability during primary registry outages.

---

## Introduction

Container registry availability is a hidden dependency in most Kubernetes deployments. When Docker Hub rate-limits your pulls, AWS ECR tokens expire, or GCR experiences an outage, newly scheduled pods fail to start and rolling updates halt. For Flux CD environments, this means deployments triggered by image automation or Kustomization reconciliation can stall mid-rollout.

A backup container registry mirror solves this by providing a local copy of your container images. When the primary registry is unreachable, Kubernetes nodes pull from the local mirror instead, and Flux image automation falls back to scanning the mirror. The mirror acts as both a cache and an independent source of truth for your production images.

This guide covers setting up Harbor as a pull-through cache and standalone registry mirror, configuring Flux image automation to use it, and handling automatic failover at the node level.

## Prerequisites

- Kubernetes cluster with Flux CD installed
- Storage available for Harbor (at least 100GB for a meaningful cache)
- DNS for the internal registry (e.g., `harbor.internal.example.com`)
- TLS certificate for the registry (cert-manager recommended)
- `flux` and `kubectl` CLI tools

## Step 1: Deploy Harbor as a Registry Mirror

Harbor is a CNCF-graduated registry that supports pull-through proxying and can serve as a full standalone registry.

```yaml
# infrastructure/harbor/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: harbor
  namespace: harbor
spec:
  interval: 10m
  chart:
    spec:
      chart: harbor
      version: "1.14.x"
      sourceRef:
        kind: HelmRepository
        name: harbor
        namespace: flux-system
  values:
    expose:
      type: ingress
      tls:
        enabled: true
        certSource: secret
        secret:
          secretName: harbor-tls
      ingress:
        hosts:
          core: harbor.internal.example.com
    externalURL: https://harbor.internal.example.com
    persistence:
      persistentVolumeClaim:
        registry:
          size: 200Gi
        database:
          size: 10Gi
        redis:
          size: 5Gi
    harborAdminPassword:
      existingSecret: harbor-admin-secret
```

```yaml
# HelmRepository for Harbor chart
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: harbor
  namespace: flux-system
spec:
  interval: 1h
  url: https://helm.goharbor.io
```

## Step 2: Create Proxy Projects in Harbor

Configure Harbor proxy cache projects for each upstream registry your cluster uses.

```bash
# Using Harbor API to create proxy projects
# Docker Hub proxy
curl -u "admin:$HARBOR_PASSWORD" \
  -X POST "https://harbor.internal.example.com/api/v2.0/registries" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "dockerhub-proxy",
    "type": "docker-hub",
    "url": "https://hub.docker.com",
    "credential": {
      "type": "basic",
      "access_key": "'"$DOCKERHUB_USER"'",
      "access_secret": "'"$DOCKERHUB_TOKEN"'"
    }
  }'

# ECR proxy
curl -u "admin:$HARBOR_PASSWORD" \
  -X POST "https://harbor.internal.example.com/api/v2.0/registries" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ecr-proxy",
    "type": "aws-ecr",
    "url": "https://123456789.dkr.ecr.us-east-1.amazonaws.com",
    "credential": {
      "type": "basic",
      "access_key": "'"$AWS_ACCESS_KEY_ID"'",
      "access_secret": "'"$AWS_SECRET_ACCESS_KEY"'"
    }
  }'
```

## Step 3: Configure containerd to Use the Mirror

Update the containerd configuration on each node to use Harbor as a mirror. On managed Kubernetes clusters, use a DaemonSet.

```yaml
# DaemonSet to configure containerd mirror settings
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: configure-registry-mirrors
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: configure-registry-mirrors
  template:
    metadata:
      labels:
        name: configure-registry-mirrors
    spec:
      hostPID: true
      hostNetwork: true
      initContainers:
        - name: configure
          image: alpine:3.19
          securityContext:
            privileged: true
          command:
            - /bin/sh
            - -c
            - |
              mkdir -p /host/etc/containerd/certs.d/docker.io
              cat > /host/etc/containerd/certs.d/docker.io/hosts.toml << 'EOF'
              server = "https://registry-1.docker.io"

              [host."https://harbor.internal.example.com/v2/dockerhub-proxy"]
                capabilities = ["pull", "resolve"]
                skip_verify = false
              EOF
          volumeMounts:
            - name: etc-containerd
              mountPath: /host/etc/containerd
      containers:
        - name: pause
          image: gcr.io/google-containers/pause:3.9
      volumes:
        - name: etc-containerd
          hostPath:
            path: /etc/containerd
```

## Step 4: Configure Flux to Use the Mirror for Image Automation

Point Flux's ImageRepository resources at Harbor instead of the upstream registry.

```yaml
# Updated ImageRepository using Harbor mirror
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  # Point at Harbor proxy project
  image: harbor.internal.example.com/ecr-proxy/my-org/my-app
  interval: 5m
  secretRef:
    name: harbor-credentials
```

```bash
# Create Harbor credentials for Flux
kubectl create secret docker-registry harbor-credentials \
  -n flux-system \
  --docker-server=harbor.internal.example.com \
  --docker-username=robot-flux \
  --docker-password="$HARBOR_ROBOT_TOKEN"
```

## Step 5: Mirror Critical Images Proactively

For images you know you need in production, push them to Harbor proactively rather than waiting for the pull-through cache to warm up.

```bash
#!/bin/bash
# pre-cache-images.sh - Run regularly to ensure images are in Harbor
IMAGES=(
  "nginx:1.25"
  "redis:7.2"
  "postgres:16"
  "my-org/my-app:v1.2.3"
)

for IMAGE in "${IMAGES[@]}"; do
  echo "Mirroring $IMAGE to Harbor..."
  docker pull "$IMAGE"
  docker tag "$IMAGE" "harbor.internal.example.com/mirror/$IMAGE"
  docker push "harbor.internal.example.com/mirror/$IMAGE"
done
```

Run this as a Kubernetes CronJob to keep the cache warm for critical images.

## Step 6: Monitor Harbor Health with Flux

Add a Flux health check to ensure Harbor is available.

```yaml
# Monitor Harbor availability
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: harbor
  namespace: flux-system
spec:
  interval: 5m
  path: ./infrastructure/harbor
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: harbor-core
      namespace: harbor
    - apiVersion: apps/v1
      kind: Deployment
      name: harbor-registry
      namespace: harbor
```

## Best Practices

- Use Harbor's replication rules to proactively sync critical images from upstreams on a schedule.
- Store Harbor on a separate storage class with redundancy (RAID or cloud managed disk).
- Automate Harbor credential rotation and store credentials in your secret manager.
- Configure Harbor rate limiting to prevent exhausting upstream registries during cache warming.
- Monitor Harbor disk usage — a full cache disk will cause pull failures, not fallback to upstream.
- Test the mirror path by temporarily blocking access to the primary registry in a staging environment.

## Conclusion

A Harbor-based container registry mirror eliminates your dependency on external registry availability during deployments. With containerd mirror configuration on every node and Flux image automation pointing at Harbor, your cluster can operate independently of upstream registries for extended periods. The investment in setting up and maintaining the mirror pays for itself the first time your primary registry experiences an outage during a critical deployment.
