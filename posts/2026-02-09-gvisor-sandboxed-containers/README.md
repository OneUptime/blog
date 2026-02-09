# How to Deploy gVisor Sandboxed Containers for Untrusted Workloads on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, gVisor, Container Security, Sandboxing, Runtime

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

wget ${URL}/runsc ${URL}/runsc.sha512
sha512sum -c runsc.sha512
chmod +x runsc
sudo mv runsc /usr/local/bin/

# Verify installation
runsc --version
```

Configure runsc with appropriate platform and options:

```bash
# Create runsc configuration
sudo mkdir -p /etc/runsc
cat <<EOF | sudo tee /etc/runsc/config.toml
# Platform: ptrace (compatible) or kvm (faster, requires nested virtualization)
platform = "ptrace"

# Network mode
network = "sandbox"

# Enable debug logging for troubleshooting
debug-log = "/var/log/runsc/%ID%/"

# Filesystem configuration
file-access = "exclusive"

# Enable profiling
profile = true
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

      # gVisor runtime with ptrace platform
      [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runsc]
        runtime_type = "io.containerd.runsc.v1"
        [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runsc.options]
          TypeUrl = "io.containerd.runsc.v1.options"
          ConfigPath = "/etc/runsc/config.toml"

      # gVisor with KVM platform for better performance
      [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runsc-kvm]
        runtime_type = "io.containerd.runsc.v1"
        [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runsc-kvm.options]
          TypeUrl = "io.containerd.runsc.v1.options"
          ConfigPath = "/etc/runsc/config-kvm.toml"
```

Create KVM-specific configuration:

```bash
cat <<EOF | sudo tee /etc/runsc/config-kvm.toml
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
      backoffLimit: 1
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
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
  # Allow external HTTPS only
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443
  # Block access to metadata service
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - 169.254.169.254/32
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
      # Track syscall overhead
      - record: gvisor_syscall_latency_seconds
        expr: histogram_quantile(0.99, rate(runsc_syscall_duration_seconds_bucket[5m]))

      # Memory overhead
      - record: gvisor_memory_overhead_bytes
        expr: |
          container_memory_usage_bytes{runtime_class="gvisor"} -
          container_spec_memory_limit_bytes{runtime_class="gvisor"}

      # CPU overhead
      - record: gvisor_cpu_overhead_ratio
        expr: |
          rate(container_cpu_usage_seconds_total{runtime_class="gvisor"}[5m]) /
          container_spec_cpu_quota{runtime_class="gvisor"}
```

Query gVisor-specific metrics:

```bash
# Check runsc logs
sudo journalctl -u containerd | grep runsc

# View detailed sandbox metrics
runsc --root /run/containerd/runsc/k8s.io metric list

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
        return fmt.Errorf("gVisor does not support hostNetwork")
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
# /etc/runsc/config-optimized.toml
# Use KVM platform when available for better performance
platform = "kvm"

# Enable direct IO for better filesystem performance
file-access = "shared"

# Configure overlay filesystem
overlay = true

# Enable host networking for specific workloads
network = "host"  # Use with caution

# Optimize for CPU-bound workloads
num-network-channels = 4

# Enable profiling
profile = true
profile-block = "/var/log/runsc/profile/"
profile-cpu = "/var/log/runsc/profile/"
profile-heap = "/var/log/runsc/profile/"
profile-mutex = "/var/log/runsc/profile/"
```

## Implementing Automated Sandbox Selection

Use admission controllers to automatically assign gVisor based on workload characteristics.

```go
// Auto-select runtime based on pod labels
func selectRuntime(pod *corev1.Pod) string {
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
    namespace := pod.GetNamespace()
    if ns.Annotations["default-runtime"] == "gvisor" {
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
cat <<EOF | sudo tee /etc/runsc/config-debug.toml
platform = "ptrace"
debug = true
debug-log = "/var/log/runsc/debug/"
strace = true
log-packets = true
EOF

# View detailed logs
sudo tail -f /var/log/runsc/debug/*.log

# Check sandbox status
runsc --root /run/containerd/runsc/k8s.io list

# Get detailed sandbox information
runsc --root /run/containerd/runsc/k8s.io ps <container-id>

# Test syscall compatibility
runsc --platform=ptrace do echo "test"

# Verify KVM availability
ls -la /dev/kvm
```

Common issues include incompatible syscalls, filesystem access patterns, and networking configurations.

gVisor provides strong isolation for untrusted workloads without the overhead of full VMs. By implementing most of the Linux kernel in userspace, it creates a security boundary that protects the host from container escape attacks. While gVisor adds some performance overhead compared to standard containers, the security benefits make it essential for multi-tenant platforms and workloads processing untrusted code. Use gVisor selectively for high-risk workloads while running trusted applications in standard containers for optimal cluster efficiency.
