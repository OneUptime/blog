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
- Limits further promotion on failure

Progressive sync is configured using the `strategy` field in ApplicationSet specifications.
It must also be enabled on the ApplicationSet controller with `--enable-progressive-syncs`, the `ARGOCD_APPLICATIONSET_CONTROLLER_ENABLE_PROGRESSIVE_SYNCS=true` environment variable, or `applicationsetcontroller.enable.progressive.syncs: "true"` in `argocd-cmd-params-cm`.

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
        name: '{{cluster}}'
        namespace: production
```

This configuration:
1. Deploys to dev first
2. After dev is healthy, deploys to staging
3. After staging is healthy, deploys to production

RollingSync triggers syncs from the ApplicationSet controller and forces autosync off on the generated Applications, so do not rely on `syncPolicy.automated` for these Applications.

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
    - list:
        elements:
          - cluster: prod-us-east-1
            region: us-east-1
            stage: canary
          - cluster: prod-us-west-2
            region: us-west-2
            stage: primary
          - cluster: prod-eu-west-1
            region: eu-west-1
            stage: primary
          - cluster: prod-ap-southeast-1
            region: ap-southeast-1
            stage: primary
  strategy:
    type: RollingSync
    rollingSync:
      steps:
        # Stage 1: Deploy to the canary region
        - matchExpressions:
            - key: stage
              operator: In
              values:
                - canary
        # Stage 2: Deploy primary regions one at a time
        - matchExpressions:
            - key: stage
              operator: In
              values:
                - primary
          maxUpdate: 1
  template:
    metadata:
      name: 'app-{{cluster}}'
      labels:
        region: '{{region}}'
        stage: '{{stage}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/app.git
        targetRevision: main
        path: k8s
      destination:
        name: '{{cluster}}'
        namespace: production
```

This implements a regional canary:
- Deploy to the first production region
- Expand to the remaining production regions after validation
- Limit primary-region rollout to one cluster at a time

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
        # Then medium priority, one at a time
        - matchExpressions:
            - key: priority
              operator: In
              values:
                - medium
          maxUpdate: 1
        # Finally low priority, all at once
        - matchExpressions:
            - key: priority
              operator: In
              values:
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
        - matchExpressions:
            - key: stage
              operator: In
              values:
                - "2"
          maxUpdate: 50%
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
          parameters:
            - name: replicas
              value: '{{replicas}}'
            - name: environment
              value: '{{environment}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{environment}}'
```

ApplicationSet RollingSync waits for each selected Application to reach `Healthy` before proceeding. Use Argo CD's built-in health checks, custom Lua health checks in `argocd-cm`, resource hooks, or Rollout analysis to make that health signal meaningful.

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
        - matchExpressions:
            - key: stage
              operator: In
              values:
                - "2"
          maxUpdate: 50%
        - matchExpressions:
            - key: stage
              operator: In
              values:
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
        # Stage 2 requires manual sync
        - matchExpressions:
            - key: stage
              operator: In
              values:
                - "2"
          maxUpdate: 0
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
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{environment}}'
      syncPolicy:
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

Set up Prometheus alerts for rollout issues. The `argocd_app_labels` metric is disabled by default, so enable Application label export for the labels you want to query:

```yaml
groups:
  - name: progressive-sync-alerts
    rules:
      - alert: CanaryDeploymentFailed
        expr: |
          argocd_app_info{health_status="Degraded"}
          and on (name, namespace, project)
          argocd_app_labels{label_stage="1"}
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Canary deployment failed"
          description: "Stage 1 deployment failed, rollout blocked"

      - alert: ProgressiveSyncStalled
        expr: |
          argocd_app_info{sync_status="OutOfSync"}
          and on (name, namespace, project)
          argocd_app_labels{label_stage=~"1|2|3"}
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Progressive sync appears stalled"
```

## Implementing rollback strategies

Configure retry behavior and a rollback procedure:

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
        - matchExpressions:
            - key: stage
              operator: In
              values:
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
