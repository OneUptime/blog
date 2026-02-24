# How to Set Up IP Whitelisting at Istio Ingress Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, IP Whitelisting, AuthorizationPolicy, Ingress Gateway

Description: How to restrict access to your Istio Ingress Gateway by whitelisting specific IP addresses using AuthorizationPolicy and EnvoyFilter approaches.

---

IP whitelisting at the ingress gateway is one of those security measures that sounds simple but has a few gotchas in practice. The main challenge is making sure the real client IP address reaches the authorization check, especially when your gateway sits behind a cloud load balancer or proxy.

This guide shows you how to set up IP-based access control at the Istio ingress gateway using AuthorizationPolicy and how to deal with the common issues around client IP detection.

## The Client IP Problem

Before you can whitelist IPs, you need to make sure Istio sees the real client IP. If a cloud load balancer sits in front of your ingress gateway, the source IP might be the load balancer's IP instead of the client's.

Check what IP the ingress gateway sees:

```bash
kubectl logs -n istio-system deploy/istio-ingressgateway --tail=5
```

Look at the source IP in the access logs. If it shows internal IPs, you need to configure the gateway to trust the `X-Forwarded-For` header from the load balancer.

Configure the number of trusted proxies in your Istio mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      gatewayTopology:
        numTrustedProxies: 1
```

Set `numTrustedProxies` to the number of proxies between the client and the ingress gateway. If you have one load balancer in front, set it to 1. This tells Envoy to extract the real client IP from the `X-Forwarded-For` header.

## Using AuthorizationPolicy for IP Whitelisting

AuthorizationPolicy is the recommended way to control access based on IP addresses. Here is a basic setup that allows only specific IPs:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ingress-ip-whitelist
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
        - "198.51.100.50/32"
        - "192.0.2.0/28"
```

The `remoteIpBlocks` field matches against the original client IP (extracted from `X-Forwarded-For` when `numTrustedProxies` is configured). If you want to match against the immediate downstream connection IP instead, use `ipBlocks`.

The difference matters:

- `remoteIpBlocks` - the original client IP, parsed from XFF headers
- `ipBlocks` - the direct connection source IP (which might be a load balancer)

## Denying All Traffic Except Whitelisted IPs

The AuthorizationPolicy above only allows traffic from whitelisted IPs. But you also need to make sure all other traffic is denied. When you have any ALLOW policy, Istio implicitly denies non-matching traffic. So the policy above is sufficient on its own.

However, if you have other ALLOW policies on the same workload, things get tricky. Multiple ALLOW policies are OR'd together, meaning any one of them can grant access. If that is a concern, you can use a DENY policy to explicitly block non-whitelisted IPs:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-non-whitelisted
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: DENY
  rules:
  - from:
    - source:
        notRemoteIpBlocks:
        - "203.0.113.0/24"
        - "198.51.100.50/32"
        - "192.0.2.0/28"
```

The `notRemoteIpBlocks` field matches everything except the listed CIDRs. DENY policies are evaluated before ALLOW policies, so this takes precedence.

## Per-Host IP Whitelisting

You might want different IP whitelists for different hosts. For example, your main app is public but your admin panel is restricted:

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
  action: DENY
  rules:
  - from:
    - source:
        notRemoteIpBlocks:
        - "10.0.0.0/8"
        - "203.0.113.100/32"
    to:
    - operation:
        hosts:
        - "admin.example.com"
```

This denies access to `admin.example.com` from any IP not in the whitelist, while leaving other hosts unrestricted.

## Whitelisting with CIDR Ranges

You can use CIDR notation to whitelist entire IP ranges. Here are some common patterns:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: office-whitelist
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
        # Office network
        - "203.0.113.0/24"
        # VPN exit IPs
        - "198.51.100.10/32"
        - "198.51.100.11/32"
        # Partner network
        - "192.0.2.0/24"
        # Cloud NAT range
        - "35.200.0.0/16"
```

## Combining IP Whitelisting with Other Auth

You can combine IP whitelisting with other authorization rules. For example, allow specific IPs OR requests with a valid JWT:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ip-or-jwt
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
  - from:
    - source:
        requestPrincipals:
        - "https://accounts.google.com/*"
```

Each rule entry is OR'd together. This means traffic is allowed if it comes from the whitelisted IP range OR if it has a valid JWT from Google.

## Testing the Configuration

After applying your policies, test from a whitelisted IP:

```bash
curl -v https://app.example.com/
```

And from a non-whitelisted IP (use a different network or a proxy):

```bash
curl -v https://app.example.com/
# Should get HTTP 403 Forbidden
```

Check the ingress gateway logs to see the RBAC decisions:

```bash
kubectl logs -n istio-system deploy/istio-ingressgateway | grep rbac
```

You should see entries like `rbac_access_denied` for blocked requests.

## Debugging IP Detection Issues

If the whitelist is not working as expected, the most likely cause is incorrect client IP detection. Debug it step by step:

1. Check what IP Envoy sees as the source:

```bash
kubectl logs -n istio-system deploy/istio-ingressgateway --tail=20
```

2. Check the `X-Forwarded-For` header that reaches the gateway:

```bash
istioctl proxy-config log deploy/istio-ingressgateway -n istio-system --level=debug
```

3. Verify `numTrustedProxies` is set correctly:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep -A5 gatewayTopology
```

4. If using AWS NLB with IP targets or GCP with direct server return, the source IP might already be the client IP, and you should use `ipBlocks` instead of `remoteIpBlocks`.

## Dynamic IP Whitelisting

For environments where IP addresses change frequently (like auto-scaling CI/CD runners), you can update the AuthorizationPolicy dynamically:

```bash
# Get current allowed IPs from your IPAM system
ALLOWED_IPS=$(curl -s https://internal-api/allowed-ips | jq -r '.[]')

# Generate and apply updated policy
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: dynamic-whitelist
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
$(echo "$ALLOWED_IPS" | while read ip; do echo "        - \"$ip\""; done)
EOF
```

This can be run as a CronJob in your cluster to keep the whitelist updated.

## Summary

IP whitelisting at the Istio ingress gateway works best with AuthorizationPolicy using `remoteIpBlocks` or `notRemoteIpBlocks`. The critical step is configuring `numTrustedProxies` correctly so Istio extracts the real client IP from the `X-Forwarded-For` header. Use DENY policies for strict whitelisting, and combine with host-based rules when different endpoints need different access controls.
