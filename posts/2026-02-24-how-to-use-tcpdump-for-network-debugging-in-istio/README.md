# How to Use tcpdump for Network Debugging in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Tcpdump, Network Debugging, Packet Capture, Troubleshooting

Description: A hands-on guide to using tcpdump for low-level network debugging in Istio service mesh environments.

---

Sometimes Envoy access logs and metrics are not enough. You need to see the actual packets on the wire to understand what is happening. Maybe mTLS is breaking in a way that is not obvious from logs, or you suspect packet-level issues like TCP resets, retransmissions, or MTU problems. That is when tcpdump becomes invaluable.

## Why tcpdump in Istio

In an Istio mesh, every request passes through two Envoy proxies (source and destination sidecars) plus the network between them. tcpdump lets you capture packets at specific points in this chain to narrow down where issues occur:

1. Before the source sidecar (app to proxy)
2. After the source sidecar (proxy to network)
3. Before the destination sidecar (network to proxy)
4. After the destination sidecar (proxy to app)

Each hop can reveal different problems.

## Getting tcpdump Into the Pod

Most Istio sidecar images do not include tcpdump. You have a few options:

### Option 1: Ephemeral Debug Container

Kubernetes 1.23+ supports ephemeral containers that share the network namespace:

```bash
kubectl debug -it my-service-pod -n my-namespace \
  --image=nicolaka/netshoot \
  --target=istio-proxy \
  -- tcpdump -i any -n port 8080
```

The `--target=istio-proxy` flag means the debug container shares the network namespace with the istio-proxy container.

### Option 2: Using nsenter from the Node

If you have node access:

```bash
# Find the node running the pod
NODE=$(kubectl get pod my-service-pod -n my-namespace -o jsonpath='{.spec.nodeName}')

# Find the container PID
CONTAINER_ID=$(kubectl get pod my-service-pod -n my-namespace -o jsonpath='{.status.containerStatuses[?(@.name=="istio-proxy")].containerID}' | sed 's|containerd://||')

# SSH to the node and find PID
ssh $NODE
PID=$(crictl inspect $CONTAINER_ID | jq .info.pid)

# Run tcpdump in the container's network namespace
nsenter -t $PID -n tcpdump -i any -n port 8080
```

### Option 3: Modified Sidecar Image

For development environments, you can add tcpdump to the proxy:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyImage: "your-registry/istio-proxy-debug:latest"
```

## Basic tcpdump Commands for Istio

### Capture All Traffic on a Specific Port

```bash
# Capture all HTTP traffic
tcpdump -i any -n port 8080

# Capture with packet content (for inspecting headers)
tcpdump -i any -n -A port 8080

# Capture in hex+ASCII format
tcpdump -i any -n -X port 8080
```

### Capture mTLS Traffic

mTLS traffic between sidecars runs on port 15006 (inbound) and uses the original destination port for outbound:

```bash
# Capture inbound mTLS traffic
tcpdump -i any -n port 15006

# Capture all Envoy-related ports
tcpdump -i any -n 'port 15000 or port 15001 or port 15006 or port 15021 or port 15090'
```

### Capture Traffic Between App and Sidecar

Traffic between the application and its local sidecar goes through the loopback interface on the original service port:

```bash
# Capture localhost traffic (app to sidecar)
tcpdump -i lo -n port 8080
```

### Capture Traffic Leaving the Pod

Traffic leaving the pod goes through the eth0 interface and is encrypted with mTLS:

```bash
# Capture outbound traffic
tcpdump -i eth0 -n

# Capture traffic to a specific destination
tcpdump -i eth0 -n host 10.0.0.50
```

## Practical Debugging Scenarios

### Verifying mTLS Encryption

To confirm that traffic between pods is actually encrypted:

```bash
# Capture traffic on the network interface
tcpdump -i eth0 -n -A port 8080 | head -100
```

If you see readable HTTP content, the traffic is not encrypted. If you see binary gibberish, mTLS is working.

More precisely:

```bash
# Look for TLS ClientHello
tcpdump -i eth0 -n 'tcp[((tcp[12:1] & 0xf0) >> 2):1] = 0x16'
```

This filter matches TLS handshake packets (content type 0x16).

### Detecting TCP Connection Issues

```bash
# Capture TCP SYN, SYN-ACK, RST packets
tcpdump -i any -n 'tcp[tcpflags] & (tcp-syn|tcp-rst) != 0'

# Count TCP resets
tcpdump -i any -n 'tcp[tcpflags] & tcp-rst != 0' -c 100
```

If you see many RST packets, something is actively rejecting connections. The source and destination IPs tell you which side is resetting.

### Capturing DNS Resolution

```bash
# Capture DNS queries
tcpdump -i any -n port 53

# Capture DNS with content
tcpdump -i any -n -A port 53
```

This is useful when you suspect DNS resolution issues for external services.

### Tracking Connection Establishment Time

```bash
# Capture with timestamps to measure connection time
tcpdump -i any -n -ttt 'tcp[tcpflags] & (tcp-syn) != 0' | head -20
```

The `-ttt` flag shows the time delta between packets. A long gap between SYN and SYN-ACK indicates network latency or a slow server.

## Saving Captures for Later Analysis

For complex issues, save the capture to a file and analyze it later with Wireshark:

```bash
# Save to pcap file
tcpdump -i any -n -w /tmp/capture.pcap port 8080

# Limit capture size
tcpdump -i any -n -w /tmp/capture.pcap -c 10000 port 8080

# Rotate files (10 files of 10MB each)
tcpdump -i any -n -w /tmp/capture.pcap -C 10 -W 10 port 8080
```

Copy the capture file out of the pod:

```bash
kubectl cp my-namespace/my-service-pod:/tmp/capture.pcap ./capture.pcap -c debug-container
```

## Understanding Istio's iptables Rules

Istio uses iptables to redirect traffic through the sidecar. Understanding these rules helps you know which interface to capture on:

```bash
# View iptables rules in the pod
kubectl exec my-service-pod -c istio-proxy -- iptables -t nat -L -n -v
```

Key rules:
- Inbound traffic on port 15006 is redirected from the original port
- Outbound traffic on port 15001 goes through the proxy
- Port 15008 is used for HBONE (HTTP-based overlay network)

## Filtering Tips for High-Traffic Environments

In production, unfiltered captures generate massive amounts of data. Always use filters:

```bash
# Filter by specific source IP
tcpdump -i any -n src host 10.0.0.5

# Filter by specific destination and port
tcpdump -i any -n dst host 10.0.0.10 and dst port 8080

# Exclude health check traffic
tcpdump -i any -n 'not (port 15021 or port 15090)'

# Only capture first 200 bytes of each packet
tcpdump -i any -n -s 200 port 8080
```

The `-s 200` flag is important for production captures. It captures enough data to see headers but not full request bodies, keeping the capture file small.

## Comparing Captures at Different Points

For a complete picture, capture at multiple points simultaneously:

```bash
# Terminal 1: Capture app to sidecar (source)
kubectl debug -it source-pod --image=nicolaka/netshoot --target=istio-proxy \
  -- tcpdump -i lo -n -w /tmp/source-local.pcap port 8080

# Terminal 2: Capture sidecar to network (source)
kubectl debug -it source-pod --image=nicolaka/netshoot --target=istio-proxy \
  -- tcpdump -i eth0 -n -w /tmp/source-network.pcap host DEST_POD_IP

# Terminal 3: Capture network to sidecar (destination)
kubectl debug -it dest-pod --image=nicolaka/netshoot --target=istio-proxy \
  -- tcpdump -i eth0 -n -w /tmp/dest-network.pcap host SOURCE_POD_IP

# Terminal 4: Capture sidecar to app (destination)
kubectl debug -it dest-pod --image=nicolaka/netshoot --target=istio-proxy \
  -- tcpdump -i lo -n -w /tmp/dest-local.pcap port 8080
```

Compare the captures to find where packets get dropped, modified, or delayed.

tcpdump is a last-resort debugging tool for most Istio issues - you usually do not need it. But when you do need it, nothing else will do. Keep the ephemeral debug container approach in your toolbox, and you can get packet-level visibility into any mesh issue.
