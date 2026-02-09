# How to Use Cluster API Providers for AWS, Azure, and vSphere

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cluster API, AWS, Azure, vSphere

Description: Learn how to configure and use Cluster API providers for AWS, Azure, and vSphere to provision and manage Kubernetes clusters across multiple cloud platforms with consistent workflows.

---

Cluster API providers extend CAPI to work with specific infrastructure platforms. Each provider implements platform-specific logic for provisioning compute instances, networking, load balancers, and storage while maintaining the same declarative API interface. This guide covers setting up and using providers for the three most common platforms: AWS, Azure, and vSphere.

## Setting Up the AWS Provider (CAPA)

The Cluster API Provider AWS (CAPA) manages Kubernetes clusters on Amazon Web Services. Start by configuring AWS credentials and installing the provider.

Export AWS credentials:

```bash
# Set AWS credentials
export AWS_REGION=us-west-2
export AWS_ACCESS_KEY_ID=<your-access-key-id>
export AWS_SECRET_ACCESS_KEY=<your-secret-access-key>

# Base64 encode credentials for CAPA
export AWS_B64ENCODED_CREDENTIALS=$(echo -n "${AWS_ACCESS_KEY_ID}:${AWS_SECRET_ACCESS_KEY}" | base64 -w0)

# Set SSH key for node access
export AWS_SSH_KEY_NAME=cluster-api-key
```

Initialize CAPA in your management cluster:

```bash
# Initialize Cluster API with AWS provider
clusterctl init --infrastructure aws

# Verify CAPA controllers are running
kubectl get pods -n capa-system
kubectl get pods -n capa-eks-control-plane-system  # If using EKS
```

Create an AWS cluster:

```bash
# Set cluster configuration
export CLUSTER_NAME=production-aws
export KUBERNETES_VERSION=v1.28.0
export AWS_CONTROL_PLANE_MACHINE_TYPE=t3.large
export AWS_NODE_MACHINE_TYPE=t3.medium
export AWS_REGION=us-west-2

# Generate cluster manifest
clusterctl generate cluster ${CLUSTER_NAME} \
  --infrastructure aws \
  --kubernetes-version ${KUBERNETES_VERSION} \
  --control-plane-machine-count 3 \
  --worker-machine-count 5 \
  > ${CLUSTER_NAME}.yaml
```

The generated manifest includes AWS-specific resources:

```yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: production-aws
  namespace: default
spec:
  clusterNetwork:
    pods:
      cidrBlocks:
      - 192.168.0.0/16
  controlPlaneRef:
    apiVersion: controlplane.cluster.x-k8s.io/v1beta1
    kind: KubeadmControlPlane
    name: production-aws-control-plane
  infrastructureRef:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
    kind: AWSCluster
    name: production-aws
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSCluster
metadata:
  name: production-aws
  namespace: default
spec:
  region: us-west-2
  sshKeyName: cluster-api-key
  networkSpec:
    vpc:
      cidrBlock: 10.0.0.0/16
    subnets:
    - availabilityZone: us-west-2a
      cidrBlock: 10.0.0.0/20
      isPublic: true
    - availabilityZone: us-west-2b
      cidrBlock: 10.0.16.0/20
      isPublic: true
    - availabilityZone: us-west-2c
      cidrBlock: 10.0.32.0/20
      isPublic: true
  bastion:
    enabled: true
---
apiVersion: controlplane.cluster.x-k8s.io/v1beta1
kind: KubeadmControlPlane
metadata:
  name: production-aws-control-plane
  namespace: default
spec:
  kubeadmConfigSpec:
    clusterConfiguration:
      apiServer:
        extraArgs:
          cloud-provider: aws
      controllerManager:
        extraArgs:
          cloud-provider: aws
    initConfiguration:
      nodeRegistration:
        kubeletExtraArgs:
          cloud-provider: aws
        name: '{{ ds.meta_data.local_hostname }}'
    joinConfiguration:
      nodeRegistration:
        kubeletExtraArgs:
          cloud-provider: aws
        name: '{{ ds.meta_data.local_hostname }}'
  machineTemplate:
    infrastructureRef:
      apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
      kind: AWSMachineTemplate
      name: production-aws-control-plane
  replicas: 3
  version: v1.28.0
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachineTemplate
metadata:
  name: production-aws-control-plane
  namespace: default
spec:
  template:
    spec:
      iamInstanceProfile: control-plane.cluster-api-provider-aws.sigs.k8s.io
      instanceType: t3.large
      sshKeyName: cluster-api-key
---
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: production-aws-md-0
  namespace: default
spec:
  clusterName: production-aws
  replicas: 5
  selector:
    matchLabels: {}
  template:
    spec:
      bootstrap:
        configRef:
          apiVersion: bootstrap.cluster.x-k8s.io/v1beta1
          kind: KubeadmConfigTemplate
          name: production-aws-md-0
      clusterName: production-aws
      infrastructureRef:
        apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
        kind: AWSMachineTemplate
        name: production-aws-md-0
      version: v1.28.0
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachineTemplate
metadata:
  name: production-aws-md-0
  namespace: default
spec:
  template:
    spec:
      iamInstanceProfile: nodes.cluster-api-provider-aws.sigs.k8s.io
      instanceType: t3.medium
      sshKeyName: cluster-api-key
---
apiVersion: bootstrap.cluster.x-k8s.io/v1beta1
kind: KubeadmConfigTemplate
metadata:
  name: production-aws-md-0
  namespace: default
spec:
  template:
    spec:
      joinConfiguration:
        nodeRegistration:
          kubeletExtraArgs:
            cloud-provider: aws
          name: '{{ ds.meta_data.local_hostname }}'
```

Apply and monitor:

```bash
# Create the cluster
kubectl apply -f ${CLUSTER_NAME}.yaml

# Watch cluster creation
clusterctl describe cluster ${CLUSTER_NAME}
kubectl get awsclusters,awsmachines

# Get kubeconfig when ready
clusterctl get kubeconfig ${CLUSTER_NAME} > ${CLUSTER_NAME}.kubeconfig
```

## Setting Up the Azure Provider (CAPZ)

The Cluster API Provider Azure (CAPZ) provisions clusters on Microsoft Azure. Configure Azure credentials:

```bash
# Login to Azure
az login

# Create service principal
az ad sp create-for-rbac --role contributor --scopes /subscriptions/<subscription-id>

# Export Azure credentials
export AZURE_SUBSCRIPTION_ID=<subscription-id>
export AZURE_TENANT_ID=<tenant-id>
export AZURE_CLIENT_ID=<client-id>
export AZURE_CLIENT_SECRET=<client-secret>

# Set Azure location
export AZURE_LOCATION=eastus

# Set SSH public key
export AZURE_SSH_PUBLIC_KEY_B64=$(cat ~/.ssh/id_rsa.pub | base64 -w0)
```

Initialize CAPZ:

```bash
# Initialize Azure provider
clusterctl init --infrastructure azure

# Verify controllers
kubectl get pods -n capz-system
```

Generate an Azure cluster:

```bash
# Set cluster parameters
export CLUSTER_NAME=production-azure
export AZURE_CONTROL_PLANE_MACHINE_TYPE=Standard_D2s_v3
export AZURE_NODE_MACHINE_TYPE=Standard_D2s_v3
export KUBERNETES_VERSION=v1.28.0

# Generate manifest
clusterctl generate cluster ${CLUSTER_NAME} \
  --infrastructure azure \
  --kubernetes-version ${KUBERNETES_VERSION} \
  --control-plane-machine-count 3 \
  --worker-machine-count 5 \
  > ${CLUSTER_NAME}.yaml

# Create cluster
kubectl apply -f ${CLUSTER_NAME}.yaml
```

Key Azure-specific configurations:

```yaml
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: AzureCluster
metadata:
  name: production-azure
  namespace: default
spec:
  location: eastus
  networkSpec:
    vnet:
      name: production-azure-vnet
      cidrBlocks:
      - 10.0.0.0/8
    subnets:
    - name: control-plane-subnet
      role: control-plane
      cidrBlocks:
      - 10.0.0.0/16
    - name: node-subnet
      role: node
      cidrBlocks:
      - 10.1.0.0/16
  resourceGroup: production-azure-rg
  subscriptionID: <subscription-id>
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: AzureMachineTemplate
metadata:
  name: production-azure-control-plane
  namespace: default
spec:
  template:
    spec:
      osDisk:
        diskSizeGB: 128
        osType: Linux
        managedDisk:
          storageAccountType: Premium_LRS
      sshPublicKey: <ssh-public-key>
      vmSize: Standard_D2s_v3
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: AzureMachineTemplate
metadata:
  name: production-azure-md-0
  namespace: default
spec:
  template:
    spec:
      osDisk:
        diskSizeGB: 128
        osType: Linux
        managedDisk:
          storageAccountType: Premium_LRS
      sshPublicKey: <ssh-public-key>
      vmSize: Standard_D2s_v3
      dataDisks:
      - diskSizeGB: 256
        lun: 0
        nameSuffix: etcd
```

## Setting Up the vSphere Provider (CAPV)

The Cluster API Provider vSphere (CAPV) manages clusters on VMware vSphere. Configure vSphere credentials:

```bash
# Export vSphere credentials
export VSPHERE_SERVER=vcenter.example.com
export VSPHERE_USERNAME=administrator@vsphere.local
export VSPHERE_PASSWORD=<password>
export VSPHERE_DATACENTER=Datacenter
export VSPHERE_DATASTORE=datastore1
export VSPHERE_NETWORK="VM Network"
export VSPHERE_RESOURCE_POOL=Resources
export VSPHERE_FOLDER=vm
export VSPHERE_TEMPLATE=ubuntu-2004-kube-v1.28.0

# SSH key for nodes
export VSPHERE_SSH_AUTHORIZED_KEY=$(cat ~/.ssh/id_rsa.pub)

# TLS thumbprint
export VSPHERE_TLS_THUMBPRINT=$(openssl s_client -connect ${VSPHERE_SERVER}:443 < /dev/null 2>/dev/null | \
  openssl x509 -fingerprint -sha256 -noout -in /dev/stdin | \
  awk -F '=' '{print $2}' | tr -d ':')
```

Initialize CAPV:

```bash
# Initialize vSphere provider
clusterctl init --infrastructure vsphere

# Verify controllers
kubectl get pods -n capv-system
```

Create vSphere cluster:

```bash
# Set cluster configuration
export CLUSTER_NAME=production-vsphere
export CONTROL_PLANE_ENDPOINT_IP=192.168.1.100
export KUBERNETES_VERSION=v1.28.0

# Generate cluster manifest
clusterctl generate cluster ${CLUSTER_NAME} \
  --infrastructure vsphere \
  --kubernetes-version ${KUBERNETES_VERSION} \
  --control-plane-machine-count 3 \
  --worker-machine-count 5 \
  > ${CLUSTER_NAME}.yaml
```

vSphere-specific resources:

```yaml
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: VSphereCluster
metadata:
  name: production-vsphere
  namespace: default
spec:
  controlPlaneEndpoint:
    host: 192.168.1.100
    port: 6443
  identityRef:
    kind: Secret
    name: production-vsphere
  server: vcenter.example.com
  thumbprint: <tls-thumbprint>
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: VSphereMachineTemplate
metadata:
  name: production-vsphere-control-plane
  namespace: default
spec:
  template:
    spec:
      cloneMode: linkedClone
      datacenter: Datacenter
      datastore: datastore1
      diskGiB: 50
      folder: vm
      memoryMiB: 8192
      network:
        devices:
        - dhcp4: true
          networkName: "VM Network"
      numCPUs: 2
      os: Linux
      powerOffMode: soft
      resourcePool: Resources
      server: vcenter.example.com
      template: ubuntu-2004-kube-v1.28.0
      thumbprint: <tls-thumbprint>
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: VSphereMachineTemplate
metadata:
  name: production-vsphere-md-0
  namespace: default
spec:
  template:
    spec:
      cloneMode: linkedClone
      datacenter: Datacenter
      datastore: datastore1
      diskGiB: 100
      folder: vm
      memoryMiB: 16384
      network:
        devices:
        - dhcp4: true
          networkName: "VM Network"
      numCPUs: 4
      os: Linux
      powerOffMode: soft
      resourcePool: Resources
      server: vcenter.example.com
      template: ubuntu-2004-kube-v1.28.0
      thumbprint: <tls-thumbprint>
```

## Multi-Cloud Cluster Management

Manage clusters across all three providers from a single management cluster:

```bash
# List all clusters
kubectl get clusters

# Get cluster details by provider
kubectl get awsclusters
kubectl get azureclusters
kubectl get vsphereclusters

# Describe specific cluster
clusterctl describe cluster production-aws
clusterctl describe cluster production-azure
clusterctl describe cluster production-vsphere

# Get kubeconfigs for all clusters
clusterctl get kubeconfig production-aws > aws.kubeconfig
clusterctl get kubeconfig production-azure > azure.kubeconfig
clusterctl get kubeconfig production-vsphere > vsphere.kubeconfig
```

## Provider-Specific Features

Each provider offers unique capabilities. AWS supports auto-scaling groups:

```yaml
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachinePool
metadata:
  name: production-aws-pool
spec:
  minSize: 3
  maxSize: 10
  awsLaunchTemplate:
    instanceType: t3.medium
    sshKeyName: cluster-api-key
```

Azure supports managed Kubernetes (AKS):

```yaml
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: AzureManagedControlPlane
metadata:
  name: production-aks
spec:
  location: eastus
  resourceGroupName: production-aks-rg
  subscriptionID: <subscription-id>
  version: v1.28.0
```

vSphere supports workload-specific VM configurations:

```yaml
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: VSphereVM
metadata:
  name: high-memory-worker
spec:
  memoryMiB: 65536
  numCPUs: 16
  diskGiB: 500
```

## Troubleshooting Provider Issues

Debug provider-specific problems:

```bash
# Check provider controller logs
kubectl logs -n capa-system -l cluster.x-k8s.io/provider=infrastructure-aws -f
kubectl logs -n capz-system -l cluster.x-k8s.io/provider=infrastructure-azure -f
kubectl logs -n capv-system -l cluster.x-k8s.io/provider=infrastructure-vsphere -f

# Inspect machine provisioning
kubectl describe awsmachine <machine-name>
kubectl describe azuremachine <machine-name>
kubectl describe vspheremachine <machine-name>

# Check credentials
kubectl get secrets -A | grep cloud-provider

# Verify infrastructure readiness
kubectl get conditions cluster/${CLUSTER_NAME}
```

Cluster API providers enable consistent Kubernetes cluster management across clouds while leveraging platform-specific features. With the same declarative workflow, you can provision, scale, and upgrade clusters on AWS, Azure, vSphere, or any combination of providers your organization uses.
