# How to Set Up ArgoCD ApplicationSet Matrix Generator for Cross-Product Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, ApplicationSet, Matrix Generator, Multi-Cluster, GitOps

Description: Learn how to use ArgoCD ApplicationSet matrix generator to create applications from the cartesian product of multiple generators for complex multi-environment deployments.

---

Managing applications across multiple environments, regions, and clusters creates combinatorial explosion. Three apps in four environments across two regions means 24 Application resources. The ApplicationSet matrix generator solves this by computing the cross-product of multiple generators, creating all combinations automatically.

This guide shows you how to use matrix generators for scalable multi-dimensional deployments.

## Understanding Matrix Generators

Matrix generators combine two or more generators using cartesian product:

- Generator A produces: [env1, env2]
- Generator B produces: [region-a, region-b]
- Matrix produces: [(env1, region-a), (env1, region-b), (env2, region-a), (env2, region-b)]

Each combination creates one Application.

## Basic Matrix Example

Deploy to all environment and region combinations:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: multi-environment-app
  namespace: argocd
spec:
  generators:
    - matrix:
        generators:
          # Generator 1: Environments
          - list:
              elements:
                - environment: development
                  replicas: "1"
                - environment: staging
                  replicas: "2"
                - environment: production
                  replicas: "5"

          # Generator 2: Regions
          - list:
              elements:
                - region: us-east-1
                  cluster: https://k8s-us-east-1.company.com
                - region: eu-west-1
                  cluster: https://k8s-eu-west-1.company.com

  template:
    metadata:
      name: 'myapp-{{environment}}-{{region}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/company/apps
        targetRevision: HEAD
        path: apps/myapp
        kustomize:
          commonLabels:
            environment: '{{environment}}'
            region: '{{region}}'
          replicas:
            - name: myapp
              count: '{{replicas}}'
      destination:
        server: '{{cluster}}'
        namespace: '{{environment}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

This creates 6 applications (3 environments × 2 regions).

## Three-Dimensional Matrix

Add another dimension for multiple applications:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: full-stack
  namespace: argocd
spec:
  generators:
    - matrix:
        generators:
          # Dimension 1: Applications
          - list:
              elements:
                - app: frontend
                  port: "3000"
                - app: backend
                  port: "8080"
                - app: worker
                  port: "9090"

          # Dimension 2: Environments
          - list:
              elements:
                - environment: development
                  domain: dev.company.com
                - environment: production
                  domain: company.com

          # Dimension 3: Clusters
          - git:
              repoURL: https://github.com/company/clusters
              revision: HEAD
              files:
                - path: clusters/*.json

  template:
    metadata:
      name: '{{app}}-{{environment}}-{{cluster.name}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/company/apps
        targetRevision: HEAD
        path: 'apps/{{app}}'
        helm:
          parameters:
            - name: ingress.host
              value: '{{app}}.{{domain}}'
            - name: service.port
              value: '{{port}}'
      destination:
        server: '{{cluster.server}}'
        namespace: '{{environment}}-{{app}}'
```

## Mixing Git and List Generators

Combine cluster definitions from Git with hardcoded environments:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: cluster-matrix
  namespace: argocd
spec:
  generators:
    - matrix:
        generators:
          # From Git repository
          - git:
              repoURL: https://github.com/company/fleet-config
              revision: HEAD
              files:
                - path: "clusters/**/config.json"

          # Hardcoded environments
          - list:
              elements:
                - environment: production
                  namespace: prod
                  syncPolicy: manual
                - environment: staging
                  namespace: staging
                  syncPolicy: automated

  template:
    metadata:
      name: 'myapp-{{environment}}-{{cluster.name}}'
      labels:
        environment: '{{environment}}'
        cluster: '{{cluster.name}}'
    spec:
      project: '{{cluster.project}}'
      source:
        repoURL: https://github.com/company/apps
        targetRevision: HEAD
        path: 'apps/myapp/overlays/{{environment}}'
      destination:
        name: '{{cluster.name}}'
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: '{{syncPolicy}}' == 'automated'
```

Cluster config.json files:

```json
{
  "name": "prod-us-east-1",
  "region": "us-east-1",
  "project": "production",
  "server": "https://prod-us-east-1.k8s.company.com"
}
```

## Filtering Matrix Results

Not all combinations make sense. Use selectors to filter:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: filtered-matrix
  namespace: argocd
spec:
  generators:
    - matrix:
        generators:
          - list:
              elements:
                - app: frontend
                  requiresDatabase: "false"
                - app: backend
                  requiresDatabase: "true"
                - app: worker
                  requiresDatabase: "true"

          - list:
              elements:
                - environment: development
                  hasDatabase: "true"
                - environment: testing
                  hasDatabase: "false"
                - environment: production
                  hasDatabase: "true"

        # Only create app if database requirements match
        template:
          spec:
            source:
              kustomize:
                # This would need custom logic
                # Matrix generator doesn't natively support conditional filtering
                # Use Go template or selector instead

  # Alternative: Use selector
  goTemplate: true
  template:
    metadata:
      name: '{{.app}}-{{.environment}}'
    spec:
      # ... rest of template
      # Use Go template conditionals
```

For true filtering, use the merge generator with selectors:

```yaml
generators:
  - merge:
      mergeKeys:
        - environment
        - app
      generators:
        - matrix:
            generators:
              - list:
                  elements: # ... apps
              - list:
                  elements: # ... environments

        # Second generator acts as filter
        - list:
            elements:
              - environment: development
                app: backend
              - environment: production
                app: backend
              - environment: production
                app: frontend
```

## Nested Matrices

Matrix generators can be nested:

```yaml
generators:
  - matrix:
      generators:
        # Outer matrix: Regions × Environments
        - matrix:
            generators:
              - list:  # Regions
                  elements:
                    - region: us-east-1
                    - region: eu-west-1
              - list:  # Environments
                  elements:
                    - environment: production
                    - environment: staging

        # Inner generator: Applications
        - list:
            elements:
              - app: frontend
              - app: backend
```

This creates: (2 regions × 2 environments) × 2 apps = 8 applications.

## Practical Example: Multi-Tenant Platform

Deploy multiple customer environments:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: customer-deployments
  namespace: argocd
spec:
  generators:
    - matrix:
        generators:
          # Customers from Git
          - git:
              repoURL: https://github.com/company/customers
              revision: HEAD
              files:
                - path: "customers/*.json"

          # Services to deploy for each customer
          - list:
              elements:
                - service: api
                  path: services/api
                  port: "8080"
                - service: dashboard
                  path: services/dashboard
                  port: "3000"
                - service: worker
                  path: services/worker
                  port: "0"

  template:
    metadata:
      name: '{{customer.name}}-{{service}}'
      finalizers:
        - resources-finalizer.argocd.argoproj.io
    spec:
      project: multi-tenant
      source:
        repoURL: https://github.com/company/services
        targetRevision: HEAD
        path: '{{path}}'
        helm:
          parameters:
            - name: customer.id
              value: '{{customer.id}}'
            - name: customer.tier
              value: '{{customer.tier}}'
            - name: resources.limits.memory
              value: '{{customer.limits.memory}}'
            - name: service.port
              value: '{{port}}'
      destination:
        server: '{{customer.cluster}}'
        namespace: 'customer-{{customer.id}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

Customer JSON file:

```json
{
  "name": "acme-corp",
  "id": "acme",
  "tier": "enterprise",
  "cluster": "https://k8s-prod-us.company.com",
  "limits": {
    "memory": "2Gi",
    "cpu": "2000m"
  }
}
```

## Performance Considerations

Matrix generators can create many Applications. Optimize:

```yaml
spec:
  # Limit concurrent syncs
  template:
    spec:
      syncPolicy:
        syncOptions:
          - PruneLast=true
        retry:
          limit: 2
          backoff:
            duration: 5s
            factor: 2
            maxDuration: 3m

  # Or use sync waves
  template:
    metadata:
      annotations:
        argocd.argoproj.io/sync-wave: "{{wave}}"
```

Add wave to list elements:

```yaml
- list:
    elements:
      - environment: development
        wave: "0"
      - environment: staging
        wave: "1"
      - environment: production
        wave: "2"
```

## Debugging Matrix Generators

View generated applications:

```bash
# List all applications from ApplicationSet
kubectl get applications -n argocd -l argocd.argoproj.io/application-set-name=multi-environment-app

# View ApplicationSet status
kubectl describe applicationset multi-environment-app -n argocd

# Check generated applications
argocd appset get multi-environment-app
```

Test matrix locally:

```bash
# Use argocd CLI to preview
argocd appset generate multi-environment-app.yaml
```

## Best Practices

1. **Limit dimensions**: Keep matrix to 2-3 dimensions maximum
2. **Use descriptive names**: Template names should clearly identify the combination
3. **Add labels**: Label applications with generator parameters for filtering
4. **Test small first**: Start with few elements, expand gradually
5. **Monitor Application count**: Matrix can explode quickly
6. **Use selectors wisely**: Filter combinations that don't make sense
7. **Document generator logic**: Complex matrices need clear documentation

## Conclusion

ApplicationSet matrix generators eliminate manual Application creation for multi-dimensional deployments. Define your dimensions once, and ArgoCD creates all valid combinations automatically. This scales from simple environment × region matrices to complex multi-tenant platforms with hundreds of Applications. Start with basic two-dimensional matrices, then expand to nested and filtered matrices as your deployment complexity grows.
