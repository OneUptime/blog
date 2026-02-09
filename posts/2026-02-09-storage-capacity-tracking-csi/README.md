# How to Configure Storage Capacity Tracking for CSI Drivers with Limited Space

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, CSI

Description: Implement CSI storage capacity tracking to prevent pod scheduling failures on nodes with insufficient storage, enabling intelligent volume placement based on available capacity.

---

Storage capacity tracking enables Kubernetes schedulers to make informed decisions about pod placement by considering available storage capacity on each node. Without this feature, the scheduler might place a pod requesting a 100GB volume on a node with only 50GB free, causing the pod to remain in pending state indefinitely.

CSI drivers that implement storage capacity tracking expose per-node or per-topology-segment capacity information through CSIStorageCapacity objects, which the scheduler consults during the filtering phase. This guide covers enabling capacity tracking for various CSI drivers, configuring topology constraints, and troubleshooting capacity-related scheduling issues.

## Understanding CSI Storage Capacity Tracking

The CSI specification includes optional capacity tracking through the GetCapacity RPC call. CSI drivers that implement this call can report available storage capacity to Kubernetes, which creates CSIStorageCapacity objects representing capacity in different topology segments.

When a pod requests a PVC with WaitForFirstConsumer binding mode, the scheduler considers these capacity objects during node selection. The scheduler filters out nodes or topology segments that lack sufficient capacity, preventing failed volume provisioning attempts and reducing pod startup latency.

Capacity tracking becomes critical in environments with heterogeneous storage backends, local volume provisioning, or limited storage pools where capacity varies significantly across nodes.

## Enabling Capacity Tracking in the Scheduler

Kubernetes 1.21 introduced storage capacity tracking as a beta feature, becoming stable in 1.24. Ensure your cluster has the required feature gate enabled (enabled by default in 1.24+).

```bash
# Check if storage capacity tracking is available
kubectl get csidriver -o yaml | grep -A 5 storageCapacity

# Verify scheduler configuration supports capacity tracking
kubectl get configmap -n kube-system kube-scheduler -o yaml

# Check for CSIStorageCapacity CRD
kubectl get crd csistoragecapacities.storage.k8s.io
kubectl api-resources | grep csistoragecapacity
```

The scheduler automatically uses capacity information when available, requiring no additional configuration in most cases.

## Implementing Capacity Tracking in CSI Drivers

CSI drivers must report capacity through the GetCapacity RPC. Here's an example implementation for a simple local storage driver.

```go
// capacity.go - Example CSI driver capacity implementation
package driver

import (
    "context"
    "golang.org/x/sys/unix"
    "github.com/container-storage-interface/spec/lib/go/csi"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

type ControllerServer struct {
    nodeID string
    storageDir string
}

func (cs *ControllerServer) GetCapacity(
    ctx context.Context,
    req *csi.GetCapacityRequest,
) (*csi.GetCapacityResponse, error) {
    // Check if requesting capacity for specific topology
    topology := req.GetAccessibleTopology()

    // If topology specified, verify it matches this node
    if topology != nil {
        if nodeID, ok := topology.Segments["topology.kubernetes.io/hostname"]; ok {
            if nodeID != cs.nodeID {
                return nil, status.Error(codes.InvalidArgument,
                    "topology does not match this node")
            }
        }
    }

    // Get filesystem statistics
    var stat unix.Statfs_t
    if err := unix.Statfs(cs.storageDir, &stat); err != nil {
        return nil, status.Errorf(codes.Internal,
            "failed to get filesystem stats: %v", err)
    }

    // Calculate available capacity
    availableCapacity := int64(stat.Bavail * uint64(stat.Bsize))

    // Reserve 10% for system overhead
    usableCapacity := int64(float64(availableCapacity) * 0.9)

    return &csi.GetCapacityResponse{
        AvailableCapacity: usableCapacity,
    }, nil
}
```

## Deploying External Provisioner with Capacity Tracking

The external-provisioner sidecar creates CSIStorageCapacity objects based on CSI driver capacity reports.

```yaml
# csi-controller-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: csi-controller
  namespace: csi-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: csi-controller
  template:
    metadata:
      labels:
        app: csi-controller
    spec:
      serviceAccountName: csi-controller-sa
      containers:
      - name: csi-provisioner
        image: registry.k8s.io/sig-storage/csi-provisioner:v3.6.0
        args:
        - --csi-address=/csi/csi.sock
        - --feature-gates=Topology=true
        - --enable-capacity
        - --capacity-ownerref-level=2
        - --capacity-poll-interval=5m
        - --capacity-for-immediate-binding=false
        volumeMounts:
        - name: socket-dir
          mountPath: /csi
      - name: csi-driver
        image: my-csi-driver:latest
        args:
        - --endpoint=unix:///csi/csi.sock
        - --node-id=$(NODE_ID)
        env:
        - name: NODE_ID
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        volumeMounts:
        - name: socket-dir
          mountPath: /csi
      volumes:
      - name: socket-dir
        emptyDir: {}
```

Key provisioner arguments:
- `--enable-capacity`: Enables capacity tracking
- `--capacity-ownerref-level=2`: Sets owner reference depth for garbage collection
- `--capacity-poll-interval=5m`: How often to poll driver for capacity updates
- `--capacity-for-immediate-binding=false`: Only track capacity for WaitForFirstConsumer

## Creating RBAC for Capacity Tracking

The external-provisioner requires permissions to create and update CSIStorageCapacity objects.

```yaml
# csi-controller-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: csi-controller-sa
  namespace: csi-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: csi-controller-role
rules:
- apiGroups: [""]
  resources: ["persistentvolumes"]
  verbs: ["get", "list", "watch", "create", "delete"]
- apiGroups: [""]
  resources: ["persistentvolumeclaims"]
  verbs: ["get", "list", "watch", "update"]
- apiGroups: ["storage.k8s.io"]
  resources: ["storageclasses"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["storage.k8s.io"]
  resources: ["csinodes"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["storage.k8s.io"]
  resources: ["csistoragecapacities"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list", "watch"]
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
  name: csi-controller-sa
  namespace: csi-system
```

Apply the RBAC configuration before deploying the controller.

```bash
kubectl apply -f csi-controller-rbac.yaml
kubectl apply -f csi-controller-deployment.yaml
```

## Configuring CSI Driver with Capacity Support

Register your CSI driver with storage capacity enabled.

```yaml
# csidriver.yaml
apiVersion: storage.k8s.io/v1
kind: CSIDriver
metadata:
  name: local.csi.example.com
spec:
  attachRequired: false
  podInfoOnMount: true
  volumeLifecycleModes:
  - Persistent
  - Ephemeral
  storageCapacity: true
  fsGroupPolicy: File
```

The `storageCapacity: true` field indicates this driver reports capacity information.

```bash
kubectl apply -f csidriver.yaml
kubectl get csidriver local.csi.example.com -o yaml
```

## Viewing CSI Storage Capacity Objects

Once capacity tracking is active, CSIStorageCapacity objects appear in your cluster.

```bash
# List all capacity objects
kubectl get csistoragecapacities -A

# View detailed capacity for specific driver
kubectl get csistoragecapacities -A -o json | \
  jq '.items[] | select(.spec.storageClassName=="local-storage") | {
    name: .metadata.name,
    node: .nodeTopology.matchLabels["kubernetes.io/hostname"],
    capacity: .capacity
  }'

# Watch capacity changes
kubectl get csistoragecapacities -A -w
```

Example capacity object:

```yaml
apiVersion: storage.k8s.io/v1
kind: CSIStorageCapacity
metadata:
  name: local.csi.example.com-worker01-abc123
  namespace: csi-system
  ownerReferences:
  - apiVersion: storage.k8s.io/v1
    kind: StorageClass
    name: local-storage
storageClassName: local-storage
nodeTopology:
  matchLabels:
    topology.kubernetes.io/hostname: worker01
capacity: "500Gi"
maximumVolumeSize: "100Gi"
```

## Creating Storage Classes with Capacity-Aware Binding

Use WaitForFirstConsumer binding mode to leverage capacity tracking.

```yaml
# local-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-storage
provisioner: local.csi.example.com
parameters:
  type: "local"
  fsType: "ext4"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete
```

The WaitForFirstConsumer mode delays volume provisioning until a pod is scheduled, allowing the scheduler to consider both compute and storage resources.

```bash
kubectl apply -f local-storage-class.yaml
```

## Testing Capacity-Aware Scheduling

Create PVCs that exceed capacity on some nodes to verify the scheduler respects capacity constraints.

```yaml
# large-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: large-volume
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-storage
  resources:
    requests:
      storage: 80Gi
---
# test-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: capacity-test
spec:
  containers:
  - name: app
    image: nginx:1.25
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: large-volume
```

Apply and observe scheduling behavior.

```bash
kubectl apply -f large-pvc.yaml
kubectl get pvc large-volume

# PVC remains Pending until pod is created
kubectl apply -f test-pod.yaml

# Watch pod events for scheduling decisions
kubectl describe pod capacity-test | grep -A 10 Events

# Verify pod was scheduled to a node with sufficient capacity
kubectl get pod capacity-test -o wide

# Check which capacity object was considered
NODE=$(kubectl get pod capacity-test -o jsonpath='{.spec.nodeName}')
kubectl get csistoragecapacities -A -o json | \
  jq -r --arg node "$NODE" '.items[] |
    select(.nodeTopology.matchLabels["topology.kubernetes.io/hostname"] == $node) |
    {name: .metadata.name, capacity: .capacity}'
```

## Troubleshooting Capacity Issues

When pods fail to schedule due to insufficient capacity, investigate capacity reports.

```bash
# Check pod scheduling events
kubectl describe pod <pod-name> | grep "didn't have enough capacity"

# List capacity across all nodes
kubectl get csistoragecapacities -A -o custom-columns=\
NODE:.nodeTopology.matchLabels."topology\.kubernetes\.io/hostname",\
CLASS:.storageClassName,\
CAPACITY:.capacity

# Verify CSI driver is reporting capacity
kubectl logs -n csi-system deployment/csi-controller -c csi-provisioner | \
  grep -i capacity

# Check if driver supports GetCapacity
kubectl logs -n csi-system deployment/csi-controller -c csi-driver | \
  grep -i GetCapacity
```

Common issues include:
- Driver doesn't implement GetCapacity RPC
- External provisioner not configured with `--enable-capacity`
- RBAC permissions missing for CSIStorageCapacity objects
- Capacity poll interval too long for rapidly changing capacity
- Immediate binding mode used instead of WaitForFirstConsumer

## Implementing Capacity Alerts

Monitor capacity to prevent scheduling failures before they occur.

```yaml
# prometheus-alerts.yaml
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
    - alert: StorageCapacityLow
      expr: |
        (
          max by (node, storage_class) (
            kubelet_volume_stats_available_bytes
          ) / max by (node, storage_class) (
            kubelet_volume_stats_capacity_bytes
          )
        ) < 0.15
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Storage capacity low on {{ $labels.node }}"
        description: "Storage capacity for {{ $labels.storage_class }} on {{ $labels.node }} is below 15%"

    - alert: StorageCapacityCritical
      expr: |
        (
          max by (node, storage_class) (
            kubelet_volume_stats_available_bytes
          ) / max by (node, storage_class) (
            kubelet_volume_stats_capacity_bytes
          )
        ) < 0.05
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Storage capacity critical on {{ $labels.node }}"
        description: "Storage capacity for {{ $labels.storage_class }} on {{ $labels.node }} is below 5%"
```

Deploy capacity monitoring dashboards that visualize available storage per node and storage class.

CSI storage capacity tracking transforms the scheduler into a storage-aware orchestrator that prevents provisioning failures through intelligent placement decisions. By implementing capacity reporting in your CSI drivers and enabling tracking in the external-provisioner, you ensure pods are scheduled only on nodes with sufficient storage resources. This capability becomes essential as clusters scale and storage resources become increasingly heterogeneous.
