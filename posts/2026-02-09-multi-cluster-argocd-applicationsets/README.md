# How to Manage Multi-Cluster Configuration with ArgoCD ApplicationSets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Multi-Cluster

Description: Learn how to use ArgoCD ApplicationSets to declaratively manage application deployments across multiple Kubernetes clusters with templating and automated discovery.

---

ArgoCD ApplicationSets enable managing applications across multiple clusters from a single Git repository. Instead of creating individual Applications for each cluster, ApplicationSets use generators to automatically create Applications based on cluster lists, Git directories, or custom logic. This dramatically simplifies multi-cluster GitOps workflows.

## Installing ArgoCD with Multi-Cluster Support

Install ArgoCD in a central cluster:

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Install the ApplicationSet controller (included in ArgoCD 2.6+):

```bash
# Verify ApplicationSet CRD exists
kubectl get crd applicationsets.argoproj.io
```

Get the initial admin password:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

Access ArgoCD UI:

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Open https://localhost:8080 and login with admin and the password.

## Registering Multiple Clusters

Add target clusters to ArgoCD:

```bash
# Get current context (management cluster)
kubectl config current-context

# Add cluster-1
argocd cluster add cluster-1 --name cluster-1

# Add cluster-2
argocd cluster add cluster-2 --name cluster-2

# Add cluster-3
argocd cluster add cluster-3 --name cluster-3
```

Verify registered clusters:

```bash
argocd cluster list
```

Output:

```
SERVER                          NAME        VERSION  STATUS      MESSAGE
https://kubernetes.default.svc  in-cluster  1.28     Successful
https://10.0.1.100:6443        cluster-1   1.28     Successful
https://10.0.2.100:6443        cluster-2   1.28     Successful
https://10.0.3.100:6443        cluster-3   1.28     Successful
```

## Creating a Basic ApplicationSet

Use the List generator to deploy to specific clusters:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: webapp-appset
  namespace: argocd
spec:
  generators:
  - list:
      elements:
      - cluster: cluster-1
        url: https://10.0.1.100:6443
        environment: production
        region: us-east
      - cluster: cluster-2
        url: https://10.0.2.100:6443
        environment: production
        region: us-west
      - cluster: cluster-3
        url: https://10.0.3.100:6443
        environment: staging
        region: eu-central
  template:
    metadata:
      name: '{{cluster}}-webapp'
    spec:
      project: default
      source:
        repoURL: https://github.com/example/webapp
        targetRevision: main
        path: manifests
        helm:
          valueFiles:
          - values.yaml
          - values-{{environment}}.yaml
          parameters:
          - name: region
            value: '{{region}}'
      destination:
        server: '{{url}}'
        namespace: production
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
        - CreateNamespace=true
```

Apply:

```bash
kubectl apply -f webapp-appset.yaml
```

This creates three Applications: cluster-1-webapp, cluster-2-webapp, cluster-3-webapp.

## Using the Cluster Generator

Automatically discover clusters registered in ArgoCD:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: monitoring-appset
  namespace: argocd
spec:
  generators:
  - clusters:
      selector:
        matchLabels:
          environment: production
  template:
    metadata:
      name: '{{name}}-monitoring'
    spec:
      project: default
      source:
        repoURL: https://github.com/example/monitoring
        targetRevision: main
        path: prometheus
      destination:
        server: '{{server}}'
        namespace: monitoring
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
        - CreateNamespace=true
```

Label clusters to control which receive the application:

```bash
argocd cluster set cluster-1 --label environment=production
argocd cluster set cluster-2 --label environment=production
argocd cluster set cluster-3 --label environment=staging
```

Only cluster-1 and cluster-2 receive the monitoring stack.

## Using the Git Generator

Deploy based on Git repository structure:

```
git-repo/
├── environments/
│   ├── production/
│   │   ├── cluster-1/
│   │   │   └── config.yaml
│   │   └── cluster-2/
│   │       └── config.yaml
│   └── staging/
│       └── cluster-3/
│           └── config.yaml
```

ApplicationSet with Git directory generator:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: cluster-config-appset
  namespace: argocd
spec:
  generators:
  - git:
      repoURL: https://github.com/example/cluster-configs
      revision: main
      directories:
      - path: environments/*/cluster-*
  template:
    metadata:
      name: '{{path.basename}}-config'
    spec:
      project: default
      source:
        repoURL: https://github.com/example/cluster-configs
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc  # Update based on cluster mapping
        namespace: default
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

This automatically creates Applications for each directory.

## Combining Multiple Generators

Use matrix generators for complex scenarios:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: multi-app-appset
  namespace: argocd
spec:
  generators:
  - matrix:
      generators:
      - clusters:
          selector:
            matchLabels:
              environment: production
      - list:
          elements:
          - app: frontend
            port: "8080"
          - app: backend
            port: "8081"
          - app: cache
            port: "6379"
  template:
    metadata:
      name: '{{name}}-{{app}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/example/apps
        targetRevision: main
        path: '{{app}}'
        helm:
          parameters:
          - name: service.port
            value: '{{port}}'
      destination:
        server: '{{server}}'
        namespace: '{{app}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
        - CreateNamespace=true
```

This deploys frontend, backend, and cache to each production cluster.

## Using Template Overrides

Override values for specific clusters:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: webapp-with-overrides
  namespace: argocd
spec:
  generators:
  - list:
      elements:
      - cluster: cluster-1
        url: https://10.0.1.100:6443
        replicas: "10"
        resources: high
      - cluster: cluster-2
        url: https://10.0.2.100:6443
        replicas: "5"
        resources: medium
      - cluster: cluster-3
        url: https://10.0.3.100:6443
        replicas: "2"
        resources: low
  template:
    metadata:
      name: '{{cluster}}-webapp'
    spec:
      project: default
      source:
        repoURL: https://github.com/example/webapp
        targetRevision: main
        path: charts/webapp
        helm:
          parameters:
          - name: replicaCount
            value: '{{replicas}}'
          - name: resources.preset
            value: '{{resources}}'
      destination:
        server: '{{url}}'
        namespace: production
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

Each cluster gets appropriate sizing based on its capacity.

## Implementing Progressive Rollouts

Use the merge generator for canary deployments:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: progressive-rollout
  namespace: argocd
spec:
  generators:
  - merge:
      mergeKeys:
      - cluster
      generators:
      - clusters:
          selector:
            matchLabels:
              rollout: canary
          values:
            version: v2.0
      - clusters:
          selector:
            matchLabels:
              rollout: stable
          values:
            version: v1.0
  template:
    metadata:
      name: '{{name}}-app'
    spec:
      project: default
      source:
        repoURL: https://github.com/example/app
        targetRevision: main
        path: manifests
        helm:
          parameters:
          - name: image.tag
            value: '{{values.version}}'
      destination:
        server: '{{server}}'
        namespace: production
```

Label clusters for rollout stages:

```bash
argocd cluster set cluster-3 --label rollout=canary
argocd cluster set cluster-1 --label rollout=stable
argocd cluster set cluster-2 --label rollout=stable
```

Cluster-3 receives v2.0 (canary), others stay on v1.0 (stable).

## Monitoring ApplicationSet Status

Check ApplicationSet status:

```bash
kubectl get applicationset -n argocd
```

View generated Applications:

```bash
kubectl get applications -n argocd
```

Check sync status:

```bash
argocd app list
```

View detailed status:

```bash
kubectl describe applicationset webapp-appset -n argocd
```

## Implementing Health Checks

Add health checks to ensure applications are actually healthy:

```yaml
spec:
  template:
    spec:
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
        - CreateNamespace=true
      ignoreDifferences:
      - group: apps
        kind: Deployment
        jsonPointers:
        - /spec/replicas
      health:
        - check: |
            hs = {}
            if obj.status ~= nil then
              if obj.status.readyReplicas == obj.status.replicas then
                hs.status = "Healthy"
                hs.message = "All replicas ready"
                return hs
              end
            end
            hs.status = "Progressing"
            hs.message = "Waiting for replicas"
            return hs
```

## Implementing Cluster-Specific Secrets

Use sealed secrets or external secret operators:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: secrets-appset
  namespace: argocd
spec:
  generators:
  - clusters: {}
  template:
    metadata:
      name: '{{name}}-secrets'
    spec:
      project: default
      source:
        repoURL: https://github.com/example/secrets
        targetRevision: main
        path: sealed-secrets/{{name}}
      destination:
        server: '{{server}}'
        namespace: default
      syncPolicy:
        automated:
          prune: false  # Don't auto-delete secrets
```

Store cluster-specific sealed secrets in separate directories.

## Best Practices

**Use cluster labels**: Tag clusters with meaningful labels (environment, region, tier) and use label selectors in generators.

**Structure Git repos carefully**: Organize manifests in a way that works well with generators. Common patterns:
- One directory per cluster
- One directory per environment with cluster subdirectories
- Shared base with cluster-specific overlays

**Implement progressive delivery**: Use different ApplicationSets for canary, staging, and production deployments.

**Monitor sync status**: Set up alerts for applications stuck in OutOfSync or Degraded states:

```promql
argocd_app_sync_status{sync_status!="Synced"} > 0
```

**Use project-level RBAC**: Create ArgoCD Projects to control which teams can deploy to which clusters.

**Version control everything**: Store ApplicationSets in Git alongside application manifests for full GitOps.

**Test ApplicationSets**: Before applying to production, test generators produce expected Applications:

```bash
kubectl apply --dry-run=client -f appset.yaml
```

**Document generator logic**: Add comments explaining why specific generators and filters are used.

ArgoCD ApplicationSets transform multi-cluster deployments from repetitive manual work into declarative, automated workflows. By using generators to create Applications dynamically, you maintain a single source of truth while deploying to dozens or hundreds of clusters efficiently.
