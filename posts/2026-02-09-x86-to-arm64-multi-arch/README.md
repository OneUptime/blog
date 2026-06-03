# Migrate Kubernetes Workloads from x86 to ARM64 Nodes with Multi-Arch Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ARM64, Multi-Architecture

Description: Learn how to migrate Kubernetes workloads from x86 to ARM64 nodes using multi-architecture container images for cost savings and performance benefits on ARM-based instances.

---

ARM64 instances offer significant cost savings and energy efficiency compared to x86. Migrating Kubernetes workloads to ARM requires building multi-architecture images and managing node affinity. This guide shows you how to migrate from x86 to ARM64 while maintaining compatibility with both architectures.

## Understanding Multi-Architecture Support

Container images can support multiple CPU architectures.

```bash
#!/bin/bash
# Check image architecture support

docker manifest inspect nginx:latest | jq '.manifests[] | select(.platform.os == "linux") | {arch: .platform.architecture, os: .platform.os}'

# Output shows supported architectures:

# {"arch": "amd64", "os": "linux"}
# {"arch": "arm64", "os": "linux"}
# {"arch": "arm", "os": "linux"}
```

Multi-arch images work on both x86 and ARM nodes automatically.

## Building Multi-Architecture Images

Create container images that support both x86 and ARM64.

```dockerfile
# Dockerfile
FROM --platform=$BUILDPLATFORM golang:1.21 AS builder
ARG TARGETOS
ARG TARGETARCH

WORKDIR /app
COPY . .

# Build for target architecture
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o myapp .

FROM alpine:latest
COPY --from=builder /app/myapp /usr/local/bin/
ENTRYPOINT ["/usr/local/bin/myapp"]
```

```bash
#!/bin/bash
# Build and push multi-arch image

docker buildx create --name multiarch --use
docker buildx inspect --bootstrap

# Build for multiple architectures
docker buildx build --platform linux/amd64,linux/arm64 \
  -t registry.example.com/myapp:v1.0 \
  --push .

# Verify manifest
docker manifest inspect registry.example.com/myapp:v1.0
```

Buildx creates separate images for each architecture.

## Adding ARM64 Node Pool

Provision ARM64 nodes alongside existing x86 nodes.

```yaml
# AWS EKS ARM64 node group
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: production
  region: us-east-1
nodeGroups:
- name: x86-nodes
  instanceType: t3.xlarge
  desiredCapacity: 5
  labels:
    architecture: amd64
- name: arm-nodes
  instanceType: t4g.xlarge  # ARM-based Graviton
  desiredCapacity: 3
  labels:
    architecture: arm64
```

```bash
#!/bin/bash
# Add ARM64 nodes to existing cluster

aws eks create-nodegroup \
  --cluster-name production \
  --nodegroup-name arm64-nodes \
  --instance-types t4g.xlarge \
  --subnets subnet-abc123 \
  --node-role arn:aws:iam::ACCOUNT_ID:role/NodeRole \
  --labels architecture=arm64

kubectl label nodes --selector kubernetes.io/arch=arm64 architecture=arm64
```

Run both architectures in parallel during migration.

## Deploying Multi-Arch Workloads

Update deployments to use multi-arch images.

```yaml
# Deployment with multi-arch image
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 6
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: registry.example.com/myapp:v1.0  # Multi-arch manifest
        # No architecture-specific configuration needed
```

Kubernetes automatically selects the correct image for each node's architecture.

## Testing ARM64 Compatibility

Validate applications work correctly on ARM64.

```yaml
# Test pod on ARM64 node
apiVersion: v1
kind: Pod
metadata:
  name: arm64-test
spec:
  nodeSelector:
    kubernetes.io/arch: arm64
  containers:
  - name: test
    image: registry.example.com/myapp:v1.0
    command: ["/bin/sh", "-c"]
    args:
    - |
      echo "Architecture: $(uname -m)"
      echo "Running application tests..."
      /usr/local/bin/myapp --version
```

```bash
#!/bin/bash
# Automated ARM64 compatibility testing

kubectl apply -f arm64-test-pod.yaml
kubectl wait --for=condition=Ready pod/arm64-test --timeout=60s

# Check logs
kubectl logs arm64-test

if [ $? -eq 0 ]; then
  echo "ARM64 compatibility verified"
else
  echo "ARM64 compatibility issues detected"
  exit 1
fi
```

Test thoroughly before production migration.

## Gradual Traffic Shift to ARM64

Progressively move workloads to ARM64 nodes.

```yaml
# Deployment with topology spread
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 10
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      topologySpreadConstraints:
      - maxSkew: 2
        topologyKey: kubernetes.io/arch
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: myapp
      containers:
      - name: app
        image: registry.example.com/myapp:v1.0
```

This spreads pods across both x86 and ARM64 nodes.

```bash
#!/bin/bash
# Gradually increase ARM64 node count

# Week 1: 20% ARM64
aws eks update-nodegroup-config \
  --cluster-name production \
  --nodegroup-name arm64-nodes \
  --scaling-config minSize=1,maxSize=4,desiredSize=2

# Week 2: 50% ARM64
aws eks update-nodegroup-config \
  --cluster-name production \
  --nodegroup-name arm64-nodes \
  --scaling-config minSize=1,maxSize=6,desiredSize=5

# Week 3: 80% ARM64
aws eks update-nodegroup-config \
  --cluster-name production \
  --nodegroup-name arm64-nodes \
  --scaling-config minSize=1,maxSize=10,desiredSize=8

# Week 4: 100% ARM64, scale down x86
aws eks update-nodegroup-config \
  --cluster-name production \
  --nodegroup-name x86-nodes \
  --scaling-config minSize=0,maxSize=2,desiredSize=2
aws eks update-nodegroup-config \
  --cluster-name production \
  --nodegroup-name arm64-nodes \
  --scaling-config minSize=1,maxSize=12,desiredSize=10
```

Gradual migration minimizes risk.

## Handling Architecture-Specific Dependencies

Some applications have arch-specific requirements.

```yaml
# Multi-arch DaemonSet with init container
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: monitoring-agent
spec:
  selector:
    matchLabels:
      app: monitoring
  template:
    metadata:
      labels:
        app: monitoring
    spec:
      initContainers:
      - name: download-binary
        image: curlimages/curl
        command:
        - sh
        - -c
        - |
          ARCH=$(uname -m)
          if [ "$ARCH" = "aarch64" ]; then
            curl -L https://releases.example.com/agent-arm64 -o /agent-bin/agent
          else
            curl -L https://releases.example.com/agent-amd64 -o /agent-bin/agent
          fi
          chmod +x /agent-bin/agent
        volumeMounts:
        - name: agent-binary
          mountPath: /agent-bin
      containers:
      - name: agent
        image: alpine
        command: ["/agent-bin/agent"]
        volumeMounts:
        - name: agent-binary
          mountPath: /agent-bin
      volumes:
      - name: agent-binary
        emptyDir: {}
```

Handle arch-specific binaries in init containers.

## Monitoring Performance Differences

Compare x86 and ARM64 performance.

```yaml
# Prometheus queries for architecture comparison
apiVersion: v1
kind: ConfigMap
metadata:
  name: arch-performance-queries
data:
  cpu_usage_by_arch.promql: |
    sum by (arch) (
      sum by (namespace, pod) (
        rate(container_cpu_usage_seconds_total{container!="",pod!=""}[5m])
      )
      * on(namespace, pod) group_left(node)
      kube_pod_info
      * on(node) group_left(arch)
      label_replace(kube_node_labels{label_kubernetes_io_arch!=""}, "arch", "$1", "label_kubernetes_io_arch", "(.*)")
    )

  memory_usage_by_arch.promql: |
    sum by (arch) (
      sum by (namespace, pod) (
        container_memory_working_set_bytes{container!="",pod!=""}
      )
      * on(namespace, pod) group_left(node)
      kube_pod_info
      * on(node) group_left(arch)
      label_replace(kube_node_labels{label_kubernetes_io_arch!=""}, "arch", "$1", "label_kubernetes_io_arch", "(.*)")
    )

  request_latency_by_arch.promql: |
    histogram_quantile(0.95,
      sum by (arch, le) (
        rate(http_request_duration_seconds_bucket[5m])
        * on(namespace, pod) group_left(node)
        kube_pod_info
        * on(node) group_left(arch)
        label_replace(kube_node_labels{label_kubernetes_io_arch!=""}, "arch", "$1", "label_kubernetes_io_arch", "(.*)")
      )
    )
```

Track performance metrics by architecture.

## Decommissioning x86 Nodes

Remove x86 nodes after successful ARM64 migration.

```bash
#!/bin/bash
# Remove x86 nodes

# Verify all pods running on ARM64
X86_PODS=0
for NODE in $(kubectl get nodes -l kubernetes.io/arch=amd64 -o jsonpath='{.items[*].metadata.name}'); do
  COUNT=$(kubectl get pods -A --field-selector spec.nodeName=$NODE --no-headers 2>/dev/null | wc -l)
  X86_PODS=$((X86_PODS + COUNT))
done

if [ $X86_PODS -gt 0 ]; then
  echo "WARNING: $X86_PODS pods still on x86 nodes"
  exit 1
fi

# Drain x86 nodes
for NODE in $(kubectl get nodes -l kubernetes.io/arch=amd64 -o name); do
  kubectl drain $NODE --ignore-daemonsets --delete-emptydir-data
done

# Delete x86 nodes
aws eks delete-nodegroup \
  --cluster-name production \
  --nodegroup-name x86-nodes

echo "x86 nodes removed, migration complete"
```

Only remove x86 nodes after full ARM64 validation.

## Conclusion

Migrating to ARM64 provides cost and performance benefits. Build multi-architecture container images using Docker buildx that support both x86 and ARM64. Add ARM64 node pools to your cluster alongside existing x86 nodes. Label nodes by architecture for tracking and scheduling. Deploy applications using multi-arch images and let Kubernetes select the appropriate variant automatically. Test applications thoroughly on ARM64 before production migration. Use topology spread constraints to gradually shift traffic from x86 to ARM64. Monitor performance differences between architectures. Handle architecture-specific dependencies with init containers or conditional logic. Remove x86 nodes only after ARM64 proves stable. ARM64 instances like AWS Graviton offer 20-40% cost savings compared to equivalent x86 instances.
