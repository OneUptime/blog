# How to Configure Kubernetes Node Graceful Shutdown for Systemd Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Node Management, Systemd, High Availability

Description: Learn how to configure Kubernetes node graceful shutdown with systemd integration to ensure pods terminate cleanly during node restarts and system shutdowns.

---

When a Kubernetes node shuts down abruptly, running pods are killed without proper cleanup. This can lead to data loss, incomplete transactions, and service disruptions. Graceful shutdown ensures pods receive termination signals and have time to clean up before the node powers off. Integrating with systemd allows the kubelet to participate in the system shutdown sequence.

## Understanding Graceful Shutdown Phases

Graceful node shutdown happens in two phases. The critical pod phase gives pods with PriorityClass system-cluster-critical or system-node-critical time to shut down. The regular pod phase handles all other pods. Each phase has a configurable duration, and pods that do not exit within their phase timeout are forcefully terminated.

The kubelet watches for systemd shutdown events using the systemd inhibitor locks mechanism. When shutdown begins, kubelet starts gracefully terminating pods in priority order, respecting each pod's terminationGracePeriodSeconds up to the phase limit.

## Enabling Graceful Shutdown in Kubelet

Configure kubelet to enable graceful shutdown. Edit the kubelet configuration file:

```bash
# Create or edit kubelet config
sudo mkdir -p /var/lib/kubelet
sudo nano /var/lib/kubelet/config.yaml
```

Add these settings:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
# Enable graceful node shutdown
shutdownGracePeriod: 60s
shutdownGracePeriodCriticalPods: 20s

# Systemd integration
cgroupDriver: systemd

# Other recommended settings
featureGates:
  GracefulNodeShutdown: true
  GracefulNodeShutdownBasedOnPodPriority: true
```

The shutdownGracePeriod defines the total time kubelet has to shut down all pods. The shutdownGracePeriodCriticalPods is a subset of that time reserved for critical pods. For example, with 60s total and 20s for critical pods, critical pods get 20s to shut down, then regular pods get the remaining 40s.

## Configuring Kubelet Service with Shutdown Integration

Update the kubelet systemd service to use the configuration:

```bash
# Create kubelet service drop-in directory
sudo mkdir -p /etc/systemd/system/kubelet.service.d

# Create configuration override
sudo nano /etc/systemd/system/kubelet.service.d/10-graceful-shutdown.conf
```

Add this content:

```ini
[Service]
# Point to kubelet configuration file
Environment="KUBELET_CONFIG_ARGS=--config=/var/lib/kubelet/config.yaml"

# Ensure kubelet stops before shutdown completes
# This gives kubelet time to drain pods
TimeoutStopSec=90

# Restart on failure
Restart=on-failure
RestartSec=5
```

Reload systemd and restart kubelet:

```bash
# Reload systemd configuration
sudo systemctl daemon-reload

# Restart kubelet
sudo systemctl restart kubelet

# Verify kubelet is running with new config
sudo systemctl status kubelet

# Check kubelet is using graceful shutdown
journalctl -u kubelet | grep -i shutdown
```

## Setting Up Priority Classes for Critical Pods

Define PriorityClasses to control shutdown order:

```yaml
# System critical priority (highest)
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: system-cluster-critical
value: 2000000000
globalDefault: false
description: "Used for system critical pods that must run on the cluster"
---
# Node critical priority
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: system-node-critical
value: 2000001000
globalDefault: false
description: "Used for system critical pods that must run on each node"
---
# High priority for important workloads
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000000
globalDefault: false
description: "High priority workloads"
---
# Default priority
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: medium-priority
value: 100000
globalDefault: true
description: "Default priority for regular workloads"
```

Apply the priority classes:

```bash
kubectl apply -f priority-classes.yaml
kubectl get priorityclasses
```

Assign priority classes to pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: critical-database
  labels:
    app: database
spec:
  # This pod shuts down last
  priorityClassName: system-cluster-critical
  containers:
  - name: postgres
    image: postgres:16
    lifecycle:
      preStop:
        exec:
          command:
          - /bin/sh
          - -c
          - pg_ctl stop -D /var/lib/postgresql/data -m fast
  terminationGracePeriodSeconds: 30
---
apiVersion: v1
kind: Pod
metadata:
  name: web-application
  labels:
    app: web
spec:
  # This pod shuts down earlier
  priorityClassName: medium-priority
  containers:
  - name: nginx
    image: nginx:latest
    lifecycle:
      preStop:
        exec:
          command:
          - /bin/sh
          - -c
          - nginx -s quit; sleep 10
  terminationGracePeriodSeconds: 20
```

## Implementing PreStop Hooks for Clean Shutdown

Configure preStop hooks to perform cleanup before termination:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      priorityClassName: high-priority
      containers:
      - name: api
        image: myapp:latest
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - |
                # Stop accepting new requests
                kill -TERM 1
                # Wait for existing requests to complete
                sleep 15
                # Flush any buffers
                sync
        ports:
        - containerPort: 8080
      terminationGracePeriodSeconds: 30
```

For applications with database connections:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-db
spec:
  priorityClassName: high-priority
  containers:
  - name: app
    image: application:latest
    lifecycle:
      preStop:
        exec:
          command:
          - /bin/sh
          - -c
          - |
            # Signal app to stop accepting requests
            curl -X POST http://localhost:8080/shutdown
            # Wait for in-flight requests
            sleep 5
            # Close database connections gracefully
            curl -X POST http://localhost:8080/db/close
            # Final wait
            sleep 2
    env:
    - name: GRACEFUL_SHUTDOWN_TIMEOUT
      value: "25"
  terminationGracePeriodSeconds: 30
```

## Testing Graceful Shutdown

Create a test scenario to verify graceful shutdown works:

```bash
# Deploy test pods
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: shutdown-test-critical
spec:
  priorityClassName: system-cluster-critical
  containers:
  - name: test
    image: busybox
    command:
    - /bin/sh
    - -c
    - |
      trap "echo 'Critical pod shutting down'; sleep 10; echo 'Critical pod done'" TERM
      while true; do sleep 1; done
  terminationGracePeriodSeconds: 15
---
apiVersion: v1
kind: Pod
metadata:
  name: shutdown-test-regular
spec:
  containers:
  - name: test
    image: busybox
    command:
    - /bin/sh
    - -c
    - |
      trap "echo 'Regular pod shutting down'; sleep 5; echo 'Regular pod done'" TERM
      while true; do sleep 1; done
  terminationGracePeriodSeconds: 10
EOF

# Verify pods are running
kubectl get pods
```

Test shutdown behavior:

```bash
# On the node, trigger a shutdown (do this carefully!)
# First, cordon the node to prevent new pods
kubectl cordon <node-name>

# Watch pod termination
kubectl get pods -w &

# On the node itself, initiate shutdown
sudo systemctl reboot

# Watch the logs to see shutdown order
journalctl -u kubelet -f
```

You should see critical pods shutting down first, followed by regular pods, all within the configured grace periods.

## Configuring Node Shutdown with Pod Priority

Fine-tune shutdown behavior based on pod priority with more granular control:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
shutdownGracePeriod: 120s
shutdownGracePeriodCriticalPods: 40s

# Advanced: Configure shutdown by priority
shutdownGracePeriodByPodPriority:
- priority: 2000001000  # system-node-critical
  shutdownGracePeriodSeconds: 30
- priority: 2000000000  # system-cluster-critical
  shutdownGracePeriodSeconds: 25
- priority: 1000000     # high-priority
  shutdownGracePeriodSeconds: 20
- priority: 0           # default and below
  shutdownGracePeriodSeconds: 10

featureGates:
  GracefulNodeShutdown: true
  GracefulNodeShutdownBasedOnPodPriority: true
```

This configuration gives each priority level a specific shutdown window.

## Monitoring Shutdown Events

Track shutdown events with logging and metrics:

```bash
# Watch for shutdown events in kubelet logs
journalctl -u kubelet -f | grep -i shutdown

# Check for pod termination events
kubectl get events --all-namespaces \
  --field-selector reason=NodeShutdown

# View pod status during shutdown
kubectl get pods --all-namespaces -o wide

# Monitor from another node
watch -n 1 kubectl get nodes
```

Create alerts for unexpected shutdowns:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: monitoring
data:
  alerts.yml: |
    groups:
    - name: node-shutdown
      interval: 30s
      rules:
      - alert: NodeGracefulShutdown
        expr: kubelet_graceful_shutdown_start_time_seconds > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Node {{ $labels.node }} is shutting down gracefully"
          description: "Node is going through graceful shutdown process"
```

## Handling Stateful Applications

For StatefulSets, ensure proper shutdown order:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cassandra
spec:
  serviceName: cassandra
  replicas: 3
  podManagementPolicy: OrderedReady
  selector:
    matchLabels:
      app: cassandra
  template:
    metadata:
      labels:
        app: cassandra
    spec:
      priorityClassName: system-cluster-critical
      terminationGracePeriodSeconds: 60
      containers:
      - name: cassandra
        image: cassandra:4.1
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - |
                # Disable thrift and binary protocols
                nodetool disablethrift
                nodetool disablebinary
                # Drain the node
                nodetool drain
                # Wait for drain to complete
                sleep 30
        ports:
        - containerPort: 9042
```

## Troubleshooting Shutdown Issues

Debug problems with graceful shutdown:

```bash
# Check if graceful shutdown is enabled
kubectl get --raw /api/v1/nodes/<node-name>/proxy/configz | \
  jq '.kubeletconfig.shutdownGracePeriod'

# Verify systemd integration
systemctl show kubelet.service | grep InhibitDelayMaxSec

# Check for pods that did not terminate gracefully
kubectl get events --all-namespaces | grep -i kill

# View detailed kubelet shutdown logs
journalctl -u kubelet -o json | \
  jq 'select(.MESSAGE | contains("shutdown"))'

# Test inhibitor lock mechanism
systemd-inhibit --list

# Monitor shutdown duration
journalctl -u kubelet --since "10 minutes ago" | \
  grep -E "shutdown|termination" | \
  awk '{print $1, $2, $3}'
```

Graceful node shutdown prevents data loss and service disruptions during planned and unplanned node restarts. Configure appropriate grace periods for your workloads, use priority classes to control shutdown order, and implement preStop hooks for clean application termination.
