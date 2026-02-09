# How to Implement iSCSI Persistent Volumes with Democratic CSI on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, CSI

Description: Learn how to deploy Democratic CSI for iSCSI-based persistent volumes on Kubernetes, enabling dynamic provisioning from FreeNAS and TrueNAS storage systems.

---

Democratic CSI brings enterprise-grade iSCSI storage to Kubernetes clusters by bridging the gap between your existing storage infrastructure and container orchestration. If you're running FreeNAS, TrueNAS, or similar ZFS-based storage appliances, Democratic CSI provides a CSI-compliant driver that enables dynamic volume provisioning without expensive proprietary solutions.

Unlike traditional static volume mounting, Democratic CSI creates block storage volumes on demand, manages iSCSI targets automatically, and handles volume lifecycle through Kubernetes native APIs. This guide walks through implementing Democratic CSI with iSCSI for production workloads.

## Understanding Democratic CSI Architecture

Democratic CSI acts as a translator between Kubernetes CSI calls and storage system APIs. When you create a PersistentVolumeClaim, Democratic CSI calls your storage system's API to create a ZFS dataset, configure an iSCSI target, and return connection details to Kubernetes. The kubelet on each node then uses standard iSCSI initiator tools to connect and mount the volume.

The architecture includes three main components: the controller plugin that handles provisioning and attachment logic, the node plugin that manages mounting on worker nodes, and the storage system API that creates actual volumes. This separation ensures that volume management stays centralized while volume access remains distributed across your cluster.

## Installing Democratic CSI with Helm

Democratic CSI deploys through Helm charts with extensive configuration options. Start by adding the repository and examining available values.

```bash
# Add the Democratic CSI Helm repository
helm repo add democratic-csi https://democratic-csi.github.io/charts/
helm repo update

# Pull the chart to review configuration options
helm pull democratic-csi/democratic-csi --untar
cd democratic-csi
cat values.yaml | less
```

The values file contains connection details for your storage system, iSCSI configuration, and driver behavior settings. You'll need API credentials for your FreeNAS/TrueNAS system, the iSCSI portal IP address, and the parent dataset where volumes will be created.

## Configuring iSCSI Storage Backend

Create a values file that defines your storage backend connection. This example connects to a TrueNAS system running at 192.168.1.100.

```yaml
# democratic-csi-values.yaml
csiDriver:
  name: "org.democratic-csi.iscsi"

storageClasses:
  - name: freenas-iscsi-csi
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
    instance_id:
    httpConnection:
      protocol: http
      host: 192.168.1.100
      port: 80
      apiKey: 1-your-api-key-here
      allowInsecure: true
    zfs:
      datasetParentName: tank/k8s/iscsi/vols
      detachedSnapshotsDatasetParentName: tank/k8s/iscsi/snaps
      datasetEnableQuotas: true
      datasetEnableReservation: false
      datasetPermissionsMode: "0770"
      datasetPermissionsUser: 0
      datasetPermissionsGroup: 0
    iscsi:
      targetPortal: "192.168.1.100:3260"
      targetPortals: []
      interface:
      namePrefix: csi-
      nameSuffix: "-cluster"
      targetGroups:
        - targetGroupPortalGroup: 1
          targetGroupInitiatorGroup: 1
          targetGroupAuthType: None
      extentInsecureTpc: true
      extentXenCompat: false
      extentDisablePhysicalBlocksize: true
      extentBlocksize: 512
      extentRpm: "SSD"
      extentAvailThreshold: 0
```

This configuration tells Democratic CSI to create ZFS datasets under `tank/k8s/iscsi/vols`, expose them through iSCSI targets with the `csi-` prefix, and use target portal at port 3260. The API key authenticates with your storage system.

## Deploying Democratic CSI to Your Cluster

Install the Helm chart with your custom values file.

```bash
# Create namespace for CSI driver
kubectl create namespace democratic-csi

# Install Democratic CSI
helm install freenas-iscsi democratic-csi/democratic-csi \
  --namespace democratic-csi \
  --values democratic-csi-values.yaml

# Verify deployment
kubectl get pods -n democratic-csi
kubectl get csidrivers
kubectl get storageclasses
```

You should see controller and node pods running in the democratic-csi namespace. The CSI driver registration appears in `kubectl get csidrivers`, and a new storage class appears that references your iSCSI backend.

## Configuring iSCSI Initiator on Worker Nodes

Each worker node needs iSCSI initiator software to connect to volumes. Install the required packages on all nodes.

```bash
# On Ubuntu/Debian nodes
sudo apt-get update
sudo apt-get install -y open-iscsi lsscsi sg3-utils multipath-tools scsitools

# Start and enable iSCSI service
sudo systemctl enable --now iscsid
sudo systemctl enable --now open-iscsi

# Verify initiator name is set
sudo cat /etc/iscsi/initiatorname.iscsi

# Configure automatic session startup
sudo sed -i 's/node.startup = manual/node.startup = automatic/' /etc/iscsi/iscsid.conf
sudo systemctl restart iscsid
```

Democratic CSI handles iSCSI discovery and login automatically, but the base initiator tools must be present and running.

## Creating Test Volumes

Test your setup by creating a PVC that uses the Democratic CSI storage class.

```yaml
# test-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: iscsi-test-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: freenas-iscsi-csi
```

Apply this manifest and watch the provisioning process.

```bash
kubectl apply -f test-pvc.yaml
kubectl get pvc iscsi-test-pvc -w
kubectl describe pvc iscsi-test-pvc
```

If provisioning succeeds, you'll see the PVC bound to a newly created PV. Check your TrueNAS web interface to verify that a new dataset and iSCSI extent were created.

## Deploying StatefulSets with iSCSI Volumes

StatefulSets with volumeClaimTemplates automatically provision volumes for each pod replica.

```yaml
# statefulset-iscsi.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  serviceName: database
  replicas: 3
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
          value: notproductionpassword
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: freenas-iscsi-csi
      resources:
        requests:
          storage: 50Gi
```

Each pod gets its own dedicated iSCSI volume, ensuring data isolation and independent scaling.

## Monitoring and Troubleshooting

Democratic CSI logs provide detailed information about provisioning operations.

```bash
# Check controller logs
kubectl logs -n democratic-csi -l app=democratic-csi-controller -f

# Check node plugin logs on specific node
kubectl logs -n democratic-csi -l app=democratic-csi-node --field-selector spec.nodeName=worker01 -f

# Verify iSCSI sessions on worker nodes
sudo iscsiadm -m session

# Check multipath status if using multipath
sudo multipath -ll
```

Common issues include network connectivity between nodes and storage, incorrect API credentials, missing initiator packages, or firewall rules blocking iSCSI traffic on port 3260.

## Implementing Volume Snapshots

Democratic CSI supports CSI snapshot functionality with ZFS snapshots as the backend.

```yaml
# volumesnapshotclass.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: freenas-iscsi-snap
driver: org.democratic-csi.iscsi
deletionPolicy: Delete
```

Create snapshots of existing PVCs for backup or cloning purposes.

```yaml
# volumesnapshot.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: database-snapshot
spec:
  volumeSnapshotClassName: freenas-iscsi-snap
  source:
    persistentVolumeClaimName: iscsi-test-pvc
```

Snapshots complete almost instantly due to ZFS copy-on-write semantics, making them ideal for pre-upgrade backups.

Democratic CSI transforms commodity ZFS storage into cloud-native persistent volumes through standards-compliant CSI interfaces. By leveraging iSCSI for block access and ZFS for storage management, you get enterprise features like snapshots, clones, and thin provisioning without vendor lock-in. The combination of Kubernetes dynamic provisioning and battle-tested storage protocols creates a robust foundation for stateful workloads.
