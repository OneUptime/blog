# How to Use traceroute in Kubernetes for Network Path Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Debugging

Description: Master traceroute for analyzing network paths, identifying routing issues, and diagnosing latency problems in Kubernetes clusters.

---

traceroute reveals the network path packets take from source to destination, showing each hop along the way and the latency at each point. In Kubernetes, understanding network paths helps diagnose routing problems, identify network bottlenecks, verify CNI plugin behavior, and troubleshoot cross-cluster or external connectivity issues.

Unlike simple ping tests that only confirm end-to-end connectivity, traceroute exposes the journey packets take and where delays or failures occur. This visibility is crucial for complex network troubleshooting in Kubernetes environments.

## How traceroute Works

traceroute sends packets with incrementing Time-To-Live (TTL) values. The first packet has TTL=1 and expires at the first hop, which returns an ICMP Time Exceeded message. The second packet with TTL=2 reaches the second hop before expiring. This process continues until packets reach the destination or maximum hops are reached.

Each hop's response provides its IP address and round-trip time, building a complete picture of the network path.

## Basic traceroute Usage

Run traceroute from a pod to trace the path to a destination:

```bash
# Deploy a pod with network tools
kubectl run netshoot --rm -it --image=nicolaka/netshoot -- bash

# Trace route to external endpoint
traceroute google.com

# Example output:
# 1  10.244.0.1  0.123 ms  0.089 ms  0.076 ms
# 2  172.31.0.1  0.456 ms  0.412 ms  0.389 ms
# 3  10.0.1.1    1.234 ms  1.201 ms  1.189 ms
# ...
```

Each line shows a hop with three round-trip time measurements.

## Tracing Pod-to-Pod Paths

Analyze network paths between pods in your cluster:

```bash
# Get destination pod IP
kubectl get pod dest-pod -o wide

# From source pod, trace route to destination
kubectl exec -it source-pod -- traceroute 10.244.1.5

# For pods on the same node:
# 1  10.244.1.5  0.045 ms  0.032 ms  0.028 ms
# Direct connection with minimal latency

# For pods on different nodes:
# Multiple hops through CNI network
```

This reveals whether pod-to-pod traffic takes expected paths through your CNI plugin.

## TCP traceroute for Service Testing

Regular traceroute uses ICMP or UDP, which firewalls often block. TCP traceroute works better:

```bash
# Install tcptraceroute
kubectl exec -it netshoot -- tcptraceroute api.example.com 443

# Specify port for service endpoint
kubectl exec -it netshoot -- tcptraceroute my-service.my-namespace.svc.cluster.local 8080

# TCP traceroute succeeds where ICMP traceroute fails
```

TCP traceroute is essential when troubleshooting services that only accept TCP connections.

## Analyzing Cross-Zone Traffic

Trace paths across availability zones to measure inter-zone latency:

```bash
# Deploy netshoot in multiple zones
kubectl run netshoot-zone-a --rm -it --image=nicolaka/netshoot -- bash

# From zone-a pod, trace to zone-b pod
traceroute pod-in-zone-b-ip

# Look for:
# - Number of hops
# - Latency increase at zone boundary
# - Unexpected routing through additional hops
```

Cross-zone traffic should have predictable paths and latency. Unexpected routing indicates network misconfiguration.

## Using mtr for Continuous Path Monitoring

mtr combines traceroute with ping for continuous monitoring:

```bash
# Run mtr to continuously monitor path
kubectl exec -it netshoot -- mtr -c 100 api.example.com

# Output shows statistics for each hop:
#                              Loss%   Snt   Last   Avg  Best  Wrst StDev
# 1. 10.244.0.1                0.0%   100    0.1   0.2   0.1   0.3   0.0
# 2. 172.31.0.1                0.0%   100    0.5   0.6   0.4   0.8   0.1
# 3. 10.0.1.1                  2.0%   100    1.2   1.3   1.0   2.1   0.2

# Loss% shows packet loss at each hop
# Avg shows average latency
```

mtr reveals intermittent issues that single traceroute runs miss.

## Tracing to External Endpoints

Analyze paths to external APIs or services:

```bash
# Trace to external API
kubectl exec -it netshoot -- traceroute api.example.com

# Shows complete path including:
# - Internal cluster hops
# - NAT gateway
# - Internet routing
# - Destination network

# Count hops to external service
kubectl exec -it netshoot -- traceroute api.example.com | wc -l
```

High hop counts or unexpected paths indicate routing problems.

## Analyzing Latency at Each Hop

Identify which hop contributes most latency:

```bash
# Run traceroute and examine latency progression
kubectl exec -it netshoot -- traceroute -q 5 api.example.com

# -q 5 sends 5 probes per hop for better statistics

# Look for:
# - Large latency jumps between specific hops
# - Consistent high latency from certain hop onward
# - Asymmetric latency (different times for same hop)
```

Significant latency increase at a specific hop points to congestion or slow routing at that network segment.

## Tracing Through NAT

Verify NAT behavior for egress traffic:

```bash
# Trace route to external endpoint
kubectl exec -it netshoot -- traceroute -n google.com

# -n prevents DNS lookups, showing only IPs

# First hop should be pod's gateway
# Look for your NAT gateway IP in the path
# External hops show your public egress IP
```

Missing NAT gateway in the path indicates NAT configuration issues.

## Using Different Protocols

Test paths with various protocols:

```bash
# ICMP traceroute (default)
traceroute google.com

# UDP traceroute
traceroute -U google.com

# TCP traceroute
tcptraceroute google.com 443

# Different protocols may take different paths
# due to firewall rules or routing policies
```

Protocol-specific routing policies affect which path traffic takes.

## Tracing to Kubernetes Services

Analyze paths to cluster services:

```bash
# Trace to service ClusterIP
kubectl exec -it netshoot -- traceroute my-service.my-namespace.svc.cluster.local

# May show:
# - Direct to pod if service has single endpoint
# - Path through kube-proxy iptables rules
# - Load balancer path for LoadBalancer services

# Compare with direct pod trace
kubectl exec -it netshoot -- traceroute pod-ip
```

This reveals how kube-proxy routes service traffic.

## Diagnosing Routing Loops

Detect routing loops causing connectivity failures:

```bash
# Run traceroute with increased max hops
kubectl exec -it netshoot -- traceroute -m 50 destination

# Routing loop appears as:
# 1  10.244.0.1   0.1 ms
# 2  172.31.1.5   0.5 ms
# 3  172.31.1.10  0.7 ms
# 4  172.31.1.5   0.9 ms  # Repeats hop 2
# 5  172.31.1.10  1.1 ms  # Repeats hop 3
# ...
```

Repeating hops indicate a routing loop requiring network configuration fixes.

## Comparing Paths from Different Pods

Identify routing inconsistencies:

```bash
# Trace from pod-a to destination
kubectl exec -it pod-a -- traceroute api.example.com > /tmp/path-a.txt

# Trace from pod-b to destination
kubectl exec -it pod-b -- traceroute api.example.com > /tmp/path-b.txt

# Compare paths
diff /tmp/path-a.txt /tmp/path-b.txt

# Different paths from similar pods indicate:
# - Asymmetric routing
# - Node-specific routing configuration
# - CNI plugin issues
```

Consistent pods should take consistent paths to the same destination.

## Tracing IPv6 Paths

For IPv6 enabled clusters, trace IPv6 paths:

```bash
# Trace IPv6 route
kubectl exec -it netshoot -- traceroute6 google.com

# Or specify IPv6 explicitly
kubectl exec -it netshoot -- traceroute -6 google.com

# IPv6 paths may differ from IPv4 paths
```

Dual-stack clusters need both IPv4 and IPv6 path verification.

## Analyzing MTU Discovery

Use traceroute to diagnose MTU issues:

```bash
# Trace with large packet size
kubectl exec -it netshoot -- traceroute -F api.example.com

# -F sets "Don't Fragment" flag
# If fragmentation is needed, shows which hop blocks it

# Test with specific packet size
kubectl exec -it netshoot -- traceroute --mtu api.example.com

# Discovers Path MTU
```

MTU mismatches appear as hops that do not respond to large packets.

## Debugging Service Mesh Paths

Analyze paths through service mesh proxies:

```bash
# From meshed pod
kubectl exec -it meshed-pod -c istio-proxy -- traceroute destination

# May show:
# - Traffic through sidecar proxy
# - Egress gateway
# - External destination

# Compare with non-meshed pod
kubectl exec -it non-meshed-pod -- traceroute destination
```

Service mesh routing adds hops and latency that traceroute reveals.

## Tracing NodePort Traffic

Verify NodePort routing:

```bash
# From external system, trace to NodePort
traceroute NODE-IP

# Should reach node IP
# Service routing happens via iptables, not visible in traceroute

# From pod, trace to NodePort service
kubectl exec -it netshoot -- traceroute my-service-nodeport
```

NodePort traffic routing involves kube-proxy iptables rules that traceroute cannot show.

## Using traceroute for Performance Baseline

Establish performance baselines:

```bash
# Trace to critical external services
kubectl exec -it netshoot -- traceroute -q 10 api.example.com > baseline.txt

# Document:
# - Number of hops
# - Average latency at each hop
# - Total latency

# Compare periodically to detect degradation
# Store baselines for critical paths
```

Regular baseline comparisons catch gradual network degradation.

## Automating Path Monitoring

Create monitoring script:

```bash
#!/bin/bash
# monitor-path.sh

DESTINATION=$1
THRESHOLD_HOPS=15
THRESHOLD_LATENCY=100  # milliseconds

# Run traceroute
HOPS=$(traceroute -m 30 $DESTINATION 2>/dev/null | grep -c "^ ")
LATENCY=$(traceroute -m 30 $DESTINATION 2>/dev/null | tail -1 | awk '{print $4}')

if [ $HOPS -gt $THRESHOLD_HOPS ]; then
  echo "WARNING: Too many hops ($HOPS) to $DESTINATION"
fi

if [ $(echo "$LATENCY > $THRESHOLD_LATENCY" | bc) -eq 1 ]; then
  echo "WARNING: High latency ($LATENCY ms) to $DESTINATION"
fi
```

Automated monitoring detects path changes or degradation.

## Interpreting traceroute Output

Understanding traceroute results:

```bash
# Three asterisks mean hop did not respond
# 5  * * *

# High latency at one hop but not subsequent hops:
# 4  router1  50 ms
# 5  router2  2 ms  # Latency is router1->router2, not cumulative

# Increasing latency pattern indicates congestion:
# 1  0.1 ms
# 2  1.2 ms
# 3  5.4 ms  # Each hop adds more delay
# 4  15.8 ms
```

Correct interpretation prevents misdiagnosing network issues.

## Best Practices

When using traceroute in Kubernetes, follow these practices.

First, use TCP traceroute (tcptraceroute) when debugging application connectivity since it matches actual application traffic.

Second, run mtr for intermittent issues since it provides continuous monitoring and statistical analysis.

Third, compare paths from multiple source pods to identify pod-specific vs cluster-wide issues.

Fourth, document baseline paths and performance for critical services to detect changes quickly.

Fifth, remember that traceroute shows the path to the destination but not the return path, which may differ.

## Conclusion

traceroute provides essential visibility into network paths in Kubernetes clusters. Whether diagnosing pod-to-pod latency, verifying CNI plugin routing, troubleshooting external connectivity, or analyzing service mesh behavior, traceroute exposes the network path and identifies where problems occur.

Combined with other tools like ping, mtr, and tcpdump, traceroute builds a complete picture of network behavior. Understanding how to interpret traceroute output, when to use TCP vs ICMP traceroute, and how to compare paths across different pods makes you effective at network troubleshooting. Master traceroute, and you will diagnose network routing issues faster and with greater precision in your Kubernetes clusters.
