# How to Remove a Network with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Cleanup

Description: Learn how to remove Podman networks safely, including handling containers that are still connected.

---

> Removing unused networks keeps your Podman environment clean and prevents IP address conflicts. Always disconnect containers before removing their network.

Over time, you may accumulate networks that are no longer needed. Podman provides commands to remove individual networks or prune all unused ones. This guide covers safe network removal practices.

---

## Removing a Single Network

```bash
# Remove a network by name

podman network rm mynetwork

# Remove a network by ID
podman network rm 8a3c2f1e4b5d

# Remove multiple networks at once
podman network rm frontend backend staging
```

## Handling Networks with Connected Containers

Podman will not remove a network that has containers or pods connected or configured to use it:

```bash
# This will fail if containers are attached
podman network rm mynetwork
# Error: unable to remove network: containers are using network

# First, find connected containers
podman ps -a --filter network=mynetwork --format "{{ .Names }}"

# Disconnect the containers
podman network disconnect mynetwork webapp
podman network disconnect mynetwork api

# Now remove the network
podman network rm mynetwork
```

## Force Removing a Network

```bash
# Force removal stops and removes containers that use the network
podman network rm --force mynetwork

# This is equivalent to removing the associated containers and then removing the network
```

## Pruning Unused Networks

```bash
# Remove all networks not used by any container
podman network prune

# Prune with confirmation prompt
podman network prune
# WARNING! This will remove all networks not used by at least one container.
# Are you sure you want to continue? [y/N]

# Skip confirmation
podman network prune -f
```

## Removing Networks with Filters

```bash
# Remove networks by label
podman network ls --filter label=environment=test --format "{{ .Name }}" | \
  xargs podman network rm

# Remove networks created more than 24 hours ago
podman network ls --filter until=24h --format "{{ .Name }}" | while read -r net; do
  if [ "$net" != "podman" ]; then
    podman network rm "$net" 2>/dev/null && echo "Removed: $net"
  fi
done
```

## Safe Removal Workflow

```bash
# Step 1: List all networks
podman network ls

# Step 2: Check which are unused
for net in $(podman network ls --format "{{ .Name }}"); do
  count=$(podman ps -a --filter network="$net" --format "{{ .Names }}" | wc -l)
  echo "$net: $count containers"
done

# Step 3: Remove specific unused networks
podman network rm unused-network-1 unused-network-2

# Step 4: Verify removal
podman network ls
```

## Protecting the Default Network

```bash
# The default "podman" network cannot be removed
podman network rm podman
# Error: default network podman cannot be removed

# Only custom networks can be removed
podman network ls --format "{{ .Name }}" | grep -v "^podman$"
```

## Summary

Remove Podman networks with `podman network rm` for specific networks or `podman network prune` for bulk cleanup of unused networks. Always disconnect or remove containers before removing their network, or use `--force` to handle this automatically. The default podman network cannot be removed. Regular network pruning keeps your environment clean and avoids IP range conflicts.
