# How to Configure Skipper Ingress Controller for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Skipper, Kubernetes, Ingress, Zalando, Routing

Description: Configure Skipper ingress controller for IPv6 in Kubernetes, including dual-stack service exposure, Skipper filters for IPv6 client IP handling, and RouteGroup configuration for IPv6 traffic routing.

## Introduction

Skipper is a flexible HTTP routing engine and ingress controller developed by Zalando. It supports IPv6 through its standard HTTP server binding and Kubernetes service exposure. Skipper's routing logic is expressed in Eskip route definitions, which can filter and route based on IPv6 client addresses. RouteGroup CRDs provide a more expressive routing model that works with IPv6 backends.

## Install Skipper Ingress with IPv6

```yaml
# skipper-deployment.yaml - Skipper ingress with IPv6

apiVersion: apps/v1
kind: Deployment
metadata:
  name: skipper-ingress
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: skipper-ingress
  template:
    metadata:
      labels:
        app: skipper-ingress
    spec:
      serviceAccountName: skipper-ingress
      containers:
        - name: skipper-ingress
          image: registry.opensource.zalan.do/teapot/skipper:latest
          args:
            - skipper
            - -kubernetes
            - -kubernetes-in-cluster
            # Bind HTTP and HTTPS on IPv6. With Kubernetes TLS enabled,
            # -address is the TLS listener and -insecure-address is plain HTTP.
            - -kubernetes-enable-tls
            - -address=[::]:9443
            - -insecure-address=[::]:9090
            - -kubernetes-https-redirect=true
            - -proxy-preserve-host=true
            - -enable-ratelimits
            # If your load balancer puts the client IP last in XFF, enable:
            # - -reverse-source-predicate
          ports:
            - name: http
              containerPort: 9090
            - name: https
              containerPort: 9443
            - name: metrics
              containerPort: 9911
```

```yaml
# skipper-service.yaml - Dual-stack LoadBalancer service

apiVersion: v1
kind: Service
metadata:
  name: skipper-ingress
  namespace: kube-system
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-ip-address-type: "dualstack"
spec:
  ipFamilyPolicy: PreferDualStack
  ipFamilies:
    - IPv4
    - IPv6
  type: LoadBalancer
  selector:
    app: skipper-ingress
  ports:
    - name: http
      port: 80
      targetPort: 9090
    - name: https
      port: 443
      targetPort: 9443
```

## Standard Ingress with Skipper

```yaml
# ingress-skipper-ipv6.yaml

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
  namespace: production
  annotations:
    # Skipper-specific annotations
    zalando.org/skipper-filter: "setResponseHeader(\"X-IPv6-Served\", \"true\") -> clientRatelimit(100, \"1m\")"
spec:
  ingressClassName: skipper
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

## RouteGroup for Advanced IPv6 Routing

```yaml
# routegroup-ipv6.yaml - Zalando RouteGroup CRD

apiVersion: zalando.org/v1
kind: RouteGroup
metadata:
  name: myapp
  namespace: production
spec:
  hosts:
    - app.example.com
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls

  backends:
    - name: myapp
      type: service
      serviceName: myapp
      servicePort: 8080

  routes:
    # Main route for all traffic
    - backends:
        - backendName: myapp
      # Skipper filter: add header identifying IPv6 traffic
      filters:
        - "setRequestHeader(\"X-Client-Version\", \"IPv6\")"

    # IPv6-only route
    - path: /ipv6-only
      predicates:
        # Match IPv6 clients using Skipper's Source predicate
        - "Source(\"2001:db8::/32\", \"fd00::/8\")"
      backends:
        - backendName: myapp
      filters:
        - "setRequestHeader(\"X-IPv6-Verified\", \"true\")"
```

## Skipper Route Definitions for IPv6

```eskip
# Skipper Eskip route files (for manual route configuration)

# /etc/skipper/routes.eskip

# Route IPv6 clients to a specific backend
ipv6_clients:
    Source("2001:db8::/32") && PathSubtree("/api")
    -> setRequestHeader("X-Client-IP-Version", "6")
    -> "http://[2001:db8::10]:8080";

# Rate limit IPv6 clients locally
rate_limit_ipv6:
    Source("2001:db8::/32")
    -> clientRatelimit(100, "1m")
    -> <roundRobin, "http://[2001:db8::11]:8080", "http://[2001:db8::12]:8080">;

# Default route
main:
    *
    -> "http://[2001:db8::13]:8080";
```

## Skipper Filters for IPv6 Client IP

```yaml
# Skipper annotations for IP-based routing

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ip-based-routing
  namespace: production
  annotations:
    # Add Skipper's request source as a custom header.
    # This is the first X-Forwarded-For IP, or the remote IP if XFF is absent.
    zalando.org/skipper-filter: |
      setRequestHeader("X-Real-Client-IP", "${request.source}")
    # Block specific IPv6 ranges
    zalando.org/skipper-predicate: |
      !Source("2001:db8:bad::/48")
spec:
  ingressClassName: skipper
  rules:
    - host: secure.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: secure-app
                port:
                  number: 8080
```

## Verify Skipper IPv6 Operation

```bash
# Check Skipper is listening on IPv6
kubectl exec -n kube-system deployment/skipper-ingress -- \
    ss -tlnp | grep -E '9090|9443'
# Should show [::]:9090 and [::]:9443

# Check service has an external address or hostname for the dual-stack load balancer
kubectl get svc skipper-ingress -n kube-system -o jsonpath='{.status.loadBalancer.ingress}'

# Test over IPv6
SKIPPER_IPV6="2001:db8::100"
curl -6 --resolve "app.example.com:443:[$SKIPPER_IPV6]" "https://app.example.com/"

# Check Skipper metrics
kubectl exec -n kube-system deployment/skipper-ingress -- \
    curl -s http://localhost:9911/metrics | grep -i route

# View configured routes
kubectl exec -n kube-system deployment/skipper-ingress -- \
    curl -s http://localhost:9911/routes | head -50
```

## Conclusion

Skipper Ingress Controller supports IPv6 by binding to `[::]:port` in the `-address` and `-insecure-address` startup flags, exposing services via dual-stack Kubernetes LoadBalancer services. Standard Kubernetes Ingress resources work with Skipper using `spec.ingressClassName: skipper` or the legacy `kubernetes.io/ingress.class: skipper` annotation. RouteGroup CRDs (Zalando-specific) provide more advanced routing with IPv6-specific predicates using `Source("2001:db8::/32")` to match IPv6 client ranges. The `Source()` and `SourceFromLast()` predicates accept IPv4 and IPv6 CIDR ranges for source matching. Eskip route files support direct IPv6 backend URLs in bracket notation and IPv6 source matching via the `Source()` predicate.
