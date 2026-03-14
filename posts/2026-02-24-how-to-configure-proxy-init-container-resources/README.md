# How to Configure Proxy Init Container Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Init Containers, Resource Limits, Kubernetes, iptables

Description: How to configure CPU and memory resources for the Istio init container that sets up iptables rules for traffic interception in the sidecar mesh.

---

When Istio injects a sidecar into your pod, it also injects an init container called `istio-init`. This init container runs before any other container starts and sets up iptables rules that redirect traffic through the Envoy sidecar proxy. It runs for a few seconds, does its job, and exits. But those few seconds still need CPU and memory, and in clusters with resource quotas or tight scheduling constraints, you need to configure these resources properly.

## What Does istio-init Do?

The init container runs the `istio-iptables` command, which creates iptables rules in the pod's network namespace. These rules ensure that:

- All inbound traffic to the application container gets redirected through the Envoy proxy
- All outbound traffic from the application container gets redirected through the Envoy proxy
- Certain ports and IP ranges are excluded from redirection (based on your configuration)

The init container needs the `NET_ADMIN` and `NET_RAW` capabilities to modify iptables rules. Once the rules are set up, the container exits and isn't needed anymore.

## Default Resource Configuration

By default, Istio sets minimal resources on the init container since it only runs briefly:

```yaml
initContainers:
- name: istio-init
  image: docker.io/istio/proxyv2:1.20.0
  resources:
    limits:
      cpu: "2000m"
      memory: "1024Mi"
    requests:
      cpu: "10m"
      memory: "40Mi"
```

These defaults work for most cases, but there are situations where you need to adjust them.

## Setting Init Container Resources via Annotations

Use pod annotations to override the init container resources:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
      annotations:
        sidecar.istio.io/initCPU: "100m"
        sidecar.istio.io/initCPULimit: "500m"
        sidecar.istio.io/initMemory: "64Mi"
        sidecar.istio.io/initMemoryLimit: "256Mi"
    spec:
      containers:
      - name: my-service
        image: my-service:1.0
        ports:
        - containerPort: 8080
```

After applying, verify the resources on the init container:

```bash
kubectl apply -f my-service.yaml

POD=$(kubectl get pod -l app=my-service -o jsonpath='{.items[0].metadata.name}')
kubectl get pod $POD -o jsonpath='{.spec.initContainers[?(@.name=="istio-init")].resources}' | jq .
```

## Setting Mesh-Wide Defaults

Configure init container resources for all pods through the IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy_init:
        resources:
          requests:
            cpu: "10m"
            memory: "40Mi"
          limits:
            cpu: "1000m"
            memory: "256Mi"
```

```bash
istioctl install -f istio-config.yaml
```

Pod-level annotations override these mesh-wide defaults.

## Why Init Container Resources Matter

You might wonder why you should care about resource settings for a container that runs for a couple of seconds. Here are the real-world situations where it matters:

**Resource quotas:** If your namespace has a ResourceQuota, the init container's resource requests count toward the quota during pod creation. Even though the init container exits quickly, the scheduler needs to reserve those resources to start the pod.

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: namespace-quota
spec:
  hard:
    requests.cpu: "10"
    requests.memory: "20Gi"
    limits.cpu: "20"
    limits.memory: "40Gi"
```

With 100 pods, each init container requesting 100m CPU adds up to 10 CPU requests against the quota. You may want to lower the request to avoid hitting quota limits.

**LimitRange enforcement:** If your namespace has a LimitRange with minimum or maximum constraints, the init container must comply:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: container-limits
spec:
  limits:
  - type: Container
    min:
      cpu: "50m"
      memory: "64Mi"
    max:
      cpu: "4000m"
      memory: "8Gi"
    default:
      cpu: "500m"
      memory: "512Mi"
    defaultRequest:
      cpu: "100m"
      memory: "128Mi"
```

If the LimitRange minimum is higher than Istio's default init container request, pod creation will fail. You need to either adjust the LimitRange or increase the init container resources.

**Node scheduling:** Init container resource requests affect pod scheduling. If a node doesn't have enough resources to satisfy the init container request, the pod won't be scheduled there, even though the init container only runs briefly.

## Reducing Init Container Resource Requests

For environments where you want to minimize the scheduling footprint:

```yaml
metadata:
  annotations:
    sidecar.istio.io/initCPU: "10m"
    sidecar.istio.io/initCPULimit: "200m"
    sidecar.istio.io/initMemory: "10Mi"
    sidecar.istio.io/initMemoryLimit: "128Mi"
```

The init container is CPU-light and memory-light. Running `iptables` commands doesn't need much. The main constraint is the binary itself needs to be loaded into memory.

## Using Istio CNI Instead of Init Containers

If you want to completely remove the init container, Istio offers a CNI plugin alternative. The Istio CNI plugin sets up the iptables rules at the network level during pod creation, eliminating the need for the init container entirely:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
  values:
    cni:
      excludeNamespaces:
      - istio-system
      - kube-system
```

```bash
istioctl install -f istio-cni.yaml
```

Benefits of using the CNI plugin:

- No init container needed, so no init container resources to manage
- No `NET_ADMIN` capability required on the pod
- Works better in restricted environments like OpenShift
- Reduces pod startup time slightly

Verify the CNI plugin is working:

```bash
kubectl get pods -n istio-system -l k8s-app=istio-cni-node
```

When the CNI plugin is active, Istio still injects the sidecar but skips the init container.

## Debugging Init Container Issues

If pods fail to start because of init container problems:

```bash
# Check init container status
kubectl get pod -l app=my-service -o jsonpath='{.items[0].status.initContainerStatuses}' | jq .

# Look at init container logs
POD=$(kubectl get pod -l app=my-service -o jsonpath='{.items[0].metadata.name}')
kubectl logs $POD -c istio-init

# Check for resource-related events
kubectl describe pod $POD | grep -A 10 "Events:"

# Check if there are quota violations
kubectl describe resourcequota -n default
```

Common init container errors:

- `OOMKilled` - memory limit too low, increase `initMemoryLimit`
- `CrashLoopBackOff` on the init container - usually an iptables rule conflict or capability issue
- Pod stuck in `Init:0/1` - the init container can't complete, check logs
- `Forbidden` in events - resource quota exceeded

## Init Container and Pod Startup Time

The init container adds a small amount to pod startup time. On most systems, it completes in under 2 seconds. But if it's resource-starved, it can take longer:

```bash
# Measure init container duration
kubectl get pod -l app=my-service -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.initContainerStatuses[0].state.terminated.startedAt}{"\t"}{.status.initContainerStatuses[0].state.terminated.finishedAt}{"\n"}{end}'
```

If you see the init container taking more than 5 seconds, it might be resource-constrained. Increasing the CPU limit can help.

## Helm Configuration

For Helm-based Istio installations:

```yaml
# values.yaml
global:
  proxy_init:
    resources:
      requests:
        cpu: "10m"
        memory: "40Mi"
      limits:
        cpu: "500m"
        memory: "256Mi"
```

```bash
helm upgrade istiod istio/istiod -n istio-system -f values.yaml
```

## Summary of Available Annotations

| Annotation | Description |
|---|---|
| `sidecar.istio.io/initCPU` | CPU request for init container |
| `sidecar.istio.io/initCPULimit` | CPU limit for init container |
| `sidecar.istio.io/initMemory` | Memory request for init container |
| `sidecar.istio.io/initMemoryLimit` | Memory limit for init container |

The init container is a small but necessary piece of the Istio sidecar injection process. Most of the time, the defaults work fine. When you run into resource quotas, LimitRanges, or tight scheduling environments, adjusting these settings or switching to the CNI plugin is straightforward and resolves the issues quickly.
