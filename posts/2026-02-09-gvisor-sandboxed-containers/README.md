# How to Deploy gVisor Sandboxed Containers for Untrusted Workloads on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, GVisor, Container Security, Sandboxing, Runtime

Description: Learn how to deploy gVisor sandboxed containers in Kubernetes to provide strong isolation for untrusted workloads using application kernel technology without the overhead of full virtualization.

---

Running untrusted code in containers risks host kernel exploitation. Traditional containers share the host kernel, making them vulnerable to kernel vulnerabilities and container escape attacks. gVisor provides an application kernel that intercepts syscalls, creating a security boundary without requiring full virtual machines. This guide shows you how to deploy gVisor in Kubernetes.

## Understanding gVisor Architecture

gVisor implements most of the Linux syscall surface in userspace using a component called Sentry. When a sandboxed container makes a syscall, Sentry intercepts it and handles the request without invoking the host kernel directly. This creates a strong isolation boundary where even if an attacker exploits a vulnerability in Sentry, they only gain access to the sandbox, not the host.

The architecture includes three components: runsc (the runtime), Sentry (the application kernel), and Gofer (the filesystem proxy). Containers run in their own sandbox with Sentry mediating all interactions with the host. This provides isolation comparable to VMs while maintaining container-like startup speeds and resource efficiency.

## Installing gVisor Runtime

Install runsc, the gVisor runtime compatible with OCI runtime specifications.

```bash
# Download and install runsc

ARCH=$(uname -m)
URL=https://storage.googleapis.com/gvisor/releases/release/latest/${ARCH}

wget ${URL}/runsc ${URL}/runsc.sha512 \
  ${URL}/containerd-shim-runsc-v1 ${URL}/containerd-shim-runsc-v1.sha512
sha512sum -c runsc.sha512 \
  -c containerd-shim-runsc-v1.sha512
chmod +x runsc containerd-shim-runsc-v1
sudo mv runsc containerd-shim-runsc-v1 /usr/local/bin/

# Verify installation
runsc --version
```

Configure runsc with appropriate platform and options:

```bash
# Create runsc configuration
sudo mkdir -p /etc/containerd
cat <<EOF | sudo tee /etc/containerd/runsc.toml
# Shim logging
log_path = "/var/log/runsc/%ID%/shim.log"
log_level = "debug"

[runsc_config]
# Platform: systrap (default), kvm (bare metal or nested virtualization), or ptrace (deprecated)
platform = "systrap"

# Network mode
network = "sandbox"

# Enable debug logging for troubleshooting
debug = "true"
debug-log = "/var/log/runsc/%ID%/gvisor.%COMMAND%.log"

# Filesystem configuration
file-access = "exclusive"

# Enable profiling
profile = "true"
EOF
```

## Configuring containerd for gVisor

Add gVisor as a runtime handler in containerd configuration.

```toml
# /etc/containerd/config.toml
version = 2

[plugins."io.containerd.grpc.v1.cri"]
  [plugins."io.containerd.grpc.v1.cri".containerd]
    # Default runtime
    default_runtime_name = "runc"

    [plugins."io.containerd.grpc.v1.cri".containerd.runtimes]
      # Standard runc runtime
      [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
        runtime_type = "io.containerd.runc.v2"
        [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
          SystemdCgroup = true

      # gVisor runtime with systrap platform
      [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runsc]
        runtime_type = "io.containerd.runsc.v1"
        [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runsc.options]
          TypeUrl = "io.containerd.runsc.v1.options"
          ConfigPath = "/etc/containerd/runsc.toml"

      # gVisor with KVM platform for better performance
      [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runsc-kvm]
        runtime_type = "io.containerd.runsc.v1"
        [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runsc-kvm.options]
          TypeUrl = "io.containerd.runsc.v1.options"
          ConfigPath = "/etc/containerd/runsc-kvm.toml"
```

Create KVM-specific configuration:

```bash
cat <<EOF | sudo tee /etc/containerd/runsc-kvm.toml
[runsc_config]
platform = "kvm"
network = "sandbox"
file-access = "exclusive"
EOF
```

Restart containerd:

```bash
sudo systemctl restart containerd
```

## Creating Runtime Classes for gVisor

Define Kubernetes Runtime Classes that use gVisor handlers.

```yaml
# gvisor-runtime-classes.yaml
---
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: runsc
scheduling:
  nodeSelector:
    gvisor-enabled: "true"
overhead:
  podFixed:
    cpu: 250m
    memory: 100Mi
---
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor-kvm
handler: runsc-kvm
scheduling:
  nodeSelector:
    gvisor-enabled: "true"
    kvm-enabled: "true"
overhead:
  podFixed:
    cpu: 150m
    memory: 80Mi
```

Apply the Runtime Classes:

```bash
kubectl apply -f gvisor-runtime-classes.yaml

# Label nodes that support gVisor
kubectl label node <node-name> gvisor-enabled=true

# Label nodes with KVM support
kubectl label node <node-name> kvm-enabled=true
```

## Deploying Sandboxed Workloads

Create pods that use gVisor for enhanced isolation.

```yaml
# untrusted-workload.yaml
apiVersion: v1
kind: Pod
metadata:
  name: untrusted-job
  labels:
    security-profile: untrusted
spec:
  runtimeClassName: gvisor
  containers:
  - name: worker
    image: untrusted/user-code:latest
    command:
    - sh
    - -c
    - |
      # This code runs in gVisor sandbox
      echo "Running in sandboxed environment"
      # Syscalls are intercepted by Sentry
      uname -a
      # Filesystem access mediated by Gofer
      ls -la /
    resources:
      limits:
        cpu: 1000m
        memory: 1Gi
      requests:
        cpu: 500m
        memory: 512Mi
    securityContext:
      # Additional security constraints
      allowPrivilegeEscalation: false
      runAsNonRoot: true
      runAsUser: 1000
      capabilities:
        drop:
        - ALL
  restartPolicy: Never
```

For multi-tenant platforms where users submit arbitrary code:

```yaml
# user-submitted-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: user-job-12345
  namespace: user-workloads
spec:
  backoffLimit: 1
  template:
    spec:
      runtimeClassName: gvisor
      serviceAccountName: restricted
      automountServiceAccountToken: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: user-code
        image: registry.example.com/user-jobs/job-12345:latest
        resources:
          limits:
            cpu: 2000m
            memory: 2Gi
          requests:
            cpu: 500m
            memory: 512Mi
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
      restartPolicy: Never
```

The combination of gVisor and additional security controls provides defense in depth.

## Configuring Network Isolation

gVisor handles networking differently than standard containers. Configure network policies for sandboxed workloads.

```yaml
# gvisor-network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: gvisor-workload-isolation
  namespace: user-workloads
spec:
  podSelector:
    matchLabels:
      security-profile: untrusted
  policyTypes:
  - Ingress
  - Egress
  # Deny all ingress by default
  ingress: []
  # Allow only specific egress
  egress:
  # DNS
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
    ports:
    - protocol: UDP
      port: 53
  # Allow external HTTPS only
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - 169.254.169.254/32
    ports:
    - protocol: TCP
      port: 443
```

gVisor's network sandbox adds another layer beyond Network Policies.

## Monitoring gVisor Performance

Track the performance impact of gVisor sandboxing.

```yaml
# prometheus-gvisor-metrics.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-gvisor
  namespace: monitoring
data:
  gvisor-queries.yml: |
    groups:
    - name: gvisor
      interval: 30s
      rules:
      # Track filesystem operations handled by gVisor
      - record: gvisor_fs_reads_per_second
        expr: sum by (namespace_name, pod_name) (rate(runsc_fs_reads[5m]))

      # Average filesystem read wait time in nanoseconds
      - record: gvisor_fs_read_wait_ns
        expr: |
          sum by (namespace_name, pod_name) (rate(runsc_fs_read_wait[5m])) /
          sum by (namespace_name, pod_name) (rate(runsc_fs_reads[5m]))

      # Filesystem opens by sandbox
      - record: gvisor_fs_opens_per_second
        expr: sum by (namespace_name, pod_name) (rate(runsc_fs_opens[5m]))
```

Query gVisor-specific metrics:

```bash
# Check runsc logs
sudo journalctl -u containerd | grep runsc

# Start the Prometheus metric server
sudo runsc --root=/run/containerd/runsc/k8s.io --metric-server=localhost:1337 metric-server &

# Query metrics
curl http://localhost:1337/metrics

# Compare performance between runc and runsc
kubectl top pod --selector=app=benchmark
```

## Handling gVisor Limitations

Some workloads are incompatible with gVisor. Implement compatibility checks:

```yaml
# admission-webhook for gvisor compatibility
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: gvisor-compatibility-check
webhooks:
- name: validate-gvisor.example.com
  clientConfig:
    service:
      name: gvisor-validator
      namespace: kube-system
      path: "/validate"
    caBundle: <base64-ca-cert>
  rules:
  - operations: ["CREATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
```

Validator logic:

```go
// Check for incompatible configurations
func validateGVisorPod(pod *corev1.Pod) error {
    if pod.Spec.RuntimeClassName != "gvisor" {
        return nil  // Not using gVisor
    }

    // Check for incompatible features
    if pod.Spec.HostNetwork {
        return fmt.Errorf("hostNetwork bypasses gVisor's network sandbox isolation")
    }

    if pod.Spec.HostPID {
        return fmt.Errorf("gVisor does not support hostPID")
    }

    for _, container := range pod.Spec.Containers {
        // Check for privileged containers
        if container.SecurityContext != nil &&
           container.SecurityContext.Privileged != nil &&
           *container.SecurityContext.Privileged {
            return fmt.Errorf("gVisor does not support privileged containers")
        }

        // Warn about device access
        if len(container.VolumeDevices) > 0 {
            return fmt.Errorf("gVisor has limited device support")
        }
    }

    return nil
}
```

## Optimizing gVisor Performance

Configure gVisor for better performance while maintaining security.

```toml
# /etc/containerd/runsc-optimized.toml
[runsc_config]
# Use KVM platform when available for better performance
platform = "kvm"

# Use shared root filesystem access only when external rootfs updates must be visible
file-access = "shared"

# Configure root filesystem overlay
overlay2 = "root:self"

# Enable host networking for specific workloads
network = "host"  # Use with caution

# Optimize for CPU-bound workloads
num-network-channels = 4

# Enable profiling
profile = "true"
profile-block = "/var/log/runsc/profile/"
profile-cpu = "/var/log/runsc/profile/"
profile-heap = "/var/log/runsc/profile/"
profile-mutex = "/var/log/runsc/profile/"
```

## Implementing Automated Sandbox Selection

Use admission controllers to automatically assign gVisor based on workload characteristics.

```go
// Auto-select runtime based on pod labels
func selectRuntime(pod *corev1.Pod, namespace *corev1.Namespace) string {
    labels := pod.GetLabels()

    // Check security profile
    if profile, ok := labels["security-profile"]; ok {
        switch profile {
        case "untrusted":
            return "gvisor"
        case "privileged":
            return "runc"
        }
    }

    // Check namespace annotation
    if namespace != nil && namespace.Annotations["default-runtime"] == "gvisor" {
        return "gvisor"
    }

    // Default to runc
    return "runc"
}
```

## Troubleshooting gVisor Issues

Debug common problems with gVisor sandboxed containers.

```bash
# Enable debug logging
cat <<EOF | sudo tee /etc/containerd/runsc-debug.toml
log_path = "/var/log/runsc/%ID%/shim.log"
log_level = "debug"

[runsc_config]
platform = "systrap"
debug = "true"
debug-log = "/var/log/runsc/%ID%/gvisor.%COMMAND%.log"
strace = "true"
log-packets = "true"
EOF

# View detailed logs
sudo tail -f /var/log/runsc/*/*.log

# Check sandbox status
runsc --root /run/containerd/runsc/k8s.io list

# Get detailed sandbox information
runsc --root /run/containerd/runsc/k8s.io ps <container-id>

# Test runsc directly
sudo runsc do echo "test"

# Verify KVM availability
ls -la /dev/kvm
```

Common issues include incompatible syscalls, filesystem access patterns, and networking configurations.

gVisor provides strong isolation for untrusted workloads without the overhead of full VMs. By implementing most of the Linux kernel in userspace, it creates a security boundary that protects the host from container escape attacks. While gVisor adds some performance overhead compared to standard containers, the security benefits make it essential for multi-tenant platforms and workloads processing untrusted code. Use gVisor selectively for high-risk workloads while running trusted applications in standard containers for optimal cluster efficiency.
