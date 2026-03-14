# How to Provision Talos Clusters with CAPI on vSphere

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CAPI, VSphere, Kubernetes, On-Premise

Description: Learn how to provision Talos Linux Kubernetes clusters on VMware vSphere using Cluster API for on-premises declarative cluster management.

---

VMware vSphere remains one of the most common virtualization platforms in enterprise data centers. Running Talos Linux on vSphere through Cluster API brings the same declarative cluster management model that cloud users enjoy to on-premises environments. This guide covers provisioning Talos clusters on vSphere with CAPI, from preparing the vSphere environment through creating and managing workload clusters.

## Why Talos on vSphere?

Many organizations run their Kubernetes workloads on-premises for data sovereignty, latency requirements, or cost reasons. vSphere provides the virtualization layer, and Talos provides a purpose-built, immutable OS for Kubernetes. CAPI ties them together with automated lifecycle management.

The combination gives you the same GitOps-friendly, declarative workflow for on-premises clusters that you would get with cloud-based CAPI deployments. You define your cluster in YAML, apply it to the management cluster, and CAPI handles creating VMs, applying configurations, and managing the cluster lifecycle.

## Prerequisites

Before you start, ensure you have:

- A vSphere 7.0+ environment with sufficient compute, storage, and networking resources
- vCenter access with permissions to create VMs, folders, and resource pools
- A management Kubernetes cluster with CAPI installed
- The Talos Linux OVA template imported into vSphere
- `clusterctl`, `kubectl`, `talosctl`, and `govc` CLI tools installed

## Preparing the vSphere Environment

Import the Talos Linux OVA and set up the required vSphere resources:

```bash
# Download the Talos vSphere OVA
wget https://github.com/siderolabs/talos/releases/download/v1.7.0/vmware-amd64.ova

# Import the OVA as a template using govc
export GOVC_URL="vcenter.example.com"
export GOVC_USERNAME="administrator@vsphere.local"
export GOVC_PASSWORD="<password>"
export GOVC_INSECURE=true

# Import the OVA
govc import.ova \
  -name talos-v1.7.0 \
  -dc Datacenter \
  -ds datastore1 \
  -pool /Datacenter/host/Cluster/Resources \
  vmware-amd64.ova

# Mark it as a template
govc vm.markastemplate talos-v1.7.0

# Create a folder for CAPI clusters
govc folder.create /Datacenter/vm/capi-clusters

# Create a resource pool for Talos clusters
govc pool.create /Datacenter/host/Cluster/Resources/talos-clusters
```

## Configuring the vSphere Provider

Set up credentials and initialize CAPI with the vSphere provider:

```bash
# Export vSphere credentials
export VSPHERE_USERNAME="administrator@vsphere.local"
export VSPHERE_PASSWORD="<password>"
export VSPHERE_SERVER="vcenter.example.com"
export VSPHERE_TLS_THUMBPRINT="$(govc about.cert -thumbprint)"
export VSPHERE_SSH_AUTHORIZED_KEY=""  # Empty - Talos has no SSH

# vSphere infrastructure details
export VSPHERE_DATACENTER="Datacenter"
export VSPHERE_DATASTORE="datastore1"
export VSPHERE_NETWORK="VM Network"
export VSPHERE_RESOURCE_POOL="talos-clusters"
export VSPHERE_FOLDER="capi-clusters"
export VSPHERE_TEMPLATE="talos-v1.7.0"

# Initialize CAPI with vSphere and Talos providers
clusterctl init --bootstrap talos --control-plane talos --infrastructure vsphere
```

## Defining the Cluster

Create the cluster manifests for vSphere:

```yaml
# cluster.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: talos-vsphere-prod
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
    name: talos-vsphere-prod-cp
  infrastructureRef:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
    kind: VSphereCluster
    name: talos-vsphere-prod
```

```yaml
# vsphere-cluster.yaml
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: VSphereCluster
metadata:
  name: talos-vsphere-prod
  namespace: default
spec:
  controlPlaneEndpoint:
    host: 10.0.1.100  # VIP for the control plane
    port: 6443
  identityRef:
    kind: Secret
    name: vsphere-credentials
  server: vcenter.example.com
  thumbprint: "<vcenter-tls-thumbprint>"
```

Create the vSphere credentials secret:

```yaml
# vsphere-credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: vsphere-credentials
  namespace: default
type: Opaque
stringData:
  username: "administrator@vsphere.local"
  password: "<password>"
```

## Control Plane Configuration

```yaml
# control-plane.yaml
apiVersion: controlplane.cluster.x-k8s.io/v1alpha3
kind: TalosControlPlane
metadata:
  name: talos-vsphere-prod-cp
  namespace: default
spec:
  version: v1.30.0
  replicas: 3
  infrastructureTemplate:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
    kind: VSphereMachineTemplate
    name: talos-vsphere-prod-cp
  controlPlaneConfig:
    controlplane:
      generateType: controlplane
      talosVersion: v1.7.0
      configPatches:
        # Configure a VIP for the control plane endpoint
        - op: add
          path: /machine/network/interfaces
          value:
            - interface: eth0
              dhcp: true
              vip:
                ip: 10.0.1.100
        - op: add
          path: /machine/time
          value:
            servers:
              - time.google.com

---
# Control plane machine template
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: VSphereMachineTemplate
metadata:
  name: talos-vsphere-prod-cp
  namespace: default
spec:
  template:
    spec:
      cloneMode: linkedClone
      datacenter: Datacenter
      datastore: datastore1
      diskGiB: 50
      folder: capi-clusters
      memoryMiB: 8192
      network:
        devices:
          - dhcp4: true
            networkName: "VM Network"
      numCPUs: 4
      resourcePool: talos-clusters
      server: vcenter.example.com
      template: talos-v1.7.0
      thumbprint: "<vcenter-tls-thumbprint>"
```

## Worker Configuration

```yaml
# workers.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: talos-vsphere-prod-workers
  namespace: default
spec:
  clusterName: talos-vsphere-prod
  replicas: 3
  selector:
    matchLabels: {}
  template:
    spec:
      clusterName: talos-vsphere-prod
      version: v1.30.0
      bootstrap:
        configRef:
          apiVersion: bootstrap.cluster.x-k8s.io/v1alpha3
          kind: TalosConfigTemplate
          name: talos-vsphere-prod-workers
      infrastructureRef:
        apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
        kind: VSphereMachineTemplate
        name: talos-vsphere-prod-workers

---
apiVersion: bootstrap.cluster.x-k8s.io/v1alpha3
kind: TalosConfigTemplate
metadata:
  name: talos-vsphere-prod-workers
  namespace: default
spec:
  template:
    spec:
      generateType: worker
      talosVersion: v1.7.0

---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: VSphereMachineTemplate
metadata:
  name: talos-vsphere-prod-workers
  namespace: default
spec:
  template:
    spec:
      cloneMode: linkedClone
      datacenter: Datacenter
      datastore: datastore1
      diskGiB: 100
      folder: capi-clusters
      memoryMiB: 4096
      network:
        devices:
          - dhcp4: true
            networkName: "VM Network"
      numCPUs: 2
      resourcePool: talos-clusters
      server: vcenter.example.com
      template: talos-v1.7.0
      thumbprint: "<vcenter-tls-thumbprint>"
```

## Deploying the Cluster

```bash
# Apply the credentials secret first
kubectl apply -f vsphere-credentials.yaml

# Apply all cluster manifests
kubectl apply -f cluster.yaml
kubectl apply -f vsphere-cluster.yaml
kubectl apply -f control-plane.yaml
kubectl apply -f workers.yaml

# Monitor provisioning
clusterctl describe cluster talos-vsphere-prod
kubectl get machines -w
```

## Verifying the Deployment

```bash
# Get the kubeconfig
clusterctl get kubeconfig talos-vsphere-prod > vsphere-kubeconfig

# Check nodes
KUBECONFIG=vsphere-kubeconfig kubectl get nodes -o wide

# Install CNI
KUBECONFIG=vsphere-kubeconfig helm install cilium cilium/cilium -n kube-system

# Verify all pods are running
KUBECONFIG=vsphere-kubeconfig kubectl get pods -A
```

## vSphere-Specific Considerations

For vSphere deployments, you need to handle the control plane endpoint differently than in cloud environments. Since there is no cloud load balancer, Talos provides a built-in VIP (Virtual IP) feature that floats between control plane nodes. Make sure the VIP address is not in your DHCP range.

Storage classes need the vSphere CSI driver installed on the workload cluster. Network policies may need adjustment depending on your vSphere network configuration. If you are using distributed switches, make sure the port group is accessible from the resource pool where VMs are created.

Running Talos on vSphere through CAPI gives enterprise environments a modern, declarative approach to cluster management without requiring cloud infrastructure. The combination brings GitOps practices to on-premises Kubernetes while maintaining the security benefits of an immutable operating system.
