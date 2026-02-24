# How to Use Istio with Kubernetes DaemonSets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, DaemonSet, Sidecar, Service Mesh

Description: How to run Istio with Kubernetes DaemonSets, including when to inject sidecars, resource considerations, and handling node-level services in the mesh.

---

DaemonSets run a pod on every node in the cluster (or a subset of nodes). They are commonly used for log collectors, monitoring agents, storage drivers, and network plugins. Running Istio sidecars in DaemonSet pods is not always the right choice, and when you do need it, there are specific considerations to keep in mind.

This guide covers when to use Istio with DaemonSets, how to configure it properly, and common pitfalls to avoid.

## Should You Inject Sidecars Into DaemonSets?

The first question to ask is whether your DaemonSet actually benefits from being in the mesh. Here are some guidelines:

**Inject the sidecar when:**
- The DaemonSet pods communicate with other services in the mesh
- You need mTLS for traffic to/from the DaemonSet
- You want Istio telemetry for the DaemonSet's traffic
- You need to apply AuthorizationPolicies to the DaemonSet

**Skip the sidecar when:**
- The DaemonSet is a system-level agent (log collector, node exporter)
- The DaemonSet uses host networking
- The DaemonSet needs to see raw network traffic
- Resource overhead is a concern on every node

## Disabling Injection for System DaemonSets

For DaemonSets that should not have sidecars, disable injection explicitly:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      containers:
      - name: fluent-bit
        image: fluent/fluent-bit:latest
```

If the entire namespace should not have injection, do not label it with `istio-injection=enabled`.

## Injecting Sidecars Into DaemonSets

When you do want the sidecar, ensure the namespace is labeled and the DaemonSet does not opt out:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: my-daemon
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: my-daemon
  template:
    metadata:
      labels:
        app: my-daemon
    spec:
      containers:
      - name: my-daemon
        image: my-daemon:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
```

Verify injection is working:

```bash
kubectl get pods -l app=my-daemon -o jsonpath='{.items[0].spec.containers[*].name}'
```

You should see both `my-daemon` and `istio-proxy` in the output.

## Resource Considerations

Since DaemonSets run on every node, the sidecar's resource usage is multiplied by the number of nodes. On a 50-node cluster, a sidecar using 100m CPU and 128Mi memory means 5 CPU cores and 6.25 GB memory consumed just by sidecars for one DaemonSet.

Set conservative resource requests for DaemonSet sidecars:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: my-daemon
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "50m"
        sidecar.istio.io/proxyCPULimit: "200m"
        sidecar.istio.io/proxyMemory: "64Mi"
        sidecar.istio.io/proxyMemoryLimit: "256Mi"
    spec:
      containers:
      - name: my-daemon
        image: my-daemon:latest
```

## Handling Host Networking

DaemonSets that use `hostNetwork: true` cannot use Istio sidecar injection in the normal way. The iptables rules that redirect traffic through the sidecar do not work correctly with host networking.

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: host-network-daemon
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"  # Must disable
    spec:
      hostNetwork: true
      containers:
      - name: my-daemon
        image: my-daemon:latest
```

If you need mesh features for a host-network DaemonSet, you have a few options:

1. Remove `hostNetwork: true` if possible
2. Use a separate non-host-network pod as a proxy
3. Configure Istio ambient mode (if available in your version)

## DaemonSet Update Strategy

DaemonSets support `RollingUpdate` and `OnDelete` strategies. With Istio, rolling updates need the same considerations as regular deployments:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: my-daemon
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
  template:
    spec:
      terminationGracePeriodSeconds: 30
      containers:
      - name: my-daemon
        image: my-daemon:latest
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 10"]
```

Setting `maxUnavailable: 1` ensures only one node at a time loses its DaemonSet pod during updates.

## Accessing DaemonSet Pods from the Mesh

Other services in the mesh can access DaemonSet pods through a headless Service or a regular Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-daemon
  namespace: my-namespace
spec:
  selector:
    app: my-daemon
  clusterIP: None  # Headless
  ports:
  - port: 8080
    name: http
```

With a headless Service, each DaemonSet pod gets its own DNS record. This is useful when clients need to talk to the specific DaemonSet pod on their own node.

For a regular Service that load-balances across all DaemonSet pods:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-daemon
  namespace: my-namespace
spec:
  selector:
    app: my-daemon
  ports:
  - port: 8080
    name: http
```

## Routing Traffic to the Local DaemonSet Pod

A common pattern is for a service to communicate only with the DaemonSet pod on the same node. Use Istio's locality-aware routing or Kubernetes topology-aware routing:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-daemon
  namespace: my-namespace
  annotations:
    service.kubernetes.io/topology-mode: Auto
spec:
  selector:
    app: my-daemon
  ports:
  - port: 8080
    name: http
```

With topology-aware routing, traffic is preferentially routed to endpoints on the same node.

## Applying AuthorizationPolicies to DaemonSets

If your DaemonSet has a sidecar, you can apply AuthorizationPolicies:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: my-daemon-policy
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: my-daemon
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["production"]
    to:
    - operation:
        methods: ["GET"]
        ports: ["8080"]
```

This restricts access to the DaemonSet pods to only GET requests from the production namespace on port 8080.

## Monitoring DaemonSet Sidecar Health

Check the health of sidecars across all DaemonSet pods:

```bash
for pod in $(kubectl get pods -l app=my-daemon -o name); do
  echo "=== $pod ==="
  kubectl exec $pod -c istio-proxy -- pilot-agent request GET /healthz/ready 2>/dev/null
  echo ""
done
```

Monitor sidecar resource usage across nodes:

```bash
kubectl top pods -l app=my-daemon --containers | grep istio-proxy
```

## Handling DaemonSet Pods During Node Drain

When a node is drained (for maintenance or scaling down), the DaemonSet pod on that node is terminated. Istio handles this through the normal pod termination process:

```bash
kubectl drain node-name --ignore-daemonsets --delete-emptydir-data
```

Note the `--ignore-daemonsets` flag. By default, `kubectl drain` refuses to delete DaemonSet pods. With this flag, DaemonSet pods are ignored during drain (they stay running). If you actually want the DaemonSet pod to be removed during drain, you need to delete it manually after the drain.

## Wrapping Up

Using Istio with DaemonSets is straightforward once you decide whether sidecar injection makes sense for your use case. System-level agents typically should not have sidecars. Application-level DaemonSets that participate in service-to-service communication benefit from being in the mesh. Pay attention to resource overhead since it multiplies across every node, disable injection for host-network pods, and use topology-aware routing when you need node-local communication.
