# How to Configure HAProxy Ingress Controller for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, HAProxy, Kubernetes, Ingress, Load Balancer, Dual-Stack

Description: Configure HAProxy Ingress Controller in Kubernetes to accept IPv6 connections, configure dual-stack load balancer services, and handle IPv6 client IP forwarding with trusted proxy configuration.

## Introduction

HAProxy Ingress Controller is a Kubernetes ingress controller built on HAProxy, known for its high performance and advanced load balancing features. IPv6 configuration for HAProxy Ingress involves enabling dual-stack service exposure, configuring HAProxy frontends to listen on both IPv4 and IPv6 addresses, and handling client IP forwarding correctly when HAProxy Ingress sits behind another load balancer.

## Install HAProxy Ingress with IPv6 (Helm)

```yaml
# haproxy-ingress-values.yaml

controller:
  ingressClassResource:
    enabled: true

  # Service configuration for dual-stack exposure
  service:
    type: LoadBalancer
    # Dual-stack service
    ipFamilyPolicy: PreferDualStack
    ipFamilies:
      - IPv4
      - IPv6
    # Example AWS annotations for a dual-stack NLB
    annotations:
      service.beta.kubernetes.io/aws-load-balancer-type: "external"
      service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "ip"
      service.beta.kubernetes.io/aws-load-balancer-ip-address-type: "dualstack"

  stats:
    enabled: true

  # HAProxy configuration
  config:
    # Bind HTTP and HTTPS frontends to all IPv4 and IPv6 addresses
    bind-http: ":80,:::80"
    bind-https: ":443,:::443"
    bind-ip-addr-stats: "::"

    # Client IP forwarding headers
    forwardfor: "add"
    real-ip-hdr: "X-Real-IP"

    # If the fronting load balancer sends PROXY protocol,
    # enable it on the HTTP frontends
    # use-proxy-protocol: "true"

    ssl-redirect: "true"
```

```bash
# Install HAProxy Ingress Controller

helm repo add haproxy-ingress https://haproxy-ingress.github.io/charts
helm install haproxy-ingress haproxy-ingress/haproxy-ingress \
    -n ingress-controller \
    --create-namespace \
    -f haproxy-ingress-values.yaml

# Verify the service is provisioned and inspect dual-stack settings
kubectl get svc haproxy-ingress -n ingress-controller -o yaml
```

## Kubernetes Ingress with HAProxy

```yaml
# ingress-haproxy-ipv6.yaml

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
  namespace: production
  annotations:
    kubernetes.io/ingress.class: "haproxy"
    # HAProxy-specific annotations
    haproxy-ingress.github.io/balance-algorithm: "leastconn"
    haproxy-ingress.github.io/timeout-connect: "5s"
    haproxy-ingress.github.io/timeout-server: "60s"
spec:
  ingressClassName: haproxy
  rules:
    - host: app.example.com
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
        - app.example.com
      secretName: app-tls
```

## HAProxy ConfigMap for IPv6

```yaml
# haproxy-ingress-configmap.yaml

apiVersion: v1
kind: ConfigMap
metadata:
  name: haproxy-ingress
  namespace: ingress-controller
data:
  # Global HAProxy settings for IPv6

  # Bind HTTP and HTTPS frontends to all IPv4 and IPv6 addresses
  bind-http: ":80,:::80"
  bind-https: ":443,:::443"
  bind-ip-addr-stats: "::"

  # Client IP forwarding
  forwardfor: "add"
  real-ip-hdr: "X-Real-IP"

  # Enable if the fronting load balancer sends the PROXY protocol
  # use-proxy-protocol: "true"

  # HTTPS redirect
  ssl-redirect: "true"

  # Stats page
  stats-port: "1936"
```

## HAProxy Backend Configuration for IPv6

```yaml
# myapp-service-haproxy-ipv6.yaml - Configure backend-specific options on the Service

apiVersion: v1
kind: Service
metadata:
  name: myapp
  namespace: production
  annotations:
    haproxy-ingress.github.io/timeout-connect: "5s"
    haproxy-ingress.github.io/timeout-server: "60s"
    haproxy-ingress.github.io/health-check-uri: "/health"
    haproxy-ingress.github.io/health-check-interval: "10s"

# In dual-stack clusters, backend endpoints can be IPv4 or IPv6
# depending on the Service and cluster networking
spec:
  selector:
    app: myapp
  ports:
    - port: 8080
      targetPort: 8080
```

## PROXY Protocol v2 Configuration (HAProxy to Backend)

```yaml
# haproxy-proxy-protocol.yaml

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-proxy-proto
  namespace: production
  annotations:
    kubernetes.io/ingress.class: "haproxy"
    # Send PROXY Protocol v2 headers to backends
    # Enables backends to see real IPv6 client addresses
    haproxy-ingress.github.io/proxy-protocol: "v2"
spec:
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-proxy-aware
                port:
                  number: 8080
```

## Rate Limiting IPv6 Clients in HAProxy Ingress

```yaml
# haproxy-rate-limit.yaml

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-rate-limited
  namespace: production
  annotations:
    kubernetes.io/ingress.class: "haproxy"
    # Rate limiting (applies to all clients including IPv6)
    haproxy-ingress.github.io/limit-rps: "100"
    haproxy-ingress.github.io/limit-whitelist: "10.0.0.0/8,fd00::/8"
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api
                port:
                  number: 8080
```

## Verify HAProxy Ingress IPv6

```bash
# Check HAProxy pod listens on IPv6
kubectl exec -n ingress-controller deployment/haproxy-ingress -- \
    sh -c 'ss -tlnp | grep -E ":80|:443"'
# Should show both IPv4 and IPv6 listeners, such as 0.0.0.0:80 and [::]:80

# Test HTTP access over IPv6
curl -6 -H "Host: app.example.com" \
    "http://[2001:db8::100]:80/"

# Check HAProxy stats page
kubectl port-forward -n ingress-controller svc/haproxy-ingress-stats 1936:1936
curl http://localhost:1936/stats

# Check real client IP is passed (connect from IPv6 client)
curl -6 -H "Host: app.example.com" \
    "http://[2001:db8::100]:80/api/ip"
# Expected: {"ip": "2001:db8::1234", "version": 6}

# Check HAProxy configuration rendered for the ingress
kubectl exec -n ingress-controller deployment/haproxy-ingress -- \
    sh -c 'grep -E -A5 "frontend|bind" /etc/haproxy/haproxy.cfg'
```

## Conclusion

HAProxy Ingress Controller can expose IPv6 by binding HTTP and HTTPS frontends to both IPv4 and IPv6 addresses with `bind-http: ":80,:::80"` and `bind-https: ":443,:::443"`, while the Kubernetes service is set to `ipFamilyPolicy: PreferDualStack`. The `forwardfor` option controls how `X-Forwarded-For` is added to requests, and `real-ip-hdr` can populate `X-Real-IP` for applications. PROXY Protocol v2 can carry IPv6 client addresses to backends that support it, using the `haproxy-ingress.github.io/proxy-protocol: "v2"` annotation. Rate limiting applies to IPv6 clients via the `limit-rps` annotation with IPv6 CIDR entries in `limit-whitelist`. If HAProxy Ingress sits behind a load balancer that sends PROXY protocol, enable `use-proxy-protocol` globally on the HTTP frontends.
