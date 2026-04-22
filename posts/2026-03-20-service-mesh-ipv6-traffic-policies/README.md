# How to Configure IPv6 Traffic Policies in Service Meshes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Service Mesh, IPv6, Traffic Management, Istio, Canary, Circuit Breaker

Description: A guide to configuring service mesh traffic policies for IPv6, including routing rules, circuit breakers, retries, timeouts, and canary deployments that work correctly with dual-stack services.

Service mesh traffic policies (routing rules, circuit breakers, retries) apply to service-to-service communication regardless of IP version. This guide covers configuring these policies to work correctly in IPv6 and dual-stack environments.

## Traffic Policy Fundamentals for Dual-Stack

Service mesh traffic policies generally match service DNS names, Kubernetes Services, and workload identities rather than raw IP literals. This means IPv4 and IPv6 connections to the same service name share the same traffic policies in meshes configured for dual-stack service traffic.

```bash
# Verify services have dual-stack ClusterIPs

kubectl get svc my-service -o jsonpath='{.spec.clusterIPs[*]}'
# Output: 10.96.0.50 fd00:10:96::50

# Both address families use the same VirtualService rules
kubectl exec test-pod -- curl http://my-service/       # via IPv4
kubectl exec test-pod -- curl -6 http://my-service/   # via IPv6
# Both follow the same routing rules
```

## Istio VirtualService for Dual-Stack Routing

```yaml
# Canary deployment routing - works for both IPv4 and IPv6
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service-vs
  namespace: default
spec:
  hosts:
    - my-service.default.svc.cluster.local
  http:
    - name: canary
      match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: my-service.default.svc.cluster.local
            subset: v2
          weight: 100

    - name: main
      route:
        - destination:
            host: my-service.default.svc.cluster.local
            subset: v1
          weight: 90
        - destination:
            host: my-service.default.svc.cluster.local
            subset: v2
          weight: 10
      timeout: 5s
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: "5xx,gateway-error,connect-failure"
```

## Circuit Breaker for IPv6 Services

```yaml
# DestinationRule with circuit breaker and service subsets
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      # Circuit breaker: eject unhealthy endpoints
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
      http:
        http2MaxRequests: 200
        http1MaxPendingRequests: 50
    loadBalancer:
      simple: LEAST_REQUEST
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

## AuthorizationPolicy for IPv6 Source Ranges

```yaml
# Allow traffic from specific source ranges or service accounts
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-ipv6-clients
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  rules:
    - from:
        - source:
            # Allow from IPv6 pod CIDR
            ipBlocks:
              - "fd00:10:244::/48"
              - "10.0.0.0/8"    # Also allow IPv4 pod network
    - from:
        - source:
            # Allow specific service accounts regardless of IP version
            principals:
              - "cluster.local/ns/default/sa/frontend"
```

## Fault Injection for IPv6 Testing

```yaml
# Inject faults to test resilience (works for both IPv4 and IPv6 traffic)
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service-fault-test
  namespace: default
spec:
  hosts:
    - my-service.default.svc.cluster.local
  http:
    - fault:
        delay:
          percentage:
            value: 10.0    # 10% of requests get delayed
          fixedDelay: 5s
        abort:
          percentage:
            value: 5.0     # 5% of requests get aborted
          httpStatus: 503
      route:
        - destination:
            host: my-service.default.svc.cluster.local
```

## Linkerd Traffic Policies for IPv6

With Linkerd 2.16 and later, enable IPv6 support at install time; on dual-stack clusters, Linkerd uses only IPv6 destination endpoints when that support is enabled.

```yaml
# HTTPRoute with retry policy (Linkerd)
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-service-route
  namespace: default
  annotations:
    retry.linkerd.io/http: "5xx,gateway-error"
    retry.linkerd.io/limit: "2"
    retry.linkerd.io/timeout: "300ms"
spec:
  parentRefs:
    - name: my-service
      kind: Service
      group: ""
      port: 80
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: "/"
      backendRefs:
        - name: my-service
          port: 80
          weight: 100
```

## Traffic Mirroring for IPv6 Debugging

```yaml
# Mirror IPv6 traffic to a debug service
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service-mirror
  namespace: default
spec:
  hosts:
    - my-service.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: my-service.default.svc.cluster.local
            port:
              number: 80
          weight: 100
      mirror:
        host: my-service-debug.default.svc.cluster.local
        port:
          number: 80
      mirrorPercentage:
        value: 100.0
```

## Applying and Verifying Traffic Policies

```bash
# Apply VirtualService and DestinationRule
kubectl apply -f virtual-service.yaml
kubectl apply -f destination-rule.yaml

# Verify configuration is accepted by Istio
istioctl analyze

# Check that the proxy has picked up the new config
istioctl proxy-config routes <pod-name> | grep my-service

# Test canary routing (IPv6 client)
kubectl exec test-pod -- \
  curl -6 -H "x-canary: true" http://my-service/ -v

# Verify circuit breaker is configured in Envoy
istioctl proxy-config cluster <pod-name> --fqdn my-service.default.svc.cluster.local -o json | \
  python3 -m json.tool | grep -A 5 "outlierDetection"

# Check the destination service's endpoints (IPv4 and IPv6)
istioctl proxy-config endpoints <pod-name> | grep my-service
```

Service mesh traffic policies operate at the application layer (L7) or TCP layer (L4) and are IP-version agnostic. Configure policies using service DNS names and service account identities rather than IP addresses, and they will apply to the service traffic for the IP families supported by your mesh and destination service.
