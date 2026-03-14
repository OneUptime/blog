# How to Deploy Apache Beam Runner on Kubernetes with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Apache Beam, Dataflow, Data Pipeline, HelmRelease, Kustomization

Description: Learn how to deploy Apache Beam pipelines on Kubernetes using the Portable Runner managed by Flux CD for GitOps-driven data pipeline execution.

---

## Introduction

Apache Beam provides a unified programming model for batch and streaming data pipelines that can run on multiple execution engines (runners): Apache Flink, Apache Spark, Google Dataflow, and the Direct Runner. The Kubernetes-based Portable Runner allows you to execute Beam pipelines directly on Kubernetes without requiring a separate cluster manager like Flink or Spark.

Deploying Beam pipeline infrastructure with Flux CD gives you version-controlled pipeline configurations, reproducible job submissions, and automated infrastructure provisioning. By storing Beam job specs as Kubernetes Job or CronJob resources in Git, every pipeline execution is tied to a specific Git commit, making debugging and rollbacks straightforward.

In this guide you will deploy the Apache Beam Flink runner on Kubernetes via Flux CD (the most common production setup), configure pipeline submission using Kubernetes Jobs, and set up CronJobs for recurring pipeline execution.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- Apache Flink deployed via Flux CD (see the Flink post in this series)
- `kubectl` and `flux` CLI tools installed
- A Docker image with your Beam pipeline JAR/Python dependencies
- Basic understanding of Apache Beam concepts (pipelines, transforms, runners)

## Step 1: Deploy Flink as the Beam Runner Backend

Apache Beam uses Flink as the backend runner for production Kubernetes deployments.

```yaml
# clusters/production/infrastructure/beam-flink-session-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: beam-flink-session
  namespace: flux-system
spec:
  interval: 1h
  targetNamespace: beam-infrastructure
  createNamespace: true
  chart:
    spec:
      chart: flink-kubernetes-operator
      version: "1.9.x"
      sourceRef:
        kind: HelmRepository
        name: flink-operator
  values:
    watchNamespaces:
      - beam-jobs
```

## Step 2: Create a Flink Session Cluster for Beam

A Flink session cluster accepts multiple Beam jobs without requiring a new cluster per job.

```yaml
# apps/beam-infrastructure/flink-session-cluster.yaml
apiVersion: flink.apache.org/v1beta1
kind: FlinkDeployment
metadata:
  name: beam-session-cluster
  namespace: beam-infrastructure
spec:
  image: flink:1.18-scala_2.12-java11
  flinkVersion: v1_18
  flinkConfiguration:
    taskmanager.numberOfTaskSlots: "4"
    # Checkpoint configuration
    state.checkpoints.dir: s3a://my-beam-bucket/flink-checkpoints
    state.savepoints.dir: s3a://my-beam-bucket/flink-savepoints

  serviceAccount: flink-service-account

  jobManager:
    resource:
      memory: 2048m
      cpu: 1
    replicas: 1

  taskManager:
    resource:
      memory: 4096m
      cpu: 2
    replicas: 3

  # Session mode: no job spec — accepts submitted jobs
  mode: session
```

## Step 3: Create a Beam Pipeline Kubernetes Job

Submit a Python Beam pipeline as a Kubernetes Job.

```yaml
# apps/beam-jobs/customer-etl-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: customer-etl-2026-03-13
  namespace: beam-jobs
  labels:
    app: beam-pipeline
    pipeline: customer-etl
    version: "1.4.0"
spec:
  # Do not retry on failure — re-trigger from Git if needed
  backoffLimit: 2
  # Clean up completed jobs after 24 hours
  ttlSecondsAfterFinished: 86400
  template:
    spec:
      restartPolicy: Never
      serviceAccountName: beam-job-runner
      containers:
        - name: beam-pipeline
          image: myregistry/beam-pipelines:v1.4.0
          command:
            - python
            - -m
            - pipelines.customer_etl
          args:
            # Use the Flink runner via the Portable Runner API
            - "--runner=FlinkRunner"
            - "--flink_master=beam-session-cluster-rest.beam-infrastructure.svc.cluster.local:8081"
            - "--environment_type=EXTERNAL"
            - "--environment_config=beam-job-runner:50000"
            # Pipeline-specific arguments
            - "--input=gs://my-data-bucket/raw/customers/*.parquet"
            - "--output=gs://my-data-bucket/processed/customers/"
            - "--date=$(date +%Y-%m-%d)"
            - "--parallelism=8"
          env:
            - name: GOOGLE_APPLICATION_CREDENTIALS
              value: /var/secrets/google/key.json
            - name: PIPELINE_VERSION
              value: "1.4.0"
          volumeMounts:
            - name: gcp-credentials
              mountPath: /var/secrets/google
              readOnly: true
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 2000m
              memory: 4Gi
      volumes:
        - name: gcp-credentials
          secret:
            secretName: gcp-service-account-key
```

## Step 4: Create a Recurring Pipeline with CronJob

```yaml
# apps/beam-jobs/daily-revenue-report-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-revenue-report
  namespace: beam-jobs
  labels:
    app: beam-pipeline
    pipeline: revenue-report
spec:
  # Run at 2 AM UTC every day
  schedule: "0 2 * * *"
  # Keep last 3 successful and 1 failed job for debugging
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  # Do not start a new run if the previous one is still running
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      backoffLimit: 1
      ttlSecondsAfterFinished: 172800  # Clean up after 48 hours
      template:
        spec:
          restartPolicy: Never
          serviceAccountName: beam-job-runner
          initContainers:
            # Wait for Flink session cluster to be ready
            - name: wait-for-flink
              image: curlimages/curl:8.5.0
              command:
                - sh
                - -c
                - |
                  until curl -sf http://beam-session-cluster-rest.beam-infrastructure:8081/overview; do
                    echo "Waiting for Flink session cluster..."
                    sleep 10
                  done
                  echo "Flink is ready!"
          containers:
            - name: revenue-pipeline
              image: myregistry/beam-pipelines:v1.4.0
              command:
                - python
                - -m
                - pipelines.revenue_report
              args:
                - "--runner=FlinkRunner"
                - "--flink_master=beam-session-cluster-rest.beam-infrastructure:8081"
                - "--environment_type=EXTERNAL"
                - "--environment_config=beam-job-runner:50000"
                - "--report-date=$(date -d yesterday +%Y-%m-%d)"
                - "--output=s3://reports-bucket/revenue/"
              resources:
                requests:
                  cpu: 1000m
                  memory: 2Gi
                limits:
                  cpu: 4000m
                  memory: 8Gi
```

## Step 5: Configure RBAC for Beam Jobs

```yaml
# apps/beam-jobs/rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: beam-job-runner
  namespace: beam-jobs
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: beam-job-role
  namespace: beam-jobs
rules:
  - apiGroups: [""]
    resources: [pods, pods/log]
    verbs: [get, list, watch, create, delete]
  - apiGroups: ["batch"]
    resources: [jobs]
    verbs: [get, list, watch]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: beam-job-rolebinding
  namespace: beam-jobs
subjects:
  - kind: ServiceAccount
    name: beam-job-runner
    namespace: beam-jobs
roleRef:
  kind: Role
  name: beam-job-role
  apiGroup: rbac.authorization.k8s.io
```

## Step 6: Create Flux Kustomizations

```yaml
# clusters/production/apps/beam-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: beam-infrastructure
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./apps/beam-infrastructure
  prune: true
  wait: true
  timeout: 15m
  dependsOn:
    - name: beam-flink-session
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: beam-jobs
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./apps/beam-jobs
  prune: true
  dependsOn:
    - name: beam-infrastructure
```

## Step 7: Monitor Pipeline Execution

```bash
# Check running Beam jobs
kubectl get jobs -n beam-jobs
kubectl get cronjobs -n beam-jobs

# Watch a specific job's pod logs
JOB_POD=$(kubectl get pod -n beam-jobs -l job-name=customer-etl-2026-03-13 -o name)
kubectl logs -n beam-jobs $JOB_POD -c beam-pipeline -f

# Check Flink job status via the dashboard
kubectl port-forward -n beam-infrastructure \
  svc/beam-session-cluster-rest 8081:8081
# Open http://localhost:8081 to see running Beam jobs

# Trigger the ETL job manually by applying to Git
# Or directly for testing:
kubectl create job --from=cronjob/daily-revenue-report \
  manual-revenue-$(date +%Y%m%d) -n beam-jobs
```

## Best Practices

- Use a Flink session cluster (not per-job clusters) for frequent pipeline submissions to avoid Flink startup overhead
- Set `ttlSecondsAfterFinished` on Jobs to prevent accumulation of completed job objects
- Use `concurrencyPolicy: Forbid` on CronJobs for pipelines that must not run concurrently
- Store pipeline version as a label on the Job for easy identification in debugging
- Use init containers to wait for the Flink session cluster before submitting jobs
- Archive job logs to an object store before TTL cleanup for post-mortem analysis

## Conclusion

Deploying Apache Beam pipelines on Kubernetes with Flux CD gives your data engineering team a GitOps-managed pipeline execution environment. By combining the Flink Kubernetes Operator with Kubernetes Jobs and CronJobs managed by Flux, every pipeline run is traceable to a Git commit. New pipelines are deployed by adding Job YAML files to Git, scheduled pipelines are managed as CronJobs, and the entire infrastructure stack is reproducible from a fresh cluster.
