# How to Configure Contour Ingress Controller for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Contour, Envoy, Kubernetes, Ingress, HTTPProxy

Description: Configure Contour ingress controller for IPv6 in Kubernetes, including Envoy listener configuration for IPv6, HTTPProxy CRD with IPv6-aware settings, and dual-stack service exposure.

## Introduction

Contour is a Kubernetes ingress controller that uses Envoy as the data plane. Contour manages Envoy's configuration via xDS APIs and supports IPv6 through Envoy's native IPv6 listener capabilities. In dual-stack clusters, Contour automatically configures Envoy to listen on IPv6 addresses when the pod has IPv6 connectivity, exposing services to IPv6 clients through dual-stack load balancers.

## Install Contour with IPv6

```yaml
# contour-values.yaml - Helm values for Contour with IPv6

envoy:
  service:
    type: LoadBalancer
    # Dual-stack external service
    ipFamilyPolicy: PreferDualStack
    ipFamilies:
      - IPv4
      - IPv6
    annotations:
      service.beta.kubernetes.io/aws-load-balancer-ip-address-type: "dualstack"

contour:
  service:
    type: ClusterIP
    ipFamilyPolicy: SingleStack
    ipFamilies: [IPv4]
```

```bash
# Install Contour via Helm (official Project Contour chart)

helm repo add projectcontour https://projectcontour.github.io/helm-charts
helm install contour projectcontour/contour \
    -n projectcontour \
    --create-namespace \
    -f contour-values.yaml

# Or install via kubectl apply
kubectl apply -f https://projectcontour.io/quickstart/contour.yaml

# Verify Envoy service has IPv6
kubectl get svc envoy -n projectcontour -o jsonpath='{.spec.ipFamilies}'
# Should include IPv6

# Check Envoy pod has IPv6 address
kubectl get pods -n projectcontour -l app=envoy -o wide
```

## Contour ContourConfiguration for IPv6

```yaml
# contour-config.yaml - Global Contour configuration

apiVersion: projectcontour.io/v1alpha1
kind: ContourConfiguration
metadata:
  name: contour
  namespace: projectcontour
spec:
  # Envoy configuration
  envoy:
    network:
      # Allow X-Forwarded-For from trusted IPv4 and IPv6 proxies
      numTrustedHops: 1   # Skip cloud LB hop
      # Envoy admin interface port
      adminPort: 9001
```

## Standard Kubernetes Ingress with Contour

```yaml
# ingress-contour-ipv6.yaml

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
  namespace: production
  annotations:
    # Use Contour as ingress class
    kubernetes.io/ingress.class: "contour"
    # Ingress annotations supported by Contour
    projectcontour.io/websocket-routes: "/ws"
    projectcontour.io/response-timeout: "60s"
spec:
  ingressClassName: contour
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

## Contour HTTPProxy CRD

```yaml
# httpproxy-ipv6.yaml - Contour native HTTPProxy resource

apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: myapp
  namespace: production
spec:
  virtualhost:
    fqdn: app.example.com
    tls:
      secretName: app-tls

  routes:
    # Main route to backend
    - conditions:
        - prefix: /
      services:
        - name: myapp
          port: 8080
          weight: 100
      # Load balancing policy
      loadBalancerPolicy:
        strategy: RoundRobin
      # Health check (works for both IPv4 and IPv6 backends)
      healthCheckPolicy:
        path: /health
        intervalSeconds: 10
        unhealthyThresholdCount: 3
        healthyThresholdCount: 2

    # IPv6-specific header manipulation
    - conditions:
        - prefix: /api/v2
      services:
        - name: api-v2
          port: 8080
      requestHeadersPolicy:
        set:
          - name: X-Forwarded-Proto
            value: https
      responseHeadersPolicy:
        set:
          - name: X-IPv6-Route
            value: "true"
```

## HTTPProxy with Rate Limiting for IPv6

Note: the `global` rate limit policy below requires a Rate Limit Service (RLS) extension service plus `spec.rateLimitService` configured in `ContourConfiguration` pointing at it. The `local` policy enforces per-Envoy-pod limits and needs no external service.

```yaml
# httpproxy-rate-limit.yaml

apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: rate-limited
  namespace: production
spec:
  virtualhost:
    fqdn: api.example.com
    rateLimitPolicy:
      global:
        descriptors:
          # Rate limit by remote address (works for IPv6)
          - entries:
              - remoteAddress: {}
            # This creates a descriptor with the client's IP (IPv6 if applicable)

  routes:
    - conditions:
        - prefix: /
      services:
        - name: api
          port: 8080
      rateLimitPolicy:
        local:
          requests: 100
          unit: minute
```

## Verify Contour IPv6 Operation

```bash
# Check Envoy listeners (should include IPv6)
kubectl exec -n projectcontour deployment/envoy -- \
    curl -s 'http://localhost:9001/listeners?format=json' | \
    python3 -m json.tool | grep -i address

# Should show entries with "::" addresses:
# "socket_address": {"address": "::"}

# Check Contour sees the backend service endpoints (dual-stack)
kubectl get endpoints myapp -n production -o yaml | grep -E "ip:|::"

# Test over IPv6 (need Envoy's external IPv6 address)
ENVOY_IPV6=$(kubectl get svc envoy -n projectcontour \
    -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

curl -6 -H "Host: app.example.com" "http://[$ENVOY_IPV6]:80/"

# Check HTTPProxy status
kubectl describe httpproxy myapp -n production | grep -A10 "Status"
# Should show: Valid, OK

# Watch Contour logs for IPv6 routing
kubectl logs -n projectcontour deployment/contour --tail=50 | \
    grep -E "ipv6|2001:|fd00:|route"
```

## Contour with Cert-Manager for TLS

```yaml
# certificate-ipv6.yaml - TLS cert for Contour ingress

apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-tls
  namespace: production
spec:
  secretName: app-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - app.example.com
  # No IPv6 IP SANs needed since we use hostnames
  # DNS must resolve to Contour's IPv6 load balancer address
```

## Conclusion

Contour automatically leverages Envoy's IPv6 capabilities when deployed in a dual-stack Kubernetes cluster - Envoy pods receive IPv6 addresses and listen on `::` for both IPv4 (via IPv4-mapped addresses) and IPv6 connections. The Envoy service uses `ipFamilyPolicy: PreferDualStack` to obtain IPv6 external load balancer addresses. Contour's HTTPProxy CRD provides richer configuration than standard Ingress, including health checks, rate limiting, and header manipulation - all of which work identically for IPv6 backends. The `numTrustedHops` setting in ContourConfiguration controls how many XFF hops are trusted for real client IPv6 address extraction. TLS certificates use DNS SANs with hostnames resolving to IPv6 addresses, not IP SANs.
