# How to Configure Talos Linux VMs on VMware vSphere

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, VMware, vSphere, Kubernetes, Enterprise, Virtualization

Description: Step-by-step guide to deploying Talos Linux on VMware vSphere for enterprise Kubernetes clusters with vCenter integration.

---

VMware vSphere is the dominant virtualization platform in enterprise data centers. If your organization runs vSphere, deploying Talos Linux on it gives you a secure, immutable Kubernetes platform that integrates with your existing infrastructure. This guide covers deploying Talos as OVA templates, configuring the vSphere cloud provider, and setting up persistent storage with vSphere CSI.

## Why Talos on vSphere

Enterprise environments running vSphere often want Kubernetes but need it to fit within their existing operational model. Talos eliminates the OS management layer entirely. There is no SSH, no package management, and no configuration drift. Everything is managed through the Talos API. For enterprises that struggle with OS patching and compliance across hundreds of Kubernetes nodes, this is a significant operational win.

The vSphere integration gives you automatic node labeling, vSphere-native load balancing, and storage provisioned directly from your vSphere datastores.

## Prerequisites

You need:

- VMware vSphere 7.0 or later with vCenter
- A datacenter, cluster, and datastore configured
- A distributed port group or network for the Kubernetes VMs
- `govc` (vSphere CLI) or access to the vCenter web UI
- `talosctl` and `kubectl` installed

## Deploying the OVA Template

Talos provides an OVA image for vSphere. Download and import it:

```bash
# Download the Talos vSphere OVA
curl -LO https://github.com/siderolabs/talos/releases/download/v1.7.0/vmware-amd64.ova

# Import the OVA into vSphere using govc
export GOVC_URL=https://vcenter.example.com/sdk
export GOVC_USERNAME=administrator@vsphere.local
export GOVC_PASSWORD=your-password
export GOVC_INSECURE=true

# Import the OVA as a template
govc import.ova \
  -dc=Datacenter \
  -ds=Datastore1 \
  -pool=/Datacenter/host/Cluster/Resources \
  -name=talos-template \
  vmware-amd64.ova

# Mark it as a template
govc vm.markastemplate talos-template
```

## Generating Talos Configuration

Generate the machine configuration with vSphere cloud provider support:

```bash
# Generate config with vSphere cloud provider
talosctl gen config vsphere-cluster https://10.0.0.100:6443 \
  --config-patch='[
    {"op": "add", "path": "/cluster/externalCloudProvider", "value": {
      "enabled": true
    }},
    {"op": "add", "path": "/machine/kubelet/extraArgs", "value": {
      "cloud-provider": "external"
    }}
  ]'
```

## Creating VMs from the Template

Clone the template for each node:

```bash
# Clone control plane VMs
for i in 1 2 3; do
  govc vm.clone \
    -vm talos-template \
    -name talos-cp-$i \
    -dc=Datacenter \
    -ds=Datastore1 \
    -pool=/Datacenter/host/Cluster/Resources \
    -on=false

  # Configure resources
  govc vm.change \
    -vm talos-cp-$i \
    -c 2 \
    -m 4096

  # Resize the disk
  govc vm.disk.change \
    -vm talos-cp-$i \
    -size 50G

  # Set the network
  govc vm.network.change \
    -vm talos-cp-$i \
    -net "Kubernetes Network" \
    ethernet-0
done

# Clone worker VMs
for i in 1 2 3; do
  govc vm.clone \
    -vm talos-template \
    -name talos-worker-$i \
    -dc=Datacenter \
    -ds=Datastore1 \
    -pool=/Datacenter/host/Cluster/Resources \
    -on=false

  govc vm.change \
    -vm talos-worker-$i \
    -c 4 \
    -m 8192

  govc vm.disk.change \
    -vm talos-worker-$i \
    -size 100G

  govc vm.network.change \
    -vm talos-worker-$i \
    -net "Kubernetes Network" \
    ethernet-0
done
```

## Passing Configuration via Extra Config

Talos on vSphere reads its machine configuration from the VM's extra config (guestinfo). Set the configuration before powering on:

```bash
# Encode the machine config
CP_CONFIG=$(base64 -w 0 controlplane.yaml)
WORKER_CONFIG=$(base64 -w 0 worker.yaml)

# Set the machine config on control plane VMs
for i in 1 2 3; do
  govc vm.change \
    -vm talos-cp-$i \
    -e "guestinfo.talos.config=$CP_CONFIG" \
    -e "disk.enableUUID=TRUE"
done

# Set the machine config on worker VMs
for i in 1 2 3; do
  govc vm.change \
    -vm talos-worker-$i \
    -e "guestinfo.talos.config=$WORKER_CONFIG" \
    -e "disk.enableUUID=TRUE"
done
```

The `disk.enableUUID=TRUE` setting is required for the vSphere CSI driver to work correctly. Without it, the CSI driver cannot identify disks by their UUID.

## Powering On and Bootstrapping

Start the VMs and bootstrap the cluster:

```bash
# Power on all VMs
for i in 1 2 3; do
  govc vm.power -on talos-cp-$i
  govc vm.power -on talos-worker-$i
done

# Wait for VMs to boot, then find their IPs
govc vm.ip talos-cp-1

# Configure talosctl
talosctl config endpoint <cp1-ip>
talosctl config node <cp1-ip>

# Bootstrap the cluster
talosctl bootstrap

# Get kubeconfig
talosctl kubeconfig
```

## Deploying the vSphere Cloud Controller Manager

Create the vSphere cloud config and deploy the CCM:

```yaml
# vsphere-cloud-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vsphere-cloud-config
  namespace: kube-system
data:
  vsphere.conf: |
    [Global]
    secret-name = "vsphere-creds"
    secret-namespace = "kube-system"
    insecure-flag = "true"

    [VirtualCenter "vcenter.example.com"]
    datacenters = "Datacenter"

    [Labels]
    region = "region-a"
    zone = "zone-a"
```

```bash
# Create the vSphere credentials secret
kubectl create secret generic vsphere-creds \
  --namespace kube-system \
  --from-literal=vcenter.example.com.username=administrator@vsphere.local \
  --from-literal=vcenter.example.com.password=your-password

# Deploy the CCM
kubectl apply -f https://raw.githubusercontent.com/kubernetes/cloud-provider-vsphere/master/releases/latest/vsphere-cloud-controller-manager.yaml
```

## vSphere CSI Driver

Deploy the vSphere CSI driver for persistent storage:

```bash
# Create the CSI secret (reuse the same credentials)
kubectl create secret generic vsphere-config-secret \
  --namespace vmware-system-csi \
  --from-file=csi-vsphere.conf=vsphere-csi-config.conf
```

The CSI config file:

```ini
# vsphere-csi-config.conf
[Global]
cluster-id = "vsphere-cluster"
insecure-flag = "true"

[VirtualCenter "vcenter.example.com"]
user = "administrator@vsphere.local"
password = "your-password"
datacenters = "Datacenter"
```

```bash
# Deploy the CSI driver
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/vsphere-csi-driver/master/manifests/vanilla/vsphere-csi-driver.yaml
```

Create a StorageClass:

```yaml
# vsphere-sc.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: vsphere-default
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: csi.vsphere.vmware.com
parameters:
  storagepolicyname: "vSAN Default Storage Policy"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

## VM Anti-Affinity Rules

For high availability, create vSphere anti-affinity rules to ensure control plane VMs run on different ESXi hosts:

```bash
# Create an anti-affinity rule for control plane VMs
govc cluster.rule.create \
  -cluster=Cluster \
  -name=talos-cp-anti-affinity \
  -anti-affinity \
  -vm talos-cp-1 \
  -vm talos-cp-2 \
  -vm talos-cp-3
```

## Talos Upgrades on vSphere

Upgrade Talos through the standard upgrade process:

```bash
# Upgrade each node one at a time
talosctl upgrade --nodes <node-ip> --image ghcr.io/siderolabs/installer:v1.7.1

# Take a vSphere snapshot before upgrading (for rollback)
govc snapshot.create -vm talos-cp-1 pre-upgrade-v1.7.1
```

## Conclusion

VMware vSphere with Talos Linux brings immutable Kubernetes infrastructure to the enterprise data center. The OVA-based deployment, guestinfo configuration mechanism, and native vSphere CSI support make it a natural fit. Anti-affinity rules and vSphere HA protect against host-level failures. For organizations already invested in vSphere, this is the cleanest path to production Kubernetes without leaving your existing infrastructure.
