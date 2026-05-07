# How to Avoid IPv4 Fragmentation in Docker and Container Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, MTU, Fragmentation, Container, Networking, Linux

Description: Configure Docker network MTU settings to prevent packet fragmentation in containerized environments, including bridge networks, overlay networks, and Kubernetes.

## Introduction

Docker containers can experience packet fragmentation when their network MTU differs from the host's effective path MTU. Docker's default `bridge` network uses MTU 1500 by default, but the end-to-end path may be lower when traffic crosses VPNs, internet gateways, or overlay networks. In overlay networks (Swarm, Kubernetes), the encapsulation overhead further reduces the effective MTU.

## Diagnose MTU Issue in Docker

```bash
# Check host interface MTU:

ip link show eth0 | grep mtu

# Check Docker bridge MTU:
ip link show docker0 | grep mtu
# Default: mtu 1500

# Check inside a running container:
docker run --rm alpine sh -c 'apk add --no-cache iproute2 >/dev/null && ip link show eth0'
# Shows container's virtual interface MTU

# Test fragmentation from inside container:
docker run --rm alpine sh -c 'apk add --no-cache iputils >/dev/null && ping -M do -s 1472 -c 3 8.8.8.8'
# If this fails but a smaller payload succeeds: path MTU is below 1500
```

## Set Docker Bridge MTU

```bash
# Method 1: Docker daemon configuration for the default bridge:
cat > /etc/docker/daemon.json << 'EOF'
{
  "mtu": 1450
}
EOF
systemctl restart docker

# Verify new bridge MTU:
ip link show docker0 | grep mtu
# Should show: mtu 1450

# New containers on the default bridge use this MTU automatically
# Existing containers need to be recreated

# Method 2: Set MTU when creating a new network:
docker network create --opt com.docker.network.driver.mtu=1450 mynetwork
# Add `-d overlay` when creating a Swarm overlay network

# Verify:
docker network inspect mynetwork --format '{{json .Options}}'
```

## Calculate Correct MTU

```bash
# MTU for containers = Path MTU - Encapsulation Overhead

# Standard Ethernet / Azure default:
# Container MTU = 1500 (same as path MTU)

# AWS EC2:
# 1500 is safe for internet and VPN paths
# Jumbo 9001 is only for supported paths inside a VPC

# VXLAN overlay (Swarm/Kubernetes with Flannel):
# IPv4 VXLAN overhead: 50 bytes
# Container MTU = path_MTU - 50 = 1500 - 50 = 1450

# VXLAN over a WireGuard interface already set to MTU 1420:
# Container MTU = 1420 - 50 = 1370

python3 -c "
path_mtu = 1500
vxlan_overhead = 50   # for overlay networks
container_mtu = path_mtu - vxlan_overhead
print(f'Recommended container MTU: {container_mtu}')
"
```

## Kubernetes MTU Configuration

```yaml
# Kubernetes MTU depends on the CNI plugin:

# Flannel VXLAN (edit configmap):
# kubectl -n kube-flannel edit configmap kube-flannel-cfg
# In net-conf.json:
# {
#   "Network": "10.244.0.0/16",
#   "Backend": {
#     "Type": "vxlan",
#     "MTU": 1450    ← Add this
#   }
# }

# Calico:
# kubectl -n kube-system set env daemonset/calico-node FELIX_IPINIPMTU=1480
# Or for VXLAN:
# kubectl -n kube-system set env daemonset/calico-node FELIX_VXLANMTU=1450

# Weave Net:
# Set env variable WEAVE_MTU=1376 in weave DaemonSet
```

```bash
# Check current pod MTU in Kubernetes:
kubectl run mtu-test --image=alpine --rm -it --restart=Never -- \
  sh -c 'apk add --no-cache iproute2 >/dev/null && ip link show eth0'

# Test from pod:
kubectl run mtu-test --image=alpine --rm -it --restart=Never -- \
  sh -c 'apk add --no-cache iputils >/dev/null && ping -M do -s 1422 -c 3 8.8.8.8'
# Adjust size based on actual overlay overhead
```

## Docker Compose MTU

```yaml
# docker-compose.yml - specify network MTU:
services:
  app:
    image: myapp
    networks:
      - internal

  db:
    image: postgres
    networks:
      - internal

networks:
  internal:
    driver: bridge
    driver_opts:
      com.docker.network.driver.mtu: "1450"
```

## Verify Fix

```bash
# After setting correct MTU:
docker run --rm alpine sh -c 'apk add --no-cache iputils >/dev/null && ping -M do -s 1400 -c 3 8.8.8.8'
# Should succeed

# Test with actual application:
docker run --rm alpine sh -c 'apk add --no-cache curl >/dev/null && curl -L -o /dev/null http://speedtest.tele2.net/100MB.zip'
# Should complete without hanging

# Check no fragmentation occurring from containers:
# On the host:
tcpdump -i docker0 -n '(ip[6:2] & 0x3fff) != 0'
# Should see no fragmentation if MTU is correct
```

## Conclusion

Container MTU issues arise when the container's network interface MTU doesn't account for overlay encapsulation overhead. For overlay networks, calculate container MTU as `path_mtu - overlay_overhead`; for example, IPv4 VXLAN adds 50 bytes. Configure the Docker daemon MTU in `/etc/docker/daemon.json` for the default bridge, and set `com.docker.network.driver.mtu` on user-defined networks as needed. For Kubernetes, configure the CNI plugin's MTU setting. Test from inside containers with `ping -M do` and check that large file downloads work. Fragmentation in container networks significantly impacts performance and can cause mysterious application timeouts.
