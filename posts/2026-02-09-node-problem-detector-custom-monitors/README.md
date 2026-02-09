# How to Configure Node Problem Detector Custom Monitors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Node Management, Monitoring, Troubleshooting

Description: Learn how to configure Node Problem Detector with custom monitors to detect infrastructure issues, hardware failures, and kernel problems that could affect Kubernetes node reliability.

---

Node Problem Detector (NPD) is a Kubernetes addon that detects node-level problems and reports them to the control plane. It monitors for issues like kernel deadlocks, hardware failures, network problems, and resource pressure. By creating custom monitors, you can detect specific issues relevant to your infrastructure and trigger appropriate responses.

## Installing Node Problem Detector

Deploy NPD as a DaemonSet to run on every node:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: node-problem-detector
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: node-problem-detector
rules:
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list", "patch", "update"]
- apiGroups: [""]
  resources: ["nodes/status"]
  verbs: ["patch", "update"]
- apiGroups: [""]
  resources: ["events"]
  verbs: ["create", "patch", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: node-problem-detector
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: node-problem-detector
subjects:
- kind: ServiceAccount
  name: node-problem-detector
  namespace: kube-system
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-problem-detector
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: node-problem-detector
  template:
    metadata:
      labels:
        app: node-problem-detector
    spec:
      serviceAccountName: node-problem-detector
      hostNetwork: true
      containers:
      - name: node-problem-detector
        image: registry.k8s.io/node-problem-detector/node-problem-detector:v0.8.15
        command:
        - /node-problem-detector
        - --logtostderr
        - --config.system-log-monitor=/config/kernel-monitor.json,/config/docker-monitor.json,/config/systemd-monitor.json
        - --config.custom-plugin-monitor=/config/custom-plugin-monitor.json
        - --prometheus-address=0.0.0.0
        - --prometheus-port=20257
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        volumeMounts:
        - name: log
          mountPath: /var/log
          readOnly: true
        - name: kmsg
          mountPath: /dev/kmsg
          readOnly: true
        - name: localtime
          mountPath: /etc/localtime
          readOnly: true
        - name: config
          mountPath: /config
          readOnly: true
        ports:
        - containerPort: 20257
          name: metrics
        resources:
          requests:
            cpu: 10m
            memory: 80Mi
          limits:
            cpu: 100m
            memory: 160Mi
      volumes:
      - name: log
        hostPath:
          path: /var/log/
      - name: kmsg
        hostPath:
          path: /dev/kmsg
      - name: localtime
        hostPath:
          path: /etc/localtime
          type: File
      - name: config
        configMap:
          name: node-problem-detector-config
```

Apply the DaemonSet:

```bash
kubectl apply -f node-problem-detector.yaml

# Verify NPD is running on all nodes
kubectl get pods -n kube-system -l app=node-problem-detector -o wide
```

## Creating a Kernel Monitor Configuration

Kernel monitors parse kernel logs to detect issues:

```json
{
  "plugin": "kmsg",
  "pluginConfig": {
    "source": "kmsg"
  },
  "logPath": "/dev/kmsg",
  "lookback": "5m",
  "bufferSize": 10,
  "source": "kernel-monitor",
  "conditions": [
    {
      "type": "KernelDeadlock",
      "reason": "KernelHasNoDeadlock",
      "message": "kernel has no deadlock"
    },
    {
      "type": "ReadonlyFilesystem",
      "reason": "FilesystemIsReadOnly",
      "message": "Filesystem is read-only"
    }
  ],
  "rules": [
    {
      "type": "temporary",
      "reason": "OOMKilling",
      "pattern": "Out of memory: Kill process \\d+ (.+) score \\d+ or sacrifice child",
      "timeout": "30s"
    },
    {
      "type": "permanent",
      "condition": "KernelDeadlock",
      "reason": "AUFSUmountHung",
      "pattern": "task umount\\.aufs:\\d+ blocked for more than \\d+ seconds\\."
    },
    {
      "type": "permanent",
      "condition": "KernelDeadlock",
      "reason": "DockerHung",
      "pattern": "task docker:\\d+ blocked for more than \\d+ seconds\\."
    },
    {
      "type": "permanent",
      "condition": "ReadonlyFilesystem",
      "reason": "FilesystemReadonly",
      "pattern": "EXT4-fs .+: remounting filesystem read-only"
    }
  ]
}
```

## Creating a Custom Plugin Monitor

Custom plugin monitors run scripts to detect specific problems:

```json
{
  "plugin": "custom",
  "pluginConfig": {
    "invoke_interval": "30s",
    "timeout": "10s",
    "max_output_length": 80,
    "concurrency": 3
  },
  "source": "custom-monitor",
  "conditions": [
    {
      "type": "DiskSlowIO",
      "reason": "DiskIsOK",
      "message": "Disk IO is performing normally"
    },
    {
      "type": "NetworkLatency",
      "reason": "NetworkLatencyNormal",
      "message": "Network latency is normal"
    },
    {
      "type": "CPUThrottling",
      "reason": "NoCPUThrottling",
      "message": "No CPU throttling detected"
    }
  ],
  "rules": [
    {
      "type": "permanent",
      "condition": "DiskSlowIO",
      "reason": "DiskIOSlow",
      "path": "/home/kubernetes/bin/check-disk-io.sh",
      "timeout": "10s"
    },
    {
      "type": "temporary",
      "condition": "NetworkLatency",
      "reason": "HighNetworkLatency",
      "path": "/home/kubernetes/bin/check-network-latency.sh",
      "timeout": "10s"
    },
    {
      "type": "permanent",
      "condition": "CPUThrottling",
      "reason": "HighCPUThrottling",
      "path": "/home/kubernetes/bin/check-cpu-throttling.sh",
      "timeout": "5s"
    }
  ]
}
```

## Writing Custom Monitor Scripts

Create a disk IO monitoring script:

```bash
#!/bin/bash
# check-disk-io.sh

# Test disk write performance
TEST_FILE="/tmp/npd-disk-test"
THRESHOLD_MB=50

# Write 100MB and measure time
START=$(date +%s%N)
dd if=/dev/zero of=$TEST_FILE bs=1M count=100 conv=fdatasync 2>/dev/null
END=$(date +%s%N)

# Calculate MB/s
DURATION=$(( (END - START) / 1000000 ))
SPEED=$(( 100000 / DURATION ))

# Cleanup
rm -f $TEST_FILE

# Return non-zero if slow
if [ $SPEED -lt $THRESHOLD_MB ]; then
  echo "Disk IO slow: ${SPEED}MB/s (threshold: ${THRESHOLD_MB}MB/s)"
  exit 1
fi

exit 0
```

Network latency check:

```bash
#!/bin/bash
# check-network-latency.sh

# Check latency to default gateway
GATEWAY=$(ip route | grep default | awk '{print $3}' | head -1)
THRESHOLD_MS=10

if [ -z "$GATEWAY" ]; then
  echo "Cannot determine default gateway"
  exit 0
fi

# Ping gateway 5 times
LATENCY=$(ping -c 5 -W 1 $GATEWAY 2>/dev/null | \
  grep "avg" | \
  awk -F '/' '{print $5}')

if [ -z "$LATENCY" ]; then
  echo "Cannot reach gateway $GATEWAY"
  exit 1
fi

# Compare with threshold
if (( $(echo "$LATENCY > $THRESHOLD_MS" | bc -l) )); then
  echo "High network latency: ${LATENCY}ms to gateway $GATEWAY"
  exit 1
fi

exit 0
```

CPU throttling check:

```bash
#!/bin/bash
# check-cpu-throttling.sh

THRESHOLD_PERCENT=20

# Get CPU throttling statistics
THROTTLED=$(cat /sys/fs/cgroup/cpu/cpu.stat | \
  grep nr_throttled | \
  awk '{print $2}')

PERIODS=$(cat /sys/fs/cgroup/cpu/cpu.stat | \
  grep nr_periods | \
  awk '{print $2}')

if [ $PERIODS -eq 0 ]; then
  exit 0
fi

# Calculate throttling percentage
PERCENT=$(( THROTTLED * 100 / PERIODS ))

if [ $PERCENT -gt $THRESHOLD_PERCENT ]; then
  echo "High CPU throttling: ${PERCENT}% of periods throttled"
  exit 1
fi

exit 0
```

Deploy monitor scripts:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-monitor-scripts
  namespace: kube-system
data:
  check-disk-io.sh: |
    #!/bin/bash
    # Disk IO script content here

  check-network-latency.sh: |
    #!/bin/bash
    # Network latency script content here

  check-cpu-throttling.sh: |
    #!/bin/bash
    # CPU throttling script content here
```

Update the DaemonSet to mount scripts:

```yaml
spec:
  template:
    spec:
      containers:
      - name: node-problem-detector
        volumeMounts:
        - name: scripts
          mountPath: /home/kubernetes/bin
      volumes:
      - name: scripts
        configMap:
          name: custom-monitor-scripts
          defaultMode: 0755
```

## Creating ConfigMap for Monitor Configurations

Package all monitor configs in a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: node-problem-detector-config
  namespace: kube-system
data:
  kernel-monitor.json: |
    {
      "plugin": "kmsg",
      "logPath": "/dev/kmsg",
      "lookback": "5m",
      "source": "kernel-monitor",
      "conditions": [
        {
          "type": "KernelDeadlock",
          "reason": "KernelHasNoDeadlock",
          "message": "kernel has no deadlock"
        }
      ],
      "rules": [
        {
          "type": "permanent",
          "condition": "KernelDeadlock",
          "reason": "DockerHung",
          "pattern": "task docker:\\d+ blocked for more than \\d+ seconds\\."
        }
      ]
    }

  docker-monitor.json: |
    {
      "plugin": "journald",
      "pluginConfig": {
        "source": "dockerd"
      },
      "logPath": "/var/log/journal",
      "lookback": "5m",
      "source": "docker-monitor",
      "conditions": [],
      "rules": [
        {
          "type": "temporary",
          "reason": "CorruptDockerImage",
          "pattern": "Error trying v2 registry: failed to register layer: rename /var/lib/docker/image/(.+) /var/lib/docker/image/(.+): no such file or directory.*"
        }
      ]
    }

  systemd-monitor.json: |
    {
      "plugin": "journald",
      "pluginConfig": {
        "source": "systemd"
      },
      "logPath": "/var/log/journal",
      "lookback": "5m",
      "source": "systemd-monitor",
      "conditions": [],
      "rules": [
        {
          "type": "temporary",
          "reason": "SystemdUnitFailed",
          "pattern": "systemd\\[\\d+\\]: (.+\\.service): Main process exited, code=exited, status=\\d+/.*"
        }
      ]
    }

  custom-plugin-monitor.json: |
    {
      "plugin": "custom",
      "pluginConfig": {
        "invoke_interval": "60s",
        "timeout": "30s"
      },
      "source": "custom-monitor",
      "conditions": [
        {
          "type": "DiskSlowIO",
          "reason": "DiskIsOK",
          "message": "Disk IO is normal"
        }
      ],
      "rules": [
        {
          "type": "permanent",
          "condition": "DiskSlowIO",
          "reason": "DiskIOSlow",
          "path": "/home/kubernetes/bin/check-disk-io.sh",
          "timeout": "30s"
        }
      ]
    }
```

## Viewing Node Conditions and Events

Check conditions created by NPD:

```bash
# View all node conditions
kubectl get nodes -o json | \
  jq -r '.items[] | {node: .metadata.name, conditions: .status.conditions}'

# Filter for custom conditions
kubectl describe node <node-name> | grep -A 10 "Conditions"

# View NPD events
kubectl get events -n kube-system --field-selector source=node-problem-detector

# Watch for new problems
kubectl get events -n kube-system --field-selector source=node-problem-detector -w
```

## Integrating with Prometheus

NPD exposes Prometheus metrics. Create a ServiceMonitor:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: node-problem-detector
  namespace: kube-system
  labels:
    app: node-problem-detector
spec:
  selector:
    app: node-problem-detector
  ports:
  - name: metrics
    port: 20257
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: node-problem-detector
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-problem-detector
  namespaceSelector:
    matchNames:
    - kube-system
  endpoints:
  - port: metrics
    interval: 30s
```

Query NPD metrics:

```promql
# Count nodes with problems
count(problem_counter{type!=""} > 0) by (type, reason)

# Problem gauge
problem_gauge{type="DiskSlowIO"}

# Problem duration
problem_duration_seconds{type="NetworkLatency"}
```

## Creating Alerts for Node Problems

Define alerts for detected problems:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: node-problem-alerts
  namespace: monitoring
spec:
  groups:
  - name: node-problems
    rules:
    - alert: NodeKernelDeadlock
      expr: problem_gauge{type="KernelDeadlock"} > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Kernel deadlock detected on node {{ $labels.node }}"
        description: "{{ $labels.reason }}"

    - alert: NodeDiskSlowIO
      expr: problem_gauge{type="DiskSlowIO"} > 0
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Slow disk IO on node {{ $labels.node }}"

    - alert: NodeNetworkLatency
      expr: problem_gauge{type="NetworkLatency"} > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High network latency on node {{ $labels.node }}"
```

## Troubleshooting NPD

Debug NPD issues:

```bash
# Check NPD logs
kubectl logs -n kube-system -l app=node-problem-detector -f

# Verify monitor configs
kubectl get configmap node-problem-detector-config -n kube-system \
  -o yaml

# Test custom script manually
kubectl exec -n kube-system <npd-pod> -- \
  /home/kubernetes/bin/check-disk-io.sh

# Check permissions
kubectl exec -n kube-system <npd-pod> -- \
  ls -la /home/kubernetes/bin/

# View detected problems
kubectl get nodes -o json | \
  jq '.items[] | {node: .metadata.name, problems: [.status.conditions[] | select(.type | startswith("Kernel") or startswith("Disk") or startswith("Network"))]}'
```

Node Problem Detector extends Kubernetes monitoring to infrastructure-level issues. Create custom monitors for your specific environment, integrate with alerting systems, and automate responses to detected problems for improved cluster reliability.
