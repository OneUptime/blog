# How to Use ksniff for Capturing Pod Network Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Debugging

Description: Learn how to use ksniff to capture and analyze network traffic from Kubernetes pods for troubleshooting connectivity and performance issues.

---

Network packet captures are essential for diagnosing complex connectivity problems in Kubernetes. While you can manually run tcpdump in pods, ksniff simplifies the process by automating packet capture from any pod without modifying its configuration. It handles the complexity of deploying capture tools, collecting packets, and downloading them to your local machine.

ksniff is a kubectl plugin that makes capturing pod network traffic as simple as running a single command. By default, it uploads a statically compiled tcpdump binary into the target pod, captures traffic from the pod's network namespace, and streams the capture to your local Wireshark or saves it to a file. For containers that cannot run tcpdump directly, its privileged mode can create a helper pod that attaches to the target container's network namespace.

## Installing ksniff

Install ksniff using krew, the kubectl plugin manager:

```bash
# Install krew if you don't have it

# Visit https://krew.sigs.k8s.io/docs/user-guide/setup/install/

# Install ksniff plugin
kubectl krew install sniff

# Verify installation
kubectl sniff --help
```

Alternatively, download the binary directly from the ksniff GitHub releases page and place it in your PATH as `kubectl-sniff`.

## Basic Traffic Capture

Capture traffic from a pod with the simplest command:

```bash
# Capture all traffic from a pod
kubectl sniff my-pod -n my-namespace

# This opens Wireshark with live traffic capture
# Press Ctrl+C to stop
```

When you run this command, ksniff performs several actions automatically. It selects the target container, uploads or uses tcpdump to capture packets from the pod's network namespace, and streams the packets to your local machine where Wireshark displays them in real time.

## Saving Captures to Files

For later analysis or sharing with teammates, save captures to pcap files:

```bash
# Save capture to a file instead of opening Wireshark
kubectl sniff my-pod -n my-namespace -o capture.pcap

# Capture for a specific duration then stop
timeout 60 kubectl sniff my-pod -n my-namespace -o capture.pcap

# The file can be opened in Wireshark later
wireshark capture.pcap
```

This approach is useful when you need to capture traffic during a specific event or when running on a headless server without Wireshark installed.

## Filtering Captured Traffic

Capturing all traffic generates massive amounts of data. Use filters to capture only relevant packets:

```bash
# Capture only HTTP traffic (port 80)
kubectl sniff my-pod -n my-namespace -f "port 80"

# Capture traffic to/from a specific IP
kubectl sniff my-pod -n my-namespace -f "host 10.244.1.5"

# Capture only TCP traffic on port 8080
kubectl sniff my-pod -n my-namespace -f "tcp and port 8080"

# Capture DNS queries
kubectl sniff my-pod -n my-namespace -f "port 53"

# Complex filter: HTTP or HTTPS traffic
kubectl sniff my-pod -n my-namespace -f "port 80 or port 443"
```

The filter syntax follows standard tcpdump/BPF (Berkeley Packet Filter) format, which provides powerful filtering capabilities.

## Capturing from Specific Containers

In pods with multiple containers, specify which container's traffic to capture:

```bash
# Capture from a specific container
kubectl sniff my-pod -n my-namespace -c sidecar-container

# Useful when debugging sidecar proxy issues
kubectl sniff my-pod -n my-namespace -c istio-proxy
```

This selects the container where ksniff runs tcpdump or the container network namespace it attaches to. In normal Kubernetes pods, containers share the same network namespace, so this does not isolate traffic from other containers in the same pod.

## Using Different Capture Images

In privileged mode, ksniff uses container images for the helper pod and tcpdump. You can specify a different tcpdump image:

```bash
# Use a specific tcpdump image in privileged mode
kubectl sniff my-pod -n my-namespace -p --tcpdump-image docker.io/maintained/tcpdump

# Use a custom image from your registry
kubectl sniff my-pod -n my-namespace -p --tcpdump-image my-registry.com/custom-sniffer:latest
```

Custom images are helpful in privileged mode when you need a specific tcpdump image or need to mirror images into a private registry.

## Capturing from Privileged Mode

Some environments require additional privileges for packet capture:

```bash
# Use privileged mode explicitly
kubectl sniff my-pod -n my-namespace -p

# Without -p, ksniff tries to upload and run tcpdump in the target container
kubectl sniff my-pod -n my-namespace
```

Privileged mode has limitations and may not work in clusters that restrict privileged pods.

## Debugging ksniff Issues

When ksniff fails to capture traffic, troubleshoot with verbose output:

```bash
# Enable verbose logging
kubectl sniff my-pod -n my-namespace -v

# This shows detailed information about:
# - Pod and node identification
# - Sniffer container deployment
# - Network interface selection
# - Packet capture startup
```

Common issues include insufficient permissions to create privileged pods, network policies blocking the sniffer container, or missing tcpdump in the sniffer image.

## Capturing Traffic During Load Tests

Coordinate packet captures with load tests to diagnose performance issues:

```bash
# In terminal 1: Start traffic capture
kubectl sniff my-pod -n my-namespace -o load-test.pcap

# In terminal 2: Run load test
kubectl run load-test --rm -it --image=busybox -- sh -c \
  "while true; do wget -O- http://my-service:8080; done"

# Stop capture after collecting enough data
```

Analyze the capture to find patterns in failed requests, retransmissions, or slow responses.

## Analyzing TLS/SSL Traffic

While ksniff captures encrypted TLS traffic, you cannot decrypt it without the encryption keys:

```bash
# Capture HTTPS traffic
kubectl sniff my-pod -n my-namespace -f "port 443" -o tls-capture.pcap

# In Wireshark, you can still see:
# - Connection establishment (TCP handshake)
# - TLS handshake (server hello, certificate exchange)
# - Encrypted data transfer
# - Connection termination
```

To analyze encrypted content, you need SSL keys from the application. Some debugging builds export these keys to enable traffic analysis.

## Capturing Service Mesh Traffic

For service mesh environments like Istio, capture sidecar proxy traffic:

```bash
# Capture traffic from Istio sidecar
kubectl sniff my-pod -n my-namespace -c istio-proxy -f "port 15001"

# Port 15001 is Envoy's default outbound traffic port
# Port 15006 is the inbound port

# Capture both inbound and outbound
kubectl sniff my-pod -n my-namespace -c istio-proxy -f "port 15001 or port 15006"
```

This reveals how the service mesh proxy handles traffic, including retries, circuit breaking, and load balancing decisions.

## Comparing Traffic Between Pods

Capture traffic from multiple pods to compare behavior:

```bash
# Capture from working pod
kubectl sniff working-pod -n my-namespace -o working.pcap &

# Capture from failing pod
kubectl sniff failing-pod -n my-namespace -o failing.pcap &

# Wait for both captures to collect data
sleep 30

# Stop both captures
killall kubectl-sniff

# Compare in Wireshark to find differences
```

Side-by-side comparison often reveals subtle differences like missing packets, different headers, or timing issues.

## Automating Captures with Scripts

Create scripts to automate common capture scenarios:

```bash
#!/bin/bash
# capture-pod-traffic.sh

POD_NAME=$1
NAMESPACE=$2
DURATION=${3:-60}
OUTPUT_FILE="${POD_NAME}-$(date +%Y%m%d-%H%M%S).pcap"

echo "Capturing traffic from $POD_NAME for $DURATION seconds..."
timeout $DURATION kubectl sniff $POD_NAME -n $NAMESPACE -o $OUTPUT_FILE

echo "Capture saved to $OUTPUT_FILE"
echo "File size: $(du -h $OUTPUT_FILE | cut -f1)"

# Run: ./capture-pod-traffic.sh my-pod production 120
```

This standardizes capture procedures and makes it easy to collect consistent data.

## Analyzing Captures with Command Line Tools

After capturing traffic, analyze it without Wireshark using command-line tools:

```bash
# Count packets by protocol
tshark -r capture.pcap -T fields -e _ws.col.Protocol | sort | uniq -c

# Extract HTTP requests
tcpdump -r capture.pcap -A -s 0 'tcp port 80 and (((ip[2:2] - ((ip[0]&0xf)<<2)) - ((tcp[12]&0xf0)>>2)) != 0)'

# Find retransmissions
tshark -r capture.pcap -Y 'tcp.analysis.retransmission'

# Get timing statistics
capinfos capture.pcap
```

Command-line analysis is faster for simple queries and works well in automated pipelines.

## Best Practices for Packet Capture

When using ksniff in production, follow these practices to minimize impact.

First, use filters to capture only necessary traffic. Unfiltered captures on busy pods generate gigabytes of data quickly and can impact performance.

Second, limit capture duration. Long-running captures consume disk space and processing power. Capture only as long as needed to reproduce the issue.

Third, be mindful of sensitive data. Packet captures contain all transmitted data, including potentially sensitive information. Handle capture files securely and delete them after analysis.

Fourth, test in development first. The ksniff project notes that it is not production ready, so verify it works in your environment before using it for production troubleshooting.

## Troubleshooting Common ksniff Problems

If ksniff cannot create the privileged helper pod, check whether your cluster allows privileged pods:

```bash
# Check whether your user can create pods in the namespace
kubectl auth can-i create pods -n my-namespace

# Check Pod Security Admission labels on the namespace
kubectl get namespace my-namespace --show-labels

# Your cluster might restrict privileged containers with Pod Security Admission
# or another admission controller
```

If packet capture is empty, verify the correct network interface is selected:

```bash
# List network interfaces in the pod
kubectl exec my-pod -- ip link show

# ksniff should auto-detect the correct interface
# If it doesn't, this may indicate network configuration issues
```

If Wireshark does not open, ensure it is installed and in your PATH:

```bash
# Check Wireshark installation
which wireshark

# Install if missing (macOS)
brew install --cask wireshark

# Install if missing (Linux)
sudo apt-get install wireshark
```

## Integrating with Observability Tools

Combine ksniff captures with other observability data:

```bash
# Capture traffic while checking metrics
kubectl sniff my-pod -n my-namespace -o debug.pcap &

# In another terminal, watch pod metrics
kubectl top pod my-pod -n my-namespace --watch

# Check logs simultaneously
kubectl logs -f my-pod -n my-namespace

# Stop capture when you have enough data
```

Correlating packet captures with logs and metrics provides comprehensive insights into issues.

## Conclusion

ksniff transforms network troubleshooting in Kubernetes by making packet capture simple and accessible. Instead of manually deploying debugging containers, configuring tcpdump, and extracting capture files, you run a single command and get live traffic analysis in Wireshark.

The ability to filter traffic, target specific containers, and quickly capture from any pod makes ksniff indispensable for diagnosing network issues. Whether you are debugging intermittent connection failures, analyzing protocol-level behavior, or optimizing network performance, ksniff gives you the visibility you need. Master this tool, and you will solve network problems faster and with greater confidence.
