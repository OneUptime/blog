# How to Set Up IP Whitelist for External Access in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, IP Whitelist, AuthorizationPolicy, Ingress Gateway

Description: Configure IP-based access control in Istio to whitelist trusted IP addresses for external traffic reaching your services through the ingress gateway.

---

IP whitelisting is a tried-and-true security measure. Even if you have authentication and authorization in place, restricting access to known IP ranges adds another layer of protection. This is especially useful for admin interfaces, partner APIs, or services that should only be accessible from corporate networks or specific cloud providers.

Istio's AuthorizationPolicy supports IP-based matching, and when combined with the ingress gateway, you can enforce IP whitelisting on external traffic.

## How External IP Reaches Istio

When an external client sends a request, it typically passes through a cloud load balancer, then hits the Istio ingress gateway. The client's real IP might be in the `X-Forwarded-For` header or the source IP of the connection, depending on your load balancer configuration.

Understanding where the real IP comes from is critical for IP whitelisting. If your policy matches on the wrong IP, you will either block legitimate users or fail to block unauthorized ones.

## Prerequisites

- Kubernetes cluster with Istio installed
- Ingress gateway configured
- Knowledge of your load balancer's behavior with client IPs

## Step 1: Decide Where Istio Should Read the Client IP

First, make sure you know how your load balancer passes the client IP to Istio.

If you use a network load balancer that preserves the packet source address, configure the ingress gateway Service with `externalTrafficPolicy: Local` and use `ipBlocks` in your AuthorizationPolicy.

**AWS (NLB):**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "external"
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "instance"
spec:
  externalTrafficPolicy: Local
```

**GKE:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
spec:
  externalTrafficPolicy: Local
```

Setting `externalTrafficPolicy: Local` ensures the client IP is preserved instead of being SNATed.

If you use an HTTP/HTTPS load balancer that appends `X-Forwarded-For`, or an L4 load balancer configured with PROXY protocol, configure Istio to trust the right number of proxies and use `remoteIpBlocks`.

## Step 2: Configure the Gateway to Trust XFF Headers

Tell the ingress gateway how many proxy hops to expect so it reads the correct client IP from X-Forwarded-For:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  namespace: istio-system
  name: istio-control-plane
spec:
  meshConfig:
    defaultConfig:
      gatewayTopology:
        numTrustedProxies: 1
```

Set `numTrustedProxies` to the number of trusted proxies between the client and the ingress gateway. If you have one HTTP load balancer in front of Istio, set it to 1. You can also configure this per gateway with the `proxy.istio.io/config` pod annotation.

## Step 3: Create the IP Whitelist Policy

Now apply an AuthorizationPolicy on the ingress gateway that only allows traffic from specific IPs:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ip-whitelist
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
    - from:
        - source:
            remoteIpBlocks:
              - "203.0.113.0/24"
              - "198.51.100.0/24"
              - "192.0.2.50/32"
```

The `remoteIpBlocks` field matches against the client's real IP (as determined by XFF and trusted hops). CIDR notation is supported, so you can whitelist entire subnets or individual IPs.

If your load balancer preserves the packet source address with `externalTrafficPolicy: Local` instead of using XFF or PROXY protocol, use `ipBlocks` in this policy.

```bash
kubectl apply -f ip-whitelist.yaml
```

## Using ipBlocks vs. remoteIpBlocks

Istio provides two fields for IP matching:

- **`ipBlocks`** matches the source address of the IP packet
- **`remoteIpBlocks`** matches the original client IP from X-Forwarded-For or PROXY protocol

For external traffic through an HTTP/HTTPS load balancer that appends XFF, or through PROXY protocol, use `remoteIpBlocks`.

For external traffic with `externalTrafficPolicy: Local`, use `ipBlocks`. For traffic within the mesh (pod-to-pod), use `ipBlocks` or service identity fields, since there are no intermediary external proxies.

## Per-Host Whitelisting

If you have multiple hosts on the same ingress gateway and want different IP rules per host:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-ip-whitelist
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
    - from:
        - source:
            remoteIpBlocks: ["203.0.113.0/24"]
      to:
        - operation:
            hosts: ["admin.example.com"]
    - to:
        - operation:
            hosts: ["api.example.com", "www.example.com"]
```

This restricts `admin.example.com` to a specific IP range while allowing `api.example.com` and `www.example.com` from anywhere.

## Combining IP Whitelist with Authentication

You can require both a valid IP and a valid JWT token:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: secure-admin
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
    - from:
        - source:
            remoteIpBlocks: ["203.0.113.0/24"]
            requestPrincipals: ["*"]
      to:
        - operation:
            hosts: ["admin.example.com"]
```

Both conditions under the same `source` block must be true (AND logic). The request must come from the whitelisted IP range AND have a valid JWT token.

## Denying Specific IPs

If you want to block specific IPs while allowing everything else, use a DENY policy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: block-bad-ips
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
              - "10.0.0.0/8"
              - "172.16.0.0/12"
              - "192.168.0.0/16"
```

This blocks all private IP ranges from the ingress gateway. Combined with an ALLOW policy or no policy (which allows all by default), only non-private IPs can reach your services.

## Testing the Whitelist

From a whitelisted IP:

```bash
curl -s -o /dev/null -w "%{http_code}" https://admin.example.com/dashboard
# Expected: 200

```

From a non-whitelisted IP:

```bash
curl -s -o /dev/null -w "%{http_code}" https://admin.example.com/dashboard
# Expected: 403
```

Check the gateway logs:

```bash
kubectl logs deploy/istio-ingressgateway -n istio-system | grep "403"
```

To verify what IP Istio sees:

```bash
kubectl logs deploy/istio-ingressgateway -n istio-system | grep "x-forwarded-for"
```

## Dynamic IP Updates

If your whitelisted IPs change frequently (like developer VPN IPs), you can manage the AuthorizationPolicy through CI/CD or a custom controller that reads from an external source:

```bash
# Update the policy with a new IP range
kubectl patch authorizationpolicy ip-whitelist -n istio-system --type=merge -p '{
  "spec": {
    "rules": [{
      "from": [{
        "source": {
          "remoteIpBlocks": ["203.0.113.0/24", "198.51.100.0/24", "10.20.30.0/24"]
        }
      }]
    }]
  }
}'
```

## Common Issues

**Load balancer SNAT.** If your load balancer SNATs the client IP and does not provide XFF or PROXY protocol, Istio will not see the real client IP. Use `externalTrafficPolicy: Local` with `ipBlocks`, or configure XFF or PROXY protocol and use `remoteIpBlocks`.

**Wrong XFF hop count.** If `numTrustedProxies` is wrong, Istio reads the wrong IP from the X-Forwarded-For chain. Too low and you get the load balancer IP. Too high and a client could spoof their IP.

**IPv6.** If your cluster uses IPv6, make sure to include IPv6 CIDR ranges in your whitelist.

**Policy conflicts.** If you have multiple AuthorizationPolicies on the ingress gateway, remember the evaluation order: DENY first, then ALLOW. An overly broad DENY can block traffic you intended to allow.

## Validation

```bash
istioctl analyze -n istio-system
kubectl get authorizationpolicy -n istio-system
```

## Summary

IP whitelisting in Istio works through AuthorizationPolicy on the ingress gateway with `remoteIpBlocks` for XFF or PROXY protocol client IP matching, or `ipBlocks` when using `externalTrafficPolicy: Local`. The key setup step is ensuring client IPs are preserved through your load balancer configuration and `numTrustedProxies`. Combine IP whitelisting with JWT authentication for defense in depth, and use CIDR notation to manage IP ranges efficiently. Test from both whitelisted and non-whitelisted IPs to verify your policies are working correctly.
