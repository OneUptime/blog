# How to Migrate from GKE to Self-Hosted Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, GKE, Google Cloud, Migration, Self-Hosted, Cloud Migration

Description: Learn how to migrate your Google Kubernetes Engine workloads to a self-hosted Talos Linux cluster with practical steps for handling GCP-specific dependencies.

---

Google Kubernetes Engine is one of the most polished managed Kubernetes offerings available. It handles control plane management, node auto-repair, automatic upgrades, and integrates deeply with the Google Cloud ecosystem. But that deep integration is also its biggest drawback when you want to leave. Moving from GKE to a self-hosted Talos Linux cluster requires careful planning to replace all the GCP services your workloads depend on. This guide covers the full migration process.

## Why Move Away from GKE

GKE's pricing model includes a management fee for the cluster (free tier available for one zonal cluster, but $74.40/month for Autopilot or regional standard clusters), plus compute, storage, networking, and all the managed services your applications consume. For organizations running multiple clusters, these costs compound quickly.

Beyond cost, there are valid technical and strategic reasons to self-host. GKE Autopilot restricts what you can run on nodes. GKE's release channels sometimes trail upstream Kubernetes. And if you are building a multi-cloud or hybrid strategy, having your primary cluster locked into GCP makes that harder.

Talos Linux offers a consistent experience regardless of where you run it. Same API, same configuration model, same upgrade process on bare metal, AWS, GCP, Azure, or your own data center.

## Step 1: Catalog Your GCP Dependencies

GKE clusters tend to accumulate GCP service dependencies. Before you can migrate, you need a complete picture:

```bash
# Check for GKE-specific Ingress (GCE Ingress Controller)
kubectl get ingress --all-namespaces -o json | \
  jq '.items[] | select(.metadata.annotations["kubernetes.io/ingress.class"]=="gce" or .spec.ingressClassName=="gce")'

# Find workloads using Workload Identity
kubectl get sa --all-namespaces -o json | \
  jq '.items[] | select(.metadata.annotations["iam.gke.io/gcp-service-account"]!=null)'

# Check for GCE Persistent Disk usage
kubectl get pv -o json | \
  jq '.items[] | select(.spec.gcePersistentDisk!=null or .spec.csi.driver=="pd.csi.storage.gke.io")'

# List services using Cloud Load Balancers
kubectl get svc --all-namespaces -o json | \
  jq '.items[] | select(.spec.type=="LoadBalancer")'

# Check for Config Connector resources
kubectl api-resources | grep cnrm

# Look for BackendConfig and FrontendConfig (GKE-specific)
kubectl get backendconfig,frontendconfig --all-namespaces
```

Build a replacement matrix for each GCP dependency:

| GCP Service | Self-Hosted Replacement |
|---|---|
| GCE Ingress / Cloud Load Balancer | MetalLB + nginx-ingress |
| GCE Persistent Disk CSI | Longhorn, Rook-Ceph, or OpenEBS |
| Workload Identity | HashiCorp Vault |
| Cloud Armor (WAF) | ModSecurity with nginx |
| Cloud DNS (ExternalDNS) | ExternalDNS with other providers |
| Binary Authorization | Kyverno or OPA Gatekeeper |
| GKE Backup for GKE | Velero |

## Step 2: Export and Back Up

Create thorough backups of your GKE cluster state:

```bash
# If using GKE Backup, take a backup through the console or gcloud
gcloud beta container backup-restore backups create pre-migration \
  --project=my-project \
  --location=us-central1 \
  --backup-plan=my-backup-plan

# Set up Velero for portable backups
velero install \
  --provider gcp \
  --bucket my-velero-bucket \
  --secret-file ./gcp-credentials.json

velero backup create gke-full \
  --include-namespaces '*' \
  --default-volumes-to-fs-backup

# Export workload definitions as plain YAML
kubectl get deploy,sts,ds,svc,configmap,ingress --all-namespaces -o yaml > gke-resources.yaml

# Export secrets (handle carefully)
kubectl get secrets --all-namespaces -o yaml > gke-secrets.yaml
```

## Step 3: Prepare Your Target Infrastructure

Decide where your Talos cluster will run and provision the hardware or VMs. For this example, we will assume bare-metal servers in a colocation facility, but the process is similar for other environments.

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Generate cluster secrets and machine configs
talosctl gen secrets -o secrets.yaml
talosctl gen config gke-migrated https://talos-vip:6443 \
  --with-secrets secrets.yaml \
  --output-dir _out
```

Customize your machine configuration to match your requirements:

```yaml
# production-patch.yaml
machine:
  install:
    disk: /dev/nvme0n1
    image: ghcr.io/siderolabs/installer:v1.9.0
  network:
    interfaces:
      - interface: bond0
        bond:
          mode: 802.3ad
          lacpRate: fast
          interfaces:
            - enp1s0
            - enp2s0
        dhcp: false
        addresses:
          - 10.10.0.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.10.0.1
  time:
    servers:
      - time.google.com
      - time.cloudflare.com
cluster:
  network:
    podSubnets:
      - 10.244.0.0/16
    serviceSubnets:
      - 10.96.0.0/12
  apiServer:
    certSANs:
      - talos-vip
      - api.k8s.example.com
```

Apply configurations and bootstrap:

```bash
# Apply to control plane nodes
for node in 10.10.0.10 10.10.0.11 10.10.0.12; do
  talosctl apply-config --insecure --nodes $node --file _out/controlplane.yaml
done

# Apply to worker nodes
for node in 10.10.0.20 10.10.0.21 10.10.0.22; do
  talosctl apply-config --insecure --nodes $node --file _out/worker.yaml
done

# Bootstrap the cluster
export TALOSCONFIG="_out/talosconfig"
talosctl config endpoint 10.10.0.10
talosctl config node 10.10.0.10
talosctl bootstrap

# Wait and get kubeconfig
talosctl kubeconfig ./kubeconfig
```

## Step 4: Install Infrastructure Components

Install the self-hosted equivalents of all GKE-managed services:

```bash
export KUBECONFIG=./kubeconfig

# CNI - Install Cilium (GKE uses Dataplane V2 which is based on Cilium)
helm repo add cilium https://helm.cilium.io
helm install cilium cilium/cilium -n kube-system \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=true \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true

# Storage - Install Rook-Ceph for production storage
helm repo add rook-release https://charts.rook.io/release
helm install rook-ceph rook-release/rook-ceph -n rook-ceph --create-namespace

# After Rook operator is ready, create a CephCluster
cat <<EOF | kubectl apply -f -
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
  storage:
    useAllNodes: true
    useAllDevices: true
EOF

# Load Balancing
helm repo add metallb https://metallb.github.io/metallb
helm install metallb metallb/metallb -n metallb-system --create-namespace

# Ingress - Replace GCE Ingress
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx --create-namespace
```

## Step 5: Handle Workload Identity Migration

GKE Workload Identity lets pods assume GCP IAM roles. If you are leaving GCP entirely, replace this with HashiCorp Vault or a similar secrets management solution:

```bash
# Install Vault
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault hashicorp/vault -n vault --create-namespace

# For workloads that still need GCP API access during transition,
# you can use service account key files mounted as secrets
# (not ideal long-term, but works for migration)
kubectl create secret generic gcp-sa-key \
  --from-file=key.json=./service-account-key.json \
  -n my-app
```

## Step 6: Migrate Applications

Convert GKE-specific resource definitions and deploy to the new cluster:

```bash
# Convert GKE BackendConfig to nginx annotations
# Before (GKE):
# apiVersion: cloud.google.com/v1
# kind: BackendConfig
# metadata:
#   name: my-backend
# spec:
#   timeoutSec: 60
#   healthCheck:
#     requestPath: /health

# After (nginx-ingress):
# annotations:
#   nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
#   nginx.ingress.kubernetes.io/health-check-path: "/health"

# Deploy updated manifests
kubectl apply -f ./converted-manifests/

# Or restore from Velero with exclusions
velero restore create gke-restore \
  --from-backup gke-full \
  --include-namespaces my-app \
  --exclude-resources backendconfigs.cloud.google.com,frontendconfigs.networking.gke.io
```

## Step 7: Data Migration

For persistent data, you have several options depending on the volume of data:

```bash
# Option 1: Use Velero's filesystem backup/restore (slower but simple)
# Already handled if you used --default-volumes-to-fs-backup

# Option 2: Use GCP disk snapshots + import
# Create a snapshot in GCP, export to a GCS bucket, download, and import

# Option 3: Application-level migration
# For databases, use pg_dump/pg_restore, mysqldump, etc.
pg_dump -h gke-postgres-service -U admin mydb > mydb.sql
psql -h talos-postgres-service -U admin mydb < mydb.sql
```

## Step 8: Verify and Switch Over

Run your full test suite against the new cluster before switching DNS:

```bash
# Verify cluster health
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# Test applications
for svc in $(kubectl get svc -n my-app -o jsonpath='{.items[*].metadata.name}'); do
  echo "Testing $svc..."
  kubectl run test-$svc --rm -it --image=busybox --restart=Never -- \
    wget -qO- http://$svc.my-app.svc.cluster.local/health
done

# Update DNS records to point to the new cluster
# Keep GKE running for rollback
```

## Wrapping Up

Migrating from GKE to self-hosted Talos Linux is a significant undertaking, especially if your workloads are deeply integrated with GCP services. The key is to take a methodical approach: catalog your dependencies, find replacements for each GCP service, migrate one application at a time, and maintain the ability to roll back until you are confident in the new setup. The reward is a cluster you fully control, running on an immutable OS that is designed from the ground up for Kubernetes, with no vendor lock-in and predictable costs.
