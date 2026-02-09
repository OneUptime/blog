# How to Configure containerd Runtime Classes for Mixed Workload Isolation in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, containerd, Container Runtime, Security, Workload Isolation

Description: Learn how to configure containerd Runtime Classes to isolate different workload types using multiple runtime handlers for enhanced security and performance in Kubernetes clusters.

---

Running trusted and untrusted workloads on the same Kubernetes cluster requires different levels of isolation. Runtime Classes enable assigning different runtime handlers to pods, allowing you to use standard runc for trusted workloads while applying stricter isolation for sensitive applications. This guide shows you how to configure containerd Runtime Classes effectively.

## Understanding Runtime Classes

Runtime Classes provide a way to select the container runtime configuration used to run a pod's containers. Each Runtime Class references a runtime handler configured in containerd. Handlers can use different runtimes like runc, gVisor, or Kata Containers, or apply different runtime configurations to the same runtime.

This flexibility enables running multiple isolation profiles on a single cluster. Development workloads might use standard runc, while production applications use runc with additional security constraints, and untrusted workloads run in sandboxed environments. Pods specify which Runtime Class to use through the `runtimeClassName` field in their spec.

## Configuring containerd Runtime Handlers

Start by configuring multiple runtime handlers in containerd. This creates the backend configurations that Runtime Classes will reference.

```toml
# /etc/containerd/config.toml
version = 2

# Default configuration
[plugins."io.containerd.grpc.v1.cri"]
  sandbox_image = "registry.k8s.io/pause:3.9"

# Standard runtime for trusted workloads
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
  runtime_type = "io.containerd.runc.v2"
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
    SystemdCgroup = true
    # Standard configuration

# Hardened runtime for production workloads
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc-production]
  runtime_type = "io.containerd.runc.v2"
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc-production.options]
    SystemdCgroup = true
    # Enforce stricter resource limits
    CpuQuota = 100000
    # Disable privileged containers
    NoNewPrivileges = true
    # Enable SELinux enforcement
    SelinuxLabel = "system_u:system_r:container_runtime_t:s0"

# Isolated runtime for untrusted workloads
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc-isolated]
  runtime_type = "io.containerd.runc.v2"
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc-isolated.options]
    SystemdCgroup = true
    # Maximum isolation settings
    NoNewPrivileges = true
    # Drop all capabilities by default
    DefaultCapabilities = []
    # Mask sensitive paths
    MaskedPaths = [
      "/proc/acpi",
      "/proc/kcore",
      "/proc/keys",
      "/proc/latency_stats",
      "/proc/timer_list",
      "/proc/timer_stats",
      "/proc/sched_debug",
      "/proc/scsi",
      "/sys/firmware",
      "/sys/devices/virtual/powercap"
    ]
    # Set readonly paths
    ReadonlyPaths = [
      "/proc/asound",
      "/proc/bus",
      "/proc/fs",
      "/proc/irq",
      "/proc/sys",
      "/proc/sysrq-trigger"
    ]

# Development runtime with relaxed settings
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc-dev]
  runtime_type = "io.containerd.runc.v2"
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc-dev.options]
    SystemdCgroup = true
    # Allow privileged for debugging
    # More permissive settings for development
```

Restart containerd after updating the configuration:

```bash
sudo systemctl restart containerd
```

## Creating Runtime Classes

Define Runtime Classes that reference the containerd handlers you configured.

```yaml
# runtime-classes.yaml
---
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: runc-standard
handler: runc
scheduling:
  nodeSelector:
    runtime: standard
  tolerations:
  - effect: NoSchedule
    key: runtime
    value: standard
---
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: runc-production
handler: runc-production
scheduling:
  nodeSelector:
    workload-type: production
  tolerations:
  - effect: NoSchedule
    key: workload-type
    value: production
overhead:
  # Account for additional overhead from security features
  podFixed:
    cpu: "50m"
    memory: "20Mi"
---
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: runc-isolated
handler: runc-isolated
scheduling:
  nodeSelector:
    isolation: high
  tolerations:
  - effect: NoSchedule
    key: isolation
    value: high
overhead:
  podFixed:
    cpu: "100m"
    memory: "50Mi"
---
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: runc-development
handler: runc-dev
scheduling:
  nodeSelector:
    environment: development
```

Apply the Runtime Classes:

```bash
kubectl apply -f runtime-classes.yaml
```

## Assigning Runtime Classes to Pods

Use Runtime Classes by specifying the `runtimeClassName` field in pod specifications.

```yaml
# production-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      runtimeClassName: runc-production
      containers:
      - name: api
        image: mycompany/api:v1.2.3
        ports:
        - containerPort: 8080
        resources:
          limits:
            cpu: "1000m"
            memory: "1Gi"
          requests:
            cpu: "500m"
            memory: "512Mi"
        securityContext:
          allowPrivilegeEscalation: false
          runAsNonRoot: true
          runAsUser: 1000
          capabilities:
            drop:
            - ALL
```

The pod will use the hardened runtime configuration defined in the `runc-production` handler.

## Implementing Namespace-Level Defaults

Use Pod Security Standards or admission controllers to enforce Runtime Class usage per namespace.

```yaml
# namespace-with-runtime-enforcement.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: untrusted-workloads
  labels:
    pod-security.kubernetes.io/enforce: restricted
    runtime-class-required: "true"
---
# Admission webhook configuration to enforce runtime class
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: runtime-class-injector
webhooks:
- name: inject-runtime-class.example.com
  clientConfig:
    service:
      name: runtime-class-webhook
      namespace: kube-system
      path: "/mutate"
    caBundle: <base64-encoded-ca-cert>
  rules:
  - operations: ["CREATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  namespaceSelector:
    matchLabels:
      runtime-class-required: "true"
  admissionReviewVersions: ["v1"]
  sideEffects: None
```

Create a webhook that injects the appropriate Runtime Class:

```go
// webhook/main.go
package main

import (
    "encoding/json"
    "net/http"

    corev1 "k8s.io/api/core/v1"
    admissionv1 "k8s.io/api/admission/v1"
)

func mutatePod(ar admissionv1.AdmissionReview) *admissionv1.AdmissionResponse {
    pod := &corev1.Pod{}
    if err := json.Unmarshal(ar.Request.Object.Raw, pod); err != nil {
        return &admissionv1.AdmissionResponse{
            Allowed: false,
            Result: &metav1.Status{
                Message: err.Error(),
            },
        }
    }

    // Skip if runtime class already set
    if pod.Spec.RuntimeClassName != nil {
        return &admissionv1.AdmissionResponse{Allowed: true}
    }

    // Determine runtime class based on namespace and labels
    var runtimeClass string
    namespace := ar.Request.Namespace

    switch namespace {
    case "production":
        runtimeClass = "runc-production"
    case "untrusted-workloads":
        runtimeClass = "runc-isolated"
    case "development":
        runtimeClass = "runc-development"
    default:
        runtimeClass = "runc-standard"
    }

    // Create patch to add runtime class
    patch := []map[string]interface{}{
        {
            "op":    "add",
            "path":  "/spec/runtimeClassName",
            "value": runtimeClass,
        },
    }

    patchBytes, err := json.Marshal(patch)
    if err != nil {
        return &admissionv1.AdmissionResponse{
            Allowed: false,
            Result: &metav1.Status{
                Message: err.Error(),
            },
        }
    }

    return &admissionv1.AdmissionResponse{
        Allowed: true,
        Patch:   patchBytes,
        PatchType: func() *admissionv1.PatchType {
            pt := admissionv1.PatchTypeJSONPatch
            return &pt
        }(),
    }
}
```

This automatically assigns the correct Runtime Class based on namespace policy.

## Monitoring Runtime Class Usage

Track which Runtime Classes are being used and their resource consumption.

```bash
# List all pods with their runtime classes
kubectl get pods --all-namespaces -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
RUNTIME_CLASS:.spec.runtimeClassName,\
NODE:.spec.nodeName

# Count pods per runtime class
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | .spec.runtimeClassName // "default"' | \
  sort | uniq -c

# Check runtime handler stats from containerd
sudo crictl stats --runtime-class=runc-production
```

Monitor containerd metrics to track runtime-specific resource usage:

```yaml
# prometheus-containerd-monitor.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'containerd'
      static_configs:
      - targets: ['localhost:1338']
      metric_relabel_configs:
      - source_labels: [__name__]
        regex: 'containerd_runtime_.*'
        action: keep
      - source_labels: [runtime]
        target_label: runtime_class
```

## Optimizing Runtime Configurations

Tune runtime handler configurations based on workload characteristics.

```toml
# Performance-optimized runtime for batch jobs
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc-batch]
  runtime_type = "io.containerd.runc.v2"
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc-batch.options]
    SystemdCgroup = true
    # Allow higher CPU usage for batch workloads
    CpuQuota = 400000
    # Optimize for throughput
    CpuPeriod = 100000
    # Larger memory limits
    MemoryLimit = 8589934592  # 8GB

# Latency-optimized runtime for real-time workloads
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc-realtime]
  runtime_type = "io.containerd.runc.v2"
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc-realtime.options]
    SystemdCgroup = true
    # CPU pinning for predictable performance
    CpuQuota = 200000
    CpuPeriod = 50000  # Shorter period for lower latency
    # Reserve CPU cores
    CpusetCpus = "4-7"
    # Lock memory to prevent swapping
    MemorySwap = 0
```

Create corresponding Runtime Classes:

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: runc-batch
handler: runc-batch
scheduling:
  nodeSelector:
    workload-profile: batch
---
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: runc-realtime
handler: runc-realtime
scheduling:
  nodeSelector:
    workload-profile: realtime
```

## Implementing Runtime Class Policies

Use Open Policy Agent or Kyverno to enforce Runtime Class selection policies.

```yaml
# kyverno-runtime-class-policy.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-runtime-class
spec:
  validationFailureAction: enforce
  background: false
  rules:
  - name: production-requires-hardened-runtime
    match:
      any:
      - resources:
          kinds:
          - Pod
          namespaces:
          - production
    validate:
      message: "Production pods must use runc-production runtime class"
      pattern:
        spec:
          runtimeClassName: "runc-production"

  - name: untrusted-requires-isolated-runtime
    match:
      any:
      - resources:
          kinds:
          - Pod
          selector:
            matchLabels:
              security.policy: untrusted
    validate:
      message: "Untrusted workloads must use runc-isolated runtime class"
      pattern:
        spec:
          runtimeClassName: "runc-isolated"
```

This ensures pods use appropriate runtime isolation based on policy.

## Testing Runtime Class Behavior

Verify Runtime Classes work correctly by testing container capabilities and restrictions.

```bash
#!/bin/bash
# test-runtime-classes.sh

echo "Testing standard runtime..."
kubectl run test-standard --image=alpine --restart=Never \
  --overrides='{"spec":{"runtimeClassName":"runc-standard"}}' \
  -- sh -c "cat /proc/self/status | grep Cap"

echo "Testing production runtime..."
kubectl run test-production --image=alpine --restart=Never \
  --overrides='{"spec":{"runtimeClassName":"runc-production"}}' \
  -- sh -c "cat /proc/self/status | grep Cap"

echo "Testing isolated runtime..."
kubectl run test-isolated --image=alpine --restart=Never \
  --overrides='{"spec":{"runtimeClassName":"runc-isolated"}}' \
  -- sh -c "cat /proc/self/status | grep Cap"

# Check which capabilities are available
echo "Checking available capabilities..."
for pod in test-standard test-production test-isolated; do
  echo "Pod: $pod"
  kubectl logs $pod
  kubectl delete pod $pod
done
```

Compare capabilities to verify isolation differences between runtime configurations.

## Troubleshooting Runtime Class Issues

Debug problems with Runtime Class assignments and execution.

```bash
# Check if runtime class exists
kubectl get runtimeclass

# Verify containerd configuration
sudo crictl info | jq '.config.containerd.runtimes'

# Check pod events for runtime errors
kubectl describe pod <pod-name>

# View containerd logs for runtime-specific errors
sudo journalctl -u containerd -f --grep "runtime="

# Test runtime handler directly
sudo ctr run --runtime io.containerd.runc.v2 \
  --runtime-config-path /etc/containerd/config.toml \
  docker.io/library/alpine:latest test-container sh
```

Common issues include misconfigured handler names, missing runtime binaries, or incorrect node selectors preventing pod scheduling.

Runtime Classes provide the flexibility to run diverse workloads on the same Kubernetes cluster while maintaining appropriate isolation boundaries. By configuring multiple containerd runtime handlers and mapping them to Runtime Classes, you can optimize performance for trusted workloads while enforcing strict security for untrusted applications. This approach enables consolidating infrastructure without compromising security or performance requirements.
