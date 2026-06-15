# How to Implement Sync Waves in ArgoCD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Sync Waves, Kubernetes, Deployment, GitOps, Orchestration

Description: Master ArgoCD sync waves to control the order of resource deployment, ensuring dependencies are created before the resources that need them, with practical examples for common scenarios.

---

Kubernetes controllers reconcile resources independently, but sometimes order matters. Your application cannot start if the database is not ready. Your pods cannot run if the namespace does not exist. Sync waves give you fine-grained control over deployment ordering.

## What Are Sync Waves?

Sync waves let you group resources and deploy them in sequence. Resources in the same wave deploy together. Lower numbered waves deploy before higher ones.

```mermaid
flowchart LR
    subgraph wave_m1[Wave -1]
        CRD[CRDs]
    end

    subgraph wave_0[Wave 0]
        NS[Namespace]
        SA[ServiceAccount]
    end

    subgraph wave_1[Wave 1]
        CM[ConfigMap]
        Secret[Secret]
    end

    subgraph wave_2[Wave 2]
        Deploy[Deployment]
        SVC[Service]
    end

    wave_m1 --> wave_0
    wave_0 --> wave_1
    wave_1 --> wave_2
```

ArgoCD processes waves from lowest to highest number. Negative numbers run before zero. Resources without a wave annotation default to wave 0.

## Basic Sync Wave Usage

Add the sync wave annotation to any Kubernetes resource:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: myapp
  annotations:
    # This resource deploys in wave 0
    argocd.argoproj.io/sync-wave: "0"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
  namespace: myapp
  annotations:
    # This deploys after the namespace
    argocd.argoproj.io/sync-wave: "1"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
  annotations:
    # This deploys after the configmap
    argocd.argoproj.io/sync-wave: "2"
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
        - name: myapp
          image: myapp:latest
          envFrom:
            - configMapRef:
                name: myapp-config
```

## Common Sync Wave Patterns

### CRDs Before Custom Resources

Custom Resource Definitions must exist before you create instances:

```yaml
# Wave -1: Install the CRD first

apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: certificates.cert-manager.io
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  group: cert-manager.io
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              x-kubernetes-preserve-unknown-fields: true
  scope: Namespaced
  names:
    plural: certificates
    singular: certificate
    kind: Certificate

---
# Wave 1: Now we can create certificates
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: myapp-tls
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  secretName: myapp-tls
  issuerRef:
    name: letsencrypt
    kind: ClusterIssuer
  dnsNames:
    - myapp.example.com
```

### Infrastructure Before Applications

Deploy shared infrastructure components first:

```yaml
# Wave -2: Namespace
apiVersion: v1
kind: Namespace
metadata:
  name: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "-2"

---
# Wave -1: RBAC and service accounts
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp
  namespace: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "-1"

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: myapp
  namespace: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
rules:
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list", "watch"]

---
# Wave 0: Configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
  namespace: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "0"
data:
  DATABASE_URL: "postgres://postgres:password@postgres:5432/myapp"

---
# Wave 1: Database service
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  ports:
    - port: 5432
      targetPort: 5432
  selector:
    app: postgres

---
# Wave 1: Database
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15
          env:
            - name: POSTGRES_PASSWORD
              value: password
          ports:
            - containerPort: 5432

---
# Wave 2: Application
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "2"
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
      serviceAccountName: myapp
      containers:
        - name: myapp
          image: myapp:latest
```

### Database Migrations

Run migrations after the database is up but before the app starts:

```yaml
# Wave 1: Database
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  # ... postgres config

---
# Wave 2: Migration job
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  annotations:
    argocd.argoproj.io/hook: Sync
    argocd.argoproj.io/sync-wave: "2"
    # Clean up after success
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: myapp:latest
          command: ["./migrate.sh"]
          env:
            - name: DATABASE_URL
              value: "postgres://postgres:password@postgres:5432/myapp"
      restartPolicy: Never
  backoffLimit: 3

---
# Wave 3: Application (after migrations complete)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "3"
spec:
  # ... app config
```

## Sync Wave with Health Checks

ArgoCD waits for resources to become healthy before moving to the next wave. This is powerful but requires proper health checks.

```yaml
# Wave 1: Database must be healthy before wave 2 starts
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15
          env:
            - name: POSTGRES_PASSWORD
              value: password
          # Health check ensures postgres is ready
          readinessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - postgres
            initialDelaySeconds: 5
            periodSeconds: 5
          livenessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - postgres
            initialDelaySeconds: 30
            periodSeconds: 10
```

## Sync Options for Waves

### Skip Dry Run for Missing Resources

Sometimes a controller creates a CRD outside of the same sync. Use `SkipDryRunOnMissingResource=true` so ArgoCD does not fail dry run before that resource type exists:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-team-label
  annotations:
    argocd.argoproj.io/sync-wave: "1"
    # Skip dry run if the CRD is created by another controller
    argocd.argoproj.io/sync-options: SkipDryRunOnMissingResource=true
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Namespace"]
  parameters:
    labels: ["team"]
```

### Replace Instead of Apply

Use replace/create instead of apply for resources that cannot use client-side apply:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: one-time-job
  annotations:
    argocd.argoproj.io/sync-wave: "2"
    argocd.argoproj.io/sync-options: Replace=true
```

## Sync Waves with Helm

When using Helm charts, add annotations in your templates:

```yaml
# templates/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Release.Namespace }}
  annotations:
    argocd.argoproj.io/sync-wave: "-1"

---
# templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-config
  annotations:
    argocd.argoproj.io/sync-wave: "0"
data:
  {{- toYaml .Values.config | nindent 2 }}

---
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
  annotations:
    argocd.argoproj.io/sync-wave: "1"
```

## Sync Waves with Kustomize

Add annotations via patches:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml

patches:
  - target:
      kind: ConfigMap
      name: myapp-config
    patch: |
      apiVersion: v1
      kind: ConfigMap
      metadata:
        name: myapp-config
        annotations:
          argocd.argoproj.io/sync-wave: "0"
  - target:
      kind: Deployment
      name: myapp
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: myapp
        annotations:
          argocd.argoproj.io/sync-wave: "1"
```

## Debugging Sync Waves

### Check Sync Status

```bash
# See sync status and the current operation
argocd app get myapp --show-operation

# Watch sync progress
argocd app sync myapp --watch
```

### View Resource Order

```bash
# Print generated manifests and inspect sync-wave annotations
argocd app manifests myapp | grep -B 5 "argocd.argoproj.io/sync-wave"
```

### Common Issues

**Stuck on a wave:**
- Check if the resource has a failing health check
- Look for pods in CrashLoopBackOff
- Verify dependencies are actually ready

```bash
kubectl get pods -n myapp
kubectl describe pod -n myapp <pod-name>
```

**Wrong order:**
- Verify annotations are on the right resources
- Remember: lower numbers sync first
- Check for typos in annotation names

```bash
kubectl get deployment myapp -o yaml | grep sync-wave
```

## Best Practices

### Use Consistent Wave Numbers

Establish a convention for your team:

| Wave | Purpose |
|------|---------|
| -5   | CRDs, Operators |
| -3   | Namespaces |
| -1   | RBAC, ServiceAccounts |
| 0    | ConfigMaps, Secrets |
| 1    | Databases, Caches |
| 2    | Migrations, Init Jobs |
| 3    | Applications |
| 5    | Ingress, External Services |

### Do Not Over-Engineer

Not everything needs a sync wave. Use them only when you have actual dependencies:

```yaml
# These can sync together (no dependency)
apiVersion: v1
kind: Service
metadata:
  name: myapp
  # No sync wave needed

---
apiVersion: v1
kind: Service
metadata:
  name: myapp-internal
  # No sync wave needed
```

### Document Dependencies

Add comments explaining why sync waves are needed:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  annotations:
    # Wave 2: Requires database from wave 1 to be healthy
    argocd.argoproj.io/sync-wave: "2"
```

---

Sync waves bring order to deployments. Start simple by separating infrastructure from applications, then add more granularity as needed. The combination of sync waves and health checks ensures your deployments happen in the right order without manual intervention.
