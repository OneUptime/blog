# How to Set a Static MAC Address for a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, MAC Address, Configuration

Description: Learn how to set a static MAC address for Podman containers for licensing, DHCP reservations, and network management.

---

> Static MAC addresses let you assign specific hardware addresses to containers, which is useful for DHCP reservations, MAC-based licensing, and network access control.

Podman allows you to specify a MAC address for a container's network interface. This is particularly relevant for macvlan networks where containers appear as physical devices on the LAN, but can also be used with bridge networks.

---

## Setting a Static MAC Address

```bash
# Assign a specific MAC address to a container

podman run -d --name licensed-app \
  --mac-address 02:42:ac:11:00:02 \
  docker.io/library/alpine:latest tail -f /dev/null

# Verify the MAC address
podman exec licensed-app ip link show eth0
# ether 02:42:ac:11:00:02
```

## MAC Address on a Custom Network

```bash
# Create a network and assign a static MAC
podman network create --subnet 10.50.0.0/24 app-net

podman run -d --name web \
  --network app-net \
  --ip 10.50.0.10 \
  --mac-address 02:42:0a:32:00:0a \
  docker.io/library/nginx:latest

# Verify both IP and MAC
podman inspect web --format '{{ range .NetworkSettings.Networks }}IP={{ .IPAddress }} MAC={{ .MacAddress }}{{ end }}'
```

## MAC Address with Macvlan Networks

Static MACs are most commonly used with macvlan for LAN integration:

```bash
# Create a macvlan network
sudo podman network create \
  --driver macvlan \
  --opt parent=eth0 \
  --subnet 192.168.1.0/24 \
  --gateway 192.168.1.1 \
  lan-net

# Assign a specific MAC and IP address
sudo podman run -d --name server \
  --network lan-net \
  --ip 192.168.1.200 \
  --mac-address 02:42:c0:a8:01:c8 \
  docker.io/library/nginx:latest

# The container appears on the LAN with this specific MAC
```

## DHCP Reservation Use Case

```bash
# Configure your DHCP server with a reservation:
# MAC: 02:42:c0:a8:01:c8 -> IP: 192.168.1.200

# Enable the DHCP proxy when using the Netavark backend
sudo systemctl enable --now netavark-dhcp-proxy.socket

# Create a macvlan network that uses DHCP IPAM
sudo podman network create \
  --driver macvlan \
  --opt parent=eth0 \
  --ipam-driver dhcp \
  lan-dhcp

# The DHCP server assigns the reserved IP based on the MAC
sudo podman run -d --name dhcp-client \
  --network lan-dhcp \
  --mac-address 02:42:c0:a8:01:c8 \
  docker.io/library/alpine:latest tail -f /dev/null
```

## MAC Address Conventions

```bash
# Use locally administered MAC addresses (second hex digit is 2, 6, A, or E)
# Format: X2:XX:XX:XX:XX:XX (where the 2nd bit of the first byte is set)

# Valid locally administered addresses:
# 02:42:ac:11:00:01
# 06:00:00:00:00:01
# 0a:11:22:33:44:55
# 0e:ff:ff:ff:ff:ff

# Avoid using globally unique (OUI-based) MACs to prevent conflicts
# Do NOT use: 00:1A:2B:3C:4D:5E (this could conflict with real hardware)
```

## Multiple Containers with Unique MACs

```bash
# Assign unique MACs to each container
podman run -d --name svc1 \
  --network app-net \
  --ip 10.50.0.11 \
  --mac-address 02:42:0a:32:00:0b \
  docker.io/library/alpine:latest tail -f /dev/null

podman run -d --name svc2 \
  --network app-net \
  --ip 10.50.0.12 \
  --mac-address 02:42:0a:32:00:0c \
  docker.io/library/alpine:latest tail -f /dev/null

# Verify MACs
for ctr in svc1 svc2; do
  mac=$(podman inspect "$ctr" --format '{{ range .NetworkSettings.Networks }}{{ .MacAddress }}{{ end }}')
  echo "$ctr: $mac"
done
```

## Inspecting Container MAC Addresses

```bash
# Get the MAC address from container inspection
podman inspect web --format '{{ range .NetworkSettings.Networks }}{{ .MacAddress }}{{ end }}'

# List all containers with their MAC addresses
podman ps --format "{{ .Names }}" | while read -r ctr; do
  mac=$(podman inspect "$ctr" --format '{{ range .NetworkSettings.Networks }}{{ .MacAddress }}{{ end }}')
  echo "$ctr: $mac"
done
```

## MAC Address Persistence

```bash
# Static MAC addresses persist across restarts
podman stop licensed-app
podman start licensed-app

podman exec licensed-app ip link show eth0
# MAC address remains the same
```

## Summary

Set static MAC addresses for Podman containers with `--mac-address` to support DHCP reservations, MAC-based licensing, and network access control. Use locally administered addresses (second hex digit is 2, 6, A, or E) to avoid conflicts with real hardware. Static MACs are especially useful with macvlan networks where containers need consistent identities on the physical network. MAC addresses persist across container restarts.
