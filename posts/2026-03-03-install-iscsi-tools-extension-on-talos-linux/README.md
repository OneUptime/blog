# How to Install iscsi-tools Extension on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, iSCSI, Storage, Kubernetes, Persistent Volume

Description: A practical guide to installing the iscsi-tools extension on Talos Linux for connecting to iSCSI storage targets and provisioning persistent volumes in Kubernetes.

---

iSCSI (Internet Small Computer Systems Interface) is a storage networking protocol that allows servers to access remote block storage over standard TCP/IP networks. Many enterprise storage arrays, SAN systems, and software-defined storage solutions expose volumes over iSCSI. To use these storage systems with Talos Linux, you need the iscsi-tools extension, which provides the kernel modules and userspace utilities required for iSCSI initiator functionality.

This guide covers installing the iscsi-tools extension, configuring iSCSI targets, and using iSCSI storage with Kubernetes persistent volumes.

## Why iSCSI on Talos Linux

iSCSI is widely used in enterprise environments for several reasons:

- It runs over standard Ethernet networks, so no special hardware is needed
- Most enterprise storage arrays support iSCSI natively
- Software-defined storage solutions like TrueNAS, OpenEBS, and Longhorn use iSCSI
- It provides block-level access, which is important for databases and other performance-sensitive workloads
- Many Kubernetes CSI drivers depend on the iSCSI initiator being present on nodes

Without the iscsi-tools extension, Talos nodes cannot connect to iSCSI targets, which means CSI drivers that use iSCSI under the hood will fail to provision volumes.

## Installing the iscsi-tools Extension

The iscsi-tools extension includes the open-iscsi initiator utilities and the required kernel modules.

### Method 1: Machine Configuration

Add the extension to your Talos machine configuration.

```yaml
# worker.yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/iscsi-tools:v0.1.4
```

This is all you need in the machine config. The extension handles loading the kernel modules automatically.

### Method 2: Image Factory

```bash
# Create a schematic
cat > iscsi-schematic.yaml << 'EOF'
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/iscsi-tools
EOF

# Submit to Image Factory
SCHEMATIC_ID=$(curl -sX POST \
  --data-binary @iscsi-schematic.yaml \
  https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml" | jq -r '.id')

# Use this installer for your nodes
echo "factory.talos.dev/installer/${SCHEMATIC_ID}:v1.7.0"
```

### Method 3: Imager Tool

```bash
# Generate an ISO with iscsi-tools included
docker run --rm -v /tmp/out:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  iso \
  --system-extension-image ghcr.io/siderolabs/iscsi-tools:v0.1.4
```

## Applying the Extension

For new installations, the extension is included when you apply the machine configuration for the first time. For existing clusters, you need to apply the config change and trigger an upgrade.

```bash
# Apply to an existing node
talosctl -n 10.0.0.20 apply-config --file worker.yaml

# Upgrade to install the extension
talosctl -n 10.0.0.20 upgrade \
  --image ghcr.io/siderolabs/installer:v1.7.0

# Wait for the node
talosctl -n 10.0.0.20 health
```

Repeat for each node that needs iSCSI access. Typically, all worker nodes should have the extension installed.

```bash
# Apply to all worker nodes
for node in 10.0.0.20 10.0.0.21 10.0.0.22; do
  talosctl -n $node apply-config --file worker.yaml
  talosctl -n $node upgrade --image ghcr.io/siderolabs/installer:v1.7.0
  echo "Waiting for $node..."
  sleep 60
  talosctl -n $node health
done
```

## Verifying the Installation

After the nodes reboot with the extension, verify iSCSI tools are available.

```bash
# Check that the extension is installed
talosctl -n 10.0.0.20 get extensions

# Expected output includes iscsi-tools in the list

# Verify the iSCSI kernel modules are loaded
talosctl -n 10.0.0.20 read /proc/modules | grep iscsi

# Check for the iscsid service
talosctl -n 10.0.0.20 services | grep iscsid

# Verify iSCSI initiator name is set
talosctl -n 10.0.0.20 read /etc/iscsi/initiatorname.iscsi
```

## Configuring iSCSI Initiator

The iscsi-tools extension configures the iSCSI initiator automatically, but you may want to customize some settings.

### Setting a Custom Initiator Name

```yaml
machine:
  files:
    - content: |
        InitiatorName=iqn.2024.01.com.example:talos-node-01
      permissions: 0o644
      path: /etc/iscsi/initiatorname.iscsi
      op: create
```

### Configuring iSCSI Parameters

```yaml
machine:
  files:
    - content: |
        node.startup = automatic
        node.leading_login = No
        node.session.timeo.replacement_timeout = 120
        node.conn[0].timeo.login_timeout = 15
        node.conn[0].timeo.logout_timeout = 15
        node.session.err_timeo.abort_timeout = 15
        node.session.err_timeo.lu_reset_timeout = 30
        node.session.initial_login_retry_max = 8
      permissions: 0o644
      path: /etc/iscsi/iscsid.conf
      op: create
```

## Using iSCSI with Kubernetes CSI Drivers

Several Kubernetes CSI drivers use iSCSI as their transport protocol. Here are some common setups.

### Democratic-CSI with TrueNAS

Democratic-CSI is a popular CSI driver for TrueNAS that provisions iSCSI volumes.

```bash
# Add the democratic-csi Helm repo
helm repo add democratic-csi https://democratic-csi.github.io/charts/
helm repo update

# Install with iSCSI configuration
helm install truenas-iscsi democratic-csi/democratic-csi \
  --namespace democratic-csi \
  --create-namespace \
  --values truenas-iscsi-values.yaml
```

The values file for a TrueNAS iSCSI setup.

```yaml
# truenas-iscsi-values.yaml
csiDriver:
  name: "org.democratic-csi.iscsi"

storageClasses:
  - name: truenas-iscsi
    defaultClass: false
    reclaimPolicy: Delete
    volumeBindingMode: Immediate
    allowVolumeExpansion: true

driver:
  config:
    driver: freenas-iscsi
    instance_id:
    httpConnection:
      protocol: https
      host: truenas.example.com
      port: 443
      apiKey: your-api-key
    zfs:
      datasetParentName: tank/k8s/iscsi
      detachedSnapshotsDatasetParentName: tank/k8s/snapshots
    iscsi:
      targetPortal: "truenas.example.com:3260"
      namePrefix: "csi-"
      targetGroups:
        - targetGroupPortalGroup: 1
          targetGroupInitiatorGroup: 1
          targetGroupAuthType: None
```

### OpenEBS with iSCSI

OpenEBS cStor and Jiva engines use iSCSI for volume access.

```bash
# Install OpenEBS
helm repo add openebs https://openebs.github.io/charts
helm repo update

helm install openebs openebs/openebs \
  --namespace openebs \
  --create-namespace

# Create a StorageClass for Jiva
kubectl apply -f - << 'EOF'
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: openebs-jiva
provisioner: openebs.io/provisioner-iscsi
parameters:
  openebs.io/storage-pool: "default"
  openebs.io/jiva-replica-count: "3"
reclaimPolicy: Delete
EOF
```

### Longhorn with iSCSI

Longhorn is another storage solution that requires iSCSI on the host nodes.

```bash
# Install Longhorn
helm repo add longhorn https://charts.longhorn.io
helm repo update

helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --create-namespace
```

Longhorn automatically detects the iSCSI initiator on the nodes and uses it for volume attachment.

## Testing iSCSI Connectivity

Test that your nodes can connect to an iSCSI target.

```yaml
# test-iscsi-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: iscsi-test
spec:
  storageClassName: truenas-iscsi  # or your storage class name
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: iscsi-test-pod
spec:
  containers:
    - name: test
      image: busybox
      command: ["sh", "-c", "echo 'iSCSI works!' > /data/test.txt && cat /data/test.txt && sleep 3600"]
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: iscsi-test
```

```bash
kubectl apply -f test-iscsi-pvc.yaml
kubectl get pvc iscsi-test
kubectl logs iscsi-test-pod
```

## Troubleshooting iSCSI Issues

Common issues and how to diagnose them.

```bash
# Check if iscsid is running
talosctl -n 10.0.0.20 services | grep iscsi

# Check iSCSI-related kernel messages
talosctl -n 10.0.0.20 dmesg | grep -i iscsi

# Verify network connectivity to the target
# Check from a debug pod
kubectl run debug --image=busybox --command -- sh -c \
  "nc -zv truenas.example.com 3260; sleep 3600"
kubectl logs debug

# Check CSI driver logs
kubectl logs -n democratic-csi -l app.kubernetes.io/name=democratic-csi
```

Common problems include firewall rules blocking port 3260, incorrect initiator names, and authentication mismatches.

## Conclusion

The iscsi-tools extension is one of the most commonly needed extensions for Talos Linux, especially in enterprise environments where iSCSI storage is the standard. Installing it is straightforward - add it to your machine config and upgrade. Once installed, it enables a wide range of Kubernetes CSI drivers that depend on iSCSI for block storage access. Whether you are connecting to a TrueNAS array, running OpenEBS, or using Longhorn for distributed storage, the iscsi-tools extension provides the foundation that makes it all work.
