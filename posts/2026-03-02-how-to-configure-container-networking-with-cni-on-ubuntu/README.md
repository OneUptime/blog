# How to Configure Container Networking with CNI on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, CNI, Containers, Networking, Kubernetes

Description: Configure container networking on Ubuntu using CNI plugins to create bridge networks, VXLAN overlays, and custom network setups for containerized workloads outside Kubernetes.

---

CNI (Container Network Interface) is the standard interface between container runtimes and network plugins on Linux. Kubernetes uses it, but CNI is a runtime-agnostic specification - you can use it with any container runtime that supports the interface, including containerd, CRI-O, and even standalone tools like Podman. Understanding CNI directly is useful when building custom container platforms, debugging Kubernetes networking, or setting up non-Kubernetes container environments.

## How CNI Works

When a container runtime needs to set up networking for a new container:

1. It creates a network namespace for the container
2. It calls the CNI plugin binary with parameters in environment variables and configuration in stdin
3. The CNI plugin configures the networking (creates veth pairs, assigns IPs, sets up routes)
4. The runtime uses the result (the container's IP address, gateway, etc.)

CNI plugins are simple binaries that receive JSON on stdin and write JSON to stdout. They are not daemons - they are invoked per-operation.

## Installing CNI Plugins

```bash
# Install the standard CNI plugins package
sudo apt update
sudo apt install -y containernetworking-plugins

# The plugins are installed to /opt/cni/bin/
ls /opt/cni/bin/

# If not available via apt, download directly
CNI_VERSION="v1.4.0"
sudo mkdir -p /opt/cni/bin

curl -L https://github.com/containernetworking/plugins/releases/download/${CNI_VERSION}/cni-plugins-linux-amd64-${CNI_VERSION}.tgz | \
    sudo tar xz -C /opt/cni/bin

ls /opt/cni/bin/
# bridge  dhcp  firewall  host-device  host-local  ipvlan  loopback
# macvlan  portmap  ptp  sbr  static  tuning  vlan  vrf
```

## CNI Configuration Files

CNI configurations are JSON files, typically stored in `/etc/cni/net.d/`. The runtime reads these to determine which plugin to invoke and with what parameters.

```bash
sudo mkdir -p /etc/cni/net.d
```

### Basic Bridge Network

The most common CNI configuration creates a Linux bridge and attaches containers to it:

```bash
sudo tee /etc/cni/net.d/10-bridge.conflist > /dev/null <<'EOF'
{
    "cniVersion": "0.4.0",
    "name": "mynet",
    "plugins": [
        {
            "type": "bridge",
            "bridge": "cni-br0",
            "isGateway": true,
            "ipMasq": true,
            "promiscMode": true,
            "ipam": {
                "type": "host-local",
                "ranges": [
                    [
                        {
                            "subnet": "10.88.0.0/16",
                            "rangeStart": "10.88.0.10",
                            "rangeEnd": "10.88.0.254",
                            "gateway": "10.88.0.1"
                        }
                    ]
                ],
                "routes": [
                    { "dst": "0.0.0.0/0" }
                ]
            }
        },
        {
            "type": "portmap",
            "capabilities": {
                "portMappings": true
            }
        },
        {
            "type": "firewall",
            "backend": "iptables"
        }
    ]
}
EOF
```

## Testing CNI Manually

The `cnitool` utility lets you test CNI configurations without a container runtime:

```bash
# Install cnitool
sudo apt install -y golang-go
go install github.com/containernetworking/cni/cnitool@latest
sudo mv ~/go/bin/cnitool /usr/local/bin/

# Or download a pre-built binary
curl -L https://github.com/containernetworking/cni/releases/latest/download/cni-tools-linux-amd64.tgz | \
    sudo tar xz -C /usr/local/bin

# Create a network namespace to test with
sudo ip netns add testns

# Add the network namespace to CNI
sudo CNI_PATH=/opt/cni/bin \
    NETCONFPATH=/etc/cni/net.d \
    cnitool add mynet /var/run/netns/testns

# Inspect the result
sudo ip netns exec testns ip addr show
sudo ip netns exec testns ip route show

# Check that the bridge was created
ip link show cni-br0
ip addr show cni-br0

# Remove the network when done
sudo CNI_PATH=/opt/cni/bin \
    NETCONFPATH=/etc/cni/net.d \
    cnitool del mynet /var/run/netns/testns

sudo ip netns del testns
```

## Using CNI with Podman

Podman uses CNI (or Netavark on newer versions) for container networking. You can create custom CNI-based networks:

```bash
# Install Podman (which includes CNI support)
sudo apt install -y podman

# Create a Podman network with custom CIDR
podman network create --driver bridge \
    --subnet 172.20.0.0/24 \
    --gateway 172.20.0.1 \
    my-custom-network

# View the CNI configuration Podman created
cat ~/.config/cni/net.d/my-custom-network.conflist

# Run a container on this network
podman run -d \
    --name web \
    --network my-custom-network \
    nginx:latest

# Run another container and connect to the first by name
podman run -it \
    --network my-custom-network \
    curlimages/curl curl http://web

# Inspect network configuration
podman network inspect my-custom-network
```

## MACVLAN Network

MACVLAN gives containers their own MAC addresses and direct layer-2 connectivity to the host network:

```bash
sudo tee /etc/cni/net.d/20-macvlan.conflist > /dev/null <<'EOF'
{
    "cniVersion": "0.4.0",
    "name": "macvlan-net",
    "plugins": [
        {
            "type": "macvlan",
            "master": "eth0",
            "mode": "bridge",
            "ipam": {
                "type": "host-local",
                "subnet": "192.168.1.0/24",
                "rangeStart": "192.168.1.200",
                "rangeEnd": "192.168.1.250",
                "gateway": "192.168.1.1",
                "routes": [
                    { "dst": "0.0.0.0/0" }
                ]
            }
        }
    ]
}
EOF
```

With MACVLAN, containers appear as distinct devices on the local network with their own IP addresses in the 192.168.1.0/24 range - useful for services that need to be directly accessible without port mapping.

## IPVLAN Network

IPVLAN is similar to MACVLAN but all containers share the host's MAC address:

```bash
sudo tee /etc/cni/net.d/30-ipvlan.conflist > /dev/null <<'EOF'
{
    "cniVersion": "0.4.0",
    "name": "ipvlan-net",
    "plugins": [
        {
            "type": "ipvlan",
            "master": "eth0",
            "mode": "l2",
            "ipam": {
                "type": "host-local",
                "subnet": "192.168.1.0/24",
                "rangeStart": "192.168.1.150",
                "rangeEnd": "192.168.1.180",
                "gateway": "192.168.1.1"
            }
        }
    ]
}
EOF
```

## Static IP Assignment

For services that need predictable IP addresses:

```bash
sudo tee /etc/cni/net.d/40-static.conflist > /dev/null <<'EOF'
{
    "cniVersion": "0.4.0",
    "name": "static-net",
    "plugins": [
        {
            "type": "bridge",
            "bridge": "cni-static0",
            "isGateway": true,
            "ipMasq": true,
            "ipam": {
                "type": "static",
                "addresses": [
                    {
                        "address": "10.99.0.10/24",
                        "gateway": "10.99.0.1"
                    }
                ],
                "routes": [
                    { "dst": "0.0.0.0/0" }
                ]
            }
        }
    ]
}
EOF
```

## Host-Local IPAM Database

The `host-local` IPAM plugin stores IP allocations in a directory on disk. Understanding this helps when debugging IP conflicts:

```bash
# The default storage location
ls /var/lib/cni/networks/

# For a network named "mynet"
ls /var/lib/cni/networks/mynet/

# Each file is named by IP address and contains the container ID that holds it
cat /var/lib/cni/networks/mynet/10.88.0.10

# If containers were deleted without CNI cleanup, stale entries remain
# Manual cleanup is required:
sudo rm /var/lib/cni/networks/mynet/10.88.0.10
```

## Writing a Custom CNI Plugin

A custom CNI plugin is just an executable that reads JSON from stdin:

```bash
sudo tee /opt/cni/bin/my-logger-plugin > /dev/null <<'PLUGIN'
#!/bin/bash
# A simple CNI plugin that logs invocations (for debugging/learning)

CNI_COMMAND=$CNI_COMMAND
NETNS=$CNI_NETNS
IFNAME=$CNI_IFNAME

# Log the invocation
logger -t cni-my-plugin "Command: $CNI_COMMAND, Netns: $NETNS, If: $IFNAME"

# Read the config from stdin
CONFIG=$(cat)
logger -t cni-my-plugin "Config: $CONFIG"

# For an ADD command, we must return a valid result JSON
# For this example, just delegate to the bridge plugin
echo "$CONFIG" | /opt/cni/bin/bridge
PLUGIN

sudo chmod +x /opt/cni/bin/my-logger-plugin
```

## Debugging CNI Networking

```bash
# Enable CNI debug logging (for containerd)
# In /etc/containerd/config.toml:
# [plugins."io.containerd.grpc.v1.cni"]
#   log_level = "debug"

# Watch CNI invocations via syslog
sudo journalctl -f | grep cni

# Inspect bridge and veth pairs created by CNI
ip link show type bridge
ip link show type veth

# Trace network namespace configurations
for ns in $(ip netns list | awk '{print $1}'); do
    echo "=== Namespace: $ns ==="
    ip netns exec $ns ip addr
done

# Check iptables rules added by CNI
sudo iptables -L -n | grep -i cni
sudo iptables -t nat -L -n | grep -i cni

# If containers can't reach the internet:
# Verify IP masquerade is in place
sudo iptables -t nat -L POSTROUTING -n -v | grep MASQUERADE

# Verify IP forwarding is enabled
sysctl net.ipv4.ip_forward
```

## CNI in Kubernetes Context

In Kubernetes, the kubelet invokes CNI plugins via the CRI runtime (containerd or CRI-O). The configuration is in `/etc/cni/net.d/` on each node. Kubernetes CNI plugins like Calico, Flannel, and Cilium install their configurations here:

```bash
# On a Kubernetes node, view active CNI configuration
ls /etc/cni/net.d/

# Flannel's configuration
cat /etc/cni/net.d/10-flannel.conflist

# Calico's configuration
cat /etc/cni/net.d/10-calico.conflist
```

Understanding the underlying CNI mechanism demystifies Kubernetes networking issues and helps you troubleshoot problems that surface as "pods can't communicate" - which almost always trace back to CNI configuration, iptables rules, or network namespace setup.
