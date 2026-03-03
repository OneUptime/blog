# How to Set Up Multi-Environment Istio Config with GitOps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, GitOps, Multi-Environment, Kustomize, Kubernetes

Description: Manage Istio service mesh configuration across dev, staging, and production environments using GitOps with Kustomize overlays.

---

Most organizations run at least two environments: staging and production. Many have three or more: dev, staging, UAT, production, and maybe a disaster recovery environment. Each one needs Istio configuration that is mostly the same but differs in important ways: different hostnames, different resource limits, different security strictness, different traffic policies.

Managing these differences without turning your repository into an unreadable mess is the challenge. This guide shows you how to do it cleanly with Kustomize and GitOps.

## What Differs Between Environments

Before jumping into implementation, think about what actually changes between environments:

| Setting | Dev | Staging | Production |
|---------|-----|---------|------------|
| Hostnames | dev.example.com | staging.example.com | example.com |
| TLS | Self-signed | Let's Encrypt staging | Let's Encrypt prod |
| Replicas (istiod) | 1 | 1 | 2-5 (HPA) |
| Replicas (gateway) | 1 | 1 | 2-10 (HPA) |
| mTLS mode | PERMISSIVE | STRICT | STRICT |
| Access logging | Enabled | Enabled | Enabled (JSON) |
| Timeouts | Relaxed | Same as prod | Tuned |
| Outlier detection | Disabled | Enabled | Enabled (strict) |
| Auth policies | Permissive | Enforced | Enforced |

## Repository Structure

```text
istio-config/
  base/
    platform/
      gateway.yaml
      peer-authentication.yaml
      kustomization.yaml
    services/
      api-gateway/
        virtualservice.yaml
        destinationrule.yaml
        authorization-policy.yaml
        kustomization.yaml
      user-service/
        virtualservice.yaml
        destinationrule.yaml
        kustomization.yaml
      order-service/
        virtualservice.yaml
        destinationrule.yaml
        kustomization.yaml
  environments/
    dev/
      kustomization.yaml
      patches/
        gateway-hosts.yaml
        relaxed-timeouts.yaml
        permissive-mtls.yaml
    staging/
      kustomization.yaml
      patches/
        gateway-hosts.yaml
        staging-tls.yaml
    production/
      kustomization.yaml
      patches/
        gateway-hosts.yaml
        production-tls.yaml
        strict-outlier-detection.yaml
```

## Base Configuration

Write your base resources with reasonable defaults that work for most environments:

```yaml
# base/platform/gateway.yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-ingress
spec:
  selector:
    istio: ingress
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      hosts:
        - "*.example.com"
      tls:
        mode: SIMPLE
        credentialName: tls-cert
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.example.com"
      tls:
        httpsRedirect: true
```

```yaml
# base/platform/peer-authentication.yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

```yaml
# base/services/api-gateway/virtualservice.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-gateway
spec:
  hosts:
    - api.example.com
  gateways:
    - istio-ingress/main-gateway
    - mesh
  http:
    - route:
        - destination:
            host: api-gateway
            port:
              number: 8080
      timeout: 30s
      retries:
        attempts: 3
        perTryTimeout: 10s
        retryOn: 5xx,reset,connect-failure
```

```yaml
# base/services/api-gateway/destinationrule.yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api-gateway
spec:
  host: api-gateway
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

```yaml
# base/services/api-gateway/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - virtualservice.yaml
  - destinationrule.yaml
  - authorization-policy.yaml
```

## Dev Environment Overlay

Development gets relaxed settings and different hostnames:

```yaml
# environments/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: dev
resources:
  - ../../base/platform
  - ../../base/services/api-gateway
  - ../../base/services/user-service
  - ../../base/services/order-service
patches:
  - path: patches/gateway-hosts.yaml
  - path: patches/relaxed-timeouts.yaml
  - path: patches/permissive-mtls.yaml
```

```yaml
# environments/dev/patches/gateway-hosts.yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-ingress
spec:
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      hosts:
        - "*.dev.example.com"
      tls:
        mode: SIMPLE
        credentialName: dev-tls-cert
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.dev.example.com"
```

```yaml
# environments/dev/patches/relaxed-timeouts.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-gateway
spec:
  hosts:
    - api.dev.example.com
  http:
    - route:
        - destination:
            host: api-gateway
            port:
              number: 8080
      timeout: 120s
```

```yaml
# environments/dev/patches/permissive-mtls.yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
```

## Production Environment Overlay

Production gets strict settings and real hostnames:

```yaml
# environments/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: production
resources:
  - ../../base/platform
  - ../../base/services/api-gateway
  - ../../base/services/user-service
  - ../../base/services/order-service
patches:
  - path: patches/gateway-hosts.yaml
  - path: patches/production-tls.yaml
  - path: patches/strict-outlier-detection.yaml
```

```yaml
# environments/production/patches/gateway-hosts.yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-ingress
spec:
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      hosts:
        - "*.example.com"
      tls:
        mode: SIMPLE
        credentialName: production-tls-cert
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.example.com"
      tls:
        httpsRedirect: true
```

```yaml
# environments/production/patches/strict-outlier-detection.yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api-gateway
spec:
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
      http:
        http1MaxPendingRequests: 200
        http2MaxRequests: 2000
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 60s
      maxEjectionPercent: 30
```

## GitOps Application per Environment

### With Argo CD

Create one Argo CD Application per environment:

```yaml
# argocd/apps/istio-dev.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: istio-config-dev
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/istio-config.git
    targetRevision: main
    path: environments/dev
  destination:
    server: https://dev-cluster-api.example.com
    namespace: dev
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

```yaml
# argocd/apps/istio-production.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: istio-config-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/istio-config.git
    targetRevision: main
    path: environments/production
  destination:
    server: https://prod-cluster-api.example.com
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: false  # Manual sync for production
```

### With Flux CD

```yaml
# flux/istio-dev.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: istio-config-dev
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: istio-config
  path: ./environments/dev
  prune: true
```

```yaml
# flux/istio-production.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: istio-config-production
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: istio-config
  path: ./environments/production
  prune: true
```

## Validating All Environments

Your CI pipeline should validate every environment:

```bash
#!/bin/bash
for env in environments/*/; do
  env_name=$(basename "$env")
  echo "Validating ${env_name}..."

  kubectl kustomize "$env" > "/tmp/istio-${env_name}.yaml"

  # Schema validation
  kubeconform -strict -schema-location default \
    -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
    "/tmp/istio-${env_name}.yaml"

  # Istio analysis
  istioctl analyze "/tmp/istio-${env_name}.yaml"

  echo "${env_name}: OK"
done
```

## Adding a New Environment

When you need to add a new environment, the process is straightforward:

1. Create the environment directory
2. Write a kustomization.yaml that references the base
3. Add patches for environment-specific differences
4. Create the GitOps application pointing to the new path

```bash
mkdir -p environments/uat/patches
# Copy and modify from an existing environment
cp environments/staging/kustomization.yaml environments/uat/
# Adjust the patches for UAT-specific needs
```

Multi-environment Istio configuration with GitOps is fundamentally about maximizing code reuse through base resources and minimizing environment-specific patches. When most of your configuration is shared and only the differences are captured in overlays, adding environments is cheap and maintaining consistency across them is straightforward.
