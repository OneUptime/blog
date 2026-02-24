# How to Handle Environment-Specific Istio Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Configuration, Environments, Kubernetes, GitOps

Description: Strategies for managing Istio configuration differences across development, staging, and production environments without duplicating YAML.

---

Every environment is a little different. Production needs stricter security policies, higher connection limits, and canary deployments. Staging needs shorter timeouts so tests run faster. Development might not need authorization policies at all. Handling these differences without maintaining completely separate copies of your Istio YAML is one of those problems that every team has to solve.

The worst approach is copy-pasting your entire Istio config for each environment and editing values. It works initially but drifts fast. Within a month, production has settings that staging does not, and nobody remembers if that was intentional.

Here are approaches that actually work at scale.

## Identifying What Varies Between Environments

Start by cataloging the differences. In most setups, the following vary by environment:

| Setting | Dev | Staging | Production |
|---------|-----|---------|------------|
| Namespace | dev | staging | production |
| mTLS mode | PERMISSIVE | STRICT | STRICT |
| Timeouts | 5s | 10s | 30s |
| Retries | 1 | 2 | 3 |
| Connection pool size | 10 | 50 | 500 |
| Canary routing | No | No | Yes |
| Authorization policies | Permissive | Strict | Strict |
| Trace sampling | 100% | 10% | 1% |
| Access logging | Full | Full | Errors only |

Everything else should be identical.

## Approach 1: Kustomize Overlays

Kustomize is the simplest approach when differences are small:

```yaml
# base/virtual-service.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-service
spec:
  hosts:
    - api-service
  http:
    - route:
        - destination:
            host: api-service
            port:
              number: 8080
      timeout: 10s
      retries:
        attempts: 2
        perTryTimeout: 5s
        retryOn: 5xx,connect-failure
```

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - virtual-service.yaml
  - destination-rule.yaml
  - authorization-policy.yaml
  - telemetry.yaml
```

Production overlay with patches:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
  - canary-routing.yaml
namespace: production
patches:
  - target:
      group: networking.istio.io
      version: v1
      kind: VirtualService
      name: api-service
    patch: |
      - op: replace
        path: /spec/http/0/timeout
        value: 30s
      - op: replace
        path: /spec/http/0/retries/attempts
        value: 3
      - op: replace
        path: /spec/http/0/retries/perTryTimeout
        value: 10s
```

Dev overlay with relaxed settings:

```yaml
# overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: dev
patches:
  - target:
      group: networking.istio.io
      version: v1
      kind: VirtualService
      name: api-service
    patch: |
      - op: replace
        path: /spec/http/0/timeout
        value: 5s
      - op: replace
        path: /spec/http/0/retries/attempts
        value: 1
  - target:
      group: security.istio.io
      version: v1
      kind: AuthorizationPolicy
      name: api-service
    patch: |
      - op: replace
        path: /spec/action
        value: ALLOW
      - op: replace
        path: /spec/rules
        value:
          - from:
              - source:
                  namespaces:
                    - dev
```

## Approach 2: Helm Values Files

When differences are more complex, Helm gives you more flexibility:

```yaml
# values-dev.yaml
environment: dev
mtls:
  mode: PERMISSIVE
telemetry:
  traceSampling: 100
  accessLogging:
    filter: ""
services:
  apiService:
    timeout: 5s
    retries: 1
    connectionPoolSize: 10
    canary:
      enabled: false
    authz:
      enabled: false
```

```yaml
# values-production.yaml
environment: production
mtls:
  mode: STRICT
telemetry:
  traceSampling: 1
  accessLogging:
    filter: "response.code >= 400"
services:
  apiService:
    timeout: 30s
    retries: 3
    connectionPoolSize: 500
    canary:
      enabled: true
      weight: 5
    authz:
      enabled: true
      principals:
        - "cluster.local/ns/production/sa/web-frontend"
        - "cluster.local/ns/production/sa/mobile-bff"
```

Deploy per environment:

```bash
helm upgrade --install istio-config ./chart \
  -f values-production.yaml \
  -n production
```

## Approach 3: Argo CD ApplicationSets

For GitOps workflows with Argo CD, use ApplicationSets to generate per-environment applications:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: istio-config
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - env: dev
            namespace: dev
            cluster: https://kubernetes.default.svc
          - env: staging
            namespace: staging
            cluster: https://kubernetes.default.svc
          - env: production
            namespace: production
            cluster: https://kubernetes.default.svc
  template:
    metadata:
      name: istio-config-{{env}}
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/istio-config.git
        targetRevision: main
        path: overlays/{{env}}
      destination:
        server: "{{cluster}}"
        namespace: "{{namespace}}"
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

## Environment-Specific Telemetry

Telemetry settings often vary the most between environments:

```yaml
# overlays/dev/telemetry.yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-telemetry
spec:
  tracing:
    - randomSamplingPercentage: 100
  accessLogging:
    - providers:
        - name: envoy
```

```yaml
# overlays/production/telemetry.yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-telemetry
spec:
  tracing:
    - randomSamplingPercentage: 1.0
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
            mode: CLIENT
          disabled: true
        - match:
            metric: REQUEST_DURATION
            mode: CLIENT
          disabled: true
```

## Environment-Specific PeerAuthentication

mTLS strictness often differs by environment:

```yaml
# overlays/dev/peer-authentication.yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
spec:
  mtls:
    mode: PERMISSIVE
```

```yaml
# overlays/production/peer-authentication.yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
spec:
  mtls:
    mode: STRICT
```

## Validating Configuration Parity

Write a script that compares environments and flags unexpected differences:

```bash
#!/bin/bash
# Compare Istio resources between staging and production

STAGING=$(kubectl kustomize overlays/staging/ 2>/dev/null || helm template istio-config ./chart -f values-staging.yaml)
PRODUCTION=$(kubectl kustomize overlays/production/ 2>/dev/null || helm template istio-config ./chart -f values-production.yaml)

echo "=== Resources only in staging ==="
diff <(echo "$STAGING" | grep "^kind:" | sort) \
     <(echo "$PRODUCTION" | grep "^kind:" | sort) | grep "^<"

echo "=== Resources only in production ==="
diff <(echo "$STAGING" | grep "^kind:" | sort) \
     <(echo "$PRODUCTION" | grep "^kind:" | sort) | grep "^>"

echo "=== Structural differences ==="
diff <(echo "$STAGING" | grep -E "^(kind|  name):" | sort) \
     <(echo "$PRODUCTION" | grep -E "^(kind|  name):" | sort)
```

## Promoting Changes Across Environments

Follow a promotion workflow:

```bash
# 1. Make change in dev overlay
# 2. Test in dev
kubectl apply -k overlays/dev/

# 3. Promote to staging (copy/adapt the change)
# 4. Test in staging
kubectl apply -k overlays/staging/

# 5. Promote to production (usually via PR review)
kubectl apply -k overlays/production/
```

With Argo CD, promotion can be as simple as moving a change from one overlay to the next via a PR.

## Common Mistakes to Avoid

1. Do not use different resource names across environments. The name should be the same; only the namespace and configuration values should differ.

2. Do not skip environments. If a change goes directly from dev to production, you are asking for trouble.

3. Do not store secrets in values files. Use external secret management and reference them by name.

4. Do not have environment-specific resources that are missing from the base. Every environment should have the same set of resources, even if some are configured differently.

The right approach depends on the scale of differences and your existing tooling. For most teams, Kustomize with overlays is the sweet spot. It is simple, built into kubectl, and makes environment differences visible and reviewable in pull requests.
