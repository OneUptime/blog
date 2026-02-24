# How to Combine Istio with Chaos Mesh for Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Chaos Mesh, Chaos Engineering, Testing, Kubernetes

Description: How to use Chaos Mesh alongside Istio to create comprehensive chaos engineering experiments that cover both network and infrastructure failures.

---

Istio gives you application-layer fault injection through VirtualService configurations. That is great for testing HTTP errors and latency, but it does not cover infrastructure-level failures like pod crashes, CPU stress, disk I/O issues, or kernel-level network disruption. Chaos Mesh fills that gap. By combining both tools, you get a comprehensive chaos engineering platform that can simulate failures at every layer of the stack.

## What Chaos Mesh Adds to Istio

Istio fault injection operates at the HTTP/gRPC protocol level through the Envoy proxy. Chaos Mesh operates at the infrastructure level using Linux kernel capabilities. Here is what each tool handles:

**Istio handles:**
- HTTP delay injection
- HTTP abort injection (specific status codes)
- Header-based fault routing
- Percentage-based fault injection

**Chaos Mesh handles:**
- Pod kill / pod failure
- Container kill
- CPU stress
- Memory stress
- Disk I/O chaos
- Network partition (iptables-based)
- Network packet loss, corruption, duplication
- DNS chaos
- Time skew (clock manipulation)
- JVM chaos (for Java apps)

Together, they cover pretty much any failure scenario you can think of.

## Installing Chaos Mesh

Install Chaos Mesh using Helm:

```bash
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm repo update

kubectl create namespace chaos-mesh

helm install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace chaos-mesh \
  --set chaosDaemon.runtime=containerd \
  --set chaosDaemon.socketPath=/run/containerd/containerd.sock
```

If your cluster uses Docker instead of containerd, adjust the runtime and socket path:

```bash
helm install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace chaos-mesh \
  --set chaosDaemon.runtime=docker \
  --set chaosDaemon.socketPath=/var/run/docker.sock
```

Verify the installation:

```bash
kubectl get pods -n chaos-mesh
```

You should see the chaos-controller-manager, chaos-daemon (one per node), and chaos-dashboard pods.

## Setting Up the Test Environment

Deploy an application with Istio sidecars:

```bash
kubectl create namespace chaos-combined
kubectl label namespace chaos-combined istio-injection=enabled

kubectl apply -n chaos-combined -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -n chaos-combined -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/bookinfo/networking/destination-rule-all.yaml

kubectl wait --for=condition=ready pod --all -n chaos-combined --timeout=120s
```

## Experiment 1: Istio Delay + Chaos Mesh Pod Kill

Test what happens when a slow service also starts losing pods. This simulates a service that is struggling under load and instances are crashing.

First, add Istio delay:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-slow
  namespace: chaos-combined
spec:
  hosts:
  - reviews
  http:
  - fault:
      delay:
        percentage:
          value: 50
        fixedDelay: 3s
    route:
    - destination:
        host: reviews
```

Then add Chaos Mesh pod kill:

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: reviews-pod-kill
  namespace: chaos-combined
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
    - chaos-combined
    labelSelectors:
      app: reviews
  scheduler:
    cron: "*/2 * * * *"
```

```bash
kubectl apply -n chaos-combined -f reviews-slow.yaml
kubectl apply -n chaos-combined -f reviews-pod-kill.yaml
```

This creates a realistic scenario where the reviews service is both slow (Istio delay) and unstable (pods being killed every 2 minutes).

## Experiment 2: Network Partition with Istio Circuit Breaking

Use Chaos Mesh to create a network partition while Istio circuit breakers protect the caller:

First, set up the Istio circuit breaker:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: ratings-circuit-breaker
  namespace: chaos-combined
spec:
  host: ratings
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 10
      http:
        http1MaxPendingRequests: 10
        http2MaxRequests: 20
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
```

Then use Chaos Mesh to create network chaos:

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: ratings-network-partition
  namespace: chaos-combined
spec:
  action: partition
  mode: all
  selector:
    namespaces:
    - chaos-combined
    labelSelectors:
      app: ratings
  direction: both
  duration: "60s"
```

```bash
kubectl apply -n chaos-combined -f ratings-circuit-breaker.yaml
kubectl apply -n chaos-combined -f ratings-network-partition.yaml
```

Monitor whether the circuit breaker opens correctly when the network partition makes ratings unreachable:

```bash
REVIEWS_POD=$(kubectl get pod -n chaos-combined -l app=reviews -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n chaos-combined $REVIEWS_POD -c istio-proxy -- \
  pilot-agent request GET stats | grep "outlier_detection"
```

## Experiment 3: CPU Stress with Istio Timeouts

Simulate a service under CPU pressure while Istio timeouts protect callers:

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: reviews-cpu-stress
  namespace: chaos-combined
spec:
  mode: all
  selector:
    namespaces:
    - chaos-combined
    labelSelectors:
      app: reviews
  stressors:
    cpu:
      workers: 2
      load: 80
  duration: "120s"
```

Configure Istio timeout:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews-timeout
  namespace: chaos-combined
spec:
  hosts:
  - reviews
  http:
  - route:
    - destination:
        host: reviews
    timeout: 3s
```

```bash
kubectl apply -n chaos-combined -f reviews-cpu-stress.yaml
kubectl apply -n chaos-combined -f reviews-timeout.yaml
```

The CPU stress makes the reviews service respond slowly, and the Istio timeout prevents the caller from waiting too long.

## Experiment 4: DNS Chaos with Istio Service Resolution

Chaos Mesh can disrupt DNS resolution, which tests a different failure mode than what Istio fault injection can simulate:

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: DNSChaos
metadata:
  name: ratings-dns-chaos
  namespace: chaos-combined
spec:
  action: error
  mode: all
  selector:
    namespaces:
    - chaos-combined
    labelSelectors:
      app: reviews
  patterns:
  - "ratings.chaos-combined.svc.cluster.local"
  duration: "60s"
```

This makes DNS resolution fail for the ratings service from the reviews pods. Istio's service discovery should help here since Envoy resolves services through the Istio control plane, not through DNS directly for mesh traffic. But it is still worth testing to confirm.

## Scheduling Combined Experiments

Chaos Mesh supports workflows that chain multiple chaos actions together:

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: Workflow
metadata:
  name: combined-chaos-workflow
  namespace: chaos-combined
spec:
  entry: combined-test
  templates:
  - name: combined-test
    templateType: Serial
    children:
    - network-delay
    - pod-failure
    - cleanup-pause
  - name: network-delay
    templateType: NetworkChaos
    deadline: "2m"
    networkChaos:
      action: delay
      mode: all
      selector:
        namespaces:
        - chaos-combined
        labelSelectors:
          app: ratings
      delay:
        latency: "200ms"
        jitter: "50ms"
        correlation: "50"
      direction: both
  - name: pod-failure
    templateType: PodChaos
    deadline: "1m"
    podChaos:
      action: pod-failure
      mode: one
      selector:
        namespaces:
        - chaos-combined
        labelSelectors:
          app: ratings
  - name: cleanup-pause
    templateType: Suspend
    deadline: "30s"
```

## Monitoring Combined Experiments

Access the Chaos Mesh dashboard:

```bash
kubectl port-forward -n chaos-mesh svc/chaos-dashboard 2333:2333
```

Open http://localhost:2333 to see running experiments and their status.

For Istio metrics during the chaos experiments, check Kiali or query Prometheus directly:

```bash
kubectl port-forward -n istio-system svc/kiali 20001:20001
```

## Cleanup

```bash
kubectl delete namespace chaos-combined
# Optionally remove Chaos Mesh
helm uninstall chaos-mesh -n chaos-mesh
kubectl delete namespace chaos-mesh
```

Combining Istio and Chaos Mesh gives you chaos engineering coverage from the application layer all the way down to the infrastructure layer. Istio handles protocol-level faults with surgical precision, while Chaos Mesh handles infrastructure failures that are messier and harder to predict. Using both together builds real confidence that your system can handle whatever production throws at it.
