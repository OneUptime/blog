# How to List Pods with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Management

Description: Learn how to list and filter Podman pods to get an overview of your running workloads.

---

> The podman pod ls command gives you a quick overview of all pods, their status, and container counts.

Keeping track of pods is essential for managing containerized workloads. Podman provides the `podman pod ls` command with various formatting and filtering options to help you see exactly what is running on your system.

---

## Listing All Pods

```bash
# List all pods on the system

podman pod ls

# Example output:
# POD ID        NAME        STATUS   CREATED        INFRA ID      # OF CONTAINERS
# a1b2c3d4e5f6  web-pod     Running  5 minutes ago  f6e5d4c3b2a1  3
# d4e5f6a1b2c3  db-pod      Running  2 hours ago    c3b2a1d4e5f6  2
```

## Using Custom Format Output

```bash
# Show only pod names and their status
podman pod ls --format "{{.Name}}\t{{.Status}}"

# Show pod name, number of containers, and creation time
podman pod ls --format "table {{.Name}}\t{{.NumberOfContainers}}\t{{.Created}}"
```

## Filtering Pods

```bash
# List only running pods
podman pod ls --filter status=running

# List only stopped pods
podman pod ls --filter status=stopped

# Filter by pod name
podman pod ls --filter name=web
```

## Getting Pod IDs Only

```bash
# List only pod IDs (useful for scripting)
podman pod ls -q

# Use in a loop to inspect all pods
for pod_id in $(podman pod ls -q); do
  echo "Pod: $(podman pod inspect "$pod_id" --format '{{.Name}}')"
done
```

## Showing Detailed Information

```bash
# Include container details for each pod
podman pod ls --ctr-names

# Include container IDs
podman pod ls --ctr-ids

# Include container status
podman pod ls --ctr-status
```

## JSON Output for Automation

```bash
# Get pod list as JSON for programmatic parsing
podman pod ls --format json

# Pipe to jq for specific fields
podman pod ls --format json | jq '.[].Name'
```

## Sorting and Counting

```bash
# Count the total number of pods
podman pod ls -q | wc -l

# Count running pods
podman pod ls --filter status=running -q | wc -l
```

## Summary

Use `podman pod ls` to view all pods on your system. Customize the output with `--format`, narrow results with `--filter`, and get machine-readable output with `--format json`. These options make it easy to monitor pods in both interactive and scripted workflows.
