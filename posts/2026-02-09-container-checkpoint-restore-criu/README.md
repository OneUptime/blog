# How to Implement Container Checkpoint and Restore with CRIU on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CRIU, Container Migration

Description: Learn how to implement container checkpoint and restore using CRIU in Kubernetes for seamless container migration, faster startup times, and improved disaster recovery.

---

Checkpoint and restore functionality enables you to freeze a running container, save its complete state to disk, and later restore it exactly where it left off. CRIU (Checkpoint/Restore In Userspace) brings this capability to Linux containers, opening possibilities for live migration, fast startup from saved states, and novel debugging approaches.

In Kubernetes environments, checkpoint and restore improves workload mobility, reduces downtime during node maintenance, and accelerates container startup by bypassing initialization code. This guide demonstrates implementing CRIU-based checkpoint and restore for Kubernetes workloads.

## Understanding CRIU and Container State Management

CRIU captures everything about a running process including memory contents, open files, network connections, and process tree structure. The checkpoint creates a collection of image files representing the complete container state at a specific moment.

Unlike traditional container stop and start operations that reinitialize applications from scratch, restore brings containers back to their exact previous state. Applications continue from the instruction they were executing when checkpointed. Cached data persists in memory, and local file handles can be restored when the same files are available. Network connections require special runtime and CRIU options and may still need application-level reconnection logic.

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
sudo criu check --extra
```

The check command validates that your kernel includes the necessary features for checkpointing. If checks fail, you may need to upgrade your kernel or enable specific kernel options.

```bash
# Check kernel version (CRIU requires 3.11 or later)
uname -r

# Verify required kernel features
grep CONFIG_CHECKPOINT_RESTORE /boot/config-$(uname -r)
```

## Configuring containerd for Checkpoint Support

Containerd's CRI plugin must be backed by a runtime that implements checkpoint operations, such as a recent runc or crun build with CRIU installed on the node. There is no separate `enable_checkpoint` switch in containerd's CRI configuration, but you should verify that Kubernetes is using the expected OCI runtime.

```toml
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

Before implementing Kubernetes automation, understand the basic checkpoint and restore workflow using containerd directly. These `ctr` commands are useful for node-level testing, but `ctr` is an administrative/debug client and restored containers are not automatically managed as Kubernetes Pods.

```bash
# List containerd containers in the Kubernetes namespace
sudo ctr --namespace k8s.io containers list

# Pick the containerd container ID for the workload
CONTAINER_ID="your-containerd-container-id"

# Checkpoint the container and its writable layer
sudo ctr --namespace k8s.io containers checkpoint \
  --rw --task ${CONTAINER_ID} checkpoint/${CONTAINER_ID}:cr-1

# Verify the checkpoint image was registered
sudo ctr --namespace k8s.io images list 'name==checkpoint/'${CONTAINER_ID}':cr-1'
```

The checkpoint captures the process state and, with `--rw`, the container's writable filesystem changes. The image content includes CRIU data such as memory pages and metadata for files, namespaces, and other process resources.

## Restoring Containers from Checkpoints

Restoring a checkpoint creates a new container from the checkpoint image. When you restore through containerd directly, Kubernetes does not know about the restored container, so use this flow for controlled tests or tooling that also updates scheduling, networking, and ownership.

```bash
# Restore from checkpoint with a new container ID
RESTORED_ID="${CONTAINER_ID}-restored"
sudo ctr --namespace k8s.io containers restore \
  --rw --live ${RESTORED_ID} checkpoint/${CONTAINER_ID}:cr-1

# Verify container is running
sudo ctr --namespace k8s.io tasks list | grep ${RESTORED_ID}
```

Applications resume execution from where they were checkpointed. Memory contents are restored, and file handles can be restored when the same backing files are available. Established network connections require the runtime to use CRIU's TCP restore options and are still fragile across node moves.

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
          apk add --no-cache curl
          while true; do
            # Call the kubelet checkpoint API for selected Pods on this node
            sleep 300
          done
        securityContext:
          privileged: true
        volumeMounts:
        - name: containerd-root
          mountPath: /run/containerd
        - name: kubelet-checkpoints
          mountPath: /var/lib/kubelet/checkpoints
        - name: kubelet-pki
          mountPath: /var/lib/kubelet/pki
          readOnly: true
      volumes:
      - name: containerd-root
        hostPath:
          path: /run/containerd
      - name: kubelet-checkpoints
        hostPath:
          path: /var/lib/kubelet/checkpoints
      - name: kubelet-pki
        hostPath:
          path: /var/lib/kubelet/pki
```

## Using Kubernetes Forensic Container Checkpointing

Kubernetes 1.25 introduced built-in forensic container checkpointing as an alpha feature. In Kubernetes 1.30 and later, the `ContainerCheckpoint` feature gate is beta and enabled by default. The kubelet exposes this through its checkpoint API; upstream Kubernetes does not provide a built-in `kubectl checkpoint` command.

For Kubernetes 1.25 through 1.29, enable the feature gate on your cluster. For kubeadm clusters, add it to the kubelet configuration.

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

Create a checkpoint by calling the kubelet checkpoint endpoint on the node that runs the Pod. Use kubelet credentials that are authorized for this endpoint.

```bash
# Checkpoint a container
NAMESPACE="default"
POD_NAME="pod-name"
CONTAINER_NAME="container-name"
sudo curl --cert /path/to/kubelet-client.crt \
  --key /path/to/kubelet-client.key \
  -k -X POST \
  "https://127.0.0.1:10250/checkpoint/${NAMESPACE}/${POD_NAME}/${CONTAINER_NAME}?timeout=60"

# Checkpoints are stored at /var/lib/kubelet/checkpoints/ by default
sudo ls -lh /var/lib/kubelet/checkpoints/

# Copy checkpoint to another node for restore
sudo scp /var/lib/kubelet/checkpoints/checkpoint-${POD_NAME}_${NAMESPACE}-${CONTAINER_NAME}-*.tar \
  node-2:/var/lib/kubelet/checkpoints/
```

## Implementing Pre-Initialized Container Images

One powerful use case for CRIU is creating pre-initialized container state. Instead of running initialization code on every container start, initialize once, checkpoint, and restore from that state. The checkpoint must be restored by a runtime that understands the checkpoint format; copying checkpoint files into a Docker image does not make the image start from that state by itself.

```bash
# Start a container with expensive initialization
docker run -d --name init-demo myapp:latest

# Wait for initialization to complete
sleep 30

# Checkpoint the initialized container
docker checkpoint create init-demo initialized

# Restore from that checkpoint on the same Docker host
docker start --checkpoint initialized init-demo
```

Containers restored from a pre-initialized checkpoint can skip application initialization, but the exact startup time depends on checkpoint size, storage speed, and runtime support.

## Migrating Containers Between Nodes

Checkpoint-based migration moves container state between nodes with a short pause while the checkpoint is created, transferred, and restored. It is not zero-downtime by itself; production migration also needs orchestration for Pod scheduling, IP address changes, Service endpoints, and storage.

```bash
# On source node, checkpoint the container through the kubelet API
SOURCE_NODE="node-1"
TARGET_NODE="node-2"
NAMESPACE="default"
POD_NAME="my-app-xyz"
CONTAINER_NAME="app"

# Create checkpoint
ssh ${SOURCE_NODE} "sudo curl --cert /path/to/kubelet-client.crt \
  --key /path/to/kubelet-client.key \
  -k -X POST \
  https://127.0.0.1:10250/checkpoint/${NAMESPACE}/${POD_NAME}/${CONTAINER_NAME}?timeout=60"

# Transfer checkpoint to target node
CHECKPOINT=$(ssh ${SOURCE_NODE} "sudo ls -t /var/lib/kubelet/checkpoints/checkpoint-${POD_NAME}_${NAMESPACE}-${CONTAINER_NAME}-*.tar | head -n 1")
scp ${SOURCE_NODE}:${CHECKPOINT} ${TARGET_NODE}:/var/lib/kubelet/checkpoints/

# Restore on the target node with runtime-specific tooling or an operator
# that can recreate the Pod sandbox, networking, and storage.
```

For production migrations, use tools like Kubernetes operators that handle pod scheduling, network reconfiguration, and storage migration automatically.

## Handling Checkpoint Limitations

CRIU cannot checkpoint all container states. Certain system resources don't serialize cleanly.

```bash
# Check host kernel support
sudo criu check
sudo criu check --extra

# Common limitations:
# - Established TCP connections unless the runtime uses CRIU's TCP options
# - GPU resources
# - Hardware devices
# - Time-sensitive operations
```

For containers with external connections, implement application-level session management that can handle connection re-establishment after restore. The annotation below is an application convention, not a Kubernetes built-in.

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
time sudo runc restore --image-path /tmp/checkpoint --bundle /path/to/oci-bundle ${CONTAINER_ID}
```

Checkpoint time correlates with container memory usage, storage throughput, dirty page rate, and the resources CRIU must serialize. Benchmark with your own workload instead of assuming a fixed time per gigabyte.

For large containers, implement incremental checkpoints that only save changed memory pages.

```bash
# First checkpoint (full)
sudo runc checkpoint --image-path /tmp/checkpoint-1 ${CONTAINER_ID}

# Second checkpoint (incremental)
sudo runc checkpoint --image-path /tmp/checkpoint-2 \
  --parent-path /tmp/checkpoint-1 ${CONTAINER_ID}
```

CRIU-based checkpoint and restore transforms container lifecycle management in Kubernetes. Whether migrating workloads between nodes, implementing fast startup from pre-initialized states, or enabling novel debugging workflows, checkpoint and restore capabilities provide powerful tools for managing containerized applications. As the feature matures and Kubernetes integration improves, expect checkpoint and restore to become standard practice for production clusters.
