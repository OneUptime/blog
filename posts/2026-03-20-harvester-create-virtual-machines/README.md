# How to Create Virtual Machines in Harvester

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, VirtualMachines, KubeVirt

Description: Learn how to create and configure virtual machines in Harvester HCI using both the web UI and Kubernetes manifests.

## Introduction

Harvester uses KubeVirt to run virtual machines as Kubernetes-native resources. This means every VM is represented as a `VirtualMachine` custom resource, giving you the flexibility to manage VMs through the Harvester UI or `kubectl`. This guide covers creating VMs using the UI, Kubernetes manifests, and Harvester VM templates.

## Prerequisites

- A running Harvester cluster (single or multi-node)
- A VM image uploaded to Harvester (see the image upload guide)
- A network configured in Harvester
- Access to the Harvester dashboard

## Method 1: Create a VM via the UI

### Step 1: Navigate to Virtual Machines

1. Log into the Harvester dashboard at `https://<CLUSTER_VIP>`
2. Click **Virtual Machines** in the left sidebar
3. Click **Create**

### Step 2: Configure Basic Settings

Fill in the VM configuration:

```text
Name:        ubuntu-web-01
Namespace:   default
CPU Cores:   4
Memory:      8 Gi
```

### Step 3: Configure Boot Volume

Under the **Volumes** tab:
- Click **Add Volume**
- Select **Create New Volume from Image**
- Choose your uploaded Ubuntu image
- Set the volume size (e.g., 50 GB)
- Harvester uses the StorageClass associated with the selected image

### Step 4: Configure Networks

Under the **Networks** tab:
- The management network is added by default and provides in-cluster access to the VM
- Click **Add Network** to add a VLAN network if the VM needs external or secondary network connectivity

### Step 5: Configure Cloud-Init (Optional)

Under the **Advanced** tab, add a cloud-init script:

```yaml
#cloud-config
users:
  - name: ubuntu
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    ssh_authorized_keys:
      - ssh-rsa AAAA... your-public-key

# Install packages on first boot
packages:
  - nginx
  - curl
  - vim

# Run commands after boot
runcmd:
  - systemctl enable --now nginx
```

### Step 6: Start the VM

Click **Create** to create the VM. It will start automatically (default behavior).

## Method 2: Create a VM via kubectl

First create a PVC from the uploaded Harvester image, then define a `VirtualMachine` resource that attaches that PVC:

```yaml
# ubuntu-vm.yaml
# Replace image-8rb2z and longhorn-image-8rb2z with your uploaded image ID
# and the corresponding image-backed StorageClass created by Harvester.

apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ubuntu-web-01-root
  namespace: default
  annotations:
    harvesterhci.io/imageId: default/image-8rb2z
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 50Gi
  storageClassName: longhorn-image-8rb2z
  volumeMode: Block
---
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: ubuntu-web-01
  namespace: default
  labels:
    app: web
spec:
  runStrategy: RerunOnFailure
  template:
    metadata:
      labels:
        app: web
    spec:
      domain:
        # CPU configuration
        cpu:
          cores: 4
          sockets: 1
          threads: 1
        # Memory allocation
        resources:
          requests:
            memory: 8Gi
          limits:
            cpu: "4"
            memory: 8Gi
        # Machine type - use q35 for modern features
        machine:
          type: q35
        # Virtual devices
        devices:
          # Disk configuration
          disks:
            - name: rootdisk
              disk:
                bus: virtio
            - name: cloudinitdisk
              disk:
                bus: virtio
          # Network interfaces
          interfaces:
            - name: default
              masquerade: {}
            - name: vlan100
              bridge: {}
      # Networks - must match interfaces above
      networks:
        - name: default
          pod: {}
        - name: vlan100
          multus:
            networkName: default/vlan100-network
      # Volumes - must match disks above
      volumes:
        - name: rootdisk
          persistentVolumeClaim:
            claimName: ubuntu-web-01-root
        - name: cloudinitdisk
          cloudInitNoCloud:
            userData: |
              #cloud-config
              password: ubuntu
              chpasswd:
                expire: false
              ssh_authorized_keys:
                - ssh-rsa AAAA... your-key
```

```bash
# Apply the VM manifest
kubectl apply -f ubuntu-vm.yaml

# Watch the VM come up
kubectl get vm ubuntu-web-01 -w

# Get the VM instance status
kubectl get vmi ubuntu-web-01 -o wide
```

## Method 3: Create a VM from a Template

Harvester supports VM templates for repeatable deployments. First, create a template:

```yaml
# vm-template.yaml
apiVersion: harvesterhci.io/v1beta1
kind: VirtualMachineTemplate
metadata:
  name: ubuntu-22-04-standard
  namespace: default
spec:
  description: "Ubuntu 22.04 LTS - 4 CPU / 8 GB RAM"
  defaultVersionId: ""
```

Then create a template version with the full spec:

```yaml
# vm-template-version.yaml
apiVersion: harvesterhci.io/v1beta1
kind: VirtualMachineTemplateVersion
metadata:
  name: ubuntu-22-04-standard-v1
  namespace: default
spec:
  templateId: default/ubuntu-22-04-standard
  vm:
    metadata:
      annotations:
        # Replace image-8rb2z and longhorn-image-8rb2z with your uploaded
        # image ID and the corresponding image-backed StorageClass.
        harvesterhci.io/volumeClaimTemplates: |-
          [{
            "metadata": {
              "name": "pvc-rootdisk",
              "annotations": {
                "harvesterhci.io/imageId": "default/image-8rb2z"
              }
            },
            "spec": {
              "accessModes": ["ReadWriteMany"],
              "resources": {
                "requests": {
                  "storage": "50Gi"
                }
              },
              "storageClassName": "longhorn-image-8rb2z",
              "volumeMode": "Block"
            }
          }]
    spec:
      runStrategy: RerunOnFailure
      template:
        spec:
          domain:
            cpu:
              cores: 4
            resources:
              limits:
                cpu: "4"
                memory: 8Gi
              requests:
                memory: 8Gi
            machine:
              type: q35
            devices:
              disks:
                - name: rootdisk
                  disk:
                    bus: virtio
                  bootOrder: 1
                - name: cloudinitdisk
                  disk:
                    bus: virtio
              interfaces:
                - name: default
                  masquerade: {}
                  model: virtio
          networks:
            - name: default
              pod: {}
          volumes:
            - name: rootdisk
              persistentVolumeClaim:
                claimName: pvc-rootdisk
            - name: cloudinitdisk
              cloudInitNoCloud:
                userData: |
                  #cloud-config
                  users:
                    - name: ubuntu
                      sudo: ALL=(ALL) NOPASSWD:ALL
                      shell: /bin/bash
                      ssh_authorized_keys:
                        - ssh-rsa AAAA... your-public-key
```

```bash
# Apply the template resources
kubectl apply -f vm-template.yaml
kubectl apply -f vm-template-version.yaml

# In the UI, the template will now appear in the VM creation wizard
```

## Managing VM Lifecycle

```bash
# Start a stopped VM
virtctl start ubuntu-web-01 -n default

# Stop a running VM
virtctl stop ubuntu-web-01 -n default

# Restart a VM
virtctl restart ubuntu-web-01 -n default

# Delete a VM (does not delete volumes by default)
kubectl delete vm ubuntu-web-01

# Get detailed VM status
kubectl describe vm ubuntu-web-01
```

## Checking VM Health

```bash
# List all VMs and their states
kubectl get vm -A

# List running VM instances
kubectl get vmi -A

# Get VM events
kubectl get events -n default --field-selector \
    involvedObject.name=ubuntu-web-01 --sort-by='.metadata.creationTimestamp'
```

## Conclusion

Harvester makes VM creation straightforward whether you prefer a GUI, command line, or declarative YAML manifests. Because VMs are Kubernetes resources, you get all the benefits of Kubernetes - RBAC, GitOps workflows, API-driven automation, and integration with CI/CD pipelines. Start with the UI for your first VMs, then transition to manifest-based management for production workloads to enable version control and repeatable deployments.
