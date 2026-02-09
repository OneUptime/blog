# How to Use Cluster API to Manage the Lifecycle of Multiple Kubernetes Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cluster API, Infrastructure as Code, Multi-Cluster, Lifecycle Management

Description: Learn how to use Cluster API to provision, scale, upgrade, and manage multiple Kubernetes clusters declaratively across different infrastructure providers.

---

Managing multiple Kubernetes clusters manually becomes unsustainable as your infrastructure grows. Cluster API (CAPI) provides a declarative, Kubernetes-native approach to cluster lifecycle management, allowing you to create, scale, upgrade, and delete clusters using familiar kubectl commands and GitOps workflows.

In this guide, you'll learn how to set up Cluster API and use it to manage multiple Kubernetes clusters across different cloud providers and on-premises environments.

## Understanding Cluster API Architecture

Cluster API treats Kubernetes clusters as resources that can be managed declaratively. The management cluster runs Cluster API controllers that reconcile cluster specifications with actual infrastructure. Target clusters are the workload clusters created and managed by Cluster API. Each infrastructure provider implements the Cluster API contract, enabling consistent cluster management across AWS, Azure, GCP, VMware, and bare metal.

The key concepts include the Cluster resource that defines the overall cluster configuration, Machine resources that represent individual nodes, MachineDeployment resources that manage groups of machines similar to Deployments, and provider-specific infrastructure resources like AWSCluster or AzureCluster.

## Installing Cluster API Management Cluster

Start by initializing a management cluster. You can use any Kubernetes cluster, but it should be highly available and well-maintained since it manages all your workload clusters.

```bash
# Install clusterctl CLI
curl -L https://github.com/kubernetes-sigs/cluster-api/releases/download/v1.6.0/clusterctl-linux-amd64 -o clusterctl
chmod +x clusterctl
sudo mv clusterctl /usr/local/bin/

# Initialize the management cluster with AWS provider
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=<your-access-key>
export AWS_SECRET_ACCESS_KEY=<your-secret-key>
export AWS_B64ENCODED_CREDENTIALS=$(clusterawsadm bootstrap credentials encode-as-profile)

clusterctl init --infrastructure aws
```

For multiple infrastructure providers:

```bash
# Initialize with multiple providers
clusterctl init \
  --infrastructure aws \
  --infrastructure azure \
  --infrastructure vsphere
```

Verify the installation:

```bash
kubectl get pods -n capi-system
kubectl get pods -n capa-system  # AWS provider
kubectl get providers
```

## Creating a Workload Cluster on AWS

Generate a cluster manifest using clusterctl:

```bash
export AWS_REGION=us-west-2
export AWS_SSH_KEY_NAME=my-ssh-key
export KUBERNETES_VERSION=v1.28.5
export CLUSTER_NAME=production-west

clusterctl generate cluster ${CLUSTER_NAME} \
  --kubernetes-version ${KUBERNETES_VERSION} \
  --control-plane-machine-count=3 \
  --worker-machine-count=5 \
  --infrastructure aws \
  > ${CLUSTER_NAME}.yaml
```

Customize the generated manifest:

```yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: production-west
  namespace: default
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
    name: production-west-control-plane
  infrastructureRef:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
    kind: AWSCluster
    name: production-west

---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSCluster
metadata:
  name: production-west
  namespace: default
spec:
  region: us-west-2
  sshKeyName: my-ssh-key
  networkSpec:
    vpc:
      availabilityZoneUsageLimit: 3
      availabilityZoneSelection: Ordered
    subnets:
    - availabilityZone: us-west-2a
      cidrBlock: 10.0.0.0/24
      isPublic: true
    - availabilityZone: us-west-2b
      cidrBlock: 10.0.1.0/24
      isPublic: true
    - availabilityZone: us-west-2c
      cidrBlock: 10.0.2.0/24
      isPublic: true

---
apiVersion: controlplane.cluster.x-k8s.io/v1beta1
kind: KubeadmControlPlane
metadata:
  name: production-west-control-plane
  namespace: default
spec:
  replicas: 3
  version: v1.28.5
  machineTemplate:
    infrastructureRef:
      apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
      kind: AWSMachineTemplate
      name: production-west-control-plane
  kubeadmConfigSpec:
    initConfiguration:
      nodeRegistration:
        kubeletExtraArgs:
          cloud-provider: aws
    clusterConfiguration:
      apiServer:
        extraArgs:
          cloud-provider: aws
      controllerManager:
        extraArgs:
          cloud-provider: aws
    joinConfiguration:
      nodeRegistration:
        kubeletExtraArgs:
          cloud-provider: aws

---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachineTemplate
metadata:
  name: production-west-control-plane
  namespace: default
spec:
  template:
    spec:
      instanceType: t3.large
      iamInstanceProfile: control-plane.cluster-api-provider-aws.sigs.k8s.io
      sshKeyName: my-ssh-key

---
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: production-west-workers
  namespace: default
spec:
  clusterName: production-west
  replicas: 5
  selector:
    matchLabels: {}
  template:
    spec:
      clusterName: production-west
      version: v1.28.5
      bootstrap:
        configRef:
          apiVersion: bootstrap.cluster.x-k8s.io/v1beta1
          kind: KubeadmConfigTemplate
          name: production-west-workers
      infrastructureRef:
        apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
        kind: AWSMachineTemplate
        name: production-west-workers

---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachineTemplate
metadata:
  name: production-west-workers
  namespace: default
spec:
  template:
    spec:
      instanceType: t3.xlarge
      iamInstanceProfile: nodes.cluster-api-provider-aws.sigs.k8s.io
      sshKeyName: my-ssh-key

---
apiVersion: bootstrap.cluster.x-k8s.io/v1beta1
kind: KubeadmConfigTemplate
metadata:
  name: production-west-workers
  namespace: default
spec:
  template:
    spec:
      joinConfiguration:
        nodeRegistration:
          kubeletExtraArgs:
            cloud-provider: aws
```

Apply the manifest to create the cluster:

```bash
kubectl apply -f ${CLUSTER_NAME}.yaml

# Watch cluster creation progress
kubectl get cluster --watch
kubectl get kubeadmcontrolplane
kubectl get machinedeployment
kubectl get machine
```

Get the kubeconfig for the new cluster:

```bash
clusterctl get kubeconfig ${CLUSTER_NAME} > ${CLUSTER_NAME}-kubeconfig.yaml
kubectl --kubeconfig ${CLUSTER_NAME}-kubeconfig.yaml get nodes
```

## Installing CNI and Storage

New clusters need a CNI plugin before nodes become ready:

```bash
# Install Calico CNI
kubectl --kubeconfig ${CLUSTER_NAME}-kubeconfig.yaml apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml

# Verify nodes are ready
kubectl --kubeconfig ${CLUSTER_NAME}-kubeconfig.yaml get nodes
```

Install a CSI driver for persistent storage:

```bash
# Install AWS EBS CSI driver
helm repo add aws-ebs-csi-driver https://kubernetes-sigs.github.io/aws-ebs-csi-driver
helm --kubeconfig ${CLUSTER_NAME}-kubeconfig.yaml install aws-ebs-csi-driver \
  aws-ebs-csi-driver/aws-ebs-csi-driver \
  --namespace kube-system
```

## Scaling Clusters

Scale worker nodes by updating the MachineDeployment:

```bash
# Scale workers to 10 nodes
kubectl patch machinedeployment production-west-workers \
  --type merge \
  --patch '{"spec":{"replicas":10}}'

# Watch scaling progress
kubectl get machines --watch
```

Scale control plane nodes:

```bash
# Scale control plane to 5 nodes
kubectl patch kubeadmcontrolplane production-west-control-plane \
  --type merge \
  --patch '{"spec":{"replicas":5}}'
```

## Upgrading Kubernetes Versions

Upgrade clusters by updating the version in control plane and worker resources:

```bash
# Upgrade control plane
kubectl patch kubeadmcontrolplane production-west-control-plane \
  --type merge \
  --patch '{"spec":{"version":"v1.29.0"}}'

# Watch the rolling upgrade
kubectl get kubeadmcontrolplane --watch
kubectl get machines --watch

# Upgrade workers
kubectl patch machinedeployment production-west-workers \
  --type merge \
  --patch '{"spec":{"template":{"spec":{"version":"v1.29.0"}}}}'
```

Cluster API performs rolling upgrades automatically, replacing nodes one at a time while maintaining cluster availability.

## Managing Multiple Clusters with ClusterClass

ClusterClass provides templates for creating standardized clusters:

```yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: ClusterClass
metadata:
  name: production-standard
  namespace: default
spec:
  controlPlane:
    ref:
      apiVersion: controlplane.cluster.x-k8s.io/v1beta1
      kind: KubeadmControlPlaneTemplate
      name: production-control-plane-template
    machineInfrastructure:
      ref:
        apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
        kind: AWSMachineTemplate
        name: production-control-plane-machine
  infrastructure:
    ref:
      apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
      kind: AWSClusterTemplate
      name: production-cluster-template
  workers:
    machineDeployments:
    - class: default-worker
      template:
        bootstrap:
          ref:
            apiVersion: bootstrap.cluster.x-k8s.io/v1beta1
            kind: KubeadmConfigTemplate
            name: production-worker-bootstrap
        infrastructure:
          ref:
            apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
            kind: AWSMachineTemplate
            name: production-worker-machine
  variables:
  - name: region
    required: true
    schema:
      openAPIV3Schema:
        type: string
  - name: instanceType
    required: true
    schema:
      openAPIV3Schema:
        type: string
```

Create clusters from the class:

```yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: production-east
  namespace: default
spec:
  topology:
    class: production-standard
    version: v1.28.5
    controlPlane:
      replicas: 3
    workers:
      machineDeployments:
      - class: default-worker
        name: workers
        replicas: 5
    variables:
    - name: region
      value: us-east-1
    - name: instanceType
      value: t3.xlarge
```

## Automating Cluster Lifecycle with GitOps

Manage clusters using Flux or ArgoCD for full GitOps workflows:

```yaml
# flux-gitrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: cluster-manifests
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/myorg/cluster-manifests
  ref:
    branch: main

---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: clusters
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: cluster-manifests
  path: ./clusters
  prune: true
  wait: true
```

Store cluster manifests in Git:

```
clusters/
├── production-east/
│   └── cluster.yaml
├── production-west/
│   └── cluster.yaml
└── staging-central/
    └── cluster.yaml
```

## Monitoring Cluster Health

Monitor Cluster API resources:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: capi-controller-manager
  namespace: capi-system
spec:
  selector:
    matchLabels:
      control-plane: controller-manager
  endpoints:
  - port: metrics

---
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cluster-api-alerts
  namespace: capi-system
spec:
  groups:
  - name: cluster-api
    rules:
    - alert: ClusterNotReady
      expr: cluster_status_phase{phase!="Provisioned"} == 1
      for: 15m
      annotations:
        summary: "Cluster {{ $labels.cluster }} not ready"

    - alert: MachineCreationFailed
      expr: machine_status_phase{phase="Failed"} == 1
      for: 5m
      annotations:
        summary: "Machine creation failed for {{ $labels.machine }}"
```

## Best Practices

Use ClusterClass for standardization. Define templates for different cluster types (production, staging, development) to ensure consistency.

Implement proper RBAC on the management cluster. Access to cluster manifests means ability to create and delete infrastructure.

Tag all infrastructure resources appropriately for cost tracking and security auditing.

Test upgrades in non-production clusters first. Kubernetes upgrades can have breaking changes.

Implement cluster-wide monitoring and logging before creating production workload clusters.

Use GitOps for cluster lifecycle management to maintain audit trails and enable easy rollbacks.

## Conclusion

Cluster API transforms Kubernetes cluster management from manual operations to declarative infrastructure as code. By treating clusters as resources managed through Kubernetes APIs, you gain the same benefits of automation, consistency, and GitOps workflows that you use for application deployments.

Start with a single cluster creation to understand the workflow, then expand to multiple clusters and implement ClusterClass templates for standardization. The investment in Cluster API pays off quickly as your cluster count grows beyond a handful.
