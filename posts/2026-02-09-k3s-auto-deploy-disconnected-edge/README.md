# How to Set Up K3s Auto-Deploying Manifests for Disconnected Edge Locations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, k3s, Edge Computing

Description: Learn how to configure K3s to automatically deploy manifests from local directories at disconnected edge locations.

---

Edge locations with intermittent or no internet connectivity need a way to deploy applications without relying on external registries or GitOps controllers. K3s provides built-in auto-deploy functionality that watches local directories and automatically applies any manifests found there.

In this guide, you'll configure K3s auto-deploy for disconnected edges, implement manifest distribution strategies, and build a complete offline deployment pipeline.

## Understanding K3s Auto-Deploy

On server nodes, K3s automatically deploys manifests from `/var/lib/rancher/k3s/server/manifests/`. Files placed in this directory are applied to the cluster on startup and when they change. This works entirely offline as long as the referenced container images are already available to the nodes.

## Configuring K3s with Auto-Deploy

Install K3s (auto-deploy is enabled by default):

```bash
curl -sfL https://get.k3s.io | sh -s - server --write-kubeconfig-mode 644
```

## Creating Auto-Deploy Manifests

Place application manifests in the auto-deploy directory:

```bash
sudo mkdir -p /var/lib/rancher/k3s/server/manifests/edge-apps
sudo tee /var/lib/rancher/k3s/server/manifests/edge-apps/nginx-app.yaml > /dev/null <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-edge
  namespace: default
spec:
  replicas: 2
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
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 80
EOF
```

K3s deploys it automatically within seconds.

## Building Offline Manifest Distribution

Create manifest bundles for USB distribution:

```bash
mkdir -p /tmp/edge-manifests
cd /tmp/edge-manifests

# Add manifests

cat > app.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: edge-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: edge-app
  template:
    metadata:
      labels:
        app: edge-app
    spec:
      containers:
        - name: app
          image: alpine:3.20
          imagePullPolicy: IfNotPresent
          command: ["sleep", "infinity"]
EOF

# Create deployment script
cat > deploy.sh <<'SCRIPT'
#!/bin/bash
sudo mkdir -p /var/lib/rancher/k3s/server/manifests/edge-apps
sudo cp *.yaml /var/lib/rancher/k3s/server/manifests/edge-apps/
echo "Manifests deployed"
kubectl get deployments
SCRIPT

chmod +x deploy.sh
tar -czf edge-manifests.tar.gz *.yaml deploy.sh
```

At edge site:

```bash
tar -xzf edge-manifests.tar.gz
./deploy.sh
```

## Pre-Loading Container Images

Extract and pre-load images for offline use:

```bash
# Extract images from manifests
grep "image:" *.yaml | awk '{print $2}' | sort -u > images.txt

# Pull and save images
while read image; do
  docker pull "$image"
done < images.txt

docker save -o images.tar $(cat images.txt)

# At edge site, load images
sudo k3s ctr -n k8s.io images import images.tar
```

## Implementing Manifest Versioning

Add version metadata:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  annotations:
    manifest-version: "v1.2.3"
    deployed-date: "2026-02-09"
```

## Creating Rollback Mechanism

Backup and rollback your application manifests:

```bash
# Backup
BACKUP_DIR="/var/backups/k3s-manifests"
APP_MANIFEST_DIR="/var/lib/rancher/k3s/server/manifests/edge-apps"
sudo mkdir -p "$BACKUP_DIR"
sudo tar -czf "$BACKUP_DIR/backup-$(date +%Y%m%d).tar.gz" \
  -C "$APP_MANIFEST_DIR" .

# Rollback
kubectl delete -f "$APP_MANIFEST_DIR" --ignore-not-found
sudo rm -f "$APP_MANIFEST_DIR"/*.yaml
sudo tar -xzf "$BACKUP_DIR/backup-20260209.tar.gz" \
  -C "$APP_MANIFEST_DIR"
```

## Validating Manifests

Validate before deployment:

```bash
#!/bin/bash
for manifest in *.yaml; do
  kubectl apply --dry-run=server -f "$manifest"
  if [ $? -eq 0 ]; then
    echo "Valid: $manifest"
  else
    echo "Invalid: $manifest"
    exit 1
  fi
done
```

## Monitoring Auto-Deploy

Watch for manifest changes:

```bash
#!/bin/bash
inotifywait -m -e create -e modify /var/lib/rancher/k3s/server/manifests | \
while read path action file; do
  echo "$(date): $action on $file"
  kubectl get all -A
done
```

## Conditional Site Deployments

Deploy based on site characteristics:

```bash
#!/bin/bash
SITE_TYPE=$(cat /etc/site-type)
cp /opt/manifests/$SITE_TYPE/*.yaml \
  /var/lib/rancher/k3s/server/manifests/
```

## Fleet Management

Create site-specific bundles:

```bash
for site in site-a site-b site-c; do
  mkdir -p /tmp/$site
  cp base-manifests/*.yaml /tmp/$site/
  cp site-specific/$site/*.yaml /tmp/$site/
  tar -czf $site-bundle.tar.gz -C /tmp/$site .
done
```

## Conclusion

K3s auto-deploy enables GitOps-style deployments for disconnected edge locations. By combining auto-deploy with manifest distribution, image pre-loading, and validation, you create a robust offline deployment pipeline that works reliably without internet connectivity.
