# How to use DaemonSets for GPU device plugins on accelerated nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSets, GPU

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
        image: nvcr.io/nvidia/k8s-device-plugin:v0.14.3
        args:
        - --fail-on-init-error=false
        - --pass-device-specs=true
        env:
        - name: NVIDIA_MIG_MONITOR_DEVICES
          value: all
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
        image: rocm/k8s-device-plugin:1.25.2.7
        securityContext:
          privileged: true
        volumeMounts:
        - name: device-plugin
          mountPath: /var/lib/kubelet/device-plugins
        - name: sys
          mountPath: /sys
        - name: dev
          mountPath: /dev/dri
      volumes:
      - name: device-plugin
        hostPath:
          path: /var/lib/kubelet/device-plugins
      - name: sys
        hostPath:
          path: /sys
      - name: dev
        hostPath:
          path: /dev/dri
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
        gpu.intel.com/gpu: "true"
      initContainers:
      - name: intel-gpu-initcontainer
        image: intel/intel-gpu-plugin:0.27.1
        command: ["/bin/sh", "-c"]
        args:
        - |
          cp /usr/local/bin/intel_gpu_device_plugin /shared/
        volumeMounts:
        - name: shared
          mountPath: /shared
      containers:
      - name: intel-gpu-plugin
        image: intel/intel-gpu-plugin:0.27.1
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
      - name: shared
        emptyDir: {}
```

Intel's plugin supports time-slicing for sharing GPUs across multiple workloads.

## NVIDIA GPU operator approach

The NVIDIA GPU Operator deploys the entire GPU software stack including drivers and monitoring:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nvidia-gpu-operator
  namespace: gpu-operator
spec:
  selector:
    matchLabels:
      app: nvidia-gpu-operator
  template:
    metadata:
      labels:
        app: nvidia-gpu-operator
    spec:
      nodeSelector:
        nvidia.com/gpu.present: "true"
      priorityClassName: system-node-critical
      tolerations:
      - operator: Exists
      hostPID: true
      containers:
      - name: nvidia-driver-installer
        image: nvidia/driver:525.85.12-ubuntu22.04
        command:
        - /bin/bash
        - -c
        - |
          # Install NVIDIA drivers if not present
          if ! nvidia-smi > /dev/null 2>&1; then
            echo "Installing NVIDIA drivers..."
            /usr/local/bin/install-driver.sh
          fi

          # Keep container running
          sleep infinity
        securityContext:
          privileged: true
        volumeMounts:
        - name: root-mount
          mountPath: /root
        - name: dev
          mountPath: /dev

      - name: device-plugin
        image: nvcr.io/nvidia/k8s-device-plugin:v0.14.3
        volumeMounts:
        - name: device-plugin
          mountPath: /var/lib/kubelet/device-plugins

      - name: dcgm-exporter
        image: nvcr.io/nvidia/k8s/dcgm-exporter:3.1.7-3.1.4-ubuntu22.04
        ports:
        - name: metrics
          containerPort: 9400
        securityContext:
          privileged: true
        volumeMounts:
        - name: nvidia
          mountPath: /usr/local/nvidia

      volumes:
      - name: device-plugin
        hostPath:
          path: /var/lib/kubelet/device-plugins
      - name: root-mount
        hostPath:
          path: /
      - name: dev
        hostPath:
          path: /dev
      - name: nvidia
        hostPath:
          path: /usr/local/nvidia
```

This comprehensive approach includes driver installation, device plugin, and GPU metrics exporters in one DaemonSet.

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
      nodeSelector:
        nvidia.com/gpu.present: "true"
      containers:
      - name: gpu-feature-discovery
        image: nvcr.io/nvidia/gpu-feature-discovery:v0.8.2
        args:
        - --mig-strategy=single
        - --fail-on-init-error=true
        - --oneshot=false
        - --sleep-interval=60s
        volumeMounts:
        - name: output-dir
          mountPath: /etc/kubernetes/node-feature-discovery/features.d
        - name: host-sys
          mountPath: /sys
        securityContext:
          privileged: true
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
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
        image: nvcr.io/nvidia/k8s-device-plugin:v0.14.3
        args:
        - --mig-strategy=mixed
        - --pass-device-specs=true
        env:
        - name: NVIDIA_MIG_MONITOR_DEVICES
          value: all
        - name: MIG_STRATEGY
          value: mixed
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
