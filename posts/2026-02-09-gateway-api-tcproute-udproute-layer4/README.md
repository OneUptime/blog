# How to Set Up Kubernetes Gateway API TCPRoute and UDPRoute for Layer-4 Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Gateway API, Networking

Description: Configure TCPRoute and UDPRoute resources in the Kubernetes Gateway API to route raw TCP and UDP traffic for databases, game servers, DNS, and other non-HTTP protocols with port-based routing and traffic splitting.

---

While HTTP and gRPC get most of the attention, many applications use raw TCP or UDP protocols. Databases, caching systems, game servers, VoIP applications, and DNS all operate at Layer 4. The Kubernetes Gateway API provides TCPRoute and UDPRoute for routing this traffic without Layer 7 protocol awareness.

## Understanding Layer-4 Routing

Layer-4 routing operates at the transport layer, making forwarding decisions based only on:
- Port numbers
- Source/destination IP addresses (in some implementations)

Unlike HTTP routing, Layer-4 routes cannot inspect:
- HTTP paths, headers, or methods
- TLS SNI hostnames (use TLSRoute instead)
- Application-level data

This simplicity provides performance benefits but limits routing sophistication. TCPRoute and UDPRoute are perfect for protocols that don't need Layer 7 inspection.

## Setting Up a TCP Gateway

Create a Gateway with TCP listeners:

```yaml
# tcp-gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: tcp-gateway
  namespace: default
spec:
  gatewayClassName: kong
  listeners:
  # PostgreSQL listener
  - name: postgres
    protocol: TCP
    port: 5432
    allowedRoutes:
      kinds:
      - kind: TCPRoute
  # Redis listener
  - name: redis
    protocol: TCP
    port: 6379
    allowedRoutes:
      kinds:
      - kind: TCPRoute
  # MySQL listener
  - name: mysql
    protocol: TCP
    port: 3306
    allowedRoutes:
      kinds:
      - kind: TCPRoute
```

Apply the gateway:

```bash
kubectl apply -f tcp-gateway.yaml
kubectl wait --for=condition=Programmed gateway/tcp-gateway --timeout=300s
```

## Basic TCPRoute Configuration

Route TCP traffic from a specific port to a backend service:

```yaml
# postgres-tcproute.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TCPRoute
metadata:
  name: postgres-route
  namespace: default
spec:
  parentRefs:
  - name: tcp-gateway
    sectionName: postgres  # Reference the postgres listener
  rules:
  - backendRefs:
    - name: postgres-service
      port: 5432
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
spec:
  selector:
    app: postgres
  ports:
  - name: postgres
    protocol: TCP
    port: 5432
    targetPort: 5432
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres-service
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_PASSWORD
          value: changeme
        - name: POSTGRES_DB
          value: myapp
```

Apply the manifests:

```bash
kubectl apply -f postgres-tcproute.yaml
```

Test the connection:

```bash
# Get gateway IP
GATEWAY_IP=$(kubectl get gateway tcp-gateway -o jsonpath='{.status.addresses[0].value}')

# Connect to PostgreSQL through the gateway
psql -h $GATEWAY_IP -p 5432 -U postgres -d myapp
```

## Multiple TCPRoutes on Different Ports

Configure routes for multiple TCP services:

```yaml
# multi-tcp-routes.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TCPRoute
metadata:
  name: redis-route
spec:
  parentRefs:
  - name: tcp-gateway
    sectionName: redis
  rules:
  - backendRefs:
    - name: redis-service
      port: 6379
---
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TCPRoute
metadata:
  name: mysql-route
spec:
  parentRefs:
  - name: tcp-gateway
    sectionName: mysql
  rules:
  - backendRefs:
    - name: mysql-service
      port: 3306
```

## Traffic Splitting for TCP

Split TCP traffic between multiple backends (useful for database read replicas):

```yaml
# tcp-traffic-split.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TCPRoute
metadata:
  name: mysql-read-split
spec:
  parentRefs:
  - name: tcp-gateway
    sectionName: mysql
  rules:
  - backendRefs:
    # Primary read replica (60%)
    - name: mysql-read-replica-1
      port: 3306
      weight: 60
    # Secondary read replica (40%)
    - name: mysql-read-replica-2
      port: 3306
      weight: 40
```

Note: This is random distribution, not session-aware. For databases requiring session affinity, implement connection pooling at the application level.

## Setting Up a UDP Gateway

Create a Gateway with UDP listeners for protocols like DNS, game servers, or syslog:

```yaml
# udp-gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: udp-gateway
  namespace: default
spec:
  gatewayClassName: kong
  listeners:
  # DNS listener
  - name: dns
    protocol: UDP
    port: 53
    allowedRoutes:
      kinds:
      - kind: UDPRoute
  # Game server listener
  - name: game-server
    protocol: UDP
    port: 7777
    allowedRoutes:
      kinds:
      - kind: UDPRoute
  # Syslog listener
  - name: syslog
    protocol: UDP
    port: 514
    allowedRoutes:
      kinds:
      - kind: UDPRoute
```

## Basic UDPRoute Configuration

Route UDP traffic for a DNS server:

```yaml
# dns-udproute.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: UDPRoute
metadata:
  name: dns-route
  namespace: default
spec:
  parentRefs:
  - name: udp-gateway
    sectionName: dns
  rules:
  - backendRefs:
    - name: coredns-service
      port: 53
---
apiVersion: v1
kind: Service
metadata:
  name: coredns-service
spec:
  selector:
    app: coredns
  ports:
  - name: dns-udp
    protocol: UDP
    port: 53
    targetPort: 53
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: coredns
spec:
  replicas: 2
  selector:
    matchLabels:
      app: coredns
  template:
    metadata:
      labels:
        app: coredns
    spec:
      containers:
      - name: coredns
        image: coredns/coredns:1.11.1
        args:
        - -conf
        - /etc/coredns/Corefile
        ports:
        - containerPort: 53
          protocol: UDP
        volumeMounts:
        - name: config
          mountPath: /etc/coredns
      volumes:
      - name: config
        configMap:
          name: coredns-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-config
data:
  Corefile: |
    .:53 {
        errors
        health
        ready
        forward . 8.8.8.8 8.8.4.4
        cache 30
        loop
        reload
    }
```

Apply and test:

```bash
kubectl apply -f dns-udproute.yaml

# Get gateway IP
GATEWAY_IP=$(kubectl get gateway udp-gateway -o jsonpath='{.status.addresses[0].value}')

# Test DNS query
dig @$GATEWAY_IP example.com
nslookup example.com $GATEWAY_IP
```

## Game Server Routing with UDPRoute

Route UDP traffic for a game server:

```yaml
# game-server-udproute.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: UDPRoute
metadata:
  name: game-server-route
spec:
  parentRefs:
  - name: udp-gateway
    sectionName: game-server
  rules:
  - backendRefs:
    - name: game-server-service
      port: 7777
---
apiVersion: v1
kind: Service
metadata:
  name: game-server-service
spec:
  selector:
    app: game-server
  ports:
  - name: game-udp
    protocol: UDP
    port: 7777
    targetPort: 7777
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: game-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: game-server
  template:
    metadata:
      labels:
        app: game-server
    spec:
      containers:
      - name: server
        image: mycompany/game-server:latest
        ports:
        - containerPort: 7777
          protocol: UDP
```

## Cross-Namespace Routing

Route to services in different namespaces with ReferenceGrant:

```yaml
# tcp-cross-namespace.yaml
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TCPRoute
metadata:
  name: database-route
  namespace: frontend
spec:
  parentRefs:
  - name: tcp-gateway
    namespace: default
  rules:
  - backendRefs:
    - name: database-service
      namespace: database
      port: 5432
---
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-frontend-to-database
  namespace: database
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: TCPRoute
    namespace: frontend
  to:
  - group: ""
    kind: Service
    name: database-service
```

## Monitoring TCP/UDP Routes

Check route status:

```bash
kubectl describe tcproute postgres-route
kubectl describe udproute dns-route
```

Monitor connection metrics at the gateway level. For Kong:

```bash
kubectl port-forward -n kong svc/kong-proxy 8001:8001

# Query Kong admin API for metrics
curl http://localhost:8001/status
```

Monitor backend service connections:

```bash
# For PostgreSQL
kubectl exec -it postgres-0 -- psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# For Redis
kubectl exec -it redis-0 -- redis-cli INFO CLIENTS
```

## Load Balancing Considerations

Layer-4 load balancing is connection-based, not request-based. Once a client establishes a TCP connection, all packets in that connection go to the same backend.

For long-lived connections (databases, game servers), this can create uneven load:

```yaml
# Deployment with pod disruption budget
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: postgres-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: postgres
```

This ensures at least one pod remains during updates, preventing connection failures.

## Combining TCP and UDP Listeners

A single gateway can handle both TCP and UDP:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: multi-protocol-gateway
spec:
  gatewayClassName: kong
  listeners:
  # TCP listener for database
  - name: database-tcp
    protocol: TCP
    port: 5432
    allowedRoutes:
      kinds:
      - kind: TCPRoute
  # UDP listener for metrics
  - name: metrics-udp
    protocol: UDP
    port: 8125
    allowedRoutes:
      kinds:
      - kind: UDPRoute
```

## Performance Testing

Test TCP route performance:

```bash
# Install iperf3
kubectl run iperf3-server --image=networkstatic/iperf3 -- -s
kubectl expose pod iperf3-server --port=5201

# Create TCPRoute for iperf3
kubectl apply -f - <<EOF
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TCPRoute
metadata:
  name: iperf3-route
spec:
  parentRefs:
  - name: tcp-gateway
  rules:
  - backendRefs:
    - name: iperf3-server
      port: 5201
EOF

# Run client test
GATEWAY_IP=$(kubectl get gateway tcp-gateway -o jsonpath='{.status.addresses[0].value}')
iperf3 -c $GATEWAY_IP -p 5201 -t 30
```

Test UDP performance:

```bash
# UDP iperf3 test
iperf3 -c $GATEWAY_IP -p 5201 -u -b 1G -t 30
```

## Security Considerations

Layer-4 routes don't provide application-level security. Implement security at the application:

1. **Use authentication**: Require credentials (database passwords, API keys)
2. **Enable TLS**: Use TLS/SSL for TCP protocols that support it
3. **Network policies**: Restrict which pods can access the gateway
4. **Rate limiting**: Implement at the application or use a service mesh

Example network policy:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-database-access
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          access: database
    ports:
    - protocol: TCP
      port: 5432
```

## Troubleshooting

Test connectivity to backends:

```bash
# TCP connectivity test
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  telnet postgres-service 5432

# UDP connectivity test
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  nc -u dns-service 53
```

Check if the gateway is routing correctly:

```bash
# Describe TCPRoute
kubectl describe tcproute postgres-route

# Check gateway events
kubectl describe gateway tcp-gateway

# View gateway pod logs
kubectl logs -n kong -l app=kong --tail=100
```

TCPRoute and UDPRoute extend the Gateway API to non-HTTP protocols, providing consistent configuration for all types of traffic. Use them for databases, caching systems, game servers, DNS, and any other TCP/UDP protocol. While they lack Layer 7 sophistication, their simplicity and performance make them ideal for stateful services that need reliable, low-latency connections.
