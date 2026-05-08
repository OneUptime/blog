# How to Remove All Pods with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Cleanup, Maintenance

Description: Learn how to remove all Podman pods at once for a clean slate or environment reset.

---

> Removing all pods clears your entire pod environment, which is useful for development resets and CI/CD cleanup.

During development and testing, pods accumulate. When you need to start fresh, removing all pods at once is faster than cleaning them up individually. Podman provides a straightforward way to do this.

---

## Removing All Pods

```bash
# Remove all pods, whether running or stopped

podman pod rm --all --force

# Verify everything is gone
podman pod ls
```

The `--all` flag targets every pod on the system. The `--force` flag ensures running pods are killed before removal.

## Removing All Stopped Pods Only

```bash
# Remove only pods that are not running
podman pod ls --filter status=exited -q | xargs -r podman pod rm

# Running pods are left untouched
podman pod ls
```

## Using podman pod prune

```bash
# Prune removes all stopped pods
podman pod prune

# Confirm the prune operation
# Are you sure you want to remove all stopped pods? [y/N] y

# Force pruning running pods too
podman pod prune --force
```

## Scripted Full Cleanup

```bash
#!/bin/bash
# Remove all pods, containers, and unused resources

echo "Removing all pods..."
podman pod rm --all --force

echo "Removing any remaining containers..."
podman rm --all --force

echo "Pruning unused volumes..."
podman volume prune --force

echo "Pruning unused networks..."
podman network prune --force

echo "Cleanup complete"
podman system df
```

## Safety Check Before Removal

```bash
#!/bin/bash
# List all pods before removing them

echo "The following pods will be removed:"
podman pod ls --format "  {{.Name}} ({{.Status}}, {{.NumberOfContainers}} containers)"

read -p "Continue? [y/N] " confirm
if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
  podman pod rm --all --force
  echo "All pods removed"
else
  echo "Aborted"
fi
```

## CI/CD Cleanup Example

```bash
# In a CI pipeline, clean up after test runs
# This ensures no leftover pods from previous builds
podman pod rm --all --force 2>/dev/null || true
podman rm --all --force 2>/dev/null || true

# Now start fresh for the current build
podman pod create --name test-pod -p 8080:80
```

## Summary

Use `podman pod rm --all --force` to remove every pod on the system in one command. For a gentler approach, use `podman pod prune` to remove only stopped pods. Combine with volume and network pruning for a complete environment reset.
