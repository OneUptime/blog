# How to Handle Edge Node Failures with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Edge Computing, Fault Tolerance, High Availability, Kubernetes

Description: Strategies for using Istio to detect, handle, and recover from edge node failures while maintaining service availability.

---

Edge nodes fail. They lose power, overheat, get unplugged, or suffer hardware failures in environments that are far less controlled than a data center. When an edge node goes down, Istio needs to detect the failure quickly and route traffic away from the affected services. This post covers how to set up Istio to handle edge node failures gracefully.

## Understanding Failure Modes at the Edge

Edge node failures come in several flavors, and Istio handles each differently:

**Sudden node death**: The node stops responding completely. Kubernetes marks it as NotReady, and pods get rescheduled (eventually). Istio removes the endpoints from its service registry.

**Partial failure**: The node is up but the application or sidecar proxy is unhealthy. Istio outlier detection can catch this and stop sending traffic to the bad instance.

**Network partition**: The node is fine but cannot communicate with other nodes or the control plane. This is the trickiest case because the node thinks it is healthy but nobody can reach it.

## Configuring Outlier Detection

Outlier detection is your primary tool for handling unhealthy endpoints. Configure it for every service in your edge namespace:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: edge-service-resilience
  namespace: edge-app
spec:
  host: "*.edge-app.svc.cluster.local"
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
      splitExternalLocalOriginErrors: true
      consecutiveLocalOriginFailures: 3
```

The key settings here:

- `consecutive5xxErrors: 3` means after 3 failed responses, the endpoint is ejected
- `interval: 10s` checks every 10 seconds
- `baseEjectionTime: 30s` keeps the endpoint out for at least 30 seconds
- `maxEjectionPercent: 100` allows all endpoints to be ejected (important when you only have 2-3 replicas)
- `splitExternalLocalOriginErrors: true` and `consecutiveLocalOriginFailures: 3` catch connection failures separately from HTTP errors

## Health Checking with Active Probes

Outlier detection is passive. It only detects failures after requests fail. For faster detection, combine it with active health checking through Kubernetes probes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: edge-service
  namespace: edge-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: edge-service
  template:
    metadata:
      labels:
        app: edge-service
    spec:
      containers:
        - name: app
          image: my-edge-service:latest
          ports:
            - containerPort: 8080
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 2
```

When the readiness probe fails, Kubernetes removes the pod from the Service endpoints, and Istio picks that up through its endpoint watch. Setting `periodSeconds: 5` and `failureThreshold: 2` means an unhealthy pod is removed within about 10 seconds.

## Spreading Replicas Across Nodes

To survive node failures, spread your service replicas across different nodes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-edge-service
  namespace: edge-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: critical-edge-service
  template:
    metadata:
      labels:
        app: critical-edge-service
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: critical-edge-service
      containers:
        - name: app
          image: critical-edge-service:latest
```

The `topologySpreadConstraints` ensure that replicas are distributed across different nodes. When one node goes down, the replicas on other nodes keep serving traffic.

## Handling istiod Failure

If the node running istiod fails, you lose the control plane. Existing proxies continue working with their cached configuration, but new pods will not get sidecar injection and configuration updates will not be distributed.

For edge environments with multiple nodes, run istiod with anti-affinity:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        hpaSpec:
          minReplicas: 2
          maxReplicas: 2
        affinity:
          podAntiAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              - labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - istiod
                topologyKey: kubernetes.io/hostname
```

If your edge cluster only has one or two nodes and you cannot afford two istiod replicas, accept the risk. When istiod goes down, the data plane keeps working. Your main concern is getting it back up quickly.

## Configuring Faster Pod Eviction

By default, Kubernetes waits 5 minutes before evicting pods from a failed node. That is way too long for edge. Configure the node controller to detect and evict faster:

```bash
# On the K3s/K8s API server, reduce tolerations
# For K3s, add to /etc/rancher/k3s/config.yaml:
# kube-controller-manager-arg:
#   - "node-monitor-grace-period=20s"
#   - "pod-eviction-timeout=30s"
```

Also add tolerations to your pods to control how long they wait before being evicted from a NotReady node:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: edge-service
  namespace: edge-app
spec:
  template:
    spec:
      tolerations:
        - key: "node.kubernetes.io/not-ready"
          operator: "Exists"
          effect: "NoExecute"
          tolerationSeconds: 30
        - key: "node.kubernetes.io/unreachable"
          operator: "Exists"
          effect: "NoExecute"
          tolerationSeconds: 30
      containers:
        - name: app
          image: my-edge-service:latest
```

The `tolerationSeconds: 30` means pods will be evicted from a failed node after 30 seconds instead of the default 300 seconds.

## Retry Configuration for Failover

When traffic is sent to a pod on a failing node, retries help the request succeed on a healthy node:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: edge-service
  namespace: edge-app
spec:
  hosts:
    - edge-service
  http:
    - route:
        - destination:
            host: edge-service
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: connect-failure,refused-stream,unavailable,cancelled,reset
```

The `connect-failure` and `reset` retry conditions are especially important for node failures because the sidecar on the failing node will either refuse connections or reset them mid-stream.

## Multi-Cluster Failover

If your edge environment has multiple clusters, configure cross-cluster failover:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: cross-cluster-failover
  namespace: edge-app
spec:
  host: critical-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
          - from: edge-site-1
            to: edge-site-2
```

When all local instances of critical-service are ejected due to node failures, traffic automatically routes to the backup edge site.

## Monitoring Node Health

Set up monitoring to catch node failures early:

```bash
# Check node status
kubectl get nodes -o wide

# Monitor endpoint updates (shows when Istio removes endpoints)
istioctl proxy-config endpoints deploy/edge-service -n edge-app

# Watch for connection failures in proxy stats
kubectl exec -n edge-app deploy/edge-client -c istio-proxy -- \
  pilot-agent request GET /stats | grep upstream_cx_connect_fail
```

For proactive monitoring, set up alerts on the `upstream_cx_connect_fail` counter. A sudden spike usually indicates a node failure.

## Recovery After Node Comes Back

When a failed node comes back online, Kubernetes reschedules pods and Istio adds the endpoints back to the mesh. The outlier detection ejection is time-limited, so endpoints are automatically re-added after the ejection period expires.

Verify recovery:

```bash
# Check that pods are running on the recovered node
kubectl get pods -o wide -n edge-app

# Verify endpoints are back in the mesh
istioctl proxy-config endpoints deploy/edge-client -n edge-app | grep edge-service
```

Edge node failures are inevitable. The goal is not to prevent them but to make your system handle them automatically. With properly configured outlier detection, retries, pod spreading, and fast eviction, Istio can route around node failures in seconds rather than minutes.
