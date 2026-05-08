# How to Disconnect a Container from a Network with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Isolation

Description: Learn how to disconnect containers from Podman networks to change network topology or isolate services.

---

> Disconnecting containers from networks lets you dynamically adjust your network topology, isolate misbehaving services, or move containers between network segments.

The `podman network disconnect` command removes a container from a network without stopping it. This is useful for network reconfiguration, security isolation, and maintenance scenarios.

---

## Disconnecting a Container from a Network

```bash
# Disconnect a container from a specific network

podman network disconnect mynetwork webapp

# Verify the container is no longer on the network
podman inspect webapp --format '{{ range $k, $v := .NetworkSettings.Networks }}{{ $k }}{{ printf "\n" }}{{ end }}'
```

## Disconnect and Reconnect Workflow

```bash
# Move a container from one network to another
podman network disconnect old-network api-server
podman network connect new-network api-server

# Verify the change
podman inspect api-server --format '{{ range $k, $v := .NetworkSettings.Networks }}{{ $k }}: {{ $v.IPAddress }}{{ printf "\n" }}{{ end }}'
```

## Force Disconnecting

```bash
# Force the container to disconnect from the network
podman network disconnect --force backend api-server
```

## Isolating a Compromised Container

If a container is behaving unexpectedly, you can isolate it by disconnecting from all networks:

```bash
# List the container's current networks
podman inspect suspicious-container \
  --format '{{ range $k, $v := .NetworkSettings.Networks }}{{ $k }}{{ printf "\n" }}{{ end }}'

# Disconnect from all networks
for net in $(podman inspect suspicious-container \
  --format '{{ range $k, $v := .NetworkSettings.Networks }}{{ $k }}{{ printf "\n" }}{{ end }}'); do
  podman network disconnect "$net" suspicious-container
  echo "Disconnected from: $net"
done

# The container is now network-isolated but still running
podman exec suspicious-container ping -c 1 8.8.8.8
# ping: Network unreachable
```

## Removing a Network Segment

When decommissioning a network, disconnect all containers first:

```bash
# Find all containers on the network
podman ps -a --filter network=staging --format "{{ .Names }}"

# Disconnect each container
for ctr in $(podman ps -a --filter network=staging --format "{{ .Names }}"); do
  podman network disconnect staging "$ctr"
  echo "Disconnected: $ctr"
done

# Now safely remove the network
podman network rm staging
```

## Verifying Disconnection

```bash
# Check the container's network interfaces
podman exec webapp ip addr show

# Test that the container cannot reach other containers on the old network
podman exec webapp ping -c 1 backend-service
# ping: Name or service not known

# Confirm the network no longer lists the container
podman ps -a --filter network=mynetwork --format "{{ .Names }}"
```

## Summary

Disconnect containers from Podman networks using `podman network disconnect` to dynamically adjust network topology. Use this for moving containers between networks, isolating suspicious services, or decommissioning network segments. Force disconnect with `--force` when needed, and always verify the change by inspecting the container's network configuration afterward.
