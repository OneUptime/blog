# How to Set Up Cluster API (CAPI) to Provision Kubernetes Clusters Declaratively

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cluster API, Infrastructure as Code, Automation

Description: Learn how to install and configure Cluster API (CAPI) to provision and manage Kubernetes clusters declaratively using Kubernetes-native APIs and GitOps workflows.

---

Cluster API (CAPI) brings Kubernetes-native declarative APIs to cluster lifecycle management. Instead of using cloud-specific tools or custom scripts to provision clusters, you define clusters as Kubernetes resources and let CAPI handle the infrastructure provisioning, configuration, and ongoing management. This approach enables GitOps workflows for cluster management and provides consistent operations across different infrastructure providers.

## Understanding Cluster API Architecture

Cluster API consists of several components working together. The management cluster runs CAPI controllers that watch for cluster-related resources. When you create a Cluster resource, CAPI provisions the infrastructure, bootstraps control plane nodes, and joins worker nodes. The architecture separates concerns into bootstrap, control plane, and infrastructure providers.

The core concepts include Cluster (defines the cluster), Machine (represents a node), MachineDeployment (manages groups of machines), and provider-specific resources for infrastructure details. This layered approach allows the same cluster definitions to work across AWS, Azure, GCP, vSphere, and other providers.

## Installing Cluster API Management Tools

Start by installing clusterctl, the CLI tool for managing Cluster API:

```bash
# Download the latest clusterctl binary
curl -L https://github.com/kubernetes-sigs/cluster-api/releases/download/v1.6.0/clusterctl-linux-amd64 \
  -o clusterctl

# Make it executable and move to PATH
chmod +x clusterctl
sudo mv clusterctl /usr/local/bin/

# Verify installation
clusterctl version
```

You need a management cluster to run CAPI controllers. Use kind for local development:

```bash
# Install kind if not already available
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/

# Create a management cluster
kind create cluster --name capi-management

# Verify cluster is ready
kubectl cluster-info --context kind-capi-management
kubectl get nodes
```

## Initializing Cluster API

Initialize CAPI in your management cluster with the providers you need:

```bash
# Initialize Cluster API with Docker provider (for local testing)
clusterctl init --infrastructure docker

# For AWS provider
export AWS_REGION=us-west-2
export AWS_ACCESS_KEY_ID=<your-access-key>
export AWS_SECRET_ACCESS_KEY=<your-secret-key>
export AWS_B64ENCODED_CREDENTIALS=$(clusterctl init --infrastructure aws --list-images | base64 -w0)

clusterctl init --infrastructure aws

# For multiple providers
clusterctl init \
  --bootstrap kubeadm \
  --control-plane kubeadm \
  --infrastructure aws,azure
```

Verify the installation:

```bash
# Check CAPI controllers are running
kubectl get pods -n capi-system
kubectl get pods -n capi-kubeadm-bootstrap-system
kubectl get pods -n capi-kubeadm-control-plane-system
kubectl get pods -n capd-system  # Docker provider

# List available cluster templates
clusterctl generate cluster --list-variables docker
```

## Creating Your First Cluster with Docker Provider

The Docker provider creates Kubernetes clusters using Docker containers as nodes. This is perfect for testing CAPI workflows:

```bash
# Set cluster parameters
export CLUSTER_NAME="dev-cluster"
export KUBERNETES_VERSION="v1.28.0"
export CONTROL_PLANE_MACHINE_COUNT=1
export WORKER_MACHINE_COUNT=2

# Generate cluster manifest
clusterctl generate cluster ${CLUSTER_NAME} \
  --infrastructure docker \
  --kubernetes-version ${KUBERNETES_VERSION} \
  --control-plane-machine-count ${CONTROL_PLANE_MACHINE_COUNT} \
  --worker-machine-count ${WORKER_MACHINE_COUNT} \
  > ${CLUSTER_NAME}.yaml

# Review the generated manifest
cat ${CLUSTER_NAME}.yaml

# Apply the cluster definition
kubectl apply -f ${CLUSTER_NAME}.yaml
```

Monitor cluster creation:

```bash
# Watch cluster status
kubectl get clusters
kubectl get cluster ${CLUSTER_NAME}

# Watch machines being created
kubectl get machines
kubectl get machinedeployments

# View detailed cluster status
clusterctl describe cluster ${CLUSTER_NAME}

# Check control plane status
kubectl get kubeadmcontrolplane
```

Wait for the cluster to be ready:

```bash
# Wait for control plane to initialize
kubectl wait --for=condition=ControlPlaneReady cluster/${CLUSTER_NAME} --timeout=600s

# Get the kubeconfig for the workload cluster
clusterctl get kubeconfig ${CLUSTER_NAME} > ${CLUSTER_NAME}.kubeconfig

# Test access to the workload cluster
kubectl --kubeconfig=${CLUSTER_NAME}.kubeconfig get nodes
```

## Creating a Custom Cluster Template

Build reusable templates for your organization's cluster standards:

```yaml
# cluster-template.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: ${CLUSTER_NAME}
  namespace: default
  labels:
    environment: ${ENVIRONMENT}
    team: ${TEAM}
spec:
  clusterNetwork:
    pods:
      cidrBlocks:
      - 192.168.0.0/16
    services:
      cidrBlocks:
      - 10.96.0.0/12
  controlPlaneRef:
    apiVersion: controlplane.cluster.x-k8s.io/v1beta1
    kind: KubeadmControlPlane
    name: ${CLUSTER_NAME}-control-plane
  infrastructureRef:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
    kind: DockerCluster
    name: ${CLUSTER_NAME}
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: DockerCluster
metadata:
  name: ${CLUSTER_NAME}
  namespace: default
spec:
  loadBalancer:
    imageRepository: kindest/haproxy
    imageTag: v20230606-42a2262b
---
apiVersion: controlplane.cluster.x-k8s.io/v1beta1
kind: KubeadmControlPlane
metadata:
  name: ${CLUSTER_NAME}-control-plane
  namespace: default
spec:
  kubeadmConfigSpec:
    clusterConfiguration:
      apiServer:
        certSANs:
        - localhost
        - 127.0.0.1
      controllerManager:
        extraArgs:
          enable-hostpath-provisioner: "true"
    initConfiguration:
      nodeRegistration:
        criSocket: unix:///var/run/containerd/containerd.sock
        kubeletExtraArgs:
          eviction-hard: nodefs.available<0%,nodefs.inodesFree<0%,imagefs.available<0%
    joinConfiguration:
      nodeRegistration:
        criSocket: unix:///var/run/containerd/containerd.sock
        kubeletExtraArgs:
          eviction-hard: nodefs.available<0%,nodefs.inodesFree<0%,imagefs.available<0%
  machineTemplate:
    infrastructureRef:
      apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
      kind: DockerMachineTemplate
      name: ${CLUSTER_NAME}-control-plane
  replicas: ${CONTROL_PLANE_MACHINE_COUNT}
  version: ${KUBERNETES_VERSION}
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: DockerMachineTemplate
metadata:
  name: ${CLUSTER_NAME}-control-plane
  namespace: default
spec:
  template:
    spec:
      extraMounts:
      - containerPath: /var/run/docker.sock
        hostPath: /var/run/docker.sock
---
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: ${CLUSTER_NAME}-md-0
  namespace: default
spec:
  clusterName: ${CLUSTER_NAME}
  replicas: ${WORKER_MACHINE_COUNT}
  selector:
    matchLabels: {}
  template:
    spec:
      bootstrap:
        configRef:
          apiVersion: bootstrap.cluster.x-k8s.io/v1beta1
          kind: KubeadmConfigTemplate
          name: ${CLUSTER_NAME}-md-0
      clusterName: ${CLUSTER_NAME}
      infrastructureRef:
        apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
        kind: DockerMachineTemplate
        name: ${CLUSTER_NAME}-md-0
      version: ${KUBERNETES_VERSION}
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: DockerMachineTemplate
metadata:
  name: ${CLUSTER_NAME}-md-0
  namespace: default
spec:
  template:
    spec:
      extraMounts:
      - containerPath: /var/run/docker.sock
        hostPath: /var/run/docker.sock
---
apiVersion: bootstrap.cluster.x-k8s.io/v1beta1
kind: KubeadmConfigTemplate
metadata:
  name: ${CLUSTER_NAME}-md-0
  namespace: default
spec:
  template:
    spec:
      joinConfiguration:
        nodeRegistration:
          criSocket: unix:///var/run/containerd/containerd.sock
          kubeletExtraArgs:
            eviction-hard: nodefs.available<0%,nodefs.inodesFree<0%,imagefs.available<0%
```

Use the template:

```bash
# Set environment variables
export CLUSTER_NAME="staging-cluster"
export ENVIRONMENT="staging"
export TEAM="platform"
export KUBERNETES_VERSION="v1.28.0"
export CONTROL_PLANE_MACHINE_COUNT=3
export WORKER_MACHINE_COUNT=5

# Apply the template
envsubst < cluster-template.yaml | kubectl apply -f -

# Monitor deployment
watch kubectl get clusters,machines,machinedeployments
```

## Installing CNI and Cloud Controller Manager

After the cluster is provisioned, install required components:

```bash
# Get workload cluster kubeconfig
clusterctl get kubeconfig ${CLUSTER_NAME} > ${CLUSTER_NAME}.kubeconfig

# Install Calico CNI
kubectl --kubeconfig=${CLUSTER_NAME}.kubeconfig apply -f \
  https://raw.githubusercontent.com/projectcalico/calico/v3.26.1/manifests/calico.yaml

# Verify nodes become ready
kubectl --kubeconfig=${CLUSTER_NAME}.kubeconfig get nodes

# Install cloud-specific controller (example for AWS)
kubectl --kubeconfig=${CLUSTER_NAME}.kubeconfig apply -f \
  https://raw.githubusercontent.com/kubernetes/cloud-provider-aws/master/manifests/aws-cloud-controller-manager-daemonset.yaml
```

## Scaling Clusters Declaratively

Scale your cluster by modifying the resource specifications:

```bash
# Scale control plane
kubectl patch kubeadmcontrolplane ${CLUSTER_NAME}-control-plane \
  --type merge \
  --patch '{"spec":{"replicas":5}}'

# Scale worker nodes
kubectl patch machinedeployment ${CLUSTER_NAME}-md-0 \
  --type merge \
  --patch '{"spec":{"replicas":10}}'

# Watch scaling progress
kubectl get machines -w
```

## Upgrading Kubernetes Version

Upgrade clusters by updating the version field:

```bash
# Upgrade control plane
kubectl patch kubeadmcontrolplane ${CLUSTER_NAME}-control-plane \
  --type merge \
  --patch '{"spec":{"version":"v1.29.0"}}'

# Upgrade worker nodes
kubectl patch machinedeployment ${CLUSTER_NAME}-md-0 \
  --type merge \
  --patch '{"spec":{"template":{"spec":{"version":"v1.29.0"}}}}'

# Monitor upgrade progress
clusterctl describe cluster ${CLUSTER_NAME}
kubectl get machines
```

## Managing Cluster Lifecycle with GitOps

Store cluster definitions in Git and use automated deployment:

```bash
# Create Git repository structure
mkdir -p clusters/production clusters/staging
mv staging-cluster.yaml clusters/staging/

# Use Flux or ArgoCD to sync cluster definitions
kubectl apply -f - <<EOF
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: cluster-configs
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/yourorg/cluster-configs
  branch: main
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: clusters
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters
  prune: true
  sourceRef:
    kind: GitRepository
    name: cluster-configs
EOF
```

## Cleaning Up Clusters

Delete clusters cleanly:

```bash
# Delete the cluster resource (this removes all infrastructure)
kubectl delete cluster ${CLUSTER_NAME}

# Watch cleanup progress
kubectl get clusters
kubectl get machines

# Verify all resources are removed
kubectl get dockerclusters
kubectl get dockermachines
```

Cluster API transforms cluster management into a declarative, version-controlled process. You can now manage hundreds of clusters using familiar Kubernetes APIs and GitOps practices, with consistent operations across any infrastructure provider.
