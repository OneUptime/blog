# How to Configure STP on Bridges in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, STP, Bridging, Networking, Spanning Tree Protocol, Kubernetes, Network Configuration

Description: Guide to configuring Spanning Tree Protocol (STP) on Linux bridges in Talos Linux to prevent network loops and ensure reliable bridging.

---

Spanning Tree Protocol (STP) prevents network loops in bridged environments. When you have multiple physical or virtual connections between network segments, loops can form, causing broadcast storms that bring down the entire network. STP detects these loops and disables redundant links, keeping only enough active paths for full connectivity.

In the context of Talos Linux, bridges are commonly used for VM networking (with KubeVirt), container networking, and connecting physical network segments. If your bridges have any possibility of forming loops, STP should be configured. This guide explains how.

## Understanding STP Basics

STP works by electing a root bridge and then calculating the shortest path from every other bridge to the root. Links that would create loops are put into a blocking state. If an active link fails, a blocked link is activated to restore connectivity.

The key concepts are:

- **Root Bridge**: The bridge with the lowest bridge priority (or lowest MAC address as a tiebreaker). All traffic flows through the root bridge.
- **Bridge Priority**: A configurable value (0-65535, default 32768). Lower values are preferred.
- **Port States**: Forwarding (active), Blocking (inactive, loop prevention), Listening, Learning, Disabled.
- **Path Cost**: The cost of traversing a link. Lower costs are preferred. Typically inversely proportional to bandwidth.

Modern networks often use RSTP (Rapid Spanning Tree Protocol, IEEE 802.1w) instead of the original STP (IEEE 802.1D). RSTP provides faster convergence - seconds instead of the 30-50 seconds that classic STP takes.

## Creating Bridges in Talos Linux

Bridges can be created through the Talos machine configuration:

```yaml
machine:
  network:
    interfaces:
      # Create a bridge interface
      - interface: br0
        bridge:
          stp:
            enabled: true
          interfaces:
            - eth1
            - eth2
        addresses:
          - 192.168.10.1/24
```

This creates a bridge named `br0` with STP enabled, bridging eth1 and eth2.

### Bridge with Full STP Configuration

```yaml
machine:
  network:
    interfaces:
      - interface: br0
        bridge:
          stp:
            enabled: true
          interfaces:
            - eth1
            - eth2
            - eth3
        addresses:
          - 192.168.10.1/24
        mtu: 1500
```

## Configuring STP Parameters

### Using a DaemonSet for Detailed STP Configuration

For fine-grained STP parameters that are not available through the Talos machine configuration, use a privileged DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: stp-configurator
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: stp-config
  template:
    metadata:
      labels:
        app: stp-config
    spec:
      hostNetwork: true
      nodeSelector:
        bridge-node: "true"
      initContainers:
        - name: configure-stp
          image: nicolaka/netshoot
          securityContext:
            privileged: true
            capabilities:
              add: ["NET_ADMIN"]
          command:
            - /bin/sh
            - -c
            - |
              BRIDGE="br0"

              # Wait for the bridge to be created by Talos
              while ! ip link show $BRIDGE > /dev/null 2>&1; do
                echo "Waiting for $BRIDGE to be created..."
                sleep 5
              done

              # Enable STP (if not already enabled by Talos config)
              ip link set $BRIDGE type bridge stp_state 1

              # Set bridge priority (lower = more likely to be root bridge)
              # Default is 32768, range is 0-65535
              ip link set $BRIDGE type bridge priority 4096

              # Set forward delay (time to transition from blocking to forwarding)
              # Default is 15 seconds, range is 2-30
              ip link set $BRIDGE type bridge forward_delay 4

              # Set hello time (interval between BPDUs)
              # Default is 2 seconds, range is 1-10
              ip link set $BRIDGE type bridge hello_time 2

              # Set max age (how long to keep BPDU info before discarding)
              # Default is 20 seconds, range is 6-40
              ip link set $BRIDGE type bridge max_age 20

              # Enable RSTP (Rapid STP) for faster convergence
              # 0 = STP, 2 = RSTP
              echo 2 > /sys/class/net/$BRIDGE/bridge/stp_state 2>/dev/null || true

              # Configure per-port settings
              for PORT in eth1 eth2 eth3; do
                if [ -d "/sys/class/net/$BRIDGE/brif/$PORT" ]; then
                  # Set port priority (default 128, range 0-63, in multiples of 16)
                  echo 32 > /sys/class/net/$BRIDGE/brif/$PORT/priority

                  # Set port cost (default varies by speed)
                  # Lower cost = preferred path
                  echo 100 > /sys/class/net/$BRIDGE/brif/$PORT/path_cost

                  echo "Configured STP for port $PORT on $BRIDGE"
                fi
              done

              echo "STP configuration complete for $BRIDGE"
              bridge link show
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
                echo "=== STP Status at $(date) ==="
                bridge stp show br0 2>/dev/null || \
                  cat /sys/class/net/br0/bridge/stp_state
                echo ""
                echo "=== Port States ==="
                for port in /sys/class/net/br0/brif/*/state; do
                  PORT_NAME=$(echo $port | cut -d/ -f7)
                  STATE=$(cat $port)
                  case $STATE in
                    0) STATE_NAME="disabled" ;;
                    1) STATE_NAME="listening" ;;
                    2) STATE_NAME="learning" ;;
                    3) STATE_NAME="forwarding" ;;
                    4) STATE_NAME="blocking" ;;
                    *) STATE_NAME="unknown" ;;
                  esac
                  echo "  $PORT_NAME: $STATE_NAME ($STATE)"
                done
                sleep 60
              done
      tolerations:
        - operator: Exists
```

## Verifying STP Status

### Check Bridge STP State

```bash
# From a debug pod
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  bridge stp show

# Check bridge details
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  ip -d link show br0

# Check STP state via sysfs
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  cat /sys/class/net/br0/bridge/stp_state
# 0 = disabled, 1 = STP enabled, 2 = RSTP enabled
```

### Check Port States

```bash
# Check which ports are forwarding and which are blocking
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  bridge link show

# Detailed port info
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  bridge stp show br0
```

### Check Root Bridge Election

```bash
# See which bridge is the root
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  cat /sys/class/net/br0/bridge/root_id

# Check if this bridge is the root
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  cat /sys/class/net/br0/bridge/root_port
# root_port = 0 means this bridge IS the root
```

## STP with KubeVirt

When running virtual machines on Talos Linux using KubeVirt, bridges are often used to provide network connectivity to VMs. STP should be considered:

```yaml
# KubeVirt network attachment using a bridge
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: vm-bridge
spec:
  config: |
    {
      "cniVersion": "0.3.1",
      "name": "vm-bridge",
      "type": "bridge",
      "bridge": "br-vms",
      "ipam": {
        "type": "host-local",
        "subnet": "192.168.100.0/24"
      }
    }
```

If multiple VM hosts are connected to the same physical network and bridging VM traffic, STP prevents loops:

```yaml
machine:
  network:
    interfaces:
      - interface: br-vms
        bridge:
          stp:
            enabled: true
          interfaces:
            - eth1  # Physical uplink to the VM network
        addresses:
          - 192.168.100.1/24
```

## RSTP vs STP

RSTP (Rapid STP) is preferred over classic STP for most deployments:

| Feature | STP (802.1D) | RSTP (802.1w) |
|---------|-------------|---------------|
| Convergence Time | 30-50 seconds | 1-3 seconds |
| Port States | 5 (disabled, blocking, listening, learning, forwarding) | 3 (discarding, learning, forwarding) |
| Topology Change | Slow notification | Fast, edge port awareness |

Enable RSTP:

```bash
# Set STP version to RSTP (value 2)
echo 2 > /sys/class/net/br0/bridge/stp_state
```

## Edge Ports (PortFast Equivalent)

Ports connected to end devices (not other bridges) should be configured as edge ports. Edge ports transition to forwarding immediately without waiting for STP convergence:

```bash
# Set a port as an edge port (will not participate in STP)
echo 1 > /sys/class/net/br0/brif/eth3/hairpin_mode

# Or more specifically for RSTP
bridge link set dev eth3 guard on
```

This prevents STP from slowing down the connection of end devices (like VMs or containers) that do not create loops.

## Monitoring and Alerting

### Detecting Topology Changes

```bash
# Monitor for topology changes
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  cat /sys/class/net/br0/bridge/topology_change

# Check topology change count
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  cat /sys/class/net/br0/bridge/topology_change_detected
```

### Checking for Blocked Ports

```bash
# List ports in blocking state
for port in /sys/class/net/br0/brif/*/state; do
  PORT_NAME=$(echo $port | cut -d/ -f7)
  STATE=$(cat $port)
  if [ "$STATE" = "4" ]; then
    echo "BLOCKING: $PORT_NAME"
  fi
done
```

## Troubleshooting STP

### Network Loops Despite STP

If you experience broadcast storms even with STP enabled:

```bash
# Verify STP is actually enabled
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  cat /sys/class/net/br0/bridge/stp_state

# Check if all bridge ports are participating in STP
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  bridge link show
```

### Slow Network Recovery

If the network takes too long to recover after a link change:

```bash
# Check if RSTP is being used (should be 2)
cat /sys/class/net/br0/bridge/stp_state

# Reduce forward delay if using classic STP
ip link set br0 type bridge forward_delay 4
```

### Root Bridge Keeps Changing

If the root bridge election is unstable:

```bash
# Set a very low priority on the desired root bridge
ip link set br0 type bridge priority 0

# Set higher priorities on other bridges
ip link set br0 type bridge priority 32768
```

## Conclusion

STP configuration on bridges in Talos Linux prevents network loops that can bring down your entire cluster network. While Talos provides basic STP enablement through the machine configuration, detailed STP parameter tuning requires a privileged DaemonSet approach. For most deployments, enabling RSTP with appropriate bridge priorities and edge port configuration provides fast convergence and reliable loop prevention. Always verify STP state after configuration changes, and monitor for unexpected topology changes that could indicate network issues.
