# How to Set Up Traffic Shaping on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Traffic Shaping, QoS, Networking, Bandwidth, Kubernetes, Tc

Description: Learn how to implement traffic shaping and quality of service (QoS) policies on Talos Linux for bandwidth management and prioritization.

---

Traffic shaping controls the rate, priority, and scheduling of network traffic. In a Kubernetes cluster running on Talos Linux, traffic shaping can prevent bandwidth-hungry workloads from starving critical services, enforce fair bandwidth sharing between tenants, and ensure that control plane traffic always gets through even when the network is congested.

Since Talos Linux does not provide shell access, traffic shaping must be configured through privileged Kubernetes workloads or Kubernetes-native bandwidth management features. This guide covers both approaches.

## Understanding Traffic Shaping Concepts

Traffic shaping operates on outgoing traffic (egress) using queuing disciplines (qdiscs). The Linux kernel provides several qdiscs:

- **tbf (Token Bucket Filter)**: Simple rate limiting
- **htb (Hierarchical Token Bucket)**: Class-based bandwidth allocation with priorities
- **fq_codel (Fair Queuing Controlled Delay)**: Low-latency queuing with good default behavior
- **ingress**: Policing incoming traffic (drop excess, cannot queue)

Traffic shaping can only delay or drop outgoing packets. For incoming traffic, you can only police (drop excess packets) because you cannot control the sender's rate.

## Kubernetes-Native Bandwidth Management

The simplest approach is using Kubernetes bandwidth annotations, which are supported by most CNI plugins:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: bandwidth-limited-app
  annotations:
    # Limit ingress to 10 Mbps
    kubernetes.io/ingress-bandwidth: "10M"
    # Limit egress to 5 Mbps
    kubernetes.io/egress-bandwidth: "5M"
spec:
  containers:
    - name: app
      image: myapp:latest
```

These annotations work with the bandwidth CNI plugin, which is often included with Flannel and other CNI solutions. The plugin creates tc (traffic control) rules on the pod's virtual ethernet interface.

### Verifying Bandwidth Limits

```bash
# Check if bandwidth limits are applied
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  tc qdisc show

# Look for tc rules on pod interfaces
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  tc -s class show dev eth0
```

## Node-Level Traffic Shaping

For more granular control, configure traffic shaping at the node level using a DaemonSet:

### Rate Limiting per Interface

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: traffic-shaper
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: traffic-shaper
  template:
    metadata:
      labels:
        app: traffic-shaper
    spec:
      hostNetwork: true
      initContainers:
        - name: setup-tc
          image: nicolaka/netshoot
          securityContext:
            privileged: true
            capabilities:
              add: ["NET_ADMIN"]
          command:
            - /bin/sh
            - -c
            - |
              INTERFACE="eth0"
              TOTAL_BW="1gbit"

              # Remove existing qdisc (ignore errors if none exists)
              tc qdisc del dev $INTERFACE root 2>/dev/null || true

              # Create HTB root qdisc
              tc qdisc add dev $INTERFACE root handle 1: htb default 40

              # Root class - total bandwidth
              tc class add dev $INTERFACE parent 1: classid 1:1 \
                htb rate $TOTAL_BW burst 15k

              # High priority class (control plane traffic) - guaranteed 300Mbps
              tc class add dev $INTERFACE parent 1:1 classid 1:10 \
                htb rate 300mbit ceil $TOTAL_BW burst 15k prio 1

              # Medium priority class (application traffic) - guaranteed 500Mbps
              tc class add dev $INTERFACE parent 1:1 classid 1:20 \
                htb rate 500mbit ceil $TOTAL_BW burst 15k prio 2

              # Low priority class (bulk/backup traffic) - guaranteed 100Mbps
              tc class add dev $INTERFACE parent 1:1 classid 1:30 \
                htb rate 100mbit ceil 500mbit burst 15k prio 3

              # Default class - guaranteed 100Mbps
              tc class add dev $INTERFACE parent 1:1 classid 1:40 \
                htb rate 100mbit ceil 500mbit burst 15k prio 4

              # Add fair queuing to each class for better latency
              tc qdisc add dev $INTERFACE parent 1:10 handle 10: fq_codel
              tc qdisc add dev $INTERFACE parent 1:20 handle 20: fq_codel
              tc qdisc add dev $INTERFACE parent 1:30 handle 30: fq_codel
              tc qdisc add dev $INTERFACE parent 1:40 handle 40: fq_codel

              # Classify traffic using filters

              # Kubernetes API server traffic (port 6443) -> high priority
              tc filter add dev $INTERFACE parent 1: protocol ip prio 1 \
                u32 match ip dport 6443 0xffff flowid 1:10
              tc filter add dev $INTERFACE parent 1: protocol ip prio 1 \
                u32 match ip sport 6443 0xffff flowid 1:10

              # etcd traffic (port 2379/2380) -> high priority
              tc filter add dev $INTERFACE parent 1: protocol ip prio 1 \
                u32 match ip dport 2379 0xffff flowid 1:10
              tc filter add dev $INTERFACE parent 1: protocol ip prio 1 \
                u32 match ip dport 2380 0xffff flowid 1:10

              # HTTP/HTTPS traffic -> medium priority
              tc filter add dev $INTERFACE parent 1: protocol ip prio 2 \
                u32 match ip dport 80 0xffff flowid 1:20
              tc filter add dev $INTERFACE parent 1: protocol ip prio 2 \
                u32 match ip dport 443 0xffff flowid 1:20

              echo "Traffic shaping configured on $INTERFACE"
              tc -s class show dev $INTERFACE
      containers:
        - name: monitor
          image: nicolaka/netshoot
          securityContext:
            privileged: true
          command:
            - /bin/sh
            - -c
            - |
              while true; do
                echo "=== Traffic Statistics at $(date) ==="
                tc -s class show dev eth0 | grep -A4 "class htb"
                echo ""
                sleep 300
              done
      tolerations:
        - operator: Exists
```

### Ingress Policing

To limit incoming traffic (you can only police, not shape incoming traffic):

```bash
# Add an ingress qdisc
tc qdisc add dev eth0 handle ffff: ingress

# Police incoming traffic to 500 Mbps
tc filter add dev eth0 parent ffff: protocol ip prio 1 \
  u32 match ip src 0.0.0.0/0 \
  police rate 500mbit burst 1mbit drop flowid :1
```

## Per-Pod Traffic Shaping with Cilium

Cilium provides advanced bandwidth management:

```bash
# Install Cilium with bandwidth manager enabled
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set bandwidthManager.enabled=true \
  --set bandwidthManager.bbr=true
```

Then use annotations on pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: limited-pod
  annotations:
    kubernetes.io/egress-bandwidth: "50M"
    kubernetes.io/ingress-bandwidth: "100M"
spec:
  containers:
    - name: app
      image: myapp:latest
```

Cilium's bandwidth manager uses EDT (Earliest Departure Time) scheduling, which provides more accurate rate limiting with lower CPU overhead than traditional tc-based approaches.

## Quality of Service with DSCP Marking

Differentiated Services Code Point (DSCP) marking allows network equipment to prioritize traffic:

```bash
# Mark high-priority traffic with DSCP EF (Expedited Forwarding)
iptables -t mangle -A OUTPUT \
  -p tcp --dport 6443 \
  -j DSCP --set-dscp-class EF

# Mark bulk traffic with DSCP AF11 (low priority)
iptables -t mangle -A OUTPUT \
  -p tcp --dport 9000 \
  -j DSCP --set-dscp-class AF11
```

Configure DSCP-based classification in tc:

```bash
# Match DSCP values in tc filters
# DSCP EF = 46 (0x2e), shifted to TOS field = 0xb8
tc filter add dev eth0 parent 1: protocol ip prio 1 \
  u32 match ip tos 0xb8 0xfc flowid 1:10
```

## Kernel Parameters for Traffic Shaping

```yaml
machine:
  sysctls:
    # Increase network buffer sizes for better shaping performance
    net.core.rmem_max: "16777216"
    net.core.wmem_max: "16777216"
    net.core.rmem_default: "1048576"
    net.core.wmem_default: "1048576"

    # TCP buffer sizes (min, default, max)
    net.ipv4.tcp_rmem: "4096 1048576 16777216"
    net.ipv4.tcp_wmem: "4096 1048576 16777216"

    # Enable BBR congestion control (works well with traffic shaping)
    net.ipv4.tcp_congestion_control: "bbr"
    net.core.default_qdisc: "fq"
```

## Monitoring Traffic Shaping

### Check Class Statistics

```bash
# View traffic statistics for each class
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  tc -s class show dev eth0

# Output shows bytes sent, packets sent, drops, and overlimits per class
```

### Monitor Queue Lengths

```bash
# Check qdisc statistics
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  tc -s qdisc show dev eth0
```

### Alerting on Drops

If traffic shaping is dropping packets, it could indicate that bandwidth allocation needs adjustment:

```bash
# Check for drops in traffic classes
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  tc -s class show dev eth0 | grep -B2 "dropped [1-9]"
```

## Troubleshooting Traffic Shaping

### Rules Not Taking Effect

```bash
# Verify the qdisc is attached
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  tc qdisc show dev eth0

# If you see "pfifo_fast" or "fq_codel" instead of "htb",
# the custom shaping rules are not applied
```

### Performance Worse Than Expected

Traffic shaping adds CPU overhead. If the node is CPU-constrained:

```bash
# Check CPU usage of softirq (which handles tc)
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  cat /proc/softirqs
```

Consider simplifying the tc configuration or using hardware offload if available.

### Rules Lost After Pod Restart

Since the DaemonSet init container creates the rules, they will be recreated if the pod restarts. However, if the DaemonSet pod is not running, the rules will be missing. Ensure the DaemonSet has appropriate tolerations and priority:

```yaml
spec:
  priorityClassName: system-node-critical
  tolerations:
    - operator: Exists
```

## Conclusion

Traffic shaping on Talos Linux can be implemented at multiple levels: Kubernetes bandwidth annotations for simple per-pod limits, Cilium bandwidth manager for efficient EDT-based shaping, and custom tc configurations through DaemonSets for fine-grained control. The right approach depends on your needs. For most clusters, Kubernetes bandwidth annotations or Cilium's bandwidth manager provide sufficient control with minimal complexity. For environments with strict QoS requirements, custom tc hierarchies give you full control over bandwidth allocation, prioritization, and scheduling.
