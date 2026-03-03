# How to Install the iscsi-tools Extension on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, iSCSI, Storage, System Extensions, Kubernetes, Longhorn, Infrastructure

Description: Step-by-step guide to installing and configuring the iscsi-tools extension on Talos Linux for iSCSI-based storage support with solutions like Longhorn and OpenEBS.

---

Many Kubernetes storage solutions depend on iSCSI (Internet Small Computer Systems Interface) for block-level storage access. Popular projects like Longhorn, OpenEBS, and Democratic CSI all need iSCSI initiator tools on the host to function properly. Since Talos Linux does not include iSCSI tools in its minimal base image, you need to add them through the iscsi-tools system extension. This guide covers everything from installation to configuration and troubleshooting.

## Why You Need iscsi-tools

iSCSI is a protocol that allows SCSI commands to be sent over TCP/IP networks, essentially making remote storage appear as locally attached block devices. In the Kubernetes storage world, several CSI (Container Storage Interface) drivers use iSCSI to attach volumes to pods:

- **Longhorn** - Distributed block storage that uses iSCSI targets to expose replicated volumes
- **OpenEBS** - Container-attached storage that supports iSCSI for certain storage engines
- **Democratic CSI** - A CSI driver for TrueNAS/FreeNAS that can use iSCSI
- **Enterprise SANs** - Many SAN arrays expose volumes via iSCSI

Without the iscsi-tools extension, these storage solutions cannot mount volumes to pods running on Talos nodes. You will see errors about missing `iscsiadm` or failed volume attachments.

## Installing the iscsi-tools Extension

### Method 1: Image Factory (Recommended)

The easiest way to add iscsi-tools is through the Talos Image Factory:

1. Visit https://factory.talos.dev
2. Select your Talos version
3. Add the `siderolabs/iscsi-tools` extension
4. Generate the installer image

You can also use the API:

```bash
# Create a schematic with iscsi-tools
curl -X POST https://factory.talos.dev/schematics \
  -H "Content-Type: application/json" \
  -d '{
    "customization": {
      "systemExtensions": {
        "officialExtensions": [
          "siderolabs/iscsi-tools"
        ]
      }
    }
  }'

# Response includes a schematic ID
# Use it to construct the installer URL:
# factory.talos.dev/installer/<schematic-id>:v1.7.0
```

### Method 2: Include in Machine Configuration

Add the extension directly in your machine configuration:

```yaml
machine:
  install:
    image: factory.talos.dev/installer/<schematic-id>:v1.7.0
    extensions:
      - image: ghcr.io/siderolabs/iscsi-tools:v1.7.0
    disk: /dev/sda
```

### Method 3: Upgrade an Existing Node

If your cluster is already running, add iscsi-tools through an upgrade:

```bash
# Upgrade the node with an installer that includes iscsi-tools
talosctl -n 192.168.1.10 upgrade \
  --image factory.talos.dev/installer/<schematic-with-iscsi>:v1.7.0
```

The node will reboot with the new image that includes iSCSI support.

## Configuring iSCSI on Talos

After installation, you need to configure the iSCSI initiator. The most important configuration is the initiator name and any authentication settings.

### Setting the iSCSI Initiator Name

Each iSCSI initiator needs a unique name (IQN - iSCSI Qualified Name). Talos generates one automatically, but you can set a custom one:

```yaml
machine:
  files:
    - content: |
        InitiatorName=iqn.2023-01.com.example:talos-node-01
      path: /etc/iscsi/initiatorname.iscsi
      permissions: 0600
      op: create
```

Apply this configuration:

```bash
talosctl -n 192.168.1.10 patch machineconfig -p '[
  {
    "op": "add",
    "path": "/machine/files/-",
    "value": {
      "content": "InitiatorName=iqn.2023-01.com.example:talos-node-01\n",
      "path": "/etc/iscsi/initiatorname.iscsi",
      "permissions": 384,
      "op": "create"
    }
  }
]'
```

### Configuring iSCSI Authentication

If your iSCSI targets require CHAP authentication:

```yaml
machine:
  files:
    - content: |
        node.session.auth.authmethod = CHAP
        node.session.auth.username = my-initiator
        node.session.auth.password = my-secret-password
        node.startup = automatic
        node.leading_login = No
      path: /etc/iscsi/iscsid.conf
      permissions: 0600
      op: create
```

## Verifying the Installation

After the node reboots with the extension, verify that iSCSI tools are available:

```bash
# Check installed extensions
talosctl -n 192.168.1.10 get extensions

# Look for iscsi-tools in the output
talosctl -n 192.168.1.10 get extensions -o yaml | grep -A5 iscsi

# Verify the iscsid service is running
talosctl -n 192.168.1.10 services | grep iscsi

# Check for the iscsi kernel modules
talosctl -n 192.168.1.10 read /proc/modules | grep iscsi
```

You should see modules like `iscsi_tcp`, `libiscsi`, and `scsi_transport_iscsi` loaded.

## Setting Up Longhorn with iSCSI

Longhorn is one of the most popular storage solutions for Kubernetes that requires iSCSI. Here is how to get it working on Talos:

### Step 1: Install iscsi-tools on All Nodes

All nodes that will host Longhorn volumes need iscsi-tools:

```bash
# Upgrade all nodes with iscsi-tools
for node in 192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21; do
  echo "Upgrading $node..."
  talosctl -n "$node" upgrade \
    --image factory.talos.dev/installer/<schematic-with-iscsi>:v1.7.0
done
```

### Step 2: Configure Extra Kernel Modules

Longhorn requires certain kernel modules to be loaded:

```yaml
machine:
  kernel:
    modules:
      - name: iscsi_tcp
      - name: dm_crypt
```

### Step 3: Install Longhorn

```bash
# Add the Longhorn Helm repository
helm repo add longhorn https://charts.longhorn.io
helm repo update

# Install Longhorn
helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --create-namespace \
  --set defaultSettings.defaultDataPath="/var/lib/longhorn"
```

### Step 4: Verify Volume Attachment

Create a test PVC and pod to verify iSCSI-based volume attachment works:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
    - name: test
      image: busybox
      command: ['sh', '-c', 'echo "iSCSI works!" > /data/test.txt && sleep 3600']
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: test-pvc
```

```bash
# Apply the test resources
kubectl apply -f test-iscsi.yaml

# Check if the pod is running
kubectl get pod test-pod

# Verify the volume is attached
kubectl describe pod test-pod | grep -A5 "Volumes"
```

## Troubleshooting iSCSI Issues

### Volume Attachment Fails

If pods get stuck in ContainerCreating with volume attachment errors:

```bash
# Check Kubernetes events
kubectl describe pod <pod-name> | grep -A10 "Events"

# Check kubelet logs for iSCSI errors
talosctl -n 192.168.1.10 logs kubelet | grep -i "iscsi\|volume\|attach"

# Check if iscsid is running
talosctl -n 192.168.1.10 services | grep iscsi
```

### Missing Kernel Modules

If iSCSI kernel modules are not loaded:

```bash
# Check loaded modules
talosctl -n 192.168.1.10 read /proc/modules | grep iscsi

# If modules are missing, add them to the kernel config
talosctl -n 192.168.1.10 patch machineconfig -p '[
  {
    "op": "add",
    "path": "/machine/kernel/modules",
    "value": [
      {"name": "iscsi_tcp"}
    ]
  }
]'
```

### Extension Not Installed

If the extension is not showing up:

```bash
# Check extensions
talosctl -n 192.168.1.10 get extensions

# If iscsi-tools is missing, verify the installer image
talosctl -n 192.168.1.10 version

# The installer image should include the iscsi-tools extension
# If not, upgrade with the correct image
```

### Multipath Issues

If you use multipath iSCSI (multiple paths to the same target), you may need additional configuration:

```yaml
machine:
  files:
    - content: |
        defaults {
          user_friendly_names yes
          find_multipaths yes
        }
      path: /etc/multipath.conf
      permissions: 0644
      op: create
  kernel:
    modules:
      - name: iscsi_tcp
      - name: dm_multipath
```

## Performance Tuning

For better iSCSI performance, consider these settings:

```yaml
machine:
  files:
    - content: |
        node.session.timeo.replacement_timeout = 120
        node.conn[0].timeo.login_timeout = 15
        node.conn[0].timeo.logout_timeout = 15
        node.session.err_timeo.abort_timeout = 15
        node.session.err_timeo.lu_reset_timeout = 30
        node.session.err_timeo.tgt_reset_timeout = 30
        node.session.initial_login_retry_max = 8
        node.session.queue_depth = 32
        node.session.cmds_max = 128
        node.session.xmit_thread_priority = -20
      path: /etc/iscsi/iscsid.conf
      permissions: 0600
      op: create
```

## Rolling Out Across the Cluster

When deploying iscsi-tools to an existing cluster, do it one node at a time:

```bash
#!/bin/bash
NODES="192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21"
IMAGE="factory.talos.dev/installer/<schematic-with-iscsi>:v1.7.0"

for node in $NODES; do
  echo "Upgrading $node..."
  talosctl -n "$node" upgrade --image "$IMAGE"

  echo "Waiting for $node to come back..."
  sleep 120

  # Verify
  echo "Verifying $node..."
  talosctl -n "$node" get extensions | grep iscsi
  talosctl -n "$node" read /proc/modules | grep iscsi

  echo "$node done."
  echo "---"
done
```

The iscsi-tools extension is one of the most commonly needed Talos extensions. Getting it right from the start saves a lot of debugging time later, especially when you are setting up persistent storage for your Kubernetes workloads.
