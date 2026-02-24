# How to Configure Tenant Isolation with Sidecar Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Multi-Tenancy, Service Discovery, Performance

Description: Use Istio Sidecar resources to isolate tenant service discovery, reduce Envoy proxy memory usage, and limit cross-namespace visibility in a multi-tenant mesh.

---

When you run a multi-tenant Istio mesh without Sidecar resources, every Envoy proxy in the mesh knows about every service in every namespace. That means a proxy in tenant-a's namespace has full configuration for services in tenant-b, tenant-c, and every other namespace. This is wasteful in terms of memory and CPU, and it is a potential security concern because the proxy configuration reveals the existence of other tenants' services.

The Istio Sidecar resource fixes this by scoping what each proxy can see.

## The Problem with Default Service Discovery

Out of the box, Istio's control plane (istiod) pushes configuration for all services in the mesh to every sidecar proxy. In a cluster with 500 services across 20 tenant namespaces, every single Envoy proxy gets routing rules for all 500 services.

Check the current configuration size for a proxy:

```bash
istioctl proxy-config cluster deploy/my-service -n tenant-a | wc -l
```

If you see hundreds or thousands of clusters when your tenant only has 10 services, you are paying an unnecessary cost. Each additional cluster entry uses memory in the proxy and takes CPU time during configuration updates.

## Creating Namespace-Scoped Sidecar Resources

The Sidecar resource lets you define what hosts a proxy should know about. For multi-tenant isolation, create one in each tenant namespace:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: tenant-a
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
```

The `./*` means "all services in my own namespace" and `istio-system/*` allows access to Istio's own services (like the ingress gateway). The proxy will not receive configuration for any other namespace.

Apply this for every tenant:

```bash
for ns in tenant-a tenant-b tenant-c tenant-d; do
  kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: $ns
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
EOF
done
```

After applying, check the configuration size again:

```bash
istioctl proxy-config cluster deploy/my-service -n tenant-a | wc -l
```

You should see a significant reduction. In a cluster with 500 services where tenant-a has 15, the proxy configuration drops from 500+ clusters to around 20.

## Adding Shared Services Access

If tenants need access to shared services, add those namespaces to the Sidecar resource:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: tenant-a
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "shared-services/*"
    - "monitoring/*"
```

You can also be selective about which services in a namespace to expose:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: tenant-a
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "shared-services/auth-service.shared-services.svc.cluster.local"
    - "shared-services/cache-service.shared-services.svc.cluster.local"
```

This gives tenant-a access to only the auth and cache services from the shared namespace, not every service in that namespace.

## Workload-Specific Sidecar Configuration

Sometimes different workloads within the same tenant need different service visibility. A frontend might only need access to the backend API, while a background worker needs access to the message queue.

Use the `workloadSelector` to target specific pods:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: frontend-sidecar
  namespace: tenant-a
spec:
  workloadSelector:
    labels:
      app: frontend
  egress:
  - hosts:
    - "./backend-api.tenant-a.svc.cluster.local"
    - "istio-system/*"
---
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: worker-sidecar
  namespace: tenant-a
spec:
  workloadSelector:
    labels:
      app: background-worker
  egress:
  - hosts:
    - "./task-queue.tenant-a.svc.cluster.local"
    - "shared-services/rabbitmq.shared-services.svc.cluster.local"
    - "istio-system/*"
```

The frontend can only reach the backend API. The worker can reach the task queue and RabbitMQ. Neither can reach anything else.

## Controlling Inbound Configuration

The Sidecar resource also controls inbound listener configuration. By default, a proxy listens on all ports that the workload exposes. You can restrict this:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: api-sidecar
  namespace: tenant-a
spec:
  workloadSelector:
    labels:
      app: api-service
  ingress:
  - port:
      number: 8080
      protocol: HTTP
      name: http
    defaultEndpoint: 127.0.0.1:8080
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
```

The `ingress` section explicitly declares that the proxy should only accept inbound traffic on port 8080 and forward it to the application on localhost:8080. Any traffic on other ports gets dropped.

## Outbound Traffic Policy

Control what happens when a tenant tries to reach a service that is not in their Sidecar scope. The `outboundTrafficPolicy` field determines this:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: tenant-a
spec:
  outboundTrafficPolicy:
    mode: REGISTRY_ONLY
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "shared-services/*"
```

With `REGISTRY_ONLY`, any attempt to reach a service not listed in the egress hosts returns a 502 error. This prevents data exfiltration and accidental connections to external services.

The alternative is `ALLOW_ANY`, which lets traffic to unknown destinations pass through. Use this only if your tenants need to reach arbitrary external services and you control egress through other means (like a proxy or firewall).

## Measuring the Performance Impact

Sidecar resources have a measurable impact on proxy performance. Here is how to quantify it.

Check proxy memory usage before and after applying Sidecar resources:

```bash
# Before Sidecar resources
kubectl top pod -n tenant-a -l app=my-service --containers | grep istio-proxy

# Apply Sidecar resource, wait for config to propagate
kubectl apply -f sidecar.yaml
sleep 30

# After Sidecar resources
kubectl top pod -n tenant-a -l app=my-service --containers | grep istio-proxy
```

Check xDS configuration push time:

```bash
kubectl exec -n istio-system deploy/istiod -- \
  curl -s localhost:15014/metrics | grep pilot_xds_push_time
```

In large meshes (hundreds of services), applying Sidecar resources can reduce proxy memory usage by 50-80% and cut configuration push times significantly. This directly translates to faster pod startup (less time waiting for proxy configuration) and lower resource costs.

## Debugging Sidecar Configuration Issues

If a service cannot reach another service after applying a Sidecar resource, the most likely cause is a missing host in the egress section. Debug it:

```bash
# Check what clusters the proxy knows about
istioctl proxy-config cluster deploy/my-service -n tenant-a

# Check if the target service is in the list
istioctl proxy-config cluster deploy/my-service -n tenant-a | grep target-service

# If it is not there, check the Sidecar resource
kubectl get sidecar -n tenant-a -o yaml
```

Another common issue is using the wrong host format. The hosts in a Sidecar resource use the format `namespace/dnsName`. Make sure you are using the right namespace prefix:

```yaml
# Correct
- "shared-services/*"
- "shared-services/auth-service.shared-services.svc.cluster.local"

# Wrong - will not match anything
- "shared-services/auth-service"
```

The short name `auth-service` does not work. You need either a wildcard `*` or the full DNS name.

## Combining Sidecar Resources with Authorization Policies

Sidecar resources and AuthorizationPolicies complement each other:

- Sidecar resources control **service discovery** (what the proxy knows about)
- AuthorizationPolicies control **access** (what requests are allowed)

Apply both for defense in depth:

```yaml
# Sidecar: tenant-a can only see its own services and shared-services
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: tenant-a
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "shared-services/*"
---
# AuthorizationPolicy: tenant-a services only accept traffic from tenant-a
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: intra-tenant-only
  namespace: tenant-a
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces:
        - tenant-a
    - source:
        principals:
        - "cluster.local/ns/istio-system/sa/istio-ingressgateway-service-account"
```

Even if someone misconfigures a Sidecar resource and a proxy learns about another tenant's services, the AuthorizationPolicy still blocks the actual traffic.

## Summary

Sidecar resources are essential for multi-tenant Istio deployments. They reduce proxy memory and CPU usage, speed up configuration propagation, limit service discovery to what each tenant needs, and provide an additional layer of isolation. Always pair them with AuthorizationPolicies for full defense in depth. The performance benefits alone justify the effort, but the security improvements make them a requirement for any serious multi-tenant setup.
