# How to Set Up Skipper HTTP Router on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Skipper, HTTP Router, Kubernetes, Ingress, Linux

Description: Learn how to install and configure Skipper as an HTTP router and ingress controller on RHEL, including route definitions, filters, predicates, and Kubernetes integration.

---

Skipper is an HTTP router and reverse proxy developed by Zalando that excels at dynamic routing, A/B testing, and traffic shaping. It can serve as a standalone router or as a Kubernetes ingress controller. This guide walks through setting up Skipper on RHEL for both standalone use and Kubernetes ingress.

## What Makes Skipper Different

Skipper stands out from other routers because of its filter and predicate system. Routes are defined using a domain-specific language called Eskip, which lets you compose complex routing rules in a readable format. You can match on headers, paths, methods, query parameters, and more, then apply filters like rate limiting, request modification, or traffic splitting.

## Prerequisites

You will need:

- A RHEL system with root or sudo access
- Go 1.21 or newer (for building from source)
- A Kubernetes cluster (if using Skipper as an ingress controller)

## Installing Skipper from Binary

Download the latest release:

```bash
# Download the latest Skipper binary
curl -LO https://github.com/zalando/skipper/releases/latest/download/skipper-linux-amd64
chmod +x skipper-linux-amd64
sudo mv skipper-linux-amd64 /usr/local/bin/skipper
```

Verify the installation:

```bash
# Check the Skipper version
skipper version
```

## Building from Source

If you prefer to build from source:

```bash
# Install Go if not already present
sudo dnf install -y golang
```

```bash
# Clone and build Skipper
git clone https://github.com/zalando/skipper.git
cd skipper
make skipper
sudo cp bin/skipper /usr/local/bin/
```

## Basic Route Configuration with Eskip

Create a routes file that defines how traffic should be routed:

```bash
# Create a routes file
cat > /etc/skipper/routes.eskip << 'EOF'
// Route all traffic for example.com to a backend
main: Path("/") -> "http://127.0.0.1:8080";

// Route API requests to a different backend
api: PathSubtree("/api") -> "http://127.0.0.1:9090";

// Health check endpoint
health: Path("/health") -> status(200) -> <shunt>;
EOF
```

Start Skipper with the routes file:

```bash
# Run Skipper with the routes file
skipper -routes-file /etc/skipper/routes.eskip -address :9999
```

Test the routing:

```bash
# Test the health endpoint
curl -i http://localhost:9999/health
```

## Using Predicates

Predicates let you match requests based on various criteria:

```
// Match requests with a specific header
headerRoute: Header("X-Environment", "staging") -> "http://staging-backend:8080";

// Match based on HTTP method
postOnly: Method("POST") && Path("/submit") -> "http://api-backend:8080";

// Match based on source IP
internalOnly: Source("10.0.0.0/8") && PathSubtree("/internal") -> "http://internal-service:8080";

// Match based on time
offHours: Between("2024-01-01T22:00:00+00:00", "2024-01-02T06:00:00+00:00") && Path("/") -> "http://maintenance-page:8080";
```

## Applying Filters

Filters modify requests and responses as they pass through Skipper:

```
// Add a request header
addHeader: Path("/") -> setRequestHeader("X-Forwarded-By", "skipper") -> "http://backend:8080";

// Rate limiting
rateLimited: Path("/api") -> ratelimit(10, "1m") -> "http://api:8080";

// Modify the response
modifyResponse: Path("/") -> modResponseHeader("Server", "MyApp") -> "http://backend:8080";

// Strip path prefix before forwarding
stripPrefix: PathSubtree("/v1/api") -> modPath("^/v1", "") -> "http://api:8080";
```

## Traffic Splitting for A/B Testing

Skipper makes it easy to split traffic between backends:

```
// Send 80% of traffic to v1, 20% to v2
mainRoute: Path("/app")
  -> trafficSegment(0.0, 0.8) -> "http://app-v1:8080";

canaryRoute: Path("/app")
  -> trafficSegment(0.8, 1.0) -> "http://app-v2:8080";
```

## Creating a Systemd Service

Set up Skipper as a managed service:

```bash
# Create the systemd unit file
sudo tee /etc/systemd/system/skipper.service > /dev/null << 'EOF'
[Unit]
Description=Skipper HTTP Router
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/skipper -routes-file /etc/skipper/routes.eskip -address :9999
Restart=always
RestartSec=5
User=skipper
Group=skipper

[Install]
WantedBy=multi-user.target
EOF
```

```bash
# Create the skipper user and enable the service
sudo useradd -r -s /sbin/nologin skipper
sudo mkdir -p /etc/skipper
sudo systemctl daemon-reload
sudo systemctl enable --now skipper
```

## Deploying as a Kubernetes Ingress Controller

Deploy Skipper as an ingress controller in your cluster:

```yaml
# skipper-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: skipper-ingress
  namespace: kube-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: skipper-ingress
  template:
    metadata:
      labels:
        app: skipper-ingress
    spec:
      containers:
      - name: skipper
        image: registry.opensource.zalan.do/teapot/skipper:latest
        args:
        - skipper
        - -kubernetes
        - -kubernetes-in-cluster
        - -kubernetes-path-mode=path-prefix
        - -address=:9999
        - -proxy-preserve-host
        ports:
        - containerPort: 9999
        resources:
          requests:
            cpu: 200m
            memory: 128Mi
```

```bash
# Apply the deployment
kubectl apply -f skipper-deployment.yaml
```

Create an ingress resource that Skipper will handle:

```yaml
# app-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    zalando.org/skipper-filter: ratelimit(20, "1m")
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

## Monitoring and Metrics

Skipper exposes Prometheus metrics by default. Enable them with:

```bash
# Start Skipper with Prometheus metrics
skipper -routes-file /etc/skipper/routes.eskip \
  -address :9999 \
  -enable-prometheus-metrics \
  -metrics-listener :9911
```

Key metrics to watch include `skipper_serve_host_duration_seconds`, `skipper_route_lookup_duration_seconds`, and `skipper_filter_request_duration_seconds`.

## Conclusion

Skipper gives you a flexible, programmable HTTP router on RHEL that works well both as a standalone reverse proxy and as a Kubernetes ingress controller. Its Eskip routing language makes complex routing rules readable and maintainable, and built-in features like traffic splitting and rate limiting cover most production needs without external dependencies.
