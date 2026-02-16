# How to Implement GitOps with ArgoCD ApplicationSets for Multi-Cluster AKS Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, ArgoCD, GitOps, ApplicationSets, Kubernetes, Multi-Cluster, Continuous Deployment

Description: Learn how to use ArgoCD ApplicationSets to manage deployments across multiple AKS clusters from a single Git repository with automated synchronization.

---

Managing one AKS cluster with kubectl and Helm is manageable. Managing five clusters across different regions and environments is a headache. Managing twenty clusters is a full-time job. GitOps with ArgoCD solves this by making Git the single source of truth for all cluster configurations. ApplicationSets take it further by letting you define a template once and automatically deploy it across many clusters.

Instead of running `helm upgrade` against each cluster individually, you push a change to Git and ArgoCD propagates it everywhere. This guide covers setting up ArgoCD on AKS, registering multiple clusters, and using ApplicationSets to manage them all.

## Installing ArgoCD on the Management Cluster

Pick one AKS cluster as your management cluster. ArgoCD runs here and manages all other clusters (including itself).

```bash
# Create a namespace for ArgoCD
kubectl create namespace argocd

# Install ArgoCD using the official manifests
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/part-of=argocd -n argocd --timeout=300s

# Get the initial admin password
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
echo "ArgoCD admin password: $ARGOCD_PASSWORD"
```

Install the ArgoCD CLI and log in.

```bash
# Install the CLI (macOS)
brew install argocd

# Port-forward to the ArgoCD server
kubectl port-forward svc/argocd-server -n argocd 8080:443 &

# Log in
argocd login localhost:8080 --username admin --password "$ARGOCD_PASSWORD" --insecure
```

## Registering Multiple AKS Clusters

Register each AKS cluster that ArgoCD will manage. You need kubeconfig access to each cluster.

```bash
# Get credentials for each cluster
az aks get-credentials --resource-group prod-east-rg --name prod-east-aks --context prod-east
az aks get-credentials --resource-group prod-west-rg --name prod-west-aks --context prod-west
az aks get-credentials --resource-group staging-rg --name staging-aks --context staging

# Register clusters with ArgoCD
argocd cluster add prod-east --name prod-east-aks -y
argocd cluster add prod-west --name prod-west-aks -y
argocd cluster add staging --name staging-aks -y

# Verify registered clusters
argocd cluster list
```

## Repository Structure for Multi-Cluster GitOps

Organize your Git repository to support multi-cluster deployments. Here is a structure that works well.

```
gitops-repo/
  base/                    # Base Kubernetes manifests
    deployment.yaml
    service.yaml
    configmap.yaml
  overlays/                # Kustomize overlays per environment
    staging/
      kustomization.yaml
      patches/
        replicas.yaml
    production/
      kustomization.yaml
      patches/
        replicas.yaml
        resources.yaml
  clusters/                # Cluster-specific configurations
    prod-east/
      values.yaml
    prod-west/
      values.yaml
    staging/
      values.yaml
  charts/                  # Helm charts
    my-app/
      Chart.yaml
      values.yaml
      templates/
```

## Understanding ApplicationSets

An ApplicationSet is an ArgoCD resource that generates multiple Application resources from a single template. Think of it as a for-loop that creates ArgoCD Applications for each cluster, each namespace, or any other dimension you define.

There are several generators available.

- **List generator**: Explicitly list the clusters and parameters.
- **Cluster generator**: Automatically create Applications for all registered clusters.
- **Git generator**: Generate Applications based on directories or files in a Git repository.
- **Matrix generator**: Combine two generators (for example, clusters x environments).

## ApplicationSet with List Generator

The simplest approach - explicitly define each cluster and its parameters.

```yaml
# appset-list.yaml
# Deploy my-app to specific clusters with custom values
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-app
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - cluster: prod-east-aks
            url: https://prod-east-api-server-url
            region: eastus
            replicas: "5"
            environment: production
          - cluster: prod-west-aks
            url: https://prod-west-api-server-url
            region: westus2
            replicas: "3"
            environment: production
          - cluster: staging-aks
            url: https://staging-api-server-url
            region: eastus
            replicas: "1"
            environment: staging
  template:
    metadata:
      # Each Application gets a unique name based on the cluster
      name: 'my-app-{{cluster}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/gitops-repo.git
        targetRevision: main
        path: charts/my-app
        helm:
          valueFiles:
            - values.yaml
          parameters:
            - name: replicaCount
              value: '{{replicas}}'
            - name: environment
              value: '{{environment}}'
            - name: region
              value: '{{region}}'
      destination:
        server: '{{url}}'
        namespace: my-app
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

## ApplicationSet with Cluster Generator

The cluster generator automatically discovers all registered clusters and creates Applications for each one.

```yaml
# appset-cluster.yaml
# Automatically deploy monitoring stack to all registered clusters
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: monitoring-stack
  namespace: argocd
spec:
  generators:
    # Automatically targets all registered clusters
    - clusters:
        # Optional: filter clusters by label
        selector:
          matchLabels:
            environment: production
  template:
    metadata:
      name: 'monitoring-{{name}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/gitops-repo.git
        targetRevision: main
        path: base/monitoring
      destination:
        # {{server}} and {{name}} are automatically populated
        server: '{{server}}'
        namespace: monitoring
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

When you register a new cluster with the `environment: production` label, ArgoCD automatically creates a new Application for it.

## ApplicationSet with Git Directory Generator

Generate Applications based on directory structure in Git. Each directory becomes a separate Application.

```yaml
# appset-git-directory.yaml
# Each directory under clusters/ generates an Application
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: cluster-configs
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/gitops-repo.git
        revision: main
        directories:
          - path: clusters/*
  template:
    metadata:
      name: 'config-{{path.basename}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/gitops-repo.git
        targetRevision: main
        path: '{{path}}'
      destination:
        server: 'https://{{path.basename}}-api-server-url'
        namespace: default
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

## Matrix Generator for Complex Deployments

Combine generators to create a matrix of Applications. For example, deploy every service to every cluster.

```yaml
# appset-matrix.yaml
# Deploy each service to each production cluster
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: all-services
  namespace: argocd
spec:
  generators:
    - matrix:
        generators:
          # First dimension: clusters
          - clusters:
              selector:
                matchLabels:
                  environment: production
          # Second dimension: services (from Git directories)
          - git:
              repoURL: https://github.com/myorg/gitops-repo.git
              revision: main
              directories:
                - path: charts/*
  template:
    metadata:
      # Unique name: service-name + cluster-name
      name: '{{path.basename}}-{{name}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/gitops-repo.git
        targetRevision: main
        path: '{{path}}'
        helm:
          valueFiles:
            - values.yaml
            # Cluster-specific values override
            - ../../clusters/{{name}}/values.yaml
      destination:
        server: '{{server}}'
        namespace: '{{path.basename}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

## Sync Policies and Rollback

Configure how ArgoCD syncs changes to your clusters.

```yaml
# Sync policy options explained
syncPolicy:
  automated:
    prune: true      # Delete resources that are removed from Git
    selfHeal: true   # Revert manual changes made outside Git
    allowEmpty: false # Prevent syncing if the source is empty (safety check)
  syncOptions:
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
    - PruneLast=true          # Prune after all other resources are synced
    - RespectIgnoreDifferences=true
  retry:
    limit: 5                  # Retry failed syncs up to 5 times
    backoff:
      duration: 5s
      maxDuration: 3m
      factor: 2
```

If a deployment goes wrong, you can roll back through Git.

```bash
# Revert the last commit
git revert HEAD
git push

# ArgoCD automatically detects the change and syncs the rollback

# Or manually sync to a specific Git revision
argocd app sync my-app-prod-east --revision abc123
```

## Monitoring ApplicationSet Health

Check the status of all generated Applications.

```bash
# List all Applications generated by an ApplicationSet
argocd app list | grep my-app

# Check sync status for all apps
argocd app list -o json | jq '.[] | {name: .metadata.name, sync: .status.sync.status, health: .status.health.status}'

# Get details for a specific app
argocd app get my-app-prod-east
```

## Wrapping Up

ArgoCD ApplicationSets transform multi-cluster management from a manual, error-prone process into an automated, Git-driven workflow. Define your deployment template once, and ApplicationSets ensure it is consistently applied across all your AKS clusters. The cluster generator automatically picks up new clusters, the Git generator scales with your repository structure, and the matrix generator handles the combinatorial explosion of services and clusters. Combined with automated sync policies and self-healing, you get a deployment system where Git is truly the single source of truth and manual kubectl operations become the exception rather than the rule.
