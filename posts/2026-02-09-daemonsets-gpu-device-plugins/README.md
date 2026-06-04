# How to use DaemonSets for GPU device plugins on accelerated nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSet, GPU

Description: Learn how to deploy GPU device plugins using DaemonSets to expose GPU resources to Kubernetes workloads on accelerated compute nodes.

---

GPU device plugins enable Kubernetes to schedule GPU-accelerated workloads by exposing GPU devices as schedulable resources. DaemonSets ensure these plugins run on every GPU-enabled node, making graphics and compute acceleration available to pods that request it. Understanding GPU device plugin deployment is essential for running machine learning, scientific computing, and graphics workloads in Kubernetes.

## Understanding Kubernetes device plugins

The device plugin framework allows vendors to advertise hardware resources to Kubernetes without modifying core code. Device plugins discover hardware on nodes, report available devices to the kubelet, and monitor their health. For GPUs, the plugin exposes resources like nvidia.com/gpu or amd.com/gpu that pods can request.

DaemonSets are the natural deployment method for device plugins because they ensure the plugin runs on every node where the hardware exists. Node selectors restrict the DaemonSet to nodes with actual GPU hardware, preventing unnecessary plugin pods on CPU-only nodes.

## NVIDIA GPU device plugin DaemonSet

The NVIDIA device plugin is the most common GPU plugin in Kubernetes:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nvidia-device-plugin
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: nvidia-device-plugin
  updateStrategy:
    type: RollingUpdate
  template:
    metadata:
      labels:
        name: nvidia-device-plugin
    spec:
      nodeSelector:
        accelerator: nvidia
      tolerations:
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoSchedule
      priorityClassName: system-node-critical
      containers:
      - name: nvidia-device-plugin
        image: nvcr.io/nvidia/k8s-device-plugin:v0.17.1
        args:
        - --fail-on-init-error=false
        - --pass-device-specs=true
        securityContext:
          privileged: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: device-plugin
          mountPath: /var/lib/kubelet/device-plugins
        - name: nvidia
          mountPath: /usr/local/nvidia
      volumes:
      - name: device-plugin
        hostPath:
          path: /var/lib/kubelet/device-plugins
      - name: nvidia
        hostPath:
          path: /usr/local/nvidia
```

This DaemonSet runs only on nodes labeled with accelerator: nvidia and registers GPUs with the kubelet.

## AMD GPU device plugin

For AMD GPUs, deploy the AMD device plugin:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: amdgpu-device-plugin
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: amdgpu-device-plugin
  template:
    metadata:
      labels:
        name: amdgpu-device-plugin
    spec:
      nodeSelector:
        accelerator: amd
      tolerations:
      - key: amd.com/gpu
        operator: Exists
        effect: NoSchedule
      priorityClassName: system-node-critical
      hostNetwork: true
      containers:
      - name: amdgpu-device-plugin
        image: rocm/k8s-device-plugin
        securityContext:
          privileged: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: device-plugin
          mountPath: /var/lib/kubelet/device-plugins
        - name: sys
          mountPath: /sys
      volumes:
      - name: device-plugin
        hostPath:
          path: /var/lib/kubelet/device-plugins
      - name: sys
        hostPath:
          path: /sys
```

The AMD plugin works similarly but uses ROCm drivers and exposes amd.com/gpu resources.

## Intel GPU device plugin

For Intel integrated or discrete GPUs:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: intel-gpu-plugin
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: intel-gpu-plugin
  template:
    metadata:
      labels:
        name: intel-gpu-plugin
    spec:
      nodeSelector:
        intel.feature.node.kubernetes.io/gpu: "true"
      containers:
      - name: intel-gpu-plugin
        image: intel/intel-gpu-plugin:0.34.0
        args:
        - -shared-dev-num=1
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        securityContext:
          readOnlyRootFilesystem: true
        volumeMounts:
        - name: device-plugin
          mountPath: /var/lib/kubelet/device-plugins
        - name: dev
          mountPath: /dev/dri
          readOnly: true
        - name: sys
          mountPath: /sys/class/drm
          readOnly: true
        - name: cdi
          mountPath: /var/run/cdi
      volumes:
      - name: device-plugin
        hostPath:
          path: /var/lib/kubelet/device-plugins
      - name: dev
        hostPath:
          path: /dev/dri
      - name: sys
        hostPath:
          path: /sys/class/drm
      - name: cdi
        hostPath:
          path: /var/run/cdi
          type: DirectoryOrCreate
```

Intel's plugin exposes resources such as gpu.intel.com/i915 and gpu.intel.com/xe. It supports sharing GPUs across multiple workloads with the shared device count option.

## NVIDIA GPU operator approach

The NVIDIA GPU Operator deploys the entire GPU software stack including drivers and monitoring:

```bash
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
helm repo update

kubectl create namespace gpu-operator

helm install gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator
```

This comprehensive approach installs the operator, which manages driver containers, the device plugin, GPU Feature Discovery, and GPU metrics exporters as separate components.

## GPU feature discovery

Deploy GPU Feature Discovery to automatically label nodes:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: gpu-feature-discovery
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: gpu-feature-discovery
  template:
    metadata:
      labels:
        app: gpu-feature-discovery
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: feature.node.kubernetes.io/pci-10de.present
                operator: In
                values:
                - "true"
            - matchExpressions:
              - key: nvidia.com/gpu.present
                operator: In
                values:
                - "true"
      containers:
      - name: gpu-feature-discovery
        image: nvcr.io/nvidia/k8s-device-plugin:v0.17.1
        command:
        - /usr/bin/gpu-feature-discovery
        env:
        - name: MIG_STRATEGY
          value: single
        volumeMounts:
        - name: output-dir
          mountPath: /etc/kubernetes/node-feature-discovery/features.d
        - name: host-sys
          mountPath: /sys
        securityContext:
          privileged: true
      volumes:
      - name: output-dir
        hostPath:
          path: /etc/kubernetes/node-feature-discovery/features.d
          type: DirectoryOrCreate
      - name: host-sys
        hostPath:
          path: /sys
```

This discovers GPU capabilities and adds labels like nvidia.com/gpu.memory or nvidia.com/gpu.compute.major.

## Multi-instance GPU support

For NVIDIA MIG (Multi-Instance GPU), configure the device plugin to expose partitions:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nvidia-mig-device-plugin
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: nvidia-mig-plugin
  template:
    metadata:
      labels:
        name: nvidia-mig-plugin
    spec:
      nodeSelector:
        nvidia.com/mig.capable: "true"
      containers:
      - name: nvidia-mig-device-plugin
        image: nvcr.io/nvidia/k8s-device-plugin:v0.17.1
        args:
        - --mig-strategy=mixed
        - --pass-device-specs=true
        securityContext:
          privileged: true
        volumeMounts:
        - name: device-plugin
          mountPath: /var/lib/kubelet/device-plugins
      volumes:
      - name: device-plugin
        hostPath:
          path: /var/lib/kubelet/device-plugins
```

MIG allows a single GPU to be partitioned into multiple isolated instances.

## Testing GPU device plugin

Verify your GPU device plugin works by deploying a test pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test
spec:
  restartPolicy: Never
  containers:
  - name: cuda-test
    image: nvidia/cuda:12.3.0-base-ubuntu22.04
    command:
    - nvidia-smi
    resources:
      limits:
        nvidia.com/gpu: 1
```

Check the results:

```bash
# Deploy test pod

kubectl apply -f gpu-test.yaml

# Wait for completion
kubectl wait --for=condition=Complete pod/gpu-test --timeout=60s

# Check output
kubectl logs gpu-test
```

You should see nvidia-smi output showing GPU information.

## Monitoring GPU resources

Monitor GPU allocation and usage:

```bash
# Check GPU capacity on nodes
kubectl get nodes -o custom-columns=NAME:.metadata.name,GPUs:.status.capacity.'nvidia\.com/gpu'

# View GPU allocation
kubectl describe nodes | grep -A 5 "nvidia.com/gpu"

# List pods using GPUs
kubectl get pods --all-namespaces -o json | jq -r '.items[] | select(.spec.containers[].resources.limits."nvidia.com/gpu" != null) | .metadata.name'
```

These commands help you track GPU utilization across your cluster.

## Troubleshooting GPU device plugins

Common issues and solutions:

```bash
# Check if device plugin registered
kubectl get pods -n kube-system -l name=nvidia-device-plugin

# View device plugin logs
kubectl logs -n kube-system -l name=nvidia-device-plugin

# Verify GPU drivers on node
kubectl debug node/gpu-node-1 -it --image=nvidia/cuda:12.3.0-base-ubuntu22.04
# Inside debug pod:
chroot /host
nvidia-smi
```

Most issues stem from missing drivers, incorrect node labels, or socket permission problems.

## Conclusion

DaemonSets provide the ideal deployment pattern for GPU device plugins, ensuring GPU resources are available wherever the hardware exists. Whether you're using NVIDIA, AMD, or Intel GPUs, the device plugin framework combined with DaemonSets gives you a standard way to expose accelerator hardware to your Kubernetes workloads. Proper configuration of node selectors, tolerations, and security contexts ensures reliable GPU access for machine learning and compute-intensive applications.
