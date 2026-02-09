# How to Use tcpdump in Kubernetes Pods to Capture Network Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Debugging

Description: Learn how to use tcpdump in Kubernetes pods for network traffic analysis, troubleshooting connectivity issues, and debugging application communication problems.

---

Network issues in Kubernetes can be challenging to diagnose without visibility into actual packet flows. tcpdump provides that visibility by capturing network traffic at the packet level, showing you exactly what's being sent and received. This is invaluable for debugging connection timeouts, analyzing protocol issues, investigating security incidents, and understanding traffic patterns.

Unlike application logs that show intent, tcpdump shows reality at the network layer. You can see actual TCP handshakes, DNS queries, HTTP requests, TLS negotiations, and packet retransmissions.

## Prerequisites for tcpdump

tcpdump requires NET_ADMIN and NET_RAW capabilities to capture packets. Standard pods don't have these capabilities for security reasons:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: tcpdump-enabled-pod
spec:
  containers:
  - name: app
    image: myapp:latest
    securityContext:
      capabilities:
        add:
        - NET_ADMIN
        - NET_RAW
  - name: network-debug
    image: nicolaka/netshoot
    command: ["sleep", "infinity"]
    securityContext:
      capabilities:
        add:
        - NET_ADMIN
        - NET_RAW
```

## Installing tcpdump

Add tcpdump to containers:

```bash
# Debian/Ubuntu
kubectl exec -it my-pod -- apt-get update && apt-get install -y tcpdump

# Alpine Linux
kubectl exec -it my-pod -- apk add --no-cache tcpdump

# Using ephemeral container with tcpdump pre-installed
kubectl debug my-pod -it --image=nicolaka/netshoot --target=my-pod

# Verify installation
kubectl exec my-pod -- tcpdump --version
```

## Basic tcpdump Usage

Capture network traffic:

```bash
# Capture all traffic on all interfaces
kubectl exec my-pod -- tcpdump -i any

# Capture on specific interface
kubectl exec my-pod -- tcpdump -i eth0

# Capture specific number of packets
kubectl exec my-pod -- tcpdump -i any -c 100

# Save capture to file
kubectl exec my-pod -- tcpdump -i any -w /tmp/capture.pcap

# Copy capture file locally
kubectl cp my-pod:/tmp/capture.pcap ./capture.pcap

# Analyze with Wireshark locally
wireshark ./capture.pcap
```

## Filtering by Port

Capture traffic on specific ports:

```bash
# Capture HTTP traffic
kubectl exec my-pod -- tcpdump -i any port 80

# Capture HTTPS traffic
kubectl exec my-pod -- tcpdump -i any port 443

# Capture traffic on application port
kubectl exec my-pod -- tcpdump -i any port 8080

# Capture multiple ports
kubectl exec my-pod -- tcpdump -i any 'port 80 or port 443'

# Capture port range
kubectl exec my-pod -- tcpdump -i any 'portrange 8000-9000'
```

## Filtering by Host

Capture traffic to/from specific hosts:

```bash
# Traffic to/from specific IP
kubectl exec my-pod -- tcpdump -i any host 10.244.1.5

# Traffic from specific IP
kubectl exec my-pod -- tcpdump -i any src host 10.244.1.5

# Traffic to specific IP
kubectl exec my-pod -- tcpdump -i any dst host 10.244.1.5

# Traffic to/from specific hostname
kubectl exec my-pod -- tcpdump -i any host database-service

# Multiple hosts
kubectl exec my-pod -- tcpdump -i any 'host 10.244.1.5 or host 10.244.1.6'
```

## Protocol-Specific Captures

Focus on specific protocols:

```bash
# TCP traffic only
kubectl exec my-pod -- tcpdump -i any tcp

# UDP traffic only
kubectl exec my-pod -- tcpdump -i any udp

# ICMP (ping) traffic
kubectl exec my-pod -- tcpdump -i any icmp

# DNS queries
kubectl exec my-pod -- tcpdump -i any port 53

# HTTP requests (showing ASCII)
kubectl exec my-pod -- tcpdump -i any -A 'tcp port 80'

# HTTPS (encrypted, shows handshake)
kubectl exec my-pod -- tcpdump -i any -X 'tcp port 443'
```

## Advanced Filtering

Complex capture filters:

```bash
# TCP SYN packets (connection attempts)
kubectl exec my-pod -- tcpdump -i any 'tcp[tcpflags] & (tcp-syn) != 0'

# TCP SYN-ACK packets
kubectl exec my-pod -- tcpdump -i any 'tcp[tcpflags] & (tcp-syn|tcp-ack) == (tcp-syn|tcp-ack)'

# TCP RST packets (connection resets)
kubectl exec my-pod -- tcpdump -i any 'tcp[tcpflags] & (tcp-rst) != 0'

# HTTP GET requests
kubectl exec my-pod -- tcpdump -i any -A 'tcp port 80 and (((ip[2:2] - ((ip[0]&0xf)<<2)) - ((tcp[12]&0xf0)>>2)) != 0)'

# Packets with specific payload
kubectl exec my-pod -- tcpdump -i any 'tcp[((tcp[12:1] & 0xf0) >> 2):4] = 0x47455420'

# Large packets (> 1500 bytes)
kubectl exec my-pod -- tcpdump -i any 'greater 1500'
```

## Debugging DNS Issues

Capture and analyze DNS traffic:

```bash
# All DNS traffic
kubectl exec my-pod -- tcpdump -i any port 53 -vv

# DNS queries only
kubectl exec my-pod -- tcpdump -i any 'udp port 53 and (udp[10] & 0x80) == 0'

# DNS responses only
kubectl exec my-pod -- tcpdump -i any 'udp port 53 and (udp[10] & 0x80) != 0'

# Detailed DNS with timestamps
kubectl exec my-pod -- tcpdump -i any -tttt -vv port 53

# Save DNS traffic for analysis
kubectl exec my-pod -- tcpdump -i any -w /tmp/dns.pcap port 53
kubectl cp my-pod:/tmp/dns.pcap ./dns.pcap
```

## Debugging HTTP Traffic

Capture HTTP requests and responses:

```bash
# Show HTTP headers
kubectl exec my-pod -- tcpdump -i any -A -s 0 'tcp port 80 and (((ip[2:2] - ((ip[0]&0xf)<<2)) - ((tcp[12]&0xf0)>>2)) != 0)'

# HTTP GET requests
kubectl exec my-pod -- tcpdump -i any -A 'tcp port 80' | grep -E 'GET|POST|HTTP'

# Show full HTTP content
kubectl exec my-pod -- tcpdump -i any -A -s 0 'tcp port 8080'

# HTTP traffic to specific service
kubectl exec my-pod -- tcpdump -i any -A 'tcp port 80 and host api-service'
```

## Performance Analysis

Measure network performance:

```bash
# Show packet timestamps
kubectl exec my-pod -- tcpdump -i any -tttt

# Show relative timestamps
kubectl exec my-pod -- tcpdump -i any -ttt

# Verbose output with packet details
kubectl exec my-pod -- tcpdump -i any -vv

# Extra verbose with hex/ASCII dump
kubectl exec my-pod -- tcpdump -i any -XX

# Monitor packet rate
kubectl exec my-pod -- tcpdump -i any -c 1000 -q | wc -l
```

## Rotating Capture Files

Create rotating capture files:

```bash
# Rotate files every 100MB, keep 5 files
kubectl exec my-pod -- tcpdump -i any -w /tmp/capture.pcap -C 100 -W 5

# Rotate files every 60 seconds, keep 10 files
kubectl exec my-pod -- tcpdump -i any -w /tmp/capture.pcap -G 60 -W 10

# Name files with timestamps
kubectl exec my-pod -- tcpdump -i any -w '/tmp/capture-%Y%m%d-%H%M%S.pcap' -G 3600
```

## Debugging Service Mesh Traffic

Capture sidecar proxy traffic (Istio, Linkerd):

```bash
# Capture envoy proxy traffic
kubectl exec my-pod -c istio-proxy -- tcpdump -i any -w /tmp/envoy.pcap

# Capture traffic between app and sidecar
kubectl exec my-pod -- tcpdump -i lo -w /tmp/localhost.pcap

# Capture external traffic only
kubectl exec my-pod -- tcpdump -i eth0 -w /tmp/external.pcap

# Compare app container vs sidecar traffic
kubectl exec my-pod -c app -- tcpdump -i any -w /tmp/app.pcap &
kubectl exec my-pod -c istio-proxy -- tcpdump -i any -w /tmp/proxy.pcap
```

## Creating a tcpdump Sidecar

Deploy a dedicated network debugging sidecar:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-tcpdump
spec:
  shareProcessNamespace: true
  containers:
  - name: app
    image: myapp:latest
    ports:
    - containerPort: 8080
  - name: tcpdump
    image: nicolaka/netshoot
    command:
    - /bin/bash
    - -c
    - |
      # Continuous packet capture with rotation
      tcpdump -i any -w /captures/capture.pcap -C 100 -W 10 -Z root
    securityContext:
      capabilities:
        add:
        - NET_ADMIN
        - NET_RAW
    volumeMounts:
    - name: captures
      mountPath: /captures
  volumes:
  - name: captures
    emptyDir:
      sizeLimit: 2Gi
```

## Analyzing Captured Traffic

Extract useful information from captures:

```bash
# Copy capture file
kubectl cp my-pod:/tmp/capture.pcap ./capture.pcap

# Read with tcpdump locally
tcpdump -r capture.pcap

# Find unique hosts
tcpdump -n -r capture.pcap | awk '{print $3,$5}' | sort | uniq

# Count packets per host
tcpdump -n -r capture.pcap | awk '{print $3}' | cut -d. -f1-4 | sort | uniq -c | sort -rn

# Extract HTTP hosts
tcpdump -n -A -r capture.pcap | grep -oP 'Host: \K.*' | sort | uniq -c

# Find retransmissions
tcpdump -n -r capture.pcap | grep retransmission

# Show only errors
tcpdump -n -r capture.pcap | grep -E 'RST|ICMP'
```

## Automated Network Capture Script

Create a comprehensive capture script:

```bash
#!/bin/bash
# Save as capture-pod-traffic.sh

POD_NAME=$1
DURATION=${2:-60}
OUTPUT_FILE=${3:-pod-capture.pcap}

if [ -z "$POD_NAME" ]; then
    echo "Usage: $0 <pod-name> [duration-seconds] [output-file]"
    exit 1
fi

echo "Capturing traffic from pod: $POD_NAME for $DURATION seconds..."

# Check if tcpdump is available
if ! kubectl exec "$POD_NAME" -- which tcpdump &>/dev/null; then
    echo "Installing tcpdump..."
    kubectl exec "$POD_NAME" -- sh -c "apk add --no-cache tcpdump || apt-get update && apt-get install -y tcpdump"
fi

# Capture traffic
kubectl exec "$POD_NAME" -- timeout "$DURATION" tcpdump -i any -w /tmp/capture.pcap

# Copy to local
kubectl cp "$POD_NAME":/tmp/capture.pcap "./$OUTPUT_FILE"

# Clean up
kubectl exec "$POD_NAME" -- rm -f /tmp/capture.pcap

echo "Capture saved to: $OUTPUT_FILE"
echo "Analyze with: tcpdump -r $OUTPUT_FILE"
echo "Or open in Wireshark: wireshark $OUTPUT_FILE"

# Quick analysis
echo ""
echo "Quick analysis:"
echo "Total packets:"
tcpdump -r "$OUTPUT_FILE" 2>/dev/null | wc -l

echo ""
echo "Top 5 destination hosts:"
tcpdump -n -r "$OUTPUT_FILE" 2>/dev/null | awk '{print $5}' | cut -d. -f1-4 | sort | uniq -c | sort -rn | head -5

echo ""
echo "Protocol distribution:"
tcpdump -n -r "$OUTPUT_FILE" 2>/dev/null | awk '{print $7}' | sort | uniq -c | sort -rn
```

## Best Practices

Always use specific filters to reduce capture size. Rotate capture files to prevent disk space issues. Copy captures locally for detailed analysis with Wireshark. Use appropriate snapshot lengths with -s option. Consider performance impact of tcpdump on busy systems. Clean up capture files after analysis. Document captures for audit and compliance purposes.

tcpdump is an essential tool for network troubleshooting in Kubernetes, providing visibility into actual network behavior that application logs cannot reveal.
