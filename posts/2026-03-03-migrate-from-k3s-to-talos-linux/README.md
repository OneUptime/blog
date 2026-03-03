# How to Migrate from k3s to Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, k3s, Migration, Lightweight Kubernetes, Cluster Management

Description: Step-by-step instructions for migrating your k3s Kubernetes clusters to Talos Linux while preserving workloads and minimizing service disruptions.

---

k3s is a popular lightweight Kubernetes distribution that makes it easy to get clusters running quickly, especially on edge devices and resource-constrained environments. But as your infrastructure grows and your security requirements tighten, you might find yourself wanting something more opinionated about the operating system layer. Talos Linux fills that gap by providing an immutable, minimal OS that exists solely to run Kubernetes. If you are considering making the switch from k3s to Talos Linux, this guide covers the full migration process.

## Why Consider Talos Linux Over k3s

k3s bundles a lot of functionality into a single binary. It includes its own container runtime, networking, storage controller, and even an embedded SQLite or etcd datastore. This simplicity is great for getting started, but it comes with trade-offs. The host OS is still a general-purpose Linux distribution that you need to patch and maintain. SSH access is open, and the blast radius of a compromised node extends beyond just the Kubernetes layer.

Talos Linux takes a different philosophy. The operating system itself is purpose-built for Kubernetes. There is no SSH access, no shell, no package manager. Everything is configured declaratively through YAML files and managed via an API. This makes the nodes truly cattle rather than pets, and it eliminates entire categories of security vulnerabilities.

## Understanding the Architectural Differences

Before diving into the migration, it helps to understand the key architectural differences between k3s and a Talos-based cluster:

- k3s uses either SQLite or embedded etcd for its datastore. Talos always uses etcd.
- k3s bundles Traefik as the default ingress. Talos does not include an ingress controller by default.
- k3s includes a built-in local storage provider. In Talos, you will need to set up your own CSI driver.
- k3s uses flannel for CNI by default. Talos defaults to flannel as well but supports easy switching to Cilium or Calico.

These differences matter because they affect what you need to configure on the Talos side before migrating workloads.

## Step 1: Inventory Your k3s Cluster

Start by documenting what is running in your k3s cluster:

```bash
# List all nodes and their roles
kubectl get nodes -o wide

# Get all workloads across namespaces
kubectl get deployments,statefulsets,daemonsets --all-namespaces

# List all services and ingresses
kubectl get svc,ingress --all-namespaces

# Check what storage classes are in use
kubectl get sc
kubectl get pv,pvc --all-namespaces

# Export all Helm releases
helm list --all-namespaces

# Check for any k3s-specific resources
kubectl get helmcharts,helmchartconfigs -n kube-system
```

k3s has a unique feature called HelmChart CRDs that auto-deploy Helm charts. Take note of any HelmChart resources you are using because those will not exist in Talos.

## Step 2: Back Up Your Data

Take comprehensive backups of everything you will need:

```bash
# If using embedded etcd, create a snapshot
k3s etcd-snapshot save --name pre-migration-backup

# If using SQLite, copy the database file
sudo cp /var/lib/rancher/k3s/server/db/state.db ./k3s-state-backup.db

# Export all resources
kubectl get all --all-namespaces -o yaml > all-resources.yaml

# Back up secrets separately (they might contain important configs)
kubectl get secrets --all-namespaces -o yaml > secrets-backup.yaml

# If using Velero, create a full cluster backup
velero backup create k3s-full-backup --include-namespaces '*'
```

## Step 3: Set Up the Talos Cluster

Install `talosctl` and generate your cluster configuration:

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Generate secrets and configs
talosctl gen secrets -o secrets.yaml
talosctl gen config k8s-cluster https://your-vip-or-lb:6443 \
  --with-secrets secrets.yaml \
  --output-dir _out
```

Since k3s often runs in resource-constrained environments, you might want to tune Talos for similar environments:

```yaml
# patch-lightweight.yaml
# Tune Talos for smaller nodes
machine:
  kubelet:
    extraArgs:
      system-reserved: cpu=100m,memory=256Mi
      kube-reserved: cpu=100m,memory=256Mi
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.9.0
cluster:
  proxy:
    disabled: true  # Disable kube-proxy if using Cilium
  network:
    cni:
      name: flannel  # Match your k3s CNI or switch to Cilium
```

Apply the configuration to your new nodes:

```bash
# Apply to control plane
talosctl apply-config --insecure \
  --nodes 10.0.0.10 \
  --file _out/controlplane.yaml

# Apply to workers
talosctl apply-config --insecure \
  --nodes 10.0.0.20 \
  --file _out/worker.yaml

# Bootstrap the first control plane node
talosctl config endpoint 10.0.0.10
talosctl config node 10.0.0.10
talosctl bootstrap

# Get kubeconfig
talosctl kubeconfig ./talos-kubeconfig
```

## Step 4: Install Supporting Infrastructure

Before migrating workloads, install the infrastructure components that k3s provided automatically:

```bash
export KUBECONFIG=./talos-kubeconfig

# Install an ingress controller (k3s bundled Traefik)
helm repo add traefik https://traefik.github.io/charts
helm install traefik traefik/traefik -n kube-system

# If you were using k3s local-path-provisioner, install it manually
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml

# Or install a CSI driver like Longhorn for production storage
helm repo add longhorn https://charts.longhorn.io
helm install longhorn longhorn/longhorn -n longhorn-system --create-namespace

# Install metrics-server (k3s included this by default)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

## Step 5: Migrate Workloads

Now deploy your applications to the new cluster. If you were using k3s HelmChart CRDs, convert those to standard Helm installations or integrate them into a GitOps workflow:

```bash
# Example: convert a k3s HelmChart CR to a standard Helm install
# Old k3s HelmChart:
# apiVersion: helm.cattle.io/v1
# kind: HelmChart
# metadata:
#   name: my-app
# spec:
#   chart: my-app
#   repo: https://charts.example.com
#   valuesContent: |-
#     replicas: 3

# Equivalent Helm command:
helm repo add example https://charts.example.com
helm install my-app example/my-app --set replicas=3
```

For stateful workloads, use Velero or manual data migration:

```bash
# Using Velero to restore specific namespaces
velero restore create app-restore \
  --from-backup k3s-full-backup \
  --include-namespaces my-app-namespace

# For manual PV data migration, you can use rsync between nodes
# From the old k3s node to a temporary location
rsync -avz user@k3s-node:/var/lib/rancher/k3s/storage/ ./pv-data/
```

## Step 6: Verify and Switch Over

Run thorough verification checks on the new cluster:

```bash
# Check all pods are running
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# Verify services are accessible
kubectl get svc --all-namespaces

# Run any smoke tests you have
kubectl run test-pod --image=busybox --rm -it --restart=Never -- \
  wget -qO- http://my-service.my-namespace.svc.cluster.local

# Check persistent data integrity
kubectl exec -n my-app my-stateful-pod-0 -- ls -la /data/
```

Once everything checks out, update your DNS records and load balancers to point at the new Talos cluster nodes.

## Handling k3s-Specific Features

A few k3s features need special attention during migration:

**Service Load Balancer**: k3s includes ServiceLB (formerly Klipper) for bare-metal load balancing. On Talos, replace this with MetalLB:

```bash
helm repo add metallb https://metallb.github.io/metallb
helm install metallb metallb/metallb -n metallb-system --create-namespace
```

**Embedded Registry Mirror**: If you configured k3s registry mirrors in `/etc/rancher/k3s/registries.yaml`, translate that to the Talos machine configuration:

```yaml
# In your Talos machine config
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://your-mirror.example.com
```

**Auto-deploying Manifests**: k3s watches `/var/lib/rancher/k3s/server/manifests/` for auto-deployment. In Talos, use a GitOps tool like ArgoCD or Flux to achieve the same result in a more robust way.

## Wrapping Up

Migrating from k3s to Talos Linux involves more setup work upfront because k3s bundles so many features out of the box. However, the result is a cluster where the operating system layer is locked down, upgrades are atomic, and configuration drift is impossible. For production environments where security and reliability matter more than quick setup, the trade-off is well worth it. Plan your migration carefully, run both clusters in parallel during the transition, and make sure you have accounted for all the k3s-specific features your workloads depend on before making the final cutover.
