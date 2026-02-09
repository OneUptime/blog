# How to use Kustomize namePrefix and nameSuffix for resource naming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, Configuration

Description: Master Kustomize namePrefix and nameSuffix transformers to systematically modify resource names for multi-tenant deployments and environment isolation.

---

Kustomize namePrefix and nameSuffix transformers automatically modify resource names and all references to those resources. This enables deploying multiple instances of the same application in a cluster without name conflicts. These transformers are essential for multi-tenant architectures and environment separation.

## Understanding name transformers

When you apply namePrefix or nameSuffix, Kustomize changes resource names and updates all cross-resource references automatically. This includes Service selectors, ConfigMap references, Secret references, and role bindings. The transformer understands Kubernetes resource relationships and maintains referential integrity.

This automation eliminates manual find-and-replace operations and reduces configuration errors when deploying multiple application instances.

## Basic namePrefix usage

Add a prefix to all resource names:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: app
        image: myapp:latest
---
# base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app
spec:
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
```

Apply namePrefix:

```yaml
# overlays/team-a/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base

namePrefix: team-a-
```

Results in resources named `team-a-web-app` for both Deployment and Service.

## Basic nameSuffix usage

Add a suffix to resource names:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base

nameSuffix: -prod
```

Creates `web-app-prod` resources, useful for environment identification.

## Combining prefix and suffix

Use both transformers together:

```yaml
# overlays/team-a-prod/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base

namePrefix: team-a-
nameSuffix: -prod
```

Results in `team-a-web-app-prod` resources.

## Multi-tenant deployments

Deploy multiple tenant instances:

```yaml
# overlays/tenant1/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: tenant1

resources:
- ../../base

namePrefix: tenant1-

configMapGenerator:
- name: app-config
  literals:
  - tenant_id=tenant1
  - database=tenant1_db
---
# overlays/tenant2/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: tenant2

resources:
- ../../base

namePrefix: tenant2-

configMapGenerator:
- name: app-config
  literals:
  - tenant_id=tenant2
  - database=tenant2_db
```

Each tenant gets isolated resources in their own namespace.

## Feature branch deployments

Create per-branch environments:

```yaml
# overlays/feature-auth/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base

namePrefix: auth-feature-
nameSuffix: -dev

replicas:
- name: web-app
  count: 1

images:
- name: myapp
  newTag: feature-auth
```

Results in `auth-feature-web-app-dev` for isolated testing.

## Automatic reference updates

Kustomize updates all references:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      containers:
      - name: app
        envFrom:
        - configMapRef:
            name: app-config  # Automatically becomes team-a-app-config
        - secretRef:
            name: app-secrets  # Automatically becomes team-a-app-secrets
---
# base/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        backend:
          service:
            name: web-app  # Automatically becomes team-a-web-app
            port:
              number: 80
```

All references update automatically when you apply namePrefix.

## Role binding updates

Service account references update correctly:

```yaml
# base/serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa
---
# base/rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-binding
subjects:
- kind: ServiceAccount
  name: app-sa  # Updates to team-a-app-sa
roleRef:
  kind: Role
  name: app-role
  apiGroup: rbac.authorization.k8s.io
---
# base/deployment.yaml
spec:
  template:
    spec:
      serviceAccountName: app-sa  # Updates to team-a-app-sa
```

## ConfigMap and Secret generators

Generators work with name transformers:

```yaml
# overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base

namePrefix: dev-

configMapGenerator:
- name: app-config
  literals:
  - environment=development

secretGenerator:
- name: app-secrets
  literals:
  - api_key=dev-key
```

Generated ConfigMaps become `dev-app-config-<hash>`.

## StatefulSet considerations

StatefulSets need special attention:

```yaml
# base/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  serviceName: database  # This reference updates
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
---
# base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: database
spec:
  clusterIP: None
  selector:
    app: database
  ports:
  - port: 5432
```

Apply namePrefix:

```yaml
namePrefix: team-a-
```

Results in `team-a-database` StatefulSet and Service with proper references.

## PersistentVolumeClaim updates

PVC references update automatically:

```yaml
# base/deployment.yaml
spec:
  template:
    spec:
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: app-data  # Becomes team-a-app-data
---
# base/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

## Environment-based naming

Different names per environment:

```yaml
# overlays/development/kustomization.yaml
namePrefix: dev-
nameSuffix: -v1

# overlays/staging/kustomization.yaml
namePrefix: staging-
nameSuffix: -v1

# overlays/production/kustomization.yaml
namePrefix: prod-
nameSuffix: -v2
```

## Blue-green deployments

Create separate resource sets:

```yaml
# overlays/blue/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base

nameSuffix: -blue

images:
- name: myapp
  newTag: v1.0.0
---
# overlays/green/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base

nameSuffix: -green

images:
- name: myapp
  newTag: v2.0.0
```

Deploy both versions simultaneously and switch traffic between them.

## Canary deployments

Deploy canary versions alongside stable:

```yaml
# overlays/canary/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base

nameSuffix: -canary

replicas:
- name: web-app
  count: 1

images:
- name: myapp
  newTag: v2.1.0-rc1

labels:
- pairs:
    version: canary
```

## Testing name transformations

Verify transformed names:

```bash
# Build and check resource names
kustomize build overlays/team-a/ | grep "^  name:"

# Check specific resource
kustomize build overlays/team-a/ | yq eval 'select(.kind == "Deployment") | .metadata.name' -

# Verify service references
kustomize build overlays/team-a/ | yq eval 'select(.kind == "Ingress") | .spec.rules[0].http.paths[0].backend.service.name' -

# Check ConfigMap references
kustomize build overlays/team-a/ | yq eval 'select(.kind == "Deployment") | .spec.template.spec.containers[0].envFrom[0].configMapRef.name' -
```

## Label selector considerations

Label selectors don't change automatically:

```yaml
# base/deployment.yaml
spec:
  selector:
    matchLabels:
      app: web  # This stays the same
  template:
    metadata:
      labels:
        app: web  # This stays the same
```

Name transformers only change resource names, not label values. This is intentional to allow Services to select renamed Deployments.

## Limitations and workarounds

Some resources don't transform:

```yaml
# ClusterRoles and ClusterRoleBindings
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: app-cluster-role  # Won't be prefixed
```

Cluster-scoped resources need manual naming to avoid conflicts.

## Combining with other transformers

Use with commonLabels:

```yaml
namePrefix: team-a-

commonLabels:
  team: team-a
  managed-by: kustomize
```

## Best practices

Use namePrefix for multi-tenancy and team isolation.

Use nameSuffix for version or environment identification.

Keep prefixes and suffixes short but meaningful.

Test name transformations thoroughly before production deployment.

Document your naming convention for team consistency.

## Deployment script example

Automate multi-tenant deployment:

```bash
#!/bin/bash
for tenant in tenant1 tenant2 tenant3; do
  echo "Deploying $tenant..."
  kubectl apply -k overlays/$tenant/
done
```

## Conclusion

Kustomize namePrefix and nameSuffix transformers enable systematic resource naming for multi-tenant deployments, environment isolation, and parallel deployments. By automatically updating all cross-resource references, they eliminate manual errors and enable deploying multiple application instances safely. Use these transformers to build scalable multi-tenant platforms, implement blue-green deployments, or isolate feature branch environments.
