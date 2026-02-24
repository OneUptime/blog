# How to Configure Data Residency Controls with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Data Residency, GDPR, Compliance, Traffic Routing, Kubernetes

Description: How to use Istio traffic management to enforce data residency requirements and keep sensitive data within specific geographic regions.

---

Data residency requirements dictate that certain data must be stored and processed within specific geographic boundaries. This comes up with GDPR (EU data stays in the EU), data sovereignty laws in various countries, and contractual requirements from customers. If you're running Kubernetes across multiple regions, Istio can help enforce these requirements at the network level.

The basic idea is straightforward: use Istio's traffic routing to ensure that requests involving region-specific data only go to services running in the correct region. The implementation takes some thought, though.

## Understanding the Problem

Suppose you have clusters in the US and EU. EU customer data should only be processed by services in the EU cluster. If an EU customer's request accidentally gets routed to a US service, you have a data residency violation.

Without any controls, Kubernetes load balancing might send traffic anywhere. If you're using multi-cluster or federated Istio, the problem gets worse because services in one region can talk to services in another region transparently.

## Setting Up Region Labels

First, make sure your nodes and pods have proper region labels. Kubernetes nodes should have topology labels:

```bash
# Check existing labels
kubectl get nodes --show-labels | grep topology

# If missing, add them
kubectl label node node-eu-1 topology.kubernetes.io/region=eu-west-1
kubectl label node node-eu-1 topology.kubernetes.io/zone=eu-west-1a
kubectl label node node-us-1 topology.kubernetes.io/region=us-east-1
kubectl label node node-us-1 topology.kubernetes.io/zone=us-east-1a
```

Istio automatically picks up these labels and includes them in the locality information for each endpoint.

## Approach 1: Header-Based Routing

The simplest approach is to route traffic based on a request header that indicates the user's region. Your application or API gateway sets this header, and Istio routes accordingly.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-data-residency
  namespace: user-service
spec:
  hosts:
    - user-data-api.user-service.svc.cluster.local
  http:
    - match:
        - headers:
            x-data-region:
              exact: "eu"
      route:
        - destination:
            host: user-data-api.user-service.svc.cluster.local
            subset: eu-region
    - match:
        - headers:
            x-data-region:
              exact: "us"
      route:
        - destination:
            host: user-data-api.user-service.svc.cluster.local
            subset: us-region
    - route:
        - destination:
            host: user-data-api.user-service.svc.cluster.local
            subset: default
```

Define the subsets based on locality:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: user-data-subsets
  namespace: user-service
spec:
  host: user-data-api.user-service.svc.cluster.local
  subsets:
    - name: eu-region
      labels:
        topology.kubernetes.io/region: eu-west-1
    - name: us-region
      labels:
        topology.kubernetes.io/region: us-east-1
    - name: default
      labels:
        app: user-data-api
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

## Approach 2: Locality-Aware Routing with Strict Boundaries

For stricter data residency, use locality-aware load balancing with no failover to other regions:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: eu-data-strict
  namespace: user-service
spec:
  host: eu-user-data-api.user-service.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
    localityLbSetting:
      enabled: true
      distribute:
        - from: "eu-west-1/*"
          to:
            "eu-west-1/*": 100
        - from: "eu-central-1/*"
          to:
            "eu-central-1/*": 100
```

The `distribute` field explicitly says that traffic from EU regions must stay in EU regions. There's no failover to US regions, which is exactly what data residency requires.

For the US side:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: us-data-strict
  namespace: user-service
spec:
  host: us-user-data-api.user-service.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
    localityLbSetting:
      enabled: true
      distribute:
        - from: "us-east-1/*"
          to:
            "us-east-1/*": 50
            "us-west-2/*": 50
        - from: "us-west-2/*"
          to:
            "us-west-2/*": 50
            "us-east-1/*": 50
```

US data can go to any US region, but never to EU.

## Approach 3: Authorization Policy Enforcement

Add authorization policies as a hard enforcement layer. Even if routing is misconfigured, authorization policies prevent data from crossing boundaries:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: eu-data-only-from-eu
  namespace: eu-user-service
spec:
  selector:
    matchLabels:
      app: eu-user-data-api
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces:
              - "eu-user-service"
              - "eu-web-app"
              - "eu-mobile-api"
              - "gdpr-tools"
```

This ensures that only services in EU namespaces can access EU data services. Even if a US service somehow sends a request to the EU data API, it gets rejected.

## Approach 4: Separate Ingress per Region

Deploy region-specific ingress gateways that only accept traffic for that region's data:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: eu-ingress
  namespace: istio-system
spec:
  selector:
    istio: eu-ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: eu-tls-cert
      hosts:
        - "eu.api.example.com"
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: eu-ingress-routing
  namespace: istio-system
spec:
  hosts:
    - "eu.api.example.com"
  gateways:
    - eu-ingress
  http:
    - route:
        - destination:
            host: eu-user-data-api.eu-user-service.svc.cluster.local
            port:
              number: 8080
```

Configure DNS so that `eu.api.example.com` resolves to an EU-based load balancer, and `us.api.example.com` resolves to a US-based load balancer. This keeps traffic geographically separated from the first hop.

## Blocking Cross-Region Traffic in Federated Meshes

If you're running federated meshes across regions, you need to make sure that federation doesn't accidentally violate data residency. Apply authorization policies on the east-west gateways:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: block-cross-region-data
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: eastwestgateway
  action: DENY
  rules:
    - to:
        - operation:
            hosts:
              - "eu-user-data-api.eu-user-service.svc.cluster.local"
      from:
        - source:
            notNamespaces:
              - "eu-user-service"
              - "eu-web-app"
```

## Monitoring Data Residency Compliance

Set up alerts to catch any data residency violations:

```yaml
groups:
  - name: data-residency
    rules:
      - alert: CrossRegionDataAccess
        expr: |
          sum(rate(istio_requests_total{
            destination_service_namespace=~"eu-.*",
            source_workload_namespace=~"us-.*"
          }[5m])) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "US services are accessing EU data services"

      - alert: EUDataRoutedToUS
        expr: |
          sum(rate(istio_requests_total{
            destination_service_namespace=~"eu-.*",
            destination_cluster=~"us-.*"
          }[5m])) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "EU data traffic is being routed to US cluster"
```

## Generating Data Residency Reports

For compliance audits, generate regular reports showing that data stays within its required boundaries:

```bash
#!/bin/bash
echo "# Data Residency Compliance Report - $(date +%Y-%m-%d)"
echo ""
echo "## Cross-Region Traffic (Should be 0)"
echo ""

curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=sum(increase(istio_requests_total{destination_service_namespace=~"eu-.*",source_workload_namespace=~"us-.*"}[30d]))' | \
  jq -r '"EU data accessed from US: \(.data.result[0].value[1] // "0") requests"'

curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=sum(increase(istio_requests_total{destination_service_namespace=~"us-.*",source_workload_namespace=~"eu-.*"}[30d]))' | \
  jq -r '"US data accessed from EU: \(.data.result[0].value[1] // "0") requests"'
```

Data residency enforcement is best done in layers. Use routing to direct traffic to the right region. Use authorization policies to block incorrect access. Use monitoring to verify that everything works. And use reporting to prove it to auditors. No single mechanism is foolproof, but together they create a robust data residency control.
