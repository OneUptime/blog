# How to Configure Traffic Management with Service Mesh on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Service Mesh, Traffic Management, Kubernetes, Canary Deployments

Description: Learn how to use service mesh traffic management features on Talos Linux for canary deployments, traffic splitting, and advanced routing.

---

Traffic management is one of the primary reasons teams adopt a service mesh. Instead of relying on basic Kubernetes load balancing, a service mesh gives you fine-grained control over how traffic flows between services. You can split traffic by percentage for canary deployments, route based on HTTP headers for A/B testing, apply timeouts and retries automatically, and shift traffic gradually during rollouts. On Talos Linux, these capabilities work through standard Kubernetes custom resources, fitting naturally into the declarative configuration model.

This guide covers traffic management patterns using both Linkerd and Istio on a Talos Linux cluster, with practical examples you can apply to your own workloads.

## Traffic Management Fundamentals

In a Kubernetes cluster without a service mesh, traffic is distributed evenly across pod endpoints by kube-proxy. You have limited control - you can scale replicas up or down, but you cannot easily send a percentage of traffic to a specific version of a service. A service mesh adds a proxy sidecar to each pod that intercepts all network traffic. The mesh control plane configures these proxies to implement sophisticated routing rules.

Common traffic management patterns include:

- **Canary deployments**: Send a small percentage of traffic to a new version
- **Blue-green deployments**: Switch all traffic between two versions
- **A/B testing**: Route specific users or requests to different versions
- **Traffic mirroring**: Copy production traffic to a test environment
- **Header-based routing**: Route based on HTTP headers, cookies, or other attributes

## Setting Up Test Workloads

Before configuring traffic management, deploy two versions of a service:

```yaml
# v1-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-v1
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
      version: v1
  template:
    metadata:
      labels:
        app: my-app
        version: v1
    spec:
      containers:
      - name: app
        image: hashicorp/http-echo
        args: ["-text=Version 1"]
        ports:
        - containerPort: 5678

---
# v2-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-v2
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
      version: v2
  template:
    metadata:
      labels:
        app: my-app
        version: v2
    spec:
      containers:
      - name: app
        image: hashicorp/http-echo
        args: ["-text=Version 2"]
        ports:
        - containerPort: 5678

---
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: default
spec:
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 5678
```

## Traffic Splitting with Linkerd

Linkerd uses the SMI (Service Mesh Interface) TrafficSplit resource for traffic management:

```yaml
# linkerd-traffic-split.yaml
apiVersion: split.smi-spec.io/v1alpha2
kind: TrafficSplit
metadata:
  name: my-app-split
  namespace: default
spec:
  service: my-app
  backends:
  - service: my-app-v1
    weight: 900  # 90%
  - service: my-app-v2
    weight: 100  # 10%
```

You also need separate services for each backend:

```yaml
# backend-services.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-v1
  namespace: default
spec:
  selector:
    app: my-app
    version: v1
  ports:
  - port: 80
    targetPort: 5678

---
apiVersion: v1
kind: Service
metadata:
  name: my-app-v2
  namespace: default
spec:
  selector:
    app: my-app
    version: v2
  ports:
  - port: 80
    targetPort: 5678
```

Apply and verify:

```bash
kubectl apply -f backend-services.yaml
kubectl apply -f linkerd-traffic-split.yaml

# Watch the traffic distribution
linkerd viz stat trafficsplit/my-app-split -n default

# Generate some test traffic
for i in $(seq 1 100); do
  curl -s http://my-app.default.svc.cluster.local
done
```

## Traffic Splitting with Istio

Istio uses VirtualService and DestinationRule for traffic management:

```yaml
# istio-destination-rule.yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-app
  namespace: default
spec:
  host: my-app
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2

---
# istio-virtual-service.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
  - my-app
  http:
  - route:
    - destination:
        host: my-app
        subset: v1
      weight: 90
    - destination:
        host: my-app
        subset: v2
      weight: 10
```

## Header-Based Routing

Route specific requests to different versions based on HTTP headers:

```yaml
# header-routing.yaml (Istio)
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
  - my-app
  http:
  # Route beta users to v2
  - match:
    - headers:
        x-user-group:
          exact: beta
    route:
    - destination:
        host: my-app
        subset: v2
  # Everyone else goes to v1
  - route:
    - destination:
        host: my-app
        subset: v1
```

Test header-based routing:

```bash
# Regular request - goes to v1
curl http://my-app.default.svc.cluster.local

# Beta user request - goes to v2
curl -H "x-user-group: beta" http://my-app.default.svc.cluster.local
```

## Traffic Mirroring

Mirror production traffic to a test environment without affecting users:

```yaml
# traffic-mirror.yaml (Istio)
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
  - my-app
  http:
  - route:
    - destination:
        host: my-app
        subset: v1
    mirror:
      host: my-app
      subset: v2
    mirrorPercentage:
      value: 100.0
```

This sends all traffic to v1 (the response goes back to the client) and mirrors a copy to v2 (the response is discarded). This is useful for testing a new version with real production traffic.

## Gradual Canary Rollout

Here is a practical workflow for a canary deployment:

```bash
# Step 1: Deploy the canary with 5% traffic
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts: [my-app]
  http:
  - route:
    - destination: {host: my-app, subset: v1}
      weight: 95
    - destination: {host: my-app, subset: v2}
      weight: 5
EOF

# Step 2: Monitor error rates and latency
# Wait and check metrics...

# Step 3: Increase to 25%
kubectl patch virtualservice my-app -n default --type merge -p '
spec:
  http:
  - route:
    - destination: {host: my-app, subset: v1}
      weight: 75
    - destination: {host: my-app, subset: v2}
      weight: 25'

# Step 4: Full rollout to 100%
kubectl patch virtualservice my-app -n default --type merge -p '
spec:
  http:
  - route:
    - destination: {host: my-app, subset: v2}
      weight: 100'
```

## Monitoring Traffic Distribution

Verify that traffic is being split as expected:

```bash
# Linkerd
linkerd viz stat trafficsplit -n default
linkerd viz routes deployment/my-app-v1 -n default
linkerd viz routes deployment/my-app-v2 -n default

# Istio
kubectl exec -n istio-system deploy/istiod -- pilot-discovery request GET /debug/config_dump

# General - check request counts
kubectl logs deployment/my-app-v1 --tail=10
kubectl logs deployment/my-app-v2 --tail=10
```

## Talos Linux Notes

Traffic management features work identically on Talos Linux as on other Kubernetes distributions. The key considerations are:

1. Make sure your CNI plugin supports the network policies that your service mesh might create
2. Talos uses Cilium or Flannel by default - both work with Linkerd and Istio
3. All configuration is through Kubernetes resources, which aligns with Talos's declarative approach

## Conclusion

Traffic management with a service mesh on Talos Linux gives you precise control over how requests flow between services. Whether you are running canary deployments, A/B tests, or gradual rollouts, the service mesh handles the complexity at the network layer. Linkerd's TrafficSplit is simpler and covers the most common use cases, while Istio's VirtualService offers more advanced features like header-based routing and traffic mirroring. Both work well on Talos Linux, and the declarative configuration through CRDs means all your traffic management policies can be version-controlled alongside your application code.
