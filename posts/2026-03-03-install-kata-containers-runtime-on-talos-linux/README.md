# How to Install Kata Containers Runtime on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kata Containers, VM Isolation, Security, Kubernetes

Description: A detailed guide to installing Kata Containers on Talos Linux for running containers inside lightweight virtual machines with hardware-level isolation.

---

Kata Containers takes a different approach to container security compared to traditional runtimes. Instead of sharing the host kernel with containers, Kata spins up a lightweight virtual machine for each pod, giving every workload its own dedicated kernel. This hardware-level isolation means that even if an attacker breaks out of the container, they are still trapped inside a VM. On Talos Linux, Kata Containers can be installed and used alongside the standard runc runtime, letting you choose VM-level isolation for specific workloads that handle sensitive data or run untrusted code.

This guide covers installing Kata Containers on Talos Linux, configuring it as a Kubernetes runtime, and running isolated workloads.

## How Kata Containers Works

Kata Containers creates a lightweight VM for each Kubernetes pod. Inside that VM, the container runs as you would expect, but the boundary between the container and the host is a full hypervisor (QEMU or Cloud Hypervisor) rather than just Linux namespaces and cgroups.

The architecture looks like this:

- **containerd** receives a request to create a pod
- **kata-runtime** starts a lightweight VM using QEMU or Cloud Hypervisor
- Inside the VM, a minimal guest kernel boots
- The container image is mounted inside the VM
- The container process runs inside the VM's kernel

This provides stronger isolation than namespace-based containers but with more overhead than something like gVisor.

## Prerequisites

Kata Containers requires hardware virtualization support on the host. For Talos nodes, this means:

- Intel VT-x or AMD-V enabled in the BIOS
- Nested virtualization enabled if running Talos itself in a VM
- At least 4 GB of RAM per node (Kata VMs consume additional memory)

Check virtualization support on your nodes.

```bash
# Verify hardware virtualization is available
talosctl -n <node-ip> read /proc/cpuinfo | grep -c "vmx\|svm"

# Check if /dev/kvm exists
talosctl -n <node-ip> ls /dev/kvm
```

If `/dev/kvm` does not exist, hardware virtualization may not be enabled in the BIOS or, if Talos is running in a VM, nested virtualization is not enabled on the hypervisor.

## Installing the Kata Containers Extension

### Machine Configuration

Add the Kata Containers extension to your machine configuration.

```yaml
# worker.yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/kata-containers:3.2.0-v1.7.0
  kernel:
    modules:
      - name: vhost_net
      - name: vhost_vsock
```

The `vhost_net` and `vhost_vsock` modules improve networking performance for Kata VMs.

### Image Factory

```bash
# Create a schematic
cat > kata-schematic.yaml << 'EOF'
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/kata-containers
EOF

# Submit to Image Factory
SCHEMATIC_ID=$(curl -sX POST \
  --data-binary @kata-schematic.yaml \
  https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml" | jq -r '.id')

echo "Installer: factory.talos.dev/installer/${SCHEMATIC_ID}:v1.7.0"
```

## Applying the Extension

Apply and upgrade your nodes to install the extension.

```bash
# Apply configuration
talosctl -n 10.0.0.20 apply-config --file worker.yaml

# Upgrade to install extensions
talosctl -n 10.0.0.20 upgrade \
  --image ghcr.io/siderolabs/installer:v1.7.0

# Verify the node is healthy
talosctl -n 10.0.0.20 health
```

## Verifying the Installation

Check that Kata Containers is properly installed.

```bash
# Verify the extension is loaded
talosctl -n 10.0.0.20 get extensions

# Check that kata-runtime is available
talosctl -n 10.0.0.20 list /usr/local/bin/ | grep kata

# Verify the guest kernel and image are present
talosctl -n 10.0.0.20 list /usr/share/kata-containers/

# Check that KVM device is accessible
talosctl -n 10.0.0.20 ls /dev/kvm

# Look at dmesg for Kata-related messages
talosctl -n 10.0.0.20 dmesg | grep -i kata
```

## Creating the RuntimeClass

Create a Kubernetes RuntimeClass that maps to the Kata runtime.

```yaml
# kata-runtime-class.yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: kata
handler: kata
```

```bash
kubectl apply -f kata-runtime-class.yaml
kubectl get runtimeclass
```

If you want to use Cloud Hypervisor instead of QEMU (for better performance), create a separate RuntimeClass.

```yaml
# kata-clh-runtime-class.yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: kata-clh
handler: kata-clh
```

## Running Your First Kata Pod

Deploy a test pod to verify Kata is working.

```yaml
# kata-test.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kata-test
spec:
  runtimeClassName: kata
  containers:
    - name: test
      image: busybox
      command: ["sh", "-c", "uname -a && cat /proc/cpuinfo | head -20 && sleep 3600"]
```

```bash
kubectl apply -f kata-test.yaml

# Check the logs
kubectl logs kata-test

# The kernel version will be different from the host
# because the container runs inside its own VM
```

You can verify the isolation by comparing the kernel information.

```bash
# Check the kernel inside the Kata pod
kubectl exec kata-test -- uname -r
# Output: something like 5.15.x (the Kata guest kernel)

# Compare with the host kernel
talosctl -n 10.0.0.20 read /proc/version
# Output: Talos kernel version (different from the pod)
```

## Running a Web Application with Kata

Here is a more practical example of running an nginx deployment with Kata isolation.

```yaml
# nginx-kata.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-isolated
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx-isolated
  template:
    metadata:
      labels:
        app: nginx-isolated
    spec:
      runtimeClassName: kata
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 1
              memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-isolated
spec:
  selector:
    app: nginx-isolated
  ports:
    - port: 80
      targetPort: 80
```

```bash
kubectl apply -f nginx-kata.yaml
kubectl get pods -l app=nginx-isolated

# Verify the service is accessible
kubectl run curl-test --image=curlimages/curl --rm -it -- \
  curl http://nginx-isolated
```

## Resource Management

Kata pods consume more resources than standard containers because each pod runs in its own VM. Plan your resource allocations accordingly.

```yaml
# Resource-aware Kata deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kata-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kata-app
  template:
    metadata:
      labels:
        app: kata-app
    spec:
      runtimeClassName: kata
      containers:
        - name: app
          image: my-app:latest
          resources:
            requests:
              # Account for VM overhead (~128MB base memory)
              cpu: 500m
              memory: 384Mi
            limits:
              cpu: 2
              memory: 1Gi
```

Each Kata VM has a base memory overhead of approximately 128 MB. Factor this into your resource planning.

## Kata Configuration

The Kata runtime can be configured through its configuration file. On Talos, you can provide a custom configuration through the machine config.

```yaml
machine:
  files:
    - content: |
        [hypervisor.qemu]
        path = "/usr/bin/qemu-system-x86_64"
        kernel = "/usr/share/kata-containers/vmlinux.container"
        image = ""
        initrd = "/usr/share/kata-containers/kata-containers-initrd.img"
        default_vcpus = 1
        default_memory = 256
        enable_iothreads = true

        [runtime]
        enable_debug = false
        internetworking_model = "tcfilter"
        sandbox_cgroup_only = true
      permissions: 0o644
      path: /etc/kata-containers/configuration.toml
      op: create
```

## Comparing Kata vs gVisor vs runc

Understanding when to use each runtime helps you make the right choice.

**runc (default):**
- Lowest overhead
- No additional isolation beyond Linux namespaces/cgroups
- Best for trusted workloads

**gVisor:**
- Moderate overhead
- User-space kernel intercepts system calls
- Good for untrusted workloads that are not I/O intensive

**Kata Containers:**
- Highest overhead
- Full VM isolation with dedicated kernel
- Best for high-security requirements where isolation is the top priority

You can run all three on the same cluster by installing both extensions and creating the appropriate RuntimeClasses.

```yaml
# All three RuntimeClasses
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: runsc
---
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: kata
handler: kata
# runc is the default - no RuntimeClass needed
```

## Troubleshooting Kata Issues

If Kata pods fail to start, diagnose the issue.

```bash
# Check pod events
kubectl describe pod <pod-name>

# Look for common errors:
# - "cannot create VM" - KVM not available
# - "no suitable hypervisor" - missing QEMU binary
# - "out of memory" - not enough RAM for the VM

# Check containerd logs
talosctl -n <node-ip> logs containerd | grep -i kata

# Verify KVM access
talosctl -n <node-ip> ls /dev/kvm

# Check vhost modules
talosctl -n <node-ip> read /proc/modules | grep vhost
```

The most common issue is missing KVM support. Make sure hardware virtualization is enabled and, if Talos is running in a VM, nested virtualization is configured on the hypervisor.

## Conclusion

Kata Containers on Talos Linux provides the strongest container isolation available, running each pod in its own lightweight VM. While the resource overhead is higher than gVisor or runc, the hardware-level isolation is unmatched for workloads that require it. The Talos system extension makes installation straightforward, and the Kubernetes RuntimeClass integration lets you apply VM isolation selectively to the workloads that need it most. For multi-tenant environments, compliance-driven deployments, or situations where you are running untrusted code, Kata Containers on Talos is a robust security option.
