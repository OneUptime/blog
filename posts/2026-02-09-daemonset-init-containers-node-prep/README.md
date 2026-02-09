# How to configure DaemonSet with init containers for node preparation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSets, Init Containers

Description: Master the use of init containers in DaemonSets to prepare nodes before the main application starts, ensuring proper system configuration and prerequisites.

---

Init containers in DaemonSets provide a powerful mechanism for preparing nodes before your main service starts running. They execute sequentially, complete their tasks, and exit before the main containers begin. This pattern is essential for node setup tasks like kernel module loading, system configuration, and prerequisite verification.

## Why init containers in DaemonSets

DaemonSets often manage critical node-level services that depend on specific system configurations. Init containers ensure these prerequisites are met before your main service attempts to start. This approach prevents runtime failures and provides clear separation between setup and operational logic.

Unlike regular containers that should run indefinitely, init containers complete their work and terminate. They run in sequence, so you can chain multiple setup steps with dependencies. If an init container fails, Kubernetes restarts the entire pod, ensuring your node is properly configured before the service runs.

## Basic DaemonSet with init container

Here's a simple example showing init container usage for node preparation:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: network-agent
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: network-agent
  template:
    metadata:
      labels:
        app: network-agent
    spec:
      initContainers:
      - name: setup-network
        image: busybox:1.36
        command:
        - /bin/sh
        - -c
        - |
          echo "Checking network prerequisites..."
          # Verify network interface exists
          if ip link show eth0 > /dev/null 2>&1; then
            echo "Network interface eth0 found"
          else
            echo "ERROR: Network interface eth0 not found"
            exit 1
          fi

          # Create required directories
          mkdir -p /host/etc/network-agent
          echo "Node preparation complete"
        volumeMounts:
        - name: host-etc
          mountPath: /host/etc
        securityContext:
          privileged: true
      containers:
      - name: agent
        image: example/network-agent:v1.0
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        volumeMounts:
        - name: host-etc
          mountPath: /etc/network-agent
          subPath: network-agent
      volumes:
      - name: host-etc
        hostPath:
          path: /etc
```

The init container verifies prerequisites and creates necessary directories before the main agent starts.

## Loading kernel modules with init containers

A common use case is loading required kernel modules:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: storage-driver
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: storage-driver
  template:
    metadata:
      labels:
        app: storage-driver
    spec:
      hostNetwork: true
      hostPID: true
      initContainers:
      - name: load-kernel-modules
        image: alpine:3.19
        command:
        - /bin/sh
        - -c
        - |
          set -e
          apk add --no-cache kmod

          # Load required kernel modules
          MODULES="iscsi_tcp libiscsi scsi_transport_iscsi"

          for module in $MODULES; do
            if lsmod | grep -q "^$module"; then
              echo "Module $module already loaded"
            else
              echo "Loading module $module..."
              modprobe $module || {
                echo "Failed to load module $module"
                exit 1
              }
            fi
          done

          echo "All kernel modules loaded successfully"
        volumeMounts:
        - name: lib-modules
          mountPath: /lib/modules
          readOnly: true
        securityContext:
          privileged: true
      containers:
      - name: driver
        image: example/storage-driver:v2.0
        securityContext:
          privileged: true
        volumeMounts:
        - name: dev
          mountPath: /dev
        - name: sys
          mountPath: /sys
      volumes:
      - name: lib-modules
        hostPath:
          path: /lib/modules
      - name: dev
        hostPath:
          path: /dev
      - name: sys
        hostPath:
          path: /sys
```

This ensures iSCSI kernel modules are loaded before the storage driver starts.

## Installing node dependencies

Init containers can install required packages on the node:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: monitoring-agent
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: monitoring-agent
  template:
    metadata:
      labels:
        app: monitoring-agent
    spec:
      initContainers:
      - name: install-dependencies
        image: debian:12-slim
        command:
        - /bin/bash
        - -c
        - |
          set -euo pipefail

          # Update package list
          apt-get update

          # Check if required tools are available on host
          if ! nsenter -t 1 -m -u -n -i which netstat > /dev/null 2>&1; then
            echo "Installing net-tools on host..."
            nsenter -t 1 -m -u -n -i apt-get install -y net-tools
          else
            echo "net-tools already installed"
          fi

          if ! nsenter -t 1 -m -u -n -i which iftop > /dev/null 2>&1; then
            echo "Installing iftop on host..."
            nsenter -t 1 -m -u -n -i apt-get install -y iftop
          else
            echo "iftop already installed"
          fi

          echo "All dependencies verified"
        securityContext:
          privileged: true
        volumeMounts:
        - name: host-root
          mountPath: /host
      containers:
      - name: agent
        image: example/monitoring-agent:v1.5
        command:
        - /usr/local/bin/agent
        - --collect-network-stats
        securityContext:
          privileged: true
        volumeMounts:
        - name: host-root
          mountPath: /host
          readOnly: true
      volumes:
      - name: host-root
        hostPath:
          path: /
```

This init container uses nsenter to install packages directly on the host system.

## Configuring sysctl parameters

Init containers can set kernel parameters required by your service:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: high-performance-app
  namespace: apps
spec:
  selector:
    matchLabels:
      app: high-performance-app
  template:
    metadata:
      labels:
        app: high-performance-app
    spec:
      initContainers:
      - name: configure-sysctl
        image: busybox:1.36
        command:
        - /bin/sh
        - -c
        - |
          # Increase network buffer sizes
          sysctl -w net.core.rmem_max=134217728
          sysctl -w net.core.wmem_max=134217728
          sysctl -w net.ipv4.tcp_rmem="4096 87380 67108864"
          sysctl -w net.ipv4.tcp_wmem="4096 65536 67108864"

          # Increase connection tracking table size
          sysctl -w net.netfilter.nf_conntrack_max=1048576

          # Reduce TIME_WAIT timeout
          sysctl -w net.ipv4.tcp_fin_timeout=15

          # Enable TCP fast open
          sysctl -w net.ipv4.tcp_fastopen=3

          echo "Sysctl parameters configured"
        securityContext:
          privileged: true
      containers:
      - name: app
        image: example/high-performance-app:v3.0
        ports:
        - containerPort: 8080
        resources:
          limits:
            memory: 2Gi
            cpu: 2000m
          requests:
            memory: 1Gi
            cpu: 1000m
```

These sysctl changes persist on the node and benefit the main application's performance.

## Multiple init containers for sequential setup

Chain multiple init containers for complex setup procedures:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: gpu-workload-agent
  namespace: gpu-operators
spec:
  selector:
    matchLabels:
      app: gpu-agent
  template:
    metadata:
      labels:
        app: gpu-agent
    spec:
      nodeSelector:
        accelerator: nvidia-gpu
      initContainers:
      # Step 1: Verify GPU hardware
      - name: verify-gpu
        image: nvidia/cuda:12.3.0-base-ubuntu22.04
        command:
        - /bin/bash
        - -c
        - |
          if nvidia-smi > /dev/null 2>&1; then
            echo "GPU detected successfully"
            nvidia-smi
          else
            echo "ERROR: No GPU detected"
            exit 1
          fi
        volumeMounts:
        - name: nvidia
          mountPath: /usr/local/nvidia
        securityContext:
          privileged: true

      # Step 2: Load GPU drivers
      - name: load-drivers
        image: nvidia/cuda:12.3.0-devel-ubuntu22.04
        command:
        - /bin/bash
        - -c
        - |
          echo "Loading NVIDIA drivers..."
          modprobe nvidia
          modprobe nvidia-uvm
          echo "Drivers loaded successfully"
        volumeMounts:
        - name: lib-modules
          mountPath: /lib/modules
          readOnly: true
        securityContext:
          privileged: true

      # Step 3: Configure GPU settings
      - name: configure-gpu
        image: nvidia/cuda:12.3.0-base-ubuntu22.04
        command:
        - /bin/bash
        - -c
        - |
          # Set persistence mode
          nvidia-smi -pm 1

          # Set power limit
          nvidia-smi -pl 250

          # Display final configuration
          nvidia-smi -q

          echo "GPU configuration complete"
        volumeMounts:
        - name: nvidia
          mountPath: /usr/local/nvidia
        securityContext:
          privileged: true

      containers:
      - name: gpu-agent
        image: example/gpu-agent:v1.0
        resources:
          limits:
            nvidia.com/gpu: 1
        volumeMounts:
        - name: nvidia
          mountPath: /usr/local/nvidia

      volumes:
      - name: nvidia
        hostPath:
          path: /usr/local/nvidia
      - name: lib-modules
        hostPath:
          path: /lib/modules
```

Each init container completes a specific setup step, ensuring the GPU is ready before the main agent starts.

## Downloading and installing binaries

Init containers can fetch and install required binaries:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: service-mesh-proxy
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: mesh-proxy
  template:
    metadata:
      labels:
        app: mesh-proxy
    spec:
      initContainers:
      - name: install-cni
        image: istio/install-cni:1.20.0
        command:
        - /install-cni.sh
        env:
        - name: CNI_NETWORK_CONFIG
          valueFrom:
            configMapKeyRef:
              name: istio-cni-config
              key: cni_network_config
        volumeMounts:
        - name: cni-bin-dir
          mountPath: /host/opt/cni/bin
        - name: cni-conf-dir
          mountPath: /host/etc/cni/net.d
        securityContext:
          privileged: true

      - name: setup-iptables
        image: istio/proxyv2:1.20.0
        command:
        - /usr/local/bin/pilot-agent
        - istio-iptables
        - -p
        - "15001"
        - -u
        - "1337"
        - -m
        - REDIRECT
        securityContext:
          capabilities:
            add:
            - NET_ADMIN
            - NET_RAW
          privileged: false

      containers:
      - name: proxy
        image: istio/proxyv2:1.20.0
        args:
        - proxy
        - sidecar
        ports:
        - containerPort: 15001
          name: envoy-admin

      volumes:
      - name: cni-bin-dir
        hostPath:
          path: /opt/cni/bin
      - name: cni-conf-dir
        hostPath:
          path: /etc/cni/net.d
```

This pattern installs CNI plugins and configures network rules before starting the service mesh proxy.

## Validation and health checks

Use init containers to validate node readiness:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: critical-service
  namespace: production
spec:
  selector:
    matchLabels:
      app: critical-service
  template:
    metadata:
      labels:
        app: critical-service
    spec:
      initContainers:
      - name: validate-node
        image: curlimages/curl:8.5.0
        command:
        - /bin/sh
        - -c
        - |
          echo "Validating node health..."

          # Check node has sufficient disk space
          df -h | grep -E '(8|9)[0-9]%' && {
            echo "ERROR: Disk usage too high"
            exit 1
          }

          # Verify DNS resolution
          nslookup kubernetes.default.svc.cluster.local || {
            echo "ERROR: DNS resolution failed"
            exit 1
          }

          # Check kubelet is responding
          if curl -k -s https://127.0.0.1:10250/healthz > /dev/null; then
            echo "Kubelet is healthy"
          else
            echo "WARNING: Kubelet health check failed"
          fi

          echo "Node validation complete"
        securityContext:
          runAsNonRoot: true
          runAsUser: 65534

      containers:
      - name: service
        image: example/critical-service:v2.0
```

This validation ensures the node meets all requirements before starting the critical service.

## Conclusion

Init containers in DaemonSets provide a robust pattern for node preparation tasks. They ensure your nodes are properly configured before services start, reducing runtime errors and improving reliability. Use them for kernel module loading, system configuration, prerequisite verification, and any other setup task your node-level services require. The sequential execution model and automatic retry behavior make init containers ideal for complex node preparation workflows.
