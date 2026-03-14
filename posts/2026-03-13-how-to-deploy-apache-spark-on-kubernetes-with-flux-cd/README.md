# How to Deploy Apache Spark on Kubernetes with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Apache Spark, Spark Operator, Data Engineering, HelmRelease

Description: Learn how to deploy Apache Spark on Kubernetes using the Spark Operator Helm chart managed by Flux CD for GitOps-driven big data workloads.

---

## Introduction

Apache Spark is the dominant framework for large-scale data processing, and running it on Kubernetes via the Spark Operator provides native cluster resource management, auto-scaling, and integration with Kubernetes RBAC and networking. Managing the Spark Operator and SparkApplication resources through Flux CD brings the same GitOps benefits to your data platform that you already enjoy with application services.

The Kubernetes Operator for Apache Spark (kubeflow/spark-operator) manages the full lifecycle of SparkApplication resources: submitting jobs, monitoring their progress, handling restarts on failure, and cleaning up completed job pods. By deploying the operator via Flux CD HelmRelease and storing SparkApplication CRs in Git, every Spark job submission becomes a traceable Git commit.

In this guide you will deploy the Spark Operator using Flux CD, create a SparkApplication custom resource for a batch job, and configure Flux to reconcile both the operator and your Spark jobs from Git.

## Prerequisites

- A Kubernetes cluster with Flux CD installed (minimum 4 CPUs and 8GB RAM for Spark workloads)
- `kubectl` and `flux` CLI tools installed
- A container registry with a Spark application Docker image
- Basic understanding of Apache Spark and Kubernetes Operators

## Step 1: Add the Spark Operator HelmRepository

```yaml
# clusters/production/sources/spark-operator.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: spark-operator
  namespace: flux-system
spec:
  interval: 1h
  url: https://kubeflow.github.io/spark-operator
```

## Step 2: Deploy the Spark Operator

```yaml
# clusters/production/infrastructure/spark-operator-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: spark-operator
  namespace: flux-system
spec:
  interval: 1h
  targetNamespace: spark-operator
  createNamespace: true
  chart:
    spec:
      chart: spark-operator
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: spark-operator
  values:
    # Enable webhook for SparkApplication validation
    webhook:
      enable: true
    # Enable Prometheus metrics
    metrics:
      enable: true
      port: 10254
      portName: metrics
      endpoint: /metrics
    # Spark job namespaces the operator will watch
    sparkJobNamespace: spark-jobs
    # Configure the operator's resource limits
    controller:
      resources:
        requests:
          cpu: 100m
          memory: 300Mi
        limits:
          cpu: 1000m
          memory: 512Mi
    # Enable leader election for HA
    leaderElection:
      lockName: spark-operator-lock
```

## Step 3: Create the Spark Jobs Namespace

```yaml
# clusters/production/infrastructure/spark-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: spark-jobs
  labels:
    app.kubernetes.io/managed-by: flux
---
# Service account for Spark driver pods
apiVersion: v1
kind: ServiceAccount
metadata:
  name: spark-driver
  namespace: spark-jobs
---
# RBAC for Spark driver to manage executor pods
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: spark-driver-role
  namespace: spark-jobs
rules:
  - apiGroups: [""]
    resources: [pods, services, configmaps, persistentvolumeclaims]
    verbs: [create, get, list, watch, delete, update, patch]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: spark-driver-rolebinding
  namespace: spark-jobs
subjects:
  - kind: ServiceAccount
    name: spark-driver
    namespace: spark-jobs
roleRef:
  kind: Role
  name: spark-driver-role
  apiGroup: rbac.authorization.k8s.io
```

## Step 4: Create a SparkApplication Custom Resource

Define your Spark batch job as a SparkApplication resource stored in Git.

```yaml
# apps/spark-jobs/etl-pipeline-sparkapp.yaml
apiVersion: sparkoperator.k8s.io/v1beta2
kind: SparkApplication
metadata:
  name: etl-pipeline
  namespace: spark-jobs
spec:
  type: Python
  pythonVersion: "3"
  mode: cluster
  # Docker image with your Spark application and dependencies
  image: myregistry/spark-etl:v1.3.0
  imagePullPolicy: Always

  # Spark application entrypoint
  mainApplicationFile: local:///app/etl_pipeline.py
  arguments:
    - "--input-path=s3a://my-bucket/raw-data/"
    - "--output-path=s3a://my-bucket/processed-data/"
    - "--date=$(date +%Y-%m-%d)"

  sparkVersion: "3.5.0"

  # Spark configuration properties
  sparkConf:
    spark.kubernetes.container.image.pullPolicy: Always
    spark.kubernetes.driver.request.cores: "1"
    spark.kubernetes.executor.request.cores: "1"
    # S3 configuration for data access
    spark.hadoop.fs.s3a.impl: org.apache.hadoop.fs.s3a.S3AFileSystem
    spark.hadoop.fs.s3a.endpoint: s3.amazonaws.com
    # Enable dynamic allocation
    spark.dynamicAllocation.enabled: "true"
    spark.dynamicAllocation.shuffleTracking.enabled: "true"
    spark.dynamicAllocation.minExecutors: "1"
    spark.dynamicAllocation.maxExecutors: "10"

  driver:
    serviceAccount: spark-driver
    cores: 1
    coreLimit: "2"
    memory: 2g
    labels:
      version: "3.5.0"
    env:
      - name: AWS_ACCESS_KEY_ID
        valueFrom:
          secretKeyRef:
            name: aws-credentials
            key: access-key-id
      - name: AWS_SECRET_ACCESS_KEY
        valueFrom:
          secretKeyRef:
            name: aws-credentials
            key: secret-access-key

  executor:
    cores: 2
    coreLimit: "4"
    instances: 3
    memory: 4g
    labels:
      version: "3.5.0"

  # Restart policy for batch jobs
  restartPolicy:
    type: OnFailure
    onFailureRetries: 3
    onFailureRetryInterval: 10
    onSubmissionFailureRetries: 5
    onSubmissionFailureRetryInterval: 20
```

## Step 5: Create Flux Kustomization for Spark Jobs

```yaml
# clusters/production/apps/spark-jobs-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: spark-jobs
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./apps/spark-jobs
  prune: true
  # Spark operator must be running before submitting jobs
  dependsOn:
    - name: spark-operator
```

## Step 6: Monitor Spark Job Execution

```bash
# Check the SparkApplication status
kubectl get sparkapplication -n spark-jobs
kubectl describe sparkapplication etl-pipeline -n spark-jobs

# View driver pod logs
kubectl logs -n spark-jobs -l spark-role=driver

# Watch executor pods
kubectl get pods -n spark-jobs -l spark-role=executor -w

# Check Spark UI (port-forward driver pod)
kubectl port-forward -n spark-jobs \
  $(kubectl get pod -n spark-jobs -l spark-role=driver -o name) \
  4040:4040

# Get all SparkApplications and their states
kubectl get sparkapplication -n spark-jobs \
  -o custom-columns='NAME:.metadata.name,STATE:.status.applicationState.state,ATTEMPT:.status.submissionAttempts'
```

## Best Practices

- Store SparkApplication CRs in Git so every job submission is versioned and auditable
- Use Docker image tags (not `latest`) in SparkApplication specs to ensure reproducible runs
- Configure `restartPolicy` with limits to prevent infinite retry loops on permanent failures
- Use dynamic allocation to optimize executor count based on workload size
- Set resource requests and limits on both driver and executor for predictable scheduling
- Use Kubernetes Secrets (managed by SOPS in Flux) for cloud credentials rather than embedding them in SparkApplication specs

## Conclusion

Deploying Apache Spark on Kubernetes with Flux CD turns your data pipelines into GitOps-managed infrastructure. The Spark Operator handles job lifecycle management while Flux ensures the operator and SparkApplication resources are always synchronized with Git. New Spark jobs are submitted by merging a SparkApplication YAML to your repository, failed jobs are tracked in Git history, and operator upgrades follow the same Helm upgrade process as all other infrastructure components.
