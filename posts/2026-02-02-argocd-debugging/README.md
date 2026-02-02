# How to Debug ArgoCD Sync Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Kubernetes, GitOps, DevOps, Debugging, CI/CD, Troubleshooting

Description: A practical guide to debugging ArgoCD sync issues, covering common problems like OutOfSync status, sync failures, resource hooks, and performance bottlenecks with actionable solutions.

---

ArgoCD sync issues can bring your GitOps workflow to a halt. When your application shows "OutOfSync" or "SyncFailed" status, you need a systematic approach to identify and resolve the problem. In this guide, we will walk through the most common sync issues and provide practical debugging techniques.

## Understanding ArgoCD Sync States

Before diving into debugging, let us understand the different sync states in ArgoCD.

```mermaid
stateDiagram-v2
    [*] --> Unknown
    Unknown --> Synced: Sync Successful
    Unknown --> OutOfSync: Drift Detected
    Unknown --> SyncFailed: Sync Error

    Synced --> OutOfSync: Git Change
    Synced --> OutOfSync: Manual Change

    OutOfSync --> Synced: Auto/Manual Sync
    OutOfSync --> SyncFailed: Sync Error

    SyncFailed --> Synced: Issue Fixed
    SyncFailed --> OutOfSync: Partial Sync
```

Key states explained:
- **Synced** - Live state matches desired state in Git
- **OutOfSync** - Live state differs from desired state
- **Unknown** - ArgoCD cannot determine the state
- **SyncFailed** - Sync operation encountered an error

## Essential Debugging Commands

Master these commands to quickly diagnose sync issues.

### Check Application Status

The following command displays the current sync status, health status, and any error messages for your application.

```bash
# Get detailed application status
argocd app get myapp

# Get status in YAML format for detailed inspection
argocd app get myapp -o yaml

# List all applications with their sync status
argocd app list
```

### View Sync Differences

Use the diff command to see exactly what resources differ between Git and the live cluster.

```bash
# Show differences between desired and live state
argocd app diff myapp

# Show diff with local manifests (useful for testing changes)
argocd app diff myapp --local ./k8s/overlays/production
```

### Force Refresh and Sync

When ArgoCD cache becomes stale, force a refresh to get the latest state from both Git and the cluster.

```bash
# Soft refresh - reconcile from cache
argocd app get myapp --refresh

# Hard refresh - clear cache and fetch fresh data
argocd app get myapp --hard-refresh

# Sync with prune to remove orphaned resources
argocd app sync myapp --prune

# Sync specific resources only
argocd app sync myapp --resource apps:Deployment:myapp
```

## Common Sync Issues and Solutions

### Issue 1: OutOfSync Due to Ignored Fields

ArgoCD compares live state with desired state, but some fields change automatically (like replica counts managed by HPA).

```mermaid
flowchart TD
    A[Application OutOfSync] --> B{Check Diff}
    B --> C[Metadata Fields?]
    B --> D[Replica Count?]
    B --> E[Resource Limits?]

    C --> F[Add to ignoreDifferences]
    D --> G[Exclude from comparison]
    E --> H[Verify resource definitions]

    F --> I[Sync Success]
    G --> I
    H --> I
```

Configure your Application to ignore fields that are managed externally or added automatically by Kubernetes.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/myapp.git
    path: k8s/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  # Ignore differences in fields managed by other controllers
  ignoreDifferences:
    # Ignore replica count managed by HPA
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
    # Ignore webhook CA bundle injected by cert-manager
    - group: admissionregistration.k8s.io
      kind: MutatingWebhookConfiguration
      jqPathExpressions:
        - '.webhooks[]?.clientConfig.caBundle'
    # Ignore all metadata annotations added by controllers
    - group: "*"
      kind: "*"
      managedFieldsManagers:
        - kube-controller-manager
```

### Issue 2: Sync Failed Due to Resource Validation

Kubernetes rejects invalid resource definitions during sync.

Identify validation errors by running a dry-run sync and checking the detailed error messages.

```bash
# Run dry-run to catch validation errors without applying
argocd app sync myapp --dry-run

# Check ArgoCD controller logs for detailed errors
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller --tail=100

# Validate manifests locally before pushing to Git
kubectl apply --dry-run=server -f manifest.yaml
```

Common validation fixes:

```yaml
# Fix 1: Resource name too long (max 63 characters)
# Bad
metadata:
  name: my-application-service-backend-api-gateway-processor-v2

# Good
metadata:
  name: myapp-api-gateway-v2

---
# Fix 2: Invalid label values (must match regex [a-z0-9A-Z-_.])
# Bad
metadata:
  labels:
    version: "1.0.0/beta"

# Good
metadata:
  labels:
    version: "1.0.0-beta"

---
# Fix 3: Missing required fields
# Bad - missing selector
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
        - name: app
          image: myapp:latest

# Good - includes required selector
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: app
          image: myapp:latest
```

### Issue 3: Sync Stuck in Progressing State

When sync operations hang, investigate resource health checks and hooks.

```mermaid
flowchart TD
    A[Sync Stuck Progressing] --> B{Identify Blocker}

    B --> C[PreSync Hook Failed]
    B --> D[Resource Not Healthy]
    B --> E[Finalizer Blocking]

    C --> F[Check Job/Pod Logs]
    D --> G[Check Pod Status]
    E --> H[Remove Finalizer]

    F --> I{Hook Successful?}
    I -->|No| J[Fix Hook Script]
    I -->|Yes| K[Continue Sync]

    G --> L{Pod Running?}
    L -->|No| M[Fix Pod Issues]
    L -->|Yes| N[Check Health Check]

    H --> O[Delete Stuck Resource]
```

Debug stuck syncs with these commands.

```bash
# List all resources managed by the application
argocd app resources myapp

# Check which resources are not healthy
argocd app resources myapp --health-status Degraded
argocd app resources myapp --health-status Progressing

# Get details on a specific resource
kubectl describe deployment myapp -n production

# Check if hooks are blocking
kubectl get jobs -n production -l argocd.argoproj.io/hook

# View hook job logs
kubectl logs -n production job/db-migrate
```

Fix stuck PreSync hooks.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  annotations:
    argocd.argoproj.io/hook: PreSync
    # Delete hook if it fails to allow retries
    argocd.argoproj.io/hook-delete-policy: HookFailed
spec:
  # Set a deadline to prevent infinite hanging
  activeDeadlineSeconds: 300
  backoffLimit: 3
  template:
    spec:
      containers:
        - name: migrate
          image: myapp:latest
          command: ["./migrate.sh"]
          # Add resource limits to prevent OOM
          resources:
            limits:
              memory: "256Mi"
              cpu: "200m"
      restartPolicy: Never
```

### Issue 4: Git Repository Connection Errors

ArgoCD cannot fetch manifests from your Git repository.

Check repository connectivity and authentication status.

```bash
# List configured repositories
argocd repo list

# Test repository connection
argocd repo get https://github.com/myorg/myapp.git

# Check ArgoCD repo-server logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server --tail=100
```

Fix repository authentication issues.

```yaml
# For HTTPS with token authentication
apiVersion: v1
kind: Secret
metadata:
  name: private-repo-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.com/myorg/myapp.git
  username: git
  password: ghp_your_personal_access_token

---
# For SSH authentication
apiVersion: v1
kind: Secret
metadata:
  name: private-repo-ssh
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: git@github.com:myorg/myapp.git
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    your-private-key-here
    -----END OPENSSH PRIVATE KEY-----
```

### Issue 5: Resource Already Exists Error

ArgoCD fails because resources were created outside of ArgoCD.

```mermaid
flowchart TD
    A[Resource Already Exists] --> B{Who Created It?}

    B --> C[Created Manually]
    B --> D[Another ArgoCD App]
    B --> E[Helm Release]

    C --> F[Adopt with Annotation]
    D --> G[Move to Correct App]
    E --> H[Delete Helm Release]

    F --> I[Add argocd tracking label]
    G --> J[Update Application Scope]
    H --> K[Let ArgoCD Manage]
```

Adopt existing resources into ArgoCD management.

```bash
# Add ArgoCD tracking annotation to existing resource
kubectl annotate deployment myapp -n production \
  argocd.argoproj.io/tracking-id="myapp:apps/Deployment:production/myapp"

# Or use label-based tracking (configure in argocd-cm)
kubectl label deployment myapp -n production \
  app.kubernetes.io/instance=myapp
```

Configure ArgoCD to handle existing resources.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
spec:
  syncPolicy:
    syncOptions:
      # Allow ArgoCD to adopt existing resources
      - CreateNamespace=true
      - RespectIgnoreDifferences=true
      # Use server-side apply for better conflict resolution
      - ServerSideApply=true
```

### Issue 6: Sync Waves Not Executing in Order

Resources deploy out of order despite sync wave annotations.

Verify sync wave annotations are correctly applied.

```bash
# Check sync wave values on resources
kubectl get all -n production -o jsonpath='{range .items[*]}{.kind}/{.metadata.name}: {.metadata.annotations.argocd\.argoproj\.io/sync-wave}{"\n"}{end}'
```

Properly configure sync waves for dependency ordering.

```yaml
# Wave -1: CRDs and cluster-scoped resources
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: databases.example.com
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  # CRD spec here

---
# Wave 0: Namespaces and RBAC
apiVersion: v1
kind: Namespace
metadata:
  name: production
  annotations:
    argocd.argoproj.io/sync-wave: "0"

---
# Wave 1: ConfigMaps and Secrets
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "1"
data:
  config.yaml: |
    database:
      host: postgres

---
# Wave 2: Services (create before deployments for DNS)
apiVersion: v1
kind: Service
metadata:
  name: myapp
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "2"
spec:
  selector:
    app: myapp
  ports:
    - port: 80

---
# Wave 3: Deployments
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "3"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: app
          image: myapp:v1.2.3
```

### Issue 7: Health Check Failures

ArgoCD reports Degraded health even when pods are running.

```mermaid
flowchart TD
    A[Health Status Degraded] --> B{Check Health Type}

    B --> C[Deployment Not Available]
    B --> D[Custom Resource Unknown]
    B --> E[Ingress Not Ready]

    C --> F[Check Pod Status]
    C --> G[Check Readiness Probe]

    D --> H[Add Custom Health Check]

    E --> I[Check Ingress Controller]
    E --> J[Verify Backend Service]

    F --> K[Fix Container Issues]
    G --> L[Adjust Probe Settings]
    H --> M[Configure in argocd-cm]
```

Add custom health checks for CRDs that ArgoCD does not understand.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Custom health check for Kafka topics
  resource.customizations.health.kafka.strimzi.io_KafkaTopic: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.conditions ~= nil then
        for i, condition in ipairs(obj.status.conditions) do
          if condition.type == "Ready" and condition.status == "True" then
            hs.status = "Healthy"
            hs.message = "Topic is ready"
            return hs
          end
        end
      end
    end
    hs.status = "Progressing"
    hs.message = "Waiting for topic to be ready"
    return hs

  # Custom health check for Certificates
  resource.customizations.health.cert-manager.io_Certificate: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.conditions ~= nil then
        for i, condition in ipairs(obj.status.conditions) do
          if condition.type == "Ready" then
            if condition.status == "True" then
              hs.status = "Healthy"
              hs.message = "Certificate is valid"
              return hs
            else
              hs.status = "Degraded"
              hs.message = condition.message
              return hs
            end
          end
        end
      end
    end
    hs.status = "Progressing"
    hs.message = "Waiting for certificate"
    return hs
```

## Debugging ArgoCD Components

When application-level debugging does not reveal the issue, investigate ArgoCD system components.

### Check Controller Logs

The application controller reconciles applications and detects drift.

```bash
# View controller logs with error filtering
kubectl logs -n argocd deployment/argocd-application-controller --tail=500 | grep -i error

# Watch controller logs in real-time
kubectl logs -n argocd deployment/argocd-application-controller -f

# Check controller metrics for reconciliation issues
kubectl port-forward -n argocd svc/argocd-metrics 8082:8082
# Then visit http://localhost:8082/metrics
```

### Check Repo Server Logs

The repo server clones repositories and generates manifests.

```bash
# View repo server logs
kubectl logs -n argocd deployment/argocd-repo-server --tail=500

# Check for manifest generation errors
kubectl logs -n argocd deployment/argocd-repo-server | grep -i "error\|failed"

# Restart repo server to clear cached manifests
kubectl rollout restart deployment/argocd-repo-server -n argocd
```

### Check Server Logs

The API server handles UI and CLI requests.

```bash
# View server logs
kubectl logs -n argocd deployment/argocd-server --tail=500

# Check for authentication or API errors
kubectl logs -n argocd deployment/argocd-server | grep -i "unauthorized\|forbidden"
```

## Performance Troubleshooting

Slow syncs and timeouts indicate performance problems.

```mermaid
flowchart TD
    A[Slow Sync Performance] --> B{Identify Bottleneck}

    B --> C[Large Repository]
    B --> D[Many Applications]
    B --> E[Complex Manifests]

    C --> F[Enable Shallow Clone]
    C --> G[Split Repository]

    D --> H[Increase Controller Replicas]
    D --> I[Shard Applications]

    E --> J[Optimize Kustomize]
    E --> K[Cache Helm Charts]
```

### Optimize Repository Performance

Large repositories slow down manifest generation.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
spec:
  source:
    repoURL: https://github.com/myorg/myapp.git
    path: k8s/production
    # Specify exact revision instead of HEAD
    targetRevision: v1.2.3
  # Reduce refresh frequency for stable applications
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    # Adjust sync intervals
    syncOptions:
      - ApplyOutOfSyncOnly=true
```

Configure repo server for large repositories.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Increase timeout for large repos
  reposerver.git.request.timeout: "300"
  # Enable shallow clones
  reposerver.git.lsremote.parallelism: "20"
```

### Scale ArgoCD for Many Applications

Handle hundreds of applications with proper scaling.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-application-controller
  namespace: argocd
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: argocd-application-controller
          env:
            # Increase parallel operations
            - name: ARGOCD_CONTROLLER_STATUS_PROCESSORS
              value: "50"
            - name: ARGOCD_CONTROLLER_OPERATION_PROCESSORS
              value: "25"
            # Increase reconciliation timeout
            - name: ARGOCD_RECONCILIATION_TIMEOUT
              value: "300s"
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
            limits:
              cpu: "4"
              memory: "8Gi"
```

## Creating a Debugging Checklist

Use this systematic approach when facing sync issues.

```mermaid
flowchart TD
    A[Sync Issue Detected] --> B[1. Check App Status]
    B --> C[argocd app get myapp]

    C --> D[2. View Differences]
    D --> E[argocd app diff myapp]

    E --> F[3. Check Resources]
    F --> G[argocd app resources myapp]

    G --> H[4. Review Logs]
    H --> I[kubectl logs controller]

    I --> J[5. Test Locally]
    J --> K[kubectl apply --dry-run]

    K --> L{Issue Found?}
    L -->|Yes| M[Apply Fix]
    L -->|No| N[Escalate/Search Docs]

    M --> O[Verify Sync]
    O --> P[Document Solution]
```

### Quick Reference Commands

Save these commands for rapid debugging.

```bash
#!/bin/bash
# argocd-debug.sh - Quick debugging script

APP_NAME=${1:-myapp}

echo "=== Application Status ==="
argocd app get $APP_NAME

echo -e "\n=== Sync Differences ==="
argocd app diff $APP_NAME

echo -e "\n=== Resource Health ==="
argocd app resources $APP_NAME

echo -e "\n=== Recent Events ==="
kubectl get events -n argocd --field-selector involvedObject.name=$APP_NAME --sort-by='.lastTimestamp' | tail -20

echo -e "\n=== Controller Errors ==="
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller --tail=50 | grep -i "error\|$APP_NAME"

echo -e "\n=== Repo Server Errors ==="
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server --tail=50 | grep -i "error\|failed"
```

---

Debugging ArgoCD sync issues becomes straightforward once you understand the sync lifecycle and know which components to investigate. Start with application-level commands like `argocd app get` and `argocd app diff`, then drill down into controller and repo server logs when needed. Keep your debugging script handy, and document solutions for recurring issues to build your team's GitOps knowledge base.
