# How to use DaemonSets for node problem detector and auto-remediation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSets, Monitoring

Description: Implement node problem detector as a DaemonSet to automatically identify, report, and remediate node-level issues in your Kubernetes cluster.

---

Node Problem Detector (NPD) is a critical monitoring component that runs on every Kubernetes node to detect hardware and kernel issues. By deploying it as a DaemonSet, you ensure comprehensive node health monitoring across your entire cluster. NPD can identify disk pressure, memory corruption, network problems, and other node-level failures before they impact workloads.

## Understanding Node Problem Detector

NPD monitors various node conditions by running health checks and parsing system logs. When it detects issues, it updates node conditions and generates events that can trigger automated responses. The tool supports custom problem detectors through plugin architecture, allowing you to monitor application-specific conditions.

DaemonSets are the natural deployment method for NPD because every node needs monitoring. The pod runs with elevated privileges to access system logs, kernel messages, and hardware metrics.

## Basic Node Problem Detector DaemonSet

Here's a standard NPD deployment:

```yaml
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
      hostNetwork: true
      hostPID: true
      priorityClassName: system-node-critical
      tolerations:
      - operator: Exists
        effect: NoSchedule
      containers:
      - name: node-problem-detector
        image: registry.k8s.io/node-problem-detector/node-problem-detector:v0.8.15
        command:
        - /node-problem-detector
        - --logtostderr
        - --config.system-log-monitor=/config/kernel-monitor.json
        - --config.custom-plugin-monitor=/config/docker-monitor.json
        securityContext:
          privileged: true
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
        resources:
          limits:
            cpu: 200m
            memory: 200Mi
          requests:
            cpu: 20m
            memory: 20Mi
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
          type: FileOrCreate
      - name: config
        configMap:
          name: node-problem-detector-config
```

This configuration enables NPD to monitor kernel logs and Docker daemon logs.

## Custom problem detector configuration

Create custom detectors for application-specific issues:

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
          "pattern": "Kill process \\d+ (.+) score \\d+ or sacrifice child"
        },
        {
          "type": "permanent",
          "condition": "KernelDeadlock",
          "reason": "TaskHung",
          "pattern": "task \\S+:\\w+ blocked for more than \\w+ seconds\\."
        },
        {
          "type": "permanent",
          "condition": "ReadonlyFilesystem",
          "reason": "FilesystemReadonly",
          "pattern": "Remounting filesystem read-only"
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
      "bufferSize": 10,
      "source": "docker-monitor",
      "conditions": [
        {
          "type": "DockerDaemonUnhealthy",
          "reason": "DockerDaemonHealthy",
          "message": "Docker daemon is healthy"
        }
      ],
      "rules": [
        {
          "type": "permanent",
          "condition": "DockerDaemonUnhealthy",
          "reason": "DockerDaemonNotResponding",
          "pattern": "docker daemon.*not responding"
        }
      ]
    }

  containerd-monitor.json: |
    {
      "plugin": "journald",
      "pluginConfig": {
        "source": "containerd"
      },
      "logPath": "/var/log/journal",
      "lookback": "5m",
      "source": "containerd-monitor",
      "conditions": [
        {
          "type": "ContainerdUnhealthy",
          "reason": "ContainerdHealthy",
          "message": "containerd is functioning properly"
        }
      ],
      "rules": [
        {
          "type": "permanent",
          "condition": "ContainerdUnhealthy",
          "reason": "ContainerdConnectionRefused",
          "pattern": "connection refused.*containerd"
        }
      ]
    }
```

These custom monitors detect OOM kills, filesystem issues, and container runtime problems.

## Auto-remediation DaemonSet

Combine NPD with auto-remediation logic:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-problem-detector-remediation
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: npd-remediation
  template:
    metadata:
      labels:
        app: npd-remediation
    spec:
      hostNetwork: true
      hostPID: true
      serviceAccountName: node-problem-detector
      containers:
      - name: detector
        image: registry.k8s.io/node-problem-detector/node-problem-detector:v0.8.15
        command:
        - /node-problem-detector
        - --logtostderr
        - --config.system-log-monitor=/config/kernel-monitor.json
        securityContext:
          privileged: true
        volumeMounts:
        - name: log
          mountPath: /var/log
          readOnly: true
        - name: kmsg
          mountPath: /dev/kmsg
          readOnly: true
        - name: config
          mountPath: /config

      - name: remediation
        image: alpine:3.19
        command:
        - /bin/sh
        - -c
        - |
          apk add --no-cache curl jq

          while true; do
            # Check node conditions via Kubernetes API
            NODE_STATUS=$(curl -s -k -H "Authorization: Bearer $(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
              https://kubernetes.default.svc/api/v1/nodes/$NODE_NAME)

            # Check for ReadonlyFilesystem condition
            READONLY=$(echo "$NODE_STATUS" | jq -r '.status.conditions[] | select(.type=="ReadonlyFilesystem") | .status')
            if [ "$READONLY" = "True" ]; then
              echo "Detected readonly filesystem, attempting remount..."
              nsenter -t 1 -m -u -n -i mount -o remount,rw /
            fi

            # Check for high disk pressure
            DISK_PRESSURE=$(echo "$NODE_STATUS" | jq -r '.status.conditions[] | select(.type=="DiskPressure") | .status')
            if [ "$DISK_PRESSURE" = "True" ]; then
              echo "Disk pressure detected, cleaning up..."
              nsenter -t 1 -m -u -n -i docker system prune -af --volumes || true
              nsenter -t 1 -m -u -n -i rm -rf /tmp/* || true
            fi

            sleep 60
          done
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        securityContext:
          privileged: true

      volumes:
      - name: log
        hostPath:
          path: /var/log/
      - name: kmsg
        hostPath:
          path: /dev/kmsg
      - name: config
        configMap:
          name: node-problem-detector-config
---
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
  verbs: ["get", "list", "watch"]
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
```

The remediation container automatically fixes common issues like readonly filesystems and disk pressure.

## Advanced monitoring with custom plugins

Create a custom plugin for application-specific monitoring:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: custom-problem-detector
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: custom-detector
  template:
    metadata:
      labels:
        app: custom-detector
    spec:
      hostNetwork: true
      containers:
      - name: detector
        image: example/custom-detector:v1.0
        command:
        - /usr/local/bin/detector
        - --check-interval=30s
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        volumeMounts:
        - name: varlog
          mountPath: /var/log
          readOnly: true
      - name: reporter
        image: alpine:3.19
        command:
        - /bin/sh
        - -c
        - |
          apk add --no-cache curl

          while true; do
            # Read problem reports from shared directory
            if [ -f /shared/problems.json ]; then
              # Report to monitoring system
              curl -X POST http://monitoring-api.monitoring.svc/node-problems \
                -H "Content-Type: application/json" \
                -d @/shared/problems.json

              # Update node condition
              kubectl label nodes $NODE_NAME custom-problem=detected --overwrite
            fi

            sleep 30
          done
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        volumeMounts:
        - name: shared
          mountPath: /shared
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: shared
        emptyDir: {}
```

Custom plugins can monitor application-specific conditions and report them through standard Kubernetes mechanisms.

## Integration with node draining

Automatically drain nodes when critical problems are detected:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-problem-drain
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: problem-drain
  template:
    metadata:
      labels:
        app: problem-drain
    spec:
      serviceAccountName: node-drainer
      hostNetwork: true
      containers:
      - name: drainer
        image: example/node-drainer:v1.0
        command:
        - /bin/sh
        - -c
        - |
          while true; do
            # Check for critical node conditions
            NODE_INFO=$(kubectl get node $NODE_NAME -o json)

            # Check for hardware failure
            HW_FAILURE=$(echo "$NODE_INFO" | jq -r '.status.conditions[] | select(.type=="HardwareFailure" and .status=="True") | .type')

            if [ "$HW_FAILURE" = "HardwareFailure" ]; then
              echo "Hardware failure detected, draining node..."

              # Cordon the node
              kubectl cordon $NODE_NAME

              # Drain the node
              kubectl drain $NODE_NAME \
                --ignore-daemonsets \
                --delete-emptydir-data \
                --force \
                --grace-period=300

              echo "Node drained, waiting for manual intervention..."
              sleep 3600
            fi

            sleep 60
          done
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: node-drainer
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: node-drainer
rules:
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list", "patch"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["list", "delete"]
- apiGroups: [""]
  resources: ["pods/eviction"]
  verbs: ["create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: node-drainer
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: node-drainer
subjects:
- kind: ServiceAccount
  name: node-drainer
  namespace: kube-system
```

This automatically drains nodes experiencing hardware failures.

## Monitoring NPD metrics

Expose NPD metrics for Prometheus:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-problem-detector-metrics
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: npd-metrics
  template:
    metadata:
      labels:
        app: npd-metrics
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "20257"
    spec:
      hostNetwork: true
      containers:
      - name: node-problem-detector
        image: registry.k8s.io/node-problem-detector/node-problem-detector:v0.8.15
        command:
        - /node-problem-detector
        - --logtostderr
        - --prometheus-address=0.0.0.0
        - --prometheus-port=20257
        - --config.system-log-monitor=/config/kernel-monitor.json
        ports:
        - name: metrics
          containerPort: 20257
        securityContext:
          privileged: true
        volumeMounts:
        - name: log
          mountPath: /var/log
          readOnly: true
        - name: config
          mountPath: /config
      volumes:
      - name: log
        hostPath:
          path: /var/log/
      - name: config
        configMap:
          name: node-problem-detector-config
```

Prometheus can scrape these metrics to track node health trends over time.

## Conclusion

Node Problem Detector deployed as a DaemonSet provides comprehensive node health monitoring across your Kubernetes cluster. By combining detection with auto-remediation logic, you can automatically resolve common node issues before they impact workloads. Custom plugins and integrations with node draining enable sophisticated failure handling strategies that improve cluster reliability and reduce manual intervention.
