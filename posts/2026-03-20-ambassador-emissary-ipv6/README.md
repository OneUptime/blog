# How to Configure Ambassador/Emissary Ingress for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Ambassador, Emissary-ingress, Kubernetes, Envoy, API Gateway

Description: Configure Ambassador (now Emissary-Ingress) API gateway for IPv6 in Kubernetes, including service exposure with IPv6 load balancers, Mapping configuration for IPv6 backends, and client IP handling.

## Introduction

Ambassador, now known as Emissary-Ingress, is an API gateway for Kubernetes built on Envoy Proxy. For IPv6, Emissary-Ingress leverages Envoy's native IPv6 listener support and can expose services over IPv6 load balancers. Mapping and Host CRDs configure routing to IPv6-capable backend services in dual-stack clusters.

## Install Emissary-Ingress with IPv6 (Helm)

```yaml
# emissary-values.yaml

service:
  type: LoadBalancer
  annotations:
    # AWS Load Balancer Controller: dual-stack, internet-facing NLB with IP targets
    service.beta.kubernetes.io/aws-load-balancer-type: "external"
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "ip"
    service.beta.kubernetes.io/aws-load-balancer-ip-address-type: "dualstack"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
```

```bash
# Install Emissary CRDs
kubectl apply -f https://app.getambassador.io/yaml/emissary/latest/emissary-crds.yaml
kubectl wait --timeout=90s --for=condition=available deployment emissary-apiext -n emissary-system

# Install Emissary-Ingress via Helm
helm repo add datawire https://app.getambassador.io
helm repo update
helm install emissary-ingress datawire/emissary-ingress \
    -n emissary-system \
    --create-namespace \
    -f emissary-values.yaml

# Configure the Helm-created Service for dual-stack
kubectl patch service emissary-ingress -n emissary-system --type merge \
    -p '{"spec":{"ipFamilyPolicy":"PreferDualStack","ipFamilies":["IPv4","IPv6"]}}'

# Verify installation and dual-stack service settings
kubectl get svc emissary-ingress -n emissary-system -o yaml
```

## Ambassador Mapping for IPv6 Backend

```yaml
# mapping-ipv6.yaml

apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: myapp-mapping
  namespace: production
spec:
  hostname: "api.example.com"
  prefix: /api/
  service: myapp:8080   # Kubernetes service name:port
  enable_ipv6: true     # Prefer AAAA lookups for upstream service resolution

  # Headers for IPv6 clients
  add_request_headers:
    X-Forwarded-Proto: "https"

  # Timeout configuration
  connect_timeout_ms: 5000
  timeout_ms: 60000
  idle_timeout_ms: 300000
```

## Ambassador Host for TLS

```yaml
# host-ipv6.yaml

apiVersion: getambassador.io/v3alpha1
kind: Host
metadata:
  name: api-host
  namespace: production
spec:
  hostname: api.example.com
  tlsSecret:
    name: api-tls   # Pre-created kubernetes.io/tls Secret
  requestPolicy:
    insecure:
      action: Redirect   # Redirect HTTP to HTTPS
```

## Emissary Listener for IPv6

```yaml
# listener-ipv6.yaml

apiVersion: getambassador.io/v3alpha1
kind: Listener
metadata:
  name: https-listener
  namespace: emissary-system
spec:
  port: 8443
  protocol: HTTPS
  securityModel: XFP
  hostBinding:
    namespace:
      from: ALL

---
apiVersion: getambassador.io/v3alpha1
kind: Listener
metadata:
  name: http-listener
  namespace: emissary-system
spec:
  port: 8080
  protocol: HTTP
  securityModel: XFP
  hostBinding:
    namespace:
      from: ALL
```

## RateLimitService for IPv6

```yaml
# ratelimit-ipv6.yaml

apiVersion: getambassador.io/v3alpha1
kind: RateLimitService
metadata:
  name: ratelimit
  namespace: production
spec:
  service: "ratelimit.ratelimit-system:8081"
  protocol_version: v3
  domain: emissary
  timeout_ms: 1000

---
# Apply rate limit to a Mapping
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: rate-limited-api
  namespace: production
spec:
  hostname: "api.example.com"
  prefix: /v1/
  service: api:8080
  # Rate limit by the trusted client IP address (IPv4 or IPv6)
  # For IPv6 prefix-based limiting, implement prefix aggregation in the rate limit service
  labels:
    emissary:
      - source-ip:
          - remote_address:
              key: remote_address
```

## IPv6 Client IP Extraction in Emissary

```yaml
# xff-config.yaml - Configure trusted X-Forwarded-For hops

apiVersion: getambassador.io/v3alpha1
kind: Module
metadata:
  name: ambassador
  namespace: emissary-system
spec:
  config:
    # For an L7 load balancer that adds X-Forwarded-For
    use_remote_address: false
    xff_num_trusted_hops: 1   # One trusted proxy hop in front of Emissary
    # For L4 load balancers such as AWS NLB, the client source IP is preserved
    # and X-Forwarded-For is not added by the load balancer itself
```

## Verify Emissary IPv6 Operation

```bash
# Check Emissary pods have dual-stack addresses
kubectl get pods -n emissary-system \
    -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .status.podIPs[*]}{.ip}{" "}{end}{"\n"}{end}'
# In a dual-stack cluster, pods should list both IPv4 and IPv6 addresses

# In one terminal, port-forward the Envoy admin endpoint
kubectl port-forward -n emissary-system deployment/emissary-ingress 8001:8001

# In another terminal, inspect the active listener addresses
curl -s http://127.0.0.1:8001/listeners?format=json | \
    jq -r '.listener_statuses[].local_address.socket_address.address'
# Should include :: or another IPv6 listen address when IPv6 is active

# After publishing an AAAA record for api.example.com to the load balancer
curl -k -6 https://api.example.com/api/health

# Check Mapping status
kubectl get mappings -n production
kubectl describe mapping myapp-mapping -n production | grep -A5 "Status"
```

## Conclusion

Emissary-Ingress (Ambassador) supports IPv6 through its underlying Envoy Proxy and Kubernetes dual-stack networking. The Kubernetes service should use `ipFamilyPolicy: PreferDualStack` for dual-stack external load balancer addresses. Mapping CRDs can route to backend Kubernetes services by name; when Emissary should use AAAA records for upstream resolution, set `enable_ipv6: true` on the `Mapping`. Configure `use_remote_address` and `xff_num_trusted_hops` when Emissary is behind an L7 load balancer that adds `X-Forwarded-For`; with L4 load balancers such as AWS NLB, the client source IP is preserved instead. The Host CRD manages TLS termination, and certificates for IPv6 ingress must include domain SANs when clients connect by hostname.
