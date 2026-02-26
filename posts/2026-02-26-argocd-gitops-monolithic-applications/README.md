# How to Implement GitOps for Monolithic Applications with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Monolith, DevOps

Description: Learn how to manage monolithic application deployments with ArgoCD, covering containerization strategies, configuration management, database migrations, and deployment patterns for large applications.

---

GitOps and ArgoCD are not just for microservices. Monolithic applications - those large, single-deployable units that many businesses still run - benefit enormously from GitOps practices. In fact, monoliths often need GitOps more than microservices because they are harder to deploy, riskier to update, and more painful to roll back.

This guide shows you how to bring ArgoCD to your monolith.

## Why Monoliths Need GitOps

Monolithic applications typically have these deployment challenges:

- **Long build times** - A single build can take 20 to 60 minutes
- **All-or-nothing deployments** - You deploy the entire application or nothing
- **Complex configuration** - Dozens of environment variables, config files, and feature flags
- **Database coupling** - Schema changes must be coordinated with code deployment
- **Large blast radius** - A bad deployment affects all functionality

ArgoCD does not solve all of these problems, but it gives you a controlled, auditable, and reversible deployment process that makes monolith deployments significantly less stressful.

## Structuring the Git Repository

For a monolith, your config repository is simpler than a microservices setup:

```
my-monolith-config/
  base/
    deployment.yaml
    service.yaml
    ingress.yaml
    configmap.yaml
    hpa.yaml
    pdb.yaml
    kustomization.yaml
  overlays/
    dev/
      kustomization.yaml
      config-patch.yaml
    staging/
      kustomization.yaml
      config-patch.yaml
    production/
      kustomization.yaml
      config-patch.yaml
      hpa-patch.yaml
      resources-patch.yaml
  migrations/
    pre-sync-job.yaml
  monitoring/
    servicemonitor.yaml
    alerts.yaml
```

The base deployment for a monolith tends to be more complex than for a microservice:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-monolith
  labels:
    app: my-monolith
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Zero downtime - important for monoliths
  selector:
    matchLabels:
      app: my-monolith
  template:
    metadata:
      labels:
        app: my-monolith
    spec:
      terminationGracePeriodSeconds: 60  # Monoliths often need more time to drain
      containers:
        - name: app
          image: my-registry/my-monolith:v1.0.0
          ports:
            - containerPort: 8080
              name: http
            - containerPort: 8081
              name: management
          envFrom:
            - configMapRef:
                name: my-monolith-config
            - secretRef:
                name: my-monolith-secrets
          resources:
            requests:
              memory: "2Gi"     # Monoliths typically need more resources
              cpu: "1000m"
            limits:
              memory: "4Gi"
              cpu: "2000m"
          startupProbe:         # Use startup probe for slow-starting monoliths
            httpGet:
              path: /health
              port: management
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 30   # Allow up to 5 minutes to start
          readinessProbe:
            httpGet:
              path: /ready
              port: management
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /health
              port: management
            periodSeconds: 10
            failureThreshold: 3
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 15"]  # Allow LB to drain
```

## Handling Configuration

Monoliths often have extensive configuration. Use ConfigMaps with Kustomize patches per environment:

```yaml
# base/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-monolith-config
data:
  APP_NAME: "my-monolith"
  LOG_LEVEL: "info"
  CACHE_ENABLED: "true"
  CACHE_TTL: "300"
  MAX_CONNECTIONS: "100"
  FEATURE_NEW_CHECKOUT: "false"
  FEATURE_V2_API: "false"
```

```yaml
# overlays/production/config-patch.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-monolith-config
data:
  LOG_LEVEL: "warn"
  MAX_CONNECTIONS: "500"
  FEATURE_NEW_CHECKOUT: "true"
  FEATURE_V2_API: "false"    # Not yet in production
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: production
patches:
  - path: config-patch.yaml
  - path: hpa-patch.yaml
  - path: resources-patch.yaml
```

## Database Migrations

This is the trickiest part of deploying a monolith. Use ArgoCD PreSync hooks:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
    argocd.argoproj.io/sync-wave: "-1"
spec:
  backoffLimit: 0  # Do not retry - fail fast
  activeDeadlineSeconds: 300  # 5 minute timeout
  template:
    spec:
      containers:
        - name: migrate
          image: my-registry/my-monolith:v1.0.0  # Same image as the app
          command:
            - /bin/sh
            - -c
            - |
              echo "Running database migrations..."
              ./manage.py migrate --no-input
              echo "Migrations complete."
          envFrom:
            - secretRef:
                name: my-monolith-db-secrets
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
      restartPolicy: Never
```

Important considerations:

- **Forward-compatible migrations only**: Each migration must work with both the old and new code versions. This way, if the deployment fails after the migration runs, the old code still works.
- **Never drop columns or tables** in the same release that removes the code using them. Do it in two releases.
- **Set a deadline**: If the migration takes too long, fail the sync rather than blocking indefinitely.

## The ArgoCD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-monolith-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/my-monolith-config.git
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true     # Better for large manifests
      - RespectIgnoreDifferences=true
    retry:
      limit: 3
      backoff:
        duration: 30s
        factor: 2
        maxDuration: 5m
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas   # HPA manages replicas
```

## Deployment Strategies for Monoliths

### Rolling Update (Default)

For most monoliths, a rolling update with zero-downtime settings works well:

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

This adds one new pod before removing an old one, ensuring no downtime.

### Blue-Green with Argo Rollouts

For monoliths where you need to validate the new version before routing traffic:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-monolith
spec:
  replicas: 3
  strategy:
    blueGreen:
      activeService: my-monolith-active
      previewService: my-monolith-preview
      autoPromotionEnabled: false    # Require manual promotion
      prePromotionAnalysis:
        templates:
          - templateName: monolith-health-check
      scaleDownDelaySeconds: 300     # Keep old version around for 5 min after switch
  selector:
    matchLabels:
      app: my-monolith
  template:
    # ... same as Deployment template
```

This lets you:
1. Deploy the new version alongside the old one
2. Test it via the preview service
3. Manually promote when satisfied
4. Automatically roll back if health checks fail

### Canary (When Possible)

If your monolith sits behind a service mesh or supports traffic splitting:

```yaml
spec:
  strategy:
    canary:
      steps:
        - setWeight: 5           # Start small - monoliths are risky
        - pause: {duration: 10m} # Watch carefully
        - setWeight: 20
        - pause: {duration: 10m}
        - setWeight: 50
        - pause: {duration: 10m}
        - setWeight: 100
```

## Feature Flags Integration

Monoliths often use feature flags to decouple deployment from release. Integrate this with ArgoCD:

```yaml
# Update feature flags via ConfigMap patches
# overlays/production/feature-flags.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-monolith-config
data:
  FEATURE_NEW_CHECKOUT: "true"     # Enable for production
  FEATURE_V2_API: "false"          # Not ready yet
  FEATURE_DARK_MODE: "true"        # Rolled out last week
```

This way, you can deploy new code with features disabled, then enable them through a separate Git commit. If a feature causes issues, disable it with another commit without rolling back the entire deployment.

## Scaling Considerations

Monoliths are harder to scale than microservices. Configure HPA carefully:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-monolith
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-monolith
  minReplicas: 3
  maxReplicas: 10
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 120   # Wait before scaling up (monoliths are slow to start)
      policies:
        - type: Pods
          value: 1                       # Add one pod at a time
          periodSeconds: 120
    scaleDown:
      stabilizationWindowSeconds: 300    # Wait 5 min before scaling down
      policies:
        - type: Pods
          value: 1
          periodSeconds: 180
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

Tell ArgoCD to ignore the replica count since HPA manages it:

```yaml
# In the Application spec
ignoreDifferences:
  - group: apps
    kind: Deployment
    jsonPointers:
      - /spec/replicas
```

## Post-Deploy Verification

Add a PostSync hook to verify the monolith is working correctly after deployment:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: post-deploy-verify
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: verify
          image: curlimages/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              echo "Verifying deployment..."
              # Check main endpoint
              curl -f http://my-monolith.production.svc.cluster.local/health || exit 1
              # Check critical paths
              curl -f http://my-monolith.production.svc.cluster.local/api/v1/status || exit 1
              echo "All checks passed."
      restartPolicy: Never
```

## Conclusion

Monoliths might seem like a poor fit for GitOps, but they actually benefit more from the structure and control that ArgoCD provides. The key is handling the unique challenges - slow startups, database migrations, large blast radius - with the right Kubernetes and ArgoCD configurations. Start with rolling updates, add PreSync migration jobs, and consider blue-green deployments for critical releases.

For monitoring your monolith's health, performance, and availability, [OneUptime](https://oneuptime.com) provides comprehensive observability that works alongside ArgoCD's deployment management.
