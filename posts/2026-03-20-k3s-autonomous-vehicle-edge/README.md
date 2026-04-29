# How to Configure K3s for Autonomous Vehicle Edge Computing - Edge

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Edge Computing, Autonomous Vehicle, AI/ML, NVIDIA, Real-Time, Kubernetes

Description: Learn how to configure K3s for autonomous vehicle edge computing, including real-time workload scheduling, GPU access for perception pipelines, and safety-critical deployment patterns.

---

Autonomous vehicles require edge computing stacks that are deterministic, fault-tolerant, and capable of running AI perception workloads at high frequency. K3s provides a lightweight Kubernetes foundation for this demanding environment.

---

## System Requirements

- NVIDIA Orin or Jetson AGX module (or equivalent industrial edge GPU)
- Real-time kernel patch (PREEMPT_RT) recommended
- Minimum 16GB RAM, 64GB NVMe storage
- JetPack SDK 6.x for NVIDIA platforms

---

## Step 1: Install K3s with Real-Time Optimizations

```yaml
# /etc/rancher/k3s/config.yaml

disable:
  - traefik
  - servicelb
  - metrics-server

kubelet-arg:
  # Reserve resources for the vehicle OS and safety systems
  - "kube-reserved=cpu=2,memory=4Gi"
  - "system-reserved=cpu=2,memory=4Gi"
  # Set CPU manager policy for exclusive core allocation
  - "cpu-manager-policy=static"
  # Disable CFS quota enforcement for containers with CPU limits
  - "cpu-cfs-quota=false"
  - "topology-manager-policy=single-numa-node"
```

---

## Step 2: Configure CPU Pinning for Perception Pods

Request dedicated CPU cores for latency-sensitive perception workloads:

```yaml
# perception-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: perception-pipeline
  namespace: autonomous
spec:
  selector:
    matchLabels:
      app: perception-pipeline
  template:
    metadata:
      labels:
        app: perception-pipeline
    spec:
      containers:
        - name: lidar-processor
          image: vehicle-registry/lidar-processor:v3.2
          resources:
            # Guaranteed QoS + integer CPU requests enable exclusive CPU allocation
            requests:
              cpu: "4"
              memory: 8Gi
              nvidia.com/gpu: "1"
            limits:
              cpu: "4"
              memory: 8Gi
              nvidia.com/gpu: "1"
```

---

## Step 3: Deploy Safety-Critical Workloads with Priority Classes

Define priority classes so the scheduler can preempt lower-priority pods when safety-critical components need capacity:

```yaml
# Highest priority for safety-critical systems
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: safety-critical
value: 1000000
globalDefault: false
description: "Safety-critical vehicle control systems"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: perception
value: 900000
---
# Use in pod specs
spec:
  priorityClassName: safety-critical
```

---

## Step 4: Configure Sensor Data Pipeline

Stream sensor data through a local message bus (ROS2/DDS or Kafka):

```yaml
# ros2-bridge-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ros2-bridge
  namespace: autonomous
spec:
  selector:
    matchLabels:
      app: ros2-bridge
  template:
    metadata:
      labels:
        app: ros2-bridge
    spec:
      # Access DDS network interfaces directly from the host namespace
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      containers:
        - name: ros2-bridge
          image: vehicle-registry/ros2-bridge:humble
          env:
            - name: ROS_DOMAIN_ID
              value: "42"
            - name: RMW_IMPLEMENTATION
              value: "rmw_cyclonedds_cpp"
```

---

## Step 5: Implement Health Monitoring and Failsafe

Use Kubernetes liveness probes with strict timeouts for safety-critical pods:

```yaml
livenessProbe:
  exec:
    command:
      - /bin/sh
      - -c
      - "test $(cat /tmp/heartbeat_age) -lt 100"   # heartbeat must be < 100ms old
  initialDelaySeconds: 5
  periodSeconds: 1        # check every second
  failureThreshold: 3     # fail after 3 consecutive failures
  timeoutSeconds: 1
```

---

## Best Practices

- Use a **separate safety partition** outside Kubernetes for the lowest-level safety monitors that must survive a Kubernetes crash.
- Enable **watchdog timers** at the hardware level to reboot unresponsive nodes.
- Use **immutable container images** with digest pinning to guarantee deterministic software versions.
- Validate latency budgets in a simulation environment before deploying to physical vehicles.
