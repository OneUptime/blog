# How to Manage Linkerd Configuration with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Linkerd, Service Mesh

Description: Learn how to manage Linkerd service mesh configuration with ArgoCD, including traffic policies, retry budgets, timeouts, service profiles, and multi-cluster mesh management.

---

Once Linkerd is deployed with ArgoCD, the real work begins: configuring the mesh to match your application requirements. Linkerd's configuration covers traffic policies, service profiles, retry budgets, timeouts, and authorization policies. Managing all of this through ArgoCD means every mesh configuration change goes through code review and is tracked in Git.

This guide covers the day-to-day Linkerd configuration management with ArgoCD.

## Linkerd Configuration Resources

Linkerd uses several Custom Resources for configuration:

- **ServiceProfile**: Per-service routes, retries, and timeouts
- **Server**: Defines a port on a pod that accepts traffic
- **ServerAuthorization**: Controls which clients can access a Server
- **AuthorizationPolicy**: Fine-grained access control (newer API)
- **HTTPRoute**: Route-level traffic policies
- **TrafficSplit**: Traffic splitting for canary deployments

All of these are Kubernetes resources, which means ArgoCD can manage them natively.

## Managing Service Profiles

Service Profiles are the primary way to configure per-route behavior in Linkerd. They define routes, retries, and timeouts for a service.

```yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: api-service.api.svc.cluster.local
  namespace: api
spec:
  routes:
    - name: GET /api/v1/users
      condition:
        method: GET
        pathRegex: /api/v1/users
      isRetryable: true
      timeout: 5s

    - name: GET /api/v1/users/{id}
      condition:
        method: GET
        pathRegex: /api/v1/users/[^/]+
      isRetryable: true
      timeout: 3s

    - name: POST /api/v1/users
      condition:
        method: POST
        pathRegex: /api/v1/users
      # POST is not retryable by default (not idempotent)
      isRetryable: false
      timeout: 10s

    - name: DELETE /api/v1/users/{id}
      condition:
        method: DELETE
        pathRegex: /api/v1/users/[^/]+
      isRetryable: false
      timeout: 5s

  retryBudget:
    retryRatio: 0.2      # Max 20% of requests can be retries
    minRetriesPerSecond: 10
    ttl: 10s
```

## Organizing Configuration in Git

Structure your Linkerd configuration alongside your application manifests:

```text
services/
  api-service/
    base/
      deployment.yaml
      service.yaml
      kustomization.yaml
    linkerd/
      service-profile.yaml
      server.yaml
      authorization.yaml
    overlays/
      production/
        kustomization.yaml
        linkerd-overrides.yaml
      staging/
        kustomization.yaml
        linkerd-overrides.yaml
```

Deploy with an ArgoCD Application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: api-service
  namespace: argocd
spec:
  project: default
  sources:
    # Application manifests
    - repoURL: https://github.com/myorg/api-service.git
      targetRevision: main
      path: services/api-service/overlays/production
    # Linkerd configuration
    - repoURL: https://github.com/myorg/api-service.git
      targetRevision: main
      path: services/api-service/linkerd
  destination:
    server: https://kubernetes.default.svc
    namespace: api
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Authorization Policies

Linkerd's authorization policies control which services can communicate with each other. This is your mesh-level firewall.

### Default Deny Policy

Start with a default-deny policy for the namespace:

```yaml
apiVersion: policy.linkerd.io/v1beta2
kind: Server
metadata:
  name: default-deny
  namespace: api
spec:
  podSelector:
    matchLabels: {}  # Matches all pods
  port: 8080
  proxyProtocol: HTTP/2
---
# No ServerAuthorization = deny all by default
```

### Allow Specific Communication

Then explicitly allow the communications you want:

```yaml
# Allow the web frontend to call the API service
apiVersion: policy.linkerd.io/v1beta2
kind: Server
metadata:
  name: api-http
  namespace: api
spec:
  podSelector:
    matchLabels:
      app: api-service
  port: http
  proxyProtocol: HTTP/2
---
apiVersion: policy.linkerd.io/v1beta2
kind: ServerAuthorization
metadata:
  name: web-to-api
  namespace: api
spec:
  server:
    name: api-http
  client:
    meshTLS:
      serviceAccounts:
        - name: web-frontend
          namespace: web
---
# Allow the batch processor to call the API service
apiVersion: policy.linkerd.io/v1beta2
kind: ServerAuthorization
metadata:
  name: batch-to-api
  namespace: api
spec:
  server:
    name: api-http
  client:
    meshTLS:
      serviceAccounts:
        - name: batch-processor
          namespace: batch
```

### Using the Newer AuthorizationPolicy API

Linkerd's newer policy API provides more flexibility:

```yaml
apiVersion: policy.linkerd.io/v1alpha1
kind: AuthorizationPolicy
metadata:
  name: api-access-policy
  namespace: api
spec:
  targetRef:
    group: policy.linkerd.io
    kind: Server
    name: api-http
  requiredAuthenticationRefs:
    - name: mesh-tls
      kind: MeshTLSAuthentication
      group: policy.linkerd.io
---
apiVersion: policy.linkerd.io/v1alpha1
kind: MeshTLSAuthentication
metadata:
  name: mesh-tls
  namespace: api
spec:
  identityRefs:
    - kind: ServiceAccount
      name: web-frontend
      namespace: web
    - kind: ServiceAccount
      name: mobile-bff
      namespace: api
```

## Traffic Splitting for Canary Deployments

Linkerd integrates with the SMI TrafficSplit API for canary deployments:

```yaml
apiVersion: split.smi-spec.io/v1alpha2
kind: TrafficSplit
metadata:
  name: api-canary
  namespace: api
spec:
  service: api-service
  backends:
    - service: api-service-stable
      weight: 900  # 90%
    - service: api-service-canary
      weight: 100  # 10%
```

Manage canary progression through Git:

```yaml
# Step 1: Initial canary (10%)
backends:
  - service: api-service-stable
    weight: 900
  - service: api-service-canary
    weight: 100

# Step 2: Increase to 50%
backends:
  - service: api-service-stable
    weight: 500
  - service: api-service-canary
    weight: 500

# Step 3: Full rollout (100%)
backends:
  - service: api-service-stable
    weight: 0
  - service: api-service-canary
    weight: 1000
```

## HTTPRoute Configuration

Use HTTPRoute for fine-grained traffic management:

```yaml
apiVersion: policy.linkerd.io/v1beta2
kind: HTTPRoute
metadata:
  name: api-routes
  namespace: api
spec:
  parentRefs:
    - name: api-http
      kind: Server
      group: policy.linkerd.io
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api/v1/health
      # Health checks do not need authorization
      filters: []
    - matches:
        - path:
            type: PathPrefix
            value: /api/v1/
          headers:
            - name: x-request-id
              type: Exact
              value: ""
```

## Timeout and Retry Configuration

Manage timeouts globally or per-route:

```yaml
# Global timeout annotation on the service
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: api
  annotations:
    # Default timeout for all routes
    timeout.linkerd.io/request: "10s"
    # Default retry annotation
    retry.linkerd.io/http: "5xx"
    retry.linkerd.io/limit: "2"
spec:
  ports:
    - port: 8080
  selector:
    app: api-service
```

For per-route configuration, use ServiceProfiles as shown earlier.

## Managing Configuration Across Environments

Use Kustomize overlays for environment-specific Linkerd configuration:

```yaml
# base/service-profile.yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: api-service.api.svc.cluster.local
  namespace: api
spec:
  routes:
    - name: GET /api/v1/users
      condition:
        method: GET
        pathRegex: /api/v1/users
      isRetryable: true
      timeout: 5s
  retryBudget:
    retryRatio: 0.2
    minRetriesPerSecond: 10
    ttl: 10s
```

```yaml
# overlays/production/service-profile-patch.yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: api-service.api.svc.cluster.local
  namespace: api
spec:
  routes:
    - name: GET /api/v1/users
      condition:
        method: GET
        pathRegex: /api/v1/users
      isRetryable: true
      timeout: 3s  # Tighter timeout in production
  retryBudget:
    retryRatio: 0.1  # Smaller retry budget in production
    minRetriesPerSecond: 5
    ttl: 10s
```

## Monitoring Linkerd Configuration

Use Linkerd's built-in metrics to verify your configuration is working:

```bash
# Check route-level metrics
linkerd viz routes deploy/api-service -n api

# Check authorization metrics
linkerd viz authz deploy/api-service -n api

# Check traffic splits
linkerd viz stat ts/api-canary -n api
```

Create PrometheusRules for Linkerd-specific alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: linkerd-alerts
  namespace: monitoring
spec:
  groups:
    - name: linkerd.rules
      rules:
        - alert: LinkerdHighRetryRate
          expr: |
            sum(rate(response_total{classification="retry"}[5m])) by (deployment)
            / sum(rate(response_total[5m])) by (deployment) > 0.1
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High retry rate for {{ $labels.deployment }}"
        - alert: LinkerdHighLatency
          expr: |
            histogram_quantile(0.99,
              sum(rate(response_latency_ms_bucket[5m])) by (le, deployment)
            ) > 5000
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "P99 latency above 5s for {{ $labels.deployment }}"
        - alert: LinkerdAuthorizationDenied
          expr: |
            sum(rate(inbound_http_authz_deny_total[5m])) by (deployment) > 0
          for: 5m
          labels:
            severity: info
          annotations:
            summary: "Authorization denials detected for {{ $labels.deployment }}"
```

## Handling ArgoCD Sync Issues

Linkerd's proxy injector modifies pods, which can cause ArgoCD to report drift. Configure ignore rules:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.ignoreDifferences.apps_Deployment: |
    jqPathExpressions:
      - .spec.template.metadata.annotations["linkerd.io/proxy-version"]
      - .spec.template.metadata.annotations["linkerd.io/trust-root-sha256"]
      - .spec.template.spec.initContainers
      - '.spec.template.spec.containers[] | select(.name == "linkerd-proxy")'
```

## Summary

Managing Linkerd configuration with ArgoCD gives you auditable, reviewable mesh policies. Service Profiles control per-route behavior, authorization policies enforce communication rules, and traffic splits enable canary deployments. Store all mesh configuration alongside application manifests in Git, use Kustomize overlays for environment differences, and monitor policy effectiveness with Linkerd's metrics. For deploying Linkerd itself, see our guide on [deploying Linkerd with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-how-to-deploy-linkerd-with-argocd/view).
