# How to Perform Packet Capture on Kubernetes Nodes with tcpdump

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, tcpdump, Troubleshooting, Packet Capture

Description: Use tcpdump to capture and analyze network traffic on Kubernetes nodes for debugging connectivity issues, examining pod communication, and identifying network problems at the packet level.

---

Network issues in Kubernetes often require examining actual packets to understand what's happening on the wire. tcpdump provides powerful packet capture capabilities that reveal connection attempts, DNS queries, HTTP requests, and protocol-level errors that higher-level tools miss. Running tcpdump on Kubernetes nodes requires careful setup but delivers unmatched visibility into network behavior.

## Understanding Packet Capture in Kubernetes

Kubernetes networking uses network namespaces to isolate pod networking from the host. Each pod gets its own network namespace with virtual interfaces. The host node has a root network namespace where all traffic eventually passes through. Capturing traffic requires accessing either the pod's network namespace or the host namespace where you can see traffic for all pods.

tcpdump captures packets at the network interface level. On Kubernetes nodes, you need to identify the correct interface, whether capturing traffic for a specific pod or all cluster traffic. The node's main interface sees all pod traffic, while pod-specific veth interfaces show only that pod's traffic.

## Accessing Nodes for Packet Capture

Use kubectl debug to run tcpdump on a node:

```bash
# Start a debug container on the node with host networking
kubectl debug node/<node-name> -it --image=nicolaka/netshoot

# This drops you into a shell on the node with network tools available
```

The netshoot image includes tcpdump, wireshark utilities, and other network debugging tools. It runs with host network namespace access, letting you see all network interfaces.

## Listing Network Interfaces

Identify available interfaces before capturing:

```bash
# List all network interfaces
ip link show

# Common interfaces you'll see:
# eth0 or ens192 - Node's primary interface
# cni0 or docker0 - Container network bridge
# vethXXXXXXXX - Virtual ethernet pairs for pods
# flannel.1 or vxlan.calico - Overlay network interfaces
```

Find a pod's network interface:

```bash
# Get pod's container ID
POD_ID=$(kubectl get pod <pod-name> -o jsonpath='{.status.containerStatuses[0].containerID}' | cut -d'/' -f3)

# List interfaces and find the one associated with the pod
ip link | grep -A 1 "veth.*$POD_ID"
```

## Basic tcpdump Commands

Capture all traffic on the main interface:

```bash
# Capture on primary interface (eth0)
tcpdump -i eth0

# Limit output to 100 packets
tcpdump -i eth0 -c 100

# Write to file for later analysis
tcpdump -i eth0 -w /tmp/capture.pcap

# Display more packet details
tcpdump -i eth0 -v
tcpdump -i eth0 -vv
tcpdump -i eth0 -vvv
```

The -w option saves raw packet data that you can analyze with wireshark or other tools.

## Filtering by Protocol

Capture specific protocols:

```bash
# DNS traffic only (port 53)
tcpdump -i eth0 port 53

# HTTP traffic (port 80)
tcpdump -i eth0 port 80

# HTTPS traffic (port 443)
tcpdump -i eth0 port 443

# All TCP traffic
tcpdump -i eth0 tcp

# All UDP traffic
tcpdump -i eth0 udp

# ICMP (ping) traffic
tcpdump -i eth0 icmp
```

## Filtering by IP Address

Capture traffic to or from specific IPs:

```bash
# Traffic from a specific IP
tcpdump -i eth0 src host 10.0.1.5

# Traffic to a specific IP
tcpdump -i eth0 dst host 10.0.1.5

# Traffic to or from an IP
tcpdump -i eth0 host 10.0.1.5

# Traffic between two IPs
tcpdump -i eth0 host 10.0.1.5 and host 10.0.2.10

# Traffic from a subnet
tcpdump -i eth0 src net 10.0.0.0/16
```

Get pod IP addresses:

```bash
# Find pod IPs in your cluster
kubectl get pods -o wide

# Capture traffic for a specific pod
POD_IP=$(kubectl get pod <pod-name> -o jsonpath='{.status.podIP}')
tcpdump -i eth0 host $POD_IP
```

## Combining Filters

Build complex filters with logical operators:

```bash
# HTTP traffic to specific IP
tcpdump -i eth0 'dst host 10.0.1.5 and port 80'

# DNS queries but not responses
tcpdump -i eth0 'udp port 53 and udp[10] & 0x80 = 0'

# TCP SYN packets (connection attempts)
tcpdump -i eth0 'tcp[tcpflags] & tcp-syn != 0'

# HTTP GET requests
tcpdump -i eth0 -A 'tcp port 80 and (((ip[2:2] - ((ip[0]&0xf)<<2)) - ((tcp[12]&0xf0)>>2)) != 0)' | grep GET

# Traffic between two pods
tcpdump -i cni0 '(src host 10.244.1.5 and dst host 10.244.2.8) or (src host 10.244.2.8 and dst host 10.244.1.5)'
```

## Capturing Pod-Specific Traffic

Capture traffic for a single pod using its veth interface:

```bash
# Find the pod's veth interface
POD_NAME="myapp-abc123"
POD_NAMESPACE="default"

# Get pod's network namespace
POD_PID=$(kubectl exec -n $POD_NAMESPACE $POD_NAME -- sh -c 'echo $$')

# List interfaces in pod's namespace
nsenter -t $POD_PID -n ip link

# Capture on the pod's veth pair
VETH_INTERFACE=$(ip link | grep -B 1 "peer.*$POD_NAME" | head -1 | cut -d: -f2 | tr -d ' ')
tcpdump -i $VETH_INTERFACE -w /tmp/pod-capture.pcap
```

Alternative approach using kubectl exec:

```bash
# Run tcpdump inside the pod (if tcpdump is available)
kubectl exec -n $POD_NAMESPACE $POD_NAME -- tcpdump -i any -w - > /tmp/pod-capture.pcap
```

## Analyzing DNS Queries

Debug DNS resolution issues by capturing DNS traffic:

```bash
# Capture all DNS queries and responses
tcpdump -i eth0 -n port 53 -vv

# Show only DNS query names
tcpdump -i eth0 -n port 53 | grep 'A?'

# Capture DNS traffic for a specific pod
POD_IP=$(kubectl get pod myapp -o jsonpath='{.status.podIP}')
tcpdump -i eth0 src host $POD_IP and port 53

# Save DNS traffic for analysis
tcpdump -i eth0 port 53 -w /tmp/dns-debug.pcap
```

Look for queries that fail or time out, indicating DNS resolution problems.

## Debugging Service Connectivity

Capture traffic between pods and services:

```bash
# Get service cluster IP
SERVICE_IP=$(kubectl get service api-service -o jsonpath='{.spec.clusterIP}')

# Capture traffic to the service
tcpdump -i any dst host $SERVICE_IP

# See which pod is handling the traffic
tcpdump -i any 'dst host $SERVICE_IP or src host $SERVICE_IP' -n

# Capture connection attempts
tcpdump -i any 'tcp[tcpflags] & tcp-syn != 0 and dst host $SERVICE_IP'
```

This reveals whether traffic reaches the service and which backend pods respond.

## Analyzing HTTP Traffic

Examine HTTP requests and responses:

```bash
# Capture HTTP headers
tcpdump -i eth0 -A 'tcp port 80' -s 0

# Show HTTP request methods
tcpdump -i eth0 -A 'tcp port 80 and (tcp[((tcp[12:1] & 0xf0) >> 2):4] = 0x47455420)' # GET
tcpdump -i eth0 -A 'tcp port 80 and (tcp[((tcp[12:1] & 0xf0) >> 2):4] = 0x504f5354)' # POST

# Capture full HTTP conversations
tcpdump -i eth0 -A -s 10000 'tcp port 80'

# Filter for specific HTTP status codes (in responses)
tcpdump -i eth0 -A 'tcp port 80' | grep -E 'HTTP/1\.[01] (404|500|502|503)'
```

For HTTPS traffic, you'll only see encrypted data. Consider using service mesh observability tools for HTTPS analysis.

## Detecting Connection Issues

Identify connection problems:

```bash
# Capture TCP RST (reset) packets
tcpdump -i eth0 'tcp[tcpflags] & tcp-rst != 0'

# Capture TCP retransmissions
tcpdump -i eth0 'tcp[tcpflags] & tcp-ack != 0 and tcp[tcpflags] & tcp-syn == 0'

# See connection timeouts (FIN packets without ACK)
tcpdump -i eth0 'tcp[tcpflags] & tcp-fin != 0'

# Capture ICMP destination unreachable
tcpdump -i eth0 'icmp[icmptype] == icmp-unreach'
```

These patterns indicate connectivity failures, firewalls blocking traffic, or misconfigured services.

## Saving and Analyzing Captures

Save captures for offline analysis:

```bash
# Capture to file with rotation (100MB max, 5 files)
tcpdump -i eth0 -w /tmp/capture.pcap -C 100 -W 5

# Capture with timestamp in filename
tcpdump -i eth0 -w /tmp/capture-$(date +%Y%m%d-%H%M%S).pcap

# Capture for limited time (60 seconds)
timeout 60 tcpdump -i eth0 -w /tmp/capture.pcap
```

Copy the capture file from the node:

```bash
# From your local machine, copy file from debug pod
kubectl cp <node-debug-pod>:/tmp/capture.pcap ./capture.pcap -n default

# Analyze with wireshark locally
wireshark capture.pcap
```

Read pcap files with tcpdump:

```bash
# Read saved capture
tcpdump -r /tmp/capture.pcap

# Apply filters to saved capture
tcpdump -r /tmp/capture.pcap 'port 80'

# Extract specific conversations
tcpdump -r /tmp/capture.pcap 'host 10.0.1.5 and host 10.0.2.8' -w /tmp/filtered.pcap
```

## Capturing on Multiple Interfaces

Capture traffic across all interfaces:

```bash
# Capture on all interfaces
tcpdump -i any

# Capture on multiple specific interfaces
tcpdump -i eth0 -i cni0 -w /tmp/multi-interface.pcap
```

This is useful when traffic might traverse multiple network paths.

## Performance Considerations

tcpdump can impact node performance. Use these techniques to minimize overhead:

```bash
# Limit packet size captured (just headers)
tcpdump -i eth0 -s 96

# Use kernel packet filtering (BPF)
tcpdump -i eth0 'port 80'  # Efficient kernel filtering

# Avoid verbose output when not needed
tcpdump -i eth0 -q  # Quick output

# Write to fast storage
tcpdump -i eth0 -w /dev/shm/capture.pcap  # RAM disk

# Sample traffic (every 10th packet)
tcpdump -i eth0 -c 1000 'tcp and (((ip[2:2] - ((ip[0]&0xf)<<2)) - ((tcp[12]&0xf0)>>2)) != 0)' | awk 'NR % 10 == 0'
```

## Security Considerations

Packet captures may contain sensitive data:

```bash
# Avoid capturing passwords and tokens
# Don't share captures publicly without sanitization

# Filter out authentication headers
tcpdump -i eth0 -A 'port 80' | grep -v Authorization

# Rotate and delete old captures
find /tmp -name "*.pcap" -mtime +1 -delete
```

Ensure you have authorization to capture traffic in production environments.

## Troubleshooting tcpdump Issues

**Error: Permission denied**
Need elevated privileges:

```bash
# Ensure debug pod has host networking and privileges
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- /bin/bash
```

**No packets captured**
Wrong interface or filter:

```bash
# List all interfaces
ip link show

# Verify interface has traffic
ip -s link show eth0

# Try capturing without filters first
tcpdump -i eth0 -c 10
```

**Capture file too large**
Use rotation and filtering:

```bash
# Limit capture size and use filters
tcpdump -i eth0 -w /tmp/capture.pcap -C 50 -W 3 'port 80 or port 443'
```

## Conclusion

tcpdump provides unmatched visibility into Kubernetes network traffic at the packet level. By running tcpdump on nodes through debug containers, you can capture and analyze traffic for any pod or service in your cluster. Master the filtering syntax to focus on relevant traffic, save captures for offline analysis, and combine packet capture with other debugging tools for comprehensive network troubleshooting. While tcpdump requires careful use to avoid performance impact, it remains an essential tool for diagnosing complex networking issues that other tools cannot reveal.
