# How to Migrate from EKS to Self-Hosted Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, AWS, EKS, Migration, Self-Hosted, Cloud Migration

Description: A comprehensive guide to migrating your Amazon EKS workloads to a self-hosted Talos Linux Kubernetes cluster for better control and reduced cloud costs.

---

Amazon EKS is a managed Kubernetes service that handles the control plane for you, but it comes with significant costs and vendor lock-in. As your clusters grow, the EKS management fee, combined with the cost of running EC2 instances and all the AWS-specific integrations, adds up quickly. Migrating to a self-hosted Talos Linux cluster gives you full control over your infrastructure while potentially cutting costs dramatically. This guide walks through the process of moving from EKS to Talos Linux.

## Why Leave EKS

EKS charges $0.10 per hour per cluster for the control plane alone - that is roughly $73 per month before you even run a single workload. Add in the cost of managed node groups, EBS volumes, ALBs, NAT gateways, and data transfer charges, and you are looking at a substantial monthly bill.

Beyond cost, there are other reasons to consider self-hosting. EKS lags behind upstream Kubernetes releases, sometimes by months. You are limited to the configurations AWS allows. And your infrastructure is tightly coupled to AWS services, making multi-cloud or hybrid strategies difficult.

Talos Linux gives you a Kubernetes cluster that tracks upstream releases closely, runs anywhere (bare metal, any cloud, any hypervisor), and has a minimal attack surface thanks to its immutable design.

## Step 1: Map Your AWS Dependencies

The biggest challenge in leaving EKS is untangling your AWS service dependencies. Go through your cluster and identify everything that talks to an AWS service:

```bash
# Find all AWS Load Balancer Controller resources
kubectl get ingress --all-namespaces -o json | \
  jq '.items[] | select(.metadata.annotations["kubernetes.io/ingress.class"]=="alb")'

# Check for EBS CSI driver usage
kubectl get sc
kubectl get pv --all-namespaces -o json | \
  jq '.items[] | select(.spec.csi.driver=="ebs.csi.aws.com")'

# Find pods using IAM roles (IRSA)
kubectl get sa --all-namespaces -o json | \
  jq '.items[] | select(.metadata.annotations["eks.amazonaws.com/role-arn"]!=null) | {namespace: .metadata.namespace, name: .metadata.name, role: .metadata.annotations["eks.amazonaws.com/role-arn"]}'

# Check for EFS mounts
kubectl get pv -o json | \
  jq '.items[] | select(.spec.csi.driver=="efs.csi.aws.com")'

# List all services of type LoadBalancer
kubectl get svc --all-namespaces -o json | \
  jq '.items[] | select(.spec.type=="LoadBalancer") | {namespace: .metadata.namespace, name: .metadata.name}'
```

For each AWS dependency, plan a replacement:

| AWS Service | Self-Hosted Replacement |
|---|---|
| ALB/NLB | MetalLB + nginx-ingress or Cilium |
| EBS CSI | Longhorn, Rook-Ceph, or OpenEBS |
| EFS CSI | NFS provisioner or Rook-CephFS |
| IRSA (IAM Roles) | Vault or static credentials |
| Route53 (ExternalDNS) | ExternalDNS with other providers |
| AWS Secrets Manager | HashiCorp Vault or Sealed Secrets |

## Step 2: Back Up Everything

Take comprehensive backups before starting the migration:

```bash
# Install Velero with AWS provider
velero install \
  --provider aws \
  --bucket my-velero-backups \
  --secret-file ./aws-credentials \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1

# Create a full cluster backup
velero backup create eks-full-backup \
  --include-namespaces '*' \
  --default-volumes-to-fs-backup

# Verify the backup completed
velero backup describe eks-full-backup --details
```

Also export your workload definitions separately as a safety net:

```bash
# Export all non-system resources
for ns in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n' | grep -v kube-); do
  kubectl get deploy,sts,svc,configmap,secret,ingress -n $ns -o yaml > "backup-${ns}.yaml"
done
```

## Step 3: Provision Talos Infrastructure

Decide where your Talos cluster will run. Common options include bare-metal servers, a different cloud provider, or even AWS EC2 (if you want to stay on AWS but ditch EKS).

For bare metal or a colocation facility:

```bash
# Generate Talos configurations
talosctl gen secrets -o secrets.yaml
talosctl gen config eks-migrated https://your-vip:6443 \
  --with-secrets secrets.yaml \
  --output-dir _out

# Customize the configuration for your environment
# Example patch for production-grade settings
cat > production-patch.yaml << 'PATCH'
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
      - 10.244.0.0/16
    serviceSubnets:
      - 10.96.0.0/12
  apiServer:
    certSANs:
      - your-vip
      - your-external-dns
  controllerManager:
    extraArgs:
      bind-address: 0.0.0.0
  scheduler:
    extraArgs:
      bind-address: 0.0.0.0
PATCH

talosctl machineconfig patch _out/controlplane.yaml \
  --patch @production-patch.yaml \
  --output _out/controlplane-prod.yaml
```

Boot your nodes with the Talos image and apply configurations:

```bash
# Apply configs
talosctl apply-config --insecure --nodes 10.0.0.10 --file _out/controlplane-prod.yaml
talosctl apply-config --insecure --nodes 10.0.0.11 --file _out/controlplane-prod.yaml
talosctl apply-config --insecure --nodes 10.0.0.12 --file _out/controlplane-prod.yaml
talosctl apply-config --insecure --nodes 10.0.0.20 --file _out/worker.yaml

# Bootstrap
export TALOSCONFIG="_out/talosconfig"
talosctl config endpoint 10.0.0.10
talosctl config node 10.0.0.10
talosctl bootstrap

# Get kubeconfig
talosctl kubeconfig ./kubeconfig
```

## Step 4: Install Replacement Infrastructure

Replace all the AWS-managed components:

```bash
export KUBECONFIG=./kubeconfig

# Storage - Install Longhorn as EBS replacement
helm repo add longhorn https://charts.longhorn.io
helm install longhorn longhorn/longhorn -n longhorn-system --create-namespace \
  --set defaultSettings.defaultReplicaCount=3

# Load Balancing - Install MetalLB
helm repo add metallb https://metallb.github.io/metallb
helm install metallb metallb/metallb -n metallb-system --create-namespace

# Configure MetalLB IP pool
cat <<EOF | kubectl apply -f -
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default-pool
  namespace: metallb-system
spec:
  addresses:
    - 10.0.0.100-10.0.0.200
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: default
  namespace: metallb-system
EOF

# Ingress Controller - Replace AWS ALB
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx --create-namespace

# Secrets Management - Replace AWS Secrets Manager
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault hashicorp/vault -n vault --create-namespace
```

## Step 5: Migrate Workloads

Before migrating, update your application manifests to remove AWS-specific annotations and configurations:

```bash
# Example: Convert an ALB Ingress to nginx Ingress
# Before (EKS with ALB):
# apiVersion: networking.k8s.io/v1
# kind: Ingress
# metadata:
#   annotations:
#     kubernetes.io/ingress.class: alb
#     alb.ingress.kubernetes.io/scheme: internet-facing
#     alb.ingress.kubernetes.io/target-type: ip

# After (nginx Ingress):
# apiVersion: networking.k8s.io/v1
# kind: Ingress
# metadata:
#   annotations:
#     kubernetes.io/ingress.class: nginx

# Deploy your updated manifests
kubectl apply -f ./updated-manifests/

# Or use Velero restore with resource modifications
velero restore create eks-restore \
  --from-backup eks-full-backup \
  --include-namespaces my-app \
  --exclude-resources persistentvolumes
```

For data migration, you will need to move your EBS volume data to the new storage backend:

```bash
# One approach: use a migration pod that reads from an EBS snapshot
# and writes to the new PVC

# Create a PVC on the new cluster
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: migrated-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 50Gi
EOF

# Use rsync or similar tools to transfer data
# from the old EBS-backed pod to the new PVC
```

## Step 6: Update DNS and Cut Over

Once your workloads are running and verified on the Talos cluster:

```bash
# Verify all pods are healthy
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# Test application endpoints
curl -H "Host: app.example.com" http://10.0.0.100/health

# Update DNS to point to your new ingress IP
# This depends on your DNS provider
```

## Cost Comparison

After migrating, track your spending. A typical comparison might look like this: three m5.xlarge EKS nodes with control plane, EBS, and networking costs around $800-1000 per month on AWS. The same capacity on bare-metal servers or a simpler cloud provider running Talos might cost $200-400 per month. Your mileage will vary, but the savings are real.

## Wrapping Up

Migrating from EKS to self-hosted Talos Linux is one of the more involved migrations because of all the AWS service dependencies you need to replace. The key is to methodically identify every AWS integration, find a self-hosted replacement, and test thoroughly before cutting over. The payoff is significant - lower costs, faster Kubernetes upgrades, no vendor lock-in, and a more secure infrastructure. Take your time with this migration, and do not try to rush it. A phased approach where you move one application at a time is often safer than a big-bang migration.
