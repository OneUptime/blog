# How to Set Up TCP/UDP Load Balancing on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, TCP, UDP, Load Balancing, Kubernetes, Networking, MetalLB

Description: Configure TCP and UDP load balancing on Talos Linux for non-HTTP workloads like databases, DNS servers, game servers, and streaming applications.

---

Most Kubernetes load balancing guides focus on HTTP traffic, but many real-world workloads use raw TCP or UDP. Databases, DNS servers, game servers, VoIP systems, MQTT brokers, and streaming protocols all need non-HTTP load balancing. On Talos Linux, you can load balance TCP and UDP traffic using Kubernetes services, MetalLB, and specialized ingress controllers. This guide covers the practical setup for each approach.

## TCP and UDP Services in Kubernetes

At the most basic level, Kubernetes services support TCP and UDP protocols natively. When you create a service, you specify the protocol for each port:

```yaml
# TCP service (default)
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: data
spec:
  type: ClusterIP
  ports:
  - port: 5432
    targetPort: 5432
    protocol: TCP
  selector:
    app: postgres
```

```yaml
# UDP service
apiVersion: v1
kind: Service
metadata:
  name: dns-server
  namespace: dns
spec:
  type: ClusterIP
  ports:
  - port: 53
    targetPort: 53
    protocol: UDP
  selector:
    app: dns-server
```

```yaml
# Service with both TCP and UDP
apiVersion: v1
kind: Service
metadata:
  name: dns-both
  namespace: dns
spec:
  type: ClusterIP
  ports:
  - name: dns-tcp
    port: 53
    targetPort: 53
    protocol: TCP
  - name: dns-udp
    port: 53
    targetPort: 53
    protocol: UDP
  selector:
    app: dns-server
```

## Exposing TCP/UDP with LoadBalancer Services

Using MetalLB (or kube-vip) on Talos Linux, you can expose TCP and UDP services externally:

### TCP LoadBalancer

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-external
  namespace: data
spec:
  type: LoadBalancer
  ports:
  - port: 5432
    targetPort: 5432
    protocol: TCP
  selector:
    app: postgres
```

### UDP LoadBalancer

```yaml
apiVersion: v1
kind: Service
metadata:
  name: game-server
  namespace: gaming
spec:
  type: LoadBalancer
  ports:
  - port: 27015
    targetPort: 27015
    protocol: UDP
  selector:
    app: game-server
```

### Mixed TCP/UDP LoadBalancer

For services that need both TCP and UDP on the same IP, you need two separate services that share an IP. This is because Kubernetes requires separate services for different protocols:

```yaml
# TCP service
apiVersion: v1
kind: Service
metadata:
  name: voip-tcp
  namespace: communications
  annotations:
    metallb.universe.tf/allow-shared-ip: "voip-shared"
spec:
  type: LoadBalancer
  loadBalancerIP: 192.168.1.200
  ports:
  - name: sip-tcp
    port: 5060
    targetPort: 5060
    protocol: TCP
  - name: srtp
    port: 5061
    targetPort: 5061
    protocol: TCP
  selector:
    app: voip-server
---
# UDP service (sharing the same IP)
apiVersion: v1
kind: Service
metadata:
  name: voip-udp
  namespace: communications
  annotations:
    metallb.universe.tf/allow-shared-ip: "voip-shared"
spec:
  type: LoadBalancer
  loadBalancerIP: 192.168.1.200
  ports:
  - name: sip-udp
    port: 5060
    targetPort: 5060
    protocol: UDP
  - name: rtp-range
    port: 10000
    targetPort: 10000
    protocol: UDP
  selector:
    app: voip-server
```

## TCP Load Balancing with Nginx Ingress Controller

The Nginx Ingress Controller on Talos Linux can proxy TCP and UDP streams, not just HTTP:

```bash
# Install Nginx Ingress with TCP/UDP proxying enabled
helm install ingress-nginx ingress-nginx/ingress-nginx \
    --namespace ingress-nginx \
    --create-namespace \
    --set tcp.5432="data/postgres:5432" \
    --set tcp.6379="cache/redis:6379" \
    --set udp.53="dns/dns-server:53"
```

Or configure via ConfigMaps:

```yaml
# TCP services ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: tcp-services
  namespace: ingress-nginx
data:
  # Format: "external_port": "namespace/service:port"
  "5432": "data/postgres:5432"
  "6379": "cache/redis:6379"
  "3306": "data/mysql:3306"
  "27017": "data/mongodb:27017"
  "5672": "messaging/rabbitmq:5672"
  "9092": "messaging/kafka:9092"
```

```yaml
# UDP services ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: udp-services
  namespace: ingress-nginx
data:
  "53": "dns/dns-server:53"
  "514": "logging/syslog:514"
  "27015": "gaming/game-server:27015"
```

Make sure the Nginx Ingress deployment references these ConfigMaps:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  template:
    spec:
      containers:
      - name: controller
        args:
        - /nginx-ingress-controller
        - --tcp-services-configmap=$(POD_NAMESPACE)/tcp-services
        - --udp-services-configmap=$(POD_NAMESPACE)/udp-services
```

And expose the ports in the ingress controller service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
spec:
  type: LoadBalancer
  ports:
  - name: http
    port: 80
    targetPort: 80
    protocol: TCP
  - name: https
    port: 443
    targetPort: 443
    protocol: TCP
  # TCP proxy ports
  - name: postgres
    port: 5432
    targetPort: 5432
    protocol: TCP
  - name: redis
    port: 6379
    targetPort: 6379
    protocol: TCP
  # UDP proxy ports
  - name: dns
    port: 53
    targetPort: 53
    protocol: UDP
  selector:
    app.kubernetes.io/name: ingress-nginx
```

## HAProxy for TCP Load Balancing

For more control over TCP load balancing, use an external HAProxy:

```text
# /etc/haproxy/haproxy.cfg

defaults
    mode tcp
    timeout connect 5s
    timeout client 30s
    timeout server 30s

# PostgreSQL load balancing
frontend postgres
    bind *:5432
    default_backend postgres-backend

backend postgres-backend
    balance leastconn
    option tcp-check
    tcp-check connect
    tcp-check send-binary 0000003d00030000   # PostgreSQL startup packet
    tcp-check expect binary 52               # Authentication request
    server pg-1 10.0.0.20:30432 check inter 5s
    server pg-2 10.0.0.21:30432 check inter 5s
    server pg-3 10.0.0.22:30432 check inter 5s

# Redis load balancing
frontend redis
    bind *:6379
    default_backend redis-backend

backend redis-backend
    balance roundrobin
    option tcp-check
    tcp-check connect
    tcp-check send PING\r\n
    tcp-check expect string +PONG
    server redis-1 10.0.0.20:30379 check inter 5s
    server redis-2 10.0.0.21:30379 check inter 5s

# MySQL load balancing with read/write splitting
frontend mysql-write
    bind *:3306
    default_backend mysql-primary

frontend mysql-read
    bind *:3307
    default_backend mysql-replicas

backend mysql-primary
    balance first
    option tcp-check
    server mysql-primary 10.0.0.20:30306 check inter 5s

backend mysql-replicas
    balance roundrobin
    option tcp-check
    server mysql-replica-1 10.0.0.21:30306 check inter 5s
    server mysql-replica-2 10.0.0.22:30306 check inter 5s
```

## UDP Load Balancing Considerations

UDP load balancing has unique challenges compared to TCP:

1. No connection state - UDP is connectionless, making health checks harder
2. No acknowledgments - you cannot tell if a packet was received
3. Source IP matters - many UDP protocols need session persistence

### UDP Health Checks

Since UDP does not have built-in connection semantics, health checks for UDP services need to be application-aware:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: dns-server
spec:
  type: LoadBalancer
  # Use session affinity for UDP to maintain "connection" state
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 300
  ports:
  - port: 53
    protocol: UDP
  selector:
    app: dns-server
```

For the pods themselves, use application-specific health checks:

```yaml
# DNS server with health check
livenessProbe:
  exec:
    command:
    - /bin/sh
    - -c
    - "dig @127.0.0.1 health.check.local +time=2 +tries=1"
  periodSeconds: 10
readinessProbe:
  exec:
    command:
    - /bin/sh
    - -c
    - "dig @127.0.0.1 health.check.local +time=2 +tries=1"
  periodSeconds: 5
```

## Preserving Client IP for TCP/UDP

By default, kube-proxy NATs the source IP. To preserve the original client IP:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: game-server
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local  # Preserves source IP
  ports:
  - port: 27015
    protocol: UDP
  selector:
    app: game-server
```

With `externalTrafficPolicy: Local`, traffic only goes to nodes that run the target pods. This preserves the client IP but means nodes without pods do not receive any traffic.

## Multi-Port TCP Services

For applications that need multiple TCP ports:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: email-server
  namespace: mail
spec:
  type: LoadBalancer
  ports:
  - name: smtp
    port: 25
    targetPort: 25
    protocol: TCP
  - name: smtps
    port: 465
    targetPort: 465
    protocol: TCP
  - name: submission
    port: 587
    targetPort: 587
    protocol: TCP
  - name: imap
    port: 993
    targetPort: 993
    protocol: TCP
  - name: pop3
    port: 995
    targetPort: 995
    protocol: TCP
  selector:
    app: email-server
```

## Testing TCP/UDP Load Balancing

Verify your TCP and UDP load balancing works:

```bash
#!/bin/bash
# test-tcp-udp-lb.sh
# Tests TCP and UDP load balancing

EXTERNAL_IP="192.168.1.200"

echo "=== TCP Tests ==="

# Test PostgreSQL
echo "PostgreSQL:"
pg_isready -h "$EXTERNAL_IP" -p 5432 && echo "OK" || echo "FAIL"

# Test Redis
echo "Redis:"
redis-cli -h "$EXTERNAL_IP" -p 6379 ping

# Test generic TCP connectivity
echo "Generic TCP:"
nc -zv "$EXTERNAL_IP" 5432 2>&1

echo ""
echo "=== UDP Tests ==="

# Test DNS
echo "DNS:"
dig @"$EXTERNAL_IP" example.com +short +time=2 +tries=2

# Test generic UDP
echo "Generic UDP:"
echo "test" | nc -u -w2 "$EXTERNAL_IP" 53

echo ""
echo "=== Load Distribution Test ==="
# Send multiple TCP connections and check which pods handle them
for i in $(seq 1 10); do
    # This depends on your application providing identity info
    curl -s "http://$EXTERNAL_IP:8080/hostname" 2>/dev/null
done | sort | uniq -c | sort -rn
```

## Monitoring TCP/UDP Services

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: tcp-udp-alerts
  namespace: monitoring
spec:
  groups:
  - name: tcp-udp-services
    rules:
    - alert: TCPServiceDown
      expr: |
        probe_success{job="blackbox-tcp"} == 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "TCP service is not responding"

    - alert: UDPServiceDown
      expr: |
        probe_success{job="blackbox-udp"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "UDP service is not responding"
```

## Wrapping Up

TCP and UDP load balancing on Talos Linux works well once you understand the differences from HTTP load balancing. TCP services are straightforward and benefit from connection-aware health checks and features like session affinity. UDP services need more care around health checking and session persistence since the protocol is connectionless. For simple setups, Kubernetes LoadBalancer services with MetalLB handle both protocols natively. For more sophisticated routing and health checking, use the Nginx Ingress Controller's TCP/UDP proxying or an external HAProxy. Choose the approach that matches your application's protocol requirements and your operational complexity budget.
