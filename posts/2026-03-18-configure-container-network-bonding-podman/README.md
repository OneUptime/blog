# How to Configure Container Network Bonding with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Networking, Network Bonding, Container, High Availability

Description: Learn how to configure network bonding for Podman containers to achieve redundancy, increased throughput, and fault tolerance across multiple network interfaces.

---

> Network bonding combines multiple network interfaces into a single logical interface, providing redundancy and increased bandwidth. When applied to Podman containers, bonding ensures that network failures on a single interface do not disrupt your containerized services.

In production environments, network reliability is just as important as application reliability. Network bonding (also called NIC teaming or link aggregation) addresses this by grouping multiple physical or virtual network interfaces into one. If one interface fails, traffic automatically shifts to the remaining interfaces without interrupting connections.

This guide covers how to configure network bonding at the host level for Podman containers, how to attach containers to multiple networks for redundancy, and how to use macvlan and bridge configurations for advanced networking scenarios.

---

## Prerequisites

- Podman 4.0 or later
- A Linux system with multiple network interfaces (physical or virtual)
- Root access for host-level network configuration
- The `nmcli` or `ip` command-line tools

```bash
podman --version
ip link show
```

## Understanding Network Bonding Modes

Linux supports several bonding modes, each suited to different requirements:

- **Mode 0 (balance-rr)**: Round-robin packet distribution across interfaces. Provides load balancing and fault tolerance.
- **Mode 1 (active-backup)**: Only one interface is active. The backup takes over if the active interface fails. Best for pure fault tolerance.
- **Mode 2 (balance-xor)**: Selects the interface based on a hash of source and destination addresses. Provides load balancing and fault tolerance.
- **Mode 4 (802.3ad)**: IEEE link aggregation. Requires switch support for LACP. Provides both load balancing and fault tolerance.
- **Mode 5 (balance-tlb)**: Adaptive transmit load balancing. Does not require switch support.
- **Mode 6 (balance-alb)**: Adaptive load balancing. Includes receive and transmit balancing without switch support.

## Host-Level Network Bonding

### Creating a Bond with NetworkManager

The most common approach is to configure bonding at the host level using NetworkManager:

```bash
# Create the bond interface

sudo nmcli connection add type bond \
  con-name bond0 \
  ifname bond0 \
  mode active-backup \
  miimon 100

# Add the first port interface
sudo nmcli connection add type ethernet \
  con-name bond0-port1 \
  ifname eth0 \
  controller bond0 \
  port-type bond

# Add the second port interface
sudo nmcli connection add type ethernet \
  con-name bond0-port2 \
  ifname eth1 \
  controller bond0 \
  port-type bond

# Assign an IP address to the bond
sudo nmcli connection modify bond0 \
  ipv4.addresses "192.168.1.100/24" \
  ipv4.gateway "192.168.1.1" \
  ipv4.dns "8.8.8.8" \
  ipv4.method manual

# Bring up the bond
sudo nmcli connection up bond0
```

The `miimon=100` parameter checks link status every 100 milliseconds.

### Verifying the Bond

```bash
cat /proc/net/bonding/bond0
```

This shows the bond mode, active port, and the status of each interface.

Once host-level bonding is configured, Podman containers automatically benefit from the bonded interface when they use the default bridge network.

## Attaching Containers to Multiple Podman Networks

Podman allows containers to join multiple networks simultaneously, providing application-level redundancy:

```bash
# Create two separate networks
podman network create --subnet 10.10.1.0/24 frontend-net
podman network create --subnet 10.10.2.0/24 backend-net

# Run a container attached to both networks
podman run -d \
  --name multi-net-app \
  --network frontend-net \
  --network backend-net \
  docker.io/library/nginx:alpine
```

Verify the container has interfaces on both networks:

```bash
podman inspect multi-net-app --format '{{json .NetworkSettings.Networks}}' | python3 -m json.tool
```

The container now has two network interfaces, one for each Podman network, and can communicate with services on both networks.

## Using Macvlan for Direct Network Access

Macvlan allows containers to appear as physical devices on your network, each with their own MAC address:

```bash
# Create a macvlan network using the bonded interface
podman network create -d macvlan \
  --subnet 192.168.1.0/24 \
  --gateway 192.168.1.1 \
  -o parent=bond0 \
  macvlan-net

# Run a container on the macvlan network
podman run -d \
  --name macvlan-app \
  --network macvlan-net \
  --ip 192.168.1.150 \
  docker.io/library/nginx:alpine
```

The container gets its own IP address on the physical network and benefits from the bonded interface's redundancy.

## Creating a Bonded Bridge for Containers

For more control, you can create a Linux bridge on top of a bonded interface and configure Podman to use it. If you use this approach, assign the host IP address to the bridge instead of the bond:

```bash
# Remove IP configuration from the bond profile if it was assigned earlier
sudo nmcli connection modify bond0 \
  ipv4.method disabled \
  ipv6.method disabled

# Create a bridge on the bond interface
sudo nmcli connection add type bridge \
  con-name br-bond0 \
  ifname br-bond0

sudo nmcli connection add type ethernet \
  con-name br-bond0-port \
  ifname bond0 \
  controller br-bond0 \
  port-type bridge

sudo nmcli connection modify br-bond0 \
  ipv4.addresses "192.168.1.100/24" \
  ipv4.gateway "192.168.1.1" \
  ipv4.method manual

sudo nmcli connection up br-bond0
```

Then create a Podman network using this bridge:

```bash
sudo podman network create \
  --driver bridge \
  --interface-name br-bond0 \
  --opt mode=unmanaged \
  --subnet 192.168.1.0/24 \
  --gateway 192.168.1.1 \
  bonded-bridge
```

## Monitoring Network Bond Health

### Bond Status Script

Create a monitoring script that checks bond health and container connectivity:

```bash
cat > ~/bond-monitor.sh << 'SCRIPT'
#!/bin/bash

echo "=== Bond Interface Status ==="
if [ -f /proc/net/bonding/bond0 ]; then
    grep -E "^(Bonding Mode|Currently Active Slave|MII Status|Slave Interface)" /proc/net/bonding/bond0
else
    echo "No bond interface found"
fi

echo ""
echo "=== Container Network Status ==="
for container in $(podman ps --format "{{.Names}}"); do
    NETWORKS=$(podman inspect "$container" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}')
    echo "$container: $NETWORKS"
done
SCRIPT
chmod +x ~/bond-monitor.sh
```

### Systemd Health Check Service

```bash
cat > ~/.config/systemd/user/bond-health.service << 'EOF'
[Unit]
Description=Network bond health check

[Service]
Type=oneshot
ExecStart=%h/bond-monitor.sh
EOF

cat > ~/.config/systemd/user/bond-health.timer << 'EOF'
[Unit]
Description=Run bond health check every minute

[Timer]
OnCalendar=*:*:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now bond-health.timer
```

## Failover Testing

Test the failover behavior of your bonded interface:

```bash
# Check current active slave
cat /proc/net/bonding/bond0 | grep "Currently Active Slave"

# Simulate a failure by bringing down one interface
sudo ip link set eth0 down

# Verify failover occurred
cat /proc/net/bonding/bond0 | grep "Currently Active Slave"

# Test that a published container service is still reachable
curl http://192.168.1.100

# Restore the interface
sudo ip link set eth0 up
```

In active-backup mode, traffic should seamlessly switch to the backup interface without any visible disruption to the containers.

## Application-Level Redundancy with Podman

Beyond network bonding, you can achieve redundancy at the application level by running services across multiple networks:

```bash
podman network create --subnet 10.20.1.0/24 net-primary
podman network create --subnet 10.20.2.0/24 net-secondary

# Run the load balancer on both networks
podman run -d \
  --name lb \
  --network net-primary \
  --network net-secondary \
  -p 80:80 \
  -v ~/nginx-lb/conf.d:/etc/nginx/conf.d:ro,Z \
  docker.io/library/nginx:alpine

# Backend on primary network
podman run -d \
  --name backend-primary \
  --network net-primary \
  docker.io/library/nginx:alpine

# Backend on secondary network
podman run -d \
  --name backend-secondary \
  --network net-secondary \
  docker.io/library/nginx:alpine
```

The load balancer can reach backends on either network, providing redundancy even if one Podman network experiences issues.

## Performance Considerations

When using network bonding with containers, keep these points in mind:

- **Mode 4 (802.3ad)** provides the best throughput for multi-connection workloads but requires switch support
- **Mode 1 (active-backup)** has no throughput benefit but provides the simplest failover
- **Macvlan** has lower overhead than bridge networking because it bypasses the Linux bridge
- **MTU settings** should be consistent across all bonded interfaces and the bridge

Set the MTU for a Podman network:

```bash
podman network create --opt mtu=9000 jumbo-net
```

## Conclusion

Network bonding with Podman containers provides the reliability that production workloads demand. Host-level bonding through NetworkManager gives all containers automatic redundancy with no per-container configuration. For application-level redundancy, attaching containers to multiple Podman networks ensures connectivity even when individual networks fail. Combined with macvlan for direct network access and proper monitoring, you can build container infrastructure that withstands network failures gracefully and maintains service availability.
