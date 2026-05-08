# How to Configure Pod Exit Policy in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Lifecycle, Configuration

Description: Learn how to configure the exit policy for Podman pods to control what happens when containers stop.

---

> The pod exit policy determines whether a pod stays running or stops when its containers exit.

When all non-infra containers in a pod exit, the pod can either continue running with just the infra container or stop automatically. The exit policy controls this behavior and is useful for batch jobs that should stop their pod when finished versus long-running services that should stay available.

---

## Default Exit Policy

```bash
# By default, the pod continues running even if all containers exit

podman pod create --name default-pod

podman run --pod default-pod --name task docker.io/library/alpine echo "done"

# The pod is still running (infra container is alive)
podman pod ls --filter name=default-pod
# STATUS: Running
```

## Setting the Exit Policy to Stop

```bash
# Create a pod that stops when all containers exit
podman pod create --name auto-stop-pod --exit-policy stop

# Run a short-lived container
podman run --pod auto-stop-pod --name job docker.io/library/alpine echo "job complete"

# Wait a moment, then check the pod status
sleep 2
podman pod ls --filter name=auto-stop-pod
# STATUS: Exited - the pod stopped automatically
```

## Setting the Exit Policy to Continue

```bash
# Explicitly set the pod to continue running (the default behavior)
podman pod create --name keep-alive-pod --exit-policy continue

# Even after the container exits, the pod stays running
podman run --pod keep-alive-pod docker.io/library/alpine echo "task done"
podman pod ls --filter name=keep-alive-pod
# STATUS: Running
```

## Use Case: Batch Processing Pod

```bash
# Create a pod for a batch job that stops when it finishes
podman pod create --name batch-pod --exit-policy stop

# Run the batch processing container
podman run --pod batch-pod --name processor docker.io/library/alpine \
  sh -c "echo 'Processing data...' && sleep 5 && echo 'Done'"

# The pod stops automatically when the processor finishes
sleep 7
podman pod ls --filter name=batch-pod
```

## Use Case: Service Pod That Waits for New Containers

```bash
# Create a service pod that stays alive for new containers to join
podman pod create --name service-pod --exit-policy continue -p 8080:80

# Run a web server
podman run -d --pod service-pod --name web docker.io/library/nginx:alpine

# Stop the web server for maintenance
podman stop web
podman rm web

# The pod is still running, ready for a new container
podman pod ls --filter name=service-pod
# STATUS: Running

# Deploy a new version
podman run -d --pod service-pod --name web docker.io/library/nginx:alpine
```

## Checking a Pod's Exit Policy

```bash
# Inspect the pod's exit policy
podman pod inspect auto-stop-pod --format '{{.ExitPolicy}}'
```

## Summary

The pod exit policy controls whether a pod stops when all its containers exit. Use `--exit-policy stop` for batch jobs and one-shot tasks that should stop automatically. Use `--exit-policy continue` (the default) for service pods that should remain available for new containers to join.
