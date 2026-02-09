# How to Use RuntimeClassName to Select Container Runtimes Like gVisor or Kata

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Container Runtimes

Description: Learn how to use RuntimeClassName in Kubernetes to select alternative container runtimes like gVisor and Kata Containers for enhanced security isolation and workload-specific runtime requirements.

---

While most Kubernetes clusters use containerd or CRI-O as the container runtime, some workloads require stronger isolation or different runtime characteristics. The `runtimeClassName` field in pod specifications allows you to select alternative runtimes like gVisor (user-space kernel) or Kata Containers (lightweight VMs) without changing your cluster's default runtime.

This capability is essential for multi-tenant clusters, running untrusted code, or workloads requiring different security or performance profiles.

## Understanding RuntimeClass

RuntimeClass is a cluster-scoped resource that defines available container runtimes:

```bash
# List available runtime classes
kubectl get runtimeclass

# View details
kubectl describe runtimeclass <name>
```

## Setting Up gVisor Runtime

gVisor provides application kernel for containers, adding a security layer between containers and the host kernel.

Install gVisor on nodes:

```bash
# On each node (Ubuntu example)
curl -fsSL https://gvisor.dev/archive.key | sudo gpg --dearmor -o /usr/share/keyrings/gvisor-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/gvisor-archive-keyring.gpg] https://storage.googleapis.com/gvisor/releases release main" | \
  sudo tee /etc/apt/sources.list.d/gvisor.list

sudo apt-get update && sudo apt-get install -y runsc

# Configure containerd to use runsc
sudo mkdir -p /etc/containerd/
cat <<EOF | sudo tee /etc/containerd/config.toml
version = 2
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runsc]
  runtime_type = "io.containerd.runsc.v1"
EOF

sudo systemctl restart containerd
```

Create RuntimeClass for gVisor:

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: runsc
scheduling:
  nodeSelector:
    runtime: gvisor
  tolerations:
  - effect: NoSchedule
    key: runtime
    operator: Equal
    value: gvisor
```

Use it in a pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: untrusted-app
spec:
  runtimeClassName: gvisor
  containers:
  - name: app
    image: untrusted-image:latest
    resources:
      requests:
        memory: "256Mi"
        cpu: "250m"
      limits:
        memory: "512Mi"
        cpu: "500m"
```

## Setting Up Kata Containers

Kata Containers run each container in a lightweight VM for hardware-level isolation.

Install Kata on nodes:

```bash
# Install Kata runtime
sudo sh -c "echo 'deb http://download.opensuse.org/repositories/home:/katacontainers:/releases:/x86_64:/stable-2.0/xUbuntu_$(lsb_release -rs)/ /' > /etc/apt/sources.list.d/kata-containers.list"
curl -fsSL https://download.opensuse.org/repositories/home:/katacontainers:/releases:/x86_64:/stable-2.0/xUbuntu_$(lsb_release -rs)/Release.key | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/kata-containers.gpg > /dev/null

sudo apt-get update
sudo apt-get install -y kata-runtime kata-containers

# Configure containerd
cat <<EOF | sudo tee -a /etc/containerd/config.toml
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.kata]
  runtime_type = "io.containerd.kata.v2"
EOF

sudo systemctl restart containerd
```

Create RuntimeClass:

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: kata
handler: kata
overhead:
  podFixed:
    memory: "160Mi"  # VM overhead
    cpu: "250m"
scheduling:
  nodeSelector:
    runtime: kata
```

Use Kata for high-security workloads:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-payment-processor
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-processor
  template:
    metadata:
      labels:
        app: payment-processor
    spec:
      runtimeClassName: kata
      containers:
      - name: processor
        image: payment-processor:1.0
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        env:
        - name: SECURITY_LEVEL
          value: "high"
```

## Comparing Runtime Options

Different runtimes for different use cases:

```yaml
# Default runtime - best performance
apiVersion: v1
kind: Pod
metadata:
  name: standard-app
spec:
  # No runtimeClassName specified
  containers:
  - name: app
    image: webapp:1.0
---
# gVisor - good isolation, moderate performance
apiVersion: v1
kind: Pod
metadata:
  name: sandbox-app
spec:
  runtimeClassName: gvisor
  containers:
  - name: app
    image: user-code:latest
---
# Kata - strongest isolation, higher overhead
apiVersion: v1
kind: Pod
metadata:
  name: highly-isolated-app
spec:
  runtimeClassName: kata
  containers:
  - name: app
    image: untrusted-workload:1.0
```

## Multi-Tenant Cluster Example

Configure different runtimes for different tenants:

```yaml
# Tenant A - trusted workloads, default runtime
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-a
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tenant-a-app
  namespace: tenant-a
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tenant-a-app
  template:
    metadata:
      labels:
        app: tenant-a-app
    spec:
      containers:
      - name: app
        image: tenant-a-app:1.0
---
# Tenant B - untrusted workloads, gVisor
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-b
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tenant-b-app
  namespace: tenant-b
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tenant-b-app
  template:
    metadata:
      labels:
        app: tenant-b-app
    spec:
      runtimeClassName: gvisor
      containers:
      - name: app
        image: tenant-b-app:1.0
```

Enforce runtime using admission controllers:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: enforce-runtime-class
webhooks:
- name: runtime-validator.example.com
  clientConfig:
    service:
      name: runtime-validator
      namespace: kube-system
      path: "/validate"
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
```

## Monitoring Runtime Performance

Track runtime-specific metrics:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: runtime-alerts
data:
  alerts.yaml: |
    groups:
    - name: runtime-performance
      rules:
      - alert: GVisorHighLatency
        expr: container_start_time_seconds{runtime="runsc"} > 10
        labels:
          severity: warning
        annotations:
          summary: "gVisor container startup taking >10s"

      - alert: KataHighMemoryOverhead
        expr: container_memory_working_set_bytes{runtime="kata"} /
              kube_pod_container_resource_requests{resource="memory"} > 1.5
        labels:
          severity: warning
        annotations:
          summary: "Kata container using >150% of requested memory (including VM overhead)"
```

Compare performance across runtimes:

```bash
#!/bin/bash
# benchmark-runtimes.sh

for runtime in "" "gvisor" "kata"; do
    echo "Testing runtime: ${runtime:-default}"

    # Deploy test pod
    if [ -z "$runtime" ]; then
        kubectl run perf-test --image=benchmark:1.0 --restart=Never
    else
        kubectl run perf-test --image=benchmark:1.0 --restart=Never \
          --overrides="{\"spec\":{\"runtimeClassName\":\"$runtime\"}}"
    fi

    # Wait for completion
    kubectl wait --for=condition=completed pod/perf-test --timeout=300s

    # Get results
    kubectl logs perf-test

    # Cleanup
    kubectl delete pod perf-test

    sleep 5
done
```

## Troubleshooting Runtime Issues

Debug runtime problems:

```bash
# Check if runtime handler is available
kubectl get runtimeclass

# Verify node has the runtime installed
kubectl debug node/<node-name> -it --image=ubuntu
# Inside debug container:
crictl info | jq '.config.containerd.runtimes'

# Check pod events for runtime errors
kubectl describe pod <pod-name> | grep -A 10 Events
```

Common issues and solutions:

```yaml
# Issue: Runtime not found
# Solution: Ensure RuntimeClass handler matches containerd config
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: runsc  # Must match containerd runtime name exactly
---
# Issue: Insufficient resources for Kata
# Solution: Account for VM overhead
apiVersion: v1
kind: Pod
metadata:
  name: kata-pod
spec:
  runtimeClassName: kata
  containers:
  - name: app
    image: myapp:1.0
    resources:
      requests:
        memory: "1Gi"    # App needs
        cpu: "500m"
      # Kata RuntimeClass adds overhead automatically
```

## Best Practices

Use default runtime for trusted, performance-sensitive workloads. Alternative runtimes add overhead.

Choose gVisor for moderate isolation with better performance than VMs. Good for user-submitted code or multi-tenant scenarios.

Select Kata for maximum isolation when security is paramount. Accept higher resource overhead and startup latency.

Label nodes that have alternative runtimes installed. Use nodeSelector in RuntimeClass to route pods correctly.

Account for runtime overhead in resource planning. Kata especially needs extra memory for VM overhead.

Test application compatibility with alternative runtimes. Some system calls may not work in gVisor.

Monitor runtime-specific metrics separately. Performance characteristics vary significantly.

Document why each workload uses a specific runtime. Help teams understand the trade-offs.

Consider cost implications. Alternative runtimes consume more resources per pod.

Using RuntimeClassName gives you flexibility to run workloads with different security and isolation requirements in the same cluster, enabling true multi-tenancy and defense-in-depth security strategies.
