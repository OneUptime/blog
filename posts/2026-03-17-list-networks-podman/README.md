# How to List Networks with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, CLI

Description: Learn how to list and filter Podman networks to view available network configurations.

---

> Listing networks helps you understand your container networking setup, identify available networks, and find unused networks for cleanup.

Podman provides the `podman network ls` command to list all configured networks. With formatting and filtering options, you can quickly find the network information you need.

---

## Basic Network Listing

```bash
# List all networks

podman network ls

# Example output:
# NETWORK ID    NAME        DRIVER
# 2f259bab93aa  podman      bridge
# 8a3c2f1e4b5d  mynetwork   bridge
# 1b4e7c9d2a3f  backend     bridge
```

## Formatting Output

```bash
# Custom format output
podman network ls --format "{{ .Name }}\t{{ .Driver }}\t{{ .ID }}"

# JSON output for scripting
podman network ls --format json

# Show only network names
podman network ls --format "{{ .Name }}"

# Table format with specific columns
podman network ls --format "table {{ .Name }}\t{{ .Driver }}\t{{ .Created }}"
```

## Filtering Networks

```bash
# Filter by driver type
podman network ls --filter driver=bridge

# Filter by network name
podman network ls --filter name=mynetwork

# Filter by ID
podman network ls --filter id=2f259bab

# Filter by label
podman network ls --filter label=environment=production
```

## Listing Networks with Details

```bash
# Get detailed information about all networks
for net in $(podman network ls --format "{{ .Name }}"); do
  echo "=== $net ==="
  podman network inspect "$net" --format \
    "Driver: {{ .Driver }}
Subnets: {{ range .Subnets }}{{ .Subnet }} {{ end }}
Internal: {{ .Internal }}
DNS: {{ .DNSEnabled }}"
  echo ""
done
```

## Checking Which Containers Use a Network

```bash
# List containers on a specific network
podman ps --filter network=mynetwork

# Show all running containers with their network assignments
podman ps --format "{{ .Names }}\t{{ .Networks }}"
```

## Finding Unused Networks

```bash
# List networks not used by any container
podman network ls --format "{{ .Name }}" | while read -r net; do
  count=$(podman ps -a --filter network="$net" --format "{{ .Names }}" | wc -l)
  if [ "$count" -eq 0 ] && [ "$net" != "podman" ]; then
    echo "Unused: $net"
  fi
done
```

## Quiet Mode for Scripting

```bash
# Output only network names
podman network ls -q

# Use in scripts to iterate over all networks
for net in $(podman network ls -q); do
  podman network inspect "$net" --format "{{ .Name }}: {{ .Driver }}"
done

# Count total networks
podman network ls -q | wc -l
```

## Summary

Use `podman network ls` to view all configured networks. Apply `--format` for custom output layouts, `--filter` to narrow results by driver, name, or label, and `-q` for script-friendly name-only output. Combine with `podman network inspect` and `podman ps --filter network=` to understand the full networking topology of your container environment.
