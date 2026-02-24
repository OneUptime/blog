# How to Create an Istio ServiceEntry for External Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, Service Mesh, Kubernetes, External Services

Description: Learn how to create Istio ServiceEntry resources to register external services in your mesh and gain traffic management capabilities for outbound calls.

---

When you run Istio with outbound traffic policy set to `REGISTRY_ONLY`, your mesh-internal workloads can only reach services that Istio knows about. That means any call to an external API, database, or third-party service gets blocked unless you explicitly register it. The way you register external services in Istio is through the `ServiceEntry` resource.

Even if you run with `ALLOW_ANY` (the default), ServiceEntry is still valuable because it gives you observability, traffic management, and security controls over external calls. Without a ServiceEntry, external traffic just shows up as "PassthroughCluster" in your metrics, which is not helpful when you are trying to debug production issues.

## What is a ServiceEntry?

A ServiceEntry is an Istio custom resource that adds entries to the internal service registry that Istio maintains. Once an external service is registered, you can apply all the usual Istio features to it - things like traffic routing, fault injection, timeouts, retries, and mTLS.

Here is the basic structure of a ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: default
spec:
  hosts:
    - api.example.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

The key fields are:

- **hosts** - The DNS names of the external service. This is what your application code uses to connect.
- **location** - Whether the service is inside or outside the mesh. For external services, use `MESH_EXTERNAL`.
- **ports** - The ports the external service listens on.
- **resolution** - How the proxy resolves the host. Common values are `DNS`, `STATIC`, and `NONE`.

## Creating Your First ServiceEntry

Say you have a microservice that needs to call `https://api.stripe.com` to process payments. Without a ServiceEntry (and with `REGISTRY_ONLY` mode), those calls fail silently. Your pod logs show connection refused errors and you spend an hour debugging before realizing Istio is blocking the traffic.

Here is how to fix that:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stripe-api
  namespace: payments
spec:
  hosts:
    - api.stripe.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

Apply it:

```bash
kubectl apply -f stripe-serviceentry.yaml
```

Verify the ServiceEntry is created:

```bash
kubectl get serviceentry -n payments
```

You should see:

```
NAME         HOSTS              LOCATION        RESOLUTION   AGE
stripe-api   ["api.stripe.com"] MESH_EXTERNAL   DNS          5s
```

## Understanding Resolution Types

The `resolution` field controls how Envoy resolves the destination address. Picking the right one matters.

**DNS resolution** is the most common for external services. Envoy uses DNS to resolve the hostname and load balances across the returned addresses:

```yaml
spec:
  hosts:
    - api.example.com
  resolution: DNS
```

**STATIC resolution** is for when you know the exact IP addresses. You provide endpoints manually:

```yaml
spec:
  hosts:
    - my-external-db.example.com
  resolution: STATIC
  endpoints:
    - address: 192.168.1.100
    - address: 192.168.1.101
```

**NONE resolution** is used when the destination is already an IP address or when you want the connection forwarded as-is:

```yaml
spec:
  hosts:
    - my-service.example.com
  resolution: NONE
```

## Handling Multiple Ports

External services sometimes expose multiple ports. You can define all of them in a single ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: multi-port-service
spec:
  hosts:
    - service.external.com
  location: MESH_EXTERNAL
  ports:
    - number: 80
      name: http
      protocol: HTTP
    - number: 443
      name: https
      protocol: HTTPS
    - number: 8080
      name: http-alt
      protocol: HTTP
  resolution: DNS
```

## ServiceEntry with Specific Endpoints

Sometimes you need to route to specific IPs behind a hostname. This is common with on-premises services or when you want to control exactly which backend instances receive traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: on-prem-database
spec:
  hosts:
    - db.internal.company.com
  location: MESH_EXTERNAL
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  resolution: STATIC
  endpoints:
    - address: 10.0.1.50
      ports:
        tcp-postgres: 5432
      labels:
        region: us-east
    - address: 10.0.2.50
      ports:
        tcp-postgres: 5432
      labels:
        region: us-west
```

## Checking Your Outbound Traffic Policy

Before creating ServiceEntries, check what outbound policy your mesh uses:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep -A1 outboundTrafficPolicy
```

If it returns `REGISTRY_ONLY`, you absolutely need ServiceEntries for all external calls. If it returns `ALLOW_ANY` (or nothing, since ALLOW_ANY is the default), external calls work without ServiceEntries but you lose observability.

To switch to `REGISTRY_ONLY` mode in your IstioOperator config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
```

## Verifying ServiceEntry Works

After applying your ServiceEntry, test from inside a pod:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- curl -I https://api.stripe.com
```

You can also check the Envoy clusters to confirm the service was registered:

```bash
istioctl proxy-config cluster deploy/my-app | grep stripe
```

This should show the cluster for api.stripe.com with the correct port and protocol.

For deeper inspection, look at the routes:

```bash
istioctl proxy-config routes deploy/my-app --name 443
```

## Common Mistakes to Avoid

**Forgetting the port name prefix.** Istio uses port naming conventions to determine protocol. For TCP services, prefix with `tcp-`. For HTTP, use `http-` or just `http`. For HTTPS, use `https`.

**Wrong namespace.** ServiceEntries are namespace-scoped by default. If your ServiceEntry is in the `default` namespace but your workload is in `production`, the workload might not see it. You can either create the ServiceEntry in the same namespace or export it:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stripe-api
  namespace: default
spec:
  exportTo:
    - "*"
  hosts:
    - api.stripe.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

The `exportTo: ["*"]` makes the ServiceEntry visible to all namespaces. Use `exportTo: ["."]` to restrict it to the current namespace only.

**Using HTTP protocol for HTTPS endpoints.** If the external service uses TLS, set the protocol to `HTTPS` or `TLS`, not `HTTP`. Otherwise Envoy tries to parse TLS traffic as HTTP and everything breaks.

## Putting It All Together

Here is a practical example for a typical microservices application that depends on several external services:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-dependencies
spec:
  hosts:
    - api.stripe.com
    - api.sendgrid.com
    - s3.amazonaws.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
```

You can group multiple hosts in one ServiceEntry if they share the same port and protocol configuration. This keeps your manifests cleaner.

ServiceEntry is one of the most practical Istio resources you will use. It bridges the gap between your mesh-internal services and the outside world, giving you the same traffic management and observability for external calls that you already have for internal ones. Start with the basics shown here, and then layer on traffic policies, retries, and circuit breakers as your needs grow.
