# How to Set Up Rancher on AWS with EKS Anywhere

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, AWS, EKS Anywhere

Description: A guide to deploying Rancher on top of Amazon EKS Anywhere to manage EKS-A clusters and other downstream clusters from a single control plane.

## Introduction

EKS Anywhere (EKS-A) lets you run AWS-supported Kubernetes clusters on-premises or in data centers. Running Rancher on top of EKS-A combines AWS's opinionated Kubernetes distribution with Rancher's multi-cluster management capabilities. This guide walks through deploying a production-ready Rancher instance on EKS-A.

## Prerequisites

- `eksctl anywhere` CLI installed (`brew install aws/tap/eks-anywhere`)
- `kubectl` and Helm 3 installed
- For vSphere deployment: a supported vSphere 7 or 8 environment and vCenter credentials
- For bare-metal: Tinkerbell stack and BMC access
- A load balancer for your ingress controller (for on-premises EKS-A, this is commonly MetalLB)
- Public DNS entry pointing to your Rancher hostname if you use Let's Encrypt

## Step 1: Create an EKS-A Management Cluster

```bash
# Generate a cluster configuration

eksctl anywhere generate clusterconfig my-rancher-cluster \
  --provider vsphere > my-rancher-cluster.yaml

# Edit the cluster config to specify your infrastructure details
# Key fields: datacenterRef, controlPlaneConfiguration.endpoint.host,
# externalEtcdConfiguration, and workerNodeGroupConfigurations
```

```yaml
# my-rancher-cluster.yaml (abbreviated)
apiVersion: anywhere.eks.amazonaws.com/v1alpha1
kind: Cluster
metadata:
  name: my-rancher-cluster
spec:
  kubernetesVersion: "1.31"
  controlPlaneConfiguration:
    count: 3
    endpoint:
      host: "192.168.0.10"
    machineGroupRef:
      kind: VSphereMachineConfig
      name: my-rancher-cluster-cp
  workerNodeGroupConfigurations:
    - name: md-0
      count: 3
      machineGroupRef:
        kind: VSphereMachineConfig
        name: my-rancher-cluster-worker
  externalEtcdConfiguration:
    count: 3
    machineGroupRef:
      kind: VSphereMachineConfig
      name: my-rancher-cluster-etcd
  datacenterRef:
    kind: VSphereDatacenterConfig
    name: my-vsphere
```

```bash
# Create the EKS-A cluster
eksctl anywhere create cluster -f my-rancher-cluster.yaml

# This process takes 20-40 minutes
# The kubeconfig is written to <cluster-name>/<cluster-name>-eks-a-cluster.kubeconfig
export KUBECONFIG="my-rancher-cluster/my-rancher-cluster-eks-a-cluster.kubeconfig"
kubectl get nodes
```

## Step 2: Install cert-manager

```bash
# Install cert-manager (required by Rancher)
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true

# Wait for cert-manager to be ready
kubectl wait --for=condition=Available \
  deployment/cert-manager \
  deployment/cert-manager-webhook \
  deployment/cert-manager-cainjector \
  -n cert-manager \
  --timeout=180s
```

## Step 3: Install Rancher on EKS-A

```bash
# Add the Rancher Helm repository
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update

# Install Rancher
helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --create-namespace \
  --set hostname=rancher.example.com \
  --set bootstrapPassword=admin \
  --set ingress.tls.source=letsEncrypt \
  --set letsEncrypt.email=admin@example.com \
  --set letsEncrypt.ingress.class=nginx \
  --set privateCA=true \
  --set replicas=3

# Wait for Rancher to be ready
kubectl rollout status deployment/rancher -n cattle-system --timeout=5m
```

Let's Encrypt uses HTTP-01 validation here, so `rancher.example.com` must be publicly reachable on port 80. For Rancher v2.9+ installs that use the default `strict` agent TLS mode, upload the Let's Encrypt CA to Rancher's `cacerts` setting before importing downstream clusters.

## Step 4: Configure the Ingress Controller

EKS Anywhere does not install an ingress controller by default. If you want to use `ingress-nginx`, make sure your environment also provides a `LoadBalancer` implementation, such as MetalLB on vSphere or bare metal.

```bash
# Install nginx ingress controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# Get the external IP after your load balancer assigns one
kubectl get service -n ingress-nginx ingress-nginx-controller

# Update your DNS record to point rancher.example.com → <EXTERNAL-IP>
```

## Step 5: Import Additional EKS-A Clusters into Rancher

```bash
# Create a second EKS-A cluster for workloads
# Set spec.managementCluster.name: my-rancher-cluster in workload-cluster.yaml
eksctl anywhere create cluster -f workload-cluster.yaml \
  --kubeconfig my-rancher-cluster/my-rancher-cluster-eks-a-cluster.kubeconfig

# Import it into Rancher
# In Rancher UI: Cluster Management → Import Existing → Generic

# Copy and run the displayed kubectl command on the workload cluster
kubectl --kubeconfig workload-cluster/workload-cluster-eks-a-cluster.kubeconfig \
  apply -f <rancher-import-manifest-url>
```

## Step 6: Upgrade EKS-A Clusters

Rancher can import EKS-A clusters, but EKS-A cluster creation and upgrades are still performed with `eksctl anywhere`:

```bash
eksctl anywhere upgrade cluster -f my-rancher-cluster.yaml

# For workload clusters, use the management cluster kubeconfig
eksctl anywhere upgrade cluster -f workload-cluster.yaml \
  --kubeconfig my-rancher-cluster/my-rancher-cluster-eks-a-cluster.kubeconfig
```

## Step 7: Set Up Monitoring

```bash
# Add the Rancher charts repository
helm repo add rancher-charts https://charts.rancher.io
helm repo update

# Install Rancher Monitoring (Prometheus + Grafana) on the Rancher cluster
helm install rancher-monitoring-crd \
  rancher-charts/rancher-monitoring-crd \
  -n cattle-monitoring-system \
  --create-namespace

helm install rancher-monitoring \
  rancher-charts/rancher-monitoring \
  -n cattle-monitoring-system \
  --set prometheus.prometheusSpec.retention=7d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi
```

## Conclusion

Running Rancher on EKS Anywhere combines the operational consistency of AWS-supported Kubernetes with Rancher's powerful multi-cluster management UI. EKS-A handles the Kubernetes lifecycle on your infrastructure while Rancher provides a centralized management plane, RBAC, monitoring, and GitOps tooling for imported downstream clusters. This combination is particularly powerful for enterprises that need cloud-parity on-premises without sacrificing central management visibility.
