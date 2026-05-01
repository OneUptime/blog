# How to Fix Fragmentation Issues with VXLAN Overlays

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VXLAN, Fragmentation, MTU, Overlay, Linux, Kubernetes, Networking

Description: Diagnose and fix MTU and fragmentation issues in VXLAN overlay networks, including how to properly size VXLAN interface MTU and configure host interfaces to prevent packet loss.

## Introduction

VXLAN (Virtual Extensible LAN) encapsulates Layer 2 frames in UDP/IP, adding 50 bytes of overhead: 14 bytes Ethernet, 20 bytes outer IP, 8 bytes UDP, and 8 bytes VXLAN header. On a standard 1500-byte MTU underlay network, VXLAN can only carry 1450 bytes per packet. Misconfigured MTU causes silent packet drops, TCP stalls, and degraded application performance in overlay networks.

## VXLAN Overhead Breakdown

```text
VXLAN Encapsulation Overhead:
  Outer Ethernet header:  14 bytes
  Outer IP header:        20 bytes
  Outer UDP header:        8 bytes
  VXLAN header:            8 bytes
  Total overhead:         50 bytes

  Physical MTU 1500:
    VXLAN overlay MTU = 1500 - 50 = 1450 bytes

  Physical MTU 9000 (jumbo frames):
    VXLAN overlay MTU = 9000 - 50 = 8950 bytes

  For TCP over VXLAN:
    VXLAN MTU 1450 - 40 (TCP+IP) = MSS 1410
```

## Configure VXLAN Interface MTU

```bash
# Create VXLAN interface with correct MTU:

ip link add vxlan10 type vxlan id 10 \
  local 192.168.1.10 \
  remote 192.168.1.20 \
  dstport 4789

# Set MTU to account for VXLAN overhead:
ip link set vxlan10 mtu 1450

ip link set vxlan10 up
ip addr add 10.0.10.1/24 dev vxlan10

# Verify:
ip link show vxlan10 | grep mtu
# Should show: mtu 1450
```

## Apply MSS Clamping for VXLAN

```bash
# TCP MSS clamping prevents oversized TCP segments:
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -o vxlan10 -j TCPMSS --set-mss 1410

iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -i vxlan10 -j TCPMSS --set-mss 1410

# For all VXLAN interfaces (wildcard):
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -o vxlan+ -j TCPMSS --clamp-mss-to-pmtu

# Verify:
iptables -t mangle -L FORWARD -v -n | grep -E "TCPMSS|vxlan"
```

## Enable Jumbo Frames on Underlay

```bash
# Best solution: enable jumbo frames on physical infrastructure
# so VXLAN overlay can use full 1500-byte MTU

# Set jumbo frames on physical interfaces (requires switch support):
ip link set eth0 mtu 9000

# Then VXLAN overlay can use 1500-byte MTU:
ip link set vxlan10 mtu 1500

# Verify physical interface supports jumbo frames:
ip link show eth0 | grep mtu
# Should show: mtu 9000

# Test connectivity with large packets through VXLAN:
ping -M do -s 1472 -c 3 10.0.10.2  # 1472 + 28 = 1500
```

## Diagnose Fragmentation in VXLAN

```bash
# Check for VXLAN fragmentation:
tcpdump -i eth0 -n 'udp port 4789' | \
  awk '/length/{if ($NF+0 > 1400) print "Large VXLAN:", $0}'

# Monitor kernel fragment counters:
watch -n 2 "nstat | grep -E 'IpFrag|IpReasm'"
# IpFragCreates: host is fragmenting VXLAN packets
# IpReasmFails: fragments lost (MTU issue)

# Trace path MTU through underlay:
tracepath -n 192.168.1.20
# Shows MTU at each underlay hop

# Check VXLAN interface details:
ip -d link show vxlan10
# Look for: mtu, dstport, id
```

## Fix MTU in Docker VXLAN Networks

```bash
# Docker overlay networks use VXLAN by default
# Set MTU on the overlay network:
docker network create \
  --driver overlay \
  --opt com.docker.network.driver.mtu=1450 \
  my-overlay-network

# If containers also use Docker's default bridge network,
# set its MTU separately in the Docker daemon:
cat > /etc/docker/daemon.json << 'EOF'
{
  "mtu": 1450
}
EOF

systemctl restart docker

# Verify Docker network MTU:
docker network inspect my-overlay-network | grep -i mtu
```

## Fix MTU in Kubernetes VXLAN CNI

```bash
# Flannel VXLAN MTU configuration:
# Edit ConfigMap:
kubectl -n kube-flannel edit configmap kube-flannel-cfg

# Find cni-conf.json and add/modify the delegate MTU:
# "delegate": {
#   "hairpinMode": true,
#   "isDefaultGateway": true,
#   "mtu": 1450
# }

# Restart flannel to apply updated CNI config:
kubectl rollout restart daemonset kube-flannel-ds -n kube-flannel

# Calico operator installation:
kubectl patch installation.operator.tigera.io default --type merge \
  -p '{"spec":{"calicoNetwork":{"mtu":1450}}}'

# Calico manifest installation:
kubectl patch configmap/calico-config -n kube-system --type merge \
  -p '{"data":{"veth_mtu":"1450"}}'

kubectl rollout restart daemonset calico-node -n kube-system

# Recreate a pod or start a new one, then verify pod interface MTU:
kubectl exec <pod-name> -- ip link show eth0 | grep mtu
# New pods should show: mtu 1450
```

## Conclusion

VXLAN adds 50 bytes of encapsulation overhead, reducing effective MTU from 1500 to 1450 bytes. Set VXLAN interface MTU to `physical-MTU - 50` and apply TCP MSS clamping to 1410 (VXLAN MTU minus 40). In container environments, configure the Docker overlay network MTU or the Kubernetes CNI plugin; if you use Docker's default bridge network, set its MTU separately in the Docker daemon. The ideal solution is enabling jumbo frames on the underlay network, allowing VXLAN to carry full 1500-byte payloads. Monitor `IpFragCreates` and `IpReasmFails` to confirm fragmentation counters stop increasing after applying fixes.
