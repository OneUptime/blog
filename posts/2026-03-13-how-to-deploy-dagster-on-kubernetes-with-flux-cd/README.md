# How to Deploy Dagster on Kubernetes with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Dagster, Data Orchestration, Data Engineering, HelmRelease

Description: Learn how to deploy Dagster data orchestration platform to Kubernetes using Flux CD HelmRelease for a GitOps-managed data pipeline environment.

---

## Introduction

Dagster is a cloud-native data orchestration platform with a software-defined assets model that brings data engineering, data science, and machine learning workflows under a unified framework. Its Kubernetes deployment model runs each pipeline job as an isolated Kubernetes Job, while the Dagster daemon handles scheduling and the web UI provides full observability.

Deploying Dagster on Kubernetes with Flux CD means your entire data platform infrastructure — the web server, daemon, database, and user code deployments — is managed through Git. When you update a Dagster user code deployment (which contains your pipeline definitions), Flux reconciles the change, making your new pipelines available immediately without manual commands.

In this guide you will deploy the full Dagster stack on Kubernetes using the official Helm chart via Flux CD, configure user code server deployments, and set up PostgreSQL for run history storage.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `kubectl` and `flux` CLI tools installed
- A StorageClass supporting PersistentVolumeClaims
- A container registry with your Dagster user code Docker image
- Basic understanding of Dagster concepts (assets, jobs, schedules, sensors, code locations)

## Step 1: Add the Dagster HelmRepository

```yaml
# clusters/production/sources/dagster.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: dagster
  namespace: flux-system
spec:
  interval: 1h
  url: https://dagster-io.github.io/helm
```

## Step 2: Create Dagster Secrets

```yaml
# clusters/production/secrets/dagster-secrets.yaml
# Encrypt with SOPS before committing
apiVersion: v1
kind: Secret
metadata:
  name: dagster-postgresql-secret
  namespace: dagster
type: Opaque
stringData:
  postgresql-password: "change-me-in-production"
  postgresql-postgres-password: "change-me-in-production"
```

## Step 3: Deploy the Dagster Stack

```yaml
# clusters/production/apps/dagster-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: dagster
  namespace: flux-system
spec:
  interval: 1h
  targetNamespace: dagster
  createNamespace: true
  chart:
    spec:
      chart: dagster
      version: "1.6.x"
      sourceRef:
        kind: HelmRepository
        name: dagster
  install:
    timeout: 15m
  upgrade:
    timeout: 15m
  values:
    # Global image registry
    global:
      postgresqlSecretName: dagster-postgresql-secret

    # Dagster web server (Dagit)
    dagsterWebserver:
      replicaCount: 1
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: 2000m
          memory: 2Gi
      ingress:
        enabled: true
        ingressClassName: nginx
        annotations:
          cert-manager.io/cluster-issuer: letsencrypt-prod
          nginx.ingress.kubernetes.io/auth-type: basic
          nginx.ingress.kubernetes.io/auth-secret: dagster-basic-auth
        host: dagster.myorg.com
        tls:
          enabled: true
          secretName: dagster-tls

    # Dagster daemon (scheduler, sensor evaluation, run queuing)
    dagsterDaemon:
      enabled: true
      resources:
        requests:
          cpu: 250m
          memory: 512Mi
        limits:
          cpu: 1000m
          memory: 1Gi
      runCoordinator:
        type: QueuedRunCoordinator
        config:
          queuedRunCoordinator:
            maxConcurrentRuns: 10

    # PostgreSQL for run history and event logs
    postgresql:
      enabled: true
      image:
        tag: "15"
      auth:
        username: dagster
        database: dagster
        existingSecret: dagster-postgresql-secret
        secretKeys:
          adminPasswordKey: postgresql-postgres-password
          userPasswordKey: postgresql-password
      primary:
        persistence:
          enabled: true
          size: 20Gi
        resources:
          requests:
            cpu: 200m
            memory: 512Mi

    # Run launcher: use Kubernetes Jobs for pipeline execution
    runLauncher:
      type: K8sRunLauncher
      config:
        k8sRunLauncher:
          # Namespace where pipeline Job pods are created
          jobNamespace: dagster-runs
          # Default resources for run jobs
          runK8sConfig:
            containerConfig:
              resources:
                requests:
                  cpu: 500m
                  memory: 1Gi
                limits:
                  cpu: 2000m
                  memory: 4Gi
            podSpecConfig:
              serviceAccountName: dagster-run-runner
          # Keep completed jobs for debugging
          jobTtlSecondsAfterFinished: 86400

    # Celery executor alternative (uncomment if needed)
    # celery:
    #   enabled: true

    # User code deployments (your pipeline code)
    userDeployments:
      enabled: true
      deployments:
        # Data engineering pipelines
        - name: data-engineering
          image:
            repository: myregistry/dagster-data-engineering
            tag: "v1.5.0"
            pullPolicy: IfNotPresent
          dagsterApiGrpcArgs:
            - "--python-file"
            - "repo.py"
          port: 3030
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          envSecrets:
            - name: data-engineering-secrets

        # ML pipeline code location
        - name: ml-pipelines
          image:
            repository: myregistry/dagster-ml-pipelines
            tag: "v2.1.0"
            pullPolicy: IfNotPresent
          dagsterApiGrpcArgs:
            - "--python-file"
            - "ml_repo.py"
          port: 3031
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 2000m
              memory: 4Gi
          envSecrets:
            - name: ml-pipeline-secrets
```

## Step 4: Set Up Run Execution Namespace

```yaml
# apps/dagster/run-execution-rbac.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dagster-runs
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dagster-run-runner
  namespace: dagster-runs
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: dagster-run-role
  namespace: dagster-runs
rules:
  - apiGroups: ["batch"]
    resources: [jobs]
    verbs: [create, get, list, watch, delete, patch]
  - apiGroups: [""]
    resources: [pods, pods/log]
    verbs: [get, list, watch, delete]
  - apiGroups: [""]
    resources: [secrets, configmaps]
    verbs: [get, list]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dagster-run-rolebinding
  namespace: dagster-runs
subjects:
  - kind: ServiceAccount
    name: dagster-service-account
    namespace: dagster
roleRef:
  kind: Role
  name: dagster-run-role
  apiGroup: rbac.authorization.k8s.io
```

## Step 5: Create Flux Kustomization

```yaml
# clusters/production/apps/dagster-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: dagster-stack
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./clusters/production/apps/dagster
  prune: true
  wait: true
  timeout: 20m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: dagster-dagster-webserver
      namespace: dagster
    - apiVersion: apps/v1
      kind: Deployment
      name: dagster-dagster-daemon
      namespace: dagster
```

## Step 6: Update User Code Deployments

When your pipeline code changes, update the image tag in the HelmRelease and push to Git.

```bash
# After updating the image tag in the HelmRelease YAML and pushing to Git:
flux reconcile helmrelease dagster --with-source -n flux-system

# Verify the user code deployment updated
kubectl get pods -n dagster -l component=user-deployments

# Check Dagster web server to confirm new code location loaded
kubectl port-forward -n dagster svc/dagster-dagster-webserver 3000:80
# Open http://localhost:3000 and check Code Locations

# View daemon logs for schedule and sensor activity
kubectl logs -n dagster -l component=daemon -f

# Monitor pipeline run jobs
kubectl get jobs -n dagster-runs -w
kubectl get pods -n dagster-runs
```

## Step 7: Sample Dagster Pipeline Definition

```python
# repo.py (in your user code Docker image)
from dagster import (
    asset, define_asset_job, ScheduleDefinition,
    Definitions, EnvVar
)
import pandas as pd

@asset(
    description="Raw customer data from S3",
    group_name="raw_data"
)
def raw_customers(context) -> pd.DataFrame:
    s3_path = EnvVar("CUSTOMER_DATA_S3_PATH").get_value()
    df = pd.read_parquet(s3_path)
    context.log.info(f"Loaded {len(df)} customer records")
    return df

@asset(
    description="Cleaned and deduplicated customer data",
    group_name="processed_data"
)
def processed_customers(context, raw_customers: pd.DataFrame) -> pd.DataFrame:
    deduped = raw_customers.drop_duplicates(subset=["customer_id"])
    context.log.info(f"Processed {len(deduped)} unique customers")
    return deduped

# Define a job and daily schedule
customer_pipeline = define_asset_job(
    name="customer_pipeline",
    selection=[raw_customers, processed_customers]
)

daily_schedule = ScheduleDefinition(
    job=customer_pipeline,
    cron_schedule="0 6 * * *"  # 6 AM UTC daily
)

defs = Definitions(
    assets=[raw_customers, processed_customers],
    jobs=[customer_pipeline],
    schedules=[daily_schedule]
)
```

## Best Practices

- Use separate Docker images per code location to allow independent deployments of pipeline groups
- Pin user code image tags in the HelmRelease — never use `latest` in production
- Set `jobTtlSecondsAfterFinished` to clean up completed run pods automatically
- Use Dagster's built-in secrets management (`EnvVar`) rather than hardcoding credentials in pipeline code
- Configure the `QueuedRunCoordinator` with `maxConcurrentRuns` to prevent resource exhaustion
- Enable the Dagster daemon's sensor evaluation for event-driven pipeline triggering

## Conclusion

Deploying Dagster on Kubernetes with Flux CD creates a fully GitOps-managed data orchestration platform. The complete Dagster stack — web server, daemon, PostgreSQL, and user code servers — is defined in a single HelmRelease YAML and reconciled continuously by Flux. When your data engineering team deploys new pipeline code, they update the user code image tag in Git, and Flux rolls out the change. Dagster handles scheduling, dependency management, and run observability, while Kubernetes provides the compute and Flux keeps everything synchronized with Git.
