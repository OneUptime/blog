# How to Migrate from RKE to RKE2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE, RKE2, Kubernetes, Rancher, Migration, Upgrade

Description: A complete guide to migrating workloads from an RKE (v1) cluster to a new RKE2 cluster with minimal downtime.

## Introduction

RKE2 is the next-generation Kubernetes distribution from Rancher, offering enhanced security defaults designed to pass the majority of Kubernetes CIS Benchmark controls with minimal operator intervention, embedded etcd, containerd instead of Docker, and a simpler architecture. RKE/RKE1 reached end of life on July 31, 2025, and Rancher 2.12.0 and later no longer support provisioning or managing downstream RKE1 clusters. While there is no in-place upgrade path from RKE to RKE2, migrating your workloads to a new RKE2 cluster is straightforward with the right approach.

## Migration Strategy

The recommended approach is a **blue-green migration**:
1. Build a new RKE2 cluster (green)
2. Export and re-deploy workloads to the new cluster
3. Migrate traffic using DNS or load balancer updates
4. Decommission the old RKE cluster (blue)

## Step 1: Assess the RKE Cluster

Inventory everything running in your existing cluster:

```bash
export KUBECONFIG=kube_config_cluster.yml

# Export common workload resources

kubectl get all --all-namespaces -o yaml > all-resources-backup.yaml

# List all namespaces
kubectl get namespaces

# List all Helm releases
helm list --all-namespaces

# List all PersistentVolumes
kubectl get pv

# List all PersistentVolumeClaims
kubectl get pvc --all-namespaces

# List all ConfigMaps and Secrets
kubectl get configmaps --all-namespaces
kubectl get secrets --all-namespaces | grep -v "kubernetes.io/service-account-token"

# Export additional namespaced resources
kubectl api-resources --verbs=list --namespaced -o name | \
    while read -r RESOURCE; do
        kubectl get "$RESOURCE" --all-namespaces -o yaml 2>/dev/null || true
        echo "---"
    done > custom-resources.yaml
```

## Step 2: Export Workload Manifests

```bash
# Install kubectl-neat for cleaner exports (optional but recommended)
kubectl krew install neat

# Export all deployments cleanly
kubectl get deployments --all-namespaces -o yaml | kubectl neat > deployments.yaml

# Export services
kubectl get services --all-namespaces -o yaml | kubectl neat > services.yaml

# Export ingresses
kubectl get ingress --all-namespaces -o yaml | kubectl neat > ingresses.yaml

# Export configmaps (excluding system ones)
kubectl get configmaps --all-namespaces \
    --field-selector='metadata.namespace!=kube-system' \
    -o yaml | kubectl neat > configmaps.yaml

# Export secrets (excluding system secrets)
kubectl get secrets --all-namespaces \
    --field-selector='metadata.namespace!=kube-system,type!=kubernetes.io/service-account-token' \
    -o yaml | kubectl neat > secrets.yaml

# Export PVCs
kubectl get pvc --all-namespaces -o yaml | kubectl neat > pvcs.yaml
```

## Step 3: Set Up the New RKE2 Cluster

Provision new nodes for the RKE2 cluster (can reuse infrastructure if decommissioning RKE):

```bash
# On the first new server node - install RKE2
sudo mkdir -p /etc/rancher/rke2

sudo tee /etc/rancher/rke2/config.yaml > /dev/null <<EOF
token: "RKE2MigrationToken"
tls-san:
  - 192.168.2.100
  - rke2-cluster.example.com
# Use the same pod/service CIDR as RKE if reusing DNS or configs
# cluster-cidr: 10.42.0.0/16
# service-cidr: 10.43.0.0/16
cni: canal
EOF

curl -sfL https://get.rke2.io | sudo sh -
sudo systemctl enable rke2-server
sudo systemctl start rke2-server

# Additional server and agent nodes must use the same token and
# server: https://<fixed-registration-address>:9345 in config.yaml.

# Configure kubectl
mkdir -p ~/.kube
sudo cp /etc/rancher/rke2/rke2.yaml ~/.kube/config-rke2
sudo chown "$(id -u):$(id -g)" ~/.kube/config-rke2
export KUBECONFIG=~/.kube/config-rke2
```

## Step 4: Migrate Helm Charts

Re-install Helm releases on the new cluster:

```bash
# Switch to old cluster
export KUBECONFIG=kube_config_cluster.yml

# Export Helm values for each release
helm list --all-namespaces -o json | jq -r '.[] | "\(.namespace) \(.name) \(.chart)"' | \
    while read NS NAME CHART; do
        helm get values "$NAME" -n "$NS" -o yaml > "${NAME}-values.yaml"
        echo "Exported: $NAME ($NS)"
    done

# Switch to new RKE2 cluster
export KUBECONFIG=~/.kube/config-rke2

# Add Helm repos used in the old cluster
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
# Add your other repos...
helm repo update

# Re-install each chart with exported values
helm install ingress-nginx ingress-nginx/ingress-nginx \
    --namespace ingress-nginx \
    --create-namespace \
    --values ingress-nginx-values.yaml
```

## Step 5: Migrate Secrets and ConfigMaps

```bash
# Switch to new cluster
export KUBECONFIG=~/.kube/config-rke2

# Create namespaces first
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: production
---
apiVersion: v1
kind: Namespace
metadata:
  name: staging
EOF

# Apply exported secrets and configmaps
kubectl apply -f secrets.yaml
kubectl apply -f configmaps.yaml
```

## Step 6: Migrate PersistentVolume Data

This is the most complex part of the migration. Use Velero for data migration. If you are migrating persistent volume data across cloud providers or regions, enable Velero File System Backup instead of relying only on provider snapshots.

```bash
# Install Velero on the old RKE cluster
export KUBECONFIG=kube_config_cluster.yml

velero install \
    --provider aws \
    --plugins velero/velero-plugin-for-aws:v1.13.0 \
    --bucket my-migration-bucket \
    --backup-location-config region=us-east-1 \
    --snapshot-location-config region=us-east-1 \
    --secret-file ./credentials-velero

# Create a full backup
velero backup create rke-full-backup \
    --include-namespaces production,staging \
    --wait

# Install Velero on the new RKE2 cluster and restore
export KUBECONFIG=~/.kube/config-rke2

velero install \
    --provider aws \
    --plugins velero/velero-plugin-for-aws:v1.13.0 \
    --bucket my-migration-bucket \
    --backup-location-config region=us-east-1 \
    --snapshot-location-config region=us-east-1 \
    --secret-file ./credentials-velero

# Restore the backup
velero restore create rke2-restore \
    --from-backup rke-full-backup \
    --wait
```

## Step 7: Migrate Workloads and Verify

```bash
export KUBECONFIG=~/.kube/config-rke2

# Apply all exported manifests
kubectl apply -f deployments.yaml
kubectl apply -f services.yaml
kubectl apply -f ingresses.yaml

# Wait for deployments to be ready
kubectl get deployments --all-namespaces \
    -o jsonpath='{range .items[*]}{.metadata.namespace}{" "}{.metadata.name}{"\n"}{end}' | \
    while read -r NS NAME; do
        kubectl rollout status deployment/"$NAME" -n "$NS" --timeout=300s
    done

# Verify that pods are ready, running, or completed
kubectl get pods --all-namespaces --no-headers | \
    awk '{split($3, ready, "/"); if ($4 != "Completed" && (ready[1] != ready[2] || $4 != "Running")) print}'
```

## Step 8: Update DNS/Load Balancer

```bash
# Get the new cluster's ingress IP
kubectl -n ingress-nginx get svc ingress-nginx-controller

# Update DNS records to point to the new cluster
# (Use your DNS provider's API or console)

# Test the application via the new cluster IP
curl -H "Host: myapp.example.com" http://NEW_CLUSTER_IP/health
```

## Step 9: Key Differences to Address

| Feature | RKE | RKE2 |
|---------|-----|-------|
| Container runtime | Docker | containerd |
| Certificate storage | `/etc/kubernetes/ssl/` | `/var/lib/rancher/rke2/server/tls/` |
| kubeconfig | `kube_config_cluster.yml` | `/etc/rancher/rke2/rke2.yaml` |
| etcd management | Manual via `rke etcd` | Built-in |
| Default CNI | Canal | Canal |
| PSP/PSA | PodSecurityPolicy (Kubernetes < 1.25) | Pod Security Admission (Kubernetes >= 1.25) |

```bash
# Update any scripts that referenced Docker to use containerd/crictl
sudo /var/lib/rancher/rke2/bin/crictl --config /var/lib/rancher/rke2/agent/etc/crictl.yaml ps
sudo /var/lib/rancher/rke2/bin/crictl --config /var/lib/rancher/rke2/agent/etc/crictl.yaml images
```

## Conclusion

Migrating from RKE to RKE2 using a blue-green approach minimizes risk and downtime. By carefully exporting workload manifests, Helm values, secrets, and PV data, then re-deploying on the new RKE2 cluster, you can complete the migration with minimal impact. The improved security posture and simplified architecture of RKE2 make the migration investment worthwhile for production clusters.
