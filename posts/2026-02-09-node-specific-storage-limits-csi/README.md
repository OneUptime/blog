# How to Use Node-Specific Storage Limits with CSI Node Allocatable Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, CSI

Description: Learn how to configure node-specific storage limits using CSI driver allocatable resources to prevent storage exhaustion and ensure fair resource distribution.

---

Kubernetes nodes have varying storage capacities based on their hardware configuration. Without proper limits, storage-intensive workloads can exhaust node storage, causing failures for other pods. CSI drivers expose node allocatable storage resources that allow fine-grained control over storage provisioning per node.

## Understanding Node Allocatable Storage

Each Kubernetes node has a finite amount of storage capacity. The kubelet reports allocatable storage resources that can be consumed by pods. CSI drivers extend this mechanism by reporting how much storage they can provision on each specific node.

When a CSI driver registers with a node, it reports maximum attachable volumes and total storage capacity available for provisioning. The scheduler uses this information during pod placement to avoid assigning pods to nodes that cannot provision the required storage.

## How CSI Drivers Report Storage Capacity

CSI drivers implement the GetCapacity RPC to report available storage on each node. The CSI node plugin runs as a DaemonSet and periodically updates capacity information:

```go
// Example CSI driver capacity reporting
func (d *Driver) GetCapacity(ctx context.Context, req *csi.GetCapacityRequest) (*csi.GetCapacityResponse, error) {
    // Get available storage on this node
    var stat syscall.Statfs_t
    if err := syscall.Statfs(d.nodeStoragePath, &stat); err != nil {
        return nil, status.Errorf(codes.Internal, "failed to stat path: %v", err)
    }

    // Calculate available capacity
    availableBytes := int64(stat.Bavail) * int64(stat.Bsize)

    // Apply reservation (keep 10% free)
    reservedBytes := int64(float64(availableBytes) * 0.1)
    allocatableBytes := availableBytes - reservedBytes

    return &csi.GetCapacityResponse{
        AvailableCapacity: allocatableBytes,
    }, nil
}
```

## Enabling CSI Storage Capacity Tracking

Enable the CSIStorageCapacity feature gate and configure the CSI driver to report capacity:

```yaml
# CSI driver configuration with storage capacity tracking
apiVersion: storage.k8s.io/v1
kind: CSIDriver
metadata:
  name: example.csi.driver
spec:
  # Enable storage capacity tracking
  storageCapacity: true
  # Volume lifecycle modes
  attachRequired: true
  podInfoOnMount: false
  # Supported volume modes
  volumeLifecycleModes:
  - Persistent
  - Ephemeral
```

The CSI controller deployment needs permissions to create and update CSIStorageCapacity objects:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: csi-controller
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: csi-controller-role
rules:
- apiGroups: ["storage.k8s.io"]
  resources: ["csistoragecapacities"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["persistentvolumes"]
  verbs: ["get", "list", "watch", "create", "delete"]
- apiGroups: [""]
  resources: ["persistentvolumeclaims"]
  verbs: ["get", "list", "watch", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: csi-controller-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: csi-controller-role
subjects:
- kind: ServiceAccount
  name: csi-controller
  namespace: kube-system
```

## Viewing Storage Capacity Information

Check reported storage capacity across nodes:

```bash
# List all CSIStorageCapacity objects
kubectl get csistoragecapacities --all-namespaces

# Get detailed capacity for specific driver
kubectl get csistoragecapacities -n kube-system -l storage.kubernetes.io/csidriver=example.csi.driver -o yaml

# Show capacity per node
kubectl get csistoragecapacities -n kube-system -o custom-columns=\
NODE:.nodeTopology.matchLabels.kubernetes\\.io/hostname,\
CAPACITY:.capacity,\
STORAGE_CLASS:.storageClassName
```

Example output:

```
NODE        CAPACITY      STORAGE_CLASS
worker-1    500Gi         fast-ssd
worker-2    1000Gi        fast-ssd
worker-3    250Gi         fast-ssd
```

## Configuring Node-Specific Storage Classes

Create storage classes that respect node capacity limits:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: node-aware-storage
provisioner: example.csi.driver
parameters:
  type: ssd
  fsType: ext4
# Wait for consumer ensures scheduler sees capacity info
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

The WaitForFirstConsumer binding mode delays volume provisioning until a pod is scheduled. This allows the scheduler to consider storage capacity when placing the pod.

## Setting Maximum Volumes Per Node

Configure the maximum number of volumes that can attach to each node:

```yaml
apiVersion: storage.k8s.io/v1
kind: CSIDriver
metadata:
  name: example.csi.driver
spec:
  storageCapacity: true
  attachRequired: true
  podInfoOnMount: false
  # Set maximum volumes per node
  # If not specified, defaults to 0 (unlimited)
  # Common values: 39 for AWS EBS, 256 for most other drivers
```

Check current volume attachment count per node:

```bash
# Count volume attachments per node
kubectl get volumeattachments -o json | jq -r '
  .items |
  group_by(.spec.nodeName) |
  map({node: .[0].spec.nodeName, count: length}) |
  .[]
'
```

## Implementing Custom Storage Limits

Create a custom admission webhook to enforce storage limits:

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"

    admissionv1 "k8s.io/api/admission/v1"
    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/api/resource"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
)

type StorageLimitWebhook struct {
    client kubernetes.Interface
}

func (w *StorageLimitWebhook) validatePVC(ar *admissionv1.AdmissionReview) *admissionv1.AdmissionResponse {
    pvc := &corev1.PersistentVolumeClaim{}
    if err := json.Unmarshal(ar.Request.Object.Raw, pvc); err != nil {
        return &admissionv1.AdmissionResponse{
            Result: &metav1.Status{
                Message: err.Error(),
            },
        }
    }

    // Get requested storage size
    requestedStorage := pvc.Spec.Resources.Requests[corev1.ResourceStorage]

    // Get node with most available capacity
    capacities, err := w.getNodeCapacities(pvc.Spec.StorageClassName)
    if err != nil {
        return &admissionv1.AdmissionResponse{
            Allowed: false,
            Result: &metav1.Status{
                Message: fmt.Sprintf("Failed to check capacity: %v", err),
            },
        }
    }

    // Check if any node can satisfy the request
    canProvision := false
    for _, capacity := range capacities {
        if capacity.Cmp(requestedStorage) >= 0 {
            canProvision = true
            break
        }
    }

    if !canProvision {
        return &admissionv1.AdmissionResponse{
            Allowed: false,
            Result: &metav1.Status{
                Message: fmt.Sprintf(
                    "Insufficient storage capacity: requested %s, max available %s",
                    requestedStorage.String(),
                    maxCapacity(capacities).String(),
                ),
            },
        }
    }

    return &admissionv1.AdmissionResponse{
        Allowed: true,
    }
}

func (w *StorageLimitWebhook) getNodeCapacities(storageClass *string) (map[string]resource.Quantity, error) {
    ctx := context.Background()
    capacities := make(map[string]resource.Quantity)

    // List CSIStorageCapacity objects
    capacityList, err := w.client.StorageV1().CSIStorageCapacities("").List(ctx, metav1.ListOptions{})
    if err != nil {
        return nil, err
    }

    for _, cap := range capacityList.Items {
        if storageClass != nil && cap.StorageClassName != *storageClass {
            continue
        }

        // Extract node name from topology
        if nodeName, ok := cap.NodeTopology.MatchLabels["kubernetes.io/hostname"]; ok {
            if cap.Capacity != nil {
                capacities[nodeName] = *cap.Capacity
            }
        }
    }

    return capacities, nil
}
```

## Node Storage Reservation

Reserve storage on nodes to prevent complete exhaustion:

```yaml
# Kubelet configuration to reserve storage
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
evictionHard:
  nodefs.available: "10%"
  nodefs.inodesFree: "5%"
  imagefs.available: "15%"
evictionSoft:
  nodefs.available: "15%"
  nodefs.inodesFree: "10%"
  imagefs.available: "20%"
evictionSoftGracePeriod:
  nodefs.available: "1m"
  nodefs.inodesFree: "1m"
  imagefs.available: "1m"
```

This configuration prevents pods from consuming storage beyond the specified thresholds.

## Monitoring Node Storage Usage

Create a monitoring dashboard to track storage consumption:

```bash
# Get node filesystem usage
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
CAPACITY:.status.capacity.ephemeral-storage,\
ALLOCATABLE:.status.allocatable.ephemeral-storage,\
USED:.status.conditions[?(@.type==\"DiskPressure\")].status

# Check CSI storage capacity across all nodes
kubectl get csistoragecapacities --all-namespaces -o json | jq -r '
  .items[] |
  select(.capacity != null) |
  "\(.nodeTopology.matchLabels."kubernetes.io/hostname") \(.storageClassName) \(.capacity)"
'
```

Set up Prometheus queries:

```promql
# Available storage per node
kubelet_volume_stats_available_bytes

# Storage capacity by storage class and node
sum by (node, storage_class) (
  kube_csistoragecapacity_capacity_bytes
)

# Storage utilization percentage
(
  sum by (node) (kubelet_volume_stats_used_bytes)
  /
  sum by (node) (kubelet_volume_stats_capacity_bytes)
) * 100

# Nodes approaching storage capacity
(
  sum by (node) (kubelet_volume_stats_available_bytes)
  /
  sum by (node) (kubelet_volume_stats_capacity_bytes)
) < 0.2
```

## Dynamic Storage Allocation

Implement intelligent storage allocation based on node capacity:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: storage-aware-app
spec:
  # Use affinity to prefer nodes with more storage capacity
  affinity:
    nodeAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        preference:
          matchExpressions:
          - key: node.kubernetes.io/storage-capacity
            operator: Gt
            values:
            - "500Gi"
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: app-data
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: node-aware-storage
  resources:
    requests:
      storage: 100Gi
```

## Handling Storage Exhaustion

Create alerts for nodes approaching storage limits:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: storage-capacity-alerts
  namespace: monitoring
spec:
  groups:
  - name: storage-capacity
    interval: 30s
    rules:
    - alert: NodeStorageAlmostFull
      expr: |
        (
          node_filesystem_avail_bytes{mountpoint="/"}
          /
          node_filesystem_size_bytes{mountpoint="/"}
        ) < 0.15
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Node {{ $labels.instance }} storage almost full"
        description: "Only {{ $value | humanizePercentage }} storage remaining"

    - alert: CSIStorageCapacityLow
      expr: |
        kube_csistoragecapacity_capacity_bytes < 100 * 1024 * 1024 * 1024
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Low CSI storage capacity on {{ $labels.node }}"
        description: "Only {{ $value | humanize1024 }}B capacity remaining"

    - alert: MaxVolumesPerNodeReached
      expr: |
        count by (node) (kube_pod_spec_volumes_persistentvolumeclaims_info) >= 100
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Node {{ $labels.node }} reached max volumes"
        description: "Node has {{ $value }} volumes attached"
```

## Best Practices

Always use WaitForFirstConsumer volume binding mode with storage capacity tracking. This ensures the scheduler considers storage availability during pod placement.

Set appropriate storage reservations on nodes to maintain system stability. Reserve at least 10-15% of storage for system operations and temporary files.

Monitor storage capacity trends and plan for expansion before hitting limits. Set up alerts when nodes reach 75% capacity.

Implement resource quotas at the namespace level to prevent single teams from consuming all available storage.

Regular cleanup of unused PVCs and volumes prevents capacity exhaustion from abandoned resources.

## Conclusion

CSI node allocatable resources provide essential controls for managing storage capacity across heterogeneous Kubernetes clusters. By properly configuring storage capacity tracking, setting appropriate limits, and monitoring usage, you prevent storage exhaustion and ensure fair resource distribution. These mechanisms become critical as cluster size and storage diversity increase.
