# How to Migrate from NGINX Ingress Controller to Envoy Gateway on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, NGINX, Envoy Gateway, Ingress, Service Mesh

Description: Step-by-step migration from NGINX Ingress Controller to Envoy Gateway for advanced traffic management, observability, and Gateway API support with minimal downtime.

---

NGINX Ingress Controller has been the standard for Kubernetes ingress for years, but Envoy Gateway represents the next generation of ingress with first-class support for the Gateway API, advanced traffic management capabilities, and deep observability. This guide walks through migrating from NGINX to Envoy Gateway while maintaining service availability.

## Why Migrate to Envoy Gateway

Envoy Gateway provides several advantages over NGINX. It implements the Gateway API standard, offering portable configurations across providers. Envoy's observability is superior with built-in distributed tracing support and detailed metrics. It supports advanced traffic management including traffic splitting, header-based routing, and retry policies. The architecture is also more cloud-native with separate data and control planes.

Gateway API is the successor to the Ingress API, providing more expressive routing capabilities and better multi-tenancy support.

## Installing Envoy Gateway

First, install the Gateway API CRDs and Envoy Gateway:

```bash
# Install Gateway API CRDs
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml

# Install Envoy Gateway
helm install eg oci://docker.io/envoyproxy/gateway-helm \
  --version v1.0.0 \
  -n envoy-gateway-system \
  --create-namespace

# Verify installation
kubectl get pods -n envoy-gateway-system
kubectl wait --for=condition=available --timeout=300s \
  deployment/envoy-gateway -n envoy-gateway-system
```

## Creating a GatewayClass

Define a GatewayClass resource:

```yaml
# gatewayclass.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: envoy-gateway
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller
```

Apply the GatewayClass:

```bash
kubectl apply -f gatewayclass.yaml
kubectl get gatewayclass
```

## Converting NGINX Ingress to Gateway API

Let's convert a typical NGINX Ingress to Gateway API. Here's an NGINX Ingress example:

```yaml
# nginx-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - app.example.com
    secretName: app-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
      - path: /web
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

Convert to Gateway API resources:

```yaml
# gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: myapp-gateway
  namespace: production
spec:
  gatewayClassName: envoy-gateway
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    hostname: app.example.com
  - name: https
    protocol: HTTPS
    port: 443
    hostname: app.example.com
    tls:
      mode: Terminate
      certificateRefs:
      - name: app-tls
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: myapp-routes
  namespace: production
spec:
  parentRefs:
  - name: myapp-gateway
  hostnames:
  - app.example.com
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: api-service
      port: 8080
  - matches:
    - path:
        type: PathPrefix
        value: /web
    backendRefs:
    - name: web-service
      port: 80
```

Apply the Gateway resources:

```bash
kubectl apply -f gateway.yaml

# Verify Gateway is ready
kubectl get gateway myapp-gateway -n production
kubectl get httproute myapp-routes -n production
```

## Advanced Routing Features

Implement header-based routing:

```yaml
# httproute-headers.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-versioning
  namespace: production
spec:
  parentRefs:
  - name: myapp-gateway
  hostnames:
  - api.example.com
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
      headers:
      - name: X-API-Version
        value: v2
    backendRefs:
    - name: api-service-v2
      port: 8080
  - matches:
    - path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: api-service-v1
      port: 8080
```

Implement traffic splitting for canary deployments:

```yaml
# httproute-canary.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: canary-deployment
  namespace: production
spec:
  parentRefs:
  - name: myapp-gateway
  hostnames:
  - app.example.com
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: app-stable
      port: 80
      weight: 90
    - name: app-canary
      port: 80
      weight: 10
```

## Running Both Controllers in Parallel

During migration, run NGINX and Envoy Gateway simultaneously:

```bash
# Keep NGINX Ingress Controller running
kubectl get deployment -n ingress-nginx

# Access NGINX at one IP
NGINX_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Access Envoy Gateway at another IP
ENVOY_IP=$(kubectl get svc -n envoy-gateway-system envoy-gateway \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "NGINX IP: $NGINX_IP"
echo "Envoy IP: $ENVOY_IP"
```

## DNS Cutover Strategy

Gradually shift traffic using DNS:

```bash
# Create Route53 weighted routing (example with AWS)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "nginx",
        "Weight": 90,
        "TTL": 60,
        "ResourceRecords": [{"Value": "'$NGINX_IP'"}]
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "envoy",
        "Weight": 10,
        "TTL": 60,
        "ResourceRecords": [{"Value": "'$ENVOY_IP'"}]
      }
    }]
  }'
```

Gradually increase Envoy weight:

```bash
# Shift to 50/50
aws route53 change-resource-record-sets --hosted-zone-id Z123456789 \
  --change-batch '{"Changes": [...]}'  # Update weights to 50/50

# Eventually 0/100
# Then remove NGINX record entirely
```

## Migration Script for Multiple Ingresses

Automate conversion of multiple Ingress resources:

```python
#!/usr/bin/env python3
# convert-ingress-to-gateway.py

import yaml
import sys
from pathlib import Path

def convert_ingress_to_httproute(ingress):
    """Convert Ingress to HTTPRoute"""
    httproute = {
        'apiVersion': 'gateway.networking.k8s.io/v1',
        'kind': 'HTTPRoute',
        'metadata': {
            'name': ingress['metadata']['name'],
            'namespace': ingress['metadata'].get('namespace', 'default')
        },
        'spec': {
            'parentRefs': [{'name': 'main-gateway'}],
            'rules': []
        }
    }

    # Extract hostnames
    hostnames = []
    for rule in ingress['spec'].get('rules', []):
        if 'host' in rule:
            hostnames.append(rule['host'])

    if hostnames:
        httproute['spec']['hostnames'] = hostnames

    # Convert rules
    for rule in ingress['spec'].get('rules', []):
        for path in rule.get('http', {}).get('paths', []):
            route_rule = {
                'matches': [{
                    'path': {
                        'type': path.get('pathType', 'Prefix'),
                        'value': path['path']
                    }
                }],
                'backendRefs': [{
                    'name': path['backend']['service']['name'],
                    'port': path['backend']['service']['port']['number']
                }]
            }
            httproute['spec']['rules'].append(route_rule)

    return httproute

def main():
    ingress_file = sys.argv[1]

    with open(ingress_file, 'r') as f:
        ingresses = yaml.safe_load_all(f)

        for ingress in ingresses:
            if ingress and ingress.get('kind') == 'Ingress':
                httproute = convert_ingress_to_httproute(ingress)

                output_file = f"httproute-{ingress['metadata']['name']}.yaml"
                with open(output_file, 'w') as out:
                    yaml.dump(httproute, out, default_flow_style=False)

                print(f"Converted {ingress['metadata']['name']} to {output_file}")

if __name__ == '__main__':
    main()
```

Run the conversion:

```bash
# Export all Ingresses
kubectl get ingress --all-namespaces -o yaml > all-ingresses.yaml

# Convert to HTTPRoutes
python3 convert-ingress-to-gateway.py all-ingresses.yaml

# Review generated files
ls httproute-*.yaml

# Apply HTTPRoutes
kubectl apply -f httproute-*.yaml
```

## Observability with Envoy Gateway

Envoy provides rich metrics out of the box:

```yaml
# servicemonitor-envoy.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: envoy-gateway
  namespace: envoy-gateway-system
spec:
  selector:
    matchLabels:
      app: envoy-gateway
  endpoints:
  - port: metrics
    path: /stats/prometheus
```

Query Envoy metrics:

```promql
# Request rate per route
rate(envoy_http_downstream_rq_total[5m])

# Response latency
histogram_quantile(0.95,
  rate(envoy_http_downstream_rq_time_bucket[5m])
)

# Error rate
rate(envoy_http_downstream_rq_xx{envoy_response_code_class="5"}[5m])
```

Enable access logs:

```yaml
# envoygateway-config.yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: EnvoyGateway
metadata:
  name: envoy-gateway-config
  namespace: envoy-gateway-system
spec:
  accessLog:
    - type: File
      file:
        path: /dev/stdout
```

## TLS and Certificate Management

Envoy Gateway integrates with cert-manager:

```yaml
# certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-tls
  namespace: production
spec:
  secretName: app-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - app.example.com
  - api.example.com
```

Reference the certificate in Gateway:

```yaml
listeners:
- name: https
  protocol: HTTPS
  port: 443
  tls:
    mode: Terminate
    certificateRefs:
    - name: app-tls  # Cert-manager created secret
```

## Decommissioning NGINX Ingress Controller

After running Envoy Gateway successfully for at least two weeks:

```bash
# Remove NGINX Ingress Controller
helm uninstall ingress-nginx -n ingress-nginx

# Delete Ingress resources
kubectl delete ingress --all --all-namespaces

# Remove NGINX-specific annotations from manifests
# (stored in Git, update via PR)

# Clean up namespace
kubectl delete namespace ingress-nginx
```

## Conclusion

Migrating from NGINX Ingress Controller to Envoy Gateway modernizes your ingress infrastructure with Gateway API support, superior observability, and advanced traffic management. The parallel running approach ensures zero downtime during migration. Envoy Gateway's adherence to Gateway API standards provides better portability and future-proofs your ingress configuration as the Kubernetes ecosystem evolves toward this new standard.
