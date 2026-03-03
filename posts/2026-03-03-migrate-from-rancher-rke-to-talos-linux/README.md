# How to Migrate from Rancher RKE to Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Rancher, RKE, Migration, Cluster Management, Infrastructure

Description: A detailed walkthrough for migrating Rancher RKE-managed Kubernetes clusters to Talos Linux with practical steps and configuration examples.

---

Rancher RKE (Rancher Kubernetes Engine) has been a popular choice for deploying production Kubernetes clusters, especially for teams already using the Rancher management platform. But with RKE1 reaching end of life and teams evaluating their next move, Talos Linux presents a compelling alternative. Rather than jumping to RKE2, some organizations are choosing to move to Talos Linux for its immutable OS design and simplified operations model. This guide covers the practical steps for making that migration.

## Why Leave RKE for Talos Linux

RKE deploys Kubernetes components as Docker containers on top of a standard Linux distribution. While this approach works, it means you are still managing a general-purpose OS underneath. You need to handle SSH key management, OS patching, Docker daemon updates, and the cluster.yml file that defines your RKE configuration.

Talos Linux replaces all of that with an immutable, API-managed operating system. There is no Docker daemon on Talos nodes - it runs containerd directly. There is no SSH, so there is nothing to manage at the OS level. The entire node configuration is a single YAML document that you apply through the Talos API.

RKE clusters also tend to accumulate technical debt over time. Nodes get patched inconsistently, Docker versions drift, and the cluster.yml file becomes increasingly complex. Talos eliminates these problems by design.

## Step 1: Audit Your RKE Cluster

Start by understanding exactly what your RKE cluster looks like:

```bash
# Check your RKE cluster configuration
cat cluster.yml

# Review the current state of your cluster
kubectl get nodes -o wide

# List all workloads
kubectl get deployments,statefulsets,daemonsets --all-namespaces -o wide

# Check which storage classes and PVs are in use
kubectl get sc
kubectl get pv

# Document your network configuration
kubectl get networkpolicies --all-namespaces
kubectl get svc --all-namespaces -o wide

# If using Rancher, check for Rancher-managed resources
kubectl get apps.catalog.cattle.io --all-namespaces
kubectl get projects.management.cattle.io --all-namespaces
```

Pay special attention to any Rancher-specific CRDs and resources. These include projects, catalogs, and apps managed through the Rancher UI. You will need to find alternatives for these on Talos.

## Step 2: Handle Rancher-Specific Dependencies

If your cluster is managed by Rancher, several components are Rancher-specific and will not exist in a Talos cluster:

- **Rancher Projects**: These are a Rancher abstraction over namespaces. On Talos, you will use plain namespaces with RBAC policies.
- **Rancher Catalogs/Apps**: Convert these to standard Helm charts or GitOps deployments.
- **Rancher Monitoring**: Replace with a standalone Prometheus/Grafana stack or use a monitoring service.
- **Rancher Logging**: Replace with a standalone logging solution like the EFK stack or Loki.

Document each Rancher-managed component and plan its replacement:

```bash
# Export Rancher app configurations
kubectl get apps.catalog.cattle.io --all-namespaces -o yaml > rancher-apps.yaml

# List Rancher-specific namespaces
kubectl get ns | grep -E "cattle|fleet|rancher"
```

## Step 3: Back Up the Cluster

Create comprehensive backups before making any changes:

```bash
# Use RKE's built-in etcd snapshot capability
rke etcd snapshot-save --config cluster.yml --name pre-migration

# Or manually snapshot etcd
docker exec etcd etcdctl snapshot save /tmp/etcd-snapshot.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/ssl/kube-ca.pem \
  --cert=/etc/kubernetes/ssl/kube-node.pem \
  --key=/etc/kubernetes/ssl/kube-node-key.pem

# Copy the snapshot from the node
scp user@rke-node:/tmp/etcd-snapshot.db ./

# Back up all Kubernetes resources
kubectl get all --all-namespaces -o yaml > full-cluster-backup.yaml

# Install and use Velero for application-level backups
velero install --provider aws --bucket my-backups \
  --secret-file ./cloud-credentials \
  --backup-location-config region=us-east-1

velero backup create rke-migration --include-namespaces '*'
```

## Step 4: Prepare Talos Configuration

Generate your Talos cluster configuration. If your RKE cluster had specific networking or storage requirements, translate those into the Talos config:

```bash
# Generate Talos configs
talosctl gen secrets -o secrets.yaml
talosctl gen config rke-migrated https://talos-vip:6443 \
  --with-secrets secrets.yaml \
  --output-dir _out
```

Map your RKE cluster.yml settings to Talos machine configuration patches:

```yaml
# rke-to-talos-patch.yaml
# Translate key RKE settings to Talos format
machine:
  network:
    hostname: talos-node-01
    interfaces:
      - interface: eth0
        dhcp: false
        addresses:
          - 10.0.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.9.0
  kubelet:
    extraArgs:
      # Translate any kubelet args from your RKE config
      max-pods: "150"
cluster:
  network:
    podSubnets:
      - 10.42.0.0/16   # Match your RKE pod CIDR
    serviceSubnets:
      - 10.43.0.0/16   # Match your RKE service CIDR
  apiServer:
    extraArgs:
      # Translate any API server args from cluster.yml
      audit-log-maxage: "30"
```

One important consideration: RKE uses Docker as the container runtime, while Talos uses containerd. This should not affect most workloads, but if you have anything that depends on the Docker socket or Docker-specific features, you will need to adapt those.

## Step 5: Build and Bootstrap the Talos Cluster

Provision your Talos nodes using the appropriate method for your infrastructure:

```bash
# Apply configs to new nodes
talosctl apply-config --insecure --nodes 10.0.1.10 --file _out/controlplane.yaml
talosctl apply-config --insecure --nodes 10.0.1.20 --file _out/worker.yaml
talosctl apply-config --insecure --nodes 10.0.1.21 --file _out/worker.yaml

# Configure talosctl
export TALOSCONFIG="_out/talosconfig"
talosctl config endpoint 10.0.1.10
talosctl config node 10.0.1.10

# Bootstrap the cluster
talosctl bootstrap

# Get the kubeconfig
talosctl kubeconfig ./kubeconfig-talos
```

Wait for all nodes to come up and verify the cluster is healthy:

```bash
export KUBECONFIG=./kubeconfig-talos
kubectl get nodes -o wide
kubectl get pods -n kube-system
```

## Step 6: Install Replacement Infrastructure

Replace the components that RKE or Rancher provided:

```bash
# Install a CNI plugin (RKE used Canal by default)
# If you want to match, use Calico. Or upgrade to Cilium.
helm repo add cilium https://helm.cilium.io
helm install cilium cilium/cilium -n kube-system \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=true

# Install an ingress controller
# RKE often used nginx-ingress
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace

# Install cert-manager if you were using it
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager -n cert-manager \
  --create-namespace \
  --set crds.enabled=true

# Install monitoring (replacing Rancher Monitoring)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install monitoring prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace
```

## Step 7: Migrate Workloads

Deploy your applications to the new Talos cluster:

```bash
# Using Velero to restore specific namespaces
velero restore create app-restore \
  --from-backup rke-migration \
  --include-namespaces my-app,my-other-app \
  --exclude-resources nodes,events

# Or redeploy from your source of truth
# If using Helm charts:
helm install my-app ./charts/my-app -f production-values.yaml

# If using GitOps, install ArgoCD and point it at your repo
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

## Step 8: Verify and Cut Over

Run thorough verification before switching traffic:

```bash
# Check all pods are healthy
kubectl get pods --all-namespaces --field-selector status.phase!=Running,status.phase!=Succeeded

# Test service connectivity
kubectl run test --rm -it --image=busybox --restart=Never -- nslookup kubernetes

# Verify storage is working
kubectl get pvc --all-namespaces

# Run application-specific health checks
curl -s https://your-app.example.com/health
```

Update your DNS records and load balancers to point to the new Talos cluster. Keep the RKE cluster running as a fallback for at least a week.

## Cleaning Up

Once you are confident in the Talos cluster, decommission the RKE infrastructure:

```bash
# Remove the RKE cluster
rke remove --config cluster.yml

# Or if you want to be more careful, drain nodes first
kubectl drain rke-node-01 --ignore-daemonsets --delete-emptydir-data
```

## Wrapping Up

Migrating from RKE to Talos Linux is a significant infrastructure change, but it pays off in reduced operational complexity. You go from managing a full Linux distribution plus Docker plus RKE's configuration to managing a single YAML file per node. The Rancher-specific features you lose can be replaced with standard Kubernetes tools and GitOps practices that are more portable and vendor-neutral. Take the migration methodically, test thoroughly at each step, and give yourself a comfortable rollback window.
