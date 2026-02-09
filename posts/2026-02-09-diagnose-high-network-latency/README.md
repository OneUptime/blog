# How to Diagnose High Network Latency Between Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Performance

Description: Identify and fix high network latency between Kubernetes pods using systematic diagnostic techniques and performance analysis tools.

---

High network latency between pods degrades application performance in ways that are hard to detect and diagnose. A database query that should take milliseconds takes seconds. An API call that normally responds instantly times out. Users complain about slow responses, but application metrics show everything is fine because the slowness happens in network transit.

Pod-to-pod latency should typically be under 1 millisecond within the same node and under 10 milliseconds across nodes in the same datacenter. When latency exceeds these thresholds, you need to systematically identify the cause and fix it.

## Measuring Baseline Latency

Before diagnosing high latency, establish a baseline:

```bash
# Test basic ICMP latency between pods
kubectl exec -it source-pod -- ping -c 100 destination-pod-ip

# Look at the statistics:
# rtt min/avg/max/mdev = 0.234/0.456/1.234/0.123 ms
# avg should be under 1ms same node, under 10ms different nodes

# Test with larger packet sizes
kubectl exec -it source-pod -- ping -s 1400 -c 100 destination-pod-ip

# Larger packets reveal MTU issues
```

If average latency significantly exceeds expected values, you have a latency problem to diagnose.

## Testing Application-Level Latency

ICMP tests show network layer latency, but application protocols add overhead:

```bash
# Test HTTP request latency
kubectl exec -it source-pod -- sh -c \
  'time curl -o /dev/null -s http://destination-pod-ip:8080/'

# Measure multiple requests
for i in {1..10}; do
  kubectl exec source-pod -- sh -c \
    'time curl -o /dev/null -s http://destination-service:8080/' 2>&1 | grep real
done

# Look for consistent high latency or spikes
```

Compare HTTP latency with ICMP latency. Large differences suggest application-level issues rather than network issues.

## Using httping for Continuous Latency Monitoring

httping measures HTTP request latency continuously:

```bash
# Run debug container with network tools
kubectl debug -it pod/source-pod --image=nicolaka/netshoot

# Install httping if needed
apk add httping

# Monitor HTTP latency
httping -c 100 http://destination-service:8080/

# Output shows latency for each request
# connected to 10.96.1.5:8080 (89 bytes), seq=0 time= 2.45 ms
# connected to 10.96.1.5:8080 (89 bytes), seq=1 time= 1.23 ms
```

This reveals latency patterns including spikes, gradual increases, or consistent high latency.

## Checking Pod Placement

Pod placement affects latency significantly:

```bash
# Check which nodes host your pods
kubectl get pods -o wide -n my-namespace

# Pods on the same node have lower latency
# Pods on different nodes traverse the network

# Check node locations (cloud provider zones)
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
ZONE:.metadata.labels.topology\.kubernetes\.io/zone

# Cross-zone traffic has higher latency than intra-zone
```

If latency-sensitive pods are spread across zones, use pod affinity to colocate them:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: frontend
spec:
  affinity:
    podAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
          - key: app
            operator: In
            values:
            - backend
        topologyKey: kubernetes.io/hostname
  containers:
  - name: app
    image: frontend:latest
```

## Analyzing Network Path

Trace the network path between pods:

```bash
# Run traceroute from source to destination
kubectl debug -it pod/source-pod --image=nicolaka/netshoot
traceroute destination-pod-ip

# Count hops and check latency at each hop
# More hops = more latency

# For TCP-based traceroute
tcptraceroute destination-pod-ip 8080

# Check if traffic goes through unexpected paths
```

In a healthy Kubernetes network, pod-to-pod traffic on the same node should have minimal hops (direct connection). Cross-node traffic should traverse the overlay network with predictable latency.

## Checking CNI Plugin Performance

Different CNI plugins have different performance characteristics:

```bash
# Identify your CNI plugin
kubectl get pods -n kube-system | grep -E "calico|cilium|flannel|weave"

# Check CNI plugin logs for errors
kubectl logs -n kube-system -l k8s-app=calico-node --tail=100

# For Cilium, check for performance metrics
kubectl exec -n kube-system cilium-xxx -- cilium metrics list | grep latency

# Check for packet drops
kubectl exec -n kube-system cilium-xxx -- cilium endpoint list
```

Some CNI plugins are faster than others. Calico and Cilium typically offer better performance than Flannel VXLAN due to more efficient encapsulation.

## Measuring Network Throughput

Low throughput can manifest as high latency under load:

```bash
# Run iperf3 server on destination
kubectl debug -it pod/dest-pod --image=nicolaka/netshoot
iperf3 -s

# Run iperf3 client from source (different terminal)
kubectl debug -it pod/source-pod --image=nicolaka/netshoot
iperf3 -c dest-pod-ip -t 30

# Check results:
# [ ID] Interval           Transfer     Bitrate
# [  5]   0.00-30.00  sec  3.50 GBytes  1.00 Gbits/sec

# Low throughput indicates network bottleneck
```

Expected throughput depends on your infrastructure, but you should see hundreds of megabits to several gigabits per second within a datacenter.

## Checking for Packet Loss

Packet loss causes retransmissions and increased latency:

```bash
# Ping with count to measure packet loss
kubectl exec -it source-pod -- ping -c 1000 dest-pod-ip

# Check packet loss percentage at the end:
# 1000 packets transmitted, 998 received, 0.2% packet loss

# Even small packet loss (> 0.1%) degrades TCP performance

# Use mtr for continuous monitoring
kubectl debug -it pod/source-pod --image=nicolaka/netshoot
mtr -c 100 dest-pod-ip
```

Any consistent packet loss indicates network problems requiring investigation.

## Analyzing TCP Retransmissions

TCP retransmissions dramatically increase latency:

```bash
# Capture traffic and analyze for retransmissions
kubectl debug -it pod/source-pod --image=nicolaka/netshoot

# Capture traffic to file
tcpdump -i any host dest-pod-ip -w /tmp/capture.pcap

# Copy file locally
kubectl cp source-pod:/tmp/capture.pcap ./capture.pcap

# Analyze with tcpdump
tcpdump -r capture.pcap | grep -i retransmission

# Or use Wireshark and filter:
# tcp.analysis.retransmission
```

High retransmission rates indicate network instability, congestion, or packet loss.

## Checking Node Network Performance

Node-level network issues affect all pods on the node:

```bash
# Check node network statistics
kubectl debug node/my-node -it --image=nicolaka/netshoot

# Inside the debug pod
# Check for errors
ip -s link show

# Look for:
# RX errors, dropped packets, overruns
# TX errors, dropped packets, carrier errors

# Check network driver statistics
ethtool -S eth0 | grep -i error
```

Network interface errors indicate hardware problems, driver issues, or network congestion.

## Monitoring CoreDNS Latency

DNS resolution latency adds to overall request latency:

```bash
# Test DNS resolution speed
kubectl exec -it source-pod -- sh -c \
  'time nslookup destination-service.my-namespace.svc.cluster.local'

# Should complete in under 10ms
# If slower, check CoreDNS performance

# Check CoreDNS metrics
kubectl port-forward -n kube-system svc/kube-dns 9153:9153
curl http://localhost:9153/metrics | grep coredns_dns_request_duration

# High p95/p99 latency indicates CoreDNS overload
```

Deploy NodeLocal DNSCache to reduce DNS latency if CoreDNS is slow.

## Checking for Network Congestion

Network congestion increases latency:

```bash
# Monitor network utilization on nodes
kubectl top nodes

# Check interface bandwidth usage
kubectl debug node/my-node -it --image=nicolaka/netshoot

# Monitor bandwidth in real-time
iftop -i eth0

# Check for traffic spikes
sar -n DEV 1 10
```

If network utilization approaches interface capacity, congestion causes latency spikes.

## Analyzing Service Load Balancing

Uneven load balancing sends traffic to slow backends:

```bash
# Check service endpoints and their health
kubectl get endpoints my-service -n my-namespace -o yaml

# Test latency to individual endpoints
for ip in $(kubectl get endpoints my-service -n my-namespace -o jsonpath='{.subsets[0].addresses[*].ip}'); do
  echo "Testing $ip:"
  kubectl exec source-pod -- sh -c "time curl -o /dev/null -s http://$ip:8080/" 2>&1 | grep real
done

# Slow endpoints increase average latency
```

Remove or fix slow endpoints to improve service latency.

## Checking iptables Performance

Extensive iptables rules slow packet processing:

```bash
# Count iptables rules
kubectl debug node/my-node -it --image=nicolaka/netshoot
iptables -S | wc -l

# Thousands of rules (> 10,000) degrade performance

# Check kube-proxy mode
kubectl logs -n kube-system kube-proxy-xxx | grep "Using"

# IPVS mode performs better than iptables for large clusters
```

Consider switching from iptables to IPVS mode for better performance in large clusters.

## Testing Network Policies Impact

NetworkPolicies add processing overhead:

```bash
# Check NetworkPolicies affecting your pods
kubectl get networkpolicy -n my-namespace

# Temporarily remove policies to test impact
kubectl delete networkpolicy test-policy -n my-namespace

# Measure latency with and without policies
# Some CNI plugins handle policies more efficiently than others
```

Complex NetworkPolicies with many rules can increase latency, especially with less efficient CNI plugins.

## Checking MTU Configuration

MTU mismatches cause fragmentation and increased latency:

```bash
# Check MTU on pod interfaces
kubectl exec -it my-pod -- ip link show

# Should match expected value (1450 for VXLAN, 1500 for others)

# Test with large packets
kubectl exec -it source-pod -- ping -M do -s 1400 dest-pod-ip

# If large packets fail or have higher latency, MTU is misconfigured
```

Set consistent MTU across all network interfaces to avoid fragmentation.

## Using eBPF for Deep Network Analysis

For advanced latency analysis, use eBPF tools:

```bash
# If using Cilium, check network latency metrics
kubectl exec -n kube-system cilium-xxx -- cilium metrics list | grep latency

# Use bpftrace for custom latency tracking
kubectl debug node/my-node -it --image=nicolaka/netshoot

# Example bpftrace script to measure TCP latency
bpftrace -e 'kprobe:tcp_sendmsg { @start[tid] = nsecs; }
             kretprobe:tcp_sendmsg /@start[tid]/ {
               @latency = hist(nsecs - @start[tid]);
               delete(@start[tid]);
             }'
```

eBPF provides kernel-level visibility into network stack performance.

## Creating Latency Monitoring Dashboard

Set up continuous latency monitoring:

```yaml
# Deploy latency monitoring with blackbox exporter
apiVersion: v1
kind: ConfigMap
metadata:
  name: blackbox-config
data:
  blackbox.yml: |
    modules:
      http_2xx:
        prober: http
        timeout: 5s
        http:
          valid_status_codes: []
          method: GET
---
# Configure ServiceMonitor to scrape latency metrics
# Use Prometheus queries:
# probe_duration_seconds
# probe_http_duration_seconds
```

Graph latency over time in Grafana to identify patterns and trends.

## Optimizing Application Code

Sometimes "network latency" is actually application processing time:

```bash
# Use application profiling to distinguish network from processing time

# Add timing logs in application code
# Before network call: log timestamp
# After network call: log timestamp and calculate duration

# Compare application-measured latency with network-measured latency
# Large differences indicate application processing delays
```

Optimize application code, database queries, or caching to reduce total latency.

## Conclusion

High network latency between Kubernetes pods stems from various causes including poor pod placement across zones, CNI plugin inefficiencies, network congestion, packet loss, DNS resolution delays, or application-level issues. Systematic diagnosis starts with measuring baseline latency, identifying the network path, checking for packet loss and retransmissions, and analyzing component performance.

Use the right tools for each layer: ping for basic connectivity, httping for HTTP latency, iperf for throughput, tcpdump for packet analysis, and eBPF for deep kernel insights. Combine measurements across multiple layers to build a complete picture of where latency originates.

Once you identify the cause, apply targeted fixes like pod affinity rules, CNI plugin tuning, MTU optimization, or NetworkPolicy simplification. Regular latency monitoring catches problems early before they impact users. Master these diagnostic techniques, and you will maintain low-latency communication across your Kubernetes cluster.
