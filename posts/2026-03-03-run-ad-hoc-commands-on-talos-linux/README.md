# How to Run Ad-Hoc Commands on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, talosctl, Commands, Debugging, Kubernetes, System Administration

Description: Practical techniques for running ad-hoc commands on Talos Linux nodes despite the absence of shell access or SSH.

---

Running a quick command on a server is something every administrator does daily. Check disk space, look at a process list, test network connectivity - these are bread-and-butter operations. On a traditional Linux server, you SSH in and run whatever you need. On Talos Linux, there is no SSH and no shell. So how do you run ad-hoc commands?

The answer involves a combination of talosctl built-in capabilities, Kubernetes debug containers, and a shift in how you think about node management. This guide covers all the practical approaches.

## talosctl Built-In Commands

Talos Linux exposes many common operations directly through talosctl. These cover most of what you would typically SSH in to check:

### Process Information

```bash
# List running processes (similar to ps aux)
talosctl processes --nodes 192.168.1.10

# Get system stats (similar to top)
talosctl stats --nodes 192.168.1.10
```

### Memory and CPU

```bash
# Check memory usage
talosctl memory --nodes 192.168.1.10

# Read detailed CPU info
talosctl read --nodes 192.168.1.10 /proc/cpuinfo

# Check system load
talosctl read --nodes 192.168.1.10 /proc/loadavg
```

### Disk and Storage

```bash
# List disks and partitions
talosctl disks --nodes 192.168.1.10

# Check mount points
talosctl mounts --nodes 192.168.1.10

# Read disk usage from /proc
talosctl read --nodes 192.168.1.10 /proc/diskstats
```

### Network

```bash
# List network interfaces and IP addresses
talosctl get addresses --nodes 192.168.1.10

# Check routing table
talosctl get routes --nodes 192.168.1.10

# List network links
talosctl get links --nodes 192.168.1.10

# Check DNS resolver configuration
talosctl get resolvers --nodes 192.168.1.10
```

### Logs

```bash
# View service logs
talosctl logs kubelet --nodes 192.168.1.10
talosctl logs etcd --nodes 192.168.1.10

# Follow logs in real time
talosctl logs kubelet --nodes 192.168.1.10 --follow

# View kernel messages
talosctl dmesg --nodes 192.168.1.10
```

## Using kubectl debug for Node-Level Commands

When talosctl does not have a built-in command for what you need, kubectl debug is your next option. It creates a privileged pod on the target node with access to the host filesystem and namespaces:

```bash
# Start a debug session on a specific node
kubectl debug node/talos-worker-1 -it --image=nicolaka/netshoot -- bash
```

The `netshoot` image is particularly useful because it includes networking tools like curl, dig, nslookup, ping, traceroute, tcpdump, and more.

Inside the debug session, the host filesystem is mounted at `/host`:

```bash
# Inside the debug container

# Check disk usage
df -h /host/

# List processes in the host PID namespace
ps aux

# Run network diagnostics
ping 8.8.8.8
dig kubernetes.default.svc.cluster.local
curl -k https://localhost:6443/healthz

# Check iptables rules
iptables -L -n

# Capture network traffic
tcpdump -i eth0 -c 100 port 6443
```

When you are done, exit the session and clean up:

```bash
# Exit the debug session
exit

# Delete the debug pod
kubectl delete pod <debug-pod-name>
```

## Using Privileged DaemonSets for Recurring Tasks

If you frequently need to run the same type of command across multiple nodes, a DaemonSet is more efficient than individual debug sessions:

```yaml
# Run a diagnostic tool on every node
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-diagnostics
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: node-diagnostics
  template:
    metadata:
      labels:
        app: node-diagnostics
    spec:
      hostNetwork: true
      hostPID: true
      containers:
        - name: diagnostics
          image: nicolaka/netshoot
          # Keep the container running so we can exec into it
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
      tolerations:
        - operator: Exists
```

Then exec into the pod on any node:

```bash
# List the diagnostic pods
kubectl get pods -n kube-system -l app=node-diagnostics -o wide

# Exec into the pod on a specific node
kubectl exec -it -n kube-system node-diagnostics-xxxxx -- bash
```

## Using talosctl Containers Command

You can interact with containers running on the node directly through talosctl:

```bash
# List Talos system containers
talosctl containers --nodes 192.168.1.10

# List Kubernetes containers
talosctl containers --nodes 192.168.1.10 -k

# View logs from a specific container
talosctl logs --nodes 192.168.1.10 -k <container-id>
```

## Running Network Diagnostics

Network issues are the most common reason people want to run ad-hoc commands. Here are approaches for common network diagnostic tasks:

### Testing DNS Resolution

```bash
# Check the DNS resolver configuration
talosctl get resolvers --nodes 192.168.1.10

# Use a debug pod to test DNS
kubectl run dns-test --rm -it --image=busybox --restart=Never -- nslookup kubernetes.default
```

### Testing Connectivity Between Nodes

```bash
# Check if nodes can reach each other
# From a debug pod on one node:
kubectl debug node/talos-worker-1 -it --image=busybox -- ping -c 3 192.168.1.11
```

### Checking Port Availability

```bash
# Test if a port is open on a node
kubectl debug node/talos-worker-1 -it --image=nicolaka/netshoot -- \
  nc -zv 192.168.1.10 6443
```

## Using talosctl pcap for Packet Capture

Talos provides built-in packet capture without needing to install tcpdump:

```bash
# Capture packets on a specific interface
talosctl pcap --nodes 192.168.1.10 --interface eth0 --output /tmp/capture.pcap

# Capture with a duration limit
talosctl pcap --nodes 192.168.1.10 --interface eth0 --duration 30s --output /tmp/capture.pcap
```

You can then analyze the capture file with Wireshark or tcpdump on your local machine.

## Checking Kubernetes Component Health

For Kubernetes-specific diagnostics:

```bash
# Check kubelet health
talosctl service kubelet --nodes 192.168.1.10

# Check etcd health (control plane nodes)
talosctl etcd status --nodes 192.168.1.10

# Check etcd alarms
talosctl etcd alarm list --nodes 192.168.1.10

# Check Kubernetes API server health through kubelet
kubectl get --raw /healthz
```

## Automating Common Checks

Create shell scripts on your workstation that combine multiple talosctl commands for common diagnostic workflows:

```bash
#!/bin/bash
# node-health-check.sh - Quick health check for a Talos node

NODE=$1

echo "=== Services ==="
talosctl services --nodes $NODE

echo "=== Memory ==="
talosctl memory --nodes $NODE

echo "=== Disks ==="
talosctl disks --nodes $NODE

echo "=== Recent Events ==="
talosctl get events --nodes $NODE

echo "=== Recent Kernel Messages ==="
talosctl dmesg --nodes $NODE | tail -20
```

Run it with:

```bash
chmod +x node-health-check.sh
./node-health-check.sh 192.168.1.10
```

## Thinking Differently About Node Management

The shift from SSH-based management to API-based management takes some getting used to. The key insight is that most ad-hoc commands fall into a few categories:

1. **Status checks** - talosctl has dedicated commands for these
2. **Network diagnostics** - use kubectl debug or talosctl pcap
3. **File inspection** - use talosctl read and list
4. **Log analysis** - use talosctl logs
5. **Configuration verification** - use talosctl get machineconfig

For each category, there is a Talos-native way to get the information you need. The initial learning curve is worth the security and consistency benefits you get in return.

## Conclusion

While Talos Linux does not offer direct shell access, you have multiple tools at your disposal for running ad-hoc commands. The talosctl CLI covers the most common operations natively, kubectl debug fills in the gaps for more complex diagnostics, and privileged pods provide full node access when needed. The key is knowing which tool to reach for in each situation and building familiarity with the talosctl command set so it becomes second nature.
