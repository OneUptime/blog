# How to Configure K3s with Embedded Registry Mirror for Air-Gapped Edge Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, K3s, Air-Gapped

Description: Learn how to set up K3s with an embedded registry mirror for air-gapped edge deployments, enabling container image distribution without internet access or external registry dependencies.

---

Air-gapped edge environments like military installations, secure facilities, and remote industrial sites have no internet connectivity. Container images must be pre-loaded and distributed through local registries. K3s supports embedded registry mirrors that cache images locally, enabling fully disconnected operations.

In this guide, you'll configure K3s with registry mirrors, pre-load images, and implement image distribution strategies for air-gapped deployments.

## Understanding Registry Mirrors

Registry mirrors act as pull-through caches. When a node needs an image, it first checks the mirror. If the image exists locally, it's served immediately. If not found, the mirror attempts to pull from upstream (if connectivity exists) and caches it for future use.

For air-gapped deployments, you pre-populate the mirror with all required images before deployment.

## Installing K3s with Registry Configuration

Create registry configuration before installing K3s:

```bash
sudo mkdir -p /etc/rancher/k3s
sudo tee /etc/rancher/k3s/registries.yaml > /dev/null <<EOF
mirrors:
  docker.io:
    endpoint:
      - "http://registry.local:5000"
  ghcr.io:
    endpoint:
      - "http://registry.local:5000"
  quay.io:
    endpoint:
      - "http://registry.local:5000"
EOF
```

Install K3s:

```bash
curl -sfL https://get.k3s.io | sh -s - server --write-kubeconfig-mode 644
```

K3s reads the registry configuration and uses local mirrors for all image pulls.

## Deploying Local Container Registry

Deploy a registry on your edge network:

```yaml
# local-registry.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: registry
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: registry
  template:
    metadata:
      labels:
        app: registry
    spec:
      containers:
        - name: registry
          image: registry:2
          ports:
            - containerPort: 5000
          volumeMounts:
            - name: storage
              mountPath: /var/lib/registry
          env:
            - name: REGISTRY_STORAGE_DELETE_ENABLED
              value: "true"
      volumes:
        - name: storage
          hostPath:
            path: /var/lib/registry
            type: DirectoryOrCreate
---
apiVersion: v1
kind: Service
metadata:
  name: registry
  namespace: kube-system
spec:
  selector:
    app: registry
  ports:
    - port: 5000
      targetPort: 5000
  type: ClusterIP
```

## Pre-Loading Images

Create a script to pre-load all required images:

```bash
#!/bin/bash
# pre-load-images.sh

REGISTRY="registry.local:5000"

# List of required images
IMAGES=(
  "nginx:alpine"
  "postgres:15-alpine"
  "redis:7-alpine"
  "busybox:latest"
)

for image in "${IMAGES[@]}"; do
  echo "Processing $image..."

  # Pull image
  docker pull $image

  # Tag for local registry
  local_tag="$REGISTRY/$image"
  docker tag $image $local_tag

  # Push to local registry
  docker push $local_tag

  echo "Loaded $image to local registry"
done
```

## Creating Image Bundles

For completely air-gapped environments, create image tarballs:

```bash
# create-image-bundle.sh
#!/bin/bash

# Save images to tarball
docker save \
  nginx:alpine \
  postgres:15-alpine \
  redis:7-alpine \
  > images-bundle.tar

# Compress for transfer
gzip images-bundle.tar

echo "Image bundle created: images-bundle.tar.gz"
```

At the edge site:

```bash
# Load images from bundle
gunzip images-bundle.tar.gz
sudo k3s ctr images import images-bundle.tar

# Verify images loaded
sudo k3s crictl images
```

## Configuring Image Pull Policy

Ensure pods use local images:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:alpine
          imagePullPolicy: IfNotPresent  # Use local if available
```

## Setting Up Automated Image Sync

For edge sites with periodic connectivity, sync images automatically:

```yaml
# image-sync-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: image-sync
  namespace: kube-system
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: sync
              image: docker:dind
              command:
                - /bin/sh
                - -c
                - |
                  # Check if upstream registry is reachable
                  if wget -q --spider https://registry-1.docker.io/v2/; then
                    echo "Upstream reachable, syncing images"

                    # Pull and cache popular images
                    for tag in alpine:latest nginx:alpine postgres:15; do
                      docker pull $tag
                      docker tag $tag registry.local:5000/$tag
                      docker push registry.local:5000/$tag
                    done
                  else
                    echo "Upstream unreachable, skipping sync"
                  fi
          restartPolicy: OnFailure
```

## Implementing Private Registry with Authentication

Secure the registry with authentication:

```bash
# Create htpasswd file
htpasswd -Bbn admin password > /tmp/htpasswd

# Create secret
kubectl create secret generic registry-auth \
  -n kube-system \
  --from-file=/tmp/htpasswd
```

Update registry deployment:

```yaml
spec:
  containers:
    - name: registry
      image: registry:2
      env:
        - name: REGISTRY_AUTH
          value: htpasswd
        - name: REGISTRY_AUTH_HTPASSWD_PATH
          value: /auth/htpasswd
        - name: REGISTRY_AUTH_HTPASSWD_REALM
          value: "Registry Realm"
      volumeMounts:
        - name: auth
          mountPath: /auth
  volumes:
    - name: auth
      secret:
        secretName: registry-auth
```

Configure K3s to use credentials:

```yaml
# /etc/rancher/k3s/registries.yaml
mirrors:
  registry.local:5000:
    endpoint:
      - "http://registry.local:5000"
configs:
  "registry.local:5000":
    auth:
      username: admin
      password: password
```

## Monitoring Registry Usage

Track registry metrics:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: registry-metrics
  namespace: kube-system
  labels:
    app: registry
spec:
  ports:
    - name: metrics
      port: 5001
      targetPort: 5001
  selector:
    app: registry
```

## Garbage Collection

Clean up unused images:

```bash
# Run registry garbage collection
kubectl exec -n kube-system deployment/registry -- \
  registry garbage-collect /etc/docker/registry/config.yml --delete-untagged
```

## Creating Image Distribution Pipeline

Automate image distribution to multiple edge sites:

```bash
#!/bin/bash
# distribute-images.sh

SITES=("site-a" "site-b" "site-c")
IMAGE_BUNDLE="images-$(date +%Y%m%d).tar.gz"

# Create bundle
docker save $(docker images -q) | gzip > $IMAGE_BUNDLE

# Distribute to sites (via USB, satellite link, etc.)
for site in "${SITES[@]}"; do
  echo "Distributing to $site"
  # Copy to site-specific location
  cp $IMAGE_BUNDLE /mnt/distribution/$site/
done
```

## Conclusion

K3s registry mirrors enable reliable container image distribution in air-gapped edge environments. By pre-loading images, implementing local registries, and automating distribution, you create deployment pipelines that work without internet connectivity.
