# How to Handle Kubernetes Endpoints Without Pods in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Endpoint, EndpointSlice, External Services

Description: Manage Kubernetes Endpoints and EndpointSlices that point to non-pod backends and configure Istio to route traffic to external IPs and VMs properly.

---

Kubernetes Endpoints usually point to pod IPs, managed automatically based on Service selectors. But endpoints can also point to arbitrary IP addresses that have nothing to do with pods. This is how you integrate external servers, VMs, bare-metal services, and other non-Kubernetes resources into your cluster's service discovery. When Istio is part of the picture, these pod-less endpoints need some specific handling.

## Understanding Endpoints Without Pods

Normal flow: you create a Service with a selector, Kubernetes finds matching pods, and creates Endpoints automatically. The Endpoints object contains pod IPs.

Manual flow: you create a Service without a selector and create Endpoints manually. The Endpoints object contains whatever IPs you specify:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: vm-service
  namespace: my-app
spec:
  ports:
  - name: http-api
    port: 8080
    targetPort: 8080
---
apiVersion: v1
kind: Endpoints
metadata:
  name: vm-service
  namespace: my-app
subsets:
- addresses:
  - ip: 192.168.1.100
    hostname: vm-1
  - ip: 192.168.1.101
    hostname: vm-2
  ports:
  - name: http-api
    port: 8080
```

The `hostname` field is optional but useful for debugging. It shows up in proxy configuration and helps you identify which endpoint is which.

## EndpointSlice: The Modern Alternative

EndpointSlice is the newer API that replaces Endpoints for scalability. It supports more endpoints per resource and has better update performance:

```yaml
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: vm-service-external
  namespace: my-app
  labels:
    kubernetes.io/service-name: vm-service
addressType: IPv4
ports:
- name: http-api
  port: 8080
  protocol: TCP
endpoints:
- addresses:
  - "192.168.1.100"
  hostname: vm-1
  conditions:
    ready: true
- addresses:
  - "192.168.1.101"
  hostname: vm-2
  conditions:
    ready: true
```

The `conditions.ready` field is important. Istio (and kube-proxy) only route traffic to ready endpoints. If you mark an endpoint as not ready, traffic stops flowing to it:

```yaml
endpoints:
- addresses:
  - "192.168.1.100"
  conditions:
    ready: true
- addresses:
  - "192.168.1.101"
  conditions:
    ready: false  # This endpoint will not receive traffic
```

## How Istio Handles Non-Pod Endpoints

When Istio's control plane (istiod) syncs endpoints from Kubernetes, it treats pod endpoints and non-pod endpoints differently:

- **Pod endpoints**: Istio knows the pod's namespace, service account, and labels. It can generate proper mTLS identities.
- **Non-pod endpoints**: Istio has limited metadata. No service account, no pod labels, no automatic mTLS identity.

This difference matters for mTLS and authorization. Since non-pod endpoints do not have Istio sidecars, mTLS is not possible (the remote server cannot do the mTLS handshake).

Disable mTLS for the service:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: vm-service-no-mtls
  namespace: my-app
spec:
  host: vm-service.my-app.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE
```

Or if the external service supports TLS (but not Istio mTLS), use SIMPLE mode:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: vm-service-tls
  namespace: my-app
spec:
  host: vm-service.my-app.svc.cluster.local
  trafficPolicy:
    tls:
      mode: SIMPLE
```

## Istio VM Integration

If your VMs need to be full mesh participants (with sidecars, mTLS, and proper identity), Istio supports VM onboarding. This is different from just pointing endpoints at VMs.

The full VM integration involves:

1. Install the Istio sidecar on the VM
2. Register the VM with the mesh using a WorkloadEntry

```yaml
apiVersion: networking.istio.io/v1
kind: WorkloadEntry
metadata:
  name: vm-1
  namespace: my-app
spec:
  address: 192.168.1.100
  labels:
    app: vm-service
    version: v1
  serviceAccount: vm-service-sa
---
apiVersion: networking.istio.io/v1
kind: WorkloadEntry
metadata:
  name: vm-2
  namespace: my-app
spec:
  address: 192.168.1.101
  labels:
    app: vm-service
    version: v1
  serviceAccount: vm-service-sa
```

Then associate WorkloadEntries with a Service using a WorkloadGroup and Service:

```yaml
apiVersion: networking.istio.io/v1
kind: WorkloadGroup
metadata:
  name: vm-service
  namespace: my-app
spec:
  metadata:
    labels:
      app: vm-service
  template:
    serviceAccount: vm-service-sa
  probe:
    httpGet:
      path: /healthz
      port: 8080
    initialDelaySeconds: 5
    periodSeconds: 10
```

With WorkloadEntry, the VMs get full Istio identity and can participate in mTLS.

## Traffic Policies for Non-Pod Endpoints

Apply connection pooling and outlier detection just like with pod-backed services:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: vm-service-policy
  namespace: my-app
spec:
  host: vm-service.my-app.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
        connectTimeout: 5s
        tcpKeepalive:
          time: 7200s
          interval: 75s
      http:
        http1MaxPendingRequests: 25
        http2MaxRequests: 50
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
    loadBalancer:
      simple: LEAST_REQUEST
```

Outlier detection is particularly important for non-pod endpoints. Unlike pods, which Kubernetes restarts when they fail, external servers might stay down until someone manually fixes them. Outlier detection ensures Istio stops routing traffic to unhealthy endpoints.

## Health Checking External Endpoints

Kubernetes does not health-check endpoints that do not belong to pods. If an external server goes down, the Endpoints object still lists its IP, and traffic keeps flowing to a dead server.

Solutions:

1. **Use outlier detection** in DestinationRule (shown above). This detects failures based on response codes and ejects unhealthy endpoints.

2. **Use WorkloadEntry with health probes** (for Istio VM integration).

3. **Build a custom health checker** that updates Endpoints based on external service health:

```bash
#!/bin/bash
ENDPOINTS=("192.168.1.100" "192.168.1.101")
HEALTHY=()

for ip in "${ENDPOINTS[@]}"; do
  if curl -sf "http://${ip}:8080/healthz" > /dev/null 2>&1; then
    HEALTHY+=("{\"ip\": \"${ip}\"}")
  fi
done

# Build the addresses JSON
ADDRESSES=$(printf "%s," "${HEALTHY[@]}")
ADDRESSES="[${ADDRESSES%,}]"

kubectl apply -f - <<EOF
apiVersion: v1
kind: Endpoints
metadata:
  name: vm-service
  namespace: my-app
subsets:
- addresses: $(echo $ADDRESSES)
  ports:
  - name: http-api
    port: 8080
EOF
```

Run this as a CronJob every 30 seconds or so.

## Routing Between Pod and Non-Pod Endpoints

You can mix pod-based and non-pod endpoints for the same service. This is useful during migrations where you are moving from VMs to Kubernetes:

Have a selector-based Service for pods:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app: my-service
  ports:
  - name: http-api
    port: 8080
```

And use WorkloadEntry to add VM endpoints:

```yaml
apiVersion: networking.istio.io/v1
kind: WorkloadEntry
metadata:
  name: my-service-vm
  namespace: my-app
spec:
  address: 192.168.1.100
  labels:
    app: my-service
    version: vm
  serviceAccount: my-service
```

Use Istio traffic splitting to gradually shift traffic from VMs to pods:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: migration-routing
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
        subset: k8s
      weight: 80
    - destination:
        host: my-service
        subset: vm
      weight: 20
```

## Debugging Endpoint Issues

```bash
# Check what endpoints Istio knows about
istioctl proxy-config endpoint deploy/my-client -n my-app | grep vm-service

# Check the raw Kubernetes endpoints
kubectl get endpoints vm-service -n my-app -o yaml

# Check EndpointSlices
kubectl get endpointslices -n my-app -l kubernetes.io/service-name=vm-service -o yaml

# Check if the proxy can reach the endpoints
kubectl exec deploy/my-client -c istio-proxy -- curl -s http://192.168.1.100:8080/healthz
```

If Istio does not see the endpoints, make sure:
- The Endpoints name matches the Service name
- The EndpointSlice has the correct `kubernetes.io/service-name` label
- The port names in Endpoints match the port names in the Service

## Summary

Endpoints without pods are a practical way to bring external services into your Kubernetes and Istio ecosystem. Use manual Endpoints or EndpointSlices for simple cases, and WorkloadEntry for full mesh integration. Disable mTLS for endpoints without sidecars, configure outlier detection to handle unhealthy external servers, and build health checking automation since Kubernetes will not do it for you. For VM-to-Kubernetes migrations, mix pod and non-pod endpoints with Istio traffic splitting for gradual cutover.
