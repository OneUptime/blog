# How to Add Gvisor Runtime to Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, GVisor, Container Security, Kubernetes, Sandboxing

Description: Learn how to install and configure gVisor as a container runtime on Talos Linux for sandboxed workload execution and enhanced container security.

---

gVisor is an application kernel written in Go that intercepts system calls from containerized applications and implements them in userspace, rather than passing them directly to the host kernel. This creates an additional security boundary between containers and the host system. On Talos Linux, gVisor is available as a system extension that integrates with containerd, letting you run specific workloads in sandboxed gVisor containers while other workloads run on the standard runc runtime.

This guide covers installing gVisor on Talos Linux, configuring it as a container runtime, and running sandboxed workloads in your Kubernetes cluster.

## Why Use gVisor

Standard containers share the host kernel directly. Every system call from a container goes straight to the host kernel, which means a kernel vulnerability could potentially be exploited from within a container. gVisor addresses this by providing a user-space kernel that handles most system calls without involving the host kernel.

Key benefits of gVisor:

- **Reduced attack surface** - Only a small subset of system calls reach the host kernel
- **Defense in depth** - Even if a container escape is found in gVisor, the attacker still faces the host kernel
- **Compatible with Kubernetes** - Works as a standard RuntimeClass
- **No VM overhead** - Unlike full VM isolation (like Kata Containers), gVisor is lightweight

The tradeoff is some performance overhead and reduced system call compatibility. Not every application works perfectly under gVisor, so it is best used for workloads where the security benefit outweighs the performance cost.

## Installing the gVisor Extension

### Machine Configuration

Add the gVisor extension to your Talos machine configuration.

```yaml
# worker.yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/gvisor:20240109.0-v1.7.0
```

The gVisor extension version includes the gVisor release date and the compatible Talos version. Check the Sidero Labs extensions repository for the latest version.

### Image Factory

```bash
# Create a schematic with gVisor
cat > gvisor-schematic.yaml << 'EOF'
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/gvisor
EOF

# Submit to Image Factory
SCHEMATIC_ID=$(curl -sX POST \
  --data-binary @gvisor-schematic.yaml \
  https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml" | jq -r '.id')

echo "Installer: factory.talos.dev/installer/${SCHEMATIC_ID}:v1.7.0"
```

## Applying and Upgrading

Apply the configuration and upgrade your nodes.

```bash
# For existing nodes
talosctl -n 10.0.0.20 apply-config --file worker.yaml
talosctl -n 10.0.0.20 upgrade \
  --image ghcr.io/siderolabs/installer:v1.7.0

# Wait for the node
talosctl -n 10.0.0.20 health
```

Install the extension on all worker nodes where you want to run gVisor workloads.

```bash
# Apply to all workers
for node in 10.0.0.20 10.0.0.21 10.0.0.22; do
  talosctl -n $node apply-config --file worker.yaml
  talosctl -n $node upgrade --image ghcr.io/siderolabs/installer:v1.7.0
  sleep 60
  talosctl -n $node health
done
```

## Verifying the Installation

After the nodes reboot, verify that gVisor is installed and the runtime is available.

```bash
# Check the extension is loaded
talosctl -n 10.0.0.20 get extensions

# Check for the runsc binary
talosctl -n 10.0.0.20 list /usr/local/bin/ | grep runsc

# Verify containerd configuration includes the gVisor runtime
talosctl -n 10.0.0.20 dmesg | grep gvisor
```

## Creating the RuntimeClass

Kubernetes uses RuntimeClass to map workloads to specific container runtimes. Create a RuntimeClass for gVisor.

```yaml
# gvisor-runtime-class.yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: runsc
```

```bash
kubectl apply -f gvisor-runtime-class.yaml

# Verify it was created
kubectl get runtimeclass gvisor
```

## Running Workloads with gVisor

To run a pod with gVisor, specify the `runtimeClassName` in the pod spec.

### Simple Test Pod

```yaml
# gvisor-test.yaml
apiVersion: v1
kind: Pod
metadata:
  name: gvisor-test
spec:
  runtimeClassName: gvisor
  containers:
    - name: test
      image: busybox
      command: ["sh", "-c", "echo 'Running in gVisor sandbox' && dmesg | head -5 && sleep 3600"]
```

```bash
kubectl apply -f gvisor-test.yaml
kubectl logs gvisor-test

# The dmesg output will show gVisor kernel messages instead of the host kernel
# This confirms the pod is running inside the gVisor sandbox
```

### Verifying gVisor Isolation

You can verify a pod is actually running in gVisor by checking the kernel information from inside the container.

```bash
# Exec into the gVisor pod
kubectl exec -it gvisor-test -- sh

# Check the kernel version - it should show gVisor
uname -a
# Output: Linux gvisor-test 4.4.0 #1 SMP ... gVisor

# Check dmesg - you'll see gVisor boot messages, not host kernel messages
dmesg | head -10
```

## Running a Web Application with gVisor

Here is an example of running a real web application in a gVisor sandbox.

```yaml
# nginx-gvisor.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-sandboxed
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx-sandboxed
  template:
    metadata:
      labels:
        app: nginx-sandboxed
    spec:
      runtimeClassName: gvisor
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-sandboxed
spec:
  selector:
    app: nginx-sandboxed
  ports:
    - port: 80
      targetPort: 80
```

```bash
kubectl apply -f nginx-gvisor.yaml
kubectl get pods -l app=nginx-sandboxed

# Test the service
kubectl run curl-test --image=curlimages/curl --rm -it -- \
  curl http://nginx-sandboxed
```

## Mixed Runtime Deployment

In practice, you will run some workloads with gVisor and others with the default runc runtime. This lets you apply sandboxing where it matters most.

```yaml
# Sandboxed - runs untrusted code
apiVersion: apps/v1
kind: Deployment
metadata:
  name: code-runner
spec:
  replicas: 2
  selector:
    matchLabels:
      app: code-runner
  template:
    metadata:
      labels:
        app: code-runner
    spec:
      runtimeClassName: gvisor  # Sandboxed execution
      containers:
        - name: runner
          image: my-code-runner:latest
---
# Not sandboxed - trusted internal service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: internal-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: internal-api
  template:
    metadata:
      labels:
        app: internal-api
    spec:
      # No runtimeClassName - uses default runc
      containers:
        - name: api
          image: my-api:latest
```

## Enforcing gVisor with Admission Control

You can use a policy engine to enforce gVisor for certain namespaces.

```yaml
# With Kyverno - enforce gVisor in the "untrusted" namespace
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-gvisor-runtime
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-gvisor
      match:
        resources:
          kinds:
            - Pod
          namespaces:
            - untrusted
      validate:
        message: "Pods in the 'untrusted' namespace must use the gvisor RuntimeClass"
        pattern:
          spec:
            runtimeClassName: gvisor
```

## gVisor Configuration Options

The gVisor extension on Talos uses sensible defaults, but you can tune some settings through the machine config.

```yaml
# Customize gVisor configuration via containerd config patch
machine:
  files:
    - content: |
        [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runsc]
          runtime_type = "io.containerd.runsc.v1"
        [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runsc.options]
          TypeUrl = "io.containerd.runsc.v1.options"
          ConfigPath = "/etc/gvisor/runsc.toml"
      permissions: 0o644
      path: /var/cri/conf.d/gvisor.toml
      op: create
```

## Performance Considerations

gVisor introduces overhead because it intercepts and implements system calls in userspace. The impact varies by workload:

- **CPU-bound workloads** - Minimal overhead (5-15%)
- **I/O-heavy workloads** - More noticeable overhead (20-50%)
- **System call heavy workloads** - Highest overhead

For workloads where the performance overhead is acceptable, gVisor provides a meaningful security improvement. For latency-sensitive workloads, benchmark thoroughly before deploying.

```bash
# Simple benchmark comparison
# Run with default runtime
kubectl run bench-runc --image=alpine --rm -it -- \
  sh -c "time dd if=/dev/zero of=/tmp/test bs=1M count=1000"

# Run with gVisor
kubectl run bench-gvisor --image=alpine --rm -it \
  --overrides='{"spec":{"runtimeClassName":"gvisor"}}' -- \
  sh -c "time dd if=/dev/zero of=/tmp/test bs=1M count=1000"
```

## Troubleshooting

If pods fail to start with the gVisor runtime, check these areas.

```bash
# Check pod events
kubectl describe pod <pod-name>

# Look for runtime errors
kubectl get events --sort-by='.lastTimestamp'

# Check containerd logs on the node
talosctl -n <node-ip> logs containerd | grep -i runsc

# Verify the RuntimeClass handler matches
kubectl get runtimeclass gvisor -o yaml
```

Common issues include applications that use system calls not yet implemented in gVisor, missing the RuntimeClass resource, or the extension not being installed on the node where the pod is scheduled.

## Conclusion

Adding gVisor to Talos Linux gives you a practical way to sandbox container workloads without the overhead of full VM isolation. The installation through a system extension is clean and simple, and the Kubernetes RuntimeClass integration lets you selectively apply sandboxing to the workloads that need it most. For multi-tenant clusters, environments running untrusted code, or any situation where you want an extra layer of defense between your containers and the host kernel, gVisor on Talos is a solid choice that balances security and usability.
