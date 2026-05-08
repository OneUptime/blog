# How to Play a Kubernetes DaemonSet YAML with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Kubernetes, YAML, DaemonSet

Description: Learn how to use podman play kube to run Kubernetes DaemonSet manifests locally for testing.

---

> Podman can play Kubernetes DaemonSet YAML files to test node-level agents and monitoring tools locally.

DaemonSets in Kubernetes run a pod on every node in the cluster. While Podman cannot replicate the multi-node scheduling behavior, it can create a pod from the DaemonSet's pod template on your local machine. This lets you test DaemonSet configurations, validate container images, and verify volume mounts before deploying to a cluster.

---

## Playing a Basic DaemonSet

```bash
# Create a DaemonSet YAML manifest

cat > /tmp/monitor-daemonset.yaml << 'EOF'
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-monitor
spec:
  selector:
    matchLabels:
      app: monitor
  template:
    metadata:
      labels:
        app: monitor
    spec:
      containers:
        - name: agent
          image: docker.io/library/alpine
          command: ["sh", "-c", "while true; do echo 'Collecting metrics...'; sleep 30; done"]
          ports:
            - containerPort: 9100
              hostPort: 9100
EOF

# Play the DaemonSet YAML
podman play kube /tmp/monitor-daemonset.yaml

# Podman creates a single pod from the template
podman pod ls
podman ps
```

## Playing a DaemonSet with Host Mounts

```bash
cat > /tmp/log-collector-ds.yaml << 'EOF'
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector
spec:
  selector:
    matchLabels:
      app: logs
  template:
    metadata:
      labels:
        app: logs
    spec:
      containers:
        - name: collector
          image: docker.io/library/alpine
          command: ["sh", "-c", "ls /host/logs && sleep 3600"]
          volumeMounts:
            - name: host-logs
              mountPath: /host/logs
              readOnly: true
      volumes:
        - name: host-logs
          hostPath:
            path: /var/log
            type: Directory
EOF

podman play kube /tmp/log-collector-ds.yaml

# The container has access to host logs
podman logs log-collector-pod-collector
```

## Playing a DaemonSet with Environment Variables

```bash
cat > /tmp/agent-ds.yaml << 'EOF'
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: config-agent
spec:
  selector:
    matchLabels:
      app: agent
  template:
    metadata:
      labels:
        app: agent
    spec:
      containers:
        - name: agent
          image: docker.io/library/alpine
          command: ["sh", "-c", "echo Region=$REGION Tier=$TIER && sleep 3600"]
          env:
            - name: REGION
              value: "us-east-1"
            - name: TIER
              value: "production"
            - name: COLLECT_INTERVAL
              value: "60"
EOF

podman play kube /tmp/agent-ds.yaml
podman logs config-agent-pod-agent
# Output: Region=us-east-1 Tier=production
```

## Validating Before Cluster Deployment

```bash
# Test the DaemonSet locally
podman play kube /tmp/monitor-daemonset.yaml

# Check that the container starts and runs correctly
podman ps --filter pod=node-monitor-pod
podman logs node-monitor-pod-agent

# Verify hostPort binding
podman port node-monitor-pod-agent 9100

# Once validated, deploy to Kubernetes
# kubectl apply -f /tmp/monitor-daemonset.yaml
```

## Tearing Down the DaemonSet

```bash
# Remove all resources created by play kube
podman play kube --down /tmp/monitor-daemonset.yaml

# Verify cleanup
podman pod ls
```

## Replacing an Existing DaemonSet

```bash
# Update the YAML and replace the running pod
podman play kube --replace /tmp/monitor-daemonset.yaml

# The old pod is removed and a new one is created
```

## Limitations

When playing DaemonSet YAML locally, Podman does not provide:
- Multi-node scheduling (only one pod is created locally)
- Node affinity or tolerations
- DaemonSet controller reconciliation if the pod is removed

These features are available only in a full Kubernetes cluster.

## Summary

Use `podman play kube` with Kubernetes DaemonSet YAML to test node-level agents and monitoring tools locally. Podman creates a single pod from the DaemonSet's pod template, allowing you to validate the container image, environment variables, volume mounts, and port mappings. Use `--down` to clean up and `--replace` to update running configurations.
