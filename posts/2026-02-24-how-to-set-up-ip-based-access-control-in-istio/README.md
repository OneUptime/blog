# How to Set Up IP-Based Access Control in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, Authorization, Networking, Kubernetes

Description: A practical guide to configuring IP-based access control in Istio using authorization policies to allow or deny traffic based on source IP addresses.

---

Sometimes you need to restrict access to your services based on where the traffic is coming from. Maybe you want to lock down an admin panel to your office IP range, or block requests from known bad actors. Istio makes this possible through authorization policies that can match on source IP addresses.

Setting this up is not complicated, but there are a few gotchas around how Istio sees the client IP, especially when traffic passes through load balancers and proxies. This guide walks through the practical steps.

## How Istio Identifies Source IPs

Before writing any policies, you need to understand how Istio determines the source IP of a request. There are two relevant concepts:

- **Direct remote address** - The IP address of the immediate downstream connection (the last hop before the Envoy proxy)
- **Original client IP** - The real client IP, typically extracted from the `X-Forwarded-For` header

When traffic comes directly from another pod in the mesh, the direct remote address is usually the pod IP. But when traffic comes through an external load balancer or ingress gateway, the direct remote address is the load balancer's IP, not the actual client.

To work with real client IPs, you need to configure Istio to trust the `X-Forwarded-For` header.

## Configuring the Gateway to Preserve Client IP

First, make sure your ingress gateway is configured to extract and trust the client IP. You do this through the `MeshConfig`:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      gatewayTopology:
        numTrustedProxies: 1
```

The `numTrustedProxies` value tells Istio how many proxy hops sit between the client and the gateway. If you have a single external load balancer in front of your Istio ingress gateway, set this to `1`. If you have two layers of proxies (like a CDN plus a cloud load balancer), set it to `2`.

After applying this configuration, restart the ingress gateway pods:

```bash
kubectl rollout restart deployment istio-ingressgateway -n istio-system
```

## Basic IP Allow List

Here is a straightforward policy that only allows traffic from specific IP ranges:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-office-ips
  namespace: default
spec:
  selector:
    matchLabels:
      app: admin-dashboard
  action: ALLOW
  rules:
  - from:
    - source:
        ipBlocks:
        - "203.0.113.0/24"
        - "198.51.100.50"
```

This policy allows traffic to the `admin-dashboard` workload only from the `203.0.113.0/24` CIDR range and the single IP `198.51.100.50`. All other traffic will be denied (as long as there are no other ALLOW policies that match).

## IP Deny List

If you want to block specific IPs while allowing everything else, use a DENY policy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-bad-ips
  namespace: default
spec:
  selector:
    matchLabels:
      app: public-api
  action: DENY
  rules:
  - from:
    - source:
        ipBlocks:
        - "192.0.2.0/24"
        - "10.255.0.100"
```

DENY policies are evaluated before ALLOW policies, so any traffic from these IPs will be rejected regardless of other policies.

## Using remoteIpBlocks for External Traffic

When traffic passes through a load balancer, `ipBlocks` matches the direct remote address, which might be the load balancer IP rather than the actual client. To match on the original client IP (from `X-Forwarded-For`), use `remoteIpBlocks`:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-external-clients
  namespace: default
spec:
  selector:
    matchLabels:
      app: admin-dashboard
  action: ALLOW
  rules:
  - from:
    - source:
        remoteIpBlocks:
        - "203.0.113.0/24"
```

The `remoteIpBlocks` field uses the IP extracted from `X-Forwarded-For` based on the `numTrustedProxies` setting. This is what you want when controlling access for external clients coming through an ingress gateway.

For internal mesh traffic (pod-to-pod), stick with `ipBlocks` since there is no load balancer in the way.

## Combining IP Rules with Other Conditions

You can combine IP-based rules with path, method, and header matching for more precise control:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-ip-and-path
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
  - from:
    - source:
        remoteIpBlocks:
        - "203.0.113.0/24"
    to:
    - operation:
        paths:
        - "/admin/*"
        methods:
        - "GET"
        - "POST"
  - to:
    - operation:
        paths:
        - "/public/*"
        methods:
        - "GET"
```

This policy does two things: it allows the `/admin/*` paths only from the office IP range, and it allows `/public/*` paths from anyone. The two rules in the `rules` array are ORed together, so a request matches if it satisfies either rule.

## Excluding IPs with notIpBlocks

Sometimes it is easier to say "allow everything except these IPs." You can use `notIpBlocks` and `notRemoteIpBlocks` for this:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-except-trusted
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: DENY
  rules:
  - from:
    - source:
        notRemoteIpBlocks:
        - "203.0.113.0/24"
        - "198.51.100.0/24"
    to:
    - operation:
        paths:
        - "/admin/*"
```

This denies any request to `/admin/*` that does NOT come from the trusted IP ranges. It is a slightly different way to achieve an allow-list effect.

## Applying IP Policies at the Gateway Level

For cluster-wide IP blocking, you can apply policies directly to the ingress gateway:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: gateway-ip-block
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: DENY
  rules:
  - from:
    - source:
        remoteIpBlocks:
        - "192.0.2.0/24"
```

This blocks traffic at the gateway before it even reaches your services. Doing IP filtering at the gateway is generally more efficient than doing it at every individual workload.

## Verifying Your IP Policies

After applying a policy, test it with curl:

```bash
# From a machine with an allowed IP
curl -v https://your-service.example.com/admin/

# Check response headers for RBAC info
# A denied request returns HTTP 403
```

To see what the proxy thinks the client IP is, check the Envoy access logs:

```bash
kubectl logs <gateway-pod> -c istio-proxy -n istio-system | tail -20
```

The access log format includes the downstream remote address and the `X-Forwarded-For` header value, which helps you verify that the right IP is being used for policy evaluation.

You can also inspect the loaded authorization config:

```bash
istioctl proxy-config listener <pod-name> -n default -o json | grep -A 20 "rbac"
```

## Common Pitfalls

**Forgetting numTrustedProxies.** If you do not set this, `remoteIpBlocks` will not work correctly because Istio will not know how to extract the real client IP from `X-Forwarded-For`.

**Using ipBlocks for external traffic.** When traffic passes through a load balancer, `ipBlocks` will match the load balancer's IP, not the client's. Use `remoteIpBlocks` instead.

**CIDR notation mistakes.** Double-check your CIDR ranges. A `/24` covers 256 addresses, a `/32` is a single IP. Getting this wrong can either block too much or too little.

**Overlapping ALLOW and DENY policies.** DENY always wins. If you have a DENY policy that matches a request, no ALLOW policy can override it.

IP-based access control in Istio is a solid layer of defense, especially for administrative interfaces and sensitive endpoints. Combined with mTLS and identity-based policies, it gives you multiple layers of protection for your services.
