# How to Configure Istio for CRI-O Runtime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, CRI-O, Container Runtime, Kubernetes, OpenShift

Description: How to set up and configure Istio on Kubernetes clusters using CRI-O container runtime, commonly found in OpenShift environments.

---

CRI-O is a lightweight container runtime built specifically for Kubernetes. Unlike Docker or even containerd, CRI-O does nothing beyond what Kubernetes needs. It implements the Container Runtime Interface (CRI) and nothing else. You'll most commonly encounter CRI-O on OpenShift clusters, where it's the default runtime, but it's also used in some vanilla Kubernetes setups. Here's how to get Istio working smoothly with CRI-O.

## CRI-O Overview

CRI-O was designed from the ground up for Kubernetes. It doesn't have a standalone CLI for managing containers (unlike Docker), and it doesn't support non-Kubernetes workloads (unlike containerd). This focus makes it very stable and predictable as a Kubernetes runtime.

Key characteristics:
- Uses `runc` (or another OCI-compatible runtime) to run containers
- Stores images in a standard OCI format
- Integrates directly with Kubernetes CRI, no shim layer needed
- Default on OpenShift 4.x clusters

## Checking for CRI-O

```bash
kubectl get nodes -o wide
```

The `CONTAINER-RUNTIME` column will show `cri-o://1.x.x` if you're running CRI-O.

## Installing Istio on CRI-O Clusters

For vanilla Kubernetes with CRI-O, the installation is the same as any other runtime:

```bash
istioctl install --set profile=default
```

For OpenShift clusters, there are additional considerations. OpenShift has its own service mesh (based on Istio through the OpenShift Service Mesh operator), but you can also install upstream Istio:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: openshift
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

The `openshift` profile configures Istio with the right security context constraints (SCCs) for OpenShift.

## Security Context Constraints on OpenShift

CRI-O on OpenShift enforces stricter security policies than Docker or containerd on vanilla Kubernetes. The Istio init container needs `NET_ADMIN` and `NET_RAW` capabilities to set up iptables rules. On OpenShift, this requires a specific SCC:

```bash
oc adm policy add-scc-to-group anyuid system:serviceaccounts:istio-system
oc adm policy add-scc-to-group privileged system:serviceaccounts:istio-system
```

Or better, use the Istio CNI plugin to avoid needing privileged init containers:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
  values:
    cni:
      cniBinDir: /var/lib/cni/bin
      cniConfDir: /etc/cni/net.d
      chained: false
      excludeNamespaces:
      - istio-system
      - kube-system
      - openshift-operators
```

The CNI paths may differ on CRI-O/OpenShift compared to other setups. Verify the correct paths:

```bash
ls /etc/cni/net.d/
ls /opt/cni/bin/ || ls /var/lib/cni/bin/
```

## Iptables and CRI-O

CRI-O itself doesn't interact with iptables (unlike Docker which manages host-level iptables rules). This actually makes things cleaner for Istio because there's no risk of Docker's iptables rules conflicting with Istio's.

The Istio init container's iptables modifications happen inside the pod's network namespace and are completely independent of CRI-O:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- iptables -t nat -L ISTIO_REDIRECT -n
```

## Container Image Handling

CRI-O uses a different image storage format than Docker. Images are stored in OCI format under `/var/lib/containers/storage/`. If you need to pre-pull Istio images or use a mirror registry, configure CRI-O's registries:

On the node, edit `/etc/containers/registries.conf`:

```toml
[[registry]]
prefix = "docker.io/istio"
location = "my-mirror.example.com/istio"
```

Or use Kubernetes image pull secrets as usual:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: registry-secret
  namespace: istio-system
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-config>
```

## Container Logs on CRI-O

CRI-O stores logs in the CRI log format under `/var/log/pods/`. This is the same location containerd uses, so log aggregation tools that support CRI log format will work:

```bash
# Access through kubectl (always works)
kubectl logs deploy/my-app -c istio-proxy --tail=50

# Direct access on node
ls /var/log/pods/<namespace>_<pod-name>_<pod-uid>/istio-proxy/
```

CRI-O's log rotation is configured in `/etc/crio/crio.conf`:

```toml
[crio.runtime]
log_size_max = 8192
```

Make sure this isn't set too low, or you might miss important Istio sidecar logs during debugging.

## Resource Management

CRI-O uses cgroups for resource management, just like other runtimes. Configure sidecar resources in your Istio installation:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
```

Or per-workload with annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "100m"
        sidecar.istio.io/proxyMemory: "128Mi"
        sidecar.istio.io/proxyCPULimit: "500m"
        sidecar.istio.io/proxyMemoryLimit: "256Mi"
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

## Conmon and Process Management

CRI-O uses `conmon` (container monitor) as a small process that monitors each container. You'll see conmon processes on the host for each Istio sidecar:

```bash
ps aux | grep conmon | grep istio
```

If the istio-proxy container crashes, conmon detects it and reports back to CRI-O, which then reports to the kubelet. This is important for understanding container restart behavior.

## Debugging with crictl

On CRI-O nodes, use `crictl` to inspect containers:

```bash
# List running containers
crictl ps | grep istio

# Inspect a container
crictl inspect <container-id>

# Check container stats
crictl stats <container-id>

# View container logs
crictl logs <container-id>
```

To find the istio-proxy container for a specific pod:

```bash
crictl ps --name istio-proxy --label io.kubernetes.pod.name=my-app-xyz
```

## Troubleshooting CRI-O Specific Issues

### Init Container Permission Errors

If the istio-init container fails with permission errors:

```bash
kubectl logs deploy/my-app -c istio-init
```

Common fix on OpenShift:

```bash
oc adm policy add-scc-to-user privileged -z default -n my-namespace
```

Or use the CNI plugin instead.

### Image Pull Failures

```bash
crictl images | grep istio
crictl pull docker.io/istio/proxyv2:1.20.0
```

Check CRI-O logs on the node:

```bash
journalctl -u crio -n 50
```

### Network Issues

CRI-O delegates networking to the CNI plugins. If networking isn't working:

```bash
# Check CNI configuration
ls /etc/cni/net.d/
cat /etc/cni/net.d/10-*.conf

# Check CRI-O network status
crictl inspectp <pod-id> | grep -A 20 network
```

### Slow Container Starts

If pods are slow to start with Istio on CRI-O:

```bash
# Check CRI-O events
crictl events

# Check kubelet event timing
kubectl describe pod my-app-xyz | grep -A 5 Events
```

CRI-O is a solid runtime choice for Istio workloads. Its Kubernetes-focused design means fewer moving parts and fewer potential conflicts. On OpenShift specifically, CRI-O and Istio are well-tested together since OpenShift Service Mesh is built on Istio. The main things to watch are security context constraints and CNI configuration, which differ slightly from containerd-based setups.
