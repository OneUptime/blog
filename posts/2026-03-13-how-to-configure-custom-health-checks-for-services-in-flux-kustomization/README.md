# How to Configure Custom Health Checks for Services in Flux Kustomization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, Health Check, Service, Kustomization

Description: Learn how to configure custom health checks for Service resources in Flux Kustomization to verify network endpoints are properly established.

---

## Introduction

Kubernetes Services provide stable network endpoints for accessing pods. While Services themselves are relatively simple resources, their health can be critical for application connectivity. A Service that exists but has no endpoints, or a LoadBalancer Service stuck in a pending state, can cause cascading failures. Flux Kustomization health checks let you include Services in readiness assessment before dependent resources deploy, but the built-in Service check does not verify backing endpoints or external load balancer reachability.

## Prerequisites

- A Kubernetes cluster running version 1.25 or later
- Flux v2.3 or later installed on the cluster
- kubectl configured to access the cluster
- A Git repository connected to Flux via a GitRepository source
- Understanding of Kubernetes Service types (ClusterIP, NodePort, LoadBalancer)

## How Flux Checks Service Health

Flux evaluates Service health with its built-in kstatus-compatible Service check. For ClusterIP and NodePort Services, the check passes once the resource is accepted by the API server. For LoadBalancer Services, the built-in check verifies that the Service has a cluster IP, but it does not wait for the cloud provider to populate an external IP or hostname in `status.loadBalancer.ingress`.

## Basic Service Health Check

Set up a health check that includes a LoadBalancer Service:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: ingress-controller
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/ingress-nginx
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 10m
  healthChecks:
    - apiVersion: v1
      kind: Service
      name: ingress-nginx-controller
      namespace: ingress-nginx
```

For a LoadBalancer Service, this built-in check does not wait until the `status.loadBalancer.ingress` field is populated with an IP address or hostname. Check that field separately when external load balancer provisioning is part of your rollout criteria.

## Health Checking Multiple Services

When deploying a set of Services together, check them all:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: platform-services
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/platform
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 10m
  healthChecks:
    - apiVersion: v1
      kind: Service
      name: nginx-ingress
      namespace: ingress-system
    - apiVersion: v1
      kind: Service
      name: external-dns
      namespace: dns-system
    - apiVersion: v1
      kind: Service
      name: cert-manager-webhook
      namespace: cert-manager
```

## LoadBalancer Service with Cloud Provider

When deploying a LoadBalancer Service on a cloud provider, the provisioning can take several minutes:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: production
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
    service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
spec:
  type: LoadBalancer
  selector:
    app: api-gateway
  ports:
    - port: 443
      targetPort: 8443
      protocol: TCP
```

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: api-gateway
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/api-gateway
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 10m
  healthChecks:
    - apiVersion: v1
      kind: Service
      name: api-gateway
      namespace: production
    - apiVersion: apps/v1
      kind: Deployment
      name: api-gateway
      namespace: production
```

Set the timeout high enough to accommodate the workloads included in the health checks. If you also need to gate on the AWS NLB external address, verify `status.loadBalancer.ingress` separately because the built-in Service health check does not wait for it.

## Services as Dependencies for Applications

Use Service health checks with Kustomization dependencies to ensure the Service object and backing workload readiness checks pass first:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: ingress-controller
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/ingress
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 10m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: ingress-nginx-controller
      namespace: ingress-nginx
    - apiVersion: v1
      kind: Service
      name: ingress-nginx-controller
      namespace: ingress-nginx
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: web-apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/web
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: ingress-controller
  wait: true
  timeout: 5m
```

The web applications only deploy after the ingress controller Deployment is healthy and the LoadBalancer Service passes Flux's built-in Service readiness check. This does not prove that the cloud load balancer has an external address yet.

## Checking ClusterIP Services with Deployments

For ClusterIP Services, the Service resource itself is healthy immediately. The real health concern is whether the backing pods exist. Combine Service and Deployment health checks:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: backend-services
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/backend
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 5m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: auth-service
      namespace: production
    - apiVersion: v1
      kind: Service
      name: auth-service
      namespace: production
    - apiVersion: apps/v1
      kind: Deployment
      name: user-service
      namespace: production
    - apiVersion: v1
      kind: Service
      name: user-service
      namespace: production
```

## Using wait: true for Comprehensive Checks

When you want to check all resources including Services:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: full-stack
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/full-stack
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 10m
```

With `wait: true`, Flux performs health checks for all reconciled resources. Built-in resources such as Services, Deployments, and ConfigMaps use Flux's built-in health semantics, while custom resources need kstatus-compatible status or explicit health check expressions.

## Headless Services

Headless Services (with `clusterIP: None`) are used with StatefulSets. Flux treats them like other non-LoadBalancer Services and considers them healthy once accepted by the API server:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-headless
  namespace: database
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
```

For headless Services backing a StatefulSet, health check the StatefulSet rather than the Service:

```yaml
healthChecks:
  - apiVersion: apps/v1
    kind: StatefulSet
    name: postgres
    namespace: database
```

## Debugging Service Health Check Failures

When a Service health check fails, or when Service connectivity does not work:

```bash
# Check Kustomization status

flux get kustomization platform-services

# Check Service status
kubectl get service api-gateway -n production

# For LoadBalancer Services, check for pending state
kubectl describe service api-gateway -n production

# Check EndpointSlices for backing endpoints
kubectl get endpointslice -n production -l kubernetes.io/service-name=api-gateway

# Check events for provisioning issues
kubectl get events -n production --field-selector involvedObject.name=api-gateway
```

Common Service and connectivity failure causes to investigate:

- LoadBalancer quota exceeded on the cloud provider
- Cloud provider integration not configured (no cloud controller manager)
- Service annotation errors preventing load balancer provisioning
- Network policy blocking traffic to the selected pods
- No pods matching the Service selector (empty EndpointSlices)

## Conclusion

Health checks that include Services in Flux Kustomization are most useful when paired with Deployment or StatefulSet checks so dependent resources wait for both the Service object and the backing workload readiness signals. For ClusterIP Services, combine the Service health check with the backing Deployment or StatefulSet check to get a more complete picture of service readiness. For LoadBalancer Services, check external address provisioning separately if dependent applications require the cloud load balancer to be reachable before they deploy.
