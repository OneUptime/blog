# Set Up ArgoCD ApplicationSet Matrix Generator for Cross-Product Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, ApplicationSet, Matrix Generator, Multi-Cluster, GitOps

Description: Learn how to use ArgoCD ApplicationSet matrix generator to create applications from the cartesian product of multiple generators for complex multi-environment deployments.

---

Managing applications across multiple environments, regions, and clusters creates combinatorial explosion. Three apps in four environments across two regions means 24 Application resources. The ApplicationSet matrix generator solves this by computing the cross-product of multiple generators, creating all combinations automatically.

This guide shows you how to use matrix generators for scalable multi-dimensional deployments.

## Understanding Matrix Generators

Matrix generators combine two child generators using cartesian product:

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
  goTemplate: true
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
      name: 'myapp-{{.environment}}-{{.region}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/company/apps
        targetRevision: HEAD
        path: apps/myapp
        kustomize:
          commonLabels:
            environment: '{{.environment}}'
            region: '{{.region}}'
      destination:
        server: '{{.cluster}}'
        namespace: '{{.environment}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
  templatePatch: |
    spec:
      source:
        kustomize:
          replicas:
            - name: myapp
              count: {{ .replicas }}
```

This creates 6 applications (3 environments × 2 regions).

## Three-Dimensional Matrix

Add another dimension for multiple applications by nesting a two-generator matrix:

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
          # Dimensions 1 and 2: Applications × Environments
          - matrix:
              generators:
                - list:
                    elements:
                      - app: frontend
                        port: "3000"
                      - app: backend
                        port: "8080"
                      - app: worker
                        port: "9090"

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
  goTemplate: true
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
                  autoSync: false
                - environment: staging
                  namespace: staging
                  autoSync: true

  template:
    metadata:
      name: 'myapp-{{.environment}}-{{.name}}'
      labels:
        environment: '{{.environment}}'
        cluster: '{{.name}}'
    spec:
      project: '{{.project}}'
      source:
        repoURL: https://github.com/company/apps
        targetRevision: HEAD
        path: 'apps/myapp/overlays/{{.environment}}'
      destination:
        name: '{{.name}}'
        namespace: '{{.namespace}}'
  templatePatch: |
    {{- if .autoSync }}
    spec:
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
    {{- end }}
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

Not all combinations make sense. The matrix generator does not evaluate arbitrary conditional logic, but you can post-filter generated parameters with a selector when the generated values contain a key you can match:

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
                  deploy: "true"
                - app: backend
                  requiresDatabase: "true"
                  deploy: "true"
                - app: worker
                  requiresDatabase: "true"
                  deploy: "false"

          - list:
              elements:
                - environment: development
                  hasDatabase: "true"
                - environment: testing
                  hasDatabase: "false"
                - environment: production
                  hasDatabase: "true"

      selector:
        matchLabels:
          deploy: "true"

  template:
    metadata:
      name: '{{app}}-{{environment}}'
    spec:
      # ... rest of template
```

For filtering that depends on specific app/environment pairs, use the merge generator with an explicit allow-list:

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

        # Second generator acts as an allow-list
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

Matrix generators can be nested one level:

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
      name: '{{name}}-{{service}}'
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
              value: '{{id}}'
            - name: customer.tier
              value: '{{tier}}'
            - name: resources.limits.memory
              value: '{{limits.memory}}'
            - name: service.port
              value: '{{port}}'
      destination:
        server: '{{cluster}}'
        namespace: 'customer-{{id}}'
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

Matrix generators can create many Applications. Add retry behavior and ordering hints where they fit your deployment:

```yaml
spec:
  template:
    metadata:
      annotations:
        argocd.argoproj.io/sync-wave: "{{wave}}"
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

1. **Limit dimensions**: Matrix combines two child generators directly; use only one nested matrix when you need a third dimension
2. **Use descriptive names**: Template names should clearly identify the combination
3. **Add labels**: Label applications with generator parameters for filtering
4. **Test small first**: Start with few elements, expand gradually
5. **Monitor Application count**: Matrix can explode quickly
6. **Use selectors wisely**: Filter combinations that don't make sense
7. **Document generator logic**: Complex matrices need clear documentation

## Conclusion

ApplicationSet matrix generators eliminate manual Application creation for multi-dimensional deployments. Define your dimensions once, and ArgoCD creates all valid combinations automatically. This scales from simple environment × region matrices to complex multi-tenant platforms with hundreds of Applications. Start with basic two-dimensional matrices, then expand to nested and filtered matrices as your deployment complexity grows.
