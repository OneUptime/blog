# How to Migrate Kubernetes Ingress Resources to Gateway API HTTPRoute Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Gateway API, Ingress

Description: Learn how to migrate from Kubernetes Ingress to the new Gateway API for more powerful traffic routing, better extensibility, and role-oriented design.

---

The Kubernetes Gateway API is the successor to Ingress, providing more expressive routing, better extensibility, and separation of concerns through role-oriented design. Migrating from Ingress to Gateway API enables advanced traffic management while future-proofing your cluster. This guide shows you how to migrate Ingress resources to HTTPRoute with minimal disruption.

## Understanding Gateway API Architecture

Gateway API uses multiple resources with role separation.

```yaml
# Gateway API architecture
apiVersion: v1
kind: ConfigMap
metadata:
  name: gateway-api-concepts
data:
  architecture.txt: |
    GatewayClass (Platform Admin)
      |
      +-- Gateway (Cluster Operator)
            |
            +-- HTTPRoute (Application Developer)
            +-- TCPRoute (Application Developer)
            +-- TLSRoute (Application Developer)

    Ingress equivalent:
      IngressClass -> GatewayClass
      Ingress -> HTTPRoute
      (Gateway has no Ingress equivalent)
```

Gateway API provides better role separation than Ingress.

## Installing Gateway API

Deploy Gateway API CRDs and a compatible controller.

```bash
#!/bin/bash
# Install Gateway API

# Install Gateway API CRDs
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml

# Verify CRDs
kubectl get crd | grep gateway

# Install a Gateway controller (example: Istio)
istioctl install --set profile=minimal -y

# Or use nginx-gateway-fabric
kubectl apply -f https://raw.githubusercontent.com/nginxinc/nginx-gateway-fabric/main/deploy/manifests/nginx-gateway.yaml

# Verify installation
kubectl get gatewayclass
kubectl get pods -n gateway-system
```

Gateway API CRDs are now built into Kubernetes 1.29+.

## Creating GatewayClass and Gateway

Define infrastructure-level Gateway resources.

```yaml
# GatewayClass (managed by platform team)
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: nginx
spec:
  controllerName: nginx.org/gateway-controller
---
# Gateway (managed by cluster operators)
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: production-gateway
  namespace: gateway-system
spec:
  gatewayClassName: nginx
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: All
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: production-tls
    allowedRoutes:
      namespaces:
        from: All
---
# TLS certificate secret
apiVersion: v1
kind: Secret
metadata:
  name: production-tls
  namespace: gateway-system
type: kubernetes.io/tls
data:
  tls.crt: LS0tLS1CRUd... # base64 encoded
  tls.key: LS0tLS1CRUd... # base64 encoded
```

Gateway defines how external traffic enters the cluster.

## Converting Ingress to HTTPRoute

Translate Ingress rules to HTTPRoute resources.

```yaml
# Original Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.example.com
    secretName: api-tls
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /users
        pathType: Prefix
        backend:
          service:
            name: user-service
            port:
              number: 80
      - path: /orders
        pathType: Prefix
        backend:
          service:
            name: order-service
            port:
              number: 80
---
# Converted to Gateway API HTTPRoute
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: myapp
  namespace: production
spec:
  parentRefs:
  - name: production-gateway
    namespace: gateway-system
  hostnames:
  - api.example.com
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /users
    backendRefs:
    - name: user-service
      port: 80
  - matches:
    - path:
        type: PathPrefix
        value: /orders
    backendRefs:
    - name: order-service
      port: 80
```

HTTPRoute provides more explicit routing configuration.

## Implementing Advanced Routing

Use Gateway API features unavailable in Ingress.

```yaml
# HTTPRoute with traffic splitting (canary)
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: myapp-canary
  namespace: production
spec:
  parentRefs:
  - name: production-gateway
    namespace: gateway-system
  hostnames:
  - api.example.com
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: myapp-stable
      port: 80
      weight: 90
    - name: myapp-canary
      port: 80
      weight: 10
---
# HTTPRoute with header-based routing
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: myapp-beta
  namespace: production
spec:
  parentRefs:
  - name: production-gateway
    namespace: gateway-system
  rules:
  - matches:
    - headers:
      - name: X-Beta-User
        value: "true"
      path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: myapp-beta
      port: 80
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: myapp-stable
      port: 80
---
# HTTPRoute with request/response modification
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: myapp-transform
  namespace: production
spec:
  parentRefs:
  - name: production-gateway
    namespace: gateway-system
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api/v1
    filters:
    - type: URLRewrite
      urlRewrite:
        path:
          type: ReplacePrefixMatch
          replacePrefixMatch: /v1
    - type: RequestHeaderModifier
      requestHeaderModifier:
        add:
        - name: X-API-Version
          value: "v1"
    backendRefs:
    - name: myapp
      port: 80
```

Gateway API enables sophisticated routing patterns.

## Creating Migration Script

Automate conversion from Ingress to HTTPRoute.

```bash
#!/bin/bash
# ingress-to-httproute.sh

NAMESPACE="${1:-default}"
GATEWAY_NAME="${2:-production-gateway}"
GATEWAY_NAMESPACE="${3:-gateway-system}"

echo "Converting Ingress resources in namespace: $NAMESPACE"

for INGRESS in $(kubectl get ingress -n $NAMESPACE -o name); do
  INGRESS_NAME=$(echo $INGRESS | cut -d/ -f2)
  echo "Converting $INGRESS_NAME..."

  # Extract Ingress spec
  kubectl get ingress $INGRESS_NAME -n $NAMESPACE -o json > /tmp/ingress.json

  # Convert to HTTPRoute
  cat > /tmp/httproute-$INGRESS_NAME.yaml <<EOF
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: $INGRESS_NAME
  namespace: $NAMESPACE
spec:
  parentRefs:
  - name: $GATEWAY_NAME
    namespace: $GATEWAY_NAMESPACE
  hostnames:
EOF

  # Extract hostnames
  kubectl get ingress $INGRESS_NAME -n $NAMESPACE -o jsonpath='{.spec.rules[*].host}' | \
    tr ' ' '\n' | sed 's/^/  - /' >> /tmp/httproute-$INGRESS_NAME.yaml

  # Add rules
  echo "  rules:" >> /tmp/httproute-$INGRESS_NAME.yaml

  # Extract paths and backends
  kubectl get ingress $INGRESS_NAME -n $NAMESPACE -o json | \
    jq -r '.spec.rules[].http.paths[] | 
      "  - matches:\n    - path:\n        type: PathPrefix\n        value: \(.path)\n    backendRefs:\n    - name: \(.backend.service.name)\n      port: \(.backend.service.port.number)"' \
    >> /tmp/httproute-$INGRESS_NAME.yaml

  # Apply HTTPRoute
  kubectl apply -f /tmp/httproute-$INGRESS_NAME.yaml

  echo "Converted $INGRESS_NAME to HTTPRoute"
done

echo "Migration complete. Review HTTPRoutes before deleting Ingress resources."
```

This script provides automated conversion with manual review.

## Running Parallel Ingress and HTTPRoute

Test HTTPRoute before removing Ingress.

```yaml
# Keep Ingress running on original domain
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  namespace: production
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: myapp
            port:
              number: 80
---
# Test HTTPRoute on different domain
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: myapp-test
  namespace: production
spec:
  parentRefs:
  - name: production-gateway
    namespace: gateway-system
  hostnames:
  - test.api.example.com  # Different hostname for testing
  rules:
  - backendRefs:
    - name: myapp
      port: 80
```

Test HTTPRoute thoroughly before DNS cutover.

## Validating Gateway API Migration

Ensure HTTPRoute works correctly.

```bash
#!/bin/bash
# Validation script

GATEWAY_IP=$(kubectl get gateway production-gateway -n gateway-system -o jsonpath='{.status.addresses[0].value}')

echo "Testing HTTPRoute endpoints..."

# Test each route
for ROUTE in $(kubectl get httproute -A -o json | jq -r '.items[] | "\(.metadata.namespace)/\(.metadata.name)"'); do
  NS=$(echo $ROUTE | cut -d/ -f1)
  NAME=$(echo $ROUTE | cut -d/ -f2)

  HOSTNAME=$(kubectl get httproute $NAME -n $NS -o jsonpath='{.spec.hostnames[0]}')

  echo "Testing $NAME ($HOSTNAME)..."
  curl -H "Host: $HOSTNAME" http://$GATEWAY_IP/health -I

  if [ $? -eq 0 ]; then
    echo "✓ $NAME working"
  else
    echo "✗ $NAME failed"
  fi
done
```

Validate all routes before DNS cutover.

## Switching DNS to Gateway

Update DNS to point to Gateway load balancer.

```bash
#!/bin/bash
# DNS cutover

OLD_INGRESS_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
NEW_GATEWAY_IP=$(kubectl get gateway production-gateway -n gateway-system -o jsonpath='{.status.addresses[0].value}')

echo "Old Ingress IP: $OLD_INGRESS_IP"
echo "New Gateway IP: $NEW_GATEWAY_IP"

# Update DNS
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "TTL": 60,
        "ResourceRecords": [{"Value": "'$NEW_GATEWAY_IP'"}]
      }
    }]
  }'

echo "DNS updated. Monitor traffic shift for 30 minutes before removing Ingress."
```

Use short TTL for quick rollback if needed.

## Removing Old Ingress Resources

Delete Ingress after Gateway API proves stable.

```bash
#!/bin/bash
# Cleanup script

SOAK_PERIOD_HOURS=24

echo "Gateway API has been stable for $SOAK_PERIOD_HOURS hours"
read -p "Proceed with Ingress removal? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  exit 0
fi

# Backup Ingress resources
kubectl get ingress -A -o yaml > ingress-backup.yaml

# Delete Ingress resources
kubectl delete ingress --all -A

# Optionally remove Ingress controller
# kubectl delete namespace ingress-nginx

echo "Ingress resources removed"
echo "Backup saved to ingress-backup.yaml"
```

Only remove Ingress after Gateway API proves stable.

## Conclusion

Gateway API is the future of Kubernetes traffic management. Install Gateway API CRDs and a compatible controller like Istio or NGINX Gateway Fabric. Create GatewayClass and Gateway resources for infrastructure-level configuration. Convert Ingress resources to HTTPRoute with more expressive routing rules. Leverage advanced features like traffic splitting, header-based routing, and request/response modification. Run Ingress and HTTPRoute in parallel during testing on different hostnames. Validate all HTTPRoute endpoints thoroughly. Switch DNS to point to the Gateway load balancer. Remove Ingress resources only after a successful soak period. Gateway API provides better extensibility, role-oriented design, and more powerful routing than Ingress while maintaining Kubernetes-native semantics.
