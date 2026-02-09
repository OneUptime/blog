# How to Configure CSI Snapshot Controller for Snapshot Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CSI, Storage, Controller

Description: Learn how to deploy and configure the CSI snapshot controller in Kubernetes for managing volume snapshots, including installation, configuration, and troubleshooting of snapshot operations.

---

The CSI snapshot controller is a critical component that watches VolumeSnapshot resources and coordinates with CSI drivers to create, delete, and manage snapshots. Proper configuration ensures reliable snapshot operations.

## Understanding the CSI Snapshot Controller

The snapshot controller consists of two main components:

1. **Snapshot Controller** - Watches VolumeSnapshot and VolumeSnapshotContent resources
2. **CSI Snapshotter Sidecar** - Communicates with CSI drivers to perform snapshot operations

The controller translates Kubernetes snapshot requests into CSI driver operations.

## Installing CSI Snapshot CRDs

First, install the snapshot Custom Resource Definitions:

```bash
# Install snapshot CRDs (v1 API)
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml

# Verify CRDs are installed
kubectl get crd | grep snapshot
```

## Deploying the Snapshot Controller

Deploy the snapshot controller in your cluster:

```bash
# Create namespace
kubectl create namespace snapshot-controller

# Install RBAC
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/deploy/kubernetes/snapshot-controller/rbac-snapshot-controller.yaml

# Install snapshot controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/deploy/kubernetes/snapshot-controller/setup-snapshot-controller.yaml

# Verify deployment
kubectl get deployment snapshot-controller -n kube-system
kubectl get pods -n kube-system -l app=snapshot-controller
```

## Custom Snapshot Controller Configuration

Configure the controller with custom settings:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: snapshot-controller
  namespace: kube-system
spec:
  replicas: 2  # For high availability
  selector:
    matchLabels:
      app: snapshot-controller
  template:
    metadata:
      labels:
        app: snapshot-controller
    spec:
      serviceAccountName: snapshot-controller
      containers:
      - name: snapshot-controller
        image: registry.k8s.io/sig-storage/snapshot-controller:v6.3.0
        args:
        - --v=5  # Logging level
        - --leader-election=true  # Enable leader election for HA
        - --leader-election-namespace=kube-system
        - --timeout=300s  # Snapshot operation timeout
        env:
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /readyz
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
```

## CSI Snapshotter Sidecar Configuration

Configure the snapshotter sidecar for your CSI driver:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: csi-snapshotter
  namespace: kube-system
spec:
  serviceName: csi-snapshotter
  replicas: 1
  selector:
    matchLabels:
      app: csi-snapshotter
  template:
    metadata:
      labels:
        app: csi-snapshotter
    spec:
      serviceAccountName: csi-snapshotter
      containers:
      # CSI Driver container
      - name: csi-driver
        image: your-csi-driver:latest
        args:
        - --endpoint=/csi/csi.sock
        - --nodeid=$(NODE_ID)
        volumeMounts:
        - name: socket-dir
          mountPath: /csi

      # Snapshotter sidecar
      - name: csi-snapshotter
        image: registry.k8s.io/sig-storage/csi-snapshotter:v6.3.0
        args:
        - --csi-address=/csi/csi.sock
        - --leader-election=true
        - --leader-election-namespace=kube-system
        - --timeout=300s
        - --snapshot-name-prefix=snapshot
        - --snapshot-name-uuid-length=8
        - --extra-create-metadata=true
        volumeMounts:
        - name: socket-dir
          mountPath: /csi
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 200m
            memory: 256Mi

      volumes:
      - name: socket-dir
        emptyDir: {}
```

## Monitoring Snapshot Controller

Create a monitoring dashboard:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: snapshot-controller-metrics
  namespace: kube-system
data:
  prometheus-rules.yaml: |
    groups:
    - name: snapshot-controller
      rules:
      - alert: SnapshotControllerDown
        expr: up{job="snapshot-controller"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Snapshot controller is down"

      - alert: SnapshotCreationFailing
        expr: rate(snapshot_controller_create_snapshot_errors_total[5m]) > 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High rate of snapshot creation failures"

      - alert: SnapshotDeletionFailing
        expr: rate(snapshot_controller_delete_snapshot_errors_total[5m]) > 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High rate of snapshot deletion failures"
```

Check controller logs:

```bash
# Get controller pods
kubectl get pods -n kube-system -l app=snapshot-controller

# View logs
kubectl logs -n kube-system -l app=snapshot-controller -f

# Check for errors
kubectl logs -n kube-system -l app=snapshot-controller | grep -i error

# View snapshotter sidecar logs
kubectl logs -n kube-system <csi-driver-pod> -c csi-snapshotter
```

## Troubleshooting Common Issues

Check snapshot controller status:

```bash
#!/bin/bash
# check-snapshot-controller.sh

echo "=== Snapshot Controller Status ==="

# Check CRDs
echo "Checking CRDs..."
kubectl get crd | grep snapshot || echo "WARNING: Snapshot CRDs not found"

# Check controller deployment
echo
echo "Checking controller deployment..."
kubectl get deployment snapshot-controller -n kube-system || echo "WARNING: Controller not deployed"

# Check controller pods
echo
echo "Checking controller pods..."
kubectl get pods -n kube-system -l app=snapshot-controller

# Check controller logs for errors
echo
echo "Recent errors in controller logs..."
kubectl logs -n kube-system -l app=snapshot-controller --tail=50 | grep -i error || echo "No errors found"

# Check snapshot operations
echo
echo "Checking snapshot resources..."
echo "VolumeSnapshots:"
kubectl get volumesnapshot --all-namespaces

echo
echo "VolumeSnapshotContents:"
kubectl get volumesnapshotcontent

echo
echo "VolumeSnapshotClasses:"
kubectl get volumesnapshotclass
```

## Testing Snapshot Controller

Verify the controller is working:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: test-snapshot-controller
spec:
  template:
    spec:
      serviceAccountName: snapshot-tester
      restartPolicy: Never
      containers:
      - name: tester
        image: bitnami/kubectl:latest
        command:
        - /bin/bash
        - -c
        - |
          set -e

          echo "=== Testing Snapshot Controller ==="

          # Create test PVC
          kubectl apply -f - <<EOF
          apiVersion: v1
          kind: PersistentVolumeClaim
          metadata:
            name: test-pvc
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 1Gi
            storageClassName: standard
          EOF

          kubectl wait --for=jsonpath='{.status.phase}'=Bound pvc/test-pvc --timeout=60s

          # Create snapshot
          kubectl apply -f - <<EOF
          apiVersion: snapshot.storage.k8s.io/v1
          kind: VolumeSnapshot
          metadata:
            name: test-snapshot
          spec:
            volumeSnapshotClassName: csi-snapshot-class
            source:
              persistentVolumeClaimName: test-pvc
          EOF

          # Wait for snapshot to be ready
          for i in {1..60}; do
            READY=$(kubectl get volumesnapshot test-snapshot \
              -o jsonpath='{.status.readyToUse}' 2>/dev/null || echo "false")

            if [ "$READY" = "true" ]; then
              echo "✓ Snapshot controller is working"
              kubectl delete volumesnapshot test-snapshot
              kubectl delete pvc test-pvc
              exit 0
            fi

            sleep 2
          done

          echo "✗ Snapshot controller test failed"
          kubectl describe volumesnapshot test-snapshot
          exit 1
```

## Best Practices

1. **Run multiple controller replicas** for high availability
2. **Enable leader election** to prevent conflicts
3. **Monitor controller metrics** for performance issues
4. **Set appropriate timeouts** for snapshot operations
5. **Keep controller updated** to latest stable version
6. **Check CSI driver compatibility** with controller version
7. **Review logs regularly** for warnings and errors
8. **Test snapshot operations** after controller changes

The CSI snapshot controller is essential for managing volume snapshots in Kubernetes. Proper deployment and configuration ensure reliable snapshot operations across your cluster.
