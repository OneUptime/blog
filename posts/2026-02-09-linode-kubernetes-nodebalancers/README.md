# How to Configure Linode Kubernetes Engine (LKE) with NodeBalancers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Linode, LKE, Load Balancing, Networking

Description: Learn how to configure Linode NodeBalancers with LKE clusters for external load balancing, SSL termination, health checks, and multi-port service exposure.

---

Linode Kubernetes Engine (LKE) integrates with NodeBalancers to provide managed load balancing for Kubernetes services. When you create a LoadBalancer service in LKE, the Cloud Controller Manager automatically provisions a NodeBalancer, configures backend nodes, sets up health checks, and manages the lifecycle. This automation simplifies external service exposure.

## Understanding Linode NodeBalancers

NodeBalancers distribute incoming traffic across multiple backend nodes using round-robin, least connections, or source IP algorithms. They operate at Layer 4 (TCP) and provide basic Layer 7 (HTTP/HTTPS) capabilities through header inspection.

Each NodeBalancer supports multiple ports with independent configurations. You can expose HTTP on port 80, HTTPS on port 443, and custom protocols on other ports, all through a single NodeBalancer instance.

NodeBalancers provide passive health checks by monitoring backend response times and connection success rates. Failed backends are automatically removed from rotation until they recover.

## Creating Basic LoadBalancer Service

Create an LKE cluster first:

```bash
# Install Linode CLI
pip3 install linode-cli

# Configure authentication
linode-cli configure

# Create LKE cluster
linode-cli lke cluster-create \
  --label production-cluster \
  --region us-east \
  --k8s_version 1.28 \
  --node_pools.type g6-standard-2 \
  --node_pools.count 3

# Get kubeconfig
linode-cli lke kubeconfig-view <cluster-id> --text | base64 -d > ~/.kube/config
```

Deploy a simple application with LoadBalancer service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: web-service
  namespace: default
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
```

Apply and verify:

```bash
kubectl apply -f web-app.yaml

# Watch LoadBalancer provisioning
kubectl get service web-service -w

# Get external IP
kubectl get service web-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

The Cloud Controller Manager creates a NodeBalancer and returns its IP address. This process takes 30-60 seconds.

Check the NodeBalancer in Linode:

```bash
# List NodeBalancers
linode-cli nodebalancers list

# Get details
linode-cli nodebalancers view <nodebalancer-id>
```

## Configuring Multiple Ports

Expose multiple ports through a single NodeBalancer:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: multi-port-service
spec:
  type: LoadBalancer
  selector:
    app: app
  ports:
  - name: http
    port: 80
    targetPort: 8080
    protocol: TCP
  - name: https
    port: 443
    targetPort: 8443
    protocol: TCP
  - name: metrics
    port: 9090
    targetPort: 9090
    protocol: TCP
```

Each port creates a separate configuration in the NodeBalancer. Health checks run independently for each port.

## Implementing SSL Termination

Terminate SSL at the NodeBalancer using annotations:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service-ssl
  annotations:
    service.beta.kubernetes.io/linode-loadbalancer-tls: '[{"tls-secret-name": "web-tls", "port": 443}]'
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
  - name: https
    port: 443
    targetPort: 80
    protocol: TCP
```

Create the TLS secret:

```bash
# Create self-signed certificate for testing
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt \
  -subj "/CN=example.com"

# Create Kubernetes secret
kubectl create secret tls web-tls \
  --cert=tls.crt \
  --key=tls.key
```

The NodeBalancer terminates SSL and forwards plain HTTP to backend pods. This reduces CPU overhead on application containers.

For production, use certificates from Let's Encrypt:

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Create Certificate
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: web-tls
  namespace: default
spec:
  secretName: web-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - example.com
  - www.example.com
EOF
```

## Configuring Health Checks

Customize health check behavior with annotations:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
  annotations:
    service.beta.kubernetes.io/linode-loadbalancer-check-type: "http"
    service.beta.kubernetes.io/linode-loadbalancer-check-path: "/health"
    service.beta.kubernetes.io/linode-loadbalancer-check-interval: "10"
    service.beta.kubernetes.io/linode-loadbalancer-check-timeout: "5"
    service.beta.kubernetes.io/linode-loadbalancer-check-attempts: "3"
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
```

Available check types:

- **connection**: TCP connection attempt (default)
- **http**: HTTP GET request expecting 2xx or 3xx response
- **http_body**: HTTP GET with body content verification

Configure the health endpoint in your application:

```go
// Example health endpoint in Go
http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
    // Check database connectivity
    if err := db.Ping(); err != nil {
        w.WriteHeader(http.StatusServiceUnavailable)
        return
    }

    // Check cache connectivity
    if err := cache.Ping(); err != nil {
        w.WriteHeader(http.StatusServiceUnavailable)
        return
    }

    w.WriteHeader(http.StatusOK)
    w.Write([]byte("healthy"))
})
```

## Setting Balancing Algorithm

Choose between balancing algorithms:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
  annotations:
    service.beta.kubernetes.io/linode-loadbalancer-algorithm: "leastconn"
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
```

Available algorithms:

- **roundrobin**: Distributes requests evenly across backends
- **leastconn**: Sends requests to backend with fewest active connections
- **source**: Uses client IP for consistent backend selection (session affinity)

The source algorithm provides basic session stickiness for applications that need client affinity.

## Enabling Proxy Protocol

Preserve client IP addresses with Proxy Protocol:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
  annotations:
    service.beta.kubernetes.io/linode-loadbalancer-proxy-protocol: "v2"
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
```

Configure your application to parse Proxy Protocol headers:

```nginx
# Nginx configuration
server {
    listen 8080 proxy_protocol;

    set_real_ip_from 10.0.0.0/8;
    real_ip_header proxy_protocol;

    location / {
        proxy_pass http://backend;
        proxy_set_header X-Real-IP $proxy_protocol_addr;
        proxy_set_header X-Forwarded-For $proxy_protocol_addr;
    }
}
```

## Restricting Source IPs

Limit access to specific IP ranges:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: admin-service
spec:
  type: LoadBalancer
  loadBalancerSourceRanges:
  - 203.0.113.0/24
  - 198.51.100.0/24
  selector:
    app: admin
  ports:
  - port: 443
    targetPort: 8443
```

The NodeBalancer only accepts connections from specified CIDR ranges. Other IPs are rejected at the load balancer level.

## Configuring Session Persistence

Enable session stickiness for stateful applications:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: stateful-app
  annotations:
    service.beta.kubernetes.io/linode-loadbalancer-algorithm: "source"
spec:
  type: LoadBalancer
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600
  selector:
    app: stateful
  ports:
  - port: 80
    targetPort: 8080
```

This configuration uses source IP hashing at both the NodeBalancer and kube-proxy levels for consistent routing.

## Monitoring NodeBalancer Metrics

Query NodeBalancer statistics:

```bash
# Get connection stats
linode-cli nodebalancers stats <nodebalancer-id>

# View configuration
linode-cli nodebalancers configs-list <nodebalancer-id>

# Check backend node status
linode-cli nodebalancers nodes-list <nodebalancer-id> <config-id>
```

Monitor via Linode Cloud Manager or API:

```bash
# Get metrics for specific time range
curl -H "Authorization: Bearer $LINODE_TOKEN" \
  "https://api.linode.com/v4/nodebalancers/<id>/stats?start=2026-02-09T00:00:00&end=2026-02-09T23:59:59"
```

Set up Prometheus monitoring:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    scrape_configs:
    - job_name: 'linode-nodebalancers'
      static_configs:
      - targets: ['<nodebalancer-ip>:9100']
```

## Cost Optimization

NodeBalancers cost $10/month per instance. Minimize costs by consolidating services:

```yaml
# Single NodeBalancer for multiple services
apiVersion: v1
kind: Service
metadata:
  name: unified-ingress
spec:
  type: LoadBalancer
  selector:
    app: nginx-ingress
  ports:
  - name: http
    port: 80
    targetPort: 80
  - name: https
    port: 443
    targetPort: 443
```

Deploy an Ingress controller behind the NodeBalancer:

```bash
# Install Nginx Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --set controller.service.type=LoadBalancer
```

Route traffic to multiple services through Ingress rules:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
spec:
  ingressClassName: nginx
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
  - host: www.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

## Troubleshooting Connection Issues

Common issues include backend health check failures and DNS resolution problems.

Debug health check failures:

```bash
# Check pod health endpoint directly
kubectl port-forward pod/web-app-xxx 8080:8080
curl http://localhost:8080/health

# View NodeBalancer backend status
linode-cli nodebalancers nodes-list <nodebalancer-id> <config-id>

# Check service endpoints
kubectl get endpoints web-service
```

If backends show as down:

```bash
# Check pod logs
kubectl logs -l app=web

# Verify pod is running
kubectl get pods -l app=web

# Test connectivity from node
kubectl debug node/<node-name> -it --image=busybox
wget -O- http://<pod-ip>:8080/health
```

Resolve DNS propagation delays:

```bash
# Get NodeBalancer IP
NODEBALANCER_IP=$(kubectl get service web-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Update DNS record
linode-cli domains records-create <domain-id> \
  --type A \
  --name www \
  --target $NODEBALANCER_IP \
  --ttl_sec 300
```

Linode NodeBalancers provide straightforward load balancing for LKE clusters with automatic provisioning, flexible configuration, and cost-effective pricing. The integration with Kubernetes services simplifies external traffic management.
