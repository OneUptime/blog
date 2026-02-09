# How to use Kustomize namespace transformer for multi-namespace deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, Namespace

Description: Learn how to leverage Kustomize namespace transformer to deploy applications across multiple namespaces efficiently while maintaining clean separation of concerns.

---

Namespaces provide logical isolation in Kubernetes clusters, separating workloads by environment, team, or application. Managing namespace assignments across many resources can be tedious when done manually. Kustomize's namespace transformer automates this process, applying namespace values consistently across all resources that support them.

The namespace transformer is particularly valuable when deploying the same application to multiple namespaces or when organizing resources by environment. Instead of hardcoding namespace values in manifests, you define them in overlays, keeping your base configurations namespace-agnostic.

## Basic namespace transformation

The simplest use of the namespace field sets all resources to a specific namespace:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production

resources:
- deployment.yaml
- service.yaml
- configmap.yaml
```

When you build this kustomization, all resources that support namespaces will have their namespace field set to "production". This includes Deployments, Services, ConfigMaps, Secrets, and most other namespaced resources.

## Creating namespace-agnostic base configurations

Structure your base manifests without namespace specifications:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  # No namespace specified
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
        image: webapp:latest
        ports:
        - containerPort: 8080
```

```yaml
# base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
  # No namespace specified
spec:
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
```

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml
- service.yaml
```

These base resources work in any namespace. Overlays provide the specific namespace for each deployment target.

## Environment-specific namespace assignments

Create overlays for each environment that specify the appropriate namespace:

```yaml
# overlays/development/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: dev

bases:
- ../../base
```

```yaml
# overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: staging

bases:
- ../../base
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production

bases:
- ../../base
```

Each overlay deploys the same base resources to different namespaces. This pattern works well for maintaining consistent application definitions across environments while keeping them isolated.

## Including namespace resource definitions

For complete deployment automation, include the Namespace resource itself:

```yaml
# overlays/production/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    environment: production
    managed-by: kustomize
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production

resources:
- namespace.yaml

bases:
- ../../base
```

This ensures the namespace exists before deploying resources into it. The namespace resource itself doesn't get transformed since it defines the namespace rather than belonging to one.

## Handling cross-namespace references

Some resources reference objects in other namespaces. The namespace transformer doesn't modify these cross-namespace references:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        env:
        - name: DATABASE_HOST
          value: postgres.database.svc.cluster.local
```

The service reference "postgres.database.svc.cluster.local" explicitly specifies the "database" namespace. The namespace transformer correctly leaves this unchanged even though the Deployment gets assigned to a different namespace.

## Multi-tenant deployments

Deploy the same application stack to multiple tenant namespaces:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml
- service.yaml
- configmap.yaml
```

```yaml
# overlays/tenant-acme/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: tenant-acme

namePrefix: acme-

bases:
- ../../base
```

```yaml
# overlays/tenant-globex/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: tenant-globex

namePrefix: globex-

bases:
- ../../base
```

Each tenant gets an isolated namespace with their own instance of the application. The namePrefix prevents resource name collisions if you ever need to consolidate tenants.

## Managing namespace-scoped RBAC

Include RBAC resources that are scoped to each namespace:

```yaml
# base/rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: app-role
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-rolebinding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: app-role
subjects:
- kind: ServiceAccount
  name: app-sa
```

When the namespace transformer runs, it sets the namespace for the ServiceAccount, Role, and RoleBinding. The RoleBinding automatically references the correct ServiceAccount in the same namespace.

## Namespace transformation with Helm charts

Combine namespace transformation with Helm chart inflation:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: monitoring

helmCharts:
- name: prometheus
  repo: https://prometheus-community.github.io/helm-charts
  version: 25.8.0
  releaseName: prometheus
```

The namespace field applies to all resources generated from the Helm chart. This overrides any namespace specifications in the chart's templates, giving you centralized control.

## Regional namespace organization

Organize deployments by region using namespace transformation:

```yaml
# overlays/us-east-1/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: us-east-1

commonLabels:
  region: us-east-1

bases:
- ../../base
```

```yaml
# overlays/eu-west-1/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: eu-west-1

commonLabels:
  region: eu-west-1

bases:
- ../../base
```

Each region deploys to its own namespace with appropriate labels. This makes it easy to manage resources regionally and aggregate metrics by region.

## Handling cluster-scoped resources

Some resources like ClusterRoles and ClusterRoleBindings don't have namespaces. The namespace transformer correctly ignores these:

```yaml
# base/cluster-rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: app-cluster-role
rules:
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list"]
```

Even with a namespace set in kustomization.yaml, ClusterRole remains cluster-scoped. For ClusterRoleBindings that reference ServiceAccounts, you need to patch the namespace reference:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production

bases:
- ../../base

patches:
- target:
    kind: ClusterRoleBinding
    name: app-cluster-rolebinding
  patch: |-
    - op: replace
      path: /subjects/0/namespace
      value: production
```

This ensures the ClusterRoleBinding references the ServiceAccount in the correct namespace.

## Namespace transformation for feature branches

Create temporary namespaces for feature branch deployments:

```yaml
# overlays/feature/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: feature-auth-system

namePrefix: auth-

bases:
- ../../base

resources:
- namespace.yaml
```

```yaml
# overlays/feature/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: feature-auth-system
  labels:
    type: feature-branch
    auto-cleanup: "7days"
```

The labels help automated cleanup processes identify and remove stale feature branch namespaces after a set period.

## Testing namespace transformations

Validate namespace assignments before applying to clusters:

```bash
kustomize build overlays/production | grep 'namespace:' | sort -u
```

This shows all namespace assignments in the output. Verify that resources end up in the expected namespace and that cross-namespace references remain intact.

For more thorough validation, use tools like kubeval or kubeconform:

```bash
kustomize build overlays/production | kubeval --strict
```

This catches namespace-related errors like referencing resources that don't exist in the target namespace.

## Namespace naming conventions

Establish consistent namespace naming patterns:

```yaml
# Development environments
namespace: dev-app-team-alpha

# Staging environments
namespace: staging-app-team-alpha

# Production environments
namespace: prod-app-team-alpha

# Feature branches
namespace: feature-<branch-name>-team-alpha
```

Consistent naming makes it easier to identify resource ownership and apply organizational policies through admission controllers or resource quotas.

## Managing resource quotas per namespace

Include ResourceQuota definitions with namespace deployments:

```yaml
# overlays/production/resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-resources
spec:
  hard:
    requests.cpu: "100"
    requests.memory: 200Gi
    limits.cpu: "200"
    limits.memory: 400Gi
    persistentvolumeclaims: "50"
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production

resources:
- namespace.yaml
- resource-quota.yaml

bases:
- ../../base
```

The ResourceQuota gets created in the production namespace, enforcing limits on all resources deployed there.

## Namespace transformation in CI/CD

Automate namespace selection based on branch or environment:

```bash
#!/bin/bash
# deploy.sh

BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$BRANCH" = "main" ]; then
  OVERLAY="overlays/production"
elif [ "$BRANCH" = "develop" ]; then
  OVERLAY="overlays/staging"
else
  # Feature branch - create dynamic namespace
  OVERLAY="overlays/feature"
  NAMESPACE="feature-${BRANCH//\//-}"
  cd $OVERLAY
  kustomize edit set namespace $NAMESPACE
  cd ../..
fi

kustomize build $OVERLAY | kubectl apply -f -
```

This script automatically selects the appropriate overlay and namespace based on the Git branch, enabling branch-based deployment workflows.

## Best practices for namespace transformation

Keep base manifests namespace-agnostic. Never hardcode namespace values in base resources unless they're cross-namespace references that must remain constant.

Use descriptive namespace names that clearly indicate their purpose. Names like "production", "staging-us-east", or "team-frontend-dev" are self-documenting.

Include namespace creation in your kustomization overlays. This ensures deployments work even on fresh clusters where namespaces don't exist yet.

Document any cross-namespace dependencies. When your application references resources in other namespaces, document this in comments to help others understand the architecture.

## Conclusion

Kustomize's namespace transformer simplifies multi-namespace deployments by automating namespace assignment across resources. This feature is essential for managing applications that deploy to multiple environments, regions, or tenants while maintaining a single set of base manifests.

By keeping namespace values in overlays rather than base configurations, you create flexible, reusable resource definitions that adapt to different deployment contexts. Combined with other Kustomize features like name prefixes and labels, namespace transformation enables sophisticated multi-tenant and multi-environment deployment patterns that scale from small applications to enterprise-wide platforms.
