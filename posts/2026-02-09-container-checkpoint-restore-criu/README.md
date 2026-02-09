# How to Implement Container Checkpoint and Restore with CRIU on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CRIU, Container Migration

Description: Learn how to implement container checkpoint and restore using CRIU in Kubernetes for seamless container migration, faster startup times, and improved disaster recovery.

---

Checkpoint and restore functionality enables you to freeze a running container, save its complete state to disk, and later restore it exactly where it left off. CRIU (Checkpoint/Restore In Userspace) brings this capability to Linux containers, opening possibilities for live migration, fast startup from saved states, and novel debugging approaches.

In Kubernetes environments, checkpoint and restore improves workload mobility, reduces downtime during node maintenance, and accelerates container startup by bypassing initialization code. This guide demonstrates implementing CRIU-based checkpoint and restore for Kubernetes workloads.

## Understanding CRIU and Container State Management

CRIU captures everything about a running process including memory contents, open files, network connections, and process tree structure. The checkpoint creates a collection of image files representing the complete container state at a specific moment.

Unlike traditional container stop and start operations that reinitialize applications from scratch, restore brings containers back to their exact previous state. Applications continue from the instruction they were executing when checkpointed. Open database connections remain valid, in-flight transactions continue, and cached data persists in memory.

This fundamentally changes how you think about container lifecycle management. Instead of stateless containers that must reinitialize on every restart, you gain the ability to pause and resume containers like virtual machines.

## Installing CRIU on Kubernetes Nodes

CRIU must be installed on every node where you want to perform checkpoints or restores. Most modern distributions include CRIU in their package repositories.

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y criu

# RHEL/CentOS
sudo yum install -y criu

# Verify installation and kernel support
sudo criu check
sudo criu check --all
```

The check command validates that your kernel includes the necessary features for checkpointing. If checks fail, you may need to upgrade your kernel or enable specific kernel options.

```bash
# Check kernel version (CRIU requires 3.11 or later)
uname -r

# Verify required kernel features
grep CONFIG_CHECKPOINT_RESTORE /boot/config-$(uname -r)
```

## Configuring containerd for Checkpoint Support

Containerd needs explicit configuration to enable checkpoint and restore functionality. Edit `/etc/containerd/config.toml` to add checkpoint support.

```toml
version = 2

[plugins."io.containerd.grpc.v1.cri"]
  enable_cdi = true

[plugins."io.containerd.grpc.v1.cri".containerd]
  default_runtime_name = "runc"

[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
  runtime_type = "io.containerd.runc.v2"
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
    SystemdCgroup = true
    BinaryName = "/usr/local/sbin/runc"
```

Ensure you're using a recent version of runc that supports checkpoint operations.

```bash
# Check runc version
runc --version
# runc version 1.1.0 or later is required

# Restart containerd
sudo systemctl restart containerd
```

## Performing Manual Container Checkpoints

Before implementing Kubernetes automation, understand the basic checkpoint and restore workflow using crictl and runc directly.

```bash
# List running containers
sudo crictl ps

# Get container ID for checkpoint
CONTAINER_ID=$(sudo crictl ps --name nginx -q)

# Create checkpoint directory
sudo mkdir -p /var/lib/containerd/checkpoints

# Checkpoint the container
sudo runc --root /run/containerd/runc/k8s.io checkpoint \
  --image-path /var/lib/containerd/checkpoints/${CONTAINER_ID} \
  ${CONTAINER_ID}

# Verify checkpoint files were created
ls -lh /var/lib/containerd/checkpoints/${CONTAINER_ID}/
# Should see files like: core.img, pagemap.img, pages.img, etc.
```

The checkpoint captures all container state. Memory pages go into pages.img, while metadata about open files and network sockets goes into descriptors and other files.

## Restoring Containers from Checkpoints

Restoring a container brings it back to the exact state it was in when checkpointed.

```bash
# Stop the original container first
sudo crictl stop ${CONTAINER_ID}
sudo crictl rm ${CONTAINER_ID}

# Restore from checkpoint
sudo runc --root /run/containerd/runc/k8s.io restore \
  --image-path /var/lib/containerd/checkpoints/${CONTAINER_ID} \
  --bundle /run/containerd/io.containerd.runtime.v2.task/k8s.io/${CONTAINER_ID} \
  ${CONTAINER_ID}

# Verify container is running
sudo crictl ps | grep ${CONTAINER_ID}
```

Applications resume execution from where they were checkpointed. Network connections and file handles remain open, and memory contents are exactly as they were.

## Implementing Kubernetes Checkpoint Automation

Create a Kubernetes DaemonSet that automates container checkpoints for critical workloads. This example uses a simple shell script, but production implementations should use proper operators.

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: checkpoint-agent
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: checkpoint-agent
  template:
    metadata:
      labels:
        app: checkpoint-agent
    spec:
      hostPID: true
      hostNetwork: true
      containers:
      - name: agent
        image: alpine:latest
        command:
        - /bin/sh
        - -c
        - |
          apk add --no-cache criu
          while true; do
            # Checkpoint logic here
            sleep 300
          done
        securityContext:
          privileged: true
        volumeMounts:
        - name: containerd-root
          mountPath: /run/containerd
        - name: checkpoints
          mountPath: /var/lib/containerd/checkpoints
        - name: runc-root
          mountPath: /run/runc
      volumes:
      - name: containerd-root
        hostPath:
          path: /run/containerd
      - name: checkpoints
        hostPath:
          path: /var/lib/containerd/checkpoints
      - name: runc-root
        hostPath:
          path: /run/runc
```

## Using Kubernetes Forensic Container Checkpointing

Kubernetes 1.25 introduced built-in forensic container checkpointing as an alpha feature. This enables checkpoint creation via kubectl without manual runc commands.

Enable the feature gate on your cluster. For kubeadm clusters, add to the kubelet configuration.

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
featureGates:
  ContainerCheckpoint: true
```

Restart kubelet on all nodes.

```bash
sudo systemctl restart kubelet
```

Create a checkpoint using kubectl.

```bash
# Checkpoint a container
kubectl checkpoint create pod-name container-name

# Checkpoints are stored at /var/lib/kubelet/checkpoints/ by default
sudo ls -lh /var/lib/kubelet/checkpoints/

# Copy checkpoint to another node for restore
sudo scp -r /var/lib/kubelet/checkpoints/checkpoint-pod-name_container-name_* \
  node-2:/var/lib/kubelet/checkpoints/
```

## Implementing Pre-Initialized Container Images

One powerful use case for CRIU is creating pre-initialized container images. Instead of running initialization code on every container start, initialize once, checkpoint, and restore from that state.

```bash
# Start a container with expensive initialization
docker run -d --name init-demo myapp:latest

# Wait for initialization to complete
sleep 30

# Checkpoint the initialized container
sudo runc checkpoint --image-path /tmp/init-checkpoint init-demo

# Create a new container image including the checkpoint
cat > Dockerfile.checkpoint <<EOF
FROM myapp:latest
COPY init-checkpoint /var/lib/checkpoint/
EOF

docker build -t myapp:pre-initialized -f Dockerfile.checkpoint .

# Push to registry
docker push myregistry.io/myapp:pre-initialized
```

Containers using the pre-initialized image start in milliseconds instead of waiting for initialization code to run.

## Migrating Containers Between Nodes

Live migration moves running containers between nodes without stopping applications. This enables zero-downtime node maintenance.

```bash
# On source node, checkpoint the container
SOURCE_NODE="node-1"
TARGET_NODE="node-2"
POD_NAME="my-app-xyz"
CONTAINER_ID=$(ssh ${SOURCE_NODE} "sudo crictl ps --name ${POD_NAME} -q")

# Create checkpoint
ssh ${SOURCE_NODE} "sudo runc checkpoint \
  --image-path /tmp/migration-${CONTAINER_ID} ${CONTAINER_ID}"

# Transfer checkpoint to target node
ssh ${SOURCE_NODE} "sudo tar -czf /tmp/checkpoint.tar.gz /tmp/migration-${CONTAINER_ID}"
scp ${SOURCE_NODE}:/tmp/checkpoint.tar.gz ${TARGET_NODE}:/tmp/
ssh ${TARGET_NODE} "sudo tar -xzf /tmp/checkpoint.tar.gz -C /"

# Restore on target node
ssh ${TARGET_NODE} "sudo runc restore \
  --image-path /tmp/migration-${CONTAINER_ID} \
  --bundle /run/containerd/io.containerd.runtime.v2.task/k8s.io/${CONTAINER_ID} \
  ${CONTAINER_ID}"
```

For production migrations, use tools like Kubernetes operators that handle pod scheduling, network reconfiguration, and storage migration automatically.

## Handling Checkpoint Limitations

CRIU cannot checkpoint all container states. Certain system resources don't serialize cleanly.

```bash
# Check if a container is checkpointable
sudo criu check --pid $(pidof process-name)

# Common limitations:
# - External network connections (TCP sockets to external hosts)
# - GPU resources
# - Hardware devices
# - Time-sensitive operations
```

For containers with external connections, implement application-level session management that can handle connection re-establishment after restore.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: checkpointable-app
  annotations:
    checkpoint.kubernetes.io/strategy: "graceful"
spec:
  containers:
  - name: app
    image: myapp:latest
    env:
    - name: ENABLE_SESSION_PERSISTENCE
      value: "true"
    - name: RECONNECT_ON_RESTORE
      value: "true"
```

## Monitoring Checkpoint Performance

Track checkpoint and restore times to understand performance characteristics and identify bottlenecks.

```bash
# Benchmark checkpoint time
time sudo runc checkpoint --image-path /tmp/checkpoint ${CONTAINER_ID}

# Check checkpoint size
du -sh /tmp/checkpoint

# Benchmark restore time
time sudo runc restore --image-path /tmp/checkpoint ${CONTAINER_ID}
```

Checkpoint time correlates with container memory usage. A container using 1GB of RAM typically checkpoints in 1-2 seconds, while restore takes slightly less time.

For large containers, implement incremental checkpoints that only save changed memory pages.

```bash
# First checkpoint (full)
sudo runc checkpoint --image-path /tmp/checkpoint-1 ${CONTAINER_ID}

# Second checkpoint (incremental)
sudo runc checkpoint --image-path /tmp/checkpoint-2 \
  --parent-path /tmp/checkpoint-1 ${CONTAINER_ID}
```

CRIU-based checkpoint and restore transforms container lifecycle management in Kubernetes. Whether migrating workloads between nodes, implementing fast startup from pre-initialized states, or enabling novel debugging workflows, checkpoint and restore capabilities provide powerful tools for managing containerized applications. As the feature matures and Kubernetes integration improves, expect checkpoint and restore to become standard practice for production clusters.
