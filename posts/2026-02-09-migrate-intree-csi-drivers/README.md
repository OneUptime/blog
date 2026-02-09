# How to Migrate Kubernetes Storage from In-Tree Plugins to CSI Drivers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, CSI

Description: Learn how to migrate Kubernetes persistent volumes from deprecated in-tree storage plugins to Container Storage Interface (CSI) drivers without data loss or downtime.

---

Kubernetes is deprecating in-tree volume plugins in favor of the Container Storage Interface (CSI). In-tree plugins are tightly coupled to Kubernetes releases, while CSI drivers are independently maintained and more flexible. Migrating to CSI is essential for future Kubernetes versions. This guide shows you how to migrate existing volumes from in-tree plugins to CSI drivers safely.

## Understanding In-Tree vs CSI Storage

In-tree plugins are compiled into Kubernetes binaries, while CSI drivers run as separate pods.

```bash
#!/bin/bash
# Identify in-tree volumes in your cluster

echo "=== Detecting In-Tree Volumes ==="

# Find PVs using in-tree plugins
kubectl get pv -o json | jq -r '.items[] | select(.spec.awsElasticBlockStore or .spec.gcePersistentDisk or .spec.azureDisk or .spec.vsphereVolume) | .metadata.name'

# Count by type
echo -e "\nAWS EBS (in-tree):"
kubectl get pv -o json | jq '[.items[] | select(.spec.awsElasticBlockStore)] | length'

echo "GCE PD (in-tree):"
kubectl get pv -o json | jq '[.items[] | select(.spec.gcePersistentDisk)] | length'

echo "Azure Disk (in-tree):"
kubectl get pv -o json | jq '[.items[] | select(.spec.azureDisk)] | length'

echo "vSphere (in-tree):"
kubectl get pv -o json | jq '[.items[] | select(.spec.vsphereVolume)] | length'

# Check storage classes
echo -e "\n=== In-Tree Storage Classes ==="
kubectl get storageclass -o json | jq -r '.items[] | select(.provisioner | contains("kubernetes.io/aws-ebs") or contains("kubernetes.io/gce-pd") or contains("kubernetes.io/azure-disk")) | .metadata.name'
```

This audit identifies volumes that need migration.

## Installing CSI Drivers

Deploy appropriate CSI drivers for your infrastructure.

```bash
#!/bin/bash
# Install AWS EBS CSI Driver

# Create IAM policy
cat > ebs-csi-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateSnapshot",
        "ec2:AttachVolume",
        "ec2:DetachVolume",
        "ec2:ModifyVolume",
        "ec2:DescribeAvailabilityZones",
        "ec2:DescribeInstances",
        "ec2:DescribeSnapshots",
        "ec2:DescribeTags",
        "ec2:DescribeVolumes",
        "ec2:DescribeVolumesModifications"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateTags"
      ],
      "Resource": [
        "arn:aws:ec2:*:*:volume/*",
        "arn:aws:ec2:*:*:snapshot/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DeleteTags"
      ],
      "Resource": [
        "arn:aws:ec2:*:*:volume/*",
        "arn:aws:ec2:*:*:snapshot/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateVolume"
      ],
      "Resource": "*",
      "Condition": {
        "StringLike": {
          "aws:RequestTag/ebs.csi.aws.com/cluster": "true"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DeleteVolume"
      ],
      "Resource": "*",
      "Condition": {
        "StringLike": {
          "ec2:ResourceTag/ebs.csi.aws.com/cluster": "true"
        }
      }
    }
  ]
}
EOF

aws iam create-policy --policy-name AmazonEBS_CSI_Driver --policy-document file://ebs-csi-policy.json

# Install using Helm
helm repo add aws-ebs-csi-driver https://kubernetes-sigs.github.io/aws-ebs-csi-driver
helm repo update

helm install aws-ebs-csi-driver aws-ebs-csi-driver/aws-ebs-csi-driver \
    --namespace kube-system \
    --set enableVolumeScheduling=true \
    --set enableVolumeResizing=true \
    --set enableVolumeSnapshot=true

# Verify installation
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-ebs-csi-driver
kubectl get csidrivers
```

The CSI driver runs as pods and uses the CSI specification for volume operations.

## Creating CSI Storage Classes

Define new storage classes that use CSI drivers.

```yaml
# csi-storage-classes.yaml
---
# AWS EBS CSI Storage Class
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-csi-gp3
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete
---
# GCP PD CSI Storage Class
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: pd-csi-standard
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-standard
  replication-type: regional-pd
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete
---
# Azure Disk CSI Storage Class
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-disk-csi
provisioner: disk.csi.azure.com
parameters:
  skuName: StandardSSD_LRS
  kind: managed
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete
```

CSI storage classes use new provisioner names and support advanced features.

## Migrating Volumes Using In-Place Translation

Use CSIMigration feature gate for transparent migration.

```yaml
# Enable CSIMigration feature gates
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubeadm-config
  namespace: kube-system
data:
  ClusterConfiguration: |
    apiVersion: kubeadm.k8s.io/v1beta3
    kind: ClusterConfiguration
    apiServer:
      extraArgs:
        feature-gates: "CSIMigration=true,CSIMigrationAWS=true,CSIMigrationGCE=true,CSIMigrationAzureDisk=true"
    controllerManager:
      extraArgs:
        feature-gates: "CSIMigration=true,CSIMigrationAWS=true,CSIMigrationGCE=true,CSIMigrationAzureDisk=true"
    kubelet:
      extraArgs:
        feature-gates: "CSIMigration=true,CSIMigrationAWS=true,CSIMigrationGCE=true,CSIMigrationAzureDisk=true"
```

```bash
#!/bin/bash
# Apply feature gates to control plane

# For kubeadm clusters
kubectl edit cm kubeadm-config -n kube-system

# Restart control plane components
kubectl -n kube-system delete pod -l component=kube-apiserver
kubectl -n kube-system delete pod -l component=kube-controller-manager

# Restart kubelet on all nodes
for node in $(kubectl get nodes -o name); do
    ssh $node 'sudo systemctl restart kubelet'
done

# Verify CSIMigration is enabled
kubectl get --raw /metrics | grep csi_migration
```

With CSIMigration enabled, in-tree volumes automatically use CSI drivers without modification.

## Migrating Volumes with Data Copy

For platforms without CSIMigration, manually migrate volumes with data copy.

```bash
#!/bin/bash
# Migrate volume with data copy

SOURCE_PVC="old-app-data"
NAMESPACE="production"

# Create snapshot of source volume
cat <<EOF | kubectl apply -f -
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: ${SOURCE_PVC}-snapshot
  namespace: ${NAMESPACE}
spec:
  volumeSnapshotClassName: csi-snapshot-class
  source:
    persistentVolumeClaimName: ${SOURCE_PVC}
EOF

# Wait for snapshot to be ready
kubectl wait --for=condition=readytouse volumesnapshot/${SOURCE_PVC}-snapshot -n ${NAMESPACE} --timeout=300s

# Create new PVC from snapshot using CSI
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${SOURCE_PVC}-csi
  namespace: ${NAMESPACE}
spec:
  dataSource:
    name: ${SOURCE_PVC}-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
  - ReadWriteOnce
  storageClassName: ebs-csi-gp3
  resources:
    requests:
      storage: 100Gi
EOF

# Wait for new PVC
kubectl wait --for=condition=bound pvc/${SOURCE_PVC}-csi -n ${NAMESPACE} --timeout=300s

echo "New CSI volume created from snapshot"
```

This creates a CSI-backed volume with identical data.

## Updating Applications to Use CSI Volumes

Modify deployments to use the new CSI-backed PVCs.

```yaml
# Original deployment with in-tree volume
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
  namespace: production
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    spec:
      containers:
      - name: postgres
        image: postgres:15
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp2  # In-tree storage class
      resources:
        requests:
          storage: 100Gi
---
# Updated deployment with CSI volume
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
  namespace: production
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    spec:
      containers:
      - name: postgres
        image: postgres:15
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: ebs-csi-gp3  # CSI storage class
      resources:
        requests:
          storage: 100Gi
```

Update the storageClassName to use CSI-backed classes.

## Performing Rolling Migration for StatefulSets

Migrate StatefulSet volumes one pod at a time.

```bash
#!/bin/bash
# Rolling StatefulSet volume migration

STATEFULSET="database"
NAMESPACE="production"
REPLICAS=$(kubectl get statefulset ${STATEFULSET} -n ${NAMESPACE} -o jsonpath='{.spec.replicas}')

for i in $(seq 0 $((REPLICAS-1))); do
    POD="${STATEFULSET}-${i}"
    PVC="${PVC_NAME}-${POD}"

    echo "Migrating pod $POD..."

    # Scale down to remove this pod
    kubectl scale statefulset ${STATEFULSET} -n ${NAMESPACE} --replicas=$i

    # Wait for pod to terminate
    kubectl wait --for=delete pod/${POD} -n ${NAMESPACE} --timeout=300s

    # Create snapshot of volume
    cat <<EOF | kubectl apply -f -
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: ${PVC}-snapshot
  namespace: ${NAMESPACE}
spec:
  volumeSnapshotClassName: csi-snapshot-class
  source:
    persistentVolumeClaimName: ${PVC}
EOF

    kubectl wait --for=condition=readytouse volumesnapshot/${PVC}-snapshot -n ${NAMESPACE} --timeout=300s

    # Delete old PVC
    kubectl delete pvc ${PVC} -n ${NAMESPACE}

    # Create new CSI PVC from snapshot
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${PVC}
  namespace: ${NAMESPACE}
spec:
  dataSource:
    name: ${PVC}-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
  - ReadWriteOnce
  storageClassName: ebs-csi-gp3
  resources:
    requests:
      storage: 100Gi
EOF

    kubectl wait --for=condition=bound pvc/${PVC} -n ${NAMESPACE} --timeout=300s

    # Scale back up
    kubectl scale statefulset ${STATEFULSET} -n ${NAMESPACE} --replicas=$((i+1))
    kubectl wait --for=condition=ready pod/${POD} -n ${NAMESPACE} --timeout=300s

    # Verify pod health
    kubectl exec ${POD} -n ${NAMESPACE} -- pg_isready

    echo "Pod $POD migrated successfully"
    sleep 30
done

echo "StatefulSet migration complete"
```

This migrates each StatefulSet pod individually to minimize disruption.

## Cleaning Up In-Tree Resources

Remove deprecated in-tree storage classes and verify migration.

```bash
#!/bin/bash
# Cleanup script

echo "=== Verifying All Volumes Migrated ==="
INTREE_PVS=$(kubectl get pv -o json | jq -r '.items[] | select(.spec.awsElasticBlockStore or .spec.gcePersistentDisk or .spec.azureDisk) | .metadata.name')

if [ -n "$INTREE_PVS" ]; then
    echo "WARNING: In-tree volumes still exist:"
    echo "$INTREE_PVS"
    echo "Migration incomplete. Do not proceed with cleanup."
    exit 1
fi

echo "All volumes migrated to CSI"

# Remove in-tree storage classes
echo "Removing in-tree storage classes..."
kubectl delete storageclass gp2
kubectl delete storageclass standard
kubectl delete storageclass managed-premium

# Update default storage class
kubectl patch storageclass ebs-csi-gp3 -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'

echo "In-tree storage cleanup complete"
```

Only remove in-tree resources after confirming all volumes use CSI.

## Monitoring CSI Driver Performance

Track CSI driver metrics to ensure healthy operation.

```yaml
# Prometheus rules for CSI monitoring
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: csi-driver-alerts
  namespace: monitoring
spec:
  groups:
  - name: csi_drivers
    interval: 30s
    rules:
    - alert: CSIVolumeAttachFailed
      expr: increase(storage_operation_duration_seconds_count{operation_name="volume_attach",status="fail"}[5m]) > 0
      labels:
        severity: critical
      annotations:
        summary: "CSI volume attach operations failing"

    - alert: CSIHighLatency
      expr: histogram_quantile(0.99, rate(storage_operation_duration_seconds_bucket[5m])) > 30
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "CSI operations experiencing high latency"

    - alert: CSIDriverPodDown
      expr: kube_pod_status_phase{namespace="kube-system",pod=~"ebs-csi.*"} != 1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "CSI driver pod is down"
```

Monitor CSI driver health to catch issues early.

## Conclusion

Migrating from in-tree storage plugins to CSI drivers is essential for future Kubernetes compatibility. Audit your cluster to identify volumes using deprecated in-tree plugins. Install appropriate CSI drivers for your cloud provider or storage platform. Enable CSIMigration feature gates for transparent automatic migration on supported platforms. For platforms without CSIMigration support, use volume snapshots to copy data to new CSI-backed PVCs. Update applications to reference CSI storage classes instead of in-tree provisioners. Migrate StatefulSet volumes using a rolling approach, one pod at a time. Monitor CSI driver metrics to ensure healthy operation. Remove in-tree storage classes only after confirming all volumes use CSI. This migration ensures your cluster remains compatible with future Kubernetes versions while gaining access to CSI driver features like volume snapshots, cloning, and expansion.
