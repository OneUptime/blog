# How to Configure Flux Reconciliation for Disconnected Edge Sites

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Edge Computing, GitOps, Disconnected, Air-Gapped

Description: Set up Flux CD to reconcile from local sources at disconnected edge sites, enabling full GitOps operation without internet connectivity.

---

## Introduction

Some edge deployments operate in environments with no persistent internet connectivity - military installations, offshore platforms, underground mining operations, and classified government facilities all require air-gapped or occasionally-connected Kubernetes clusters. These sites cannot reach GitHub or cloud registries, but they still need the operational consistency and auditability that GitOps provides.

Flux CD supports fully disconnected operation through local `GitRepository` and `OCIRepository` sources. By running a local Gitea instance or a local OCI registry inside the disconnected network, Flux can operate with the same GitOps workflow as connected clusters, just with a different source endpoint.

This guide covers designing a fully disconnected Flux architecture and setting up the on-site infrastructure required to support it.

## Prerequisites

- An air-gapped or occasionally-connected Kubernetes cluster
- On-site storage for a local Git or OCI registry (100GB+ recommended)
- A mechanism to transfer manifests to the disconnected site (USB, satellite, scheduled sync)
- Flux CD installed from pre-downloaded manifests
- `flux` CLI and `kubectl` access to the site cluster

## Step 1: Install Flux Without Internet Access

On a connected machine, download all Flux components:

```bash
# On a connected machine, download Flux install manifests

flux install --export > flux-install.yaml

# Download all Flux controller images referenced by the manifest
mapfile -t flux_images < <(grep -o 'ghcr.io/fluxcd/[^[:space:]]*' flux-install.yaml | sort -u)

for image in "${flux_images[@]}"; do
  docker pull "$image"
done

docker save -o /tmp/flux-images.tar "${flux_images[@]}"

# Transfer to disconnected site via approved mechanism
# (USB drive, data diode, satellite transfer, etc.)
```

On the air-gapped cluster:

```bash
# Load images into the local Docker daemon
docker load < /tmp/flux-images.tar

# Tag and push to local registry
mapfile -t flux_images < <(grep -o 'ghcr.io/fluxcd/[^[:space:]]*' flux-install.yaml | sort -u)

for image in "${flux_images[@]}"; do
  local_image="local-registry.internal:5000/${image#*/}"
  docker tag "$image" "$local_image"
  docker push "$local_image"
done

# Patch flux-install.yaml to use local registry images
sed -i 's|ghcr.io/fluxcd|local-registry.internal:5000/fluxcd|g' flux-install.yaml

# Install Flux from local manifests
kubectl apply -f flux-install.yaml
```

## Step 2: Run a Local Gitea Server

```yaml
# infrastructure/local-git/gitea-deployment.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: gitea
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: gitea-pvc
  namespace: gitea
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gitea
  namespace: gitea
spec:
  replicas: 1
  selector:
    matchLabels:
      app: gitea
  template:
    metadata:
      labels:
        app: gitea
    spec:
      containers:
        - name: gitea
          image: local-registry.internal:5000/gitea/gitea:1.24
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 3000
              name: http
            - containerPort: 22
              name: ssh
          env:
            - name: GITEA__database__DB_TYPE
              value: sqlite3
            - name: GITEA__database__PATH
              value: /data/gitea.db
            - name: GITEA__server__ROOT_URL
              value: http://gitea.gitea.svc.cluster.local:3000/
          volumeMounts:
            - name: gitea-data
              mountPath: /data
      volumes:
        - name: gitea-data
          persistentVolumeClaim:
            claimName: gitea-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: gitea
  namespace: gitea
spec:
  selector:
    app: gitea
  ports:
    - name: http
      port: 3000
      targetPort: 3000
    - name: ssh
      port: 22
      targetPort: 22
```

## Step 3: Configure Flux to Use Local Gitea

```yaml
# On the disconnected cluster, point Flux at local Gitea
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 5m       # Local network - short interval is fine
  timeout: 30s
  ref:
    branch: main
  # Local Gitea URL
  url: http://gitea.gitea.svc.cluster.local:3000/my-org/my-fleet
  secretRef:
    name: flux-system
```

```bash
# Create Gitea credentials secret
kubectl create secret generic flux-system \
  -n flux-system \
  --from-literal=username=gitea-admin \
  --from-literal=password="$GITEA_ADMIN_PASSWORD"
```

## Step 4: Implement a Content Transfer Workflow

For occasional-connect sites, establish a formal workflow for transferring updates.

```bash
#!/bin/bash
# content-transfer-workflow.sh
# Run on the connected side to prepare a transfer bundle

TRANSFER_DATE=$(date +%Y%m%d)
BUNDLE_DIR="/tmp/transfer-bundle-${TRANSFER_DATE}"
mkdir -p "$BUNDLE_DIR"

# 1. Bundle the latest Git repository state
cd /path/to/fleet-repo
git bundle create "${BUNDLE_DIR}/fleet-repo.bundle" --all

# 2. Bundle new container images
mapfile -t NEW_IMAGES < <(git diff HEAD~1..HEAD --name-only | \
  xargs -r grep -h "image:" | \
  grep -oP '[\w./-]+:[\w.-]+' | sort -u)

for image in "${NEW_IMAGES[@]}"; do
  echo "Bundling image: $image"
  docker pull "$image"
done

if [ "${#NEW_IMAGES[@]}" -gt 0 ]; then
  docker save -o "${BUNDLE_DIR}/new-images.tar" "${NEW_IMAGES[@]}"
fi

# 3. Create manifest
cat > "${BUNDLE_DIR}/manifest.json" << EOF
{
  "date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "git_sha": "$(git rev-parse HEAD)",
  "images": $(printf '%s\n' "${NEW_IMAGES[@]}" | jq -R . | jq -s .)
}
EOF

# 4. Compress and sign
tar -czf "transfer-bundle-${TRANSFER_DATE}.tar.gz" -C /tmp "transfer-bundle-${TRANSFER_DATE}"
sha256sum "transfer-bundle-${TRANSFER_DATE}.tar.gz" > "transfer-bundle-${TRANSFER_DATE}.sha256"

echo "Transfer bundle ready: transfer-bundle-${TRANSFER_DATE}.tar.gz"
```

```bash
#!/bin/bash
# apply-transfer-bundle.sh
# Run on the disconnected cluster after receiving the bundle

BUNDLE_PATH="${1:?Usage: $0 <bundle-path>}"

# 1. Verify bundle integrity
sha256sum --check "${BUNDLE_PATH%.tar.gz}.sha256"

# 2. Extract bundle
tar -xzf "$BUNDLE_PATH" -C /tmp

BUNDLE_DATE=$(basename "${BUNDLE_PATH}" .tar.gz | sed 's/transfer-bundle-//')
BUNDLE_DIR="/tmp/transfer-bundle-${BUNDLE_DATE}"

# 3. Load new container images into local registry
if [ -f "${BUNDLE_DIR}/new-images.tar" ]; then
  docker load < "${BUNDLE_DIR}/new-images.tar"
fi
# Retag and push to local registry
# ... (same as Step 1)

# 4. Push Git repository update to local Gitea
cd /tmp/fleet-repo-clone
git fetch "${BUNDLE_DIR}/fleet-repo.bundle" refs/heads/main
git push http://gitea.gitea.svc.cluster.local:3000/my-org/my-fleet FETCH_HEAD:main

echo "Transfer bundle applied. Flux will reconcile within 5 minutes."
```

## Step 5: Monitor Disconnected Site Health Locally

```yaml
# Local Prometheus for health monitoring (no external connectivity needed)
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: disconnected-site-health
  namespace: monitoring
spec:
  groups:
    - name: local.health
      rules:
        - alert: LocalGiteaUnavailable
          expr: up{job="gitea"} == 0
          for: 2m
          annotations:
            summary: "Local Gitea is unavailable - Flux cannot reconcile"

        - alert: FluxNotReconciling
          expr: |
            gotk_resource_info{customresource_kind=~"GitRepository|Kustomization",ready!="True",suspended!="True"} == 1
          for: 5m
          annotations:
            summary: "A Flux source or reconciler is not ready"
```

## Best Practices

- Establish a formal content transfer cadence (weekly, monthly) and document the procedure.
- Verify bundle integrity with cryptographic checksums before applying.
- Run a full validation after each transfer to confirm all images and manifests applied correctly.
- Keep the local Gitea on a separate, redundant storage volume from application data.
- Document the manual steps required if the transfer automation fails.
- Maintain an offline copy of the Flux installation manifests in case the cluster needs rebuilding.

## Conclusion

Fully disconnected edge sites are not an obstacle to GitOps - they require a different delivery mechanism for manifests and images, but the core GitOps workflow is preserved. With a local Gitea instance and OCI registry, Flux operates identically to connected clusters, providing the same audit trail, reconciliation guarantees, and rollback capabilities. The transfer workflow becomes the disciplined process that replaces internet connectivity.
