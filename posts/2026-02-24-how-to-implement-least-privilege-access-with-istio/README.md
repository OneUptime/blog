# How to Implement Least Privilege Access with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, Least Privilege, Authorization, Zero Trust, Kubernetes

Description: A practical guide to implementing least privilege access in Istio using authorization policies, service accounts, and fine-grained access controls.

---

Least privilege means every service gets exactly the permissions it needs to do its job, and nothing more. In a Kubernetes environment with Istio, this translates to controlling which services can talk to which other services, what HTTP methods they can use, and which paths they can access.

Without least privilege, any compromised service can potentially talk to any other service in the mesh. With least privilege, a compromised service can only reach the specific services it was already allowed to communicate with. The blast radius shrinks dramatically.

## Starting Point: Default Deny

Least privilege starts with denying everything by default. Apply a mesh-wide deny-all policy:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: istio-system
spec:
  {}
```

An AuthorizationPolicy with an empty spec and no rules denies all traffic. After applying this, nothing in your mesh can talk to anything. That's the starting point. Now you explicitly allow only what's needed.

You might want to exempt the `kube-system` namespace and Istio's own namespace:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-istio-system
  namespace: istio-system
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces:
              - "istio-system"
              - "kube-system"
```

## Using Service Accounts for Identity

Istio uses Kubernetes service accounts to identify workloads. Each service should have its own service account, not the default one. This gives each service a unique identity that authorization policies can reference.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
  namespace: shop
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: shop
spec:
  template:
    spec:
      serviceAccountName: order-service
      containers:
        - name: order-service
          image: myregistry/order-service:v1
```

Do this for every service. Never share service accounts between different services, because then you can't distinguish them in authorization policies.

Check that each deployment has its own service account:

```bash
kubectl get deployments --all-namespaces -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,SA:.spec.template.spec.serviceAccountName'
```

Any deployment using "default" as its service account is a problem.

## Building Allow Policies Service by Service

Now, for each service, create an authorization policy that allows only its known communication patterns.

For example, if your architecture looks like this:

```
frontend -> api-gateway -> order-service -> payment-service
                        -> inventory-service
                        -> notification-service
```

Create policies for each service:

```yaml
# api-gateway can be called by frontend
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: api-gateway-access
  namespace: shop
spec:
  selector:
    matchLabels:
      app: api-gateway
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/shop/sa/frontend"
      to:
        - operation:
            ports: ["8080"]
---
# order-service can be called by api-gateway
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: order-service-access
  namespace: shop
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/shop/sa/api-gateway"
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/v1/orders*"]
---
# payment-service can be called by order-service only
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: payment-service-access
  namespace: shop
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/shop/sa/order-service"
      to:
        - operation:
            methods: ["POST"]
            paths: ["/api/v1/charge"]
```

Notice how specific these are. The payment service only accepts POST requests to `/api/v1/charge`, and only from the order service. Nothing else in the mesh can touch it.

## Method and Path Restrictions

Least privilege isn't just about which services can communicate. It's also about what operations they can perform. Restrict HTTP methods and paths:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: inventory-access
  namespace: shop
spec:
  selector:
    matchLabels:
      app: inventory-service
  action: ALLOW
  rules:
    # Order service can check and reserve inventory
    - from:
        - source:
            principals:
              - "cluster.local/ns/shop/sa/order-service"
      to:
        - operation:
            methods: ["GET"]
            paths: ["/api/v1/inventory/*/availability"]
        - operation:
            methods: ["POST"]
            paths: ["/api/v1/inventory/*/reserve"]
    # Warehouse service can update inventory levels
    - from:
        - source:
            principals:
              - "cluster.local/ns/warehouse/sa/warehouse-service"
      to:
        - operation:
            methods: ["PUT"]
            paths: ["/api/v1/inventory/*"]
    # Reporting service can only read
    - from:
        - source:
            principals:
              - "cluster.local/ns/reporting/sa/report-generator"
      to:
        - operation:
            methods: ["GET"]
            paths: ["/api/v1/inventory*"]
```

## Handling Health Checks and Probes

One thing that catches people off guard: Kubernetes health check probes also go through the sidecar. If you have a deny-all policy, kubelet can't reach your health endpoints.

Handle this by allowing the kubelet:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-health-checks
  namespace: shop
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
    - to:
        - operation:
            methods: ["GET"]
            paths: ["/healthz", "/readyz", "/livez"]
```

Since kubelet doesn't go through the sidecar proxy (it calls the pod directly), you actually might not need this in all cases. But if your health endpoints are behind the sidecar, add this rule.

## Discovering Communication Patterns

If you're applying least privilege to an existing mesh, you need to know who talks to whom. Istio metrics give you this:

```bash
# Get all active communication paths from the last 7 days
curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=
    sum by (source_workload, source_workload_namespace, destination_service_name, destination_service_namespace) (
      increase(istio_requests_total[7d])
    ) > 0' | jq '.data.result[] | {
      source: "\(.metric.source_workload_namespace)/\(.metric.source_workload)",
      destination: "\(.metric.destination_service_namespace)/\(.metric.destination_service_name)",
      requests: .value[1]
    }'
```

Use this data to build your authorization policies. Each row in the output represents a communication path that needs an ALLOW rule.

## Rolling Out Least Privilege Safely

Going from no policies to deny-all is risky. Do it gradually:

**Step 1**: Deploy all ALLOW policies in audit mode first:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: order-service-access
  namespace: shop
  annotations:
    audit-mode: "true"
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/shop/sa/api-gateway"
```

**Step 2**: Enable the deny-all policy per namespace, starting with the least critical:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: internal-tools
spec:
  {}
```

**Step 3**: Monitor for 403 errors. Any 403s mean you're missing an ALLOW rule:

```promql
sum(rate(istio_requests_total{response_code="403"}[5m])) by (
  source_workload,
  destination_service_name,
  destination_service_namespace
)
```

**Step 4**: Add missing ALLOW rules and repeat until there are no unexpected 403s.

**Step 5**: Roll out deny-all to more namespaces.

## Maintaining Least Privilege Over Time

The initial setup is just the beginning. As your application evolves, new services get added and communication patterns change. Build processes to keep policies up to date:

1. Require authorization policies as part of service deployment (add it to your Helm charts or Kustomize overlays)
2. Review policies quarterly against actual traffic patterns
3. Alert on new communication paths that don't match any policy
4. Remove ALLOW rules when services are decommissioned

```yaml
groups:
  - name: least-privilege-monitoring
    rules:
      - alert: ExcessivePermissions
        expr: |
          count by (source_workload, destination_service_name) (
            increase(istio_requests_total[30d])
          ) == 0
          and on (source_workload, destination_service_name)
          count(kube_customresource_authorizationpolicy_info) > 0
        for: 30d
        labels:
          severity: info
        annotations:
          summary: "Authorization policy exists but no matching traffic for 30 days"
```

Least privilege is a discipline, not a one-time task. But the security benefits are enormous. When every service can only do exactly what it needs to do, the damage from any single compromise is contained. That's the whole point.
