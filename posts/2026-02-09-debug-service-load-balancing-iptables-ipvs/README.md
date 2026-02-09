# How to Debug Kubernetes Service Load Balancing with iptables and ipvs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Debugging, iptables, IPVS, Load Balancing, Networking

Description: Master debugging techniques for Kubernetes service load balancing using iptables and IPVS inspection tools to troubleshoot connectivity issues and understand traffic flow.

---

When service connectivity breaks in Kubernetes, the problem often lies in how kube-proxy configures load balancing rules. Understanding how to inspect iptables rules and IPVS tables is essential for diagnosing why traffic isn't reaching your pods. This guide shows you the exact commands and techniques to debug service load balancing issues.

## Understanding kube-proxy Modes

kube-proxy implements service load balancing in one of three modes:

- **iptables**: Uses iptables NAT rules for load balancing (default in many distributions)
- **IPVS**: Uses Linux kernel IPVS for high-performance load balancing
- **userspace**: Legacy mode, rarely used

Most debugging focuses on iptables and IPVS modes since they're most common in production.

## Determining Your kube-proxy Mode

First, identify which mode your cluster uses:

```bash
# Check kube-proxy config
kubectl get configmap kube-proxy -n kube-system -o yaml | grep mode

# Or check kube-proxy logs
kubectl logs -n kube-system -l k8s-app=kube-proxy | grep "Using.*proxy"
```

You'll see output like:

```
mode: "iptables"
```

or

```
Using ipvs Proxier
```

This determines which toolset you'll use for debugging.

## Debugging iptables Mode

When kube-proxy runs in iptables mode, it creates complex chains of NAT rules. Understanding these rules is key to debugging.

### Listing Service-Related iptables Rules

Start by examining the NAT table where service rules live:

```bash
# SSH to a node, then run:
sudo iptables -t nat -L -n -v | less
```

Look for chains starting with `KUBE-`:

- `KUBE-SERVICES`: Entry point for service traffic
- `KUBE-SVC-*`: Service-specific chains
- `KUBE-SEP-*`: Service endpoint chains (individual pods)

### Finding Rules for a Specific Service

Let's debug a service named `web-app` in the `production` namespace:

```bash
# Get the service cluster IP
kubectl get svc web-app -n production

# Example output:
# NAME      TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
# web-app   ClusterIP   10.96.100.50    <none>        80/TCP    1d
```

Now search for rules matching this IP:

```bash
sudo iptables -t nat -L -n -v | grep 10.96.100.50
```

You'll see something like:

```
KUBE-SVC-ABCDEF1234  tcp  --  *  *  0.0.0.0/0  10.96.100.50  tcp dpt:80
```

This shows the service chain name. Inspect it further:

```bash
sudo iptables -t nat -L KUBE-SVC-ABCDEF1234 -n -v
```

Output shows backend pod endpoints:

```
Chain KUBE-SVC-ABCDEF1234 (1 references)
 pkts bytes target     prot opt in     out     source               destination
    5   300 KUBE-SEP-POD1ABC  all  --  *      *       0.0.0.0/0            0.0.0.0/0            statistic mode random probability 0.33333333349
    3   180 KUBE-SEP-POD2DEF  all  --  *      *       0.0.0.0/0            0.0.0.0/0            statistic mode random probability 0.50000000000
    2   120 KUBE-SEP-POD3GHI  all  --  *      *       0.0.0.0/0            0.0.0.0/0
```

This shows three backends with statistical load balancing.

### Inspecting Individual Endpoint Rules

Examine a specific endpoint chain:

```bash
sudo iptables -t nat -L KUBE-SEP-POD1ABC -n -v
```

You'll see the DNAT rule that rewrites destination to the pod IP:

```
Chain KUBE-SEP-POD1ABC (1 references)
 pkts bytes target     prot opt in     out     source               destination
    0     0 KUBE-MARK-MASQ  all  --  *      *       10.244.1.5           0.0.0.0/0
    5   300 DNAT       tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp to:10.244.1.5:8080
```

The DNAT rule rewrites traffic destined for the service IP (10.96.100.50:80) to the pod IP (10.244.1.5:8080).

### Tracing Traffic Through iptables

Use iptables tracing to watch traffic flow:

```bash
# Enable raw table tracing for specific traffic
sudo iptables -t raw -A PREROUTING -p tcp --dport 80 -d 10.96.100.50 -j TRACE
sudo iptables -t raw -A OUTPUT -p tcp --dport 80 -d 10.96.100.50 -j TRACE

# Watch kernel logs
sudo tail -f /var/log/kern.log | grep TRACE
```

Now send traffic to the service and watch it traverse the iptables chains.

Don't forget to remove the trace rules when done:

```bash
sudo iptables -t raw -D PREROUTING -p tcp --dport 80 -d 10.96.100.50 -j TRACE
sudo iptables -t raw -D OUTPUT -p tcp --dport 80 -d 10.96.100.50 -j TRACE
```

### Common iptables Issues

**Missing service rules**: If `iptables -t nat -L | grep <service-ip>` shows nothing, kube-proxy hasn't created rules. Check:

```bash
# Is kube-proxy running?
kubectl get pods -n kube-system -l k8s-app=kube-proxy

# Check kube-proxy logs
kubectl logs -n kube-system kube-proxy-xxxxx
```

**No backend pods**: If the service chain exists but has no SEP chains, no healthy endpoints are available:

```bash
# Check endpoints
kubectl get endpoints web-app -n production
```

**Wrong packet counts**: If `pkts` column shows 0 for all rules, traffic isn't reaching the service:

```bash
sudo iptables -t nat -L KUBE-SVC-ABCDEF1234 -n -v
```

Check pod network configuration and CNI plugin status.

## Debugging IPVS Mode

IPVS mode uses the kernel's IPVS load balancer instead of iptables. It's more efficient but requires different debugging tools.

### Installing IPVS Tools

First, ensure you have ipvsadm installed:

```bash
# On the node
sudo apt-get install -y ipvsadm  # Ubuntu/Debian
sudo yum install -y ipvsadm      # RHEL/CentOS
```

### Listing IPVS Services

View all IPVS virtual services:

```bash
sudo ipvsadm -L -n
```

Output shows virtual IPs (service IPs) and their real servers (pod IPs):

```
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port Scheduler Flags
  -> RemoteAddress:Port           Forward Weight ActiveConn InActConn
TCP  10.96.100.50:80 rr
  -> 10.244.1.5:8080              Masq    1      0          0
  -> 10.244.2.8:8080              Masq    1      0          0
  -> 10.244.3.2:8080              Masq    1      0          0
```

This shows:
- Service IP: 10.96.100.50:80
- Scheduler: rr (round robin)
- Three backend pods with equal weight
- No active connections currently

### Finding a Specific Service

Search for your service IP:

```bash
sudo ipvsadm -L -n | grep -A 5 "10.96.100.50"
```

### Viewing Detailed Statistics

Get detailed connection statistics:

```bash
# Connection statistics
sudo ipvsadm -L -n --stats

# Rate statistics (requests/sec, bytes/sec)
sudo ipvsadm -L -n --rate
```

Example output:

```
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port               Conns   InPkts  OutPkts  InBytes OutBytes
  -> RemoteAddress:Port
TCP  10.96.100.50:80                  1234    12340    12340   1234000  1234000
  -> 10.244.1.5:8080                   412     4120     4120    412000   412000
  -> 10.244.2.8:8080                   411     4110     4110    411000   411000
  -> 10.244.3.2:8080                   411     4110     4110    411000   411000
```

Perfect load balancing shows equal connections across backends.

### Checking IPVS Scheduler Algorithm

View which load balancing algorithm is in use:

```bash
sudo ipvsadm -L -n | grep -B 1 "10.244.1.5"
```

Common schedulers:
- `rr`: Round robin
- `wrr`: Weighted round robin
- `lc`: Least connection
- `wlc`: Weighted least connection
- `sh`: Source hashing (for session affinity)

### Testing IPVS Configuration

Create a test service and verify IPVS entries:

```bash
# Create test service
kubectl create deployment test-ipvs --image=nginx --replicas=3
kubectl expose deployment test-ipvs --port=80 --target-port=80

# Get service IP
SERVICE_IP=$(kubectl get svc test-ipvs -o jsonpath='{.spec.clusterIP}')

# Check IPVS immediately
sudo ipvsadm -L -n | grep -A 5 $SERVICE_IP
```

You should see the service with three backends.

### Monitoring IPVS Connection Table

Watch real-time connections:

```bash
# Install conntrack tools
sudo apt-get install -y conntrack

# Watch connections to a specific service
sudo conntrack -L | grep "10.96.100.50"

# Watch in real-time
watch -n 1 'sudo ipvsadm -L -n --stats'
```

### Common IPVS Issues

**Service missing from IPVS table**: kube-proxy hasn't synced. Check logs:

```bash
kubectl logs -n kube-system kube-proxy-xxxxx | grep -i error
```

**Uneven connection distribution**: Check backend weights:

```bash
sudo ipvsadm -L -n | grep -A 10 "10.96.100.50"
```

All weights should be equal (1) unless you've configured weighted load balancing.

**Backends with 0 weight**: These backends are considered down:

```bash
TCP  10.96.100.50:80 rr
  -> 10.244.1.5:8080              Masq    1      5          0
  -> 10.244.2.8:8080              Masq    0      0          0    # Weight 0 = down
  -> 10.244.3.2:8080              Masq    1      5          0
```

Check pod readiness probes and endpoint controller logs.

## Comparing iptables and IPVS

Use this comparison to understand behavior differences:

| Aspect | iptables | IPVS |
|--------|----------|------|
| Performance | Good for <1000 services | Excellent for 10000+ services |
| Debugging tool | `iptables` | `ipvsadm` |
| Load balancing | Statistical probability | True round robin/least connection |
| Rule updates | Full chain rebuild | Incremental updates |
| Connection tracking | conntrack | IPVS connection table |

## Using tcpdump for Traffic Analysis

When iptables/IPVS rules look correct but traffic still fails, use tcpdump:

```bash
# On the source pod's node
sudo tcpdump -i any -nn port 80 and host 10.96.100.50

# Watch for:
# 1. Packets arriving at service IP
# 2. DNAT transformation to pod IP
# 3. Return traffic

# Example output:
# 10.244.1.10.45678 > 10.96.100.50.80: Flags [S], seq 123
# 10.244.1.10.45678 > 10.244.1.5.8080: Flags [S], seq 123  # DNAT happened
# 10.244.1.5.8080 > 10.244.1.10.45678: Flags [S.], seq 456, ack 124
```

If you see the first packet but not the DNAT transformation, iptables/IPVS rules are broken.

## Verifying Service Endpoints

Always check that services have valid endpoints:

```bash
# List endpoints
kubectl get endpoints web-app -n production

# Detailed view
kubectl describe endpoints web-app -n production
```

If no endpoints exist, no traffic will flow regardless of iptables/IPVS rules.

## Best Practices for Debugging

When debugging service load balancing:

- Always check kube-proxy mode first
- Verify endpoints exist before inspecting rules
- Use `-v` flag with iptables to see packet counts
- Watch kube-proxy logs in real-time during reproduction
- Use tcpdump to verify actual packet flow
- Test from both inside and outside the cluster
- Check node-level firewall rules that might interfere
- Verify CNI plugin is functioning correctly
- Test with a simple service first, then move to complex ones
- Document your findings for future reference

Mastering iptables and IPVS debugging makes you incredibly valuable when service networking breaks. These tools give you x-ray vision into how Kubernetes routes traffic from services to pods.
