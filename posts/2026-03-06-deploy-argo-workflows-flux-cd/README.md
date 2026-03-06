# How to Deploy Argo Workflows with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, argo workflows, kubernetes, gitops, helm, workflow engine, ci/cd

Description: A practical guide to deploying Argo Workflows on Kubernetes using Flux CD for GitOps-managed workflow orchestration.

---

## Introduction

Argo Workflows is a container-native workflow engine for Kubernetes that allows you to define and run complex workflows as DAGs (Directed Acyclic Graphs) or step-based sequences. Deploying Argo Workflows with Flux CD ensures that your workflow engine configuration, templates, and RBAC are all version-controlled and automatically reconciled.

This guide covers the full deployment of Argo Workflows, including the server, controller, artifact storage, and sample workflow templates.

## Prerequisites

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped
- kubectl access to the cluster
- An S3-compatible object store for artifact storage (optional but recommended)

## Repository Structure

```
clusters/
  production/
    argo-workflows/
      namespace.yaml
      source.yaml
      release.yaml
      rbac.yaml
      artifact-config.yaml
      workflow-templates/
        ci-pipeline.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/production/argo-workflows/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: argo
  labels:
    app.kubernetes.io/part-of: argo-workflows
```

## Step 2: Add the Argo Helm Repository

```yaml
# clusters/production/argo-workflows/source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: argo
  namespace: flux-system
spec:
  # Official Argo project Helm charts
  url: https://argoproj.github.io/argo-helm
  interval: 1h
```

## Step 3: Configure Artifact Storage

Argo Workflows uses artifact storage for passing data between workflow steps. Configure an S3-compatible backend.

```yaml
# clusters/production/argo-workflows/artifact-config.yaml
apiVersion: v1
kind: Secret
metadata:
  name: argo-artifacts-s3
  namespace: argo
type: Opaque
stringData:
  # S3 credentials for artifact storage
  accessKey: "your-access-key"
  secretKey: "your-secret-key"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: artifact-repositories
  namespace: argo
  annotations:
    # Mark as default artifact repository
    workflows.argoproj.io/default-artifact-repository: default-s3
data:
  default-s3: |
    s3:
      bucket: argo-artifacts
      endpoint: s3.amazonaws.com
      region: us-east-1
      accessKeySecret:
        name: argo-artifacts-s3
        key: accessKey
      secretKeySecret:
        name: argo-artifacts-s3
        key: secretKey
```

## Step 4: Deploy Argo Workflows

Create the HelmRelease with full configuration for the workflow controller and server.

```yaml
# clusters/production/argo-workflows/release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: argo-workflows
  namespace: argo
spec:
  interval: 30m
  chart:
    spec:
      chart: argo-workflows
      version: "0.x"
      sourceRef:
        kind: HelmRepository
        name: argo
        namespace: flux-system
      interval: 12h
  install:
    createNamespace: false
    remediation:
      retries: 3
  upgrade:
    cleanupOnFail: true
    remediation:
      retries: 3
  values:
    # Workflow controller settings
    controller:
      # Run controller in HA mode with 2 replicas
      replicas: 2
      resources:
        requests:
          cpu: 200m
          memory: 256Mi
        limits:
          cpu: 1000m
          memory: 1Gi
      # Persistence for workflow tracking
      persistence:
        archive: true
        # PostgreSQL for workflow archive
        postgresql:
          host: postgres.argo.svc
          port: 5432
          database: argo_workflows
          tableName: argo_workflows
          userNameSecret:
            name: argo-postgres-config
            key: username
          passwordSecret:
            name: argo-postgres-config
            key: password
      # Workflow defaults
      workflowDefaults:
        spec:
          # Default TTL for completed workflows
          ttlStrategy:
            secondsAfterCompletion: 86400
            secondsAfterSuccess: 43200
            secondsAfterFailure: 172800
          # Pod garbage collection
          podGC:
            strategy: OnPodCompletion

    # Argo Server (UI and API)
    server:
      replicas: 2
      # Authentication mode: server, client, or sso
      authMode: "sso"
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 512Mi
      # Ingress for the Argo Server UI
      ingress:
        enabled: true
        ingressClassName: nginx
        hosts:
          - argo-workflows.example.com
        tls:
          - secretName: argo-workflows-tls
            hosts:
              - argo-workflows.example.com

    # Default artifact repository
    useDefaultArtifactRepo: true
    artifactRepository:
      s3:
        bucket: argo-artifacts
        endpoint: s3.amazonaws.com
        region: us-east-1
        accessKeySecret:
          name: argo-artifacts-s3
          key: accessKey
        secretKeySecret:
          name: argo-artifacts-s3
          key: secretKey
```

## Step 5: Configure RBAC

Set up roles for workflow submission and viewing.

```yaml
# clusters/production/argo-workflows/rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: argo-workflow-executor
  namespace: argo
  annotations:
    # Annotate for IRSA on AWS if needed
    workflows.argoproj.io/rbac-rule: "true"
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: argo-workflow-role
  namespace: argo
rules:
  # Permissions needed by workflow pods
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get"]
  - apiGroups: ["argoproj.io"]
    resources: ["workflows", "workflowtemplates", "cronworkflows"]
    verbs: ["get", "list", "watch", "create", "update", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: argo-workflow-binding
  namespace: argo
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: argo-workflow-role
subjects:
  - kind: ServiceAccount
    name: argo-workflow-executor
    namespace: argo
```

## Step 6: Create Workflow Templates

Define reusable workflow templates managed by Flux CD.

```yaml
# clusters/production/argo-workflows/workflow-templates/ci-pipeline.yaml
apiVersion: argoproj.io/v1alpha1
kind: WorkflowTemplate
metadata:
  name: ci-pipeline
  namespace: argo
  labels:
    # Label for Flux CD tracking
    app.kubernetes.io/managed-by: flux
spec:
  # Entry point for the workflow
  entrypoint: ci-steps
  arguments:
    parameters:
      - name: repo-url
        value: "https://github.com/example/app.git"
      - name: branch
        value: "main"
      - name: image-tag
        value: "latest"

  templates:
    # Main DAG template
    - name: ci-steps
      dag:
        tasks:
          # Step 1: Clone the repository
          - name: clone
            template: git-clone
            arguments:
              parameters:
                - name: repo-url
                  value: "{{workflow.parameters.repo-url}}"
                - name: branch
                  value: "{{workflow.parameters.branch}}"
          # Step 2: Run tests (depends on clone)
          - name: test
            template: run-tests
            dependencies: [clone]
          # Step 3: Build image (depends on tests passing)
          - name: build
            template: build-image
            dependencies: [test]
            arguments:
              parameters:
                - name: image-tag
                  value: "{{workflow.parameters.image-tag}}"

    # Git clone template
    - name: git-clone
      inputs:
        parameters:
          - name: repo-url
          - name: branch
      container:
        image: alpine/git:latest
        command: [sh, -c]
        args:
          - |
            git clone --branch {{inputs.parameters.branch}} \
              {{inputs.parameters.repo-url}} /work
        volumeMounts:
          - name: work
            mountPath: /work

    # Test runner template
    - name: run-tests
      container:
        image: node:20-alpine
        command: [sh, -c]
        args:
          - |
            cd /work && npm install && npm test
        volumeMounts:
          - name: work
            mountPath: /work

    # Image build template
    - name: build-image
      inputs:
        parameters:
          - name: image-tag
      container:
        image: gcr.io/kaniko-project/executor:latest
        args:
          - --dockerfile=/work/Dockerfile
          - --context=/work
          - --destination=registry.example.com/app:{{inputs.parameters.image-tag}}
        volumeMounts:
          - name: work
            mountPath: /work
```

## Step 7: Create a CronWorkflow

Schedule recurring workflows via GitOps.

```yaml
# clusters/production/argo-workflows/workflow-templates/cron-cleanup.yaml
apiVersion: argoproj.io/v1alpha1
kind: CronWorkflow
metadata:
  name: cleanup-old-data
  namespace: argo
spec:
  # Run daily at 2 AM
  schedule: "0 2 * * *"
  timezone: "UTC"
  concurrencyPolicy: "Forbid"
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 5
  workflowSpec:
    entrypoint: cleanup
    templates:
      - name: cleanup
        container:
          image: bitnami/kubectl:latest
          command: [sh, -c]
          args:
            - |
              # Delete completed workflows older than 7 days
              kubectl delete workflows -n argo \
                --field-selector status.phase=Succeeded \
                --timeout=120s || true
```

## Step 8: Create the Flux Kustomization

```yaml
# clusters/production/argo-workflows/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: argo-workflows
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/production/argo-workflows
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: argo-workflows-server
      namespace: argo
    - apiVersion: apps/v1
      kind: Deployment
      name: argo-workflows-workflow-controller
      namespace: argo
  timeout: 10m
```

## Step 9: Verify and Submit Workflows

```bash
# Check Flux reconciliation
flux get helmreleases -n argo

# Verify pods are running
kubectl get pods -n argo

# Submit a workflow from the template
argo submit -n argo --from workflowtemplate/ci-pipeline \
  -p repo-url="https://github.com/example/app.git" \
  -p branch="main" \
  -p image-tag="v1.0.0"

# Watch workflow progress
argo watch -n argo @latest

# List all workflows
argo list -n argo
```

## Troubleshooting

```bash
# Check workflow controller logs
kubectl logs -n argo deployment/argo-workflows-workflow-controller

# Check server logs
kubectl logs -n argo deployment/argo-workflows-server

# Debug a failed workflow
argo get -n argo <workflow-name> --output yaml

# Force reconciliation
flux reconcile helmrelease argo-workflows -n argo --with-source
```

## Summary

You now have Argo Workflows deployed and managed through Flux CD. The workflow engine, templates, cron schedules, and RBAC are all version-controlled in Git. Flux CD continuously reconciles the desired state, so any changes to workflow templates or configuration are automatically applied. This approach gives teams a self-service workflow platform where new templates and schedules can be added through pull requests.
