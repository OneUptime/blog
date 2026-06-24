# How to Configure Custom Health Checks for Ingresses in Flux Kustomization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, Health Check, Ingresses, Kustomization

Description: Learn how to configure custom health checks for Ingress resources in Flux Kustomization to verify routing rules and TLS are properly established.

---

## Introduction

Kubernetes Ingress resources define how external traffic reaches your services. An Ingress that is created but not yet reconciled by the ingress controller can leave your application inaccessible. Flux Kustomization custom health checks let you verify that Ingress resources are assigned an address before marking a deployment as complete.

## Prerequisites

- A Kubernetes cluster running version 1.25 or later
- Flux v2.3 or later installed on the cluster
- An ingress controller (such as NGINX Ingress Controller) deployed
- kubectl configured to access the cluster
- A Git repository connected to Flux via a GitRepository source

## How Flux Checks Ingress Health

Ingress is not one of the built-in Kubernetes kinds that Flux health checks handle by default. To health check an Ingress, define a `healthChecks` entry for the resource and add a custom CEL expression in `healthCheckExprs`.

The expression can check the `status.loadBalancer.ingress` field of the Ingress resource. Once the ingress controller processes the Ingress and populates this field with an IP address or hostname, Flux marks it as healthy.

If no address is assigned within the timeout period, the health check fails.

## Basic Ingress Health Check

Configure a health check for an Ingress resource:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: web-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/web
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 5m
  healthChecks:
    - apiVersion: networking.k8s.io/v1
      kind: Ingress
      name: web-app
      namespace: production
  healthCheckExprs:
    - apiVersion: networking.k8s.io/v1
      kind: Ingress
      current: >-
        has(status.loadBalancer.ingress) &&
        status.loadBalancer.ingress.exists(address, has(address.ip) || has(address.hostname))
```

The corresponding Ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: web-app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-app
                port:
                  number: 80
```

## Health Checking Multiple Ingresses

When your application exposes multiple domains or paths through different Ingress resources:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: web-platform
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/platform
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 10m
  healthChecks:
    - apiVersion: networking.k8s.io/v1
      kind: Ingress
      name: frontend
      namespace: production
    - apiVersion: networking.k8s.io/v1
      kind: Ingress
      name: api
      namespace: production
    - apiVersion: networking.k8s.io/v1
      kind: Ingress
      name: admin-panel
      namespace: production
    - apiVersion: apps/v1
      kind: Deployment
      name: frontend
      namespace: production
    - apiVersion: apps/v1
      kind: Deployment
      name: api
      namespace: production
  healthCheckExprs:
    - apiVersion: networking.k8s.io/v1
      kind: Ingress
      current: >-
        has(status.loadBalancer.ingress) &&
        status.loadBalancer.ingress.exists(address, has(address.ip) || has(address.hostname))
```

Combine Ingress health checks with Deployment health checks to ensure both the backend pods and the routing rules are ready.

## Ingress with TLS Certificate Provisioning

When using cert-manager to provision TLS certificates, the Ingress address and the TLS certificate are separate readiness signals. The Ingress health check below waits for the ingress controller to assign an address; if you also need to wait for certificate issuance, add a health check for the cert-manager `Certificate` resource.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: secure-app
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - secure.example.com
      secretName: secure-app-tls
  rules:
    - host: secure.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: secure-app
                port:
                  number: 443
```

Set a longer timeout to account for certificate issuance:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: secure-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/secure-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 10m
  healthChecks:
    - apiVersion: networking.k8s.io/v1
      kind: Ingress
      name: secure-app
      namespace: production
    - apiVersion: cert-manager.io/v1
      kind: Certificate
      name: secure-app-tls
      namespace: production
  healthCheckExprs:
    - apiVersion: networking.k8s.io/v1
      kind: Ingress
      current: >-
        has(status.loadBalancer.ingress) &&
        status.loadBalancer.ingress.exists(address, has(address.ip) || has(address.hostname))
    - apiVersion: cert-manager.io/v1
      kind: Certificate
      failed: status.conditions.filter(condition, condition.type == 'Ready').all(condition, condition.status == 'False')
      current: status.conditions.filter(condition, condition.type == 'Ready').all(condition, condition.status == 'True')
```

Certificate issuance through ACME (Let's Encrypt) commonly takes a few minutes, so a 10-minute timeout provides a practical buffer.

## Ordering Ingress Controller Before Ingresses

Ensure the ingress controller is deployed and healthy before creating Ingress resources:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/ingress-nginx
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 10m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/cert-manager
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
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
    - name: ingress-nginx
    - name: cert-manager
  timeout: 10m
  healthChecks:
    - apiVersion: networking.k8s.io/v1
      kind: Ingress
      name: web-app
      namespace: production
    - apiVersion: apps/v1
      kind: Deployment
      name: web-app
      namespace: production
  healthCheckExprs:
    - apiVersion: networking.k8s.io/v1
      kind: Ingress
      current: >-
        has(status.loadBalancer.ingress) &&
        status.loadBalancer.ingress.exists(address, has(address.ip) || has(address.hostname))
```

This dependency chain ensures: ingress controller is running, cert-manager is ready, and then the application with its Ingress is deployed and health-checked.

## Multiple Hosts in a Single Ingress

When a single Ingress handles multiple hosts, the health check covers the entire resource:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-host
  namespace: production
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
        - api.example.com
        - admin.example.com
      secretName: wildcard-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 80
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api
                port:
                  number: 80
    - host: admin.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: admin
                port:
                  number: 80
```

```yaml
healthChecks:
  - apiVersion: networking.k8s.io/v1
    kind: Ingress
    name: multi-host
    namespace: production
healthCheckExprs:
  - apiVersion: networking.k8s.io/v1
    kind: Ingress
    current: >-
      has(status.loadBalancer.ingress) &&
      status.loadBalancer.ingress.exists(address, has(address.ip) || has(address.hostname))
```

A single health check entry covers all hosts defined in the Ingress.

## Debugging Ingress Health Check Failures

When an Ingress health check fails:

```bash
# Check Kustomization status

flux get kustomization web-app

# Check Ingress status
kubectl get ingress web-app -n production

# Check if address is assigned
kubectl get ingress web-app -n production -o jsonpath='{.status.loadBalancer.ingress}'

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller --tail=50

# Check cert-manager for TLS issues
kubectl get certificate -n production
kubectl describe certificate web-app-tls -n production

# Check events
kubectl get events -n production --field-selector involvedObject.name=web-app
```

Common Ingress health check failure causes:

- Ingress controller not running or not watching the correct IngressClass
- IngressClass mismatch between the Ingress and the controller
- TLS certificate issuance failure (DNS challenge not configured, rate limits)
- Backend Service does not exist
- Invalid annotations causing the ingress controller to reject the resource

## Conclusion

Custom health checks for Ingress resources in Flux Kustomization ensure that your Ingress is assigned an address before the deployment is considered complete. This is particularly useful when applications depend on external access being available. By combining Ingress health checks with dependency chains that include the ingress controller and cert-manager, you build a deployment pipeline that waits for the main Kubernetes readiness signals before continuing.
