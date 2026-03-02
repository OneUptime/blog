# How to Migrate VM Workloads to Kubernetes with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Migration, Virtual Machine, Kubernetes, Service Mesh

Description: A practical migration strategy for moving VM-based services into Kubernetes using Istio for zero-downtime traffic shifting.

---

Migrating services from VMs to Kubernetes is one of those projects that sounds straightforward but quickly gets complicated. Services have dependencies, clients have hardcoded endpoints, and nobody wants downtime. Istio makes this migration much smoother by letting you gradually shift traffic from VM workloads to their Kubernetes replacements while maintaining full observability and the ability to roll back instantly.

## The Migration Strategy

The general approach is:

1. Add the VM workload to the Istio mesh
2. Deploy the Kubernetes version of the service alongside the VM
3. Use traffic splitting to gradually shift traffic from VM to Kubernetes
4. Monitor and validate at each step
5. Decommission the VM once all traffic is on Kubernetes

This is basically a canary deployment across infrastructure boundaries.

## Step 1: Mesh the VM Workload

If your VM workload is not already in the mesh, start by adding it. Create the necessary resources:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-service-sa
  namespace: production
---
apiVersion: networking.istio.io/v1beta1
kind: WorkloadGroup
metadata:
  name: my-service-vm
  namespace: production
spec:
  metadata:
    labels:
      app: my-service
      version: vm
  template:
    serviceAccount: my-service-sa
    network: vm-network
---
apiVersion: networking.istio.io/v1beta1
kind: WorkloadEntry
metadata:
  name: my-service-vm-1
  namespace: production
spec:
  address: 10.0.1.50
  labels:
    app: my-service
    version: vm
  serviceAccount: my-service-sa
  network: vm-network
---
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: production
spec:
  ports:
  - port: 8080
    name: http
  selector:
    app: my-service
```

Install the Istio sidecar on the VM and verify it is connected:

```bash
istioctl proxy-status | grep my-service-vm
```

At this point, all traffic to `my-service` goes to the VM through the mesh. You now have mTLS, telemetry, and traffic management capabilities.

## Step 2: Deploy the Kubernetes Version

Deploy your service as a Kubernetes workload alongside the VM. Use a different version label to distinguish them:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service-k8s
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-service
      version: k8s
  template:
    metadata:
      labels:
        app: my-service
        version: k8s
    spec:
      serviceAccountName: my-service-sa
      containers:
      - name: my-service
        image: my-registry/my-service:latest
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
```

Both the VM (version: vm) and the Kubernetes pods (version: k8s) are selected by the same Service because they share the `app: my-service` label.

## Step 3: Set Up Traffic Splitting

Create a DestinationRule with subsets for each version, then use a VirtualService to control the split:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: production
spec:
  host: my-service.production.svc.cluster.local
  subsets:
  - name: vm
    labels:
      version: vm
  - name: k8s
    labels:
      version: k8s
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service-vs
  namespace: production
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
        subset: vm
      weight: 100
    - destination:
        host: my-service
        subset: k8s
      weight: 0
```

Start with 100% on VM and 0% on Kubernetes. This confirms the traffic routing is working before you shift anything.

## Step 4: Gradual Traffic Shift

Now start moving traffic to Kubernetes in controlled increments:

```bash
# Phase 1: 10% to Kubernetes
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service-vs
  namespace: production
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
        subset: vm
      weight: 90
    - destination:
        host: my-service
        subset: k8s
      weight: 10
EOF
```

Monitor the Kubernetes version at each phase:

```bash
# Check error rates
kubectl exec deploy/sleep -n production -- curl -s http://my-service:8080/healthz

# Watch metrics in Prometheus
# Query: sum(rate(istio_requests_total{destination_service="my-service.production.svc.cluster.local", response_code!~"5.."}[5m])) by (destination_version)
```

Continue the progression:

```bash
# Phase 2: 50/50
# Update the VirtualService with weight: 50 for each subset

# Phase 3: 90% Kubernetes
# Update with vm: 10, k8s: 90

# Phase 4: 100% Kubernetes
# Update with vm: 0, k8s: 100
```

## Step 5: Monitor at Each Phase

At each traffic split change, watch these metrics closely:

- Error rate (5xx responses) per version
- Latency (p50, p95, p99) per version
- Throughput per version

Using Prometheus queries:

```bash
# Error rate by version
sum(rate(istio_requests_total{destination_service="my-service.production.svc.cluster.local", response_code=~"5.."}[5m])) by (destination_version)

# P99 latency by version
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service="my-service.production.svc.cluster.local"}[5m])) by (le, destination_version))
```

If the Kubernetes version shows higher error rates or latency, you can instantly roll back by setting the VM weight back to 100:

```bash
kubectl patch virtualservice my-service-vs -n production --type merge -p '{"spec":{"http":[{"route":[{"destination":{"host":"my-service","subset":"vm"},"weight":100},{"destination":{"host":"my-service","subset":"k8s"},"weight":0}]}]}}'
```

## Step 6: Header-Based Routing for Testing

Before shifting production traffic, you might want to test the Kubernetes version with specific requests:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service-vs
  namespace: production
spec:
  hosts:
  - my-service
  http:
  - match:
    - headers:
        x-use-k8s:
          exact: "true"
    route:
    - destination:
        host: my-service
        subset: k8s
  - route:
    - destination:
        host: my-service
        subset: vm
```

This sends all traffic with the `x-use-k8s: true` header to Kubernetes, and everything else to the VM. QA teams can test the Kubernetes version without affecting production traffic.

## Step 7: Clean Up

Once the Kubernetes version is handling 100% of traffic and has been stable for a reasonable period (at least a few days), clean up:

```bash
# Remove the VM WorkloadEntry
kubectl delete workloadentry my-service-vm-1 -n production

# Remove the VM WorkloadGroup
kubectl delete workloadgroup my-service-vm -n production

# Simplify the VirtualService (remove VM subset)
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service-vs
  namespace: production
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
EOF

# Update DestinationRule to remove VM subset
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: production
spec:
  host: my-service.production.svc.cluster.local
  subsets:
  - name: k8s
    labels:
      version: k8s
EOF

# Stop the Istio sidecar on the VM
ssh vm-host 'sudo systemctl stop istio'

# Decommission the VM (or repurpose it)
```

## Tips for a Smooth Migration

Keep the VM running in standby for a week or two after the full cutover, just in case you discover issues that only show up under specific conditions. Update your monitoring dashboards to track the migration progress, and communicate the migration plan to teams that depend on the service. The beauty of this approach is that it is completely transparent to clients - they just call the same service name and Istio handles the routing behind the scenes.

This pattern works well for migrating one service at a time. For large-scale migrations with many interdependent services, plan the order carefully and migrate leaf services (services with no dependencies on other VM workloads) first.
