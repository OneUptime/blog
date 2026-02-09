# How to use ArgoCD ApplicationSet progressive sync for canary deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, ApplicationSet, Canary Deployment, Progressive Delivery, GitOps

Description: Implement safe canary deployments using ArgoCD ApplicationSet progressive sync to gradually roll out changes across environments and clusters with automated promotion and rollback capabilities.

---

Deploying changes simultaneously to all environments and clusters is risky. Progressive sync with ArgoCD ApplicationSets enables gradual rollouts where changes are deployed to a subset of targets first, validated, and then progressively promoted to remaining targets. This canary deployment strategy minimizes blast radius and provides opportunity to detect issues before full rollout.

This guide shows you how to implement progressive sync patterns with ApplicationSets to build safe, automated canary deployments that span multiple environments and clusters.

## Understanding ApplicationSet progressive sync

ApplicationSet progressive sync controls the order and timing of application deployments across multiple targets. Instead of syncing all generated applications simultaneously, progressive sync:

- Deploys to initial targets first (canary stage)
- Waits for health and sync validation
- Gradually promotes to additional targets (progressive rollout)
- Supports manual or automated promotion
- Enables rollback on failure

Progressive sync is configured using the `strategy` field in ApplicationSet specifications.

## Configuring basic progressive sync

Start with a simple progressive sync across environments:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: progressive-deployment
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - environment: dev
            cluster: dev-cluster
            stage: "1"
          - environment: staging
            cluster: staging-cluster
            stage: "2"
          - environment: production
            cluster: prod-cluster
            stage: "3"
  strategy:
    type: RollingSync
    rollingSync:
      steps:
        - matchExpressions:
            - key: stage
              operator: In
              values:
                - "1"
        - matchExpressions:
            - key: stage
              operator: In
              values:
                - "2"
          maxUpdate: 100%
        - matchExpressions:
            - key: stage
              operator: In
              values:
                - "3"
          maxUpdate: 100%
  template:
    metadata:
      name: 'app-{{environment}}'
      labels:
        environment: '{{environment}}'
        stage: '{{stage}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/app.git
        targetRevision: main
        path: k8s
        helm:
          values: |
            environment: {{environment}}
      destination:
        server: '{{cluster}}'
        namespace: production
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

This configuration:
1. Deploys to dev first
2. After dev is healthy, deploys to staging
3. After staging is healthy, deploys to production

## Implementing multi-cluster canary deployment

Roll out changes across multiple production clusters progressively:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: multi-cluster-canary
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
                - region: us-east-1
                  weight: "10"
                - region: us-west-2
                  weight: "30"
                - region: eu-west-1
                  weight: "30"
                - region: ap-southeast-1
                  weight: "30"
  strategy:
    type: RollingSync
    rollingSync:
      steps:
        # Stage 1: Deploy to 10% (us-east-1)
        - matchExpressions:
            - key: weight
              operator: In
              values:
                - "10"
        # Stage 2: Deploy to 40% (us-east-1 + us-west-2)
        - matchExpressions:
            - key: weight
              operator: In
              values:
                - "10"
                - "30"
          maxUpdate: 50%
        # Stage 3: Deploy to 100% (all regions)
        - matchExpressions:
            - key: weight
              operator: In
              values:
                - "10"
                - "30"
          maxUpdate: 100%
  template:
    metadata:
      name: 'app-{{region}}'
      labels:
        region: '{{region}}'
        weight: '{{weight}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/app.git
        targetRevision: main
        path: k8s
      destination:
        server: '{{server}}'
        namespace: production
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

This implements a weighted canary:
- 10% traffic to first region
- Expand to 40% after validation
- Full rollout to 100% after success

## Using maxUpdate for controlled rollout pace

Control how many applications sync in each stage:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: controlled-pace-rollout
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - cluster: cluster-01
            priority: high
          - cluster: cluster-02
            priority: high
          - cluster: cluster-03
            priority: medium
          - cluster: cluster-04
            priority: medium
          - cluster: cluster-05
            priority: low
          - cluster: cluster-06
            priority: low
  strategy:
    type: RollingSync
    rollingSync:
      steps:
        # Deploy to high priority clusters first, one at a time
        - matchExpressions:
            - key: priority
              operator: In
              values:
                - high
          maxUpdate: 50%  # Deploy to 1 of 2 high priority clusters
        # Then medium priority
        - matchExpressions:
            - key: priority
              operator: In
              values:
                - high
                - medium
          maxUpdate: 50%  # Deploy remaining high + 1 medium
        # Finally low priority, all at once
        - matchExpressions:
            - key: priority
              operator: In
              values:
                - high
                - medium
                - low
          maxUpdate: 100%
  template:
    metadata:
      name: 'app-{{cluster}}'
      labels:
        cluster: '{{cluster}}'
        priority: '{{priority}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/app.git
        targetRevision: main
        path: manifests
      destination:
        name: '{{cluster}}'
        namespace: production
```

## Implementing automated promotion with health checks

Configure automatic promotion based on application health:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: auto-promote-canary
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - environment: canary
            replicas: "1"
            stage: "1"
          - environment: production-a
            replicas: "5"
            stage: "2"
          - environment: production-b
            replicas: "5"
            stage: "3"
  strategy:
    type: RollingSync
    rollingSync:
      steps:
        - matchExpressions:
            - key: stage
              operator: In
              values:
                - "1"
          # Wait for canary to be healthy for 5 minutes
          minReadySeconds: 300
        - matchExpressions:
            - key: stage
              operator: In
              values:
                - "1"
                - "2"
          maxUpdate: 50%
          minReadySeconds: 300
        - matchExpressions:
            - key: stage
              operator: In
              values:
                - "1"
                - "2"
                - "3"
          maxUpdate: 100%
  template:
    metadata:
      name: 'app-{{environment}}'
      labels:
        environment: '{{environment}}'
        stage: '{{stage}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/app.git
        targetRevision: main
        path: k8s
        helm:
          parameters:
            - name: replicas
              value: '{{replicas}}'
            - name: environment
              value: '{{environment}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{environment}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
      # Define health assessment
      health:
        - type: Deployment
          checkInterval: 30s
```

The `minReadySeconds` parameter ensures each stage remains healthy before proceeding.

## Combining progressive sync with Argo Rollouts

Integrate ApplicationSet progressive sync with Argo Rollouts for advanced canary:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: rollouts-canary
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - cluster: us-east-1
            stage: "1"
          - cluster: us-west-2
            stage: "2"
          - cluster: eu-west-1
            stage: "3"
  strategy:
    type: RollingSync
    rollingSync:
      steps:
        - matchExpressions:
            - key: stage
              operator: In
              values:
                - "1"
          minReadySeconds: 600  # 10 minutes for Rollout canary
        - matchExpressions:
            - key: stage
              operator: In
              values:
                - "1"
                - "2"
          maxUpdate: 50%
          minReadySeconds: 600
        - matchExpressions:
            - key: stage
              operator: In
              values:
                - "1"
                - "2"
                - "3"
          maxUpdate: 100%
  template:
    metadata:
      name: 'app-{{cluster}}'
      labels:
        cluster: '{{cluster}}'
        stage: '{{stage}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/app.git
        targetRevision: main
        path: rollouts
      destination:
        name: '{{cluster}}'
        namespace: production
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

The application manifests include Rollout resources:

```yaml
# rollouts/rollout.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: web-app
spec:
  replicas: 10
  strategy:
    canary:
      steps:
        - setWeight: 10
        - pause: {duration: 2m}
        - setWeight: 30
        - pause: {duration: 2m}
        - setWeight: 50
        - pause: {duration: 2m}
        - setWeight: 100
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: app
          image: myorg/web-app:v1.2.3
```

This provides two levels of progressive rollout:
1. ApplicationSet rolls out across clusters progressively
2. Argo Rollouts performs canary within each cluster

## Implementing manual approval gates

Require manual approval before promoting to production:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: manual-approval-rollout
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - environment: staging
            stage: "1"
            autoSync: "true"
          - environment: production
            stage: "2"
            autoSync: "false"
  strategy:
    type: RollingSync
    rollingSync:
      steps:
        - matchExpressions:
            - key: stage
              operator: In
              values:
                - "1"
        # Stage 2 requires manual sync
        - matchExpressions:
            - key: stage
              operator: In
              values:
                - "2"
  template:
    metadata:
      name: 'app-{{environment}}'
      labels:
        environment: '{{environment}}'
        stage: '{{stage}}'
      annotations:
        notifications.argoproj.io/subscribe.on-sync-waiting.slack: ops-team
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/app.git
        targetRevision: main
        path: k8s
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{environment}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        # Disable auto-sync for production
        syncOptions:
          - CreateNamespace=true
```

Production deployments require manual approval:

```bash
# After staging is successful, manually sync production
argocd app sync app-production

# Or approve via UI
```

## Monitoring progressive sync status

Track rollout progress:

```bash
# View ApplicationSet status
kubectl get applicationset progressive-deployment -n argocd -o yaml

# Check which applications are in which stage
argocd app list --selector stage=1
argocd app list --selector stage=2

# View detailed application status
argocd app get app-staging

# Monitor sync waves
kubectl get applications -n argocd \
  -o custom-columns=NAME:.metadata.name,HEALTH:.status.health.status,SYNC:.status.sync.status
```

Set up Prometheus alerts for rollout issues:

```yaml
groups:
  - name: progressive-sync-alerts
    rules:
      - alert: CanaryDeploymentFailed
        expr: |
          argocd_app_sync_total{phase="Failed",stage="1"} > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Canary deployment failed"
          description: "Stage 1 deployment failed, rollout blocked"

      - alert: ProgressiveSyncStalled
        expr: |
          time() - argocd_app_sync_timestamp > 1800
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Progressive sync appears stalled"
```

## Implementing rollback strategies

Configure automatic rollback on failure:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: auto-rollback-canary
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - environment: canary
            stage: "1"
          - environment: production
            stage: "2"
  strategy:
    type: RollingSync
    rollingSync:
      steps:
        - matchExpressions:
            - key: stage
              operator: In
              values:
                - "1"
          minReadySeconds: 300
        - matchExpressions:
            - key: stage
              operator: In
              values:
                - "1"
                - "2"
  template:
    metadata:
      name: 'app-{{environment}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/app.git
        targetRevision: main
        path: k8s
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{environment}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        retry:
          limit: 2
          backoff:
            duration: 30s
            factor: 2
            maxDuration: 3m
```

If the canary fails health checks, it won't progress to production. Manual intervention or rollback to previous Git commit is required.

## Best practices for progressive sync

1. **Start with small canaries:** Deploy to minimal traffic first
2. **Use meaningful health checks:** Define comprehensive health assessment
3. **Set appropriate wait times:** Balance speed with validation confidence
4. **Implement monitoring:** Track metrics during each stage
5. **Document rollback procedures:** Have clear rollback plans
6. **Test rollout logic:** Validate progressive sync behavior in non-prod
7. **Coordinate with teams:** Ensure stakeholders understand rollout stages
8. **Use manual gates for critical stages:** Require approval for production

## Conclusion

ArgoCD ApplicationSet progressive sync provides a powerful mechanism for implementing safe canary deployments across multiple environments and clusters. By gradually rolling out changes and validating health at each stage, you minimize risk and maximize confidence in your deployments. Combined with proper health checks, monitoring, and rollback strategies, progressive sync enables you to deploy frequently while maintaining high reliability standards.
