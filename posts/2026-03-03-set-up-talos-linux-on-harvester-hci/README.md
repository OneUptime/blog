# How to Set Up Talos Linux on Harvester HCI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Harvester HCI, Kubernetes, Virtualization, SUSE

Description: A complete guide to deploying Talos Linux as virtual machines on Harvester HCI to run nested Kubernetes clusters with full API-driven management.

---

Harvester is an open-source hyperconverged infrastructure (HCI) platform built on top of Kubernetes. It combines compute, storage, and networking into a single platform, making it a solid foundation for running virtual machines alongside containers. Running Talos Linux on Harvester creates an interesting layered architecture where you have Kubernetes managing your VMs, which themselves run Kubernetes through Talos. This pattern is especially useful for multi-tenancy, development environments, and edge deployments.

This guide covers the full process of deploying a Talos Linux cluster on Harvester HCI, from uploading the image through to bootstrapping a working Kubernetes cluster.

## Why Run Talos Linux on Harvester?

Harvester provides VM management through a Kubernetes-native API. This means you can define your Talos Linux VMs as Kubernetes resources, manage them with GitOps tools, and leverage Harvester's built-in storage (Longhorn) and networking (Multus) features.

The combination makes particular sense for:

- Running multiple isolated Kubernetes clusters on shared hardware
- Providing on-demand Kubernetes clusters for development teams
- Edge deployments where you want both VMs and containers on the same hardware
- Testing Kubernetes upgrades without touching production

## Prerequisites

Before starting, make sure you have:

- A running Harvester cluster (version 1.2 or later)
- Access to the Harvester UI or API
- `kubectl` configured to access the Harvester cluster
- `talosctl` installed on your workstation
- At least 16 GB RAM and 100 GB storage available in Harvester

## Step 1: Upload the Talos Linux Image

Harvester uses VM images to boot virtual machines. Download the Talos cloud image and upload it to Harvester.

```bash
# Download the Talos NoCloud raw image for VM environments

curl -LO https://factory.talos.dev/image/376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba/v1.13.2/nocloud-amd64.raw.xz

# Decompress it
xz -d nocloud-amd64.raw.xz
```

Upload the decompressed `nocloud-amd64.raw` image through the Harvester UI by navigating to Images and clicking Create. Alternatively, host the decompressed raw image at a URL that the Harvester cluster can reach and use the API:

```yaml
# talos-image.yaml - Harvester VM Image resource
apiVersion: harvesterhci.io/v1beta1
kind: VirtualMachineImage
metadata:
  name: talos-linux
  namespace: default
  annotations:
    harvesterhci.io/imageDisplayName: "Talos Linux"
spec:
  displayName: "Talos Linux"
  sourceType: download
  url: "https://example.com/talos/nocloud-amd64.raw"
```

```bash
# Apply the image resource
kubectl apply -f talos-image.yaml

# Wait for the image to download
kubectl get virtualmachineimages -w
```

## Step 2: Create a Network Configuration

Set up a VM network in Harvester for your Talos nodes to communicate:

```yaml
# talos-network.yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: talos-vlan
  namespace: default
  labels:
    network.harvesterhci.io/clusternetwork: mgmt
    network.harvesterhci.io/type: L2VlanNetwork
    network.harvesterhci.io/vlan-id: "100"
spec:
  config: |
    {
      "cniVersion": "0.3.1",
      "name": "talos-vlan",
      "type": "bridge",
      "bridge": "mgmt-br",
      "promiscMode": true,
      "vlan": 100,
      "ipam": {}
    }
```

If you want the Talos VMs to use the management network without a VLAN, you can skip this step and use the default management network. For a custom cluster network, create the Harvester cluster network and network config first, then point the VM network at that cluster network.

## Step 3: Generate Talos Machine Configurations

Generate the Talos configuration files. You will need to decide on the control plane endpoint IP ahead of time. If you are using DHCP, you can use a load balancer or VIP.

```bash
# Generate configs with a VIP for the control plane
talosctl gen config harvester-cluster https://10.0.100.10:6443 \
  --config-patch-control-plane '[{"op": "replace", "path": "/machine/install/disk", "value": "/dev/vda"}, {"op": "add", "path": "/machine/network/interfaces", "value": [{"interface": "eth0", "dhcp": true, "vip": {"ip": "10.0.100.10"}}]}]' \
  --config-patch-worker '[{"op": "replace", "path": "/machine/install/disk", "value": "/dev/vda"}]'
```

This creates `controlplane.yaml`, `worker.yaml`, and `talosconfig`.

## Step 4: Create the Control Plane VM

Define the control plane VM as a Harvester resource:

```yaml
# talos-cp.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: talos-cp-1-rootdisk
  namespace: default
  annotations:
    harvesterhci.io/imageId: default/talos-linux
    volume.beta.kubernetes.io/storage-provisioner: driver.longhorn.io
    volume.kubernetes.io/storage-provisioner: driver.longhorn.io
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 50Gi
  storageClassName: longhorn-talos-linux
  volumeMode: Block
  volumeName: pvc-talos-cp-1-rootdisk
---
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: talos-cp-1
  namespace: default
  labels:
    app: talos-cluster
    role: controlplane
spec:
  runStrategy: RerunOnFailure
  template:
    metadata:
      labels:
        app: talos-cluster
        role: controlplane
    spec:
      domain:
        cpu:
          cores: 4
        memory:
          guest: 4Gi
        devices:
          disks:
            - name: rootdisk
              disk:
                bus: virtio
          interfaces:
            - name: talos-vlan
              model: virtio
              bridge: {}
        resources:
          requests:
            memory: 4Gi
      networks:
        - name: talos-vlan
          multus:
            networkName: default/talos-vlan
      volumes:
        - name: rootdisk
          persistentVolumeClaim:
            claimName: talos-cp-1-rootdisk
```

```bash
# Create the control plane VM
kubectl apply -f talos-cp.yaml

# Watch the VM start
kubectl get vmi -w
```

## Step 5: Apply the Talos Configuration

Once the VM is running, find its IP address and apply the control plane configuration:

```bash
# Get the VM's IP if Harvester can report it; otherwise check your DHCP server or VM console
kubectl get vmi talos-cp-1 -o jsonpath='{.status.interfaces[0].ipAddress}'

# Apply the control plane config
talosctl apply-config --insecure --nodes <CP_IP> --file controlplane.yaml
```

The node will reboot and begin setting up the Kubernetes control plane.

## Step 6: Bootstrap the Cluster

Configure `talosctl` and bootstrap etcd:

```bash
# Configure talosctl
talosctl config merge ./talosconfig
talosctl config endpoint <CP_IP>
talosctl config node <CP_IP>

# Bootstrap etcd
talosctl bootstrap

# Monitor progress
talosctl health
```

## Step 7: Add Worker Nodes

Create worker VMs following the same pattern:

```yaml
# talos-worker.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: talos-worker-1-rootdisk
  namespace: default
  annotations:
    harvesterhci.io/imageId: default/talos-linux
    volume.beta.kubernetes.io/storage-provisioner: driver.longhorn.io
    volume.kubernetes.io/storage-provisioner: driver.longhorn.io
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 100Gi
  storageClassName: longhorn-talos-linux
  volumeMode: Block
  volumeName: pvc-talos-worker-1-rootdisk
---
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: talos-worker-1
  namespace: default
  labels:
    app: talos-cluster
    role: worker
spec:
  runStrategy: RerunOnFailure
  template:
    metadata:
      labels:
        app: talos-cluster
        role: worker
    spec:
      domain:
        cpu:
          cores: 2
        memory:
          guest: 4Gi
        devices:
          disks:
            - name: rootdisk
              disk:
                bus: virtio
          interfaces:
            - name: talos-vlan
              model: virtio
              bridge: {}
        resources:
          requests:
            memory: 4Gi
      networks:
        - name: talos-vlan
          multus:
            networkName: default/talos-vlan
      volumes:
        - name: rootdisk
          persistentVolumeClaim:
            claimName: talos-worker-1-rootdisk
```

```bash
# Create the worker
kubectl apply -f talos-worker.yaml

# Apply the worker config once it's running
talosctl apply-config --insecure --nodes <WORKER_IP> --file worker.yaml
```

## Step 8: Access the Talos Kubernetes Cluster

Retrieve the kubeconfig for your new cluster:

```bash
# Get kubeconfig from the Talos cluster
talosctl kubeconfig --force ./talos-kubeconfig

# Use it
export KUBECONFIG=./talos-kubeconfig
kubectl get nodes
```

## Automating with Terraform

For repeatable deployments, you can manage the Harvester VMs with Terraform using the Harvester provider:

```hcl
# main.tf
provider "harvester" {
  kubeconfig = "~/.kube/harvester-config"
}

resource "harvester_image" "talos" {
  name         = "talos-linux"
  namespace    = "default"
  display_name = "Talos Linux"
  source_type  = "download"
  url          = "https://example.com/talos/nocloud-amd64.raw"
}

resource "harvester_virtualmachine" "talos_cp" {
  count     = 3
  name      = "talos-cp-${count.index + 1}"
  namespace = "default"

  cpu    = 4
  memory = "4Gi"

  disk {
    name       = "rootdisk"
    type       = "disk"
    bus        = "virtio"
    size       = "50Gi"
    image      = harvester_image.talos.id
    boot_order = 1
  }

  network_interface {
    name         = "nic-1"
    type         = "bridge"
    network_name = "default/talos-vlan"
  }
}
```

## Troubleshooting

If the VM boots but Talos does not accept the configuration, make sure the image you uploaded is the `nocloud` variant, not the `metal` ISO. Harvester expects disk images, not ISO files for VM boot disks.

If networking between Talos nodes is not working, check the Harvester network policy. By default, Harvester applies network policies that might restrict traffic between VMs. You may need to create explicit policies to allow Talos API (port 50000) and Kubernetes API (port 6443) traffic.

If the VMs are slow to boot or have poor I/O performance, check Longhorn's health in the Harvester dashboard. Degraded Longhorn replicas can significantly impact VM disk performance.

## Wrapping Up

Running Talos Linux on Harvester HCI gives you a fully declarative, Kubernetes-native way to manage virtualized Kubernetes clusters. The entire stack, from the VMs themselves to the workloads running on them, can be managed through Kubernetes APIs and GitOps workflows. This makes it an excellent platform for multi-tenant environments, development clusters, and edge deployments where you need both VM and container workloads on shared infrastructure.
