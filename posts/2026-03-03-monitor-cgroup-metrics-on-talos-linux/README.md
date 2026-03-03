# How to Monitor Cgroup Metrics on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cgroup Metrics, Monitoring, Kubernetes, Prometheus, Grafana

Description: Set up comprehensive cgroup metrics monitoring on Talos Linux to gain deep visibility into container resource consumption and performance.

---

Monitoring cgroup metrics gives you the most granular view possible into how your containers are consuming system resources. While tools like kubectl top provide a quick snapshot, cgroup metrics reveal details like CPU throttling rates, memory pressure events, IO wait times, and page fault counts that are invisible at higher abstraction levels. On Talos Linux, cgroup v2 provides richer metrics than its predecessor, and with the right monitoring setup, you can catch performance problems before they affect your users.

This guide covers how to collect, store, visualize, and alert on cgroup metrics in a Talos Linux cluster.

## What Cgroup Metrics Are Available

Cgroup v2 exposes metrics through files in `/sys/fs/cgroup/`. For Kubernetes pods, the key metric categories are:

**CPU metrics** (cpu.stat):
- usage_usec - Total CPU time consumed
- user_usec - CPU time in user space
- system_usec - CPU time in kernel space
- nr_periods - Number of CFS scheduling periods
- nr_throttled - Number of throttled periods
- throttled_usec - Total throttled time

**Memory metrics** (memory.stat):
- anon - Anonymous memory usage
- file - Page cache usage
- kernel - Kernel memory
- sock - Socket memory
- pgfault - Page fault count
- pgmajfault - Major page fault count (disk IO needed)

**IO metrics** (io.stat):
- rbytes - Bytes read
- wbytes - Bytes written
- rios - Read operations
- wios - Write operations

**Pressure metrics** (cpu.pressure, memory.pressure, io.pressure):
- some - Percentage of time at least one task is stalled
- full - Percentage of time all tasks are stalled

## Setting Up cadvisor for Cgroup Collection

cadvisor (Container Advisor) is the primary tool for collecting cgroup metrics. On Talos Linux, it runs as part of the kubelet:

```bash
# cadvisor metrics are exposed through the kubelet
# Verify they are accessible
kubectl get --raw "/api/v1/nodes/<node-name>/proxy/metrics/cadvisor" | head -50
```

If you need standalone cadvisor with more configuration options:

```yaml
# cadvisor-daemonset.yaml
# Deploy cadvisor as a DaemonSet for enhanced cgroup monitoring
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cadvisor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: cadvisor
  template:
    metadata:
      labels:
        app: cadvisor
    spec:
      containers:
        - name: cadvisor
          image: gcr.io/cadvisor/cadvisor:v0.49.1
          args:
            - --housekeeping_interval=10s
            - --max_housekeeping_interval=15s
            - --storage_duration=1m0s
            - --allow_dynamic_housekeeping=true
            - --disable_metrics=accelerator,disk,diskIO,network,tcp,udp,percpu,sched,process,hugetlb,referenced_memory,resctrl,advtcp
            # Only collect the metrics we care about
            - --enable_metrics=cpu,memory,cpuLoad
          ports:
            - containerPort: 8080
              name: http
          resources:
            requests:
              cpu: 100m
              memory: 200Mi
            limits:
              cpu: 300m
              memory: 400Mi
          volumeMounts:
            - name: rootfs
              mountPath: /rootfs
              readOnly: true
            - name: sys
              mountPath: /sys
              readOnly: true
            - name: var-run
              mountPath: /var/run
              readOnly: true
            - name: cgroup
              mountPath: /sys/fs/cgroup
              readOnly: true
      volumes:
        - name: rootfs
          hostPath:
            path: /
        - name: sys
          hostPath:
            path: /sys
        - name: var-run
          hostPath:
            path: /var/run
        - name: cgroup
          hostPath:
            path: /sys/fs/cgroup
```

## Configuring Prometheus to Scrape Cgroup Metrics

Set up Prometheus to collect cgroup metrics from cadvisor:

```yaml
# prometheus-cadvisor-scrape.yaml
# ServiceMonitor for cadvisor cgroup metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cadvisor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: cadvisor
  endpoints:
    - port: http
      interval: 15s
      metricRelabelings:
        # Drop high-cardinality metrics to save storage
        - sourceLabels: [__name__]
          regex: "container_tasks_state|container_memory_failures_total"
          action: drop
        # Keep only relevant labels
        - action: labeldrop
          regex: "id|name"
```

Or if using the built-in kubelet cadvisor:

```yaml
# kubelet-cadvisor-scrape.yaml
# Scrape cadvisor metrics from kubelet
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kubelet-cadvisor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: kubelet
  endpoints:
    - port: https-metrics
      path: /metrics/cadvisor
      interval: 15s
      scheme: https
      bearerTokenFile: /var/run/secrets/kubernetes.io/serviceaccount/token
      tlsConfig:
        insecureSkipVerify: true
```

## Essential Recording Rules

Create Prometheus recording rules that aggregate raw cgroup metrics into useful indicators:

```yaml
# cgroup-recording-rules.yaml
# Recording rules for cgroup metric analysis
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cgroup-recording-rules
  namespace: monitoring
spec:
  groups:
    - name: cgroup.cpu
      interval: 30s
      rules:
        # CPU utilization rate per container
        - record: container:cpu_usage_rate:5m
          expr: >
            rate(container_cpu_usage_seconds_total{
              container!="", container!="POD"
            }[5m])

        # CPU throttle ratio per container
        - record: container:cpu_throttle_ratio:5m
          expr: >
            rate(container_cpu_cfs_throttled_periods_total{
              container!=""
            }[5m])
            /
            rate(container_cpu_cfs_periods_total{
              container!=""
            }[5m])

        # CPU usage as percentage of limit
        - record: container:cpu_usage_vs_limit:ratio
          expr: >
            rate(container_cpu_usage_seconds_total{
              container!=""
            }[5m])
            /
            (container_spec_cpu_quota{container!=""}
             / container_spec_cpu_period{container!=""})

    - name: cgroup.memory
      interval: 30s
      rules:
        # Working set as percentage of limit
        - record: container:memory_usage_vs_limit:ratio
          expr: >
            container_memory_working_set_bytes{container!=""}
            /
            container_spec_memory_limit_bytes{container!=""}

        # RSS memory (actual process memory, not cache)
        - record: container:memory_rss:bytes
          expr: >
            container_memory_rss{container!=""}

        # Page fault rate (indicates memory pressure)
        - record: container:memory_pgfault_rate:5m
          expr: >
            rate(container_memory_failures_total{
              container!="", type="pgfault"
            }[5m])

        # Major page fault rate (serious memory pressure)
        - record: container:memory_pgmajfault_rate:5m
          expr: >
            rate(container_memory_failures_total{
              container!="", type="pgmajfault"
            }[5m])

    - name: cgroup.io
      interval: 1m
      rules:
        # IO read throughput per container
        - record: container:io_read_bytes_rate:5m
          expr: >
            rate(container_fs_reads_bytes_total{
              container!=""
            }[5m])

        # IO write throughput per container
        - record: container:io_write_bytes_rate:5m
          expr: >
            rate(container_fs_writes_bytes_total{
              container!=""
            }[5m])
```

## Building Grafana Dashboards

Create a comprehensive cgroup monitoring dashboard:

```json
{
  "dashboard": {
    "title": "Cgroup Resource Monitoring",
    "panels": [
      {
        "title": "CPU Throttling Rate by Container",
        "type": "timeseries",
        "targets": [{
          "expr": "topk(10, container:cpu_throttle_ratio:5m{container!=''})",
          "legendFormat": "{{namespace}}/{{pod}}/{{container}}"
        }],
        "fieldConfig": {
          "defaults": {
            "unit": "percentunit",
            "thresholds": {
              "steps": [
                {"color": "green", "value": 0},
                {"color": "yellow", "value": 0.1},
                {"color": "red", "value": 0.25}
              ]
            }
          }
        }
      },
      {
        "title": "Memory Usage vs Limit",
        "type": "timeseries",
        "targets": [{
          "expr": "topk(10, container:memory_usage_vs_limit:ratio{container!=''})",
          "legendFormat": "{{namespace}}/{{pod}}/{{container}}"
        }],
        "fieldConfig": {
          "defaults": {
            "unit": "percentunit"
          }
        }
      },
      {
        "title": "Major Page Faults (Memory Pressure)",
        "type": "timeseries",
        "targets": [{
          "expr": "topk(10, container:memory_pgmajfault_rate:5m{container!=''})",
          "legendFormat": "{{namespace}}/{{pod}}/{{container}}"
        }]
      },
      {
        "title": "IO Throughput by Container",
        "type": "timeseries",
        "targets": [
          {
            "expr": "topk(5, container:io_read_bytes_rate:5m)",
            "legendFormat": "read: {{namespace}}/{{pod}}"
          },
          {
            "expr": "topk(5, container:io_write_bytes_rate:5m)",
            "legendFormat": "write: {{namespace}}/{{pod}}"
          }
        ],
        "fieldConfig": {
          "defaults": {"unit": "Bps"}
        }
      }
    ]
  }
}
```

## Setting Up Alerts

Configure alerts for cgroup-level problems:

```yaml
# cgroup-alerts.yaml
# Alerting rules based on cgroup metrics
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cgroup-alerts
  namespace: monitoring
spec:
  groups:
    - name: cgroup.alerts
      rules:
        - alert: HighCPUThrottling
          expr: container:cpu_throttle_ratio:5m > 0.25
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "{{ $labels.pod }}/{{ $labels.container }} CPU throttled {{ $value | humanizePercentage }}"

        - alert: MemoryNearLimit
          expr: container:memory_usage_vs_limit:ratio > 0.9
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "{{ $labels.pod }}/{{ $labels.container }} using {{ $value | humanizePercentage }} of memory limit"

        - alert: HighMajorPageFaults
          expr: container:memory_pgmajfault_rate:5m > 100
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "{{ $labels.pod }}/{{ $labels.container }} experiencing high major page faults"

        - alert: ContainerOOMDetected
          expr: increase(kube_pod_container_status_restarts_total[5m]) > 0 and on(pod, container, namespace) kube_pod_container_status_last_terminated_reason{reason="OOMKilled"} == 1
          labels:
            severity: critical
          annotations:
            summary: "{{ $labels.pod }}/{{ $labels.container }} was OOM killed"
```

## Collecting PSI Metrics

Pressure Stall Information is a cgroup v2 feature that shows real-time resource contention:

```yaml
# node-exporter-psi.yaml
# Enable PSI collection in node-exporter
prometheus-node-exporter:
  extraArgs:
    - --collector.pressure
    - --collector.cgroups
```

PSI provides three metrics per resource (CPU, memory, IO):
- **some**: The percentage of time at least one process is waiting
- **full**: The percentage of time all processes are waiting

These are excellent early warning indicators of resource contention.

## Summary

Monitoring cgroup metrics on Talos Linux provides the deepest level of visibility into container resource behavior. By collecting metrics through cadvisor and Prometheus, creating recording rules for derived indicators, and building dashboards that highlight throttling, memory pressure, and IO contention, you can identify and resolve performance issues before they impact your applications. The combination of cgroup v2's rich metric surface with Prometheus's storage and querying capabilities gives you a powerful toolkit for understanding exactly what is happening at the resource level in your Talos Linux cluster.
