# How to Migrate from AKS to Self-Hosted Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, AKS, Azure, Migration, Self-Hosted, Cloud Migration

Description: A practical guide for migrating Azure Kubernetes Service workloads to a self-hosted Talos Linux cluster while replacing Azure-specific dependencies.

---

Azure Kubernetes Service provides a managed control plane and tight integration with Azure services, but that integration comes with costs, complexity, and vendor lock-in. If you are looking to reduce your Azure spend, gain more control over your Kubernetes infrastructure, or simply want to run on an immutable operating system designed for Kubernetes, migrating from AKS to Talos Linux is worth considering. This guide covers the entire migration process, from auditing your Azure dependencies to cutting over to the new cluster.

## Reasons to Leave AKS

AKS does not charge for the control plane (unlike EKS and GKE), but the total cost of ownership extends far beyond that. You are paying for Azure VMs, Azure Disk storage, Azure Load Balancers, Virtual Networks, and all the Azure services your workloads consume. AKS also has its own set of constraints: upgrade windows, node pool limitations, and the occasional Azure-specific issue that you would not encounter on a self-hosted cluster.

Talos Linux eliminates the dependency on any cloud provider. You get a consistent experience whether you run on bare metal, Azure, AWS, or your own hardware. The immutable OS design means nodes cannot be tampered with, and upgrades are atomic operations that take seconds.

## Step 1: Audit Your AKS Dependencies

AKS clusters frequently rely on Azure services. You need to identify every one of them:

```bash
# Check for Azure Disk PVs
kubectl get pv -o json | \
  jq '.items[] | select(.spec.csi.driver=="disk.csi.azure.com") | {name: .metadata.name, size: .spec.capacity.storage}'

# Check for Azure File PVs
kubectl get pv -o json | \
  jq '.items[] | select(.spec.csi.driver=="file.csi.azure.com")'

# Find pods using Azure Workload Identity (or AAD Pod Identity)
kubectl get sa --all-namespaces -o json | \
  jq '.items[] | select(.metadata.annotations["azure.workload.identity/client-id"]!=null)'

# List Azure-specific ingress resources
kubectl get ingress --all-namespaces -o json | \
  jq '.items[] | select(.spec.ingressClassName=="azure-application-gateway" or .metadata.annotations["kubernetes.io/ingress.class"]=="azure/application-gateway")'

# Check for Azure Key Vault SecretProviderClass
kubectl get secretproviderclass --all-namespaces

# List all LoadBalancer services (using Azure LB)
kubectl get svc --all-namespaces -o json | \
  jq '.items[] | select(.spec.type=="LoadBalancer") | {ns: .metadata.namespace, name: .metadata.name}'
```

Common AKS-to-Talos replacement mappings:

| Azure Service | Self-Hosted Replacement |
|---|---|
| Azure Disk CSI | Longhorn, Rook-Ceph |
| Azure File CSI | Rook-CephFS, NFS Provisioner |
| Azure App Gateway Ingress | nginx-ingress, Traefik |
| Azure Workload Identity | HashiCorp Vault |
| Azure Key Vault (SecretStore) | Vault, Sealed Secrets |
| Azure Load Balancer | MetalLB |
| Azure Monitor / Container Insights | Prometheus + Grafana |

## Step 2: Back Up Your Cluster

Create reliable backups before any migration work:

```bash
# Install Velero with Azure provider
velero install \
  --provider azure \
  --bucket velero-backups \
  --secret-file ./azure-credentials \
  --backup-location-config resourceGroup=my-rg,storageAccount=myvelero \
  --snapshot-location-config apiTimeout=10m,resourceGroup=my-rg

# Create a full backup
velero backup create aks-migration \
  --include-namespaces '*' \
  --default-volumes-to-fs-backup \
  --wait

# Verify backup
velero backup describe aks-migration --details

# Also export resources as YAML for reference
kubectl get all --all-namespaces -o yaml > aks-resources-backup.yaml
```

## Step 3: Provision Talos Infrastructure

Set up your target environment and generate Talos configurations:

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Generate secrets and machine configs
talosctl gen secrets -o secrets.yaml
talosctl gen config aks-migrated https://10.0.0.100:6443 \
  --with-secrets secrets.yaml \
  --output-dir _out
```

Create configuration patches based on your environment:

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
    # If migrating from AKS with Azure CNI, match the pod CIDR
cluster:
  network:
    podSubnets:
      - 10.244.0.0/16
    serviceSubnets:
      - 10.96.0.0/12
  apiServer:
    certSANs:
      - 10.0.0.100
      - api.k8s.example.com
  controllerManager:
    extraArgs:
      bind-address: 0.0.0.0
  scheduler:
    extraArgs:
      bind-address: 0.0.0.0
```

Apply and bootstrap:

```bash
# Patch the generated configs
talosctl machineconfig patch _out/controlplane.yaml \
  --patch @talos-patch.yaml \
  --output _out/cp-patched.yaml

# Apply to control plane nodes
talosctl apply-config --insecure --nodes 10.0.0.10 --file _out/cp-patched.yaml
talosctl apply-config --insecure --nodes 10.0.0.11 --file _out/cp-patched.yaml
talosctl apply-config --insecure --nodes 10.0.0.12 --file _out/cp-patched.yaml

# Apply to worker nodes
talosctl apply-config --insecure --nodes 10.0.0.20 --file _out/worker.yaml
talosctl apply-config --insecure --nodes 10.0.0.21 --file _out/worker.yaml

# Bootstrap
export TALOSCONFIG="_out/talosconfig"
talosctl config endpoint 10.0.0.10
talosctl config node 10.0.0.10
talosctl bootstrap
talosctl kubeconfig ./kubeconfig
```

## Step 4: Install Replacement Services

Set up the self-hosted equivalents of Azure managed services:

```bash
export KUBECONFIG=./kubeconfig

# Wait for nodes to be ready
kubectl get nodes -w

# Install Cilium as CNI (replacing Azure CNI)
helm repo add cilium https://helm.cilium.io
helm install cilium cilium/cilium -n kube-system \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=true

# Install Longhorn for storage (replacing Azure Disk/File)
helm repo add longhorn https://charts.longhorn.io
helm install longhorn longhorn/longhorn -n longhorn-system --create-namespace \
  --set defaultSettings.defaultReplicaCount=3 \
  --set defaultSettings.defaultDataLocality=best-effort

# Create a default storage class
cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: default
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: driver.longhorn.io
parameters:
  numberOfReplicas: "3"
  dataLocality: best-effort
reclaimPolicy: Delete
volumeBindingMode: Immediate
EOF

# Install MetalLB (replacing Azure Load Balancer)
helm repo add metallb https://metallb.github.io/metallb
helm install metallb metallb/metallb -n metallb-system --create-namespace

# Configure MetalLB address pool
cat <<EOF | kubectl apply -f -
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: production
  namespace: metallb-system
spec:
  addresses:
    - 10.0.0.100-10.0.0.150
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: production
  namespace: metallb-system
spec:
  ipAddressPools:
    - production
EOF

# Install nginx-ingress (replacing Azure App Gateway)
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx --create-namespace

# Install monitoring (replacing Azure Monitor/Container Insights)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install monitoring prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace
```

## Step 5: Handle Azure Key Vault Migration

If you were using Azure Key Vault with the Secrets Store CSI driver, migrate those secrets to your new secrets management solution:

```bash
# Export secrets from Azure Key Vault using Azure CLI
az keyvault secret list --vault-name my-vault -o json | \
  jq '.[].name' -r | while read secret; do
    value=$(az keyvault secret show --vault-name my-vault --name $secret -o json | jq '.value' -r)
    echo "Secret: $secret"
    # Store in Vault or as Kubernetes secrets
    kubectl create secret generic $secret \
      --from-literal=value="$value" \
      -n my-app --dry-run=client -o yaml | kubectl apply -f -
done
```

For a production setup, use HashiCorp Vault or Sealed Secrets instead of plain Kubernetes secrets.

## Step 6: Migrate Workloads

Convert Azure-specific resource definitions and deploy:

```bash
# Update Ingress resources
# Before (AKS with App Gateway):
# apiVersion: networking.k8s.io/v1
# kind: Ingress
# metadata:
#   annotations:
#     appgw.ingress.kubernetes.io/ssl-redirect: "true"
#     appgw.ingress.kubernetes.io/backend-path-prefix: "/"

# After (nginx):
# apiVersion: networking.k8s.io/v1
# kind: Ingress
# metadata:
#   annotations:
#     nginx.ingress.kubernetes.io/ssl-redirect: "true"
#     nginx.ingress.kubernetes.io/rewrite-target: /

# Remove SecretProviderClass references from pod specs
# Replace volumeMounts that reference Azure Key Vault with
# standard Kubernetes secret references

# Deploy workloads
kubectl apply -f ./migrated-manifests/
```

## Step 7: Verify and Cut Over

Perform thorough testing:

```bash
# Check cluster health
kubectl get nodes -o wide
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# Verify storage is working
kubectl get pvc --all-namespaces
kubectl get pv

# Test connectivity
kubectl run test --rm -it --image=busybox --restart=Never -- \
  wget -qO- http://my-service.my-namespace.svc.cluster.local

# Run smoke tests
curl -k https://api.k8s.example.com/version
```

Update DNS records to point to the new cluster endpoints. Keep the AKS cluster running for a rollback period.

## Wrapping Up

Migrating from AKS to Talos Linux trades the convenience of Azure's managed services for full control over your infrastructure. The most challenging part is replacing Azure-specific integrations like Workload Identity, Key Vault, and the App Gateway Ingress Controller. Plan for each of these replacements before starting the migration, migrate one namespace at a time if possible, and keep the old AKS cluster available until you are confident everything works. The end result is a cluster that costs less to operate, upgrades more predictably, and runs on an OS that was designed specifically for Kubernetes.
