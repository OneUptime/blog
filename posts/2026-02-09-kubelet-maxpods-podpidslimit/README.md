# How to Configure kubelet maxPods and podPidsLimit for Node Capacity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubelet, Capacity Planning

Description: Learn how to configure kubelet maxPods and podPidsLimit settings to control node capacity, prevent resource exhaustion, and optimize pod density based on node size and workload characteristics.

---

The kubelet enforces limits on how many pods can run on a node and how many processes each pod can spawn. These limits prevent resource exhaustion and ensure nodes remain stable under load. Default values are conservative, but tuning them based on your node specifications and workload patterns can improve cluster utilization or provide additional safety margins.

This guide covers how to configure maxPods and podPidsLimit for different scenarios and understand their impact on cluster capacity.

## Understanding maxPods

The `maxPods` setting limits the maximum number of pods the kubelet will run on a node. The default is 110 pods per node, but this may be too high or too low depending on your infrastructure.

Factors affecting optimal maxPods value:
- Node resources (CPU, memory, network)
- Pod resource requirements
- IP address availability (depends on CNI plugin)
- Control plane scalability
- Network interface limits

## Viewing Current maxPods Configuration

Check the current maxPods setting:

```bash
# View kubelet configuration
cat /var/lib/kubelet/config.yaml | grep maxPods

# Or check kubelet process arguments
ps aux | grep kubelet | grep max-pods

# Check node capacity
kubectl describe node <node-name> | grep "pods:"
# Shows: pods: 110 (or whatever maxPods is set to)

# View actual pod count on node
kubectl get pods --all-namespaces --field-selector spec.nodeName=<node-name> --no-headers | wc -l
```

## Configuring maxPods in kubelet Config

Set maxPods in the kubelet configuration file:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
maxPods: 250
```

Apply the configuration:

```bash
# Edit configuration
sudo vim /var/lib/kubelet/config.yaml

# Restart kubelet
sudo systemctl restart kubelet

# Verify new limit
kubectl describe node <node-name> | grep "Allocatable:" -A 5
```

## Setting maxPods with kubeadm

Configure maxPods during cluster initialization:

```yaml
# kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
---
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
maxPods: 200
```

Initialize or join cluster:

```bash
# Initialize control plane
sudo kubeadm init --config kubeadm-config.yaml

# Join worker nodes
sudo kubeadm join <endpoint> --config kubeadm-config.yaml
```

## Calculating Appropriate maxPods Values

Consider these factors when setting maxPods:

**1. IP Address Availability**

For CNI plugins with limited IP space:

```bash
# Example: Subnet provides 254 IPs
# Subtract: 1 for network, 1 for broadcast, 1 for gateway = 251 usable
# Subtract: 2-3 for node itself
# Maximum pods: ~248

maxPods: 240  # Leave buffer for safety
```

**2. Node Resources**

Calculate based on average pod resource usage:

```
Node Memory: 32GB
System Reserved: 2GB
Kube Reserved: 2GB
Available: 28GB

Average pod memory: 256MB
Max pods by memory: 28GB / 256MB = 112 pods

Set maxPods: 110  # Slightly below calculated maximum
```

**3. Network Performance**

More pods mean more network connections:

```yaml
# High network throughput node (10Gbps+)
maxPods: 250

# Standard network node (1Gbps)
maxPods: 110

# Limited network node
maxPods: 50
```

## Configuring Node-Specific maxPods

For heterogeneous clusters, set different maxPods per node type:

```bash
# Small nodes (4 CPU, 8GB RAM)
# /var/lib/kubelet/config.yaml on small nodes
maxPods: 30

# Medium nodes (8 CPU, 16GB RAM)
maxPods: 70

# Large nodes (16 CPU, 32GB RAM)
maxPods: 150

# Extra large nodes (32+ CPU, 64+ GB RAM)
maxPods: 250
```

Or use kubelet flags:

```bash
# Add to /etc/systemd/system/kubelet.service.d/10-kubeadm.conf
Environment="KUBELET_EXTRA_ARGS=--max-pods=150"

sudo systemctl daemon-reload
sudo systemctl restart kubelet
```

## Understanding podPidsLimit

The `podPidsLimit` setting controls the maximum number of processes (PIDs) a pod can create. This prevents fork bombs and runaway processes from consuming all available PIDs on the node.

Default behavior varies by system:
- If not set, inherits from node's PID cgroup limit
- Common default: 4096 PIDs per pod

## Configuring podPidsLimit

Set PID limit in kubelet configuration:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
podPidsLimit: 4096
```

For different use cases:

```yaml
# Conservative (prevents runaway processes)
podPidsLimit: 1024

# Standard (most workloads)
podPidsLimit: 4096

# Permissive (for workloads that need many processes)
podPidsLimit: 16384

# Unlimited (not recommended)
podPidsLimit: -1
```

## Monitoring PID Usage

Track PID usage per pod:

```bash
# View PID usage on a node
for pod in $(crictl pods -q); do
  echo "Pod: $pod"
  crictl inspect $pod | jq -r '.info.runtimeSpec.linux.resources.pids.limit'
  crictl stats $pod | grep -i pid
done

# Check system-wide PID usage
cat /proc/sys/kernel/pid_max
ps aux | wc -l

# View cgroup PID limits
cat /sys/fs/cgroup/pids/pids.max
```

Create Prometheus queries:

```promql
# PID usage per container
container_processes

# Pods approaching PID limit
container_processes / container_spec_pids_limit > 0.8
```

## Setting Up Alerts for Capacity Issues

Create alerts for pod capacity and PID limits:

```yaml
# capacity-alerts.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-capacity-alerts
data:
  alerts.yml: |
    groups:
    - name: node_capacity
      rules:
      - alert: NodeApproachingMaxPods
        expr: |
          (kube_node_status_allocatable{resource="pods"}
          - on(node) kube_pod_info) < 10
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Node approaching maxPods limit"
          description: "Node {{ $labels.node }} has less than 10 pod slots available"

      - alert: PodNearPIDLimit
        expr: container_processes / container_spec_pids_limit > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Pod approaching PID limit"
          description: "Pod {{ $labels.pod }} using {{ $value | humanizePercentage }} of PID limit"

      - alert: NodeAtMaxPods
        expr: |
          kube_node_status_allocatable{resource="pods"}
          == on(node) count(kube_pod_info) by (node)
        for: 30m
        labels:
          severity: info
        annotations:
          summary: "Node at maxPods capacity"
          description: "Node {{ $labels.node }} is at maximum pod capacity"
```

## Testing maxPods Configuration

Test the maxPods limit:

```bash
# Create many test pods
for i in {1..200}; do
  kubectl run test-pod-$i --image=nginx --restart=Never --overrides='{"spec":{"nodeName":"<node-name>"}}' &
done

# Check how many actually scheduled
kubectl get pods --field-selector spec.nodeName=<node-name> --no-headers | wc -l

# Check for pending pods
kubectl get pods --field-selector status.phase=Pending

# Describe pending pod to see reason
kubectl describe pod <pending-pod-name>
# Should show: 0/1 nodes are available: 1 Too many pods.

# Cleanup
kubectl delete pod -l run=test-pod
```

## Testing podPidsLimit

Create a pod that spawns many processes:

```yaml
# pid-bomb-test.yaml
apiVersion: v1
kind: Pod
metadata:
  name: pid-test
spec:
  containers:
  - name: fork-bomb
    image: busybox
    command:
    - sh
    - -c
    - |
      # Spawn processes until limit hit
      for i in $(seq 1 10000); do
        sleep 3600 &
      done
      wait
```

Deploy and monitor:

```bash
kubectl apply -f pid-bomb-test.yaml

# Watch PID usage
kubectl exec pid-test -- ps aux | wc -l

# Check if container was killed for exceeding PID limit
kubectl describe pod pid-test | grep -i pid
```

## Balancing maxPods with Other Limits

Coordinate maxPods with related settings:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
# Pod limit
maxPods: 110

# PID limit per pod
podPidsLimit: 4096

# Reserve resources
systemReserved:
  cpu: "1000m"
  memory: "2Gi"
  ephemeral-storage: "10Gi"
kubeReserved:
  cpu: "1000m"
  memory: "2Gi"
  ephemeral-storage: "10Gi"

# Eviction thresholds
evictionHard:
  memory.available: "500Mi"
  nodefs.available: "10%"
  pid.available: "5%"
```

## Impact on Cluster Capacity

Example capacity calculation:

```
Cluster: 10 nodes
maxPods per node: 110
Total cluster capacity: 10 × 110 = 1,100 pods

Increase maxPods to 200:
Total cluster capacity: 10 × 200 = 2,000 pods
Capacity increase: 81.8%

But verify:
- IP addresses available?
- Control plane can handle load?
- Node resources sufficient?
```

## Best Practices

1. **Start conservative**: Use lower maxPods initially, increase based on monitoring

2. **Match to node size**: Larger nodes should have higher maxPods

3. **Consider CNI limits**: Check IP address availability for your CNI plugin

4. **Monitor utilization**: Track actual pod count vs maxPods capacity

5. **Set podPidsLimit**: Prevent runaway processes from exhausting PIDs

6. **Test under load**: Validate node stability at high pod counts

7. **Plan for bursts**: Leave headroom for temporary pod count increases

Example production configuration:

```yaml
# Small node (4 CPU, 8GB RAM)
maxPods: 40
podPidsLimit: 2048

# Medium node (8 CPU, 16GB RAM)
maxPods: 80
podPidsLimit: 4096

# Large node (16 CPU, 32GB RAM)
maxPods: 150
podPidsLimit: 8192
```

Properly configuring maxPods and podPidsLimit ensures nodes operate within safe capacity limits while maximizing cluster utilization. Tune these values based on node specifications, network capabilities, and workload characteristics, and monitor actual usage to validate your configuration choices.
