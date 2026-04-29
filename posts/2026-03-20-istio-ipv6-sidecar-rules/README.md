# How to Configure Istio IPv6 Sidecar Traffic Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, IPv6, Service Mesh, Sidecar, iptables, Envoy

Description: A guide to configuring Istio's sidecar proxy for IPv6 traffic interception, including iptables rules, dual-stack DestinationRules, and troubleshooting IPv6 in the Istio service mesh.

Istio's sidecar proxy (Envoy) intercepts inbound TCP traffic and transparently redirects outbound traffic through rules installed in the pod network namespace. Without Istio CNI, these rules are set up by the `istio-init` container; with Istio CNI, they are installed by the node agent. For IPv6 traffic interception to work, both ip6tables and iptables support must be available. Istio 1.17+ documents dual-stack support for Kubernetes 1.23+ dual-stack clusters.

## Enabling IPv6 in Istio

```yaml
# istio-operator.yaml - enable dual-stack IPv6 support

apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio
  namespace: istio-system
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        # Enable IPv6 interception in iptables
        ISTIO_DUAL_STACK: "true"
  values:
    pilot:
      env:
        # Enable dual-stack in istiod
        ISTIO_DUAL_STACK: "true"
      # Create dual-stack pilot services
      ipFamilyPolicy: RequireDualStack
```

```bash
# Apply via istioctl

istioctl install -f istio-operator.yaml

# Or upgrade existing installation
istioctl upgrade -f istio-operator.yaml
```

## How Sidecar Intercepts IPv6 Traffic

If you are not using the Istio CNI node agent, the `istio-init` container runs before the application container and sets up iptables/ip6tables rules. With Istio CNI, equivalent redirection is installed by the node agent during pod network setup:

```bash
# Examine what istio-init does (when Istio CNI is not enabled)
kubectl logs <pod-name> -c istio-init

# The key ip6tables rules created:
# -A PREROUTING -p tcp -j ISTIO_INBOUND
# -A OUTPUT -p tcp -j ISTIO_OUTPUT
# -A ISTIO_INBOUND -p tcp -j ISTIO_IN_REDIRECT
# -A ISTIO_OUTPUT ... -j ISTIO_REDIRECT

# Check the actual ip6tables rules in a running pod (if the sidecar image includes ip6tables)
kubectl exec <pod-name> -c istio-proxy -- ip6tables -t nat -L -n
```

## Configuring DestinationRule for IPv6

```yaml
# DestinationRule that works for dual-stack endpoints
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
    loadBalancer:
      simple: LEAST_REQUEST
    # TLS settings work the same for IPv4 and IPv6
    tls:
      mode: ISTIO_MUTUAL
  subsets:
    - name: v2
      labels:
        version: v2
```

## VirtualService with IPv6 Endpoints

```yaml
# VirtualService for traffic management
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service-vs
  namespace: default
spec:
  hosts:
    - my-service.default.svc.cluster.local
  http:
    - match:
        - headers:
            x-client-type:
              exact: ipv6-client
      route:
        - destination:
            host: my-service.default.svc.cluster.local
            port:
              number: 80
            subset: v2
      timeout: 10s
    - route:
        - destination:
            host: my-service.default.svc.cluster.local
            port:
              number: 80
```

## ServiceEntry for External IPv6 Services

```yaml
# Allow traffic to an external IPv6-only HTTPS service
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-ipv6-svc
  namespace: default
spec:
  hosts:
    - ipv6.external.example.com
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
```

## Checking IPv6 in Istio Proxy

```bash
# Check Envoy listeners include both 0.0.0.0 and [::] on dual-stack workloads
istioctl proxy-config listeners <pod-name> -n <namespace> -o json | \
  jq '.[] | select(.name=="virtualInbound") | {name: .name, address: .address, additionalAddresses: .additionalAddresses}'

# Check Envoy's clusters for IPv6 endpoints
kubectl exec <pod-name> -c istio-proxy -- \
  pilot-agent request GET /clusters | grep -E "::"

# Check all endpoints Envoy knows about (including IPv6)
istioctl proxy-config endpoints <pod-name> -n <namespace> | grep -E "::"
```

## PeerAuthentication with Dual-Stack

```yaml
# mTLS policy - works for both IPv4 and IPv6 traffic
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: default
spec:
  mtls:
    mode: STRICT  # Enforces mTLS for all traffic, IPv4 and IPv6
```

## Sidecar Resource for Egress Control

```yaml
# Sidecar resource to restrict egress for a workload in a dual-stack mesh
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: app-sidecar
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  egress:
    - port:
        number: 80
        protocol: HTTP
      hosts:
        - "default/*"
        - "istio-system/*"
  ingress:
    - port:
        number: 8080
        protocol: HTTP
      defaultEndpoint: "0.0.0.0:8080"  # Forward inbound traffic to the application port
```

## Troubleshooting Istio IPv6

```bash
# Check istiod logs for IPv6 issues
kubectl logs -n istio-system \
  $(kubectl get pod -n istio-system -l app=istiod -o name | head -1) \
  | grep -i "ipv6\|dual" | tail -20

# Verify pod has IPv6 address and sidecar is injected
kubectl get pod <pod-name> -o jsonpath='{.status.podIPs}'
# On a dual-stack pod, this should show both IPv4 and IPv6

# Test IPv6 connectivity through the mesh
kubectl exec <pod-name> -c my-app -- \
  curl -6 -v http://my-service.default.svc.cluster.local

# Check if ip6tables rules are present in pod (if the sidecar image includes ip6tables)
kubectl exec <pod-name> -c istio-proxy -- ip6tables -t nat -L PREROUTING -n

# If ip6tables is empty, check if ISTIO_DUAL_STACK is set
kubectl exec <pod-name> -c istio-proxy -- env | grep ISTIO_DUAL_STACK
```

Istio's sidecar dual-stack support requires enabling `ISTIO_DUAL_STACK` in both proxy metadata and `values.pilot.env`, along with `values.pilot.ipFamilyPolicy: RequireDualStack`, on a Kubernetes dual-stack cluster. Once enabled, IPv6 traffic redirection is configured alongside IPv4 in each sidecar pod's network namespace.
