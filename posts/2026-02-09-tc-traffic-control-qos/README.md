# How to use tc (traffic control) for network QoS in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, QoS, Traffic Control, Performance

Description: Master Linux traffic control (tc) for Kubernetes network QoS including bandwidth limiting, packet prioritization, traffic shaping, and integration with CNI plugins for fine-grained network performance management.

---

Linux traffic control (tc) is a powerful tool for managing network quality of service in Kubernetes. While Kubernetes provides basic resource limits for CPU and memory, network bandwidth often goes uncontrolled, leading to noisy neighbor problems where one pod saturates the network. This guide shows you how to use tc to implement bandwidth limits, traffic shaping, and packet prioritization for your Kubernetes workloads.

## Understanding Traffic Control Basics

The tc utility controls the Linux kernel's traffic management system. It works with queuing disciplines (qdiscs), classes, and filters to shape, schedule, and police network traffic. Every network interface has a qdisc that determines how packets are queued and transmitted.

The default qdisc is usually `pfifo_fast`, which provides three priority bands but no rate limiting. For bandwidth control, you need to attach a classful qdisc like HTB (Hierarchical Token Bucket) or TBF (Token Bucket Filter). These qdiscs let you set bandwidth limits and guarantee minimum rates.

In Kubernetes, each pod gets a veth interface pair. One end is in the pod's network namespace, the other on the host. You apply tc rules to the host-side veth interface to control traffic to and from the pod.

## Installing and Verifying tc

Most Linux distributions include tc in the iproute2 package:

```bash
# Install on Ubuntu/Debian
apt-get update && apt-get install -y iproute2

# Install on RHEL/CentOS
yum install -y iproute

# Verify tc is available
tc -Version
# Output: tc utility, iproute2-5.x.x

# Check default qdisc
tc qdisc show dev eth0
# Output: qdisc pfifo_fast 0: root refcnt 2 bands 3 priomap...
```

## Implementing Basic Bandwidth Limiting

Let's start by limiting bandwidth for a specific pod. First, find the pod's veth interface:

```bash
# Get pod IP
POD_NAME="bandwidth-test"
POD_IP=$(kubectl get pod $POD_NAME -o jsonpath='{.status.podIP}')

# Find the veth interface for this pod
# The interface will have the pod IP in its routes
ip route | grep $POD_IP
# Output: 10.244.1.5 dev veth1a2b3c4d scope host

VETH_INTERFACE="veth1a2b3c4d"
```

Apply bandwidth limit using TBF qdisc:

```bash
# Limit egress (from pod) to 1 Mbps
tc qdisc add dev $VETH_INTERFACE root tbf \
  rate 1mbit \
  burst 32kbit \
  latency 400ms

# Verify the qdisc is attached
tc qdisc show dev $VETH_INTERFACE

# Test the bandwidth limit
kubectl exec $POD_NAME -- wget -O /dev/null http://speedtest.example.com/100mb.bin
# Should see throughput limited to ~1 Mbps
```

The TBF parameters:
- `rate`: Maximum bandwidth
- `burst`: Amount of data that can be sent at wire speed (handles bursty traffic)
- `latency`: Maximum time a packet can wait in the queue

## Creating Hierarchical Bandwidth Classes

For more sophisticated control, use HTB (Hierarchical Token Bucket) to create classes with guaranteed and maximum rates:

```bash
# Remove existing qdisc
tc qdisc del dev $VETH_INTERFACE root 2>/dev/null || true

# Add HTB root qdisc
tc qdisc add dev $VETH_INTERFACE root handle 1: htb default 30

# Create root class with total bandwidth
tc class add dev $VETH_INTERFACE parent 1: classid 1:1 htb rate 10mbit

# Create high priority class (guaranteed 5 Mbps, can use up to 8 Mbps)
tc class add dev $VETH_INTERFACE parent 1:1 classid 1:10 htb \
  rate 5mbit ceil 8mbit prio 1

# Create low priority class (guaranteed 2 Mbps, can use up to 10 Mbps)
tc class add dev $VETH_INTERFACE parent 1:1 classid 1:20 htb \
  rate 2mbit ceil 10mbit prio 2

# Create default class (guaranteed 1 Mbps, can use up to 10 Mbps)
tc class add dev $VETH_INTERFACE parent 1:1 classid 1:30 htb \
  rate 1mbit ceil 10mbit prio 3
```

Now add filters to classify traffic into these classes:

```bash
# Route high-priority ports to class 1:10
# Example: database queries on port 5432
tc filter add dev $VETH_INTERFACE protocol ip parent 1:0 prio 1 \
  u32 match ip dport 5432 0xffff flowid 1:10

# Route HTTP traffic to default class 1:30
tc filter add dev $VETH_INTERFACE protocol ip parent 1:0 prio 2 \
  u32 match ip dport 80 0xffff flowid 1:30

# Show configured classes and filters
tc class show dev $VETH_INTERFACE
tc filter show dev $VETH_INTERFACE
```

## Integrating tc with CNI Plugins

The bandwidth CNI plugin provides a declarative way to apply tc rules. Add it to your CNI plugin chain:

```json
{
  "cniVersion": "0.4.0",
  "name": "mynet",
  "plugins": [
    {
      "type": "bridge",
      "bridge": "cni0",
      "isGateway": true,
      "ipMasq": true,
      "ipam": {
        "type": "host-local",
        "ranges": [
          [{
            "subnet": "10.244.0.0/24"
          }]
        ]
      }
    },
    {
      "type": "bandwidth",
      "capabilities": {"bandwidth": true}
    }
  ]
}
```

Now set bandwidth limits via pod annotations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: bandwidth-limited
  annotations:
    kubernetes.io/ingress-bandwidth: "10M"
    kubernetes.io/egress-bandwidth: "10M"
spec:
  containers:
  - name: nginx
    image: nginx:1.21
    ports:
    - containerPort: 80
```

The bandwidth plugin creates tc rules automatically:

```bash
# Find the pod's veth interface
POD_NAME="bandwidth-limited"
POD_IP=$(kubectl get pod $POD_NAME -o jsonpath='{.status.podIP}')
VETH=$(ip route | grep $POD_IP | awk '{print $3}')

# View tc rules created by the plugin
tc qdisc show dev $VETH
tc class show dev $VETH

# Should see HTB qdisc with classes matching annotation values
```

## Implementing Network Priority for Critical Pods

Use priority queuing to ensure critical traffic gets processed first:

```bash
# Create priority qdisc with 3 bands
tc qdisc add dev $VETH_INTERFACE root handle 1: prio bands 3 priomap 1 2 2 2 1 2 0 0 1 1 1 1 1 1 1 1

# Attach rate limiters to each band
tc qdisc add dev $VETH_INTERFACE parent 1:1 handle 10: sfq
tc qdisc add dev $VETH_INTERFACE parent 1:2 handle 20: sfq
tc qdisc add dev $VETH_INTERFACE parent 1:3 handle 30: sfq

# Route critical traffic to band 0 (highest priority)
tc filter add dev $VETH_INTERFACE protocol ip parent 1:0 prio 1 \
  u32 match ip dscp 46 0xff flowid 1:1

# Route normal traffic to band 1
tc filter add dev $VETH_INTERFACE protocol ip parent 1:0 prio 2 \
  u32 match ip dscp 0 0xff flowid 1:2
```

Mark critical packets with DSCP in your application:

```go
// Go example: Mark packets with DSCP EF (Expedited Forwarding)
import "syscall"

func setDSCP(fd int, dscp int) error {
    return syscall.SetsockoptInt(fd, syscall.IPPROTO_IP, syscall.IP_TOS, dscp<<2)
}

// Usage
conn, _ := net.Dial("tcp", "service:8080")
file, _ := conn.(*net.TCPConn).File()
setDSCP(int(file.Fd()), 46) // DSCP EF value
```

## Monitoring Traffic Control Performance

Track bandwidth usage and qdisc statistics:

```bash
# Show detailed statistics for a qdisc
tc -s qdisc show dev $VETH_INTERFACE

# Show class statistics
tc -s class show dev $VETH_INTERFACE

# Monitor in real-time
watch -n 1 'tc -s class show dev $VETH_INTERFACE'

# Check for dropped packets (indicates limits being hit)
tc -s qdisc show dev $VETH_INTERFACE | grep dropped
```

Export tc metrics to Prometheus using node-exporter with custom scripts:

```bash
#!/bin/bash
# /usr/local/bin/tc-metrics.sh

# Output format: metric_name{labels} value
for iface in $(ip -o link show | awk -F': ' '{print $2}' | grep veth); do
  tc -s -j qdisc show dev $iface 2>/dev/null | \
    jq -r --arg iface "$iface" '
      .[] |
      "tc_qdisc_bytes{interface=\"\($iface)\",qdisc=\"\(.kind)\"} \(.bytes // 0)
      tc_qdisc_packets{interface=\"\($iface)\",qdisc=\"\(.kind)\"} \(.packets // 0)
      tc_qdisc_drops{interface=\"\($iface)\",qdisc=\"\(.kind)\"} \(.drops // 0)"
    '
done
```

Configure node-exporter to run this script:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: node-exporter-scripts
  namespace: monitoring
data:
  tc-metrics.sh: |
    # Script content here
---
# Mount and execute via node-exporter textfile collector
```

## Automated tc Management with DaemonSet

Deploy a DaemonSet to manage tc rules across all nodes:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: tc-manager
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: tc-manager
  template:
    metadata:
      labels:
        app: tc-manager
    spec:
      hostNetwork: true
      hostPID: true
      containers:
      - name: tc-manager
        image: alpine:3.18
        command:
        - sh
        - -c
        - |
          apk add --no-cache iproute2 jq bash

          while true; do
            # Find all veth interfaces
            for veth in $(ip -o link show | grep veth | awk -F': ' '{print $2}'); do
              # Check if qdisc is already configured
              if ! tc qdisc show dev $veth | grep -q htb; then
                # Apply default bandwidth limit
                tc qdisc add dev $veth root tbf rate 100mbit burst 128kbit latency 50ms 2>/dev/null || true
                echo "Applied tc to $veth"
              fi
            done

            sleep 30
          done
        securityContext:
          privileged: true
```

This DaemonSet applies default tc rules to new pods automatically. Customize the rules based on your requirements.

## Troubleshooting tc Issues

Common problems and solutions:

```bash
# Issue: tc commands fail with "RTNETLINK answers: File exists"
# Solution: Remove existing qdisc first
tc qdisc del dev $VETH_INTERFACE root 2>/dev/null || true

# Issue: Bandwidth limits not working
# Solution: Verify interface is correct (use pod IP to find veth)
ip route | grep $POD_IP

# Issue: Packets being dropped unexpectedly
# Solution: Check qdisc backlog and increase burst size
tc -s qdisc show dev $VETH_INTERFACE
# If backlog is often at max, increase burst parameter

# Issue: tc rules disappear after pod restart
# Solution: Implement automated tc management via DaemonSet or CNI plugin

# Issue: Performance degradation with many tc rules
# Solution: Use hardware offloading if supported
tc qdisc add dev $VETH_INTERFACE root mqprio num_tc 4 hw 1
```

## Advanced Shaping with Netem

The netem qdisc simulates network conditions for testing:

```bash
# Add latency (useful for testing)
tc qdisc add dev $VETH_INTERFACE root netem delay 100ms

# Add packet loss
tc qdisc add dev $VETH_INTERFACE root netem loss 1%

# Add bandwidth limit with latency and jitter
tc qdisc add dev $VETH_INTERFACE root netem rate 1mbit delay 50ms 10ms

# Combine multiple effects
tc qdisc add dev $VETH_INTERFACE root netem \
  rate 10mbit \
  delay 30ms 10ms \
  loss 0.1% \
  corrupt 0.01%

# Remove netem qdisc
tc qdisc del dev $VETH_INTERFACE root
```

This is invaluable for testing how applications behave under degraded network conditions without actually degrading your network.

Traffic control with tc gives you fine-grained control over network QoS in Kubernetes. By applying bandwidth limits, implementing priority queuing, and integrating with CNI plugins, you can ensure fair resource allocation and prevent network congestion even in multi-tenant clusters with diverse workloads.
