# How to Provision Talos Clusters with CAPI on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CAPI, AWS, Kubernetes, Cluster Provisioning

Description: A complete guide to provisioning Talos Linux Kubernetes clusters on AWS using Cluster API for declarative infrastructure management.

---

Provisioning Talos Linux clusters on AWS through Cluster API combines the declarative management model of CAPI with the security and immutability of Talos on AWS infrastructure. Once set up, creating a new cluster is as simple as applying a set of YAML manifests to your management cluster. This guide covers the full process from prerequisites through a running workload cluster.

## Prerequisites

Before starting, make sure you have:

- A management cluster with CAPI and CAPT providers installed
- The AWS infrastructure provider (CAPA) configured with credentials
- `clusterctl`, `kubectl`, and `talosctl` CLI tools installed
- A Talos Linux AMI available in your target AWS region
- AWS IAM permissions for creating EC2, ELB, VPC, and related resources

If you have not set up the management cluster yet, start with that:

```bash
# Create a management cluster with kind
kind create cluster --name capi-mgmt

# Initialize CAPI with AWS and Talos providers
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=<key>
export AWS_SECRET_ACCESS_KEY=<secret>
export AWS_B64ENCODED_CREDENTIALS=$(clusterawsadm bootstrap credentials encode-as-profile)

clusterctl init --bootstrap talos --control-plane talos --infrastructure aws
```

## Finding the Talos AMI

You need the Talos Linux AMI ID for your target region:

```bash
# Look up the official Talos AMI for your region
aws ec2 describe-images \
  --owners 540036508848 \
  --filters "Name=name,Values=talos-v1.7.0-*" \
  --region us-east-1 \
  --query 'Images[*].[ImageId,Name]' \
  --output table
```

Note the AMI ID for use in your cluster manifests.

## Defining the Cluster Resources

Create a complete set of manifests for your Talos cluster on AWS:

```yaml
# cluster.yaml - The main cluster resource
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: talos-aws-prod
  namespace: default
spec:
  clusterNetwork:
    pods:
      cidrBlocks:
        - "10.244.0.0/16"
    services:
      cidrBlocks:
        - "10.96.0.0/12"
  controlPlaneRef:
    apiVersion: controlplane.cluster.x-k8s.io/v1alpha3
    kind: TalosControlPlane
    name: talos-aws-prod-cp
  infrastructureRef:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
    kind: AWSCluster
    name: talos-aws-prod
```

```yaml
# aws-cluster.yaml - AWS-specific infrastructure
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSCluster
metadata:
  name: talos-aws-prod
  namespace: default
spec:
  region: us-east-1
  sshKeyName: ""
  network:
    vpc:
      cidrBlock: "10.0.0.0/16"
    subnets:
      - availabilityZone: us-east-1a
        cidrBlock: "10.0.10.0/24"
        isPublic: true
      - availabilityZone: us-east-1b
        cidrBlock: "10.0.11.0/24"
        isPublic: true
      - availabilityZone: us-east-1c
        cidrBlock: "10.0.12.0/24"
        isPublic: true
    cni:
      cniIngressRules:
        - description: "Talos API"
          protocol: "tcp"
          fromPort: 50000
          toPort: 50000
        - description: "Kubernetes API"
          protocol: "tcp"
          fromPort: 6443
          toPort: 6443
  bastion:
    enabled: false  # No bastion needed - Talos has no SSH
```

## Control Plane Configuration

Define the Talos control plane with machine templates:

```yaml
# control-plane.yaml - Talos control plane definition
apiVersion: controlplane.cluster.x-k8s.io/v1alpha3
kind: TalosControlPlane
metadata:
  name: talos-aws-prod-cp
  namespace: default
spec:
  version: v1.30.0
  replicas: 3
  infrastructureTemplate:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
    kind: AWSMachineTemplate
    name: talos-aws-prod-cp
  controlPlaneConfig:
    controlplane:
      generateType: controlplane
      talosVersion: v1.7.0
      configPatches:
        # Add custom NTP servers
        - op: add
          path: /machine/time
          value:
            servers:
              - time.google.com
              - time.aws.com
        # Configure kubelet
        - op: add
          path: /machine/kubelet/extraArgs
          value:
            cloud-provider: external
        # Enable audit logging
        - op: add
          path: /cluster/apiServer/extraArgs
          value:
            audit-log-maxage: "30"
            audit-log-maxbackup: "10"

---
# Machine template for control plane instances
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachineTemplate
metadata:
  name: talos-aws-prod-cp
  namespace: default
spec:
  template:
    spec:
      instanceType: m5.xlarge
      ami:
        id: ami-xxxxxxxxxxxxxxxxx  # Replace with your Talos AMI ID
      iamInstanceProfile: "control-plane.cluster-api-provider-aws.sigs.k8s.io"
      rootVolume:
        size: 50
        type: gp3
        iops: 3000
        throughput: 125
      additionalSecurityGroups:
        - id: sg-xxxxxxxxxxxxxxxxx  # Optional additional security group
```

## Worker Node Configuration

Define worker node pools using MachineDeployment:

```yaml
# workers.yaml - Worker node pool
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: talos-aws-prod-workers
  namespace: default
spec:
  clusterName: talos-aws-prod
  replicas: 3
  selector:
    matchLabels: {}
  template:
    spec:
      clusterName: talos-aws-prod
      version: v1.30.0
      bootstrap:
        configRef:
          apiVersion: bootstrap.cluster.x-k8s.io/v1alpha3
          kind: TalosConfigTemplate
          name: talos-aws-prod-workers
      infrastructureRef:
        apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
        kind: AWSMachineTemplate
        name: talos-aws-prod-workers

---
# Bootstrap configuration for workers
apiVersion: bootstrap.cluster.x-k8s.io/v1alpha3
kind: TalosConfigTemplate
metadata:
  name: talos-aws-prod-workers
  namespace: default
spec:
  template:
    spec:
      generateType: worker
      talosVersion: v1.7.0
      configPatches:
        - op: add
          path: /machine/kubelet/extraArgs
          value:
            cloud-provider: external

---
# Machine template for worker instances
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachineTemplate
metadata:
  name: talos-aws-prod-workers
  namespace: default
spec:
  template:
    spec:
      instanceType: m5.large
      ami:
        id: ami-xxxxxxxxxxxxxxxxx  # Replace with your Talos AMI ID
      iamInstanceProfile: "nodes.cluster-api-provider-aws.sigs.k8s.io"
      rootVolume:
        size: 100
        type: gp3
        iops: 3000
        throughput: 125
```

## Applying the Cluster Definition

Deploy the cluster by applying all manifests:

```bash
# Apply all cluster resources
kubectl apply -f cluster.yaml
kubectl apply -f aws-cluster.yaml
kubectl apply -f control-plane.yaml
kubectl apply -f workers.yaml

# Or apply all at once from a directory
kubectl apply -f ./cluster-manifests/
```

## Monitoring the Provisioning

Watch the cluster come up:

```bash
# Watch overall cluster status
kubectl get cluster talos-aws-prod -w

# Watch machine provisioning
kubectl get machines -l cluster.x-k8s.io/cluster-name=talos-aws-prod -w

# Watch control plane status
kubectl get taloscontrolplane talos-aws-prod-cp -w

# Get a detailed description of the cluster
clusterctl describe cluster talos-aws-prod

# Check for any issues
kubectl get events --sort-by='.metadata.creationTimestamp' \
  --field-selector involvedObject.name=talos-aws-prod
```

## Accessing the Workload Cluster

Once the cluster is provisioned, retrieve the kubeconfig:

```bash
# Get the kubeconfig for the workload cluster
clusterctl get kubeconfig talos-aws-prod > talos-aws-prod.kubeconfig

# Verify access to the workload cluster
KUBECONFIG=talos-aws-prod.kubeconfig kubectl get nodes

# Install a CNI plugin (e.g., Cilium)
KUBECONFIG=talos-aws-prod.kubeconfig \
  helm install cilium cilium/cilium --namespace kube-system

# Install the AWS cloud controller manager
KUBECONFIG=talos-aws-prod.kubeconfig \
  helm install aws-ccm aws-cloud-controller-manager/aws-cloud-controller-manager \
  --namespace kube-system
```

## Scaling the Cluster

Scale workers up or down with a simple patch:

```bash
# Scale workers to 5
kubectl patch machinedeployment talos-aws-prod-workers \
  --type merge -p '{"spec":{"replicas":5}}'

# Watch new machines being created
kubectl get machines -w
```

## Cleaning Up

Delete the cluster when you are done:

```bash
# Delete the workload cluster (CAPI will clean up all AWS resources)
kubectl delete cluster talos-aws-prod

# Watch cleanup progress
kubectl get machines -w
```

Provisioning Talos clusters on AWS through CAPI gives you a fully declarative, self-healing approach to cluster management. The initial setup requires more manifests than a direct `talosctl` deployment, but the operational benefits of CAPI - automatic reconciliation, built-in scaling, and standardized lifecycle management - make it the right choice for teams running multiple clusters or needing production-grade cluster management.
