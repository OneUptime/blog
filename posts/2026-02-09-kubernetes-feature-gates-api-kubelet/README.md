# How to Enable and Use Kubernetes Feature Gates on API Server, kubelet,

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Feature Gates, Configuration

Description: Learn how to enable and configure Kubernetes feature gates across API server, kubelet, and controller manager to access alpha and beta features, understanding stability levels and graduation paths.

---

Kubernetes uses feature gates to control access to experimental, beta, and deprecated features. Feature gates allow you to opt into new functionality before it becomes generally available or disable deprecated features. Understanding how to configure feature gates across cluster components enables early adoption of beneficial features while maintaining stability.

This guide covers how to work with feature gates on the API server, kubelet, and controller manager.

## Understanding Feature Gate Stages

Features progress through stages:

- **Alpha**: Disabled by default, may be buggy, no guarantees
- **Beta**: Enabled by default, well-tested, may change
- **GA (Stable)**: Always enabled by default; the feature gate is eventually removed

Feature naming:
- `FeatureName=true`: Enable feature
- `FeatureName=false`: Disable feature

## Viewing Available Feature Gates

List all feature gates:

```bash
# API server feature gates

kube-apiserver -h | grep -A 500 "feature-gates"

# kubelet feature gates
kubelet -h | grep -A 500 "feature-gates"

# Controller manager feature gates
kube-controller-manager -h | grep -A 500 "feature-gates"
```

Check currently enabled features:

```bash
# View API server flags
kubectl get pods -n kube-system kube-apiserver-<node> -o yaml | grep feature-gates

# View kubelet config
cat /var/lib/kubelet/config.yaml | grep -A 10 featureGates

# Check API server metrics
kubectl get --raw /metrics | grep kubernetes_feature_enabled
```

## Enabling Feature Gates on API Server

Configure via static pod manifest:

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-apiserver
    - --feature-gates=APIResponseCompression=true,APIServerIdentity=true,StorageVersionMigrator=true
    # ... other flags
```

Or via kubeadm configuration:

```yaml
# kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
apiServer:
  extraArgs:
    - name: feature-gates
      value: "APIResponseCompression=true,APIServerIdentity=true,StorageVersionMigrator=true"
```

Apply and verify:

```bash
# Apply kubeadm config (for new clusters)
sudo kubeadm init --config kubeadm-config.yaml

# For existing clusters, edit manifest directly
sudo vim /etc/kubernetes/manifests/kube-apiserver.yaml

# kubelet automatically restarts API server
# Verify feature gates loaded
kubectl logs -n kube-system kube-apiserver-<node> | grep feature-gate
```

## Enabling Feature Gates on kubelet

Configure in kubelet config file:

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
featureGates:
  MemoryQoS: true
  KubeletSeparateDiskGC: true
  GracefulNodeShutdown: true
```

Or via kubeadm:

```yaml
# kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
---
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
featureGates:
  MemoryQoS: true
  KubeletSeparateDiskGC: true
  GracefulNodeShutdown: true
```

Apply configuration:

```bash
# Restart kubelet
sudo systemctl restart kubelet

# Verify feature gates
sudo journalctl -u kubelet | grep feature-gate
```

## Enabling Feature Gates on Controller Manager

Configure via static pod manifest:

```yaml
# /etc/kubernetes/manifests/kube-controller-manager.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-controller-manager
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-controller-manager
    - --feature-gates=HPAConfigurableTolerance=true,MaxUnavailableStatefulSet=true
    # ... other flags
```

Or via kubeadm:

```yaml
# kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
controllerManager:
  extraArgs:
    - name: feature-gates
      value: "HPAConfigurableTolerance=true,MaxUnavailableStatefulSet=true"
```

## Useful Features to Configure

### Ephemeral Containers (GA in 1.25)

Ephemeral containers are stable and no feature gate is required in supported Kubernetes releases.

Use ephemeral containers for debugging:

```bash
kubectl debug -it pod-name --image=busybox --target=container-name
```

### TTL After Finished (GA in 1.23)

Auto-delete completed Jobs. This feature is stable and no feature gate is required in supported Kubernetes releases.

Use in Job definitions:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: cleanup-job
spec:
  ttlSecondsAfterFinished: 100
  template:
    spec:
      containers:
      - name: job
        image: busybox
        command: ["echo", "done"]
      restartPolicy: Never
```

### Size Memory Backed Volumes (GA in 1.32)

Limit size of memory-backed volumes. This feature is stable and no feature gate is required in supported Kubernetes releases.

Use in pod specs:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: memory-volume-pod
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - name: cache
      mountPath: /cache
  volumes:
  - name: cache
    emptyDir:
      medium: Memory
      sizeLimit: 1Gi
```

### CPU Manager (GA in 1.26)

Enable CPU pinning:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
cpuManagerPolicy: static
reservedSystemCPUs: "0-1"
```

### Topology Manager (GA in 1.27)

NUMA-aware resource allocation:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
topologyManagerPolicy: best-effort
```

### Memory QoS (Alpha)

Improved memory management with cgroups v2:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
featureGates:
  MemoryQoS: true
```

## Enabling Multiple Feature Gates

Combine multiple features:

```yaml
# API Server
apiServer:
  extraArgs:
    - name: feature-gates
      value: "APIResponseCompression=true,APIServerIdentity=true,StorageVersionMigrator=true"

# kubelet
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
featureGates:
  MemoryQoS: true
  KubeletSeparateDiskGC: true
  GracefulNodeShutdown: true

# Controller Manager
controllerManager:
  extraArgs:
    - name: feature-gates
      value: "HPAConfigurableTolerance=true,MaxUnavailableStatefulSet=true"
```

## Testing Feature Gate Configuration

Verify features are enabled:

```bash
# Check API server logs
kubectl logs -n kube-system kube-apiserver-<node> | grep "Enabled feature gates"

# Check kubelet logs
sudo journalctl -u kubelet | grep "Feature gates"

# Test specific feature
# For EphemeralContainers:
kubectl debug -it <pod-name> --image=busybox

# For TTL-after-finished:
kubectl create job test --image=busybox -- echo "test"
kubectl patch job test -p '{"spec":{"ttlSecondsAfterFinished":100}}'
kubectl get job test -o yaml | grep ttlSecondsAfterFinished
```

## Alpha Feature Examples

Enable experimental features (use caution):

```yaml
apiServer:
  extraArgs:
    - name: feature-gates
      value: "APIServingWithRoutine=true,CBORServingAndStorage=true"

---
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
featureGates:
  MemoryQoS: true
  KubeletInUserNamespace: true
```

### Node Swap (GA in 1.34)

Enable swap support on nodes:

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
memorySwap:
  swapBehavior: LimitedSwap
failSwapOn: false
```

### Server-Side Field Validation (GA in 1.27)

Server-side field validation is stable and no feature gate is required in supported Kubernetes releases.

Use with kubectl:

```bash
kubectl apply -f deployment.yaml --validate=strict
```

## Disabling Deprecated Features

Disable features being deprecated:

```yaml
apiServer:
  extraArgs:
    - name: feature-gates
      value: "GitRepoVolumeDriver=false"
```

## Monitoring Feature Gate Status

Track which features are enabled:

```bash
# Create a script to audit feature gates
cat > audit-feature-gates.sh <<'EOF'
#!/bin/bash

echo "=== API Server Feature Gates ==="
kubectl get pod -n kube-system -l component=kube-apiserver -o yaml | grep feature-gates

echo -e "\n=== Kubelet Feature Gates (from config) ==="
ssh <node> "sudo cat /var/lib/kubelet/config.yaml | grep -A 20 featureGates"

echo -e "\n=== Controller Manager Feature Gates ==="
kubectl get pod -n kube-system -l component=kube-controller-manager -o yaml | grep feature-gates
EOF

chmod +x audit-feature-gates.sh
./audit-feature-gates.sh
```

## Graduated Features (Can Remove)

These features are GA and feature gates can be removed:

```yaml
# These are now always enabled, no need to specify:
# - PodPriority (GA in 1.14)
# - VolumeSnapshotDataSource (GA in 1.20)
# - CSIStorageCapacity (GA in 1.24)
# - EndpointSlice (GA in 1.21)
# - EphemeralContainers (GA in 1.25)
# - TTLAfterFinished (GA in 1.23)
# - CPUManager (GA in 1.26)
# - TopologyManager (GA in 1.27)
# - NodeSwap (GA in 1.34)
# - ServiceTopology (deprecated, use TopologyAwareHints)
```

## Best Practices

1. **Test in non-production first**: Always validate alpha/beta features in development

2. **Check dependencies**: Some features require others to be enabled

3. **Read release notes**: Understand feature maturity and known issues

4. **Plan for graduation**: Alpha features may change or be removed

5. **Document enabled features**: Maintain a record of why each feature is enabled

6. **Monitor cluster health**: Watch for issues after enabling features

7. **Use version control**: Track feature gate changes in Git

Example production configuration:

```yaml
# Production cluster - conservative approach
# Only enable well-tested beta features
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
apiServer:
  extraArgs:
    - name: feature-gates
      value: "APIResponseCompression=true,APIServerIdentity=true"
controllerManager:
  extraArgs:
    - name: feature-gates
      value: "HPAConfigurableTolerance=true,MaxUnavailableStatefulSet=true"

---
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
featureGates:
  KubeletSeparateDiskGC: true
  GracefulNodeShutdown: true
```

Feature gates provide controlled access to new Kubernetes functionality before general availability. Enable beta features that provide clear value, avoid alpha features in production unless absolutely necessary, test thoroughly in non-production environments, and maintain documentation of enabled features and their purpose for your cluster.
