# How to Set Up IP-Based Allowlist/Denylist at Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, IP Filtering, Security, Gateway, Kubernetes

Description: How to configure IP-based allowlists and denylists at the Istio ingress gateway to control access by source IP address for security and compliance.

---

Controlling access by IP address is one of the oldest and simplest security measures. You might want to restrict your admin panel to only company office IPs, block known malicious IP ranges, or limit API access to specific partner networks. Istio provides AuthorizationPolicy resources that can filter traffic at the gateway based on the client's source IP address.

## Understanding Source IP in Istio

Before configuring IP-based rules, you need to understand how the source IP reaches the Istio gateway. If your cluster is behind a load balancer, the actual client IP might be in the `X-Forwarded-For` header rather than the TCP connection's source address.

Check what your gateway sees:

```bash
# Look at access logs
kubectl logs -n istio-system <istio-ingressgateway-pod> | head -20
```

The source IP in the log tells you what the gateway sees. If it is always the load balancer's IP, you need to configure the gateway to trust the `X-Forwarded-For` header.

Configure the gateway to use the correct number of trusted proxies:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: xff-num-trusted-hops
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: NETWORK_FILTER
      match:
        context: GATEWAY
        listener:
          filterChain:
            filter:
              name: "envoy.filters.network.http_connection_manager"
      patch:
        operation: MERGE
        value:
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
            xff_num_trusted_hops: 1
```

Set `xff_num_trusted_hops` to the number of proxy layers between the client and the Istio gateway. If you have one load balancer in front, set it to 1. If you have a CDN and a load balancer, set it to 2.

Alternatively, if you are using an AWS or GCP load balancer with proxy protocol:

```bash
# For AWS NLB with proxy protocol
istioctl install --set meshConfig.defaultConfig.gatewayTopology.numTrustedProxies=1
```

## Creating an IP Allowlist

To restrict access to specific IP addresses, create an AuthorizationPolicy with ALLOW action:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: ip-allowlist
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
              - "10.0.0.0/8"
```

This allows traffic only from the specified IP ranges. Everything else gets denied with a 403 response.

The `remoteIpBlocks` field uses the client's actual IP (accounting for XFF headers based on your trusted proxy configuration). Use `ipBlocks` instead if you want to match on the direct connection IP (the load balancer's IP in most cloud setups).

## Creating an IP Denylist

To block specific IPs while allowing everything else, use the DENY action:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: ip-denylist
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
              - "198.51.100.100/32"
              - "203.0.113.50/32"
```

When using a DENY policy, you need a corresponding ALLOW policy or the default behavior will kick in. To allow all other traffic:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-all
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
    - {}
```

The order of evaluation in Istio is: CUSTOM, then DENY, then ALLOW. So the DENY rules are checked first, and if none match, the ALLOW rule allows the traffic.

## Per-Host IP Restrictions

You might want different IP restrictions for different hosts. For example, the admin panel should be restricted to office IPs, but the public website should be open to everyone:

```yaml
# Deny all to admin panel except office IPs
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: admin-ip-restrict
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: DENY
  rules:
    - to:
        - operation:
            hosts:
              - "admin.example.com"
      from:
        - source:
            notRemoteIpBlocks:
              - "203.0.113.0/24"
              - "198.51.100.0/24"
```

This denies any request to `admin.example.com` that does not come from the specified IP ranges. The `notRemoteIpBlocks` field inverts the match, so it matches everything except those IPs.

## Combining IP Rules with Other Conditions

You can combine IP restrictions with other conditions like paths or methods:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: api-ip-restrict
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: DENY
  rules:
    - to:
        - operation:
            hosts:
              - "api.example.com"
            paths:
              - "/admin/*"
            methods:
              - "DELETE"
              - "PUT"
      from:
        - source:
            notRemoteIpBlocks:
              - "10.0.0.0/8"
```

This blocks DELETE and PUT requests to the admin API from outside the internal network.

## Using CIDR Notation

Both `remoteIpBlocks` and `ipBlocks` support CIDR notation:

- `/32` - Single IP address
- `/24` - 256 addresses (e.g., 10.0.0.0 to 10.0.0.255)
- `/16` - 65,536 addresses (e.g., 10.0.0.0 to 10.0.255.255)
- `/8` - 16,777,216 addresses (e.g., 10.0.0.0 to 10.255.255.255)

Common ranges you might want to block or allow:

```yaml
# RFC 1918 private networks
- "10.0.0.0/8"
- "172.16.0.0/12"
- "192.168.0.0/16"

# Cloudflare IPs (if you want to only accept traffic from Cloudflare)
- "173.245.48.0/20"
- "103.21.244.0/22"
- "103.22.200.0/22"
- "103.31.4.0/22"
- "141.101.64.0/18"
- "108.162.192.0/18"
- "190.93.240.0/20"
- "188.114.96.0/20"
- "197.234.240.0/22"
- "198.41.128.0/17"
- "162.158.0.0/15"
- "104.16.0.0/13"
- "104.24.0.0/14"
- "172.64.0.0/13"
- "131.0.72.0/22"
```

## Geo-Blocking with IP Ranges

If you need to block entire countries, you can use country IP ranges from services like MaxMind. The approach is the same, just with larger CIDR blocks:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: geo-block
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
              # List of IP ranges to block
              - "1.0.0.0/24"
              - "1.0.4.0/22"
              # ... more ranges
```

For large IP lists, this can get unwieldy. Consider using a WAF (like AWS WAF or Cloudflare) in front of the Istio gateway for geo-blocking, and use Istio for more specific IP rules.

## Testing IP Rules

Test your rules thoroughly before deploying to production:

```bash
# Get the gateway IP
export GATEWAY_IP=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test from allowed IP (adjust based on your rules)
curl -v -H "Host: admin.example.com" http://$GATEWAY_IP/

# Test from blocked IP (use a VPN or proxy to simulate different IPs)
curl -v -H "Host: admin.example.com" http://$GATEWAY_IP/

# Check what IP the gateway sees
kubectl logs -n istio-system <gateway-pod> --tail=10
```

## Monitoring Denied Requests

Track how many requests are being denied by your IP rules:

```promql
sum(rate(istio_requests_total{
  response_code="403",
  destination_service_name="istio-ingressgateway"
}[5m]))
```

Set up an alert if the denial rate spikes:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ip-block-alerts
spec:
  groups:
    - name: ip-blocking
      rules:
        - alert: HighDenialRate
          expr: |
            sum(rate(istio_requests_total{response_code="403", destination_service_name="istio-ingressgateway"}[5m])) > 100
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High rate of denied requests at gateway"
```

## Summary

IP-based access control at the Istio gateway uses AuthorizationPolicy with `remoteIpBlocks` for allowlists and denylists. The critical first step is making sure the gateway sees the real client IP by configuring `xff_num_trusted_hops` correctly. Use ALLOW action for allowlists and DENY action for denylists. You can scope rules to specific hosts and paths for different access levels. For large-scale geo-blocking, consider using a CDN or WAF in front of Istio instead of managing thousands of CIDR blocks in an AuthorizationPolicy.
