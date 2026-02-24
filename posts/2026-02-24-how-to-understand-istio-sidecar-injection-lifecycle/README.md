# How to Understand Istio Sidecar Injection Lifecycle

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar Injection, Kubernetes, Service Mesh, Envoy

Description: A deep look at how Istio sidecar injection works under the hood, from the mutating webhook to proxy startup, readiness, and graceful shutdown.

---

Sidecar injection is one of those things in Istio that most people take for granted. You label a namespace, deploy a pod, and magically an Envoy sidecar appears alongside your application container. But when something goes wrong with injection, or when you need to control the injection behavior precisely, understanding the full lifecycle becomes essential.

This guide covers every stage of the sidecar injection process, from the moment a pod is created to the moment it is terminated.

## Stage 1: The Mutating Admission Webhook

When you create a pod (directly or through a Deployment, StatefulSet, etc.), the Kubernetes API server processes the request through a series of admission controllers. One of these is a mutating admission webhook that Istio registers during installation.

You can see this webhook:

```bash
kubectl get mutatingwebhookconfigurations
```

You will see something like `istio-sidecar-injector` or `istio-revision-tag-default`. The webhook configuration tells Kubernetes to send pod creation requests to istiod for mutation:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o yaml
```

The webhook matches pods based on namespace labels and pod annotations. When a matching pod is created, Kubernetes sends the pod spec to istiod's injection endpoint.

## Stage 2: Injection Decision

istiod receives the pod spec and decides whether to inject a sidecar based on several factors:

1. **Namespace label**: Is `istio-injection=enabled` or `istio.io/rev=<revision>` present on the namespace?
2. **Pod annotation**: Does the pod have `sidecar.istio.io/inject: "true"` or `"false"`?
3. **Pod owner**: Is the pod owned by a host networking workload (like a DaemonSet with `hostNetwork: true`)?

The pod-level annotation takes precedence over the namespace label. If the namespace has injection enabled but the pod has `sidecar.istio.io/inject: "false"`, the sidecar is not injected.

Check the injection status of a pod:

```bash
kubectl get pod your-pod -o jsonpath='{.metadata.annotations.sidecar\.istio\.io/status}'
```

This returns a JSON blob showing the injected containers and volumes.

## Stage 3: Pod Mutation

If injection proceeds, istiod modifies the pod spec by adding:

**The istio-proxy container:**

```yaml
containers:
- name: istio-proxy
  image: docker.io/istio/proxyv2:1.20.0
  ports:
  - containerPort: 15090
    name: http-envoy-prom
    protocol: TCP
  env:
  - name: ISTIO_META_CLUSTER_ID
    value: Kubernetes
  - name: POD_NAME
    valueFrom:
      fieldRef:
        fieldPath: metadata.name
  - name: POD_NAMESPACE
    valueFrom:
      fieldRef:
        fieldPath: metadata.namespace
  # ... many more environment variables
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: "2"
      memory: 1Gi
```

**The istio-init init container** (unless CNI is used):

```yaml
initContainers:
- name: istio-init
  image: docker.io/istio/proxyv2:1.20.0
  args:
  - istio-iptables
  - -p
  - "15001"
  - -z
  - "15006"
  - -u
  - "1337"
  - -m
  - REDIRECT
  - -i
  - "*"
  - -x
  - ""
  - -b
  - "*"
  - -d
  - 15090,15021,15020
  securityContext:
    capabilities:
      add:
      - NET_ADMIN
      - NET_RAW
```

This init container sets up iptables rules to redirect all inbound and outbound traffic through the Envoy sidecar.

**Volumes for certificates and configuration:**

```yaml
volumes:
- name: istio-envoy
  emptyDir:
    medium: Memory
- name: istio-data
  emptyDir: {}
- name: istio-token
  projected:
    sources:
    - serviceAccountToken:
        audience: istio-ca
        expirationSeconds: 43200
        path: istio-token
```

## Stage 4: Init Container Execution (iptables Setup)

When the pod starts, the `istio-init` init container runs first. It configures iptables rules on the pod's network namespace to redirect traffic:

- All outbound TCP traffic to port 15001 (Envoy outbound listener)
- All inbound TCP traffic to port 15006 (Envoy inbound listener)
- Certain ports are excluded (15090 for Prometheus scraping, 15021 for health checks, 15020 for stats)
- Traffic from UID 1337 (the Envoy user) is not redirected, preventing loops

If you use the Istio CNI plugin instead, the init container is not needed. The CNI plugin sets up iptables rules when the pod's network namespace is created, before any containers start:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
```

Using CNI eliminates the need for `NET_ADMIN` and `NET_RAW` capabilities on the init container, which is often required for security-hardened environments.

## Stage 5: Sidecar Startup

After the init container completes, the sidecar (istio-proxy) and application containers start. The sidecar goes through its own startup sequence:

1. **pilot-agent starts**: This is the sidecar management process
2. **pilot-agent connects to istiod**: Establishes an xDS gRPC stream
3. **Configuration is received**: istiod sends Listener, Cluster, Route, and Endpoint configuration
4. **Envoy starts**: pilot-agent spawns the Envoy process with the received configuration
5. **Envoy becomes ready**: The sidecar starts accepting traffic

You can see this startup in the sidecar logs:

```bash
kubectl logs your-pod -c istio-proxy | head -20
```

## The Startup Race Condition

There is a potential race condition. If the application container starts before the sidecar is ready, the application's outbound requests will fail because iptables redirects them to a sidecar that is not yet listening.

Fix this with `holdApplicationUntilProxyStarts`:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

When enabled, this adds a postStart lifecycle hook to the sidecar that blocks until Envoy is ready. The application container's startup is delayed until after this hook completes.

Or enable it per-pod:

```yaml
annotations:
  proxy.istio.io/config: |
    holdApplicationUntilProxyStarts: true
```

## Stage 6: Steady State

Once both the sidecar and application are running, traffic flows through the Envoy proxy transparently:

- **Inbound traffic**: Arrives at the pod, iptables redirects it to Envoy (port 15006), Envoy applies inbound policies (mTLS termination, authorization), forwards to the application
- **Outbound traffic**: Application sends a request, iptables redirects to Envoy (port 15001), Envoy applies outbound policies (mTLS origination, retries, load balancing), sends to the destination

The sidecar continuously receives configuration updates from istiod over the xDS stream. When services scale, routing rules change, or policies are updated, istiod pushes new configuration.

Monitor the sidecar's health:

```bash
# Check if the sidecar is synchronized with istiod
istioctl proxy-status

# Check the sidecar's current configuration
istioctl proxy-config all deploy/your-deployment
```

## Stage 7: Graceful Shutdown

When a pod is deleted, Kubernetes sends a SIGTERM to all containers. The shutdown sequence matters for avoiding dropped requests.

The default behavior:

1. Kubernetes removes the pod from Service endpoints
2. SIGTERM is sent to all containers simultaneously
3. Both the application and sidecar begin shutting down
4. If the sidecar shuts down before the application, in-flight requests from the application fail

To handle this properly, the sidecar needs to drain connections before shutting down. Istio configures this through the `terminationDrainDuration`:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      terminationDrainDuration: 10s
```

This tells the sidecar to stop accepting new connections but continue processing existing ones for 10 seconds before shutting down.

You can also configure the sidecar to exit after the application exits:

```yaml
annotations:
  proxy.istio.io/config: |
    proxyMetadata:
      EXIT_ON_ZERO_ACTIVE_CONNECTIONS: "true"
```

## Stage 8: Sidecar Configuration Updates

During the pod's lifetime, the sidecar receives configuration updates from istiod. These happen when:

- A new service is added or removed from the mesh
- Endpoints change (pods scale up/down)
- VirtualService, DestinationRule, or AuthorizationPolicy resources are modified
- Certificate rotation occurs (typically every 24 hours)

You can watch these updates:

```bash
# Check the last configuration sync time
istioctl proxy-status | grep your-pod

# View detailed sync status
istioctl proxy-config bootstrap your-pod -n your-namespace -o json | \
  jq '.bootstrap.dynamicResources'
```

If a sidecar is stuck in "STALE" status, it means it has not received a recent configuration push from istiod. This usually indicates connectivity issues between the sidecar and the control plane.

## Debugging Injection Issues

Common injection problems and how to diagnose them:

```bash
# Check if the webhook is configured correctly
kubectl get mutatingwebhookconfiguration -o yaml | grep namespaceSelector -A 5

# Check if the namespace is labeled
kubectl get namespace your-namespace --show-labels

# Check if injection was attempted
kubectl describe pod your-pod | grep -A 5 "Events"

# Manually test injection
istioctl kube-inject -f your-deployment.yaml | grep istio-proxy
```

## Summary

The sidecar injection lifecycle has many stages, each with its own potential issues and configuration knobs. Understanding the flow from webhook mutation through iptables setup, sidecar startup, steady-state operation, and graceful shutdown helps you debug problems and configure the sidecar for your specific requirements. The two most important configurations to get right are `holdApplicationUntilProxyStarts` (to prevent startup failures) and `terminationDrainDuration` (to prevent dropped requests during shutdown).
