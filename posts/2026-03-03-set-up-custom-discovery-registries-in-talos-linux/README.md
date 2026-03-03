# How to Set Up Custom Discovery Registries in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Discovery Registry, Self-Hosted, Configuration, Infrastructure

Description: Learn how to set up and configure custom discovery registries in Talos Linux for self-hosted node discovery in private or air-gapped environments.

---

The default Talos Linux discovery service at `discovery.talos.dev` works well for most clusters, but there are good reasons to run your own. Private infrastructure, air-gapped deployments, compliance requirements, and the desire for full control over your cluster's dependencies all point toward self-hosting the discovery registry. This guide walks through setting up a custom discovery service from deployment to configuration.

## Why Self-Host the Discovery Service

The public discovery service is reliable and encrypted end-to-end, but it is still an external dependency. Self-hosting gives you:

- Complete control over the infrastructure
- No external network dependencies
- The ability to run in air-gapped environments
- Custom monitoring and auditing
- No reliance on third-party uptime

## The Discovery Service Architecture

The Talos discovery service is a lightweight HTTP server that stores and serves encrypted blobs. It does not process or decrypt the discovery data - it simply acts as a relay. Each cluster is identified by a cluster ID, and the service stores encrypted member information indexed by that ID.

The service is stateless by design. It stores data in memory with TTLs, so if the service restarts, nodes re-register automatically within their next refresh cycle. There is no database backend to manage.

## Deploying the Discovery Service

### Option 1: Deploy on an Existing Kubernetes Cluster

If you have a management cluster or another Kubernetes cluster available, deploy the discovery service there:

```yaml
# discovery-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: talos-discovery
---
# discovery-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: discovery-service
  namespace: talos-discovery
spec:
  replicas: 2
  selector:
    matchLabels:
      app: discovery-service
  template:
    metadata:
      labels:
        app: discovery-service
    spec:
      containers:
        - name: discovery
          image: ghcr.io/siderolabs/discovery-service:latest
          args:
            - --addr=:3000
            - --landing-page=false
            - --metrics-addr=:9090
          ports:
            - name: http
              containerPort: 3000
            - name: metrics
              containerPort: 9090
          livenessProbe:
            httpGet:
              path: /healthz
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /healthz
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
---
# discovery-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: discovery-service
  namespace: talos-discovery
spec:
  selector:
    app: discovery-service
  ports:
    - name: http
      port: 3000
      targetPort: 3000
    - name: metrics
      port: 9090
      targetPort: 9090
```

Expose it with an Ingress and TLS:

```yaml
# discovery-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: discovery-service
  namespace: talos-discovery
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - discovery.internal.example.com
      secretName: discovery-tls
  rules:
    - host: discovery.internal.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: discovery-service
                port:
                  number: 3000
```

### Option 2: Deploy as a Standalone Container

For simpler setups or when you do not have a management cluster:

```bash
# Run the discovery service as a Docker container
docker run -d \
  --name talos-discovery \
  --restart always \
  -p 3000:3000 \
  -p 9090:9090 \
  ghcr.io/siderolabs/discovery-service:latest \
  --addr=:3000 \
  --metrics-addr=:9090
```

Put a reverse proxy with TLS in front of it:

```nginx
# nginx configuration for the discovery service
server {
    listen 443 ssl;
    server_name discovery.internal.example.com;

    ssl_certificate /etc/ssl/certs/discovery.pem;
    ssl_certificate_key /etc/ssl/private/discovery-key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Option 3: Deploy with systemd

For bare-metal servers running Linux:

```ini
# /etc/systemd/system/talos-discovery.service
[Unit]
Description=Talos Discovery Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/discovery-service --addr=:3000 --metrics-addr=:9090
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Download the binary
wget https://github.com/siderolabs/discovery-service/releases/latest/download/discovery-service-linux-amd64 \
  -O /usr/local/bin/discovery-service
chmod +x /usr/local/bin/discovery-service

# Start the service
systemctl enable --now talos-discovery
```

## Configuring Talos to Use the Custom Registry

Once your discovery service is running, configure your Talos nodes to use it:

```yaml
# custom-discovery.yaml
cluster:
  discovery:
    enabled: true
    registries:
      service:
        disabled: false
        endpoint: https://discovery.internal.example.com/
      kubernetes:
        disabled: false
```

Apply to all nodes:

```bash
talosctl patch machineconfig \
  --patch @custom-discovery.yaml \
  --nodes <all-node-ips>
```

For new clusters, include this in the initial configuration:

```bash
talosctl gen config my-cluster https://10.0.0.10:6443 \
  --config-patch='[{"op": "replace", "path": "/cluster/discovery/registries/service/endpoint", "value": "https://discovery.internal.example.com/"}]'
```

## Verifying the Custom Registry

After configuration, verify that nodes are using the custom registry:

```bash
# Check discovered members
talosctl get discoveredmembers --nodes <node-ip>

# Check controller logs for the custom endpoint
talosctl logs controller-runtime --nodes <node-ip> | grep -i discovery

# Verify the endpoint in the machine config
talosctl get machineconfig --nodes <node-ip> -o yaml | grep endpoint
```

## Monitoring the Discovery Service

The discovery service exposes Prometheus metrics on the metrics port:

```bash
# Check the metrics endpoint
curl http://discovery.internal.example.com:9090/metrics
```

Key metrics to monitor:

```yaml
# Prometheus scrape config
- job_name: 'talos-discovery'
  static_configs:
    - targets: ['discovery.internal.example.com:9090']
```

Set up alerts for the discovery service itself:

```yaml
# discovery-alerts.yaml
groups:
  - name: talos-discovery
    rules:
      - alert: DiscoveryServiceDown
        expr: up{job="talos-discovery"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Talos Discovery Service is down"

      - alert: DiscoveryHighLatency
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{job="talos-discovery"}[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Talos Discovery Service response time is high"
```

## High Availability Setup

For production, run multiple discovery service instances behind a load balancer:

```yaml
# Scale to multiple replicas
apiVersion: apps/v1
kind: Deployment
metadata:
  name: discovery-service
  namespace: talos-discovery
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
```

Since the discovery service is stateless, each instance independently serves requests. Nodes re-register with whichever instance handles their request, so there is no data synchronization needed between instances. If one instance goes down, nodes automatically re-register with a healthy instance on the next refresh cycle.

## TLS Certificate Requirements

The discovery service endpoint must use HTTPS. Make sure your TLS certificate is valid and trusted by the Talos nodes. Talos includes a standard set of CA certificates, so certificates from public CAs work automatically.

For internal CAs, you need to add the CA certificate to the Talos machine configuration:

```yaml
machine:
  files:
    - content: |
        -----BEGIN CERTIFICATE-----
        <your internal CA certificate>
        -----END CERTIFICATE-----
      path: /etc/ssl/certs/internal-ca.pem
      permissions: 0644
```

Self-hosting the Talos discovery service is a straightforward process. The service is lightweight, stateless, and designed to be easy to operate. Whether you deploy it in Kubernetes, as a Docker container, or as a systemd service, the end result is full control over your cluster's discovery infrastructure with no external dependencies.
