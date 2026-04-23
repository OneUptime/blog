# How to Configure Istio Destination Rules in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Istio, DestinationRule, Load Balancing, Service Mesh

Description: Learn how to configure Istio DestinationRules to control load balancing, connection pool settings, and circuit breakers for services in Rancher-managed clusters.

DestinationRules in Istio define policies that apply to traffic after routing has occurred. While VirtualServices handle the "where" of traffic routing, DestinationRules handle the "how" - specifying load balancing algorithms, connection pool sizes, outlier detection, and TLS settings for connections to service subsets. This guide covers DestinationRule configuration in Rancher-managed Kubernetes clusters.

## Prerequisites

- Istio installed in your Rancher-managed cluster
- Services deployed with version labels for subset configuration
- `kubectl` access to the cluster

## Understanding DestinationRules

DestinationRules work in conjunction with VirtualServices:

- **VirtualService**: Routes traffic to a destination (e.g., "send 50% to subset v1")
- **DestinationRule**: Configures how to connect to that destination (e.g., "use round-robin, limit to 100 connections")

## Step 1: Define Service Subsets

The most common use of DestinationRules is defining subsets that VirtualServices can reference:

```yaml
# subsets-destination-rule.yaml

apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews-destination-rule
  namespace: bookinfo
spec:
  # The hostname this rule applies to
  host: reviews
  subsets:
  # Subset for version 1 pods
  - name: v1
    labels:
      version: v1
  # Subset for version 2 pods
  - name: v2
    labels:
      version: v2
  # Subset for version 3 pods
  - name: v3
    labels:
      version: v3
```

## Step 2: Configure Load Balancing Policies

```yaml
# load-balancing-destination-rule.yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-lb
  namespace: my-app
spec:
  host: my-service
  trafficPolicy:
    loadBalancer:
      # ROUND_ROBIN: Distribute requests evenly
      # LEAST_REQUEST: Send to the instance with the fewest outstanding requests
      # RANDOM: Forward to random healthy instance
      # PASSTHROUGH: Forward without load balancing
      simple: LEAST_REQUEST
  subsets:
  - name: v1
    labels:
      version: v1
    trafficPolicy:
      loadBalancer:
        # Override with consistent hashing for sticky sessions
        consistentHash:
          # Hash based on the "x-user-id" header
          httpHeaderName: x-user-id
  - name: v2
    labels:
      version: v2
    trafficPolicy:
      loadBalancer:
        simple: ROUND_ROBIN
```

## Step 3: Configure Connection Pool Settings

Control the volume of connections to a service:

```yaml
# connection-pool-destination-rule.yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-conn-pool
  namespace: my-app
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        # Maximum number of HTTP1/TCP connections to a destination host
        maxConnections: 100
        # TCP connection timeout
        connectTimeout: 30ms
        # Keep-alive time
        tcpKeepalive:
          time: 7200s
          interval: 75s
      http:
        # Maximum number of requests waiting for a ready connection
        http1MaxPendingRequests: 100
        # Maximum number of active requests to a destination
        http2MaxRequests: 1000
        # Maximum number of requests per connection
        maxRequestsPerConnection: 10
        # Maximum number of retries outstanding to all hosts in the cluster
        maxRetries: 3
        # Connection idle timeout
        idleTimeout: 90s
```

## Step 4: Configure Outlier Detection (Circuit Breaking)

Outlier detection automatically ejects unhealthy hosts from the load balancing pool:

```yaml
# outlier-detection-destination-rule.yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-outlier
  namespace: my-app
spec:
  host: my-service
  trafficPolicy:
    outlierDetection:
      # Number of consecutive 5xx errors before ejecting a host
      consecutive5xxErrors: 5
      # Number of consecutive gateway errors before ejecting
      consecutiveGatewayErrors: 3
      # Interval between ejection sweep analysis
      interval: 10s
      # Minimum ejection time (increases with each ejection)
      baseEjectionTime: 30s
      # Maximum percentage of hosts that can be ejected at one time
      maxEjectionPercent: 50
      # Minimum percentage of healthy hosts required to keep outlier detection enabled
      minHealthPercent: 50
```

## Step 5: Configure TLS Settings for Upstream Connections

Control how Istio connects to your services:

```yaml
# tls-destination-rule.yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-service-tls
  namespace: my-app
spec:
  host: external-database.example.com
  trafficPolicy:
    tls:
      # TLS modes: DISABLE, SIMPLE, MUTUAL, ISTIO_MUTUAL
      mode: SIMPLE
      # CA certificate to validate the server certificate
      caCertificates: /etc/ssl/certs/ca-certificates.crt
      # Subject Alternative Name to verify on the server certificate
      subjectAltNames:
      - external-database.example.com
      # SNI string to present to the server
      sni: external-database.example.com
```

## Step 6: Namespace-Wide Policies

Apply a DestinationRule as a default policy for all services in a namespace:

```yaml
# namespace-wide-policy.yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: default
  namespace: my-app
spec:
  # The wildcard host applies to all services in the namespace
  host: "*.my-app.svc.cluster.local"
  trafficPolicy:
    tls:
      # Use Istio mutual TLS for all in-mesh service communication
      mode: ISTIO_MUTUAL
    connectionPool:
      http:
        http1MaxPendingRequests: 100
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

## Step 7: Verify DestinationRule Configuration

```bash
# List all DestinationRules
kubectl get destinationrules -A

# Describe a specific DestinationRule
kubectl describe destinationrule reviews-destination-rule -n bookinfo

# Inspect the Envoy cluster configuration for the reviews service
istioctl proxy-config clusters deployment/productpage-v1 \
  -n bookinfo --fqdn reviews.bookinfo.svc.cluster.local -o json

# Analyze for configuration issues
istioctl analyze --namespace bookinfo
```

## Conclusion

DestinationRules are a critical component of Istio's traffic management system. By carefully configuring load balancing strategies, connection pools, and outlier detection, you can significantly improve the resilience and performance of your microservices. Combined with VirtualServices, DestinationRules give you fine-grained control over every aspect of service-to-service communication in your Rancher-managed Kubernetes clusters.
