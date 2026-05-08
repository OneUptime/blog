# How to Create a Pod with a Custom Name in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Configuration

Description: Learn how to create Podman pods with custom names for better organization and easier management.

---

> Naming your pods makes them easier to reference in scripts, logs, and management commands.

By default, Podman assigns a random name to a new pod. For production use, scripts, and any scenario where you need to reference the pod reliably, assigning a custom name at creation time is essential. Named pods are easier to manage, inspect, and tear down.

---

## Creating a Pod with a Custom Name

```bash
# Create a pod with a descriptive name

podman pod create --name my-web-app

# Verify the pod name
podman pod ls
```

## Naming Conventions

Good pod names are lowercase, use hyphens as separators, and describe the workload.

```bash
# Examples of well-named pods
podman pod create --name frontend-prod
podman pod create --name backend-staging
podman pod create --name monitoring-stack
podman pod create --name redis-cluster-node1
```

## Using the Pod Name in Commands

```bash
# Create a named pod
podman pod create --name app-stack -p 8080:80

# Reference the pod by name when adding containers
podman run -d --pod app-stack --name web docker.io/library/nginx:alpine
podman run -d --pod app-stack --name cache docker.io/library/redis:7-alpine

# Manage the pod by name
podman pod stop app-stack
podman pod start app-stack
podman pod inspect app-stack
podman pod rm app-stack
```

## Checking for Name Conflicts

```bash
# Attempting to create a pod with a name that already exists will fail
podman pod create --name my-pod
podman pod create --name my-pod
# Error: pod name my-pod is already in use

# Check if a pod name exists before creating
if ! podman pod exists my-pod 2>/dev/null; then
  podman pod create --name my-pod
  echo "Pod created"
else
  echo "Pod already exists"
fi
```

## Replacing an Existing Pod

```bash
# Use the --replace flag to recreate a pod with the same name
podman pod create --name my-pod --replace

# This removes the old pod and creates a new one
```

## Renaming Is Not Supported

Podman does not support renaming pods after creation. If you need a different name, remove the pod and create a new one.

```bash
# Remove the old pod and create with a new name
podman pod stop old-name
podman pod rm old-name
podman pod create --name new-name
```

## Summary

Always create pods with the `--name` flag for predictable references in scripts and management commands. Use descriptive, lowercase names with hyphens. Check for name conflicts with `podman pod exists` or use `--replace` to overwrite an existing pod.
