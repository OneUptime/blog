# How to Configure Storage Capacity Tracking for Accurate CSI Scheduling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, Storage, Scheduling

Description: Learn how to enable and configure storage capacity tracking in Kubernetes for accurate pod scheduling based on available storage, preventing pod placement on nodes without sufficient storage capacity.

---

Storage capacity tracking allows the Kubernetes scheduler to make informed decisions about pod placement based on available storage capacity. This prevents pods from being scheduled on nodes that lack sufficient storage, reducing scheduling failures and improving cluster efficiency.

## Understanding Storage Capacity Tracking

Without capacity tracking, the scheduler may place pods on nodes that don't have enough storage, leading to:

- Pods stuck in Pending state
- Wasted scheduling attempts
- Unbalanced storage utilization
- Failed volume provisioning

Storage capacity tracking publishes CSIStorageCapacity objects that inform the scheduler about available storage in each topology segment, enabling smarter scheduling decisions.

## Prerequisites

Storage capacity tracking requires:

- Kubernetes 1.24+ (GA feature with the `storage.k8s.io/v1` API)
- CSI driver with capacity support
- CSIStorageCapacity API available

Verify the API:

```bash
# Check if CSIStorageCapacity is available
kubectl get --raw /apis/storage.k8s.io/v1 | jq '.resources[] | select(.name == "csistoragecapacities")'

# If CSIStorageCapacity resources are listed, the API is available
```

## Enabling Storage Capacity in CSI Drivers

For CSI drivers to report capacity, they must implement the GetCapacity RPC. Check if your driver supports it:

```bash
# Check CSI driver capabilities
kubectl get csidriver

# Describe the driver
kubectl describe csidriver example.csi.driver

# Look for spec.storageCapacity: true
```

For a CSI driver that supports capacity tracking, enable capacity publishing in the external-provisioner sidecar and enable scheduler consumption on the CSIDriver object:

```yaml
apiVersion: storage.k8s.io/v1
kind: CSIDriver
metadata:
  name: example.csi.driver
spec:
  storageCapacity: true
---
# In the CSI controller Deployment, add capacity tracking to the external-provisioner container:
args:
  - --csi-address=/csi/csi.sock
  - --enable-capacity
  - --capacity-poll-interval=1m
```

## Viewing CSIStorageCapacity Objects

Check published capacity information:

```bash
# List all CSIStorageCapacity objects
kubectl get csistoragecapacities -A

# Example output:
# NAMESPACE     NAME                          STORAGECLASS   CAPACITY
# kube-system   example-capacity-us-east-1a      fast-storage   500Gi
# kube-system   example-capacity-us-east-1b      fast-storage   750Gi
# kube-system   example-capacity-us-east-1c      fast-storage   250Gi

# View detailed capacity information
kubectl get csistoragecapacities -n kube-system -o yaml
```

Example CSIStorageCapacity object:

```yaml
apiVersion: storage.k8s.io/v1
kind: CSIStorageCapacity
metadata:
  name: local-capacity-node1
  namespace: kube-system
storageClassName: local-storage
nodeTopology:
  matchLabels:
    kubernetes.io/hostname: node1
capacity: 1Ti
maximumVolumeSize: 100Gi
```

## Configuring StorageClasses for Capacity Tracking

Enable capacity-aware scheduling in StorageClasses:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: capacity-aware-storage
provisioner: example.csi.driver
parameters:
  pool: fast
# WaitForFirstConsumer works with capacity tracking
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

Create StorageClasses for different zones:

```yaml
# Zone-specific storage with capacity tracking
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: storage-us-east-1a
provisioner: example.csi.driver
parameters:
  pool: fast
volumeBindingMode: WaitForFirstConsumer
allowedTopologies:
- matchLabelExpressions:
  - key: topology.kubernetes.io/zone
    values:
    - us-east-1a
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: storage-us-east-1b
provisioner: example.csi.driver
parameters:
  pool: fast
volumeBindingMode: WaitForFirstConsumer
allowedTopologies:
- matchLabelExpressions:
  - key: topology.kubernetes.io/zone
    values:
    - us-east-1b
```

## Testing Capacity-Aware Scheduling

Create PVCs that exceed available capacity:

```yaml
# Request storage larger than available on some nodes
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: large-volume-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: capacity-aware-storage
  resources:
    requests:
      storage: 800Gi  # Larger than capacity on some nodes
```

Deploy a pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-capacity-scheduling
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: large-volume-pvc
```

Apply and observe scheduling:

```bash
kubectl apply -f large-pvc.yaml
kubectl apply -f pod.yaml

# Watch pod scheduling
kubectl get pod test-capacity-scheduling -w

# Pod will be scheduled only on nodes with sufficient capacity
# Check events
kubectl describe pod test-capacity-scheduling

# Events may show FailedScheduling messages when no topology segment has enough capacity
```

## Monitoring Storage Capacity

Track capacity across the cluster:

```bash
# View capacity by storage class
kubectl get csistoragecapacities -A -o json | \
  jq -r '.items[] | "\(.storageClassName): \(.capacity)"' | \
  sort | uniq

# Aggregate capacity by node
kubectl get csistoragecapacities -A -o json | \
  jq -r '.items[] |
    select(.nodeTopology.matchLabels."kubernetes.io/hostname" != null) |
    "\(.nodeTopology.matchLabels."kubernetes.io/hostname"): \(.capacity)"'

# Find nodes with low capacity
kubectl get csistoragecapacities -A -o json | \
  jq -r '.items[] |
    select(.capacity != null) |
    select(.capacity | test("^[0-9]+Gi$")) |
    select((.capacity | sub("Gi$";"") | tonumber) < 100) |
    "\(.nodeTopology.matchLabels."kubernetes.io/hostname"): \(.capacity)"'
```

Create a monitoring script:

```bash
#!/bin/bash
# monitor-storage-capacity.sh

echo "Storage Capacity Report"
echo "======================="

# Get unique storage classes
STORAGE_CLASSES=$(kubectl get csistoragecapacities -A -o json | \
  jq -r '.items[].storageClassName' | sort | uniq)

for sc in $STORAGE_CLASSES; do
  echo ""
  echo "StorageClass: $sc"
  echo "---"

  # Total capacity for this storage class, counting Gi values
  TOTAL=$(kubectl get csistoragecapacities -A -o json | \
    jq -r ".items[] |
      select(.storageClassName == \"$sc\") |
      .capacity // \"0Gi\" |
      select(test(\"^[0-9]+Gi$\")) |
      sub(\"Gi$\"; \"\") |
      tonumber" | \
    awk '{sum+=$1} END {print sum+0}')

  echo "Total Capacity: ${TOTAL}Gi"

  # Capacity by node/zone
  kubectl get csistoragecapacities -A -o json | \
    jq -r ".items[] |
      select(.storageClassName == \"$sc\") |
      \"\(.nodeTopology.matchLabels // {}): \(.capacity)\""
done
```

## Custom CSIStorageCapacity for Local Storage

For custom local storage providers or lab validation, create capacity objects that match the CSI driver's topology. In production, these objects should normally be published and kept current by the CSI driver deployment:

```yaml
apiVersion: storage.k8s.io/v1
kind: CSIStorageCapacity
metadata:
  name: local-nvme-node1
  namespace: kube-system
storageClassName: local-nvme
nodeTopology:
  matchLabels:
    kubernetes.io/hostname: node1
    storage-type: nvme
capacity: 2Ti
maximumVolumeSize: 500Gi
---
apiVersion: storage.k8s.io/v1
kind: CSIStorageCapacity
metadata:
  name: local-nvme-node2
  namespace: kube-system
storageClassName: local-nvme
nodeTopology:
  matchLabels:
    kubernetes.io/hostname: node2
    storage-type: nvme
capacity: 1536Gi
maximumVolumeSize: 500Gi
```

## Automated Capacity Reporting

Create a job to periodically update capacity for a custom local CSI driver:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: update-storage-capacity
  namespace: kube-system
spec:
  schedule: "*/10 * * * *"  # Every 10 minutes
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: capacity-updater
          restartPolicy: OnFailure
          containers:
          - name: updater
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              # Get node storage capacity
              for node in $(kubectl get nodes -o name | cut -d'/' -f2); do
                # Read a node-published allocatable capacity value, for example "500Gi"
                CAPACITY=$(kubectl get node "$node" -o jsonpath='{.metadata.annotations.storage\.example\.com/local-capacity}')
                if [ -z "$CAPACITY" ]; then
                  continue
                fi

                # Update or create CSIStorageCapacity
                cat <<EOF | kubectl apply -f -
                apiVersion: storage.k8s.io/v1
                kind: CSIStorageCapacity
                metadata:
                  name: local-capacity-$node
                  namespace: kube-system
                storageClassName: local-storage
                nodeTopology:
                  matchLabels:
                    kubernetes.io/hostname: $node
                capacity: $CAPACITY
                EOF
              done
```

## Troubleshooting

Common issues:

```bash
# 1. No CSIStorageCapacity objects created
kubectl get csistoragecapacities -A

# Check if CSI driver supports capacity
kubectl logs -n kube-system -l app=csi-driver-controller | grep -i capacity

# 2. Pod not scheduled despite available capacity
kubectl describe pod test-pod

# Check scheduler logs
kubectl logs -n kube-system kube-scheduler-xxxxx | grep storage

# 3. Capacity not updated
# Restart CSI controller
kubectl rollout restart deployment/csi-driver-controller -n kube-system

# 4. Incorrect capacity reported
# Verify underlying storage
kubectl debug node/node1 --image=alpine -- df -h /host
```

## Best Practices

1. **Enable capacity tracking** for all CSI drivers that support it
2. **Use WaitForFirstConsumer** binding mode with capacity tracking
3. **Monitor capacity trends** to plan for expansion
4. **Set alerts** for low storage capacity
5. **Regular capacity reports** for capacity planning
6. **Test scheduling** with various volume sizes
7. **Update capacity** when adding/removing storage
8. **Document topology** and capacity distribution

Storage capacity tracking ensures efficient pod scheduling by making storage availability visible to the Kubernetes scheduler, reducing failed scheduling attempts and improving overall cluster resource utilization.
