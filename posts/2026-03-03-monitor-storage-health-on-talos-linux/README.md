# How to Monitor Storage Health on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Storage Monitoring, Observability, Prometheus

Description: Learn practical approaches to monitoring disk health, volume usage, and storage performance on Talos Linux clusters.

---

Storage failures can take down your entire application. A corrupted disk, a full volume, or a degraded RAID array will cause outages that are painful to recover from. On Talos Linux, monitoring storage health requires a different approach than traditional Linux because you cannot simply SSH into a node and run smartctl or df. Everything goes through the Talos API or Kubernetes-level monitoring.

This guide covers the tools and techniques you need to keep tabs on your storage in a Talos Linux environment.

## Monitoring with talosctl

The talosctl command line tool is your primary interface for node-level storage inspection. Since Talos Linux does not provide shell access, talosctl is how you check disk status, filesystem usage, and hardware health.

### Checking Disk Information

```bash
# List all disks on a node
talosctl -n 10.0.0.11 disks

# Sample output:
# DEV        MODEL              SERIAL   TYPE   UUID   WWID   MODALIAS   NAME   SIZE     BUS_PATH
# /dev/sda   VBOX HARDDISK      ...      HDD    ...    ...    ...        ...    50 GB    ...
# /dev/sdb   VBOX HARDDISK      ...      HDD    ...    ...    ...        ...    100 GB   ...
```

### Checking Filesystem Usage

```bash
# Check disk usage on a node
talosctl -n 10.0.0.11 usage /var

# Check mount points
talosctl -n 10.0.0.11 mounts

# View detailed partition information
talosctl -n 10.0.0.11 get blockdevices
```

### Checking SMART Data

If your disks support SMART (Self-Monitoring, Analysis and Reporting Technology), you can check their health through the Talos API.

```bash
# Get disk health information
talosctl -n 10.0.0.11 get hardwareinfo

# Check system logs for disk errors
talosctl -n 10.0.0.11 dmesg | grep -i "error\|fault\|fail\|scsi\|ata"
```

## Kubernetes-Level Storage Monitoring

While talosctl gives you node-level visibility, you also need to monitor storage at the Kubernetes level. This means tracking PersistentVolumes, PersistentVolumeClaims, and the CSI drivers that manage them.

### Checking PV and PVC Status

```bash
# List all PersistentVolumes and their status
kubectl get pv -o wide

# List all PVCs across namespaces
kubectl get pvc --all-namespaces

# Find PVCs that are not bound
kubectl get pvc --all-namespaces --field-selector=status.phase!=Bound
```

### Monitoring Volume Usage from Inside Pods

Kubernetes exposes volume metrics through the kubelet. You can query these with Prometheus or check them manually.

```bash
# Check filesystem usage inside a pod
kubectl exec my-pod -- df -h

# Check inode usage (often overlooked but causes failures)
kubectl exec my-pod -- df -i
```

## Setting Up Prometheus for Storage Monitoring

Prometheus is the standard monitoring tool for Kubernetes clusters. Combined with Grafana, it gives you dashboards and alerting for storage health.

### Installing the Prometheus Stack

```bash
# Install kube-prometheus-stack with Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.storageClassName=local-path \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi
```

### Key Storage Metrics to Monitor

The kubelet exposes several important metrics related to storage. Here are the ones you should track.

```yaml
# Prometheus alerting rules for storage health
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: storage-alerts
  namespace: monitoring
spec:
  groups:
  - name: storage.rules
    rules:
    # Alert when volume is more than 85% full
    - alert: VolumeAlmostFull
      expr: |
        kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes > 0.85
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Volume {{ $labels.persistentvolumeclaim }} is {{ $value | humanizePercentage }} full"

    # Alert when volume is more than 95% full
    - alert: VolumeCriticallyFull
      expr: |
        kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes > 0.95
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Volume {{ $labels.persistentvolumeclaim }} is critically full at {{ $value | humanizePercentage }}"

    # Alert on inode exhaustion
    - alert: VolumeInodesCritical
      expr: |
        kubelet_volume_stats_inodes_used / kubelet_volume_stats_inodes > 0.90
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Volume {{ $labels.persistentvolumeclaim }} inodes are {{ $value | humanizePercentage }} used"

    # Alert when a PVC is pending for too long
    - alert: PVCPendingTooLong
      expr: |
        kube_persistentvolumeclaim_status_phase{phase="Pending"} == 1
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "PVC {{ $labels.persistentvolumeclaim }} has been pending for more than 15 minutes"
```

### Useful PromQL Queries

Here are some PromQL queries you can use in Grafana dashboards to visualize storage health.

```promql
# Volume usage percentage per PVC
kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes * 100

# Available storage per PVC
kubelet_volume_stats_available_bytes

# Storage usage growth rate (bytes per hour)
rate(kubelet_volume_stats_used_bytes[1h]) * 3600

# Predicted time until volume is full
(kubelet_volume_stats_capacity_bytes - kubelet_volume_stats_used_bytes)
  / rate(kubelet_volume_stats_used_bytes[24h])
```

## Monitoring CSI Driver Health

Your CSI driver is the bridge between Kubernetes and the actual storage system. Monitoring its health is crucial.

### Checking CSI Driver Status

```bash
# List CSI drivers in the cluster
kubectl get csidrivers

# Check CSI driver pods are healthy
kubectl get pods -n kube-system -l app=csi-driver

# View CSI driver logs for errors
kubectl logs -n kube-system -l app=csi-driver --tail=100
```

### Storage Backend-Specific Monitoring

If you are running Longhorn, Rook-Ceph, or another storage solution, each has its own monitoring capabilities.

For Longhorn, the manager exposes metrics at its built-in endpoint.

```bash
# Check Longhorn volume health
kubectl -n longhorn-system get volumes.longhorn.io

# Check Longhorn node status
kubectl -n longhorn-system get nodes.longhorn.io

# View Longhorn engine status
kubectl -n longhorn-system get engines.longhorn.io
```

For Rook-Ceph, you can check the Ceph cluster health directly.

```bash
# Check Ceph cluster status through the toolbox
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status

# Check OSD status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree

# Check pool usage
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df
```

## Building a Storage Health Dashboard

A good storage monitoring dashboard should include several panels. Start with an overview that shows total cluster storage capacity, used space, and available space. Add panels for per-PVC usage with trend lines. Include alerts for volumes approaching capacity. Show CSI driver pod health and restart counts. Finally, add node-level disk information from the Talos API.

```yaml
# Example Grafana dashboard ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: storage-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  storage-health.json: |
    {
      "dashboard": {
        "title": "Storage Health",
        "panels": [
          {
            "title": "Volume Usage by PVC",
            "type": "gauge",
            "targets": [
              {
                "expr": "kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes * 100"
              }
            ]
          }
        ]
      }
    }
```

## Automating Health Checks

Beyond passive monitoring, you can create active health checks that probe your storage system periodically.

```yaml
# CronJob that tests storage write/read health
apiVersion: batch/v1
kind: CronJob
metadata:
  name: storage-health-check
  namespace: monitoring
spec:
  schedule: "*/10 * * * *"  # Every 10 minutes
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: health-check
            image: alpine:latest
            command:
            - /bin/sh
            - -c
            - |
              # Write a test file
              echo "health-check-$(date +%s)" > /data/health-test
              # Read it back
              cat /data/health-test
              # Clean up
              rm /data/health-test
              echo "Storage health check passed"
            volumeMounts:
            - name: test-volume
              mountPath: /data
          restartPolicy: OnFailure
          volumes:
          - name: test-volume
            persistentVolumeClaim:
              claimName: health-check-pvc
```

## Conclusion

Storage monitoring on Talos Linux combines node-level inspection through talosctl with Kubernetes-native observability through Prometheus and your storage backend's built-in tools. The key is to monitor at every layer: the physical disks, the CSI driver, the PersistentVolumes, and the applications consuming them. Set up alerts before volumes fill up, track usage trends so you can plan capacity, and run active health checks to catch issues before they become outages. With the right monitoring in place, storage problems become predictable events you can address proactively rather than emergency incidents.
