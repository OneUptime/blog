# How to Migrate from MicroK8s to Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, MicroK8s, Migration, Cluster Management, Infrastructure

Description: Step-by-step guide for migrating your MicroK8s Kubernetes deployments to Talos Linux with addon replacement strategies and workload transfer instructions.

---

MicroK8s is Canonical's lightweight Kubernetes distribution, popular for development environments, edge deployments, and small production clusters. It runs as a snap package on Ubuntu and provides a quick way to get Kubernetes up and running. But as your needs grow or your security requirements tighten, you might find MicroK8s's snap-based architecture and Ubuntu dependency limiting. Talos Linux offers a fundamentally different approach - an immutable, purpose-built OS for Kubernetes that eliminates the underlying operating system as a concern. This guide walks through migrating from MicroK8s to Talos Linux.

## Why Move from MicroK8s to Talos

MicroK8s has several characteristics that become pain points at scale:

- **Snap dependency**: MicroK8s is distributed as a snap package, which means you are tied to Ubuntu (or at least a Linux distribution with snapd support). Snap auto-updates can sometimes break things at inconvenient times.
- **Single-binary limitations**: While the single-binary approach is convenient, it makes it harder to customize individual Kubernetes components.
- **OS management**: You still have a full Ubuntu installation to patch, secure, and maintain underneath MicroK8s.
- **Addon system**: MicroK8s addons are convenient but sometimes lag behind upstream versions and can conflict with each other.

Talos Linux eliminates these concerns. There is no operating system to manage, no package manager, no SSH access. The cluster is defined entirely through declarative YAML configurations and managed through an API. Upgrades are atomic and reversible.

## Step 1: Inventory Your MicroK8s Setup

Document your current MicroK8s configuration:

```bash
# Check MicroK8s status and enabled addons
microk8s status

# List all enabled addons
microk8s status --format short

# Common addons you might have enabled:
# dns, storage, ingress, metallb, dashboard,
# prometheus, cert-manager, hostpath-storage

# Get cluster info
microk8s kubectl get nodes -o wide

# List all workloads
microk8s kubectl get deployments,statefulsets,daemonsets --all-namespaces

# Check storage configuration
microk8s kubectl get sc
microk8s kubectl get pv,pvc --all-namespaces

# Export MicroK8s configuration
microk8s config > microk8s-kubeconfig.yaml

# Check if using MicroK8s clustering
microk8s status | grep -i cluster
```

## Step 2: Map MicroK8s Addons to Talos Equivalents

MicroK8s addons bundle common Kubernetes functionality. On Talos, you install these as standard Helm charts or manifests:

| MicroK8s Addon | Talos Equivalent |
|---|---|
| dns (CoreDNS) | Built into Talos by default |
| storage / hostpath-storage | Longhorn, OpenEBS, or Rook-Ceph |
| ingress (nginx) | nginx-ingress Helm chart |
| metallb | MetalLB Helm chart |
| dashboard | Kubernetes Dashboard Helm chart |
| prometheus | kube-prometheus-stack Helm chart |
| cert-manager | cert-manager Helm chart |
| registry | Harbor or Docker Registry Helm chart |
| istio | Istio Helm charts |
| gpu | NVIDIA GPU Operator |
| rbac | Built into Kubernetes (configure via API) |

## Step 3: Back Up Your MicroK8s Data

Create comprehensive backups before starting:

```bash
# Export all resources
microk8s kubectl get all --all-namespaces -o yaml > microk8s-all-resources.yaml

# Back up secrets
microk8s kubectl get secrets --all-namespaces -o yaml > microk8s-secrets.yaml

# Back up ConfigMaps
microk8s kubectl get configmaps --all-namespaces -o yaml > microk8s-configmaps.yaml

# Back up PVC data using Velero
# First, install Velero in MicroK8s
microk8s helm3 repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
microk8s helm3 install velero vmware-tanzu/velero \
  -n velero --create-namespace \
  --set configuration.backupStorageLocation[0].provider=aws \
  --set configuration.backupStorageLocation[0].bucket=velero-backup \
  --set configuration.backupStorageLocation[0].config.region=us-east-1 \
  --set configuration.backupStorageLocation[0].config.s3ForcePathStyle=true \
  --set configuration.backupStorageLocation[0].config.s3Url=http://minio:9000 \
  --set snapshotsEnabled=false \
  --set deployNodeAgent=true \
  --set initContainers[0].name=velero-plugin-for-aws \
  --set initContainers[0].image=velero/velero-plugin-for-aws:v1.10.0 \
  --set initContainers[0].volumeMounts[0].mountPath=/target \
  --set initContainers[0].volumeMounts[0].name=plugins

# Create a full backup
velero backup create microk8s-full \
  --include-namespaces '*' \
  --default-volumes-to-fs-backup \
  --wait

# If using MicroK8s hostpath storage, also back up the raw data
# The hostpath provisioner stores data in /var/snap/microk8s/common/default-storage/
sudo tar czf hostpath-data.tar.gz /var/snap/microk8s/common/default-storage/
```

## Step 4: Set Up the Talos Linux Cluster

Generate and apply your Talos configuration:

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Generate cluster configuration
talosctl gen secrets -o secrets.yaml
talosctl gen config microk8s-migration https://10.0.0.100:6443 \
  --with-secrets secrets.yaml \
  --output-dir _out
```

Create a configuration patch to match your requirements:

```yaml
# talos-patch.yaml
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.9.0
  network:
    interfaces:
      - interface: eth0
        dhcp: true
  kubelet:
    extraArgs:
      max-pods: "110"
cluster:
  network:
    podSubnets:
      - 10.1.0.0/16    # MicroK8s default is 10.1.0.0/16
    serviceSubnets:
      - 10.152.183.0/24 # MicroK8s default service CIDR
  apiServer:
    certSANs:
      - 10.0.0.100
```

Apply and bootstrap:

```bash
# Patch configs
talosctl machineconfig patch _out/controlplane.yaml \
  --patch @talos-patch.yaml \
  --output _out/cp-patched.yaml

# Apply to control plane
talosctl apply-config --insecure --nodes 10.0.0.10 --file _out/cp-patched.yaml

# Apply to workers
talosctl apply-config --insecure --nodes 10.0.0.20 --file _out/worker.yaml
talosctl apply-config --insecure --nodes 10.0.0.21 --file _out/worker.yaml

# Bootstrap
export TALOSCONFIG="_out/talosconfig"
talosctl config endpoint 10.0.0.10
talosctl config node 10.0.0.10
talosctl bootstrap

# Get kubeconfig
talosctl kubeconfig ./kubeconfig
export KUBECONFIG=./kubeconfig
```

## Step 5: Install Addon Replacements

Install the standard Kubernetes equivalents of your MicroK8s addons:

```bash
# Storage (replacing MicroK8s hostpath-storage)
helm repo add longhorn https://charts.longhorn.io
helm install longhorn longhorn/longhorn -n longhorn-system --create-namespace \
  --set defaultSettings.defaultReplicaCount=2

# Create a default storage class
cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: microk8s-hostpath
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: driver.longhorn.io
parameters:
  numberOfReplicas: "2"
reclaimPolicy: Delete
volumeBindingMode: Immediate
EOF

# Ingress (replacing MicroK8s ingress addon)
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx --create-namespace

# MetalLB (if you were using the metallb addon)
helm repo add metallb https://metallb.github.io/metallb
helm install metallb metallb/metallb -n metallb-system --create-namespace

# Configure the IP pool (match your MicroK8s metallb config)
cat <<EOF | kubectl apply -f -
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default
  namespace: metallb-system
spec:
  addresses:
    - 10.0.0.200-10.0.0.250
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: default
  namespace: metallb-system
EOF

# cert-manager (if you were using it)
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager -n cert-manager \
  --create-namespace --set crds.enabled=true

# Monitoring (replacing MicroK8s prometheus addon)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install monitoring prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace

# Dashboard (if you were using it)
helm repo add kubernetes-dashboard https://kubernetes.github.io/dashboard
helm install dashboard kubernetes-dashboard/kubernetes-dashboard \
  -n kubernetes-dashboard --create-namespace
```

## Step 6: Migrate Workloads

Transfer your applications to the new cluster:

```bash
# Option 1: Use Velero to restore from backup
velero install \
  --provider aws \
  --bucket velero-backup \
  --secret-file ./credentials \
  --backup-location-config region=us-east-1,s3ForcePathStyle=true,s3Url=http://minio:9000 \
  --use-node-agent \
  --default-volumes-to-fs-backup

velero restore create microk8s-restore \
  --from-backup microk8s-full \
  --include-namespaces my-app \
  --wait

# Option 2: Redeploy from manifests
# Clean up cluster-specific fields from exported manifests
cat microk8s-all-resources.yaml | \
  yq 'del(.items[].metadata.resourceVersion,
       .items[].metadata.uid,
       .items[].metadata.creationTimestamp,
       .items[].metadata.managedFields,
       .items[].status)' > cleaned-resources.yaml

kubectl apply -f cleaned-resources.yaml

# Option 3: If using Helm, redeploy from charts
helm install my-app ./my-chart -f production-values.yaml
```

## Step 7: Handle MicroK8s-Specific Configurations

Some MicroK8s configurations need special attention:

**Container Runtime**: MicroK8s uses containerd, same as Talos. This means container images are compatible and you should not encounter runtime-related issues.

**DNS Resolution**: MicroK8s configures CoreDNS slightly differently. Make sure your services can resolve after migration:

```bash
# Test DNS resolution on the new cluster
kubectl run dns-test --rm -it --image=busybox --restart=Never -- \
  nslookup kubernetes.default.svc.cluster.local

# If you have custom CoreDNS configuration, apply it
kubectl get cm coredns -n kube-system -o yaml
# Edit if needed to match your custom DNS entries
```

**Registry Addon**: If you were using the MicroK8s registry addon, set up a replacement:

```bash
# Deploy a registry on the Talos cluster
helm repo add twuni https://helm.twun.io
helm install registry twuni/docker-registry -n registry --create-namespace \
  --set persistence.enabled=true \
  --set persistence.size=20Gi

# Configure Talos nodes to trust the registry
# Add to your Talos machine config:
# machine:
#   registries:
#     mirrors:
#       registry.local:32000:
#         endpoints:
#           - http://registry.registry.svc.cluster.local:5000
```

## Step 8: Verify and Cut Over

Run comprehensive checks:

```bash
# Verify all nodes are healthy
kubectl get nodes -o wide

# Check all pods are running
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# Verify storage is operational
kubectl get pvc --all-namespaces
kubectl get pv

# Test application functionality
kubectl port-forward svc/my-app 8080:80 -n my-app &
curl http://localhost:8080/health

# Check that ingress is working
curl -H "Host: my-app.example.com" http://10.0.0.200/

# Verify monitoring is collecting metrics
kubectl port-forward svc/monitoring-grafana 3000:80 -n monitoring &
```

Once everything is verified, update your DNS records and load balancers to point to the Talos cluster.

## Cleaning Up MicroK8s

After confirming the migration is successful:

```bash
# Stop MicroK8s
microk8s stop

# If you want to completely remove it
sudo snap remove microk8s --purge
```

## Wrapping Up

Migrating from MicroK8s to Talos Linux moves you from a snap-packaged, Ubuntu-dependent Kubernetes distribution to an immutable, purpose-built operating system. The addon replacement is the most labor-intensive part since MicroK8s makes enabling addons so convenient with simple commands. On Talos, you install those same components as standard Helm charts, which gives you more control over versions and configuration at the cost of a bit more setup work. The end result is a cluster that is more secure, easier to upgrade, and completely independent of any specific Linux distribution. For teams that started with MicroK8s and are now running production workloads, this is a solid upgrade path.
