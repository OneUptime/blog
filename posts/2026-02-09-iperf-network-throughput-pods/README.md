# How to use iperf for measuring network throughput between pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, iperf, Network Performance, Throughput Testing, Pod Networking

Description: Master network performance testing between Kubernetes pods using iperf to measure throughput, identify bottlenecks, and optimize your cluster network.

---

Network performance between pods directly impacts application performance in Kubernetes. Whether you're running microservices, databases, or data-intensive workloads, understanding your actual network throughput is crucial. iperf is the industry-standard tool for measuring network bandwidth, and this guide shows you how to use it effectively in Kubernetes environments.

## Understanding iperf and Network Testing

iperf measures maximum achievable bandwidth between two network endpoints. It supports TCP and UDP testing, various parameters for tuning, and provides detailed statistics about packet loss, jitter, and throughput. In Kubernetes, network performance can vary based on CNI plugin, node configuration, and network policies.

## Setting Up iperf Server Pod

First, deploy an iperf server that will receive test traffic. This pod runs iperf in server mode, listening for incoming connections.

```yaml
# iperf-server.yaml
apiVersion: v1
kind: Pod
metadata:
  name: iperf-server
  labels:
    app: iperf-server
spec:
  containers:
  - name: iperf
    image: networkstatic/iperf3
    args: ['-s']  # Server mode
    ports:
    - containerPort: 5201
      name: iperf
---
apiVersion: v1
kind: Service
metadata:
  name: iperf-server
spec:
  selector:
    app: iperf-server
  ports:
  - protocol: TCP
    port: 5201
    targetPort: 5201
```

Deploy the server:

```bash
kubectl apply -f iperf-server.yaml

# Verify the server is running
kubectl get pods -l app=iperf-server
kubectl logs iperf-server
```

## Running Basic Throughput Tests

Deploy a client pod to run tests against the server:

```yaml
# iperf-client.yaml
apiVersion: v1
kind: Pod
metadata:
  name: iperf-client
spec:
  containers:
  - name: iperf
    image: networkstatic/iperf3
    command: ['sleep', '3600']  # Keep pod running
```

```bash
kubectl apply -f iperf-client.yaml

# Run a basic TCP throughput test
kubectl exec -it iperf-client -- iperf3 -c iperf-server -t 30

# Output shows:
# [ ID] Interval           Transfer     Bitrate         Retr
# [  5]   0.00-30.00  sec  3.25 GBytes   931 Mbits/sec    0   sender
# [  5]   0.00-30.00  sec  3.25 GBytes   929 Mbits/sec        receiver
```

The basic test runs for 30 seconds and reports throughput in both directions.

## Advanced Testing Scenarios

### Parallel Streams

Test throughput with multiple parallel streams to better utilize available bandwidth:

```bash
# Run 10 parallel streams
kubectl exec -it iperf-client -- iperf3 -c iperf-server -P 10 -t 30

# This often reveals higher total throughput as multiple streams
# can better saturate high-bandwidth links
```

### Bidirectional Testing

Measure throughput in both directions simultaneously:

```bash
# Test both upload and download
kubectl exec -it iperf-client -- iperf3 -c iperf-server -d -t 30

# Reverse mode (server sends data)
kubectl exec -it iperf-client -- iperf3 -c iperf-server -R -t 30
```

### UDP Testing with Packet Loss

UDP tests help identify packet loss and jitter, important for real-time applications:

```bash
# UDP test at 100 Mbps
kubectl exec -it iperf-client -- iperf3 -c iperf-server -u -b 100M -t 30

# Output includes:
# [ ID] Interval           Transfer     Bitrate         Jitter    Lost/Total Datagrams
# [  5]   0.00-30.00  sec   357 MBytes   100 Mbits/sec  0.015 ms  0/261042 (0%)
```

### Testing with Different Packet Sizes

Adjust MSS (Maximum Segment Size) to test with different packet sizes:

```bash
# Test with 9000 byte MTU (jumbo frames)
kubectl exec -it iperf-client -- iperf3 -c iperf-server -M 9000 -t 30

# Test with smaller packets
kubectl exec -it iperf-client -- iperf3 -c iperf-server -M 536 -t 30
```

## Testing Across Different Network Scenarios

### Same Node Performance

Test throughput between pods on the same node:

```yaml
# iperf-same-node.yaml
apiVersion: v1
kind: Pod
metadata:
  name: iperf-server-node1
spec:
  nodeName: worker-node-1  # Pin to specific node
  containers:
  - name: iperf
    image: networkstatic/iperf3
    args: ['-s']
---
apiVersion: v1
kind: Pod
metadata:
  name: iperf-client-node1
spec:
  nodeName: worker-node-1  # Same node as server
  containers:
  - name: iperf
    image: networkstatic/iperf3
    command: ['sleep', '3600']
```

### Cross-Node Performance

Test throughput between pods on different nodes:

```yaml
# iperf-cross-node.yaml
apiVersion: v1
kind: Pod
metadata:
  name: iperf-server-node1
spec:
  nodeName: worker-node-1
  containers:
  - name: iperf
    image: networkstatic/iperf3
    args: ['-s']
---
apiVersion: v1
kind: Pod
metadata:
  name: iperf-client-node2
spec:
  nodeName: worker-node-2  # Different node
  containers:
  - name: iperf
    image: networkstatic/iperf3
    command: ['sleep', '3600']
```

Run the test:

```bash
# Get server IP
SERVER_IP=$(kubectl get pod iperf-server-node1 -o jsonpath='{.status.podIP}')

# Run cross-node test
kubectl exec -it iperf-client-node2 -- iperf3 -c $SERVER_IP -t 30
```

### Testing with Network Policies

Verify that network policies don't impact performance:

```yaml
# network-policy-test.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: iperf-allow
spec:
  podSelector:
    matchLabels:
      app: iperf-server
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: iperf-client
    ports:
    - protocol: TCP
      port: 5201
```

## Automated Testing with Jobs

Create a Job that runs periodic throughput tests:

```yaml
# iperf-test-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: iperf-throughput-test
spec:
  template:
    spec:
      containers:
      - name: iperf
        image: networkstatic/iperf3
        command:
        - /bin/sh
        - -c
        - |
          echo "Starting throughput test at $(date)"

          # Basic TCP test
          echo "=== TCP Test ==="
          iperf3 -c iperf-server -t 30 -J > /tmp/tcp-results.json

          # Parallel streams
          echo "=== Parallel Streams Test ==="
          iperf3 -c iperf-server -P 5 -t 30 -J > /tmp/parallel-results.json

          # UDP test
          echo "=== UDP Test ==="
          iperf3 -c iperf-server -u -b 100M -t 30 -J > /tmp/udp-results.json

          # Parse and display results
          cat /tmp/tcp-results.json | jq '.end.sum_received.bits_per_second / 1000000'

          echo "Tests completed at $(date)"
      restartPolicy: Never
  backoffLimit: 3
```

## Analyzing and Interpreting Results

### JSON Output for Automation

Use JSON output for programmatic analysis:

```bash
# Generate JSON output
kubectl exec -it iperf-client -- iperf3 -c iperf-server -t 30 -J > results.json

# Parse key metrics with jq
cat results.json | jq '.end.sum_received.bits_per_second / 1000000'  # Mbps
cat results.json | jq '.end.sum_sent.retransmits'  # Retransmissions
cat results.json | jq '.end.streams[].sender.bytes'  # Bytes per stream
```

### Key Metrics to Monitor

```bash
# Create a parsing script
cat << 'EOF' > parse-iperf.sh
#!/bin/bash
# Extract key metrics from iperf3 JSON output

RESULTS=$1

echo "=== Network Performance Summary ==="
echo "Throughput: $(jq -r '.end.sum_received.bits_per_second / 1000000 | tostring + " Mbps"' $RESULTS)"
echo "Retransmissions: $(jq -r '.end.sum_sent.retransmits' $RESULTS)"
echo "CPU Utilization (sender): $(jq -r '.end.cpu_utilization_percent.host_total | tostring + "%"' $RESULTS)"
echo "Mean RTT: $(jq -r '.end.streams[0].sender.mean_rtt' $RESULTS) μs"

# Check for performance issues
RETRANS=$(jq -r '.end.sum_sent.retransmits' $RESULTS)
if [ "$RETRANS" -gt 100 ]; then
  echo "WARNING: High retransmission count detected!"
fi
EOF

chmod +x parse-iperf.sh
```

## Creating a DaemonSet for Network Mesh Testing

Deploy iperf on all nodes to test full network mesh:

```yaml
# iperf-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: iperf-server
spec:
  selector:
    matchLabels:
      app: iperf-mesh
  template:
    metadata:
      labels:
        app: iperf-mesh
    spec:
      hostNetwork: true  # Use host network for maximum performance
      containers:
      - name: iperf
        image: networkstatic/iperf3
        args: ['-s']
        securityContext:
          capabilities:
            add: ['NET_ADMIN']
```

Run mesh tests:

```bash
# Get all iperf pod IPs
kubectl get pods -l app=iperf-mesh -o wide

# Run tests from each node to every other node
for pod in $(kubectl get pods -l app=iperf-mesh -o name); do
  echo "Testing from $pod"
  kubectl exec $pod -- iperf3 -c <target-ip> -t 10
done
```

## Troubleshooting Common Issues

### Low Throughput

If throughput is unexpectedly low:

```bash
# Check for CPU throttling
kubectl top pods

# Verify MTU settings
kubectl exec -it iperf-client -- ip link show eth0

# Test with increased buffer sizes
kubectl exec -it iperf-client -- iperf3 -c iperf-server -w 256K
```

### High Packet Loss

For UDP tests showing packet loss:

```bash
# Reduce sending rate
kubectl exec -it iperf-client -- iperf3 -c iperf-server -u -b 10M

# Check for CNI plugin issues
kubectl describe pod iperf-client | grep -A 10 Events
```

## Best Practices

Always run tests during maintenance windows to avoid impacting production workloads. Use multiple test durations - short tests for quick checks and longer tests for thorough analysis. Document baseline performance metrics for your cluster to identify degradation over time. Consider resource limits to prevent iperf from consuming excessive resources.

Network throughput testing with iperf provides concrete data about your Kubernetes network performance. Regular testing helps identify issues before they impact applications, validates network configuration changes, and ensures your cluster meets performance requirements. Use these techniques to maintain a high-performance, reliable network infrastructure.
