# How to Deploy API Gateway Configurations with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, API Gateway, Networking

Description: Learn how to deploy and manage API gateway configurations like Kong, Ambassador, and APISIX using ArgoCD for consistent, GitOps-driven API management.

---

API gateways sit at the edge of your cluster, handling authentication, rate limiting, request transformation, and routing for your APIs. Their configuration tends to be complex and security-sensitive, making them perfect candidates for GitOps management through ArgoCD. Every change to rate limits, authentication policies, or routing rules goes through Git review before being applied.

This guide covers deploying and managing API gateway configurations with ArgoCD, with practical examples for Kong, Ambassador (Emissary-Ingress), and APISIX.

## Why GitOps for API Gateways

API gateway configuration changes carry significant risk:

- A bad rate limit can lock out all users
- A routing misconfiguration can expose internal services
- Authentication policy errors can create security vulnerabilities

With ArgoCD managing your API gateway config:
- Every change is traceable to a Git commit
- Changes require PR review before deployment
- Drift detection catches manual changes
- Rollback is a simple Git revert

## Deploying Kong with ArgoCD

### Kong Installation

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kong-gateway
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  project: infrastructure
  source:
    repoURL: https://charts.konghq.com
    chart: kong
    targetRevision: 2.38.0
    helm:
      releaseName: kong
      valuesObject:
        ingressController:
          installCRDs: false
          env:
            kong_admin_api_uri: "http://kong-admin:8001"
        proxy:
          type: LoadBalancer
          annotations:
            service.beta.kubernetes.io/aws-load-balancer-type: nlb
        admin:
          enabled: true
          type: ClusterIP
        env:
          database: "off"
          declarative_config: /opt/kong/config.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: kong
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

### Kong Configuration CRDs

Manage Kong plugins and routes as Kubernetes CRDs:

```yaml
# Rate limiting plugin
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limit-api
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  plugin: rate-limiting
  config:
    minute: 100
    hour: 5000
    policy: redis
    redis_host: redis.kong
    redis_port: 6379

---
# JWT authentication plugin
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: jwt-auth
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  plugin: jwt
  config:
    key_claim_name: kid
    claims_to_verify:
      - exp

---
# CORS plugin
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: cors-policy
  namespace: production
spec:
  plugin: cors
  config:
    origins:
      - "https://app.example.com"
      - "https://admin.example.com"
    methods:
      - GET
      - POST
      - PUT
      - DELETE
    headers:
      - Authorization
      - Content-Type
    max_age: 3600

---
# Ingress with Kong annotations
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: product-api
  namespace: production
  annotations:
    konghq.com/plugins: rate-limit-api, jwt-auth, cors-policy
    konghq.com/strip-path: "true"
spec:
  ingressClassName: kong
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /v1/products
            pathType: Prefix
            backend:
              service:
                name: product-service
                port:
                  number: 8080
```

## Deploying Ambassador (Emissary-Ingress) with ArgoCD

### Emissary Installation

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: emissary-ingress
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://app.getambassador.io
    chart: emissary-ingress
    targetRevision: 8.9.0
    helm:
      releaseName: emissary
      valuesObject:
        replicaCount: 3
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
  destination:
    server: https://kubernetes.default.svc
    namespace: emissary
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

### Ambassador Mappings

```yaml
# API route mapping
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: product-api
  namespace: production
spec:
  hostname: api.example.com
  prefix: /v1/products/
  service: product-service.production:8080
  timeout_ms: 10000
  retry_policy:
    retry_on: "5xx"
    num_retries: 3

---
# Rate limit configuration
apiVersion: getambassador.io/v3alpha1
kind: RateLimit
metadata:
  name: api-rate-limit
  namespace: production
spec:
  domain: ambassador
  limits:
    - pattern:
        - generic_key: "default"
      rate: 100
      unit: minute

---
# Authentication filter
apiVersion: getambassador.io/v3alpha1
kind: FilterPolicy
metadata:
  name: auth-policy
  namespace: production
spec:
  rules:
    - host: api.example.com
      path: /v1/*
      filters:
        - name: jwt-filter
          namespace: emissary
          arguments:
            scope:
              - "api:read"
              - "api:write"
```

## Deploying APISIX with ArgoCD

### APISIX Installation

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: apisix
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://charts.apiseven.com
    chart: apisix
    targetRevision: 2.6.0
    helm:
      releaseName: apisix
      valuesObject:
        gateway:
          type: LoadBalancer
        ingress-controller:
          enabled: true
        dashboard:
          enabled: false  # Manage through Git, not UI
  destination:
    server: https://kubernetes.default.svc
    namespace: apisix
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

### APISIX Routes

```yaml
apiVersion: apisix.apache.org/v2
kind: ApisixRoute
metadata:
  name: product-api
  namespace: production
spec:
  http:
    - name: product-route
      match:
        hosts:
          - api.example.com
        paths:
          - /v1/products/*
      backends:
        - serviceName: product-service
          servicePort: 8080
      plugins:
        - name: limit-req
          enable: true
          config:
            rate: 100
            burst: 50
            key: remote_addr
        - name: jwt-auth
          enable: true
        - name: proxy-rewrite
          enable: true
          config:
            regex_uri:
              - "^/v1/products/(.*)"
              - "/$1"
```

## Repository Structure for Multi-Gateway Setup

```
api-gateway-config/
  base/
    kustomization.yaml
    kong/
      plugins/
        rate-limiting.yaml
        jwt-auth.yaml
        cors.yaml
      ingress/
        product-api.yaml
        order-api.yaml
    shared/
      tls-certificates.yaml
  overlays/
    staging/
      kustomization.yaml
      patches/
        relaxed-rate-limits.yaml
    production/
      kustomization.yaml
      patches/
        strict-rate-limits.yaml
```

## Custom Health Checks

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Kong plugin health
  resource.customizations.health.configuration.konghq.com_KongPlugin: |
    hs = {}
    if obj.spec ~= nil and obj.spec.plugin ~= nil then
      hs.status = "Healthy"
      hs.message = "Plugin: " .. obj.spec.plugin
    else
      hs.status = "Degraded"
      hs.message = "Plugin not configured"
    end
    return hs

  # Ambassador Mapping health
  resource.customizations.health.getambassador.io_Mapping: |
    hs = {}
    if obj.spec ~= nil and obj.spec.service ~= nil then
      hs.status = "Healthy"
      hs.message = "Routing to " .. obj.spec.service
    else
      hs.status = "Degraded"
      hs.message = "No service configured"
    end
    return hs
```

## Validation with Pre-Sync Hooks

Validate API gateway configurations before applying:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: validate-gateway-config
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: validate
          image: alpine:3.19
          command:
            - sh
            - -c
            - |
              # Validate rate limit values are reasonable
              # Validate hostnames match expected patterns
              # Check for conflicting routes
              echo "Validation passed"
      restartPolicy: Never
  backoffLimit: 0
```

## Summary

Deploying API gateway configurations with ArgoCD brings GitOps discipline to one of the most security-sensitive parts of your infrastructure. Whether you use Kong, Ambassador, or APISIX, the pattern is the same: install the gateway through ArgoCD, manage its configuration CRDs in Git, use Kustomize overlays for environment differences, and add custom health checks so ArgoCD accurately reports resource status. This approach ensures every API routing change, rate limit adjustment, and authentication policy update is reviewed, auditable, and reversible.
