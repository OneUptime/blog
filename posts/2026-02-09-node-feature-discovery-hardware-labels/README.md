# How to Use Node Feature Discovery to Label Nodes by Hardware Capabilities

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Node Feature Discovery, Hardware

Description: Learn how to automatically label Kubernetes nodes based on their hardware capabilities using Node Feature Discovery, enabling intelligent pod scheduling based on CPU features, storage types, and network capabilities.

---

Different nodes in your Kubernetes cluster have different hardware capabilities. Some have AVX512 instruction sets, others have NVMe storage, some have RDMA-capable network cards. Manually labeling nodes with these features is tedious and error-prone.

Node Feature Discovery (NFD) automatically detects hardware features and labels nodes accordingly. This enables you to schedule pods on nodes with specific capabilities, ensuring workloads run on appropriate hardware.

## Installing Node Feature Discovery

Deploy NFD using Helm:

```bash
# Add the NFD Helm repository
helm repo add nfd https://kubernetes-sigs.github.io/node-feature-discovery/charts
helm repo update

# Install NFD
helm install nfd nfd/node-feature-discovery \
  --namespace node-feature-discovery \
  --create-namespace

# Verify installation
kubectl get pods -n node-feature-discovery
kubectl get ds -n node-feature-discovery
```

Or install using manifests:

```bash
# Install using kubectl
kubectl apply -k https://github.com/kubernetes-sigs/node-feature-discovery/deployment/overlays/default?ref=v0.15.0

# Check the DaemonSet is running
kubectl get daemonset -n node-feature-discovery nfd-worker
```

## Viewing Discovered Features

Check what features NFD has discovered:

```bash
# List all nodes with NFD labels
kubectl get nodes --show-labels | grep feature.node

# View features for a specific node
kubectl get node worker-node-1 -o json | \
  jq '.metadata.labels | with_entries(select(.key | startswith("feature.node")))'

# Pretty print discovered features
kubectl describe node worker-node-1 | grep -A 20 "Labels:"
```

## CPU Feature Detection

NFD automatically detects CPU features like AVX, SSE, and specific instruction sets:

```yaml
# cpu-optimized-workload.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scientific-compute
spec:
  replicas: 3
  selector:
    matchLabels:
      app: scientific-compute
  template:
    metadata:
      labels:
        app: scientific-compute
    spec:
      # Schedule on nodes with AVX512 support
      nodeSelector:
        feature.node.kubernetes.io/cpu-cpuid.AVX512F: "true"
        feature.node.kubernetes.io/cpu-cpuid.AVX512DQ: "true"
      containers:
      - name: compute
        image: scientific-app:v1.0
        resources:
          requests:
            cpu: 8000m
            memory: 16Gi
          limits:
            cpu: 16000m
            memory: 32Gi
```

## Storage Feature Detection

Schedule workloads on nodes with specific storage types:

```yaml
# nvme-database.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: high-performance-db
spec:
  serviceName: db
  replicas: 3
  selector:
    matchLabels:
      app: high-perf-db
  template:
    metadata:
      labels:
        app: high-perf-db
    spec:
      # Require nodes with NVMe storage
      nodeSelector:
        feature.node.kubernetes.io/storage-nonrotationaldisk: "true"
      containers:
      - name: database
        image: postgres:15
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: local-nvme
      resources:
        requests:
          storage: 500Gi
```

## Network Feature Detection

Use network capabilities for scheduling:

```yaml
# rdma-workload.yaml
apiVersion: v1
kind: Pod
metadata:
  name: rdma-job
spec:
  nodeSelector:
    # Schedule on nodes with RDMA capability
    feature.node.kubernetes.io/network-rdma.available: "true"
  containers:
  - name: rdma-app
    image: rdma-application:v2.0
    resources:
      requests:
        cpu: 4000m
        memory: 8Gi
        rdma/hca: 1
      limits:
        rdma/hca: 1
```

## Custom Feature Detection

Configure NFD to detect custom features using a ConfigMap:

```yaml
# nfd-worker-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nfd-worker-conf
  namespace: node-feature-discovery
data:
  nfd-worker.conf: |
    sources:
      # Enable all default sources
      cpu:
        cpuid:
          attributeBlacklist:
            - "BMI1"
            - "BMI2"
      kernel:
        configOpts:
          - "NO_HZ"
          - "X86"
          - "DMI"
      pci:
        deviceClassWhitelist:
          - "0200"  # Network controller
          - "03"    # Display controller
          - "12"    # Processing accelerators
      usb:
        deviceClassWhitelist:
          - "0e"    # Video
          - "ef"    # Miscellaneous
      storage:
        # Detect storage features
      # Custom feature detection
      custom:
        - name: "hardware-vendor"
          matchOn:
          - pciId:
              vendor: ["8086"]  # Intel
          - pciId:
              vendor: ["10de"]  # NVIDIA
        - name: "special-nic"
          matchOn:
          - pciId:
              vendor: ["15b3"]  # Mellanox
              device: ["1017"]  # ConnectX-5
```

Apply the configuration:

```bash
kubectl apply -f nfd-worker-config.yaml

# Restart NFD workers to pick up new config
kubectl rollout restart daemonset/nfd-worker -n node-feature-discovery
```

## Using Node Affinity with NFD Labels

Prefer nodes with certain features but don't require them:

```yaml
# preferred-features.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-inference
spec:
  replicas: 5
  selector:
    matchLabels:
      app: ml-inference
  template:
    metadata:
      labels:
        app: ml-inference
    spec:
      affinity:
        nodeAffinity:
          # Prefer nodes with AVX512 but allow others
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: feature.node.kubernetes.io/cpu-cpuid.AVX512F
                operator: In
                values:
                - "true"
          - weight: 50
            preference:
              matchExpressions:
              - key: feature.node.kubernetes.io/cpu-cpuid.AVX2
                operator: In
                values:
                - "true"
          # Require x86_64 architecture
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: kubernetes.io/arch
                operator: In
                values:
                - amd64
      containers:
      - name: inference
        image: ml-inference:v1.0
        resources:
          requests:
            cpu: 2000m
            memory: 4Gi
```

## Kernel Feature Detection

Schedule pods based on kernel configuration:

```yaml
# kernel-module-required.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: network-monitor
spec:
  selector:
    matchLabels:
      app: network-monitor
  template:
    metadata:
      labels:
        app: network-monitor
    spec:
      nodeSelector:
        # Require specific kernel modules
        feature.node.kubernetes.io/kernel-config.NO_HZ: "true"
        feature.node.kubernetes.io/kernel-version.major: "5"
      containers:
      - name: monitor
        image: network-monitor:v1.0
        securityContext:
          privileged: true
```

## Architecture-Specific Scheduling

Use NFD to schedule on specific CPU architectures:

```yaml
# multi-arch-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 10
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      # Will be scheduled on both amd64 and arm64
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: kubernetes.io/arch
                operator: In
                values:
                - amd64
                - arm64
      containers:
      - name: app
        # Use multi-arch image
        image: web-app:v1.0-multiarch
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
```

## Creating Custom Feature Rules

Define custom rules to detect specific hardware configurations:

```yaml
# custom-feature-rules.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nfd-worker-custom-rules
  namespace: node-feature-discovery
data:
  custom-rules: |
    - name: "high-mem-node"
      labels:
        "node-role/memory-intensive": "true"
      matchFeatures:
        - feature: memory.numa
          matchExpressions:
            is_numa: {op: Exists}
        - feature: memory.nv
          matchExpressions:
            present: {op: Gt, value: ["100000000000"]}  # >100GB

    - name: "fast-network-node"
      labels:
        "node-role/network-intensive": "true"
      matchFeatures:
        - feature: network.device
          matchExpressions:
            speed: {op: Gt, value: ["10000"]}  # >10Gbps

    - name: "compute-optimized"
      labels:
        "node-role/compute-optimized": "true"
      matchFeatures:
        - feature: cpu.cpuid
          matchExpressions:
            AVX512F: {op: Exists}
        - feature: cpu.model
          matchExpressions:
            vendor_id: {op: In, value: ["GenuineIntel"]}
```

## Monitoring NFD Operations

Check NFD is working correctly:

```bash
# View NFD master logs
kubectl logs -n node-feature-discovery deployment/nfd-master

# View NFD worker logs for a specific node
kubectl logs -n node-feature-discovery -l app=nfd-worker --tail=50

# Check for errors in feature detection
kubectl get events -n node-feature-discovery --sort-by='.lastTimestamp'

# Verify labels are being applied
watch kubectl get nodes -L feature.node.kubernetes.io/cpu-cpuid.AVX512F
```

## NFD Topology Updater

Enable topology-aware scheduling with NFD:

```yaml
# nfd-topology-updater.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nfd-topology-updater
  namespace: node-feature-discovery
spec:
  selector:
    matchLabels:
      app: nfd-topology-updater
  template:
    metadata:
      labels:
        app: nfd-topology-updater
    spec:
      serviceAccountName: nfd-topology-updater
      containers:
      - name: nfd-topology-updater
        image: k8s.gcr.io/nfd/node-feature-discovery:v0.15.0
        command:
        - nfd-topology-updater
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        volumeMounts:
        - name: host-sys
          mountPath: /host-sys
      volumes:
      - name: host-sys
        hostPath:
          path: /sys
```

## Best Practices

1. **Use Standard Labels**: Stick to NFD's standard label format for compatibility
2. **Filter Carefully**: Use attributeBlacklist to avoid label explosion
3. **Monitor Label Count**: Too many labels can impact API server performance
4. **Combine with Taints**: Use NFD labels with taints for stronger isolation
5. **Update Regularly**: Keep NFD updated to detect newer hardware features
6. **Test Detection**: Verify NFD correctly detects features on your hardware
7. **Document Custom Rules**: Maintain documentation for custom feature detection
8. **Consider Performance**: NFD workers scan hardware, monitor their resource usage

## Troubleshooting

If features aren't being detected:

```bash
# Check NFD workers are running on all nodes
kubectl get daemonset -n node-feature-discovery nfd-worker

# View worker logs for detection errors
kubectl logs -n node-feature-discovery daemonset/nfd-worker

# Verify configuration is loaded
kubectl get configmap -n node-feature-discovery nfd-worker-conf -o yaml

# Check for SELinux or AppArmor blocking access
kubectl describe pod -n node-feature-discovery -l app=nfd-worker

# Manually trigger feature detection
kubectl delete pod -n node-feature-discovery -l app=nfd-worker
```

If labels aren't being applied:

```bash
# Check NFD master is running
kubectl get deployment -n node-feature-discovery nfd-master

# Verify RBAC permissions
kubectl auth can-i update nodes --as=system:serviceaccount:node-feature-discovery:nfd-master

# Check for label conflicts
kubectl get nodes -o json | jq '.items[].metadata.labels'
```

Node Feature Discovery transforms hardware capabilities into Kubernetes labels, enabling intelligent scheduling decisions based on actual node capabilities rather than manual configuration. This ensures your workloads run on the most appropriate hardware available in your cluster.

