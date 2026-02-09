# How to implement kube-proxy ipvs mode with masquerade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPVS, Networking, kube-proxy, NAT

Description: Master kube-proxy IPVS mode with masquerading for source NAT in Kubernetes clusters including configuration, troubleshooting, and best practices for external traffic handling.

---

When you run kube-proxy in IPVS mode, masquerading handles source network address translation (SNAT) for packets leaving the cluster. Getting masquerade configuration right is crucial for proper external connectivity, LoadBalancer services, and NodePort access. This guide walks through implementing IPVS with masquerade and solving common connectivity issues.

## Understanding Masquerade in IPVS Mode

Masquerading rewrites the source IP address of outbound packets to the node's IP address. Without masquerade, return packets wouldn't know how to reach the original pod, because pod IPs aren't routable outside the cluster.

In iptables mode, kube-proxy creates MASQUERADE rules for specific scenarios. In IPVS mode, the same logic applies, but IPVS handles the load balancing while iptables still manages masquerading through specific chains.

IPVS mode creates a dummy interface (typically `kube-ipvs0`) that holds all service cluster IPs. This interface doesn't actually route traffic but provides a local destination for IPVS to forward to. The masquerade rules ensure proper NAT happens before and after IPVS processing.

## Configuring IPVS with Masquerade

Start by enabling IPVS mode with proper masquerade settings in your kube-proxy configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-proxy
  namespace: kube-system
data:
  config.conf: |
    apiVersion: kubeproxy.config.k8s.io/v1alpha1
    kind: KubeProxyConfiguration
    mode: "ipvs"
    ipvs:
      scheduler: "rr"
      syncPeriod: 30s
      minSyncPeriod: 5s
      strictARP: true
    iptables:
      masqueradeAll: false  # Only masquerade when necessary
      masqueradeBit: 14     # Bit for marking packets
      minSyncPeriod: 5s
      syncPeriod: 30s
    clusterCIDR: "10.244.0.0/16"  # Your pod CIDR
```

The `masqueradeAll` setting controls whether all traffic gets masqueraded or only traffic that needs it. Setting it to false is more efficient because it only masquerades:

- Traffic from pods to external IPs (outside cluster and pod CIDRs)
- NodePort service traffic from external sources
- LoadBalancer service traffic
- Traffic with source IP preservation disabled

Apply the configuration and restart kube-proxy:

```bash
kubectl apply -f kube-proxy-config.yaml
kubectl rollout restart daemonset/kube-proxy -n kube-system

# Wait for rollout to complete
kubectl rollout status daemonset/kube-proxy -n kube-system
```

## Examining IPVS and Masquerade Rules

Once kube-proxy is running in IPVS mode, check that masquerade rules are created correctly:

```bash
# View IPVS virtual services
ipvsadm -Ln

# Check the kube-ipvs0 dummy interface
ip addr show kube-ipvs0

# Expected output shows all ClusterIPs:
# inet 10.96.0.1/32 scope global kube-ipvs0
# inet 10.96.0.10/32 scope global kube-ipvs0
# inet 10.96.50.100/32 scope global kube-ipvs0

# Examine iptables rules for masquerading
iptables -t nat -L KUBE-POSTROUTING -n -v

# Look for MASQUERADE rules with comment markers:
# KUBE-MARK-MASQ marks packets for masquerading
# MASQUERADE applies NAT to marked packets
```

The key iptables chains in IPVS mode are:

- `KUBE-POSTROUTING`: Applies masquerade to marked packets
- `KUBE-MARK-MASQ`: Marks packets that need masquerading
- `KUBE-SERVICES`: Entry point for service traffic

Even though IPVS handles load balancing, iptables still manages packet marking and NAT.

## Handling External Traffic with Masquerade

For NodePort and LoadBalancer services, masquerade ensures return traffic flows correctly:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-nodeport
spec:
  type: NodePort
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
    nodePort: 30080
    protocol: TCP
  externalTrafficPolicy: Cluster  # Uses masquerade
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 8080
```

With `externalTrafficPolicy: Cluster`, traffic coming in through the NodePort gets masqueraded so the pod sees the source IP as the node's IP. This allows traffic to route back correctly even if the pod is on a different node.

Test NodePort connectivity:

```bash
# From outside the cluster
curl http://<NODE_IP>:30080

# From inside a pod on the same node
kubectl exec -it test-pod -- curl http://127.0.0.1:30080

# Check connection tracking
conntrack -L | grep 30080
```

## Preserving Source IP Without Masquerade

Sometimes you want to preserve the original client IP. Set `externalTrafficPolicy: Local` to disable masquerading for NodePort traffic:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-nodeport-local
spec:
  type: NodePort
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
    nodePort: 30081
  externalTrafficPolicy: Local  # No masquerade, preserves source IP
```

With Local policy, traffic only goes to pods on the node that receives the traffic. No masquerade happens because routing works without NAT. However, this means:

- Traffic distribution may be uneven if pods aren't evenly distributed across nodes
- Health checks must pass on each node that receives traffic
- Nodes without local pods return connection refused

Check which nodes have pods:

```bash
kubectl get pods -o wide -l app=web

# Only nodes with pods will successfully serve traffic
# Test from each node
for node in $(kubectl get nodes -o name); do
  NODE_IP=$(kubectl get $node -o jsonpath='{.status.addresses[?(@.type=="InternalIP")].address}')
  echo "Testing $node ($NODE_IP):"
  curl -m 2 http://$NODE_IP:30081 || echo "No local pods"
done
```

## Configuring Masquerade for Pod-to-External Traffic

Pods accessing external services (internet, on-premise databases, etc.) need masquerading to route return traffic:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: curl-test
spec:
  containers:
  - name: curl
    image: curlimages/curl:latest
    command: ["sleep", "3600"]
```

Test external connectivity:

```bash
# Access external service
kubectl exec curl-test -- curl -I https://google.com

# Trace the packet flow
kubectl exec curl-test -- traceroute -n 8.8.8.8

# On the node, check masquerade is applied
tcpdump -i any -n host 8.8.8.8

# You should see:
# - Outbound packets with source IP = node IP (masqueraded)
# - Return packets with destination = node IP
# - Node forwards return packets to pod
```

Check iptables rules that apply masquerading:

```bash
# Rules that mark packets for masquerading
iptables -t nat -L KUBE-MARK-MASQ -n -v

# Rules that apply masquerade
iptables -t nat -L KUBE-POSTROUTING -n -v

# Should see rules like:
# MASQUERADE all -- * * 0.0.0.0/0 0.0.0.0/0 mark match 0x4000/0x4000
```

The mark `0x4000` (bit 14 by default) identifies packets that need masquerading.

## Troubleshooting Masquerade Issues

If external connectivity breaks after switching to IPVS mode, follow these steps:

```bash
# 1. Verify IPVS is actually being used
kubectl logs -n kube-system -l k8s-app=kube-proxy | grep -i "using ipvs"

# 2. Check kube-ipvs0 interface exists
ip addr show kube-ipvs0

# 3. Verify IPVS rules are present
ipvsadm -Ln

# 4. Check iptables masquerade rules exist
iptables -t nat -L KUBE-POSTROUTING -n

# 5. Verify conntrack module is loaded
lsmod | grep nf_conntrack

# 6. Check IP forwarding is enabled
sysctl net.ipv4.ip_forward
# Should return: net.ipv4.ip_forward = 1

# If not, enable it
sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
```

Common issues and solutions:

**Issue: NodePort not accessible from external clients**

```bash
# Check firewall rules on nodes
iptables -L -n | grep 30080

# Verify kube-proxy is listening
ss -tlnp | grep 30080

# Check if IPVS has the NodePort entry
ipvsadm -Ln | grep 30080
```

**Issue: Pods can't reach external services**

```bash
# Verify masquerade bit is set
iptables -t nat -L KUBE-POSTROUTING -n -v

# Check default route in pod
kubectl exec curl-test -- ip route

# Verify node has external connectivity
ping -c 3 8.8.8.8
```

**Issue: Return traffic not reaching pods**

```bash
# Check conntrack entries
conntrack -L -p tcp

# Verify masquerade is working
tcpdump -i any -n 'port 80' -v

# Check for asymmetric routing issues
ip route show table all
```

## Optimizing Masquerade Performance

For high-throughput clusters, tune connection tracking:

```bash
# Increase conntrack table size
sysctl -w net.netfilter.nf_conntrack_max=1048576
sysctl -w net.netfilter.nf_conntrack_buckets=262144

# Adjust timeout values
sysctl -w net.netfilter.nf_conntrack_tcp_timeout_established=600
sysctl -w net.netfilter.nf_conntrack_tcp_timeout_time_wait=30

# Make permanent
cat <<EOF >> /etc/sysctl.conf
net.netfilter.nf_conntrack_max = 1048576
net.netfilter.nf_conntrack_buckets = 262144
net.netfilter.nf_conntrack_tcp_timeout_established = 600
net.netfilter.nf_conntrack_tcp_timeout_time_wait = 30
EOF

sysctl -p
```

Monitor connection tracking usage:

```bash
# Check current usage
cat /proc/sys/net/netfilter/nf_conntrack_count
cat /proc/sys/net/netfilter/nf_conntrack_max

# Watch for drops
grep "nf_conntrack: table full" /var/log/syslog
```

## Using MasqueradeAll for Simplified Configuration

If you're having persistent issues or need guaranteed masquerading, enable `masqueradeAll`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-proxy
  namespace: kube-system
data:
  config.conf: |
    apiVersion: kubeproxy.config.k8s.io/v1alpha1
    kind: KubeProxyConfiguration
    mode: "ipvs"
    ipvs:
      scheduler: "rr"
    iptables:
      masqueradeAll: true  # Masquerade all traffic
      masqueradeBit: 14
    clusterCIDR: "10.244.0.0/16"
```

This adds some overhead but guarantees connectivity. All pod traffic gets masqueraded regardless of destination. Use this as a fallback if selective masquerading causes issues.

IPVS mode with properly configured masquerading provides the performance of IPVS load balancing while maintaining correct NAT behavior for external connectivity. Understanding how IPVS and iptables work together lets you troubleshoot issues quickly and optimize for your specific networking requirements.
