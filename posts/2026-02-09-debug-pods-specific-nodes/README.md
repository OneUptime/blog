# How to Configure Debug Pods on Specific Nodes for Node-Level Troubleshooting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Debugging, Nodes

Description: Learn how to deploy debug pods on specific Kubernetes nodes for node-level troubleshooting, hardware diagnosis, and infrastructure debugging.

---

Sometimes issues are specific to individual nodes rather than pods or applications. Network configuration differences, disk performance problems, kernel issues, and hardware failures require debugging at the node level. Debug pods scheduled on specific nodes give you a shell environment on that node with elevated privileges to diagnose these infrastructure problems.

This approach is essential when troubleshooting node-specific issues, investigating hardware problems, debugging network connectivity at the node level, and examining node-local resources.

## Understanding Node Debug Pods

Node debug pods are privileged containers that run directly on a specific node with access to the node's filesystem, network, and processes. They're typically configured with hostNetwork, hostPID, and hostIPC to provide full visibility into node operations.

## Creating a Basic Node Debug Pod

Deploy a debug pod on a specific node:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: node-debug
  namespace: default
spec:
  nodeName: worker-node-01  # Pin to specific node
  hostNetwork: true
  hostPID: true
  hostIPC: true
  containers:
  - name: debug
    image: nicolaka/netshoot
    command: ["sleep", "infinity"]
    securityContext:
      privileged: true
    volumeMounts:
    - name: host-root
      mountPath: /host
      readOnly: false
  volumes:
  - name: host-root
    hostPath:
      path: /
      type: Directory
```

Apply and access:

```bash
kubectl apply -f node-debug.yaml
kubectl exec -it node-debug -- bash

# Inside the pod, you have access to the entire node
ls /host
chroot /host
```

## Using kubectl debug for Node Debugging

Kubernetes 1.20+ provides built-in node debugging:

```bash
# Create a debug pod on a specific node
kubectl debug node/worker-node-01 -it --image=ubuntu

# This automatically:
# - Creates a privileged pod on the node
# - Mounts the host filesystem at /host
# - Gives you a shell

# Inside the debug pod:
chroot /host
# Now you're effectively on the node
systemctl status kubelet
journalctl -u kubelet -n 50
```

## Node Selector for Debug Pods

Use node selectors for targeted debugging:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: debug-high-memory-nodes
spec:
  nodeSelector:
    node-type: high-memory
  hostNetwork: true
  containers:
  - name: debug
    image: ubuntu:22.04
    command: ["sleep", "infinity"]
    securityContext:
      privileged: true
```

## Node Affinity for Complex Scheduling

Use node affinity for advanced node selection:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: debug-ssd-nodes
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: disk-type
            operator: In
            values:
            - ssd
            - nvme
  hostNetwork: true
  hostPID: true
  containers:
  - name: debug
    image: ubuntu:22.04
    command: ["sleep", "infinity"]
    securityContext:
      privileged: true
    volumeMounts:
    - name: host-root
      mountPath: /host
  volumes:
  - name: host-root
    hostPath:
      path: /
```

## DaemonSet for Debugging All Nodes

Deploy debug containers on all nodes:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-debugger
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: node-debugger
  template:
    metadata:
      labels:
        app: node-debugger
    spec:
      hostNetwork: true
      hostPID: true
      hostIPC: true
      tolerations:
      - effect: NoSchedule
        operator: Exists
      - effect: NoExecute
        operator: Exists
      containers:
      - name: debugger
        image: nicolaka/netshoot
        command: ["sleep", "infinity"]
        securityContext:
          privileged: true
        resources:
          limits:
            memory: 200Mi
            cpu: 100m
          requests:
            memory: 100Mi
            cpu: 50m
        volumeMounts:
        - name: host-root
          mountPath: /host
          readOnly: false
        - name: host-sys
          mountPath: /sys
        - name: host-proc
          mountPath: /host-proc
          readOnly: true
      volumes:
      - name: host-root
        hostPath:
          path: /
      - name: host-sys
        hostPath:
          path: /sys
      - name: host-proc
        hostPath:
          path: /proc
```

Access any node:

```bash
# List debug pods
kubectl get pods -n kube-system -l app=node-debugger -o wide

# Exec into pod on specific node
NODE_NAME="worker-node-01"
POD_NAME=$(kubectl get pod -n kube-system -l app=node-debugger \
  --field-selector spec.nodeName=$NODE_NAME -o jsonpath='{.items[0].metadata.name}')

kubectl exec -it -n kube-system $POD_NAME -- bash
```

## Debugging Node Network Issues

Diagnose node-level networking:

```bash
# Deploy debug pod on problematic node
kubectl debug node/problem-node -it --image=nicolaka/netshoot

# Inside the debug container:
chroot /host

# Check network interfaces
ip addr show
ip link show

# Check routing tables
ip route show
route -n

# Check iptables rules
iptables -L -n -v
iptables -t nat -L -n -v

# Check conntrack
conntrack -L

# Test DNS from node
nslookup kubernetes.default
dig kubernetes.default.svc.cluster.local

# Check kubelet network
netstat -tulpn | grep kubelet

# Ping other nodes
ping other-node-ip

# Trace route to services
traceroute service-ip
```

## Debugging Node Disk Issues

Investigate disk problems:

```bash
# Debug pod on node with disk issues
kubectl debug node/disk-problem-node -it --image=ubuntu

chroot /host

# Check disk usage
df -h
du -sh /var/lib/kubelet/*

# Check inode usage
df -i

# Check disk I/O
iostat -x 1 5
iotop

# Check for disk errors
dmesg | grep -i error
journalctl -k | grep -i "i/o error"

# Check SMART status
smartctl -a /dev/sda

# Test disk performance
dd if=/dev/zero of=/tmp/test bs=1M count=1000
fio --name=test --rw=randread --bs=4k --size=1G
```

## Debugging Node CPU and Memory

Investigate performance issues:

```bash
# Debug pod on problematic node
kubectl debug node/slow-node -it --image=ubuntu

chroot /host

# Check CPU usage
top
htop
mpstat -P ALL 1 5

# Check load average
uptime
cat /proc/loadavg

# Check memory usage
free -h
cat /proc/meminfo

# Check for OOM events
dmesg | grep -i "out of memory"
journalctl | grep -i "oom"

# Check swap usage
swapon -s
vmstat 1 5

# Check process memory
ps aux --sort=-%mem | head -20

# Check CPU throttling
cat /sys/fs/cgroup/cpu/cpu.stat
```

## Debugging Kubelet Issues

Troubleshoot kubelet problems:

```bash
# Debug pod on node with kubelet issues
kubectl debug node/kubelet-problem-node -it --image=ubuntu

chroot /host

# Check kubelet status
systemctl status kubelet

# View kubelet logs
journalctl -u kubelet -n 100 --no-pager

# Follow kubelet logs
journalctl -u kubelet -f

# Check kubelet config
cat /var/lib/kubelet/config.yaml

# Check kubelet certificates
openssl x509 -in /var/lib/kubelet/pki/kubelet-client-current.pem -text -noout

# Restart kubelet
systemctl restart kubelet

# Check kubelet metrics
curl http://localhost:10250/metrics
```

## Automated Node Diagnosis Script

Create a comprehensive node diagnostic script:

```bash
#!/bin/bash
# Save as diagnose-node.sh

NODE_NAME=$1

if [ -z "$NODE_NAME" ]; then
    echo "Usage: $0 <node-name>"
    exit 1
fi

echo "=== Node Diagnostics for: $NODE_NAME ==="
echo

# Create debug pod
echo "Creating debug pod on node..."
kubectl debug node/$NODE_NAME -it --image=ubuntu -- bash -c '
chroot /host bash <<EOF
echo "=== System Information ==="
uname -a
uptime
echo

echo "=== CPU Info ==="
lscpu
echo

echo "=== Memory Info ==="
free -h
echo

echo "=== Disk Usage ==="
df -h
echo

echo "=== Network Interfaces ==="
ip addr show
echo

echo "=== Kubelet Status ==="
systemctl status kubelet --no-pager
echo

echo "=== Recent Kubelet Logs ==="
journalctl -u kubelet -n 20 --no-pager
echo

echo "=== Kernel Messages ==="
dmesg | tail -50
echo

echo "=== Container Runtime ==="
crictl version
crictl ps | head -10
echo

echo "=== Running Processes ==="
ps aux --sort=-%mem | head -20

EOF
'
```

## Node Debug Pod with Extended Tools

Create a comprehensive debug image:

```dockerfile
# Dockerfile for node-debug image
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    curl \
    wget \
    vim \
    net-tools \
    iproute2 \
    iputils-ping \
    dnsutils \
    tcpdump \
    strace \
    htop \
    iotop \
    sysstat \
    procps \
    lsof \
    ethtool \
    iperf3 \
    nmap \
    smartmontools \
    && rm -rf /var/lib/apt/lists/*

CMD ["sleep", "infinity"]
```

Build and use:

```bash
docker build -t node-debug:latest .
docker push registry.example.com/node-debug:latest

# Use in debug pod
kubectl debug node/my-node -it --image=registry.example.com/node-debug:latest
```

## Quick Node Debug Command

Create a wrapper script:

```bash
#!/bin/bash
# Save as kubectl-node-debug

NODE_NAME=$1
IMAGE=${2:-nicolaka/netshoot}

if [ -z "$NODE_NAME" ]; then
    echo "Usage: kubectl node-debug <node-name> [image]"
    exit 1
fi

echo "Starting debug session on node: $NODE_NAME"
echo "Using image: $IMAGE"
echo "To access node filesystem: chroot /host"
echo

kubectl debug node/$NODE_NAME -it --image=$IMAGE

# Usage:
# kubectl node-debug worker-01
# kubectl node-debug worker-01 ubuntu:22.04
```

## Cleaning Up Debug Resources

Remove debug pods after troubleshooting:

```bash
# Delete specific debug pod
kubectl delete pod node-debug

# Delete all debug pods
kubectl delete pod -l purpose=debug

# Delete debug DaemonSet
kubectl delete daemonset -n kube-system node-debugger

# Find and delete kubectl debug pods
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.metadata.name | startswith("node-debugger-")) | "\(.metadata.namespace) \(.metadata.name)"' | \
  xargs -n 2 kubectl delete pod -n
```

## Best Practices

Always clean up debug pods after troubleshooting. Use privileged pods only when necessary. Document findings from node debugging sessions. Consider security implications of hostNetwork and privileged mode. Use DaemonSets for cluster-wide node debugging. Implement proper RBAC for node debugging capabilities. Monitor debug pod resource usage.

Node-level debugging with targeted debug pods provides essential visibility into infrastructure issues that cannot be diagnosed from application containers alone.
