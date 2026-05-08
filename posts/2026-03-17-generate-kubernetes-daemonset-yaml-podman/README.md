# How to Generate a Kubernetes DaemonSet YAML with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Kubernetes, YAML, DaemonSet

Description: Learn how to generate a Kubernetes DaemonSet manifest from a Podman container.

---

> DaemonSets ensure a pod runs on every node in a Kubernetes cluster, and Podman can generate the YAML for you.

A DaemonSet is a Kubernetes resource that runs a copy of a pod on every node (or a selected subset of nodes). This is ideal for log collectors, monitoring agents, and network plugins. Podman can generate a DaemonSet manifest from a running container, letting you develop the agent locally and export it for cluster-wide deployment.

---

## Creating a Container for DaemonSet Export

```bash
# Run a monitoring agent container locally

podman run -d --name node-exporter \
  -p 9100:9100 \
  -v /proc:/host/proc:ro \
  -v /sys:/host/sys:ro \
  docker.io/prom/node-exporter:latest \
  --path.procfs=/host/proc \
  --path.sysfs=/host/sys
```

## Generating the DaemonSet YAML

```bash
# Generate a DaemonSet manifest
podman kube generate --type daemonset node-exporter > daemonset.yaml

# View the generated file
cat daemonset.yaml
```

## Understanding the DaemonSet Structure

```yaml
# Example structure:
# apiVersion: apps/v1
# kind: DaemonSet
# metadata:
#   name: node-exporter-pod-daemonset
# spec:
#   selector:
#     matchLabels:
#       app: node-exporter-pod
#   template:
#     metadata:
#       labels:
#         app: node-exporter-pod
#     spec:
#       containers:
#         - name: node-exporter
#           image: docker.io/prom/node-exporter:latest
#           ports:
#             - containerPort: 9100
#           volumeMounts:
#             - mountPath: /host/proc
#               name: proc
#               readOnly: true
```

## Generating a DaemonSet with a Service

```bash
# Include a Service for the DaemonSet
podman kube generate --type daemonset --service node-exporter > daemonset-with-svc.yaml

# The generated Service exposes the agent through Kubernetes networking
```

## Use Case: Log Collector DaemonSet

```bash
# Run a log collector locally
podman run -d --name log-collector \
  -v /var/log:/host/logs:ro \
  -e LOG_PATH=/host/logs \
  docker.io/library/alpine \
  sh -c "tail -f /host/logs/syslog"

# Generate DaemonSet YAML
podman kube generate --type daemonset log-collector > log-collector-ds.yaml
```

## Use Case: Network Agent DaemonSet

```bash
# Run a network monitoring agent locally
podman run -d --name net-agent \
  --privileged \
  --network host \
  docker.io/library/alpine \
  sh -c "apk add --no-cache iproute2 >/dev/null && while true; do ss -tlnp > /tmp/connections.log; sleep 60; done"

# Generate the DaemonSet manifest
podman kube generate --type daemonset net-agent > net-agent-ds.yaml
```

## Applying the DaemonSet to Kubernetes

```bash
# Apply the generated DaemonSet to a cluster
kubectl apply -f daemonset.yaml

# Verify it runs on all nodes
kubectl get daemonset node-exporter-pod-daemonset

# Check pods across nodes
kubectl get pods -l app=node-exporter-pod -o wide
```

## Summary

Use `podman kube generate --type daemonset` to create a Kubernetes DaemonSet manifest from a locally running container. This is ideal for monitoring agents, log collectors, and network tools that need to run on every cluster node. Test locally with Podman, then deploy cluster-wide with `kubectl apply`.
