# How to Verify IPv6 Service Endpoints in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, Endpoint, EndpointSlice, Service, Dual-Stack

Description: Verify that Kubernetes Services have IPv6 endpoints, inspect EndpointSlices for IPv6 addresses, and troubleshoot cases where IPv6 pod addresses are not included in service endpoints.

## Introduction

Kubernetes Services route traffic to pods through EndpointSlices. The older Endpoints API is deprecated and does not support dual-stack clusters. In dual-stack clusters, Services configured for IPv6 or dual-stack can have EndpointSlices with IPv6 addresses for pods that have IPv6 addresses. For Service-backed EndpointSlices, the addressType is `IPv4` or `IPv6`. The API still includes `FQDN`, but it is deprecated and not processed by kube-proxy. For dual-stack services, Kubernetes creates separate EndpointSlices for IPv4 and IPv6. Verifying that Services have IPv6 endpoints confirms that IPv6 traffic can be load-balanced to pods.

## Check Service Endpoints for IPv6

```bash
# View legacy Endpoints for a service
# Note: Endpoints are deprecated and do not show dual-stack backends.

kubectl get endpoints web-service

# More detailed legacy endpoint info
kubectl describe endpoints web-service

# Check EndpointSlices (preferred in Kubernetes 1.21+)
kubectl get endpointslices -l kubernetes.io/service-name=web-service

# View EndpointSlice details including IP type
kubectl get endpointslices -l kubernetes.io/service-name=web-service -o yaml

# Filter only IPv6 EndpointSlices
kubectl get endpointslices -A -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for es in data['items']:
    svc = es['metadata']['labels'].get('kubernetes.io/service-name', 'unknown')
    addr_type = es.get('addressType', 'unknown')
    endpoints = es.get('endpoints', [])
    if addr_type == 'IPv6':
        print(f'Service: {svc} | Type: {addr_type} | Endpoints: {[e[\"addresses\"] for e in endpoints]}')
"
```

## Inspect EndpointSlices in Detail

```bash
# Create a test service with pods
kubectl apply -f - << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
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
        - name: web
          image: nginx:latest
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  selector:
    app: web
  ports:
    - port: 80
  ipFamilyPolicy: PreferDualStack
  ipFamilies: [IPv4, IPv6]
EOF

# View EndpointSlices
kubectl get endpointslices -l kubernetes.io/service-name=web-service

# Should show two slices: one IPv4, one IPv6
# NAME                        ADDRESSTYPE   PORTS   ENDPOINTS   AGE
# web-service-xxxxx           IPv4          80      10.244.0.5,10.244.1.3,...
# web-service-yyyyy           IPv6          80      fd00::5,fd00:1::3,...
```

## Verify IPv6 Endpoint Connectivity

```bash
# Get IPv6 endpoints for a service
kubectl get endpointslices -l kubernetes.io/service-name=web-service \
    -o jsonpath='{range .items[?(@.addressType=="IPv6")].endpoints[*]}{.addresses[0]}{"\n"}{end}'

# Test direct connectivity to IPv6 endpoint
ENDPOINT_IPV6=$(kubectl get endpointslices \
    -l kubernetes.io/service-name=web-service \
    -o jsonpath='{range .items[?(@.addressType=="IPv6")].endpoints[*]}{.addresses[0]}{"\n"}{end}' | \
    head -n 1)

echo "Testing endpoint: $ENDPOINT_IPV6"
kubectl run tester --image=alpine --restart=Never --rm -it --command -- \
    wget -qO- "http://[$ENDPOINT_IPV6]/"
```

## Troubleshoot Missing IPv6 Endpoints

```bash
# Issue: Service has no IPv6 EndpointSlice

# Check 1: Do pods have IPv6 addresses?
kubectl get pods -l app=web -o jsonpath='{range .items[*]}{.metadata.name}: {.status.podIPs}{"\n"}{end}'

# Check 2: Does the service have IPv6 ClusterIP?
kubectl get svc web-service -o jsonpath='{.spec.clusterIPs}'

# Check 3: Check endpoint-slice-controller logs
# Control-plane components are often static Pods rather than Deployments.
kubectl -n kube-system logs -l component=kube-controller-manager --all-containers=true --tail=-1 | \
    grep -i "endpointslice\|ipv6"

# Check 4: Verify the EndpointSlice API is available
kubectl api-resources --api-group=discovery.k8s.io | grep -w endpointslices

# Fix: Correct the Service and cluster dual-stack configuration, then recreate
# or update the affected Service. EndpointSlices are reconciled automatically.
```

## Script: Check Service IPv6 Endpoint Health

```bash
#!/bin/bash
# check_svc_ipv6_endpoints.sh

echo "Services and their IPv6 endpoint counts:"
echo ""

kubectl get svc -A --no-headers -o custom-columns="NS:.metadata.namespace,NAME:.metadata.name" | \
while read NS SVC; do
    # Count IPv6 endpoints
    V6_COUNT=$(kubectl get endpointslices -n "$NS" \
        -l "kubernetes.io/service-name=$SVC" \
        -o jsonpath='{range .items[?(@.addressType=="IPv6")].endpoints[*]}{.addresses[0]}{"\n"}{end}' 2>/dev/null | \
        grep -c ":")

    if [ "$V6_COUNT" -gt 0 ]; then
        echo "  $NS/$SVC: $V6_COUNT IPv6 endpoints"
    fi
done
```

## Conclusion

Kubernetes Services configured for dual-stack create separate EndpointSlices for IPv4 (`addressType: IPv4`) and IPv6 (`addressType: IPv6`) pod addresses. Verify IPv6 endpoints with `kubectl get endpointslices -l kubernetes.io/service-name=<name>` and filter for `addressType: IPv6`. If IPv6 EndpointSlices are missing, check that pods have IPv6 addresses (`status.podIPs`) and the service has an IPv6 ClusterIP. The endpoint-slice controller (part of kube-controller-manager) creates IPv6 slices automatically when the Service and matching pods have IPv6 addresses.
