# How to Deploy Node Monitoring Agents with DaemonSets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSets, Monitoring, Node Metrics, Observability

Description: Learn how to deploy node monitoring agents using Kubernetes DaemonSets to collect system metrics, performance data, and health information from every node in your cluster.

---

Monitoring individual nodes in a Kubernetes cluster requires agents running on each machine to collect system-level metrics. DaemonSets ensure monitoring agents deploy automatically on every node, including nodes added through cluster autoscaling. This guide demonstrates deploying various node monitoring solutions using DaemonSets.

## Understanding DaemonSet for Node Monitoring

DaemonSets guarantee exactly one pod runs on each node. This pattern fits perfectly for node-level monitoring because you need one agent per machine to collect CPU, memory, disk, and network metrics. When new nodes join the cluster, Kubernetes automatically schedules monitoring pods on them.

Node monitoring agents typically require elevated permissions to read system metrics. They often mount host directories to access kernel interfaces, system files, and process information. DaemonSets handle these requirements through pod security contexts and volume mounts.

## Deploying Prometheus Node Exporter

Prometheus Node Exporter collects hardware and OS metrics. Deploy it as a DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
  labels:
    app: node-exporter
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true
      hostPID: true
      containers:
      - name: node-exporter
        image: prom/node-exporter:v1.7.0
        args:
        - --path.procfs=/host/proc
        - --path.sysfs=/host/sys
        - --path.rootfs=/host/root
        - --collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)
        ports:
        - containerPort: 9100
          protocol: TCP
          name: metrics
        resources:
          limits:
            cpu: 250m
            memory: 180Mi
          requests:
            cpu: 100m
            memory: 128Mi
        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: sys
          mountPath: /host/sys
          readOnly: true
        - name: root
          mountPath: /host/root
          mountPropagation: HostToContainer
          readOnly: true
      volumes:
      - name: proc
        hostPath:
          path: /proc
      - name: sys
        hostPath:
          path: /sys
      - name: root
        hostPath:
          path: /
      tolerations:
      - effect: NoSchedule
        operator: Exists
      - effect: NoExecute
        operator: Exists
---
apiVersion: v1
kind: Service
metadata:
  name: node-exporter
  namespace: monitoring
  labels:
    app: node-exporter
spec:
  type: ClusterIP
  clusterIP: None
  ports:
  - port: 9100
    targetPort: 9100
    protocol: TCP
    name: metrics
  selector:
    app: node-exporter
```

The `hostNetwork: true` allows the exporter to see host-level network metrics. The `hostPID: true` enables process monitoring. Volume mounts provide access to proc, sys, and root filesystems.

## Creating ServiceMonitor for Prometheus

Configure Prometheus to scrape node exporter metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: node-exporter
  namespace: monitoring
  labels:
    app: node-exporter
spec:
  selector:
    matchLabels:
      app: node-exporter
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

## Deploying cAdvisor for Container Metrics

cAdvisor provides container-level resource usage and performance metrics:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cadvisor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      name: cadvisor
  template:
    metadata:
      labels:
        name: cadvisor
    spec:
      hostNetwork: true
      containers:
      - name: cadvisor
        image: gcr.io/cadvisor/cadvisor:v0.47.0
        ports:
        - containerPort: 8080
          name: http
          protocol: TCP
        volumeMounts:
        - name: rootfs
          mountPath: /rootfs
          readOnly: true
        - name: var-run
          mountPath: /var/run
          readOnly: false
        - name: sys
          mountPath: /sys
          readOnly: true
        - name: docker
          mountPath: /var/lib/docker
          readOnly: true
        - name: disk
          mountPath: /dev/disk
          readOnly: true
        args:
        - --housekeeping_interval=10s
        - --max_housekeeping_interval=15s
        - --event_storage_event_limit=default=0
        - --event_storage_age_limit=default=0
        - --disable_metrics=percpu,sched,tcp,udp,disk,diskIO,accelerator,hugetlb,referenced_memory,cpu_topology,resctrl
        - --docker_only
        resources:
          requests:
            memory: 200Mi
            cpu: 150m
          limits:
            memory: 400Mi
            cpu: 300m
        securityContext:
          privileged: true
      volumes:
      - name: rootfs
        hostPath:
          path: /
      - name: var-run
        hostPath:
          path: /var/run
      - name: sys
        hostPath:
          path: /sys
      - name: docker
        hostPath:
          path: /var/lib/docker
      - name: disk
        hostPath:
          path: /dev/disk
      tolerations:
      - effect: NoSchedule
        operator: Exists
```

## Deploying Datadog Agent

For comprehensive monitoring with Datadog:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: datadog-agent
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: datadog-agent
  template:
    metadata:
      labels:
        app: datadog-agent
      name: datadog-agent
    spec:
      serviceAccountName: datadog-agent
      containers:
      - name: datadog-agent
        image: gcr.io/datadoghq/agent:7
        env:
        - name: DD_API_KEY
          valueFrom:
            secretKeyRef:
              name: datadog-secret
              key: api-key
        - name: DD_SITE
          value: "datadoghq.com"
        - name: DD_KUBERNETES_KUBELET_HOST
          valueFrom:
            fieldRef:
              fieldPath: status.hostIP
        - name: DD_COLLECT_KUBERNETES_EVENTS
          value: "true"
        - name: DD_LEADER_ELECTION
          value: "true"
        - name: DD_APM_ENABLED
          value: "true"
        - name: DD_APM_NON_LOCAL_TRAFFIC
          value: "true"
        - name: DD_LOGS_ENABLED
          value: "true"
        - name: DD_LOGS_CONFIG_CONTAINER_COLLECT_ALL
          value: "true"
        - name: DD_CONTAINER_EXCLUDE
          value: "name:datadog-agent"
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: dockersocket
          mountPath: /var/run/docker.sock
        - name: procdir
          mountPath: /host/proc
          readOnly: true
        - name: cgroups
          mountPath: /host/sys/fs/cgroup
          readOnly: true
        - name: pointerdir
          mountPath: /opt/datadog-agent/run
        livenessProbe:
          httpGet:
            path: /health
            port: 5555
          initialDelaySeconds: 15
          periodSeconds: 15
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 5555
          initialDelaySeconds: 15
          periodSeconds: 15
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
      volumes:
      - name: dockersocket
        hostPath:
          path: /var/run/docker.sock
      - name: procdir
        hostPath:
          path: /proc
      - name: cgroups
        hostPath:
          path: /sys/fs/cgroup
      - name: pointerdir
        hostPath:
          path: /opt/datadog-agent/run
      tolerations:
      - effect: NoSchedule
        operator: Exists
      - effect: NoExecute
        operator: Exists
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: datadog-agent
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: datadog-agent
rules:
- apiGroups: [""]
  resources:
  - nodes
  - nodes/metrics
  - nodes/stats
  - nodes/proxy
  - services
  - endpoints
  - pods
  - events
  - configmaps
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources:
  - deployments
  - replicasets
  - daemonsets
  - statefulsets
  verbs: ["get", "list", "watch"]
- nonResourceURLs:
  - /metrics
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: datadog-agent
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: datadog-agent
subjects:
- kind: ServiceAccount
  name: datadog-agent
  namespace: monitoring
```

## Deploying New Relic Infrastructure Agent

For New Relic monitoring:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: newrelic-infra
  namespace: monitoring
  labels:
    app: newrelic-infra
spec:
  selector:
    matchLabels:
      name: newrelic-infra
  updateStrategy:
    type: RollingUpdate
  template:
    metadata:
      labels:
        name: newrelic-infra
    spec:
      serviceAccountName: newrelic-infra
      hostNetwork: true
      hostPID: true
      hostIPC: true
      containers:
      - name: newrelic-infra
        image: newrelic/infrastructure-k8s:3.0.0
        securityContext:
          privileged: true
        env:
        - name: NRIA_LICENSE_KEY
          valueFrom:
            secretKeyRef:
              name: newrelic-secret
              key: license-key
        - name: CLUSTER_NAME
          value: "production-cluster"
        - name: NRIA_DISPLAY_NAME
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: spec.nodeName
        - name: NRI_KUBERNETES_CLUSTER_NAME
          value: "production-cluster"
        - name: NRIA_PASSTHROUGH_ENVIRONMENT
          value: "KUBERNETES_SERVICE_HOST,KUBERNETES_SERVICE_PORT,CLUSTER_NAME,CADVISOR_PORT,NRI_KUBERNETES_CLUSTER_NAME,KUBE_STATE_METRICS_URL"
        volumeMounts:
        - name: host-volume
          mountPath: /host
          readOnly: true
        - name: host-docker-socket
          mountPath: /var/run/docker.sock
        - name: host-log
          mountPath: /var/log
          readOnly: true
        - name: host-cache
          mountPath: /var/cache
        resources:
          limits:
            memory: 300Mi
          requests:
            cpu: 100m
            memory: 150Mi
      volumes:
      - name: host-volume
        hostPath:
          path: /
      - name: host-docker-socket
        hostPath:
          path: /var/run/docker.sock
      - name: host-log
        hostPath:
          path: /var/log
      - name: host-cache
        hostPath:
          path: /var/cache
      tolerations:
      - effect: NoSchedule
        operator: Exists
      - effect: NoExecute
        operator: Exists
```

## Implementing Custom Monitoring Agent

Create your own monitoring agent:

```python
# monitor.py
import psutil
import socket
import time
import json
from prometheus_client import start_http_server, Gauge

# Define metrics
cpu_usage = Gauge('node_cpu_usage_percent', 'CPU usage percentage')
memory_usage = Gauge('node_memory_usage_percent', 'Memory usage percentage')
disk_usage = Gauge('node_disk_usage_percent', 'Disk usage percentage')
network_bytes_sent = Gauge('node_network_bytes_sent_total', 'Total bytes sent')
network_bytes_recv = Gauge('node_network_bytes_recv_total', 'Total bytes received')

def collect_metrics():
    """Collect system metrics"""
    # CPU metrics
    cpu_percent = psutil.cpu_percent(interval=1)
    cpu_usage.set(cpu_percent)

    # Memory metrics
    memory = psutil.virtual_memory()
    memory_usage.set(memory.percent)

    # Disk metrics
    disk = psutil.disk_usage('/')
    disk_usage.set(disk.percent)

    # Network metrics
    net_io = psutil.net_io_counters()
    network_bytes_sent.set(net_io.bytes_sent)
    network_bytes_recv.set(net_io.bytes_recv)

if __name__ == '__main__':
    # Start Prometheus metrics server
    start_http_server(9090)
    print("Metrics server started on port 9090")

    # Collect metrics every 10 seconds
    while True:
        collect_metrics()
        time.sleep(10)
```

Deploy the custom agent:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: custom-node-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: custom-node-monitor
  template:
    metadata:
      labels:
        app: custom-node-monitor
    spec:
      hostNetwork: true
      containers:
      - name: monitor
        image: custom-node-monitor:latest
        ports:
        - containerPort: 9090
          name: metrics
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 100m
            memory: 128Mi
        securityContext:
          privileged: true
      tolerations:
      - operator: Exists
```

## Monitoring DaemonSet Health

Track DaemonSet deployment status:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: daemonset-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: daemonset-monitoring
      rules:
      - alert: DaemonSetNotFullyDeployed
        expr: |
          kube_daemonset_status_number_ready / kube_daemonset_status_desired_number_scheduled < 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "DaemonSet {{ $labels.daemonset }} not fully deployed"

      - alert: DaemonSetPodCrashLooping
        expr: |
          rate(kube_pod_container_status_restarts_total{pod=~"node-exporter.*"}[15m]) > 0
        labels:
          severity: critical
        annotations:
          summary: "Monitoring pod {{ $labels.pod }} crash looping"
```

## Best Practices

Set appropriate resource limits for monitoring agents. Under-provisioned agents may miss metrics during load spikes. Over-provisioned agents waste cluster resources.

Use tolerations to ensure agents run on all nodes, including those with taints. Without proper tolerations, monitoring blind spots emerge on specialized nodes.

Implement health checks to detect agent failures. Dead agents create monitoring gaps that hide infrastructure issues.

Consider metric cardinality when enabling collectors. High-cardinality metrics significantly increase storage and query costs.

Test agent performance impact on node resources. Monitoring overhead should remain below 5% of node capacity to avoid impacting application workloads.

## Conclusion

DaemonSets provide the perfect mechanism for deploying node monitoring agents across Kubernetes clusters. By ensuring every node runs exactly one monitoring pod, you maintain comprehensive observability even as clusters scale. Whether using established solutions like Prometheus Node Exporter, Datadog, or custom agents, the DaemonSet pattern guarantees consistent monitoring coverage across your infrastructure.

Implement robust node monitoring with DaemonSets to gain visibility into cluster health and performance.
