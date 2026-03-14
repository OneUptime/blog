# How to Set Up iSCSI Storage on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, ISCSI, Block Storage, Kubernetes, SAN

Description: Configure iSCSI storage on Talos Linux for high-performance block-level access to SAN storage from your Kubernetes cluster.

---

iSCSI (Internet Small Computer Systems Interface) provides block-level storage access over TCP/IP networks. It brings SAN-like storage capabilities without requiring specialized Fibre Channel hardware. For Talos Linux clusters that need to connect to existing storage arrays or SAN infrastructure, iSCSI is the bridge between your enterprise storage and Kubernetes workloads. This guide covers configuring Talos Linux for iSCSI and using iSCSI volumes in Kubernetes.

## Why iSCSI on Talos Linux?

iSCSI fills a specific niche in storage architecture:

- **Block-level access** - provides raw block devices, ideal for databases and applications that need direct disk access
- **Enterprise storage integration** - connects to NetApp, Dell EMC, Pure Storage, and other enterprise arrays
- **Performance** - lower latency than NFS for random I/O patterns
- **Existing infrastructure** - leverages your existing SAN investment
- **Multi-pathing** - supports redundant paths for high availability

## Talos Machine Configuration for iSCSI

iSCSI on Talos requires the iSCSI kernel modules and initiator configuration:

```yaml
machine:
  kernel:
    modules:
      - name: iscsi_tcp      # iSCSI TCP transport
      - name: iscsi_target_mod # iSCSI target module (if running targets)
      - name: libiscsi        # iSCSI library module
  kubelet:
    extraMounts:
      # iSCSI initiator data directory
      - destination: /etc/iscsi
        type: bind
        source: /etc/iscsi
        options:
          - bind
          - rshared
      - destination: /var/lib/iscsi
        type: bind
        source: /var/lib/iscsi
        options:
          - bind
          - rshared
```

Apply the configuration to your nodes:

```bash
talosctl apply-config --nodes 192.168.1.10 --file worker-iscsi.yaml
```

### Configure the iSCSI Initiator

Each node needs a unique iSCSI initiator name. Configure this in the machine config:

```yaml
machine:
  files:
    - content: |
        InitiatorName=iqn.2024-01.com.example:talos-worker-01
      permissions: 0o644
      path: /etc/iscsi/initiatorname.iscsi
```

Each node should have a unique initiator name. The naming convention is typically `iqn.YYYY-MM.reverse-domain:hostname`.

## Installing the iSCSI Tools in Kubernetes

Since Talos does not have a traditional package manager, iSCSI management tools run as containers. Deploy the open-iscsi DaemonSet:

```yaml
# iscsi-tools-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: iscsi-tools
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: iscsi-tools
  template:
    metadata:
      labels:
        app: iscsi-tools
    spec:
      hostNetwork: true
      hostPID: true
      containers:
      - name: iscsi
        image: ghcr.io/siderolabs/iscsi-tools:latest
        securityContext:
          privileged: true
        volumeMounts:
        - name: iscsi
          mountPath: /etc/iscsi
        - name: iscsi-lib
          mountPath: /var/lib/iscsi
        - name: dev
          mountPath: /dev
        - name: sys
          mountPath: /sys
      volumes:
      - name: iscsi
        hostPath:
          path: /etc/iscsi
      - name: iscsi-lib
        hostPath:
          path: /var/lib/iscsi
      - name: dev
        hostPath:
          path: /dev
      - name: sys
        hostPath:
          path: /sys
```

## Using iSCSI with Kubernetes CSI

The democratic-csi driver and other CSI drivers support iSCSI backends. Here is how to set up a basic iSCSI CSI integration:

### Install the iSCSI CSI Driver

```bash
# Using the democratic-csi driver for TrueNAS/FreeNAS
helm repo add democratic-csi https://democratic-csi.github.io/charts/
helm repo update

helm install iscsi-storage democratic-csi/democratic-csi \
  --namespace democratic-csi \
  --create-namespace \
  --values iscsi-csi-values.yaml
```

### CSI Driver Values for iSCSI

```yaml
# iscsi-csi-values.yaml
csiDriver:
  name: org.democratic-csi.iscsi

storageClasses:
  - name: iscsi-csi
    defaultClass: false
    reclaimPolicy: Delete
    volumeBindingMode: Immediate
    allowVolumeExpansion: true
    parameters:
      fsType: ext4
    mountOptions: []

driver:
  config:
    driver: freenas-iscsi
    instance_id: talos-iscsi
    httpConnection:
      protocol: https
      host: truenas.example.com
      port: 443
      username: root
      password: "your-password"
    sshConnection:
      host: truenas.example.com
      port: 22
      username: root
      privateKey: |
        -----BEGIN RSA PRIVATE KEY-----
        ...
        -----END RSA PRIVATE KEY-----
    zfs:
      datasetParentName: pool/k8s/iscsi/v
      detachedSnapshotsDatasetParentName: pool/k8s/iscsi/s
    iscsi:
      targetPortal: "truenas.example.com:3260"
      namePrefix: csi-
      targetGroups:
        - targetGroupPortalGroup: 1
          targetGroupInitiatorGroup: 1
```

## Static iSCSI Persistent Volumes

For connecting to specific iSCSI targets:

```yaml
# iscsi-pv.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: iscsi-database-pv
spec:
  capacity:
    storage: 50Gi
  accessModes:
    - ReadWriteOnce
  iscsi:
    targetPortal: "10.0.1.100:3260"
    iqn: "iqn.2024-01.com.example:storage.database"
    lun: 0
    fsType: ext4
    readOnly: false
    initiatorName: "iqn.2024-01.com.example:talos-worker-01"
  persistentVolumeReclaimPolicy: Retain
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: iscsi-database-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  volumeName: iscsi-database-pv
```

## iSCSI with CHAP Authentication

For secure iSCSI connections, configure CHAP (Challenge-Handshake Authentication Protocol):

```yaml
# iscsi-pv-with-chap.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: iscsi-secure-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteOnce
  iscsi:
    targetPortal: "10.0.1.100:3260"
    iqn: "iqn.2024-01.com.example:storage.secure"
    lun: 0
    fsType: ext4
    readOnly: false
    chapAuthDiscovery: true
    chapAuthSession: true
    secretRef:
      name: iscsi-chap-secret
---
apiVersion: v1
kind: Secret
metadata:
  name: iscsi-chap-secret
type: kubernetes.io/iscsi-chap
data:
  node.session.auth.username: dXNlcm5hbWU=  # base64 encoded
  node.session.auth.password: cGFzc3dvcmQ=  # base64 encoded
```

## Multi-Path iSCSI

For high availability, configure multi-path iSCSI with multiple target portals:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: iscsi-multipath-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteOnce
  iscsi:
    targetPortal: "10.0.1.100:3260"
    portals:
      - "10.0.2.100:3260"  # Secondary path
    iqn: "iqn.2024-01.com.example:storage.ha"
    lun: 0
    fsType: ext4
    readOnly: false
```

## Testing iSCSI Storage

Deploy a test workload:

```yaml
# test-iscsi.yaml
apiVersion: v1
kind: Pod
metadata:
  name: iscsi-test
spec:
  containers:
  - name: test
    image: busybox
    command: ["sh", "-c", "dd if=/dev/urandom of=/data/testfile bs=1M count=50 && ls -la /data/ && sleep 3600"]
    volumeMounts:
    - name: iscsi-data
      mountPath: /data
  volumes:
  - name: iscsi-data
    persistentVolumeClaim:
      claimName: iscsi-database-pvc
```

```bash
kubectl apply -f test-iscsi.yaml

# Check pod and PVC status
kubectl get pvc iscsi-database-pvc
kubectl get pod iscsi-test
kubectl logs iscsi-test
```

## Performance Tuning

### Network Optimization

iSCSI performance depends on network quality:

```yaml
machine:
  sysctls:
    # TCP tuning for iSCSI
    net.core.rmem_max: "16777216"
    net.core.wmem_max: "16777216"
    net.ipv4.tcp_rmem: "4096 87380 16777216"
    net.ipv4.tcp_wmem: "4096 65536 16777216"
    # Disable Nagle's algorithm for low latency
    net.ipv4.tcp_nodelay: "1"
```

### Dedicated Network

For production, use a dedicated VLAN or network for iSCSI traffic to avoid contention with other network traffic:

```yaml
machine:
  network:
    interfaces:
      - interface: eth1  # Dedicated iSCSI interface
        addresses:
          - 10.10.0.11/24
        mtu: 9000  # Jumbo frames for better throughput
```

## Troubleshooting

**iSCSI target not reachable:**
- Verify network connectivity to the target portal: `ping 10.0.1.100`
- Check firewall rules for port 3260
- Verify the iSCSI target is configured and accepting connections

**Authentication failures:**
- Double-check CHAP credentials (they must be base64 encoded in Kubernetes secrets)
- Verify the initiator name matches what the target expects

**Module not loaded:**
- Verify kernel modules in machine config
- Check: `talosctl get kernelmodules --nodes <ip>`

**Volume attach failures:**
- Check kubelet logs: `talosctl logs kubelet --nodes <ip>`
- Verify the iSCSI tools DaemonSet is running on the node

## Summary

iSCSI on Talos Linux provides block-level storage access from enterprise storage arrays and SAN infrastructure. Setting it up requires kernel module configuration, iSCSI initiator setup, and proper CSI driver deployment. Use CHAP authentication for security and multi-path for high availability. Performance benefits from dedicated networks and proper TCP tuning. For Kubernetes integration, the CSI driver approach gives you dynamic provisioning, while static PVs work for fixed storage targets.
