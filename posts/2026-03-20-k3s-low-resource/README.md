# How to Configure K3s for Low-Resource Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Edge Computing, Low Resource, IoT, Embedded Systems, Kubernetes, SUSE Rancher

Description: Learn how to configure K3s for low-resource environments like Raspberry Pi, IoT gateways, and embedded systems by disabling unused components and tuning resource usage.

---

K3s was designed to run in resource-constrained environments. Current K3s guidance lists 2 CPU cores and 2 GB of RAM for a server node, while agent nodes can run with 1 CPU core and 512 MB of RAM. Recent K3s resource profiling puts a single server with a simple workload at about 1.6 GB of RAM.

---

## Minimum Requirements

| Configuration | CPU | RAM | Storage |
|---|---|---|---|
| Server node | 2 cores | 2 GB | SSD recommended |
| Agent node | 1 core | 512 MB | Workload-dependent |
| Single server with a simple workload (baseline profile) | <1 core steady-state | ~1.6 GB | SSD recommended |

---

## Step 1: Disable Unnecessary Components

```bash
# Install K3s with non-essential packaged components disabled
# Only disable local-storage if you are using another storage provisioner.
# Only disable metrics-server if you do not need `kubectl top` or autoscaling metrics.
# Only disable CoreDNS if you install another cluster DNS provider.

curl -sfL https://get.k3s.io | sh -s - \
  --disable=traefik \
  --disable=servicelb \
  --disable=local-storage \
  --disable=metrics-server \
  --disable=coredns
```

---

## Step 2: Configure Resource Limits for K3s Components

```yaml
# /etc/rancher/k3s/config.yaml
kubelet-arg:
  - "max-pods=50"                          # Reduce from default 110
  - "eviction-hard=memory.available<100Mi,nodefs.available<10%,imagefs.available<15%,nodefs.inodesFree<5%,imagefs.inodesFree<5%" # Specify all thresholds together
  - "system-reserved=cpu=200m,memory=200Mi" # Reserve resources for OS
  - "kube-reserved=cpu=200m,memory=200Mi"   # Reserve resources for Kubernetes system components
  - "image-gc-high-threshold=80"           # Start GC at 80% disk usage
  - "image-gc-low-threshold=70"            # GC until 70% disk usage

kube-controller-manager-arg:
  - "node-monitor-period=10s"              # Check node status less often than the 5s default

kube-apiserver-arg:
  - "watch-cache=false"                    # Reduce memory use on very small clusters
```

---

## Step 3: Use SQLite Instead of etcd

K3s defaults to SQLite for single-server deployments when no other datastore is configured:

```bash
# SQLite is used automatically for single-server clusters
# No extra configuration needed
# Verify:
ls /var/lib/rancher/k3s/server/db/    # SQLite datastore directory
```

For embedded HA with etcd, stick with 3 nodes minimum and adequate resources.

---

## Step 4: Reduce containerd Memory Usage

```toml
# /var/lib/rancher/k3s/agent/etc/containerd/config-v3.toml.tmpl
{{ template "base" . }}

[plugins.'io.containerd.transfer.v1.local']
  max_concurrent_downloads = 2         # Reduce concurrent image downloads

[plugins.'io.containerd.cri.v1.runtime'.containerd.runtimes.'runc'.options]
  SystemdCgroup = true
```

---

## Step 5: Set Pod Resource Limits

Configure LimitRange to prevent workloads from consuming all available resources:

```yaml
# limitrange.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: resource-limits
  namespace: default
spec:
  limits:
    - type: Container
      default:
        cpu: 200m
        memory: 128Mi
      defaultRequest:
        cpu: 50m
        memory: 64Mi
      max:
        cpu: 500m
        memory: 256Mi
```

```bash
kubectl apply -f limitrange.yaml
```

---

## Step 6: Enable Swap (for very memory-constrained devices)

Kubernetes 1.28 introduced beta swap support, and it is GA in 1.34. On current K3s releases, configure the kubelet to allow it:

```yaml
# /var/lib/rancher/k3s/agent/etc/kubelet.conf.d/10-swap.conf
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
failSwapOn: false
memorySwap:
  swapBehavior: LimitedSwap
```

```bash
# Enable swap on the host
fallocate -l 1G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## Step 7: Monitor Resource Usage

```bash
# Check K3s process memory usage
ps aux | grep k3s

# Check node resource usage (requires metrics-server)
kubectl top nodes

# Check pod resource usage (requires metrics-server)
kubectl top pods -A

# Monitor with watch
watch -n 5 kubectl top nodes
```

---

## Best Practices

- Always disable `traefik` and `servicelb` on resource-constrained nodes unless you specifically need them - they consume significant memory.
- Set `max-pods` to match the expected workload density rather than using the default 110 - this prevents K3s from accepting more pods than the node can handle.
- For IoT devices with intermittent power, make sure the `k3s` systemd service is enabled so it starts on boot; the install script enables and starts the service by default.
