# How to Use kubectl Debug for Live Container Troubleshooting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Troubleshooting, kubectl, Debugging, DevOps

Description: A practical guide to using kubectl debug for live container troubleshooting, including ephemeral containers, node debugging, and advanced debugging techniques.

---

Production containers often lack debugging tools. `kubectl debug` lets you attach a debug container with full tooling to running pods or nodes without modifying the original workload.

## What Is kubectl debug?

`kubectl debug` creates ephemeral containers or debug pods to troubleshoot running workloads. It works even with distroless images that have no shell.

Requirements:
- Kubernetes 1.18+ (ephemeral containers in beta)
- Kubernetes 1.25+ (ephemeral containers GA)

## Debug Running Pods

### Basic Ephemeral Container

```bash
# Attach debug container to running pod
kubectl debug -it <pod-name> --image=busybox --target=<container-name>
```

This creates an ephemeral container in the same pod:
- Shares network namespace (same IP)
- Shares PID namespace (can see other processes)
- Can access same volumes

### Debug with Full Tools

```bash
# Use nicolaka/netshoot for network debugging
kubectl debug -it myapp-pod --image=nicolaka/netshoot --target=myapp

# Inside the debug container
netstat -tulpn
tcpdump -i eth0
curl localhost:8080
nslookup kubernetes.default
```

### Debug Distroless Containers

Distroless images have no shell, but you can still debug:

```bash
# Attach to distroless container
kubectl debug -it myapp-pod --image=busybox --target=myapp -- sh

# Now you can:
# - See processes (ps aux)
# - Check network (netstat, ss)
# - Read files (cat /proc/1/environ)
```

## Debug by Copying Pod

Create a copy of the pod with modifications:

```bash
# Copy pod with debug container
kubectl debug myapp-pod -it --copy-to=myapp-debug --container=debug --image=busybox

# Copy pod and change image
kubectl debug myapp-pod -it --copy-to=myapp-debug --set-image=myapp=myapp:debug

# Copy pod and change command (keep container running)
kubectl debug myapp-pod -it --copy-to=myapp-debug --container=myapp -- sleep infinity
```

### Debug CrashLoopBackOff Pods

When a container crashes too fast to exec into:

```bash
# Copy pod and override entrypoint
kubectl debug myapp-pod -it --copy-to=myapp-debug \
  --container=myapp \
  --share-processes \
  -- sh

# Inside, you can inspect:
ls -la /app
cat /app/config.yaml
env
```

## Debug Nodes

### Node Shell

```bash
# Get shell on node
kubectl debug node/<node-name> -it --image=busybox

# This creates a pod with host access:
# - hostNetwork: true
# - hostPID: true
# - hostIPC: true
# - Mounts host filesystem at /host
```

### Node Debugging Examples

```bash
# Debug node
kubectl debug node/worker-1 -it --image=busybox

# Inside the debug pod:

# Access host filesystem
chroot /host

# Check kubelet logs
journalctl -u kubelet -n 100

# Check system resources
top
free -m
df -h

# Check Docker/containerd
crictl ps
crictl logs <container-id>

# Network debugging
iptables -L -n
ip route
ss -tulpn
```

### Use Privileged Debug Image

```bash
kubectl debug node/<node-name> -it --image=ubuntu -- bash

# Install tools as needed
apt update && apt install -y tcpdump strace htop
```

## Advanced Debugging Techniques

### Process Debugging

```bash
# Share process namespace
kubectl debug -it myapp-pod --image=busybox --target=myapp --share-processes

# Now you can:
ps aux
cat /proc/1/status
cat /proc/1/environ | tr '\0' '\n'
ls -la /proc/1/fd/
```

### Network Debugging

```bash
kubectl debug -it myapp-pod --image=nicolaka/netshoot --target=myapp

# Check listening ports
ss -tulpn
netstat -an

# Test connectivity
curl -v http://other-service:8080
wget -O- http://kubernetes.default.svc/healthz

# DNS debugging
nslookup kubernetes.default
dig +search myservice

# Capture traffic
tcpdump -i eth0 -w /tmp/capture.pcap
# Copy pcap out later with kubectl cp

# Check routes
ip route
traceroute other-service
```

### Memory and CPU Analysis

```bash
kubectl debug -it myapp-pod --image=busybox --target=myapp

# Memory
cat /proc/meminfo
cat /sys/fs/cgroup/memory/memory.usage_in_bytes
cat /sys/fs/cgroup/memory/memory.limit_in_bytes

# CPU
cat /proc/cpuinfo
cat /sys/fs/cgroup/cpu/cpu.cfs_quota_us
cat /sys/fs/cgroup/cpu/cpu.cfs_period_us
```

### Java Application Debugging

```bash
kubectl debug -it myapp-pod --image=openjdk:11 --target=myapp

# Get Java process ID
jps

# Thread dump
jstack <pid>

# Heap dump (write to emptyDir volume)
jmap -dump:format=b,file=/tmp/heap.hprof <pid>

# GC stats
jstat -gc <pid>
```

### File System Inspection

```bash
kubectl debug -it myapp-pod --image=busybox --target=myapp

# Check files in container
ls -la /app
cat /app/config/settings.yaml
cat /etc/hosts
cat /etc/resolv.conf

# Check mounted volumes
mount | grep -v "^cgroup"
df -h
```

## Practical Debug Scenarios

### Scenario 1: Service Not Responding

```bash
# Debug network from the pod
kubectl debug -it myapp-pod --image=nicolaka/netshoot --target=myapp

# Is the app listening?
ss -tulpn | grep 8080

# Can we reach it locally?
curl -v localhost:8080/healthz

# Check DNS resolution
nslookup other-service.namespace.svc.cluster.local

# Check connectivity to other services
curl -v http://database:5432

# Check network policies
# (from node debug session)
iptables -L -n | grep DROP
```

### Scenario 2: Container Keeps Crashing

```bash
# Copy pod with sleep to keep it running
kubectl debug myapp-pod -it --copy-to=debug-pod \
  --container=myapp \
  -- sleep infinity

# Check configuration
cat /app/config.yaml
env | grep DATABASE

# Check permissions
ls -la /data
id

# Try running the actual command
/app/server --help
/app/server --dry-run
```

### Scenario 3: High Memory Usage

```bash
kubectl debug -it myapp-pod --image=alpine --target=myapp

# Install tools
apk add --no-cache procps

# Find memory hogs
ps aux --sort=-%mem | head -20

# Check cgroup limits
cat /sys/fs/cgroup/memory/memory.limit_in_bytes
cat /sys/fs/cgroup/memory/memory.usage_in_bytes

# Check for OOM events
dmesg | grep -i oom
```

### Scenario 4: Slow Database Queries

```bash
kubectl debug -it myapp-pod --image=postgres:15 --target=myapp

# Connect to database
psql -h database -U myuser -d mydb

# Check active queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active';

# Check locks
SELECT * FROM pg_locks WHERE NOT granted;
```

## Custom Debug Images

Create a purpose-built debug image:

```dockerfile
FROM nicolaka/netshoot

# Add more tools
RUN apk add --no-cache \
    htop \
    strace \
    ltrace \
    gdb \
    vim

# Add custom scripts
COPY debug-scripts/ /usr/local/bin/
```

Push to your registry:

```bash
docker build -t myregistry/debug:latest .
docker push myregistry/debug:latest

# Use it
kubectl debug -it myapp-pod --image=myregistry/debug:latest
```

## Cleanup

Debug resources are ephemeral but good to clean up:

```bash
# List debug pods
kubectl get pods | grep debug

# Delete debug pods
kubectl delete pod myapp-debug
kubectl delete pod node-debugger-worker-1-xxxxx

# Ephemeral containers are cleaned up when pod restarts
```

## Limitations

1. **Ephemeral containers can't be removed** - They stay until pod restart
2. **Resource limits** - Debug containers share pod resources
3. **Security context** - May need elevated privileges
4. **Node access** - Requires cluster-admin for node debugging

## kubectl debug vs kubectl exec

| Feature | kubectl exec | kubectl debug |
|---------|--------------|---------------|
| Requires shell in image | Yes | No |
| Can debug distroless | No | Yes |
| Modify pod spec | No | Yes (copy) |
| Debug crashed pods | No | Yes |
| Debug nodes | No | Yes |
| Add tools | No | Yes |

## Best Practices

1. **Use purpose-built debug images** - Don't install tools at runtime
2. **Document common debug procedures** - Runbooks for your team
3. **Clean up debug resources** - Delete debug pods when done
4. **Limit debug access** - RBAC for who can debug
5. **Audit debug sessions** - Log who debugged what

---

`kubectl debug` is essential for modern Kubernetes troubleshooting. It lets you debug distroless images, crashed containers, and nodes without modifying production workloads. Master it, and you'll solve problems faster than ever.
