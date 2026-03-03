# How to Manage Serverless Configurations with GitOps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Serverless, Configuration Management

Description: Learn how to manage serverless platform configurations including scaling policies, runtime settings, and environment variables through ArgoCD GitOps workflows.

---

Serverless platforms on Kubernetes have a lot of configuration surface area - scaling policies, runtime versions, environment variables, resource limits, event sources, and more. When this configuration is scattered across CLI commands and manual edits, you lose visibility and repeatability. GitOps through ArgoCD brings all serverless configuration under version control.

This guide covers managing serverless configurations across Knative, OpenFaaS, and KEDA-based setups using ArgoCD.

## The Configuration Challenge

A typical serverless setup involves multiple layers of configuration:

```mermaid
graph TD
    A[Platform Config] --> B[Runtime Config]
    A --> C[Scaling Config]
    A --> D[Networking Config]
    B --> E[Function-Level Config]
    C --> E
    D --> E
    E --> F[Environment Variables]
    E --> G[Secrets]
    E --> H[Resource Limits]
```

Each layer needs to be consistent across environments and auditable for compliance. ArgoCD handles this naturally.

## Structuring Configuration in Git

Organize your serverless configuration with clear separation between platform and application concerns:

```text
serverless-config/
  platform/
    knative/
      config-autoscaler.yaml
      config-defaults.yaml
      config-domain.yaml
      config-features.yaml
      config-network.yaml
    keda/
      keda-operator.yaml
      scaled-objects/
  functions/
    base/
      function-a/
        function.yaml
        config.yaml
      function-b/
        function.yaml
        config.yaml
    overlays/
      dev/
        kustomization.yaml
      staging/
        kustomization.yaml
      production/
        kustomization.yaml
```

## Platform-Level Configuration

Knative's behavior is controlled through ConfigMaps in the knative-serving namespace. Manage these through ArgoCD:

```yaml
# platform/knative/config-defaults.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-defaults
  namespace: knative-serving
data:
  # Default container concurrency
  container-concurrency: "0"

  # Default revision timeout
  revision-timeout-seconds: "300"

  # Default CPU request for containers
  revision-cpu-request: "100m"
  revision-memory-request: "128Mi"
  revision-cpu-limit: "1000m"
  revision-memory-limit: "512Mi"

  # Default max scale
  max-revision-timeout-seconds: "600"

  # Enable multi-container support
  enable-multi-container: "true"
```

```yaml
# platform/knative/config-features.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-features
  namespace: knative-serving
data:
  # Enable affinity, tolerations, node selectors in Knative Services
  kubernetes.podspec-affinity: "enabled"
  kubernetes.podspec-tolerations: "enabled"
  kubernetes.podspec-nodeselector: "enabled"

  # Enable init containers
  kubernetes.podspec-init-containers: "enabled"

  # Enable volume projections
  kubernetes.podspec-volumes-emptydir: "enabled"

  # Tag header routing
  tag-header-based-routing: "enabled"
```

Create the ArgoCD Application for platform config:

```yaml
# platform-config-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: serverless-platform-config
  namespace: argocd
spec:
  project: platform
  source:
    repoURL: https://github.com/myorg/serverless-config.git
    path: platform
    targetRevision: main
    directory:
      recurse: true
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
      - ServerSideApply=true
```

## KEDA Scaled Objects for Event-Driven Scaling

KEDA (Kubernetes Event-Driven Autoscaler) extends Kubernetes autoscaling with event sources. Manage ScaledObjects through ArgoCD:

```yaml
# platform/keda/scaled-objects/queue-processor.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: queue-processor-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: queue-processor
  pollingInterval: 15
  cooldownPeriod: 120
  minReplicaCount: 0
  maxReplicaCount: 50
  triggers:
    - type: rabbitmq
      metadata:
        host: amqp://guest:guest@rabbitmq.default.svc.cluster.local:5672/
        queueName: orders
        queueLength: "10"  # Scale up when more than 10 messages per pod
    - type: cron
      metadata:
        timezone: America/New_York
        start: "0 8 * * *"
        end: "0 20 * * *"
        desiredReplicas: "5"  # Keep at least 5 during business hours
```

```yaml
# platform/keda/scaled-objects/api-scaler.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: api-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: api-function
  pollingInterval: 10
  cooldownPeriod: 60
  minReplicaCount: 2
  maxReplicaCount: 100
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus.monitoring.svc.cluster.local:9090
        metricName: http_requests_per_second
        query: sum(rate(http_requests_total{service="api-function"}[1m]))
        threshold: "50"
```

## Environment-Specific Configuration

Use Kustomize overlays to manage environment differences. The base defines the function, overlays customize per environment:

```yaml
# functions/base/function-a/function.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: function-a
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/target: "100"
    spec:
      containers:
        - image: ghcr.io/myorg/function-a:latest
          ports:
            - containerPort: 8080
          envFrom:
            - configMapRef:
                name: function-a-config
```

```yaml
# functions/base/function-a/config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: function-a-config
data:
  LOG_LEVEL: info
  CACHE_TTL: "300"
  DB_POOL_SIZE: "5"
```

```yaml
# functions/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/function-a
patches:
  - target:
      kind: ConfigMap
      name: function-a-config
    patch: |
      - op: replace
        path: /data/LOG_LEVEL
        value: warn
      - op: replace
        path: /data/DB_POOL_SIZE
        value: "20"
  - target:
      kind: Service
      name: function-a
      group: serving.knative.dev
    patch: |
      - op: replace
        path: /spec/template/metadata/annotations/autoscaling.knative.dev~1target
        value: "200"
      - op: add
        path: /spec/template/metadata/annotations/autoscaling.knative.dev~1min-scale
        value: "3"
      - op: add
        path: /spec/template/metadata/annotations/autoscaling.knative.dev~1max-scale
        value: "50"
```

## Secret Configuration

Never store secrets in plain text. Use External Secrets Operator with ArgoCD:

```yaml
# functions/base/function-a/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: function-a-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: function-a-secrets
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: production/function-a/database-url
    - secretKey: API_KEY
      remoteRef:
        key: production/function-a/api-key
```

Reference the secret in your function:

```yaml
spec:
  template:
    spec:
      containers:
        - image: ghcr.io/myorg/function-a:latest
          envFrom:
            - configMapRef:
                name: function-a-config
            - secretRef:
                name: function-a-secrets
```

## Configuration Validation with PreSync Hooks

Validate configuration before ArgoCD applies it:

```yaml
# hooks/validate-config.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: validate-serverless-config
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: validate
          image: bitnami/kubectl:latest
          command:
            - /bin/sh
            - -c
            - |
              # Validate that all referenced ConfigMaps exist
              echo "Checking configuration references..."

              # Verify Knative config maps have required keys
              CM=$(kubectl get cm config-autoscaler -n knative-serving -o json 2>/dev/null)
              if [ -z "$CM" ]; then
                echo "ERROR: config-autoscaler ConfigMap not found"
                exit 1
              fi

              echo "Configuration validation passed."
      restartPolicy: Never
  backoffLimit: 1
```

## Configuration Drift Detection

ArgoCD automatically detects when someone changes configuration manually. With self-heal enabled, it reverts unauthorized changes:

```yaml
syncPolicy:
  automated:
    selfHeal: true  # Revert manual ConfigMap edits
    prune: true     # Remove resources deleted from Git
```

This is especially important for serverless configuration because scaling parameters and resource limits directly affect cost and reliability.

## Summary

Managing serverless configurations through ArgoCD and GitOps gives you consistent, auditable, and environment-aware configuration management. Platform settings, scaling policies, environment variables, and secrets all live in Git with environment-specific overlays. Every configuration change is reviewed, versioned, and automatically applied. ArgoCD's self-heal prevents configuration drift, ensuring your serverless platform runs exactly as defined in your repository.
