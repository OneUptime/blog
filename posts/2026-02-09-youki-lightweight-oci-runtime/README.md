# How to Configure Youki as a Lightweight OCI Runtime for Kubernetes Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Container Runtime, Performance

Description: Learn how to configure Youki, a lightweight OCI runtime written in Rust, as an alternative container runtime for Kubernetes pods with improved performance and security.

---

Youki is an OCI-compliant low-level container runtime written in Rust with the potential for faster startup times and lower memory overhead compared to runc in some workloads. As Kubernetes supports runtime handlers through the Container Runtime Interface, you can configure individual pods to use Youki for workloads where the runtime behavior fits your performance and isolation requirements.

This guide walks through installing Youki, integrating it with containerd, and configuring Kubernetes pods to use this lightweight runtime.

## Why Choose Youki Over Traditional Runtimes

Traditional low-level container runtimes like runc work well but can have different performance characteristics from newer implementations. Youki leverages Rust's memory safety guarantees and zero-cost abstractions to deliver competitive performance characteristics.

The benefits can become apparent when you run many short-lived containers on a single node. Youki's own benchmarks show lower create/start/delete time than runc for a simple local container lifecycle test, but Kubernetes pod startup time also depends on image pulls, CNI setup, admission, scheduling, and kubelet behavior.

Security also benefits from Rust's memory safety features. Safe Rust code reduces the risk of common memory safety bugs such as buffer overflows and use-after-free errors, although you should still evaluate the full runtime, dependencies, and any unsafe or FFI code paths.

## Installing Youki on Your Kubernetes Nodes

Youki requires Linux with kernel 5.3 or later. It supports cgroups through its libcgroups implementation, including v1 and v2 managers, but modern Kubernetes clusters commonly use cgroups v2 with the systemd cgroup driver. Install the runtime on each node that will run Youki containers.

```bash
# Install build dependencies

sudo apt-get update
sudo apt-get install -y \
  build-essential \
  pkg-config \
  libsystemd-dev \
  libelf-dev \
  libseccomp-dev \
  libclang-dev \
  libssl-dev

# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install just, which Youki uses for its documented build tasks
cargo install just

# Clone and build Youki
git clone https://github.com/youki-dev/youki.git
cd youki
just youki-release

# Install the binary
sudo cp youki /usr/local/bin/
sudo chmod +x /usr/local/bin/youki

# Verify installation
youki --version
```

Alternatively, download pre-built binaries from the releases page if you prefer not to compile from source.

```bash
# Download pre-built binary
curl -LO https://github.com/youki-dev/youki/releases/download/v0.6.0/youki-0.6.0-x86_64-gnu.tar.gz

# Extract and install
tar xzf youki-0.6.0-x86_64-gnu.tar.gz
sudo mv youki /usr/local/bin/
```

## Configuring containerd to Support Youki

Containerd acts as the high-level container runtime in Kubernetes. Configure it to recognize Youki as an available runtime option. Edit `/etc/containerd/config.toml` to add a new runtime handler.

```toml
version = 2

[plugins."io.containerd.grpc.v1.cri".containerd]
  default_runtime_name = "runc"

[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
  runtime_type = "io.containerd.runc.v2"

[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.youki]
  runtime_type = "io.containerd.runc.v2"
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.youki.options]
    BinaryName = "/usr/local/bin/youki"
    SystemdCgroup = true
```

The configuration defines Youki as a runtime handler while keeping runc as the default. This allows selective use of Youki for specific workloads without affecting existing deployments.

Restart containerd to apply the configuration changes.

```bash
sudo systemctl restart containerd

# Verify containerd recognizes the new runtime
sudo crictl info | grep -A 10 runtimes
```

You should see both runc and youki listed as available runtimes in the output.

## Creating a RuntimeClass for Youki

Kubernetes uses RuntimeClass resources to allow pods to select specific container runtimes. Create a RuntimeClass that maps to your Youki runtime handler.

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: youki
handler: youki
scheduling:
  nodeSelector:
    youki-enabled: "true"
```

Apply this configuration to your cluster.

```bash
kubectl apply -f youki-runtimeclass.yaml

# Verify the RuntimeClass
kubectl get runtimeclass
```

The nodeSelector ensures that pods requesting the Youki runtime only schedule on nodes where you have installed and configured it. Label your nodes accordingly.

```bash
# Label nodes that have Youki installed
kubectl label nodes node-1 youki-enabled=true
kubectl label nodes node-2 youki-enabled=true
```

## Deploying Pods with Youki Runtime

Specify the RuntimeClass in your pod specification to use Youki instead of the default runtime. This works with standalone pods, deployments, and other workload resources.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: youki-test
spec:
  runtimeClassName: youki
  containers:
  - name: nginx
    image: nginx:latest
    resources:
      requests:
        memory: "64Mi"
        cpu: "100m"
      limits:
        memory: "128Mi"
        cpu: "200m"
```

Deploy the pod and verify it uses the Youki runtime.

```bash
kubectl apply -f youki-pod.yaml

# Check pod status
kubectl get pod youki-test

# Verify runtime from node perspective
kubectl get pod youki-test -o jsonpath='{.status.containerStatuses[0].containerID}'

# SSH to the node and check the pod sandbox runtime details with crictl
sudo crictl pods --name youki-test
sudo crictl inspectp <pod-sandbox-id> | grep -i runtime
```

The Kubernetes container ID prefix normally remains the CRI implementation, such as `containerd://`. Use the pod sandbox inspection output, containerd logs, or containerd task/shim details on the node to confirm that the `youki` runtime handler is being used.

## Performance Benchmarking: Youki vs runc

Compare startup times and memory usage between Youki and runc to quantify the performance benefits. Create a test deployment that spawns multiple containers rapidly.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: performance-test
spec:
  replicas: 100
  selector:
    matchLabels:
      app: perf-test
  template:
    metadata:
      labels:
        app: perf-test
    spec:
      runtimeClassName: youki
      containers:
      - name: busybox
        image: busybox:latest
        command: ["sh", "-c", "echo Started at $(date +%s%N) && sleep 3600"]
        resources:
          requests:
            memory: "16Mi"
            cpu: "10m"
```

Measure the time until all pods reach the running state.

```bash
# Deploy with Youki
kubectl apply -f performance-test.yaml

# Time until all pods running
time kubectl wait --for=condition=ready pod -l app=perf-test --timeout=300s

# Record the timing
# real    0m12.453s  # Youki result

# Switch to runc for comparison
kubectl delete deployment performance-test
# Edit YAML to remove runtimeClassName or use runc RuntimeClass
kubectl apply -f performance-test-runc.yaml

time kubectl wait --for=condition=ready pod -l app=perf-test --timeout=300s
# real    0m18.721s  # runc result
```

Youki's upstream benchmark shows faster low-level create/start/delete time than runc for a simple local container lifecycle test, but Kubernetes pod startup gains vary by cluster because scheduling, image pulls, CNI setup, and kubelet work can dominate the total time. Treat the results above as example measurements from one environment, not a general guarantee.

## Configuring Resource Constraints with Youki

Youki fully supports cgroups v2 resource constraints. Test CPU and memory limits to ensure compatibility with your workload requirements.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: resource-constrained
spec:
  runtimeClassName: youki
  containers:
  - name: stress
    image: polinux/stress
    command: ["stress"]
    args:
      - "--vm"
      - "1"
      - "--vm-bytes"
      - "100M"
      - "--vm-hang"
      - "0"
    resources:
      requests:
        memory: "128Mi"
        cpu: "250m"
      limits:
        memory: "256Mi"
        cpu: "500m"
```

Monitor resource usage to verify that limits are enforced correctly.

```bash
kubectl apply -f resource-test.yaml

# Check actual resource usage on the node
kubectl top pod resource-constrained

# Verify cgroup constraints from the container process cgroup
ssh node-1
CONTAINER_ID=$(sudo crictl ps --name stress -q)
PID=$(sudo crictl inspect "$CONTAINER_ID" | jq -r '.info.pid')
CGROUP_PATH=$(awk -F: '$1 == "0" {print $3}' /proc/"$PID"/cgroup)
sudo cat /sys/fs/cgroup"$CGROUP_PATH"/memory.max
sudo cat /sys/fs/cgroup"$CGROUP_PATH"/cpu.max
```

Youki respects resource limits through cgroups v2 just like runc, ensuring workload isolation.

## Security Considerations with Youki

Youki inherits memory safety from Rust, but you should still apply defense-in-depth security practices. Use seccomp profiles, AppArmor, and SELinux policies just as you would with runc.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-youki
spec:
  runtimeClassName: youki
  securityContext:
    seccompProfile:
      type: RuntimeDefault
    runAsNonRoot: true
    runAsUser: 1000
  containers:
  - name: app
    image: myapp:latest
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
      readOnlyRootFilesystem: true
```

Test your security policies with Youki to ensure they function as expected. Some edge cases might behave differently between runtimes.

## Troubleshooting Common Youki Issues

When pods fail to start with Youki, check containerd logs for runtime errors.

```bash
# View containerd logs
sudo journalctl -u containerd -n 100 --no-pager | grep -i youki

# Common issue: incompatible cgroup setup or cgroup driver mismatch
# Solution: use a supported kernel and align containerd and kubelet cgroup drivers

# Check cgroups version
test -f /sys/fs/cgroup/cgroup.controllers && echo "cgroups v2" || echo "cgroups v1 or hybrid"

# If migrating a systemd-based host to cgroups v2, enable the unified hierarchy
sudo grubby --update-kernel=ALL --args="systemd.unified_cgroup_hierarchy=1"
sudo reboot
```

Another common issue involves seccomp profile compatibility. If you encounter seccomp errors, verify that your profiles work with Youki.

```bash
# Test seccomp profile
sudo youki spec
sudo youki create --bundle /path/to/bundle test-container
```

Youki provides a fast, secure alternative runtime for Kubernetes workloads. By configuring it alongside traditional runtimes through RuntimeClass, you gain flexibility to optimize performance for specific workloads while maintaining compatibility with existing deployments.
