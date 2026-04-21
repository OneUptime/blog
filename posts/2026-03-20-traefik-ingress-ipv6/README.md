# How to Configure Traefik Ingress Controller for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Traefik, Kubernetes, Ingress, Dual-Stack, IngressRoute

Description: Configure Traefik Ingress Controller in Kubernetes to accept IPv6 traffic, expose services over IPv6 load balancers, and handle IPv6 client IP forwarding in Kubernetes ingress configurations.

## Introduction

Traefik is a cloud-native ingress controller for Kubernetes that automatically discovers services and configures routing. For IPv6, Traefik entry points should listen on all interfaces in the pod, and the Kubernetes service exposing Traefik must be provisioned with an IPv6 external IP. Both standard Ingress resources and Traefik's native IngressRoute CRDs support dual-stack backend services.

## Install Traefik with IPv6 Entry Points (Helm)

```yaml
# traefik-values.yaml - Helm values for Traefik with IPv6

deployment:
  replicas: 2

service:
  # Dual-stack service for Traefik's LoadBalancer
  spec:
    type: LoadBalancer
    ipFamilyPolicy: PreferDualStack
    ipFamilies:
      - IPv4
      - IPv6

ports:
  web:
    port: 8000
    exposedPort: 80
    forwardedHeaders:
      trustedIPs:
        - "10.0.0.0/8"
        - "fd00::/8"
        - "2001:db8::/32"
  websecure:
    port: 8443
    exposedPort: 443
    http:
      tls:
        enabled: true
    forwardedHeaders:
      trustedIPs:
        - "10.0.0.0/8"
        - "fd00::/8"
        - "2001:db8::/32"

# The chart generates entry point addresses like :8000/tcp and :8443/tcp,
# which listen on all interfaces in the pod when IPv6 is available.
```

```bash
# Install Traefik with IPv6 Helm values
helm repo add traefik https://traefik.github.io/charts
helm install traefik traefik/traefik \
    -n traefik-system \
    --create-namespace \
    -f traefik-values.yaml

# Verify Traefik service has IPv6 external IP
kubectl get svc traefik -n traefik-system -o wide
# Should show an IPv6 address in EXTERNAL-IP when the cloud load balancer supports IPv6
```

## Standard Ingress for IPv6

```yaml
# ingress-ipv6.yaml

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  namespace: production
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: websecure
    traefik.ingress.kubernetes.io/router.tls: "true"
spec:
  ingressClassName: traefik
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
      secretName: app-tls-cert
```

## Traefik IngressRoute for IPv6

```yaml
# ingressroute-ipv6.yaml

apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: myapp
  namespace: production
spec:
  entryPoints:
    - websecure

  routes:
    - match: Host(`app.example.com`)
      kind: Rule
      services:
        - name: myapp
          port: 8080

  tls:
    secretName: app-tls-cert
```

## Traefik with IPv6 IP Allowlist

```yaml
# ipv6-allowlist-middleware.yaml

apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: ipv6-allowlist
  namespace: production
spec:
  ipAllowList:
    sourceRange:
      - "fd00::/8"            # Internal ULA
      - "2001:db8:100::/48"   # Example corporate IPv6
      - "10.0.0.0/8"          # IPv4 internal (dual-stack)
    ipStrategy:
      depth: 1   # Select the rightmost IP in X-Forwarded-For
```

```yaml
# Apply to IngressRoute
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: internal-api
  namespace: production
spec:
  routes:
    - match: Host(`internal.example.com`) && PathPrefix(`/api`)
      kind: Rule
      middlewares:
        - name: ipv6-allowlist
      services:
        - name: internal-api
          port: 8080
```

## Backend Service for Dual-Stack

```yaml
# myapp-service-dualstack.yaml

# Ensure backend services are dual-stack
apiVersion: v1
kind: Service
metadata:
  name: myapp
  namespace: production
spec:
  ipFamilyPolicy: PreferDualStack
  ipFamilies:
    - IPv4
    - IPv6
  selector:
    app: myapp
  ports:
    - name: http
      port: 8080
      targetPort: 8080
```

## Verify Traefik IPv6 Operation

```bash
# Check Traefik pods have IPv6 addresses assigned by Kubernetes
kubectl get pod -n traefik-system -l app.kubernetes.io/name=traefik \
    -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.status.podIPs}{"\n"}{end}'

# Check Traefik entry point arguments
kubectl get deployment traefik -n traefik-system \
    -o jsonpath='{range .spec.template.spec.containers[0].args[*]}{.}{"\n"}{end}' \
    | grep "entryPoints.*address"

# Test HTTPS access over IPv6
TRAEFIK_IPV6="2001:db8::10" # replace with the IPv6 address from EXTERNAL-IP
curl -6 --resolve "app.example.com:443:[${TRAEFIK_IPV6}]" \
     "https://app.example.com/"

# Check that Traefik passes correct client IPv6
curl -6 --resolve "app.example.com:443:[${TRAEFIK_IPV6}]" \
     "https://app.example.com/api/ip"
# Example response: {"ip": "2001:db8::20", "version": 6}

# View Traefik dashboard if api.insecure is enabled for a local test
kubectl port-forward -n traefik-system deployment/traefik 8080:8080 &
curl http://localhost:8080/dashboard/
```

## Conclusion

Traefik Ingress Controller supports IPv6 by listening on all interfaces via `:port` entry point configuration, or `[::]:port` if you want to bind explicitly to the IPv6 wildcard address. The Kubernetes service exposing Traefik uses `ipFamilyPolicy: PreferDualStack` to request dual-stack behavior from the cloud load balancer, which must also support IPv6. Standard Kubernetes Ingress resources and Traefik IngressRoute CRDs both route to IPv6-capable backend services without IPv6-specific configuration. The `forwardedHeaders.trustedIPs` configuration must include the IPv4 and IPv6 CIDR ranges of the trusted proxies or load balancers that set X-Forwarded-For. IP allowlist middleware supports IPv6 CIDRs natively via the `sourceRange` field.
