# How to Use GKE Sandbox (gVisor) for Untrusted Workload Isolation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, Kubernetes, GKE, Security

Description: Enable GKE Sandbox with gVisor runtime to run untrusted workloads with stronger isolation using application kernel sandboxing.

---

Running untrusted code in Kubernetes requires additional security boundaries beyond standard container isolation. GKE Sandbox uses gVisor, a user-space kernel that provides an extra layer of isolation by intercepting application system calls, preventing direct access to the host kernel.

This guide shows you how to enable and use GKE Sandbox for running untrusted workloads securely.

## Understanding gVisor and GKE Sandbox

gVisor implements a substantial portion of the Linux system call interface in user space. Instead of containers making syscalls directly to the host kernel, they interact with gVisor's application kernel, which provides:

**Reduced attack surface** by limiting host kernel exposure.

**Additional isolation** beyond traditional containers.

**Compatibility** with most applications without modification.

**Performance overhead** that varies by workload, especially for syscall-heavy or I/O-heavy applications.

GKE Sandbox is ideal for multi-tenant environments, CI/CD build systems, and running third-party code.

## Creating Node Pool with GKE Sandbox

Create a GKE cluster with sandbox-enabled node pool:

```bash
gcloud container clusters create sandbox-cluster \
  --zone=us-central1-a \
  --num-nodes=3 \
  --release-channel=regular

# Add sandbox node pool

gcloud container node-pools create sandbox-pool \
  --cluster=sandbox-cluster \
  --zone=us-central1-a \
  --sandbox type=gvisor \
  --num-nodes=3 \
  --machine-type=n2-standard-4 \
  --image-type=cos_containerd \
  --node-labels=workload=untrusted
```

The `--sandbox type=gvisor` flag enables gVisor runtime on the node pool. GKE Sandbox requires the `cos_containerd` node image type, and Standard clusters must keep at least one non-sandbox node pool for GKE-managed system workloads.

Using Terraform:

```hcl
# gke-sandbox.tf
resource "google_container_cluster" "sandbox" {
  name     = "sandbox-cluster"
  location = "us-central1-a"

  initial_node_count = 1
  remove_default_node_pool = true

  release_channel {
    channel = "REGULAR"
  }
}

resource "google_container_node_pool" "sandbox_pool" {
  name       = "sandbox-pool"
  cluster    = google_container_cluster.sandbox.name
  location   = "us-central1-a"
  node_count = 3

  node_config {
    machine_type = "n2-standard-4"
    image_type   = "COS_CONTAINERD"

    # Enable gVisor sandbox
    sandbox_config {
      type = "GVISOR"
    }

    labels = {
      workload = "untrusted"
    }

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }
}

resource "google_container_node_pool" "system_pool" {
  name       = "system-pool"
  cluster    = google_container_cluster.sandbox.name
  location   = "us-central1-a"
  node_count = 1

  node_config {
    machine_type = "e2-medium"
  }
}
```

## Running Workloads with gVisor

Deploy a pod to sandbox nodes:

```yaml
# untrusted-workload.yaml
apiVersion: v1
kind: Pod
metadata:
  name: untrusted-app
spec:
  runtimeClassName: gvisor
  nodeSelector:
    workload: untrusted
  containers:
  - name: app
    image: nginx:latest
    resources:
      requests:
        cpu: "500m"
        memory: "512Mi"
      limits:
        cpu: "1000m"
        memory: "1Gi"
```

The `runtimeClassName: gvisor` tells Kubernetes to use gVisor runtime.

For deployments:

```yaml
# deployment-sandbox.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: build-workers
spec:
  replicas: 5
  selector:
    matchLabels:
      app: build-worker
  template:
    metadata:
      labels:
        app: build-worker
    spec:
      runtimeClassName: gvisor
      nodeSelector:
        workload: untrusted
      containers:
      - name: worker
        image: builder:latest
        command: ["/usr/bin/build-agent"]
```

## Verifying gVisor Runtime

Check that pods run with gVisor:

```bash
# Deploy test pod
kubectl apply -f untrusted-workload.yaml

# Verify runtime class from the Kubernetes API
kubectl get pod untrusted-app -o jsonpath='{.spec.runtimeClassName}'

# Should show:
# gvisor
```

Check node configuration:

```bash
# Get node
NODE=$(kubectl get pod untrusted-app -o jsonpath='{.spec.nodeName}')

# SSH to node (for debugging)
gcloud compute ssh $NODE --zone=us-central1-a

# Check kubelet logs for runsc messages
sudo journalctl -u kubelet | grep runsc
```

## Compatibility Considerations

Most applications work with gVisor, but some have limitations:

**Not supported:**
- Direct hardware access
- Kernel modules
- Some eBPF programs
- HostPath volumes
- Privileged containers

**Limited support:**
- Some file system features
- Performance-critical applications

Test applications before production use:

```yaml
# test-compatibility.yaml
apiVersion: v1
kind: Pod
metadata:
  name: compatibility-test
spec:
  runtimeClassName: gvisor
  containers:
  - name: test
    image: myapp:latest
    command: ["/app/run-tests.sh"]
```

## Performance Tuning

gVisor adds overhead. Optimize with:

**Increase CPU allocation** for compute-intensive workloads:

```yaml
resources:
  requests:
    cpu: "2"
  limits:
    cpu: "4"
```

GKE Sandbox uses an optimized gVisor configuration and doesn't expose gVisor platform selection through the `gcloud container node-pools create --sandbox` flag.

## Running CI/CD Builds with gVisor

Secure build environment example:

```yaml
# ci-build-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: test-job
spec:
  template:
    spec:
      runtimeClassName: gvisor
      nodeSelector:
        workload: untrusted
      restartPolicy: Never
      containers:
      - name: test-runner
        image: python:3.12-alpine
        command:
        - /bin/sh
        - -c
        - |
          python -c 'print("running untrusted test workload")'
```

Note: HostPath volumes, including mounting the host Docker socket, are not supported with GKE Sandbox. Use kaniko instead:

```yaml
# kaniko-build.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: kaniko-build
spec:
  template:
    spec:
      runtimeClassName: gvisor
      nodeSelector:
        workload: untrusted
      restartPolicy: Never
      containers:
      - name: kaniko
        image: gcr.io/kaniko-project/executor:latest
        args:
        - --dockerfile=Dockerfile
        - --context=gs://my-bucket/source
        - --destination=gcr.io/myproject/myimage:tag
```

## Multi-Tenancy with gVisor

Isolate tenant workloads:

```yaml
# tenant-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-a
  labels:
    tenant: tenant-a
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-quota
  namespace: tenant-a
spec:
  hard:
    requests.cpu: "10"
    requests.memory: "20Gi"
    pods: "50"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tenant-app
  namespace: tenant-a
spec:
  replicas: 3
  selector:
    matchLabels:
      app: tenant-app
  template:
    metadata:
      labels:
        app: tenant-app
    spec:
      runtimeClassName: gvisor
      nodeSelector:
        workload: untrusted
      containers:
      - name: app
        image: tenant-a/app:latest
```

## Monitoring Sandboxed Workloads

Check sandboxed Pods:

```bash
# List pods with their RuntimeClass
kubectl get pods -o jsonpath=$'{range .items[*]}{.metadata.name}: {.spec.runtimeClassName}\n{end}'
```

View sandbox events:

```bash
# Check pod events
kubectl describe pod untrusted-app

# View gVisor messages in node logs
NODE=$(kubectl get pod untrusted-app -o jsonpath='{.spec.nodeName}')
gcloud compute ssh $NODE --zone=us-central1-a
sudo journalctl -u kubelet | grep runsc
```

## Troubleshooting

If pods fail to start:

```bash
# Check runtime class
kubectl get runtimeclass

# Should show gvisor
NAME     HANDLER   AGE
gvisor   runsc     1d

# Check pod status
kubectl describe pod untrusted-app

# Common error: "RuntimeHandler not supported"
# Solution: Ensure node pool has sandbox enabled
```

If application behaves incorrectly:

```bash
# Check for unsupported syscalls
kubectl logs untrusted-app

# Run in debug mode
kubectl exec -it untrusted-app -- /bin/sh

# Check gVisor logs on node
gcloud compute ssh NODE --zone=us-central1-a
sudo journalctl -u kubelet | grep runsc
```

## Comparing with Kata Containers

gVisor vs Kata Containers:

**gVisor:**
- User-space kernel
- Lower overhead
- Better compatibility
- Native GKE support

**Kata:**
- VM-based isolation
- Higher overhead
- Stronger isolation
- Requires custom setup on GKE

Use gVisor for most untrusted workloads on GKE.

## Conclusion

GKE Sandbox with gVisor provides additional security isolation for running untrusted workloads in Kubernetes. By intercepting system calls in user space, gVisor reduces the attack surface against the host kernel while maintaining reasonable compatibility with most applications.

The solution works well for multi-tenant environments, CI/CD systems, and running third-party code where trust boundaries need strengthening beyond standard container isolation. While there is performance overhead, the security benefits make gVisor valuable for workloads handling untrusted input or code.
