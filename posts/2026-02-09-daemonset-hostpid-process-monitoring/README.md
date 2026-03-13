# How to implement DaemonSet with hostPID for node process monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSets, Monitoring

Description: Learn how to configure DaemonSets with hostPID namespace access to monitor and manage processes running directly on Kubernetes nodes.

---

Monitoring processes running directly on Kubernetes nodes requires access to the host's process namespace. DaemonSets with hostPID enabled can observe all processes on a node, making them ideal for system monitoring, security scanning, and process management tools. This capability is essential for comprehensive infrastructure observability.

## Understanding hostPID in Kubernetes

When you set hostPID to true in a pod specification, the container shares the host's process namespace. This means processes inside the container can see and interact with all processes running on the node, not just processes within the container itself.

This capability is powerful but also requires careful security consideration. Containers with hostPID access can potentially interfere with critical system processes, so you should only enable it when absolutely necessary and with appropriate security controls.

## Basic DaemonSet with hostPID

Here's a simple DaemonSet that uses hostPID for process monitoring:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: process-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: process-monitor
  template:
    metadata:
      labels:
        app: process-monitor
    spec:
      hostPID: true  # Enable host PID namespace access
      hostNetwork: true
      containers:
      - name: monitor
        image: alpine:3.19
        command:
        - /bin/sh
        - -c
        - |
          while true; do
            echo "=== Top Processes ==="
            ps aux | head -n 20
            sleep 30
          done
        securityContext:
          readOnlyRootFilesystem: true
        resources:
          limits:
            memory: 100Mi
            cpu: 100m
          requests:
            memory: 50Mi
            cpu: 50m
```

This basic example uses ps to list processes, but you can see all host processes including systemd, kubelet, and container runtime processes.

## Process exporter for Prometheus metrics

A practical use case is deploying a process exporter that exposes process metrics to Prometheus:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: process-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: process-exporter
  template:
    metadata:
      labels:
        app: process-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9256"
    spec:
      hostPID: true
      hostNetwork: true
      containers:
      - name: process-exporter
        image: ncabatoff/process-exporter:0.7.10
        args:
        - --procfs=/host/proc
        - --config.path=/etc/process-exporter/config.yml
        - --web.listen-address=:9256
        ports:
        - containerPort: 9256
          name: metrics
        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: config
          mountPath: /etc/process-exporter
        securityContext:
          runAsNonRoot: true
          runAsUser: 65534
          readOnlyRootFilesystem: true
        resources:
          limits:
            memory: 200Mi
            cpu: 200m
          requests:
            memory: 100Mi
            cpu: 100m
      volumes:
      - name: proc
        hostPath:
          path: /proc
          type: Directory
      - name: config
        configMap:
          name: process-exporter-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: process-exporter-config
  namespace: monitoring
data:
  config.yml: |
    process_names:
    - name: "{{.Comm}}"
      cmdline:
      - '.+'
    # Track specific processes
    - name: "kubelet"
      cmdline:
      - 'kubelet'
    - name: "containerd"
      cmdline:
      - 'containerd'
    - name: "dockerd"
      cmdline:
      - 'dockerd'
```

This configuration exports detailed metrics about all processes, with special tracking for critical Kubernetes components.

## Security monitoring with Falco

Falco is a runtime security tool that uses hostPID to detect anomalous process behavior:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: falco
  namespace: security
spec:
  selector:
    matchLabels:
      app: falco
  template:
    metadata:
      labels:
        app: falco
    spec:
      hostPID: true
      hostNetwork: true
      serviceAccountName: falco
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/master
      - effect: NoSchedule
        key: node-role.kubernetes.io/control-plane
      containers:
      - name: falco
        image: falcosecurity/falco-no-driver:0.36.2
        args:
        - /usr/bin/falco
        - --cri=/run/containerd/containerd.sock
        - --cri=/run/crio/crio.sock
        - -K=/var/run/secrets/kubernetes.io/serviceaccount/token
        - -k=https://$(KUBERNETES_SERVICE_HOST)
        - --k8s-node=$(NODE_NAME)
        - -pk
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        securityContext:
          privileged: true
        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: boot
          mountPath: /host/boot
          readOnly: true
        - name: lib-modules
          mountPath: /host/lib/modules
          readOnly: true
        - name: usr
          mountPath: /host/usr
          readOnly: true
        - name: etc
          mountPath: /host/etc
          readOnly: true
        - name: dev
          mountPath: /host/dev
        - name: containerd-socket
          mountPath: /run/containerd/containerd.sock
        resources:
          limits:
            memory: 512Mi
            cpu: 500m
          requests:
            memory: 256Mi
            cpu: 200m
      volumes:
      - name: proc
        hostPath:
          path: /proc
      - name: boot
        hostPath:
          path: /boot
      - name: lib-modules
        hostPath:
          path: /lib/modules
      - name: usr
        hostPath:
          path: /usr
      - name: etc
        hostPath:
          path: /etc
      - name: dev
        hostPath:
          path: /dev
      - name: containerd-socket
        hostPath:
          path: /run/containerd/containerd.sock
```

Falco monitors system calls and process execution to detect security threats in real-time.

## Custom process monitoring with Python

You can build custom process monitoring tools using hostPID access:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: custom-process-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: custom-monitor
  template:
    metadata:
      labels:
        app: custom-monitor
    spec:
      hostPID: true
      containers:
      - name: monitor
        image: python:3.12-slim
        command:
        - python3
        - -c
        - |
          import psutil
          import time
          import json

          while True:
              # Get all processes
              processes = []
              for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'cmdline']):
                  try:
                      pinfo = proc.info
                      # Filter for interesting processes
                      if any(keyword in pinfo['name'] for keyword in ['kubelet', 'containerd', 'docker', 'etcd']):
                          processes.append({
                              'pid': pinfo['pid'],
                              'name': pinfo['name'],
                              'cpu_percent': pinfo['cpu_percent'],
                              'memory_percent': round(pinfo['memory_percent'], 2),
                              'cmdline': ' '.join(pinfo['cmdline'][:5]) if pinfo['cmdline'] else ''
                          })
                  except (psutil.NoSuchProcess, psutil.AccessDenied):
                      pass

              print(json.dumps(processes, indent=2))
              time.sleep(10)
        volumeMounts:
        - name: proc
          mountPath: /proc
          readOnly: true
        securityContext:
          capabilities:
            drop:
            - ALL
            add:
            - SYS_PTRACE  # Required for process inspection
        resources:
          limits:
            memory: 256Mi
            cpu: 200m
          requests:
            memory: 128Mi
            cpu: 100m
      volumes:
      - name: proc
        hostPath:
          path: /proc
```

This Python-based monitor uses psutil to collect detailed process information and can be customized for your specific monitoring needs.

## Zombie process detector

A practical application is detecting and reporting zombie processes:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: zombie-detector
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: zombie-detector
  template:
    metadata:
      labels:
        app: zombie-detector
    spec:
      hostPID: true
      containers:
      - name: detector
        image: busybox:1.36
        command:
        - /bin/sh
        - -c
        - |
          while true; do
            zombies=$(ps aux | grep 'Z' | grep -v grep | wc -l)
            if [ $zombies -gt 0 ]; then
              echo "WARNING: Found $zombies zombie processes on $(hostname)"
              ps aux | grep 'Z' | grep -v grep
            else
              echo "No zombie processes detected on $(hostname)"
            fi
            sleep 60
          done
        securityContext:
          readOnlyRootFilesystem: true
        resources:
          limits:
            memory: 50Mi
            cpu: 50m
          requests:
            memory: 25Mi
            cpu: 25m
```

This detector scans for zombie processes and alerts when they're found, helping maintain node health.

## Process resource limiter

You can even implement process resource monitoring and alerting:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: process-resource-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: resource-monitor
  template:
    metadata:
      labels:
        app: resource-monitor
    spec:
      hostPID: true
      hostNetwork: true
      containers:
      - name: monitor
        image: alpine:3.19
        command:
        - /bin/sh
        - -c
        - |
          apk add --no-cache procps

          while true; do
            # Find processes using more than 80% CPU
            high_cpu=$(ps aux | awk '$3 > 80.0 {print $2, $11, $3}')
            if [ ! -z "$high_cpu" ]; then
              echo "=== High CPU Processes ==="
              echo "$high_cpu"
            fi

            # Find processes using more than 80% memory
            high_mem=$(ps aux | awk '$4 > 80.0 {print $2, $11, $4}')
            if [ ! -z "$high_mem" ]; then
              echo "=== High Memory Processes ==="
              echo "$high_mem"
            fi

            sleep 30
          done
        securityContext:
          readOnlyRootFilesystem: false
          capabilities:
            drop:
            - ALL
        resources:
          limits:
            memory: 100Mi
            cpu: 100m
```

This monitor identifies processes consuming excessive resources, useful for debugging performance issues.

## Security considerations

When using hostPID, implement strict security controls:

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 65534
  readOnlyRootFilesystem: true
  capabilities:
    drop:
    - ALL
    add:
    - SYS_PTRACE  # Only if needed
```

Always use read-only filesystem mounts when possible and drop all capabilities except those explicitly required.

## Verifying hostPID access

Test that your DaemonSet has proper hostPID access:

```bash
# Get a pod from the DaemonSet
POD=$(kubectl get pods -n monitoring -l app=process-monitor -o jsonpath='{.items[0].metadata.name}')

# Check if you can see host processes
kubectl exec -n monitoring $POD -- ps aux | grep kubelet

# Verify process count matches host
kubectl exec -n monitoring $POD -- ps aux | wc -l
```

You should see system processes like kubelet, containerd, and systemd.

## Conclusion

DaemonSets with hostPID enable powerful node-level process monitoring capabilities. Whether you're tracking system metrics, detecting security threats, or debugging performance issues, hostPID access provides the visibility you need. Always implement appropriate security controls and limit hostPID usage to trusted workloads that genuinely require host process visibility.
