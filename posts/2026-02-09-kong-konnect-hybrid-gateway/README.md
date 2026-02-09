# How to Deploy Kong with Konnect Control Plane for Hybrid Gateway Architecture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kong, API Gateway, Hybrid Cloud

Description: Deploy Kong Gateway with Konnect control plane for hybrid and multi-cloud architectures with configuration synchronization, data plane deployment, and monitoring strategies.

---

Kong Konnect provides a SaaS control plane that manages multiple Kong Gateway data planes across different environments, clouds, and regions. This hybrid architecture separates configuration management from request processing, enabling centralized policy control while keeping data plane instances close to your workloads for low latency.

## Understanding Hybrid Mode Architecture

In hybrid mode, the control plane manages configurations, plugins, and routing rules through a web interface or API. Data planes receive these configurations through secure connections and handle all actual API traffic. This separation provides several advantages: centralized management, reduced operational complexity, improved security (data planes never expose admin APIs), and flexibility to deploy data planes anywhere.

The data planes connect to the control plane using mutual TLS over port 443. Configuration changes propagate to all data planes within seconds. If connectivity is lost, data planes continue operating with their last known configuration.

## Setting Up Kong Konnect Control Plane

Create a Konnect account and set up your control plane at https://cloud.konghq.com. After creating an account, you'll get access to the Konnect dashboard where you can create runtime groups.

Runtime groups organize data planes by environment (development, staging, production) or by function (public APIs, internal APIs). Each runtime group has unique certificates for mTLS authentication.

```bash
# Download the runtime group certificates from Konnect UI
# You'll receive three files:
# - tls.crt (certificate)
# - tls.key (private key)
# - ca.crt (CA certificate)

# Create Kubernetes secret from certificates
kubectl create namespace kong-dp
kubectl create secret tls kong-cluster-cert \
  --cert=tls.crt \
  --key=tls.key \
  -n kong-dp

kubectl create configmap kong-cluster-ca \
  --from-file=ca.crt=ca.crt \
  -n kong-dp
```

## Deploying Kong Data Plane on Kubernetes

Install Kong Gateway in data plane mode, connecting to your Konnect control plane.

```yaml
# kong-dp-values.yaml
image:
  repository: kong/kong-gateway
  tag: "3.5"

env:
  role: data_plane
  database: "off"
  cluster_mtls: pki
  cluster_control_plane: your-control-plane.us.cp0.konghq.com:443
  cluster_server_name: your-control-plane.us.cp0.konghq.com
  cluster_telemetry_endpoint: your-telemetry.us.tp0.konghq.com:443
  cluster_telemetry_server_name: your-telemetry.us.tp0.konghq.com
  lua_ssl_trusted_certificate: /etc/secrets/kong-cluster-ca/ca.crt

secretVolumes:
  - kong-cluster-cert
  - kong-cluster-ca

ingressController:
  enabled: false

proxy:
  enabled: true
  type: LoadBalancer
  http:
    enabled: true
    servicePort: 80
    containerPort: 8000
  tls:
    enabled: true
    servicePort: 443
    containerPort: 8443

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 2Gi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 75
```

Install with Helm:

```bash
# Add Kong Helm repository
helm repo add kong https://charts.konghq.com
helm repo update

# Install Kong data plane
helm install kong-dp kong/kong \
  -n kong-dp \
  -f kong-dp-values.yaml \
  --wait
```

Verify the data plane connected successfully:

```bash
# Check data plane pods
kubectl get pods -n kong-dp

# Check data plane logs for successful connection
kubectl logs -n kong-dp -l app.kubernetes.io/name=kong --tail=50

# Expected log message:
# [cluster] successfully connected to control plane
```

## Configuring Services and Routes via Konnect

Use the Konnect UI or API to configure services and routes. These configurations automatically propagate to all connected data planes.

```bash
# Configure via Konnect API
export KONNECT_TOKEN="your-personal-access-token"
export CONTROL_PLANE_ID="your-control-plane-id"

# Create a service
curl -X POST https://us.api.konghq.com/v2/control-planes/${CONTROL_PLANE_ID}/core-entities/services \
  -H "Authorization: Bearer ${KONNECT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "user-service",
    "url": "http://user-service.backend.svc.cluster.local:8080"
  }'

# Create a route
curl -X POST https://us.api.konghq.com/v2/control-planes/${CONTROL_PLANE_ID}/core-entities/routes \
  -H "Authorization: Bearer ${KONNECT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "user-route",
    "paths": ["/api/users"],
    "service": {
      "name": "user-service"
    }
  }'
```

## Multi-Region Data Plane Deployment

Deploy data planes in multiple regions for global coverage while managing them from a single control plane.

```yaml
# kong-dp-us-east.yaml
env:
  cluster_control_plane: us.cp0.konghq.com:443
  cluster_telemetry_endpoint: us.tp0.konghq.com:443

nodeSelector:
  topology.kubernetes.io/region: us-east-1
```

```yaml
# kong-dp-eu-west.yaml
env:
  cluster_control_plane: us.cp0.konghq.com:443
  cluster_telemetry_endpoint: us.tp0.konghq.com:443

nodeSelector:
  topology.kubernetes.io/region: eu-west-1
```

Deploy to different clusters:

```bash
# Deploy to US cluster
kubectl config use-context us-east-cluster
helm install kong-dp-us kong/kong -n kong-dp -f kong-dp-us-east.yaml

# Deploy to EU cluster
kubectl config use-context eu-west-cluster
helm install kong-dp-eu kong/kong -n kong-dp -f kong-dp-eu-west.yaml
```

Both data planes connect to the same control plane and receive identical configurations, but serve traffic locally in their respective regions.

## Plugin Configuration via Konnect

Configure plugins through the control plane. Plugins apply globally, per service, or per route.

```bash
# Enable rate limiting plugin globally
curl -X POST https://us.api.konghq.com/v2/control-planes/${CONTROL_PLANE_ID}/core-entities/plugins \
  -H "Authorization: Bearer ${KONNECT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "rate-limiting",
    "config": {
      "minute": 100,
      "policy": "local"
    }
  }'

# Enable authentication for a specific service
curl -X POST https://us.api.konghq.com/v2/control-planes/${CONTROL_PLANE_ID}/core-entities/plugins \
  -H "Authorization: Bearer ${KONNECT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "key-auth",
    "service": {
      "name": "user-service"
    }
  }'

# Enable request transformer for a route
curl -X POST https://us.api.konkhq.com/v2/control-planes/${CONTROL_PLANE_ID}/core-entities/plugins \
  -H "Authorization: Bearer ${KONNECT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "request-transformer",
    "route": {
      "name": "user-route"
    },
    "config": {
      "add": {
        "headers": ["X-Gateway:kong"]
      }
    }
  }'
```

## GitOps Integration

Integrate Konnect with your GitOps workflow using decK (declarative Kong configuration tool).

```yaml
# kong-config.yaml
_format_version: "3.0"
_konnect:
  control_plane_name: production

services:
- name: user-service
  url: http://user-service.backend.svc.cluster.local:8080
  routes:
  - name: user-route
    paths:
    - /api/users
    methods:
    - GET
    - POST
  plugins:
  - name: rate-limiting
    config:
      minute: 100
      policy: local

- name: order-service
  url: http://order-service.backend.svc.cluster.local:8080
  routes:
  - name: order-route
    paths:
    - /api/orders
  plugins:
  - name: key-auth
  - name: cors
    config:
      origins:
      - https://app.example.com
      methods:
      - GET
      - POST
      credentials: true
```

Apply configuration with decK:

```bash
# Export Konnect credentials
export DECK_KONNECT_TOKEN="your-personal-access-token"
export DECK_KONNECT_CONTROL_PLANE_NAME="production"

# Validate configuration
deck validate --konnect-control-plane-name production kong-config.yaml

# Dry run to see changes
deck diff --konnect-control-plane-name production kong-config.yaml

# Apply configuration
deck sync --konnect-control-plane-name production kong-config.yaml
```

Integrate with CI/CD:

```yaml
# .github/workflows/kong-sync.yaml
name: Sync Kong Configuration
on:
  push:
    branches:
      - main
    paths:
      - 'kong-config.yaml'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Install decK
      run: |
        curl -sL https://github.com/kong/deck/releases/download/v1.28.0/deck_1.28.0_linux_amd64.tar.gz -o deck.tar.gz
        tar -xf deck.tar.gz
        sudo mv deck /usr/local/bin/

    - name: Validate Kong config
      env:
        DECK_KONNECT_TOKEN: ${{ secrets.KONNECT_TOKEN }}
      run: |
        deck validate --konnect-control-plane-name production kong-config.yaml

    - name: Sync to Konnect
      env:
        DECK_KONNECT_TOKEN: ${{ secrets.KONNECT_TOKEN }}
      run: |
        deck sync --konnect-control-plane-name production kong-config.yaml
```

## Monitoring and Analytics

Konnect provides built-in analytics for all connected data planes. View metrics in the Konnect dashboard or export them to your monitoring system.

```bash
# Query analytics via Konnect API
curl -X GET "https://us.api.konghq.com/v2/control-planes/${CONTROL_PLANE_ID}/analytics/reports/summary?time_range=1h" \
  -H "Authorization: Bearer ${KONNECT_TOKEN}"
```

Configure Prometheus metrics export from data planes:

```yaml
# kong-dp-values.yaml with Prometheus
env:
  # ... other config ...
  prometheus: "on"

podAnnotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "8100"
  prometheus.io/path: "/metrics"
```

## High Availability Configuration

Configure data planes for high availability with pod disruption budgets and anti-affinity rules.

```yaml
# kong-dp-ha-values.yaml
podDisruptionBudget:
  enabled: true
  minAvailable: 2

affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app.kubernetes.io/name
            operator: In
            values:
            - kong
        topologyKey: kubernetes.io/hostname

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 75
  targetMemoryUtilizationPercentage: 80
```

## Disaster Recovery

Data planes cache configurations locally. If connectivity to the control plane is lost, data planes continue processing requests with their last known configuration.

```bash
# Test resilience by blocking control plane access
kubectl exec -n kong-dp kong-dp-0 -- iptables -A OUTPUT -d your-control-plane.us.cp0.konghq.com -j DROP

# Verify data plane continues serving traffic
curl http://kong-proxy/api/users

# Data plane logs will show connection errors but continue serving
kubectl logs -n kong-dp kong-dp-0 --tail=20

# Restore connectivity
kubectl exec -n kong-dp kong-dp-0 -- iptables -D OUTPUT -d your-control-plane.us.cp0.konghq.com -j DROP
```

## Security Considerations

Data planes never expose admin APIs, reducing attack surface. All configuration happens through the control plane with authentication and authorization.

```yaml
# Data plane configuration removes admin API
env:
  admin_listen: "off"
  admin_gui_listen: "off"

# Only proxy ports are exposed
proxy:
  enabled: true
  type: LoadBalancer
```

Rotate certificates regularly:

```bash
# Download new certificates from Konnect
# Update the secret
kubectl create secret tls kong-cluster-cert \
  --cert=new-tls.crt \
  --key=new-tls.key \
  -n kong-dp \
  --dry-run=client -o yaml | kubectl apply -f -

# Rolling restart to pick up new certificates
kubectl rollout restart deployment/kong-dp -n kong-dp
```

## Conclusion

Kong Konnect's hybrid architecture provides centralized management for distributed data planes. By separating control plane from data plane, you gain operational simplicity while maintaining low latency and high availability. Deploy data planes anywhere (on-premises, cloud, edge) and manage them all from a single control plane. The GitOps integration enables version-controlled configuration management, while built-in analytics provide visibility across all environments. This architecture is ideal for multi-cloud, multi-region, and hybrid deployments where you need consistent API management without the operational overhead of managing control plane infrastructure.
