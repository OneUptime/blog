# How to Configure Resource-Constrained Kubernetes Nodes with K3s Memory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, k3s, Resource Management, Edge Computing, Performance

Description: Learn how to configure K3s on resource-constrained devices with proper memory and CPU limits, including system reservation, eviction policies, and workload optimization for edge deployments.

---

K3s brings Kubernetes to resource-constrained environments, but running a production cluster on devices with limited CPU and memory requires careful configuration. Without proper resource management, nodes can become unstable when workloads compete for scarce resources, leading to pod evictions, system crashes, and unpredictable behavior.

In this guide, we'll configure K3s nodes with appropriate resource limits and reservations that ensure system stability while maximizing usable capacity. This configuration is critical for edge devices, IoT gateways, and embedded systems running K3s with minimal hardware.

## Understanding Resource Constraints in K3s

K3s reduces Kubernetes's memory footprint and supports agent nodes with as little as 512MB RAM, while server nodes require more capacity. However, the operating system, K3s components, and workloads all compete for these limited resources.

Kubernetes tracks two resource types: requests define the minimum resources guaranteed to a pod, while limits set the maximum a pod can consume. On resource-constrained nodes, proper request and limit configuration prevents resource exhaustion and maintains system stability.

K3s includes kubelet configuration options that reserve resources for system processes, define pod eviction thresholds, and control how the node responds to resource pressure. These settings create boundaries that protect critical system functions even when workloads consume all available resources.

## Configuring System Resource Reservations

Reserve CPU and memory for system daemons and K3s components to prevent workloads from starving critical processes. K3s accepts kubelet arguments during installation:

```bash
# Install K3s with system reservations

curl -sfL https://get.k3s.io | sh -s - \
  --kubelet-arg="system-reserved=cpu=500m,memory=256Mi" \
  --kubelet-arg="kube-reserved=cpu=500m,memory=384Mi" \
  --kubelet-arg="eviction-hard=memory.available<100Mi,nodefs.available<10%"
```

These reservations work as follows:
- `system-reserved` protects OS daemons (systemd, sshd, etc.)
- `kube-reserved` protects K3s components (kubelet, containerd)
- `eviction-hard` defines thresholds that trigger pod eviction

On a device with 2GB RAM, these settings reserve 640Mi for OS and Kubernetes daemons and keep a 100Mi eviction margin, leaving roughly 1.2-1.3Gi for workloads depending on node capacity reported by the OS.

## Creating Resource-Aware Node Configuration

For existing K3s installations, modify the configuration file to add resource management settings:

```bash
# Edit K3s configuration
sudo mkdir -p /etc/rancher/k3s
sudo vim /etc/rancher/k3s/config.yaml
```

Add kubelet arguments:

```yaml
# /etc/rancher/k3s/config.yaml
kubelet-arg:
  # System resource reservations
  - "system-reserved=cpu=500m,memory=256Mi"
  - "kube-reserved=cpu=500m,memory=384Mi"

  # Eviction thresholds
  - "eviction-hard=memory.available<100Mi,nodefs.available<10%"
  - "eviction-soft=memory.available<200Mi,nodefs.available<15%"
  - "eviction-soft-grace-period=memory.available=1m30s,nodefs.available=2m"

  # Eviction minimums
  - "eviction-minimum-reclaim=memory.available=100Mi,nodefs.available=5%"

  # Image garbage collection
  - "image-gc-high-threshold=70"
  - "image-gc-low-threshold=60"

  # Pod management
  - "max-pods=50"
```

Restart K3s to apply changes:

```bash
sudo systemctl restart k3s

# Verify new settings
kubectl describe node | grep -A 10 "Allocatable"
```

## Understanding Allocatable Resources

Kubernetes calculates allocatable resources using the formula:
```text
Allocatable = Capacity - Reserved - Eviction Threshold
```

View allocatable resources on your node:

```bash
kubectl get node -o json | jq '.items[0].status.allocatable'
```

Example output for a 2GB/2-core device:
```json
{
  "cpu": "1000m",
  "memory": "1300Mi",
  "pods": "50"
}
```

This shows that after reservations, 1 CPU core and about 1.3Gi RAM are available for workloads.

## Configuring Pod Resource Requests and Limits

Define appropriate resource requests and limits for workloads running on constrained nodes:

```yaml
# constrained-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: edge-service
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: edge-service
  template:
    metadata:
      labels:
        app: edge-service
    spec:
      containers:
      - name: app
        image: nginx:alpine
        resources:
          # Minimum guaranteed resources
          requests:
            cpu: "100m"
            memory: "64Mi"
          # Maximum allowed resources
          limits:
            cpu: "200m"
            memory: "128Mi"
        # Reduce memory footprint
        command: ["nginx", "-g", "daemon off; worker_processes 1;"]
```

Key principles for constrained environments:
- Set requests to minimum viable values
- Keep limits close to requests to prevent overcommitment
- Use alpine images to minimize memory usage
- Reduce worker processes and connection pools

## Implementing LimitRanges for Namespace Defaults

Create LimitRanges that enforce default resource limits in namespaces:

```yaml
# namespace-limits.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: edge-apps
---
apiVersion: v1
kind: LimitRange
metadata:
  name: mem-cpu-limits
  namespace: edge-apps
spec:
  limits:
  # Pod limits
  - max:
      cpu: "500m"
      memory: "256Mi"
    min:
      cpu: "50m"
      memory: "32Mi"
    type: Pod

  # Container defaults
  - default:
      cpu: "200m"
      memory: "128Mi"
    defaultRequest:
      cpu: "100m"
      memory: "64Mi"
    max:
      cpu: "500m"
      memory: "256Mi"
    min:
      cpu: "50m"
      memory: "32Mi"
    type: Container
```

Apply the limits:

```bash
kubectl apply -f namespace-limits.yaml

# Verify LimitRange
kubectl describe limitrange mem-cpu-limits -n edge-apps
```

Pods deployed without explicit resource requests inherit these defaults, preventing resource exhaustion.

## Configuring ResourceQuotas for Capacity Planning

Implement ResourceQuotas to limit total resource consumption per namespace:

```yaml
# namespace-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: edge-apps
spec:
  hard:
    # Limit total requests
    requests.cpu: "1000m"
    requests.memory: "1Gi"
    # Limit total limits
    limits.cpu: "1500m"
    limits.memory: "1280Mi"
    # Limit pod count
    pods: "20"
```

This prevents any single namespace from consuming all node resources:

```bash
kubectl apply -f namespace-quota.yaml

# Check quota usage
kubectl get resourcequota compute-quota -n edge-apps
```

## Optimizing K3s Component Resource Usage

Reduce K3s's own resource consumption for extremely constrained environments:

```bash
# Install K3s with minimal components
curl -sfL https://get.k3s.io | sh -s - \
  --disable=traefik \
  --disable=servicelb \
  --disable=metrics-server \
  --kubelet-arg="max-pods=30" \
  --kubelet-arg="image-gc-high-threshold=60" \
  --kubelet-arg="image-gc-low-threshold=50"
```

These options disable optional components and reduce pod capacity, freeing memory for workloads.

Kubelet pulls images serially by default, which keeps image downloads from competing heavily for disk I/O and memory. If you have previously enabled parallel image pulls, restore serial pulls in the K3s configuration:

```bash
# Edit K3s configuration
sudo vim /etc/rancher/k3s/config.yaml
```

Add the kubelet argument:

```yaml
kubelet-arg:
  - "serialize-image-pulls=true"
```

Avoid editing `/var/lib/rancher/k3s/agent/etc/containerd/config.toml` directly because K3s regenerates that file when it starts. Use a K3s-supported containerd config template only for advanced runtime customizations.

Restart K3s after changes:

```bash
sudo systemctl restart k3s
```

## Monitoring Resource Usage

Deploy lightweight monitoring to track resource consumption:

```yaml
# resource-monitor.yaml
apiVersion: v1
kind: Pod
metadata:
  name: resource-monitor
  namespace: kube-system
spec:
  hostNetwork: true
  hostPID: true
  containers:
  - name: node-exporter
    image: prom/node-exporter:latest
    args:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($|/)'
    ports:
    - containerPort: 9100
      name: metrics
    resources:
      requests:
        cpu: "50m"
        memory: "32Mi"
      limits:
        cpu: "100m"
        memory: "64Mi"
    volumeMounts:
    - name: proc
      mountPath: /host/proc
      readOnly: true
    - name: sys
      mountPath: /host/sys
      readOnly: true
  volumes:
  - name: proc
    hostPath:
      path: /proc
  - name: sys
    hostPath:
      path: /sys
```

Query node metrics:

```bash
kubectl port-forward -n kube-system pod/resource-monitor 9100:9100

# Check memory usage
curl -s localhost:9100/metrics | grep node_memory

# Check CPU usage
curl -s localhost:9100/metrics | grep node_cpu
```

## Handling Memory Pressure

Configure kubelet behavior under memory pressure:

```yaml
# memory-pressure-config.yaml
kubelet-arg:
  # Define memory pressure thresholds
  - "eviction-hard=memory.available<100Mi"
  - "eviction-soft=memory.available<200Mi"
  - "eviction-soft-grace-period=memory.available=1m30s"

  # Shorten the transition period for pressure conditions
  - "eviction-pressure-transition-period=30s"

  # Reclaim minimum memory
  - "eviction-minimum-reclaim=memory.available=100Mi"
```

When memory pressure occurs, kubelet first considers pods whose usage exceeds their requests, then ranks them by pod priority and by usage relative to requests. In practice, BestEffort pods and Burstable pods above their requests are the most likely eviction candidates, while Guaranteed pods and Burstable pods below their requests are evicted last.

Use a high PriorityClass for critical add-on pods that should be scheduled and rescheduled before regular workloads:

```yaml
# critical-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: critical-service
  namespace: kube-system
spec:
  priorityClassName: system-cluster-critical
  containers:
  - name: app
    image: critical-app:latest
    resources:
      requests:
        cpu: "100m"
        memory: "64Mi"
      limits:
        cpu: "100m"
        memory: "64Mi"
```

## Testing Resource Limits

Verify resource limits work correctly by deploying a memory-intensive pod:

```yaml
# memory-test.yaml
apiVersion: v1
kind: Pod
metadata:
  name: memory-test
spec:
  containers:
  - name: stress
    image: polinux/stress
    command: ["stress"]
    args: ["--vm", "1", "--vm-bytes", "256M", "--vm-hang", "0"]
    resources:
      requests:
        memory: "128Mi"
      limits:
        memory: "128Mi"
```

Deploy and observe OOMKilled behavior:

```bash
kubectl apply -f memory-test.yaml

# Watch pod status
kubectl get pod memory-test -w

# Pod should show OOMKilled status
kubectl describe pod memory-test
```

## Optimizing Workload Density

Maximize workload density on constrained nodes using these strategies:

```yaml
# high-density-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: efficient-workload
spec:
  replicas: 10
  selector:
    matchLabels:
      app: efficient
  template:
    metadata:
      labels:
        app: efficient
    spec:
      containers:
      - name: app
        # Use minimal base images
        image: busybox:latest
        command: ["sh", "-c", "while true; do sleep 30; done"]
        resources:
          # Minimal but guaranteed resources
          requests:
            cpu: "25m"
            memory: "16Mi"
          limits:
            cpu: "50m"
            memory: "32Mi"
        # Reduce filesystem overhead
        securityContext:
          readOnlyRootFilesystem: true
```

This deployment runs 10 replicas consuming only 160MB total, maximizing workload density.

## Conclusion

Configuring K3s for resource-constrained environments requires careful balancing of system reservations, eviction policies, and workload resource specifications. By implementing proper resource limits and monitoring, you can run stable K3s workloads on small nodes, including agent nodes with 512MB RAM and server nodes sized with enough additional capacity for control-plane components.

The key to success in constrained environments is conservative resource allocation, aggressive image size optimization, and comprehensive monitoring. These practices ensure that your edge nodes remain stable and responsive even under load.

For production edge deployments, regularly review resource usage patterns, adjust reservations based on actual consumption, and implement automated alerting for resource pressure conditions to maintain cluster stability.
