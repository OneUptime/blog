# How to Monitor CSI Driver Health Using Kubernetes Events and Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Monitoring, Storage

Description: Learn how to effectively monitor Container Storage Interface driver health in Kubernetes using events, metrics, and logging to ensure reliable persistent storage.

---

Container Storage Interface (CSI) drivers bridge the gap between Kubernetes and external storage systems. When CSI drivers fail or perform poorly, your applications lose access to persistent data. Monitoring CSI driver health proactively catches issues before they cause outages.

## Why CSI Driver Monitoring Matters

CSI drivers run as pods in your cluster and handle critical operations like volume provisioning, attachment, mounting, and snapshots. A failing CSI driver can prevent new pods from starting, cause existing pods to lose storage access, or corrupt data during volume operations.

Unlike application workloads, CSI driver issues often manifest indirectly. A pod stuck in ContainerCreating state might actually indicate a CSI driver problem, not an application issue. Effective monitoring helps you quickly identify the root cause.

## Understanding CSI Driver Architecture

CSI drivers typically deploy three main components:

The controller plugin runs as a Deployment or StatefulSet and handles volume lifecycle operations like creation, deletion, snapshots, and cloning. The node plugin runs as a DaemonSet on every node and handles volume attachment, mounting, and unmounting. The CSI driver registrar sidecar registers the driver with the kubelet on each node.

Each component exposes different health signals and metrics that you need to monitor.

## Monitoring Using Kubernetes Events

Kubernetes events provide immediate visibility into CSI driver operations:

```bash
# Watch all CSI-related events in real-time
kubectl get events --all-namespaces --watch | grep -i csi

# Check events for specific PVC provisioning
kubectl get events --field-selector involvedObject.kind=PersistentVolumeClaim,involvedObject.name=my-pvc

# View events from CSI controller pods
kubectl get events -n kube-system --field-selector involvedObject.kind=Pod | grep csi-controller

# Check node plugin events
kubectl get events -n kube-system --field-selector involvedObject.kind=Pod | grep csi-node
```

Create an event monitoring script to alert on CSI failures:

```bash
#!/bin/bash
# csi-event-monitor.sh - Monitor CSI driver events

NAMESPACE="kube-system"
CSI_KEYWORDS="csi|volume|attach|mount|provision"

kubectl get events -n $NAMESPACE --watch -o json | jq -r --unbuffered '
  select(.reason | test("Failed|Error|Warning"; "i")) |
  select(.message | test("'$CSI_KEYWORDS'"; "i")) |
  "\(.lastTimestamp) [\(.type)] \(.involvedObject.kind)/\(.involvedObject.name): \(.message)"
'
```

This script streams events related to CSI operations and filters for failures, making it easy to spot issues.

## Exposing CSI Metrics

Most CSI drivers expose Prometheus metrics on a metrics endpoint. Check your driver's documentation for the specific port:

```bash
# Port-forward to CSI controller metrics endpoint
kubectl port-forward -n kube-system deployment/csi-controller 9090:9090

# Query metrics
curl http://localhost:9090/metrics | grep csi
```

Common CSI metrics include:

```
# Volume operation duration
csi_sidecar_operations_seconds_bucket
csi_sidecar_operations_seconds_sum
csi_sidecar_operations_seconds_count

# Volume operation errors
csi_sidecar_operations_errors_total

# Volume attachment operations
storage_operation_duration_seconds_bucket
storage_operation_duration_seconds_sum
storage_operation_duration_seconds_count
```

## Creating a ServiceMonitor for Prometheus

Configure Prometheus to scrape CSI driver metrics automatically:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: csi-controller-metrics
  namespace: kube-system
  labels:
    app: csi-controller
spec:
  ports:
  - name: metrics
    port: 9090
    targetPort: 9090
  selector:
    app: csi-controller
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: csi-controller
  namespace: kube-system
  labels:
    app: csi-controller
spec:
  selector:
    matchLabels:
      app: csi-controller
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
---
apiVersion: v1
kind: Service
metadata:
  name: csi-node-metrics
  namespace: kube-system
  labels:
    app: csi-node
spec:
  ports:
  - name: metrics
    port: 9090
    targetPort: 9090
  selector:
    app: csi-node
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: csi-node
  namespace: kube-system
  labels:
    app: csi-node
spec:
  selector:
    matchLabels:
      app: csi-node
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

## Essential Prometheus Queries

Create alerts based on these PromQL queries:

```promql
# High volume operation error rate
rate(csi_sidecar_operations_errors_total[5m]) > 0.1

# Slow volume operations (p95 > 30 seconds)
histogram_quantile(0.95,
  rate(csi_sidecar_operations_seconds_bucket[5m])
) > 30

# CSI controller pod restarts
rate(kube_pod_container_status_restarts_total{
  pod=~"csi-controller.*",
  namespace="kube-system"
}[15m]) > 0

# CSI node plugin not ready
kube_daemonset_status_number_unavailable{
  daemonset=~"csi-node.*",
  namespace="kube-system"
} > 0

# Volume attach/detach failures
rate(storage_operation_errors_total{
  operation_name=~"volume_attach|volume_detach"
}[5m]) > 0
```

## Setting Up Alerting Rules

Configure Prometheus AlertManager rules for CSI health:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: csi-driver-alerts
  namespace: kube-system
spec:
  groups:
  - name: csi-driver
    interval: 30s
    rules:
    - alert: CSIOperationFailureHigh
      expr: |
        rate(csi_sidecar_operations_errors_total[5m]) > 0.1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High CSI operation failure rate"
        description: "CSI driver {{ $labels.driver_name }} has {{ $value }} operations failing per second"

    - alert: CSIOperationSlow
      expr: |
        histogram_quantile(0.95,
          rate(csi_sidecar_operations_seconds_bucket[5m])
        ) > 30
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "Slow CSI operations detected"
        description: "95th percentile of CSI operations for {{ $labels.driver_name }} is {{ $value }}s"

    - alert: CSIControllerDown
      expr: |
        kube_deployment_status_replicas_available{
          deployment=~"csi-controller.*",
          namespace="kube-system"
        } == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "CSI controller unavailable"
        description: "CSI controller {{ $labels.deployment }} has no available replicas"

    - alert: CSINodePluginUnhealthy
      expr: |
        kube_daemonset_status_number_unavailable{
          daemonset=~"csi-node.*",
          namespace="kube-system"
        } > 0
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "CSI node plugins unavailable"
        description: "{{ $value }} CSI node plugin pods are unavailable"
```

## Monitoring CSI Driver Logs

CSI driver logs contain detailed information about failures:

```bash
# Stream controller logs
kubectl logs -n kube-system deployment/csi-controller -f --all-containers=true

# Search for errors in node plugin
kubectl logs -n kube-system daemonset/csi-node --all-containers=true | grep -i error

# Get logs from specific node's CSI plugin
NODE_NAME="worker-node-1"
POD=$(kubectl get pod -n kube-system -l app=csi-node --field-selector spec.nodeName=$NODE_NAME -o name)
kubectl logs -n kube-system $POD --all-containers=true
```

Set up log aggregation with structured queries:

```bash
# Using Loki/LogQL
{namespace="kube-system", app=~"csi.*"} |= "error" | json | level="error"

# Using ElasticSearch/Kibana
kubernetes.namespace: "kube-system" AND kubernetes.labels.app: csi* AND level: error
```

## Health Check Endpoints

Many CSI drivers expose health endpoints you can probe:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: csi-health-monitor
spec:
  containers:
  - name: monitor
    image: curlimages/curl:latest
    command:
    - /bin/sh
    - -c
    - |
      while true; do
        # Check controller health
        curl -sf http://csi-controller.kube-system.svc:9808/healthz || echo "Controller unhealthy"

        # Check node plugin health on local node
        curl -sf http://localhost:9809/healthz || echo "Node plugin unhealthy"

        sleep 30
      done
```

## Checking Volume Attachment States

Monitor volume attachment health across your cluster:

```bash
# List all volume attachments
kubectl get volumeattachments

# Check for stuck attachments
kubectl get volumeattachments -o json | jq -r '
  .items[] |
  select(.status.attached == false) |
  "\(.metadata.name): Node=\(.spec.nodeName), PV=\(.spec.source.persistentVolumeName)"
'

# Volume attachments older than 5 minutes that are not attached
kubectl get volumeattachments -o json | jq -r --arg time "$(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%SZ)" '
  .items[] |
  select(.status.attached == false and .metadata.creationTimestamp < $time) |
  "\(.metadata.creationTimestamp) \(.metadata.name)"
'
```

## Creating a Comprehensive Dashboard

Build a Grafana dashboard with these panels:

```json
{
  "dashboard": {
    "title": "CSI Driver Health",
    "panels": [
      {
        "title": "Operation Success Rate",
        "targets": [
          {
            "expr": "sum(rate(csi_sidecar_operations_seconds_count[5m])) by (method_name) - sum(rate(csi_sidecar_operations_errors_total[5m])) by (method_name)"
          }
        ]
      },
      {
        "title": "Operation Latency P95",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(csi_sidecar_operations_seconds_bucket[5m])) by (method_name, le))"
          }
        ]
      },
      {
        "title": "Volume Attachments",
        "targets": [
          {
            "expr": "count(kube_volumeattachment_info)"
          }
        ]
      },
      {
        "title": "CSI Pod Status",
        "targets": [
          {
            "expr": "kube_pod_status_phase{namespace='kube-system', pod=~'csi.*'}"
          }
        ]
      }
    ]
  }
}
```

## Automated Health Testing

Create a periodic health test that exercises CSI driver functionality:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: csi-health-test
  namespace: kube-system
spec:
  schedule: "*/30 * * * *"  # Every 30 minutes
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: csi-health-tester
          containers:
          - name: tester
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              # Create test PVC
              cat <<EOF | kubectl apply -f -
              apiVersion: v1
              kind: PersistentVolumeClaim
              metadata:
                name: csi-health-test
                namespace: default
              spec:
                accessModes: [ReadWriteOnce]
                resources:
                  requests:
                    storage: 1Gi
                storageClassName: csi-driver
              EOF

              # Wait for PVC to be bound
              kubectl wait --for=jsonpath='{.status.phase}'=Bound pvc/csi-health-test -n default --timeout=120s

              # Create test pod
              kubectl run csi-test-pod --image=busybox --restart=Never \
                --overrides='{"spec":{"volumes":[{"name":"test","persistentVolumeClaim":{"claimName":"csi-health-test"}}],"containers":[{"name":"busybox","image":"busybox","command":["sh","-c","echo test > /data/health && sleep 10"],"volumeMounts":[{"name":"test","mountPath":"/data"}]}]}}'

              # Wait for pod completion
              kubectl wait --for=condition=Ready pod/csi-test-pod --timeout=120s

              # Cleanup
              kubectl delete pod csi-test-pod
              kubectl delete pvc csi-health-test -n default

              echo "CSI health test completed successfully"
          restartPolicy: OnFailure
```

## Best Practices

Monitor both controller and node plugin components separately. They have different failure modes and impact different operations.

Set up alerts with appropriate thresholds based on your baseline metrics. Collect data for at least a week before setting alert thresholds to understand normal behavior.

Correlate CSI metrics with application metrics. A spike in application errors might correlate with CSI operation latency.

Keep CSI driver logs for at least 7 days. Storage issues often require historical log analysis to understand the sequence of events leading to failure.

## Conclusion

Effective CSI driver monitoring combines events, metrics, logs, and proactive health checks. By implementing comprehensive monitoring, you detect storage issues early and maintain reliable persistent storage for your Kubernetes workloads. Regular testing and well-configured alerts ensure you stay ahead of potential CSI driver problems.
