# How to Clone a Pod with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Cloning

Description: Learn how to clone a Podman pod to create a duplicate with the same configuration.

---

> Cloning a pod lets you replicate its configuration for testing, scaling, or creating parallel environments.

Podman provides the `podman pod clone` command to create a copy of an existing pod with its configuration and containers. The cloned pod gets the same network settings, port mappings, and namespace sharing as the original unless you override supported pod details such as the name or resource limits. This is useful for creating staging copies, running parallel tests, or scaling workloads.

---

## Cloning a Pod

```bash
# Create a source pod

podman pod create --name original-pod -p 8080:80
podman run -d --pod original-pod --name web docker.io/library/nginx:alpine

# Clone the pod
podman pod clone original-pod

# The cloned pod gets the default name original-pod-clone
podman pod ls
```

## Cloning with a Custom Name

```bash
# Clone and assign a specific name
podman pod clone --name cloned-pod original-pod

# Verify the clone
podman pod ls --format "table {{.Name}}\t{{.Status}}\t{{.NumberOfContainers}}"
```

## Cloning with Resource Overrides

```bash
# Clone but override the CPU limit
podman pod clone --name staging-pod --cpus=2 original-pod

# Inspect the cloned pod
podman pod inspect staging-pod
```

## Adding Containers to the Cloned Pod

```bash
# The cloned pod already includes cloned copies of the original containers.
# Add another container to it if needed.
podman run -d --pod cloned-pod --name cache-clone docker.io/library/redis:7-alpine

# Verify containers in the clone
podman ps -a --filter pod=cloned-pod
```

## Cloning for Parallel Tests

```bash
# Create version A
podman pod create --name app-v1
podman run -d --pod app-v1 --name web-v1 docker.io/library/nginx:1.24-alpine

# Clone the pod for a parallel test copy
podman pod clone --name app-v2 app-v1
podman pod start app-v2

# Both pods can run simultaneously when their configuration does not conflict
podman pod ls --format "table {{.Name}}\t{{.Status}}\t{{.NumberOfContainers}}"
```

## Comparing Original and Clone

```bash
# Inspect both pods to compare configuration
diff <(podman pod inspect original-pod | jq '.InfraConfig') \
     <(podman pod inspect cloned-pod | jq '.InfraConfig')
```

## Summary

Use `podman pod clone` to create a copy of a pod with the same configuration and containers. Assign a custom name with `--name` and override supported pod details such as resource limits as needed. Cloned containers are created from the original configuration, and you can start them with `podman pod start` or clone with `--start`. This is valuable for creating parallel environments, testing, and staging deployments.
