# How to Configure L2 Load Balancing with MetalLB on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, MetalLB, Layer 2, Load Balancing, Kubernetes, Bare Metal

Description: Configure MetalLB Layer 2 load balancing on Talos Linux for reliable service exposure on bare-metal Kubernetes clusters.

---

MetalLB's Layer 2 mode is the most straightforward way to expose Kubernetes services on bare-metal Talos Linux clusters. It uses standard ARP (for IPv4) or NDP (for IPv6) to make service IPs reachable on your local network. No router configuration, no BGP peering, no special network equipment needed. If your nodes are on a flat Layer 2 network, you can have working LoadBalancer services in under ten minutes.

This guide covers L2 mode in depth, including how it works under the hood, advanced configurations, failover behavior, and performance tuning.

## How Layer 2 Mode Works

When MetalLB assigns an IP to a service in L2 mode, it picks one node to be the "leader" for that IP. The speaker pod on that node starts responding to ARP requests for the service IP, effectively saying "send traffic for this IP to me." All traffic for that service IP flows to the leader node, which then uses kube-proxy rules to distribute it to the actual backend pods (which may be on any node).

This means:

- All traffic for a given service IP enters the cluster through a single node
- kube-proxy handles the actual load balancing to backend pods
- If the leader node goes down, another node takes over (failover)
- There is no true network-level load balancing across nodes (unlike BGP mode)

## Setting Up L2 Mode

First, make sure MetalLB is installed:

```bash
# Install MetalLB via Helm
helm repo add metallb https://metallb.github.io/metallb
helm repo update

helm install metallb metallb/metallb \
    --namespace metallb-system \
    --create-namespace \
    --wait
```

Define your IP address pool. Choose IPs on the same subnet as your Talos nodes:

```yaml
# address-pool.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: l2-pool
  namespace: metallb-system
spec:
  addresses:
  # Make sure these IPs are on the same L2 network as your nodes
  # and are not used by anything else (DHCP excluded, etc.)
  - 192.168.1.200-192.168.1.230
```

Create the L2Advertisement:

```yaml
# l2-advertisement.yaml
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: l2-advert
  namespace: metallb-system
spec:
  ipAddressPools:
  - l2-pool
```

Apply both:

```bash
kubectl apply -f address-pool.yaml
kubectl apply -f l2-advertisement.yaml
```

## Controlling Which Nodes Announce IPs

By default, any node running a MetalLB speaker can become the leader for a service IP. You can restrict this using node selectors:

```yaml
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: l2-advert
  namespace: metallb-system
spec:
  ipAddressPools:
  - l2-pool
  nodeSelectors:
  - matchLabels:
      node-role.kubernetes.io/worker: ""
  - matchExpressions:
    - key: metallb/speaker
      operator: In
      values: ["true"]
```

This restricts L2 announcements to worker nodes with the `metallb/speaker=true` label. Label your nodes accordingly:

```bash
kubectl label node worker-1 metallb/speaker=true
kubectl label node worker-2 metallb/speaker=true
kubectl label node worker-3 metallb/speaker=true
```

## Interface Selection

On nodes with multiple network interfaces, you can control which interface MetalLB uses for ARP responses:

```yaml
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: l2-advert
  namespace: metallb-system
spec:
  ipAddressPools:
  - l2-pool
  interfaces:
  - eth0  # Only announce on this interface
```

This is important on Talos Linux nodes that have both management and data network interfaces. You want MetalLB to announce on the interface that faces your clients.

## Understanding Failover

In L2 mode, when the leader node goes down, MetalLB detects the failure through its memberlist protocol and elects a new leader. The new leader starts responding to ARP requests for the service IP.

The failover time depends on several factors:

- MetalLB's failure detection time (configurable, default around 10 seconds)
- ARP cache expiration on clients and switches (varies by device)
- Gratuitous ARP processing by network equipment

You can tune the speaker's memberlist settings for faster detection:

```yaml
# Helm values for faster failover
speaker:
  memberlist:
    # How often to probe other speakers
    deadman-period: 5s
```

Test failover by draining the leader node:

```bash
# Find which node is the leader for a service
kubectl describe svc my-service | grep -i "metallb"
# Or check events
kubectl get events -n metallb-system --sort-by=.lastTimestamp | grep my-service

# Drain the leader node to trigger failover
kubectl drain worker-1 --ignore-daemonsets --delete-emptydir-data

# Monitor the service availability
while true; do
    curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" http://192.168.1.200
    sleep 0.5
done

# Uncordon when done
kubectl uncordon worker-1
```

## Multiple L2 Advertisements

You can create different L2 advertisements for different pools, with different settings:

```yaml
# DMZ pool - advertised on the external-facing interface
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: dmz-pool
  namespace: metallb-system
spec:
  addresses:
  - 10.0.100.10-10.0.100.50
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: dmz-advert
  namespace: metallb-system
spec:
  ipAddressPools:
  - dmz-pool
  interfaces:
  - eth1  # External interface
  nodeSelectors:
  - matchLabels:
      network-zone: dmz

---
# Internal pool - advertised on the management interface
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: internal-pool
  namespace: metallb-system
spec:
  addresses:
  - 192.168.1.200-192.168.1.230
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: internal-advert
  namespace: metallb-system
spec:
  ipAddressPools:
  - internal-pool
  interfaces:
  - eth0  # Management interface
```

## IPv6 Support

L2 mode supports IPv6 using NDP (Neighbor Discovery Protocol) instead of ARP:

```yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: ipv6-pool
  namespace: metallb-system
spec:
  addresses:
  - fd00::200-fd00::230
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: ipv6-advert
  namespace: metallb-system
spec:
  ipAddressPools:
  - ipv6-pool
```

## Dual-Stack Configuration

For dual-stack (IPv4 and IPv6) services:

```yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: dual-stack-v4
  namespace: metallb-system
spec:
  addresses:
  - 192.168.1.200-192.168.1.230
---
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: dual-stack-v6
  namespace: metallb-system
spec:
  addresses:
  - fd00::200-fd00::230
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: dual-stack-advert
  namespace: metallb-system
spec:
  ipAddressPools:
  - dual-stack-v4
  - dual-stack-v6
```

Create a dual-stack service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: dual-stack-app
spec:
  type: LoadBalancer
  ipFamilyPolicy: PreferDualStack
  ipFamilies:
  - IPv4
  - IPv6
  ports:
  - port: 80
  selector:
    app: my-app
```

## Performance Considerations

L2 mode has a fundamental limitation: all traffic for a service enters through a single node. For high-traffic services, this means:

- The leader node's network bandwidth becomes the bottleneck
- CPU load for packet processing concentrates on one node
- If you have multiple LoadBalancer services, MetalLB distributes them across different nodes

To mitigate bandwidth concerns:

```bash
# Check which nodes are leaders for which services
kubectl get events -n metallb-system --sort-by=.lastTimestamp | grep "nodeAssigned"

# Spread services across nodes by using specific IP addresses
# MetalLB tries to balance, but you can influence the distribution
```

For services that need true multi-node load balancing, consider BGP mode or an external hardware load balancer.

## Monitoring L2 Mode

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: metallb-l2-alerts
  namespace: monitoring
spec:
  groups:
  - name: metallb-l2
    rules:
    - alert: MetalLBNoSpeakers
      expr: |
        metallb_speaker_announced{protocol="layer2"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "No MetalLB speaker is announcing for a service"

    - alert: MetalLBAddressPoolExhausted
      expr: |
        metallb_allocator_addresses_in_use_total / metallb_allocator_addresses_total > 0.9
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "MetalLB address pool is over 90% utilized"
```

## Troubleshooting L2 Mode on Talos

```bash
# Verify ARP is working from an external machine
arping -c 3 192.168.1.200

# Check speaker logs for leader election
kubectl logs -n metallb-system -l app.kubernetes.io/component=speaker --tail=50

# Verify the IP is assigned to a service
kubectl get svc --all-namespaces -o wide | grep LoadBalancer

# Check if the node can handle the traffic
talosctl dmesg --nodes $NODE_IP | grep -i "drop\|reject\|conntrack"

# Verify the speaker DaemonSet is running on all expected nodes
kubectl get pods -n metallb-system -l app.kubernetes.io/component=speaker -o wide
```

## Wrapping Up

MetalLB L2 mode is the simplest path to LoadBalancer services on bare-metal Talos Linux. It requires no router configuration and works on any flat network. The trade-off is that traffic concentrates on a single node per service, which may not be ideal for very high-traffic scenarios. For most workloads, L2 mode provides exactly what you need: a stable external IP that survives node failures and makes your services reachable from outside the cluster.
