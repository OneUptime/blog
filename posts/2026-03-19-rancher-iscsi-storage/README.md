# How to Configure iSCSI Storage in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Storage, iSCSI

Description: A practical guide to configuring iSCSI block storage for persistent volumes in Rancher-managed Kubernetes clusters.

iSCSI (Internet Small Computer Systems Interface) provides block-level storage over IP networks. It is commonly used in enterprise environments where high-performance block storage is required. This guide walks through configuring iSCSI storage in Rancher-managed Kubernetes clusters.

## Prerequisites

- A Rancher instance that manages your Kubernetes cluster
- A managed Kubernetes cluster
- An iSCSI target (storage server) accessible from cluster nodes
- iSCSI initiator software installed on all cluster nodes
- kubectl access to your cluster

## Step 1: Install iSCSI Initiator on Cluster Nodes

Install the iSCSI initiator on each node in the cluster.

For Ubuntu/Debian:

```bash
sudo apt update
sudo apt install open-iscsi -y
sudo systemctl enable --now iscsid
```

For RHEL/CentOS:

```bash
sudo yum install iscsi-initiator-utils -y
sudo systemctl enable --now iscsid
```

If your cluster is Rancher-provisioned RKE, installing the initiator on the host is not sufficient because the kubelet runs in a container. Mount the host iSCSI tools into the kubelet:

```yaml
services:
  kubelet:
    extra_binds:
      - "/etc/iscsi:/etc/iscsi"
      - "/sbin/iscsiadm:/sbin/iscsiadm"
```

For RKE2 and K3s clusters managed by Rancher, installing the iSCSI tools on the host nodes is sufficient. On some RHEL releases, Rancher also documents an additional `libcrypto` bind mount for kubelet.

Verify the initiator name:

```bash
cat /etc/iscsi/initiatorname.iscsi
```

## Step 2: Discover iSCSI Targets

From a cluster node, discover available targets:

```bash
sudo iscsiadm -m discovery -t sendtargets -p <ISCSI_SERVER_IP>:3260
```

This shows available iSCSI targets with their IQN (iSCSI Qualified Name).

## Step 3: Test Manual Connection

Test the iSCSI connection manually:

```bash
# Login to the target

sudo iscsiadm -m node -T iqn.2024-01.com.example:storage.lun1 -p <ISCSI_SERVER_IP>:3260 --login

# Verify the device
sudo iscsiadm -m session -P 1
lsblk

# Logout when done testing
sudo iscsiadm -m node -T iqn.2024-01.com.example:storage.lun1 -p <ISCSI_SERVER_IP>:3260 --logout
```

## Step 4: Create a Static iSCSI Persistent Volume

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: iscsi-pv
spec:
  capacity:
    storage: 50Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  iscsi:
    targetPortal: 192.168.1.100:3260
    iqn: iqn.2024-01.com.example:storage.lun1
    lun: 0
    fsType: ext4
    readOnly: false
```

```bash
kubectl apply -f iscsi-pv.yaml
```

## Step 5: Create a PVC for the iSCSI Volume

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: iscsi-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: ""
  volumeName: iscsi-pv
```

```bash
kubectl apply -f iscsi-pvc.yaml
kubectl get pvc iscsi-pvc
```

## Step 6: Configure CHAP Authentication

For secure iSCSI connections, use CHAP (Challenge-Handshake Authentication Protocol):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: iscsi-chap-secret
  namespace: default
type: kubernetes.io/iscsi-chap
data:
  node.session.auth.username: dXNlcm5hbWU=  # base64 encoded
  node.session.auth.password: cGFzc3dvcmQ=  # base64 encoded
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: iscsi-chap-pv
spec:
  capacity:
    storage: 50Gi
  accessModes:
    - ReadWriteOnce
  iscsi:
    targetPortal: 192.168.1.100:3260
    iqn: iqn.2024-01.com.example:storage.lun1
    lun: 0
    fsType: ext4
    chapAuthSession: true
    secretRef:
      name: iscsi-chap-secret
```

## Step 7: Configure Multipath for High Availability

For high-availability iSCSI connections, configure multiple portals:

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
    targetPortal: 192.168.1.100:3260
    portals:
    - 192.168.1.101:3260
    - 192.168.1.102:3260
    iqn: iqn.2024-01.com.example:storage.lun1
    lun: 0
    fsType: ext4
    readOnly: false
```

Ensure multipath is configured on the nodes:

```bash
sudo apt install multipath-tools -y
sudo systemctl enable --now multipathd
```

For RHEL/CentOS:

```bash
sudo yum install device-mapper-multipath -y
sudo mpathconf --enable
sudo systemctl enable --now multipathd
```

## Step 8: Deploy an Application with iSCSI Storage

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_PASSWORD
          value: mysecretpassword
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: db-data
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: db-data
        persistentVolumeClaim:
          claimName: iscsi-pvc
```

## Step 9: Use a CSI Driver for Dynamic Provisioning

For dynamic iSCSI provisioning, install a CSI driver like democratic-csi:

```bash
helm repo add democratic-csi https://democratic-csi.github.io/charts/
helm repo update

helm install iscsi-csi democratic-csi/democratic-csi \
  --namespace democratic-csi \
  --create-namespace \
  -f iscsi-csi-values.yaml
```

Example values file:

```yaml
driver:
  config:
    driver: freenas-iscsi
    instance_id: ""
    httpConnection:
      protocol: https
      host: storage-server.example.com
      port: 443
      apiKey: YOUR_API_KEY
    iscsi:
      targetPortal: 192.168.1.100:3260
      namePrefix: csi-
      nameSuffix: ""
      targetGroups:
        - targetGroupPortalGroup: 1
          targetGroupInitiatorGroup: 1
```

## Step 10: Monitor iSCSI Volumes

```bash
# Check PV status
kubectl get pv | grep iscsi

# Check PVC binding
kubectl get pvc --all-namespaces | grep iscsi

# Check iSCSI sessions on nodes (SSH to node)
sudo iscsiadm -m session

# Check multipath status
sudo multipath -ll

# View iSCSI related events
kubectl get events --field-selector reason=FailedMount
```

## Troubleshooting

- **Mount failed**: Ensure `open-iscsi` is installed on all nodes
- **Login failed**: Verify target portal IP, IQN, and CHAP credentials
- **Device not found**: Check `iscsid` service is running on nodes
- **Stale sessions**: Clear old sessions: `iscsiadm -m node --logoutall=all`
- **Multipath issues**: Check `/etc/multipath.conf` and `multipathd` service
- **Permission denied**: Verify LUN masking on the storage server

## Summary

iSCSI storage in Rancher provides high-performance block storage suitable for databases and other I/O-intensive workloads. While configuration requires more setup than NFS, iSCSI delivers better performance for single-writer workloads. Use CHAP authentication for security and multipath for high availability in production environments.
