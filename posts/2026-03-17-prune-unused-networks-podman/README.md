# How to Prune Unused Networks with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Cleanup, Maintenance

Description: Learn how to identify and remove unused Podman networks to keep your environment clean.

---

> Pruning unused networks removes stale configuration and prevents subnet exhaustion over time.

As you create and tear down containers, networks accumulate. Unused networks consume subnet ranges from the available pool and clutter the output of `podman network ls`. Podman provides a built-in prune command to remove all networks that have no containers connected or configured to connect to them.

---

## Listing All Networks

```bash
# List all Podman networks

podman network ls

# Example output:
# NETWORK ID    NAME          DRIVER
# 2f259bab93aa  podman        bridge
# a1b2c3d4e5f6  frontend-net  bridge
# f6e5d4c3b2a1  backend-net   bridge
```

## Identifying Unused Networks

```bash
# Check which containers are connected to a specific network
podman network inspect frontend-net --format '{{.Containers}}'

# If the output is an empty map, no running containers are connected to this network
```

## Pruning All Unused Networks

```bash
# Remove all networks that are not in use by any container
podman network prune

# You will be prompted to confirm
# Are you sure you want to remove all unused networks? [y/N] y
```

## Pruning Without Confirmation

```bash
# Skip the confirmation prompt with the --force flag
podman network prune --force

# This is useful in scripts and CI/CD pipelines
```

## Filtering Networks Before Pruning

```bash
# List networks with no containers attached
podman network ls --filter dangling=true --format '{{.Name}}' | while IFS= read -r net; do
  if [ "$net" != "podman" ]; then
    echo "Unused: $net"
  fi
done
```

## Protecting the Default Network

The default `podman` network is never removed by prune. It is always preserved as the fallback bridge network.

```bash
# The default network remains after pruning
podman network prune --force
podman network ls
# The 'podman' network will still be listed
```

## Automating Network Cleanup

```bash
# Add network pruning to a cron job or systemd timer
# Example: prune unused networks every Sunday at midnight
# Add to crontab:
# 0 0 * * 0 podman network prune --force >> /var/log/podman-prune.log 2>&1
```

## Summary

Running `podman network prune` regularly removes networks that no container is using. This frees subnet ranges, reduces clutter, and keeps your Podman environment organized. Use `--force` to skip confirmation in automated workflows.
