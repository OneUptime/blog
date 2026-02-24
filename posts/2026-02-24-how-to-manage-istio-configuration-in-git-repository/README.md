# How to Manage Istio Configuration in Git Repository

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Git, Configuration Management, Kubernetes, DevOps

Description: Best practices for organizing and managing Istio service mesh configuration files in a Git repository for team collaboration.

---

Storing Istio configuration in Git sounds obvious, but doing it well takes some thought. The difference between a messy repository that nobody trusts and a clean one that teams actually use comes down to structure, naming conventions, and workflows. Get these right and your Git repository becomes the single source of truth for your entire service mesh.

This guide covers practical patterns for organizing Istio configuration in Git that scale from a few services to hundreds.

## Repository Strategy

The first decision is whether to use a single repository or split across multiple repositories.

**Single repo (monorepo)**: All Istio configuration lives in one repository. Simpler to manage, easier to see the full picture, and atomic commits across multiple services are straightforward.

**Multi-repo**: Each team owns their service's Istio configuration in their application repository. More autonomy for teams, but harder to enforce consistency and see the full mesh configuration.

For most organizations, a single repository for mesh-level configuration (Gateways, PeerAuthentication, mesh-wide policies) combined with service-level Istio resources in each application's repository works well.

## Repository Structure

Here is a structure that has proven effective for production environments:

```
istio-config/
  README.md
  .github/
    workflows/
      validate.yml
      promote.yml
    CODEOWNERS
  platform/
    gateways/
      main-gateway.yaml
      internal-gateway.yaml
    security/
      mesh-peer-authentication.yaml
      deny-all-default.yaml
    observability/
      telemetry.yaml
  namespaces/
    production/
      kustomization.yaml
      namespace-peer-auth.yaml
    staging/
      kustomization.yaml
      namespace-peer-auth.yaml
  services/
    api-gateway/
      base/
        virtualservice.yaml
        destinationrule.yaml
        authorization-policy.yaml
        kustomization.yaml
      overlays/
        staging/
          kustomization.yaml
        production/
          kustomization.yaml
          canary-patch.yaml
    user-service/
      base/
        virtualservice.yaml
        destinationrule.yaml
        kustomization.yaml
      overlays/
        staging/
          kustomization.yaml
        production/
          kustomization.yaml
    order-service/
      base/
        virtualservice.yaml
        destinationrule.yaml
        authorization-policy.yaml
        kustomization.yaml
      overlays/
        staging/
          kustomization.yaml
        production/
          kustomization.yaml
```

## Naming Conventions

Consistent naming makes configuration discoverable:

```yaml
# File names match resource names
# api-gateway/virtualservice.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-gateway
  namespace: production
  labels:
    app: api-gateway
    team: platform
    managed-by: gitops
```

Rules to follow:
- One resource per file (makes diffs clean)
- File name matches the resource kind (virtualservice.yaml, destinationrule.yaml)
- When a service has multiple resources of the same kind, use descriptive suffixes (virtualservice-internal.yaml, virtualservice-external.yaml)
- Use labels consistently for ownership and tooling

## Using Kustomize for Environment Variations

Kustomize overlays keep environment differences manageable:

```yaml
# services/api-gateway/base/virtualservice.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-gateway
spec:
  hosts:
    - api-gateway
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
# services/api-gateway/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - virtualservice.yaml
  - destinationrule.yaml
  - authorization-policy.yaml
```

```yaml
# services/api-gateway/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: production
patches:
  - path: canary-patch.yaml
```

```yaml
# services/api-gateway/overlays/production/canary-patch.yaml
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
```

## Branch Strategy

Use branches to represent environments:

```
main          -> staging cluster (auto-deploy)
release/prod  -> production cluster (auto-deploy after approval)
```

Or use a single branch with directory-based environment separation (simpler, and Kustomize overlays handle the differences):

```
main -> All environments, differentiated by path
  overlays/staging/    -> staging cluster
  overlays/production/ -> production cluster
```

The single-branch approach is simpler and avoids the complexity of cherry-picking changes between branches.

## CODEOWNERS File

Use CODEOWNERS to enforce review requirements:

```
# .github/CODEOWNERS

# Platform team owns all mesh-level configuration
/platform/                @your-org/platform-team

# Each service team owns their service configuration
/services/api-gateway/    @your-org/api-team
/services/user-service/   @your-org/user-team
/services/order-service/  @your-org/order-team

# Security team must review authorization policies
**/authorization-policy*  @your-org/security-team
```

## Commit Message Convention

Standardize commit messages so the history is useful:

```
[service-name] action: brief description

Examples:
[api-gateway] routing: add canary split 10% to v2
[user-service] security: restrict access to api-gateway only
[platform] gateway: add new TLS certificate for myapp.io
[mesh] config: enable access logging for all sidecars
```

## Validation on Every Commit

Add a CI job that validates all configuration on every push:

```yaml
# .github/workflows/validate.yml
name: Validate Istio Config

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install tools
        run: |
          curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.22.0 sh -
          echo "$PWD/istio-1.22.0/bin" >> $GITHUB_PATH

      - name: Build and validate staging
        run: |
          for svc in services/*/; do
            if [ -d "${svc}overlays/staging" ]; then
              echo "Validating ${svc} (staging)..."
              kubectl kustomize "${svc}overlays/staging" | \
                istioctl analyze -
            fi
          done

      - name: Build and validate production
        run: |
          for svc in services/*/; do
            if [ -d "${svc}overlays/production" ]; then
              echo "Validating ${svc} (production)..."
              kubectl kustomize "${svc}overlays/production" | \
                istioctl analyze -
            fi
          done

      - name: Check YAML syntax
        run: |
          find . -name "*.yaml" -o -name "*.yml" | \
            xargs -I {} yamllint {} || true
```

## Documenting Changes

Add annotations to resources that link back to relevant documentation or tickets:

```yaml
metadata:
  annotations:
    config.example.com/reason: "JIRA-1234: increase timeout for payment processing"
    config.example.com/changed-by: "jane.smith"
    config.example.com/reviewed-by: "john.doe"
```

These annotations live in Git history and also show up in kubectl describe, making it easy to trace why a configuration exists.

## Handling Large-Scale Changes

When you need to change a value across many services (like updating retry policies), create a script rather than editing each file by hand:

```bash
#!/bin/bash
# scripts/update-retry-policy.sh

find services/ -name "virtualservice.yaml" -exec \
  yq eval '.spec.http[0].retries.attempts = 5' -i {} \;

git add services/
git commit -m "[mesh] resilience: increase retry attempts from 3 to 5 across all services"
```

## Archiving Old Configuration

When a service is decommissioned, move its configuration to an archive directory rather than deleting it:

```bash
git mv services/legacy-service archived/legacy-service
git commit -m "[legacy-service] decommission: move to archive"
```

This preserves the history and gives you a reference if you need to bring it back.

Managing Istio configuration in Git is about establishing patterns that your team can follow consistently. The structure, naming, and workflow decisions you make early on determine whether your repository stays organized as the mesh grows. Start with a clean structure, enforce it with CODEOWNERS and CI validation, and iterate on the conventions as your needs evolve.
