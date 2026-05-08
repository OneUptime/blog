# How to Inspect a Network with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Inspection, Debugging

Description: Learn how to inspect Podman networks to view configuration details including subnets, gateways, and connected containers.

---

> Inspecting networks reveals their full configuration including IP ranges, DNS settings, connected containers, and driver options essential for debugging connectivity issues.

The `podman network inspect` command provides detailed information about a network's configuration. This is invaluable for troubleshooting, verifying settings, and understanding your container networking topology.

---

## Basic Network Inspection

```bash
# Inspect a network by name

podman network inspect mynetwork

# Inspect the default network
podman network inspect podman
```

## Extracting Specific Fields

```bash
# Get the subnet
podman network inspect mynetwork --format '{{ range .Subnets }}{{ .Subnet }}{{ end }}'

# Get the gateway
podman network inspect mynetwork --format '{{ range .Subnets }}{{ .Gateway }}{{ end }}'

# Get the driver
podman network inspect mynetwork --format '{{ .Driver }}'

# Check if DNS is enabled
podman network inspect mynetwork --format '{{ .DNSEnabled }}'

# Check if the network is internal
podman network inspect mynetwork --format '{{ .Internal }}'
```

## Viewing the Full JSON Output

```bash
# Pretty-printed JSON output
podman network inspect mynetwork | python3 -m json.tool

# Get the network ID
podman network inspect mynetwork --format '{{ .ID }}'

# Get creation timestamp
podman network inspect mynetwork --format '{{ .Created }}'
```

## Checking Connected Containers

```bash
# List containers connected to a network
podman ps --filter network=mynetwork --format "{{ .Names }}\t{{ .ID }}"

# Get container IP addresses on the network
NET="mynetwork"
for ctr in $(podman ps --filter network="$NET" --format "{{ .Names }}"); do
  ip=$(podman inspect "$ctr" --format "{{ with index .NetworkSettings.Networks \"$NET\" }}{{ .IPAddress }}{{ end }}")
  echo "$ctr: $ip"
done
```

## Inspecting Network Options

```bash
# View all network options and labels
podman network inspect mynetwork --format '{{ json .Options }}'

# Check network labels
podman network inspect mynetwork --format '{{ json .Labels }}'

# View IPv6 configuration
podman network inspect mynetwork --format '{{ .IPv6Enabled }}'
```

## Inspecting Multiple Networks

```bash
# Inspect multiple networks by name
podman network inspect frontend backend

# Compare two networks
echo "=== frontend ==="
podman network inspect frontend --format 'Subnet: {{ range .Subnets }}{{ .Subnet }}{{ end }} | DNS: {{ .DNSEnabled }}'
echo "=== backend ==="
podman network inspect backend --format 'Subnet: {{ range .Subnets }}{{ .Subnet }}{{ end }} | DNS: {{ .DNSEnabled }}'
```

## Using Inspect for Troubleshooting

```bash
# Full network diagnostic
NET="mynetwork"
echo "Network: $NET"
echo "Driver: $(podman network inspect $NET --format '{{ .Driver }}')"
echo "Subnet: $(podman network inspect $NET --format '{{ range .Subnets }}{{ .Subnet }}{{ end }}')"
echo "Gateway: $(podman network inspect $NET --format '{{ range .Subnets }}{{ .Gateway }}{{ end }}')"
echo "DNS: $(podman network inspect $NET --format '{{ .DNSEnabled }}')"
echo "Internal: $(podman network inspect $NET --format '{{ .Internal }}')"
echo "Connected containers:"
podman ps --filter network="$NET" --format "  - {{ .Names }} ({{ .ID }})"
```

## Summary

Use `podman network inspect` to view detailed network configuration including subnets, gateways, DNS settings, and driver options. Apply Go template formatting with `--format` to extract specific fields for scripting and troubleshooting. Combine network inspection with container inspection to understand the complete networking topology and diagnose connectivity issues.
