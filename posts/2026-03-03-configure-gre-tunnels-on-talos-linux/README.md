# How to Configure GRE Tunnels on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, GRE, Tunneling, Networking, Kubernetes, VPN, Encapsulation

Description: Step-by-step instructions for configuring GRE tunnels on Talos Linux nodes for site-to-site connectivity and network encapsulation.

---

GRE (Generic Routing Encapsulation) is one of the simplest tunneling protocols available. It wraps packets of one protocol inside packets of another, creating a virtual point-to-point link between two endpoints. While VXLAN and IPSec get more attention in modern networking, GRE remains useful for its simplicity and versatility.

On Talos Linux, GRE tunnels can connect your Kubernetes cluster to remote networks, provide encapsulated connectivity between sites, or create overlay networks for specific use cases. Since Talos is an immutable OS without shell access, configuring GRE tunnels requires a different approach than the traditional `ip tunnel add` commands.

## How GRE Works

GRE takes an inner packet (which can be almost any protocol) and wraps it in a GRE header, then wraps that in an outer IP header:

```text
[Outer IP Header] [GRE Header] [Inner IP Header] [Payload]
```

The outer IP header has the tunnel endpoints as source and destination. The inner IP header has the actual source and destination of the encapsulated traffic. GRE itself does not provide encryption - it is purely an encapsulation mechanism.

Key characteristics:
- Protocol number 47 (not TCP or UDP)
- Adds 24 bytes of overhead (20-byte outer IP + 4-byte GRE header)
- Supports both IPv4 and IPv6 as inner and outer protocols
- No built-in encryption (combine with IPSec for security)

## Setting Up GRE Tunnels on Talos Linux

Since Talos does not provide shell access, GRE tunnel configuration happens through privileged Kubernetes workloads that can modify the host network.

### Using a DaemonSet for GRE Configuration

Create a DaemonSet that sets up GRE tunnels on specific nodes:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: gre-tunnel-manager
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: gre-tunnel
  template:
    metadata:
      labels:
        app: gre-tunnel
    spec:
      hostNetwork: true
      nodeSelector:
        # Only run on nodes that need GRE tunnels
        gre-tunnel: "enabled"
      initContainers:
        - name: setup-gre
          image: nicolaka/netshoot
          securityContext:
            privileged: true
            capabilities:
              add: ["NET_ADMIN"]
          command:
            - /bin/sh
            - -c
            - |
              # Get the node's primary IP
              LOCAL_IP=$(hostname -I | awk '{print $1}')
              REMOTE_IP="203.0.113.50"  # Remote tunnel endpoint
              TUNNEL_LOCAL="10.255.0.1"  # Local tunnel address
              TUNNEL_REMOTE="10.255.0.2" # Remote tunnel address

              # Check if tunnel already exists
              if ip link show gre1 > /dev/null 2>&1; then
                echo "GRE tunnel already exists"
                exit 0
              fi

              # Create GRE tunnel
              ip tunnel add gre1 mode gre \
                local $LOCAL_IP \
                remote $REMOTE_IP \
                ttl 255

              # Assign tunnel IP address
              ip addr add ${TUNNEL_LOCAL}/30 dev gre1

              # Set MTU (1500 - 24 bytes GRE overhead)
              ip link set gre1 mtu 1476

              # Bring up the tunnel
              ip link set gre1 up

              # Add routes through the tunnel
              ip route add 172.16.0.0/16 via $TUNNEL_REMOTE dev gre1

              echo "GRE tunnel configured successfully"
              echo "Local: $LOCAL_IP -> Remote: $REMOTE_IP"
              echo "Tunnel addresses: $TUNNEL_LOCAL <-> $TUNNEL_REMOTE"
      containers:
        - name: keepalive
          image: busybox
          command:
            - /bin/sh
            - -c
            - |
              # Monitor tunnel health
              while true; do
                if ip link show gre1 > /dev/null 2>&1; then
                  STATE=$(ip link show gre1 | grep -o "state [A-Z]*" | awk '{print $2}')
                  echo "$(date): GRE tunnel state: $STATE"
                else
                  echo "$(date): WARNING - GRE tunnel not found, recreating"
                  # Trigger recreation logic here
                fi
                sleep 60
              done
          securityContext:
            privileged: true
      tolerations:
        - operator: Exists
```

Label the nodes that need GRE tunnels:

```bash
# Label nodes that should have GRE tunnels
kubectl label node talos-worker-1 gre-tunnel=enabled
```

### Using a ConfigMap for Tunnel Parameters

For more flexible tunnel management, use a ConfigMap to store tunnel parameters:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: gre-tunnel-config
  namespace: kube-system
data:
  tunnels.json: |
    [
      {
        "name": "gre-site-b",
        "remote": "203.0.113.50",
        "tunnel_local": "10.255.0.1/30",
        "routes": ["172.16.0.0/16", "172.17.0.0/16"]
      },
      {
        "name": "gre-site-c",
        "remote": "198.51.100.25",
        "tunnel_local": "10.255.1.1/30",
        "routes": ["172.18.0.0/16"]
      }
    ]
```

Then reference it in the DaemonSet:

```yaml
volumeMounts:
  - name: tunnel-config
    mountPath: /etc/gre-config
volumes:
  - name: tunnel-config
    configMap:
      name: gre-tunnel-config
```

## GRE over IPSec

GRE by itself does not encrypt traffic. For secure tunnels, combine GRE with IPSec:

```yaml
# The GRE tunnel provides the encapsulation
# IPSec provides the encryption
# This is configured on both endpoints

# Step 1: Set up IPSec (see the IPSec VPN guide)
# Step 2: Configure GRE tunnel as shown above
# Step 3: IPSec policy encrypts the GRE traffic between endpoints
```

The typical architecture is:

```text
[Inner Packet] -> [GRE Encapsulation] -> [IPSec Encryption] -> [Network]
```

## Kernel Parameters for GRE

Configure relevant kernel parameters in the Talos machine configuration:

```yaml
machine:
  sysctls:
    # Enable IP forwarding (required for routing through tunnels)
    net.ipv4.ip_forward: "1"

    # Disable reverse path filtering on tunnel interfaces
    net.ipv4.conf.all.rp_filter: "0"
    net.ipv4.conf.default.rp_filter: "0"

    # Increase ICMP rate for path MTU discovery
    net.ipv4.icmp_ratelimit: "0"
```

## GRE Tunnel Variants

### GRE with Key

GRE keys allow multiple tunnels between the same endpoints to be differentiated:

```bash
# Create tunnel with a key
ip tunnel add gre1 mode gre \
  local 192.168.1.10 \
  remote 203.0.113.50 \
  key 12345 \
  ttl 255
```

### GREtap (Layer 2 GRE)

GREtap creates a Layer 2 tunnel that bridges Ethernet frames:

```bash
# Create a GREtap interface (Layer 2 tunnel)
ip link add gretap1 type gretap \
  local 192.168.1.10 \
  remote 203.0.113.50 \
  ttl 255

ip link set gretap1 up

# Can be added to a bridge for Layer 2 connectivity
ip link add br-gre type bridge
ip link set gretap1 master br-gre
ip link set br-gre up
ip addr add 10.100.0.1/24 dev br-gre
```

### IP6GRE (GRE over IPv6)

For IPv6 transport:

```bash
# Create GRE tunnel over IPv6
ip tunnel add gre6-1 mode ip6gre \
  local 2001:db8::1 \
  remote 2001:db8::2 \
  ttl 255
```

## Monitoring GRE Tunnels

### Check Tunnel Status

```bash
# From a debug pod
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  ip tunnel show

# Check tunnel statistics
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  ip -s link show gre1
```

### Verify Connectivity Through the Tunnel

```bash
# Ping the remote tunnel endpoint
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  ping -c 5 10.255.0.2

# Trace the path through the tunnel
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  traceroute -n 172.16.0.1
```

### Monitor Encapsulation

```bash
# Capture GRE traffic on the physical interface
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  tcpdump -i eth0 -n proto gre -c 10
```

## Troubleshooting GRE Tunnels

### Tunnel Created But No Traffic Flowing

```bash
# Check if protocol 47 (GRE) is allowed through firewalls
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  ping -c 3 203.0.113.50

# If ping works but tunnel does not, GRE protocol might be blocked
# GRE is not TCP or UDP - it is IP protocol 47
# Many firewalls block it by default
```

### Path MTU Issues

```bash
# Test with different packet sizes through the tunnel
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  ping -M do -s 1448 10.255.0.2

# If large packets fail, reduce the tunnel MTU
# Standard GRE: physical MTU - 24 = tunnel MTU
# GRE over IPSec: further reduced by IPSec overhead
```

### Tunnel Disappears After Node Reboot

Since GRE tunnels are created by the DaemonSet init container, they should be recreated when the pod starts. However, if the DaemonSet pod is not scheduled quickly enough:

```bash
# Check if the DaemonSet pod is running
kubectl get pods -n kube-system -l app=gre-tunnel -o wide

# If it is pending, check for scheduling issues
kubectl describe pod -n kube-system <gre-tunnel-pod>
```

## Performance Considerations

GRE encapsulation adds CPU overhead for each packet. For high-throughput scenarios:

1. Check if your NIC supports GRE offloading
2. Consider using larger MTUs to reduce per-packet overhead
3. Monitor CPU usage on tunnel endpoints
4. For very high throughput, consider hardware-accelerated tunneling

## Conclusion

GRE tunnels on Talos Linux provide a straightforward way to create point-to-point links between your Kubernetes cluster and remote networks. While the configuration approach differs from traditional Linux (using DaemonSets instead of command-line tools), the underlying technology works the same way. For production use, combine GRE with IPSec for encryption, monitor tunnel health through your observability stack, and account for the MTU overhead in your network design.
