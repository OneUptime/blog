# How to diagnose IPVS mode kube-proxy issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kube-proxy, IPVS, Load Balancing, Network Troubleshooting

Description: Learn how to troubleshoot and diagnose issues with IPVS mode kube-proxy in Kubernetes, including connectivity problems and load balancing failures.

---

IPVS (IP Virtual Server) mode in kube-proxy offers better performance and scalability than iptables mode for Kubernetes service load balancing. However, it introduces different troubleshooting challenges. This guide covers practical techniques for diagnosing IPVS-related issues in your Kubernetes cluster.

## Understanding IPVS Mode

IPVS is a Linux kernel feature that provides layer 4 load balancing. Unlike iptables mode which creates chains of rules, IPVS uses hash tables for more efficient packet processing. This makes it ideal for clusters with thousands of services.

When kube-proxy runs in IPVS mode, it creates virtual servers for each Kubernetes service and configures real servers (endpoints) behind them. Traffic to service IPs is load balanced across pod endpoints using various scheduling algorithms.

## Verifying IPVS Mode is Active

Before troubleshooting, confirm that kube-proxy is actually running in IPVS mode:

```bash
# Check kube-proxy mode from ConfigMap
kubectl -n kube-system get configmap kube-proxy -o yaml | grep mode

# Check running kube-proxy pods
kubectl -n kube-system get pods -l k8s-app=kube-proxy

# View kube-proxy logs
kubectl -n kube-system logs -l k8s-app=kube-proxy --tail=50 | grep -i ipvs
```

If you see "Using ipvs Proxier" in the logs, IPVS mode is active. If not, you might still be using iptables mode.

## Essential IPVS Troubleshooting Tools

Install ipvsadm on your nodes to inspect IPVS configuration:

```bash
# On Ubuntu/Debian
sudo apt-get install ipvsadm

# On RHEL/CentOS
sudo yum install ipvsadm

# Verify IPVS kernel modules are loaded
lsmod | grep ip_vs
```

The ip_vs module and its dependencies must be loaded for IPVS to function.

## Inspecting IPVS Virtual Servers

Use ipvsadm to view configured virtual servers and their backends:

```bash
# List all virtual servers
sudo ipvsadm -L -n

# Output shows:
# IP Virtual Server version 1.2.1 (size=4096)
# Prot LocalAddress:Port Scheduler Flags
#   -> RemoteAddress:Port           Forward Weight ActiveConn InActConn
# TCP  10.96.0.1:443 rr
#   -> 192.168.1.10:6443           Masq    1      0          0
#   -> 192.168.1.11:6443           Masq    1      0          0

# Show statistics
sudo ipvsadm -L -n --stats

# Show connection tracking
sudo ipvsadm -L -n -c
```

Each Kubernetes service should have corresponding virtual server entries with pod IPs as real servers.

## Diagnosing Service Resolution Issues

When pods cannot reach services via ClusterIP, check IPVS configuration:

```bash
# Get service details
kubectl get svc my-service -o wide

# Note the ClusterIP and port
# Example: 10.96.100.50:80

# Check if IPVS has this virtual server
sudo ipvsadm -L -n | grep 10.96.100.50

# Verify backend pods are registered
kubectl get endpoints my-service
```

If the service appears in kubectl but not in ipvsadm output, kube-proxy hasn't synced properly.

### Debug from Inside a Pod

```yaml
# debug-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: ipvs-debug
spec:
  hostNetwork: true  # Access host network
  containers:
  - name: debug
    image: nicolaka/netshoot
    command: ['sleep', '3600']
    securityContext:
      privileged: true  # Required for ipvsadm
```

```bash
kubectl apply -f debug-pod.yaml

# Exec into the pod
kubectl exec -it ipvs-debug -- bash

# Inside the pod, check IPVS
ipvsadm -L -n

# Test service connectivity
curl http://10.96.100.50:80
```

## Common IPVS Issues and Solutions

### Issue 1: Missing Kernel Modules

IPVS requires specific kernel modules. If they're missing, kube-proxy falls back to iptables:

```bash
# Check required modules
for module in ip_vs ip_vs_rr ip_vs_wrr ip_vs_sh nf_conntrack; do
  if lsmod | grep -q $module; then
    echo "$module: loaded"
  else
    echo "$module: MISSING"
  fi
done

# Load missing modules
sudo modprobe ip_vs
sudo modprobe ip_vs_rr
sudo modprobe ip_vs_wrr
sudo modprobe ip_vs_sh
sudo modprobe nf_conntrack

# Make modules load at boot
cat << EOF | sudo tee /etc/modules-load.d/ipvs.conf
ip_vs
ip_vs_rr
ip_vs_wrr
ip_vs_sh
nf_conntrack
EOF
```

### Issue 2: No Route to Service IP

Service IPs exist in a virtual network space. The kube-ipvs0 interface holds these IPs:

```bash
# Check kube-ipvs0 interface
ip addr show kube-ipvs0

# You should see all service ClusterIPs bound here
# Example:
# 10: kube-ipvs0: <BROADCAST,NOARP> mtu 1500 qdisc noop state DOWN
#     inet 10.96.0.1/32 scope global kube-ipvs0
#     inet 10.96.100.50/32 scope global kube-ipvs0
```

If service IPs are missing from kube-ipvs0:

```bash
# Restart kube-proxy to rebuild
kubectl -n kube-system delete pod -l k8s-app=kube-proxy

# Wait for new pods to start
kubectl -n kube-system get pods -l k8s-app=kube-proxy -w
```

### Issue 3: Connection Tracking Table Full

IPVS uses connection tracking, which can fill up under high load:

```bash
# Check current conntrack usage
sudo sysctl net.netfilter.nf_conntrack_count
sudo sysctl net.netfilter.nf_conntrack_max

# If count is near max, increase the limit
sudo sysctl -w net.netfilter.nf_conntrack_max=1000000

# Make permanent
echo "net.netfilter.nf_conntrack_max = 1000000" | \
  sudo tee -a /etc/sysctl.conf

# Also increase bucket size
sudo sysctl -w net.netfilter.nf_conntrack_buckets=250000
```

### Issue 4: Unbalanced Load Distribution

If traffic isn't balanced evenly across pods:

```bash
# Check connection distribution
sudo ipvsadm -L -n --stats

# Look at ActiveConn and InActConn for each real server
# Uneven distribution might indicate:
# - Scheduler algorithm issues
# - Connection persistence (affinity)
# - Pod health problems

# Change scheduler algorithm if needed
# Edit kube-proxy ConfigMap
kubectl -n kube-system edit configmap kube-proxy

# Add or modify:
# ipvs:
#   scheduler: "rr"  # Options: rr, lc, dh, sh, sed, nq
```

## Analyzing IPVS Metrics

Check detailed statistics to identify issues:

```bash
# View per-service statistics
sudo ipvsadm -L -n --stats | grep -A 5 "10.96.100.50"

# Example output:
# TCP  10.96.100.50:80 rr
#   -> 192.168.1.20:8080           Masq    1      1000   500     1G    500M
#   -> 192.168.1.21:8080           Masq    1      900    450     900M  450M
#
# Columns: ActiveConn InActConn Outgoing Incoming Outbytes Inbytes

# Check rate information
sudo ipvsadm -L -n --rate

# Shows packets/connections per second
```

## Debugging Session Affinity

Session affinity (sticky sessions) can cause unexpected behavior:

```bash
# Check service session affinity
kubectl get svc my-service -o yaml | grep sessionAffinity

# If set to ClientIP, IPVS uses persistent connections

# View IPVS persistence table
sudo ipvsadm -L -n -p

# Clear persistence table if needed (careful in production!)
sudo ipvsadm -C
sudo systemctl restart kubelet
```

## IPVS and NodePort Services

NodePort services create additional IPVS entries:

```bash
# For a NodePort service on port 30080
# Check if IPVS has entries for all node IPs

# Get node IPs
kubectl get nodes -o wide

# Check IPVS for each node IP
for ip in $(kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}'); do
  echo "Checking $ip:30080"
  sudo ipvsadm -L -n | grep "$ip:30080"
done
```

## Monitoring IPVS Health

Create a monitoring script to track IPVS health:

```bash
#!/bin/bash
# ipvs-health-check.sh

echo "=== IPVS Health Check ==="
echo "Timestamp: $(date)"

# Count virtual servers
VS_COUNT=$(sudo ipvsadm -L -n | grep -c "^TCP\|^UDP")
echo "Virtual Servers: $VS_COUNT"

# Count real servers
RS_COUNT=$(sudo ipvsadm -L -n | grep -c "->")
echo "Real Servers: $RS_COUNT"

# Check for servers with no backends
echo "Services with no backends:"
sudo ipvsadm -L -n | awk '/^TCP|^UDP/{vs=$2} /->/{found[vs]=1} END{for(v in found) if(!found[v]) print v}'

# Connection tracking status
CT_COUNT=$(sudo sysctl -n net.netfilter.nf_conntrack_count)
CT_MAX=$(sudo sysctl -n net.netfilter.nf_conntrack_max)
CT_USAGE=$((CT_COUNT * 100 / CT_MAX))
echo "Conntrack Usage: $CT_USAGE% ($CT_COUNT/$CT_MAX)"

if [ $CT_USAGE -gt 80 ]; then
  echo "WARNING: Connection tracking table over 80% full!"
fi

# Check kube-ipvs0 interface
IPVS_IPS=$(ip addr show kube-ipvs0 2>/dev/null | grep -c "inet ")
echo "Service IPs on kube-ipvs0: $IPVS_IPS"
```

## Comparing IPVS and iptables Behavior

To debug issues, you might need to compare IPVS behavior with iptables:

```bash
# Temporarily switch to iptables mode for testing
kubectl -n kube-system edit configmap kube-proxy

# Change mode to "iptables"
# Delete kube-proxy pods to apply change
kubectl -n kube-system delete pods -l k8s-app=kube-proxy

# Test your service
# Then switch back to IPVS and compare behavior
```

## Advanced Debugging with BPF Tools

Use bpftrace to trace IPVS operations:

```bash
# Install bpftrace
sudo apt-get install bpftrace

# Trace IPVS function calls
sudo bpftrace -e 'kprobe:ip_vs_* { printf("%s\n", probe); }'

# Count IPVS operations
sudo bpftrace -e 'kprobe:ip_vs_* { @[probe] = count(); }'
```

## kube-proxy Configuration Verification

Check kube-proxy configuration for IPVS-specific settings:

```bash
# Get full kube-proxy config
kubectl -n kube-system get configmap kube-proxy -o yaml

# Key IPVS settings to verify:
# - mode: "ipvs"
# - ipvs.scheduler: scheduler algorithm
# - ipvs.strictARP: important for MetalLB
# - ipvs.tcpTimeout: connection timeout
# - ipvs.udpTimeout: UDP timeout
```

Example optimal configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-proxy
  namespace: kube-system
data:
  config.conf: |
    mode: "ipvs"
    ipvs:
      scheduler: "rr"
      strictARP: true
      tcpTimeout: 0s
      tcpFinTimeout: 0s
      udpTimeout: 0s
```

IPVS mode provides excellent performance for Kubernetes service networking, but requires different troubleshooting approaches than iptables mode. Understanding how to inspect IPVS configuration, diagnose common issues, and monitor health ensures your services remain accessible and performant. Keep these diagnostic techniques in your toolkit for maintaining reliable service networking in production clusters.
