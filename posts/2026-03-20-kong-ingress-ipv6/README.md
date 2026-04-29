# How to Configure Kong Ingress Controller for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Kong, Kubernetes, Ingress, API Gateway, Dual-Stack

Description: Configure Kong Ingress Controller to accept IPv6 traffic, route to IPv6 backend services, and apply plugins for IPv6 client IP handling and rate limiting in dual-stack Kubernetes clusters.

## Introduction

Kong Ingress Controller (KIC) is a Kubernetes-native API gateway built on Kong Gateway. For IPv6, Kong must be configured to listen on IPv6 ports, and its Kubernetes service must expose IPv6 load balancer addresses. Kong's IP restriction plugin supports IPv6 CIDR notation, and rate limiting can identify IPv6 clients by IP once real IP handling is configured correctly.

## Install Kong with IPv6 Service (Helm)

```yaml
# kong-values.yaml - Helm values for kong/ingress with IPv6

gateway:
  proxy:
    # Kong proxy service with dual-stack
    type: LoadBalancer
    annotations:
      service.beta.kubernetes.io/aws-load-balancer-ip-address-type: "dualstack"

    ipFamilyPolicy: PreferDualStack
    ipFamilies:
      - IPv4
      - IPv6

    http:
      enabled: true
      servicePort: 80
      containerPort: 8000

    tls:
      enabled: true
      servicePort: 443
      containerPort: 8443

  admin:
    enabled: true
    type: ClusterIP
    clusterIP: None # Keep the Admin API internal for gateway discovery

  env:
    # Kong listens on both IPv4 and IPv6
    admin_listen: "0.0.0.0:8444 ssl, [::]:8444 ssl"
    proxy_listen: "0.0.0.0:8000, [::]:8000, 0.0.0.0:8443 ssl, [::]:8443 ssl"
```

```bash
# Install Kong Ingress Controller
helm repo add kong https://charts.konghq.com
helm repo update
helm install kong kong/ingress -n kong --create-namespace -f kong-values.yaml

# Verify Kong service has IPv6
kubectl get svc -n kong kong-gateway-proxy \
  -o jsonpath='{range .status.loadBalancer.ingress[0]}{@.ip}{@.hostname}{end}'
# Depending on the cloud provider, this may show an IP or a hostname with AAAA records
```

## Standard Ingress with Kong

```yaml
# ingress-kong-ipv6.yaml

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
  namespace: production
  annotations:
    # Kong-specific annotations
    konghq.com/preserve-host: "true"
    konghq.com/strip-path: "false"
    konghq.com/protocols: "https"
    konghq.com/https-redirect-status-code: "308"
    # Plugin for rate limiting (supports IPv6)
    konghq.com/plugins: rate-limit-ipv6,ip-restrict-ipv6
spec:
  ingressClassName: kong
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp
                port:
                  number: 8080
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls
```

## Kong Plugin: Rate Limiting with IPv6

```yaml
# kong-rate-limit-ipv6.yaml

apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limit-ipv6
  namespace: production
plugin: rate-limiting
config:
  # Kong rate limits by the full client IP address when limit_by=ip
  # For shared limits across multiple IPv6 addresses, use consumer or another custom key
  minute: 100
  hour: 1000
  policy: local
  limit_by: ip
```

## Kong Plugin: IP Restriction for IPv6

```yaml
# kong-ip-restrict-ipv6.yaml

apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: ip-restrict-ipv6
  namespace: production
plugin: ip-restriction
config:
  # Allow list: both IPv4 and IPv6 CIDRs
  allow:
    - "10.0.0.0/8"
    - "192.168.0.0/16"
    - "fd00::/8"            # ULA internal
    - "2001:db8:100::/48"   # Corporate IPv6
  # Deny list (optional)
  deny:
    - "2001:db8:bad::/48"
```

## KongUpstreamPolicy for IPv6 Backend Configuration

```yaml
# service-kong-ipv6.yaml

apiVersion: v1
kind: Service
metadata:
  name: myapp
  namespace: production
  annotations:
    # Service configuration
    konghq.com/protocol: "http"
    konghq.com/retries: "5"
    konghq.com/connect-timeout: "5000"
    konghq.com/write-timeout: "60000"
    konghq.com/read-timeout: "60000"
    konghq.com/upstream-policy: myapp-upstream-config
spec:
  selector:
    app: myapp
  ports:
    - name: http
      port: 8080
      targetPort: 8080
---
# Configure upstream for IPv6 backends
apiVersion: configuration.konghq.com/v1beta1
kind: KongUpstreamPolicy
metadata:
  name: myapp-upstream-config
  namespace: production
spec:
  algorithm: round-robin
  healthchecks:
    active:
      type: http
      httpPath: /health
      healthy:
        interval: 10
        successes: 2
      unhealthy:
        interval: 5
        httpFailures: 3
```

## Kong Admin API Configuration via IPv6

```bash
# Access Kong Admin API over IPv6 (TLS is enabled by default in kong/ingress)
curl -6 -k "https://[2001:db8::10]:8444/services" | jq .

# Inspect routes loaded by Kong
curl -6 -k "https://[2001:db8::10]:8444/routes" | jq '.data[].hosts'

# The default kong/ingress deployment runs Kong Gateway in DB-less mode.
# Configure Services, Routes, and Plugins with Kubernetes resources instead
# of POSTing to /services, /routes, or /plugins.
```

## Kong with IPv6 Real IP

```yaml
# kong-real-ip-plugin.yaml - Optional custom header derived from the forwarded client IP

apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: forwarded-ip
  namespace: production
plugin: request-transformer
config:
  # Optional: copy the forwarded client IP into a custom header for backends
  add:
    headers:
      - 'X-Client-IP:$(headers["x-forwarded-for"])'
```

```bash
# Set trusted CIDRs in Kong (for real IP determination)
# In kong.conf or via environment variable:
# trusted_ips = 10.0.0.0/8, fd00::/8, 2001:db8:100::/48
# real_ip_header = X-Forwarded-For
# real_ip_recursive = on

# Helm values equivalent:
# gateway:
#   env:
#     trusted_ips: "10.0.0.0/8,fd00::/8,2001:db8:100::/48"
#     real_ip_header: "X-Forwarded-For"
#     real_ip_recursive: "on"
```

## Verify Kong IPv6 Operation

```bash
# Check Kong listen configuration
kubectl exec -n kong deployment/kong-gateway -- \
    printenv KONG_PROXY_LISTEN KONG_ADMIN_LISTEN
# Should include [::]:8000, [::]:8443, and [::]:8444

# Test Kong proxy over IPv6
curl -6 -H "Host: api.example.com" "http://[2001:db8::100]:80/health"

# Check Kong admin API
curl -6 -k "https://[2001:db8::10]:8444/status" | jq .server.connections_active

# View Kong routes
kubectl exec -n kong deployment/kong-gateway -- \
    curl -sk https://localhost:8444/routes | jq '.data[].hosts'
```

## Conclusion

Kong Ingress Controller supports IPv6 through `proxy_listen` and `admin_listen` configuration with `[::]:port` bindings. When you install KIC with the `kong/ingress` chart, configure Kong Gateway settings under the `gateway` values block and use `ipFamilyPolicy: PreferDualStack` on the proxy Service to request dual-stack load balancer addresses from the cloud provider. Standard Kubernetes Ingress resources, Service annotations, and Kong's `KongPlugin` and `KongUpstreamPolicy` CRDs configure routing, timeouts, health checks, and plugins for IPv6 traffic. The `ip-restriction` plugin accepts IPv6 CIDR notation in allow/deny lists. Set `trusted_ips` and `real_ip_header` so Kong can correctly extract and forward client IP information when it sits behind a load balancer.
