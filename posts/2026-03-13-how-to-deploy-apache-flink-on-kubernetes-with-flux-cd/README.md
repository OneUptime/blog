# How to Deploy Apache Flink on Kubernetes with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Apache Flink, Flink Operator, Stream Processing, HelmRelease

Description: Learn how to deploy Apache Flink on Kubernetes using the Flink Kubernetes Operator managed by Flux CD for GitOps-driven stream processing workloads.

---

## Introduction

Apache Flink is the leading framework for stateful stream processing, enabling low-latency data pipelines with exactly-once semantics. Running Flink on Kubernetes with the official Flink Kubernetes Operator gives you native integration with Kubernetes resource management, automatic failover, and declarative job lifecycle management via custom resources.

By managing the Flink Kubernetes Operator and FlinkDeployment resources with Flux CD, you bring GitOps principles to your streaming data platform. Every change to a Flink job's configuration, parallelism, or checkpoint settings becomes a Git commit, providing a full audit trail and enabling easy rollbacks. The operator's savepoint mechanism integrates naturally with this approach: when Flux detects a changed FlinkDeployment, the operator can take a savepoint before restarting the job.

In this guide you will deploy the Flink Kubernetes Operator using Flux CD HelmRelease, create a FlinkDeployment for a streaming job, and configure checkpointing and savepoints for stateful job management.

## Prerequisites

- A Kubernetes cluster with Flux CD installed (minimum 8 CPUs, 16GB RAM for Flink workloads)
- `kubectl` and `flux` CLI tools installed
- A container registry with your Flink application JAR bundled in a Docker image
- An S3-compatible object store for checkpoint and savepoint storage
- Basic understanding of Apache Flink concepts (jobs, task managers, checkpoints)

## Step 1: Add the Flink Operator HelmRepository

```yaml
# clusters/production/sources/flink-operator.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: flink-operator
  namespace: flux-system
spec:
  interval: 1h
  url: https://downloads.apache.org/flink/flink-kubernetes-operator-1.9.0/
```

## Step 2: Deploy the Flink Kubernetes Operator

```yaml
# clusters/production/infrastructure/flink-operator-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: flink-kubernetes-operator
  namespace: flux-system
spec:
  interval: 1h
  targetNamespace: flink-system
  createNamespace: true
  chart:
    spec:
      chart: flink-kubernetes-operator
      version: "1.9.x"
      sourceRef:
        kind: HelmRepository
        name: flink-operator
  values:
    # Namespaces the operator watches for FlinkDeployment resources
    watchNamespaces:
      - flink-jobs

    # Operator configuration
    operatorConfiguration:
      create: true
      append:
        # Default checkpoint storage backend
        kubernetes.operator.checkpoint.cleanup.enabled: "true"
        # Metrics reporting
        metrics.reporter.prom.factory.class: org.apache.flink.metrics.prometheus.PrometheusReporterFactory
        metrics.reporter.prom.port: "9249"

    # Webhook for FlinkDeployment validation
    webhook:
      create: true

    # Operator pod resources
    resources:
      requests:
        cpu: 200m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 1Gi
```

## Step 3: Configure Checkpoint Storage

Create a ConfigMap with shared Flink checkpoint configuration.

```yaml
# apps/flink-jobs/flink-checkpointing-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: flink-checkpointing-config
  namespace: flink-jobs
data:
  flink-conf.yaml: |
    # Checkpoint storage using S3
    state.backend: rocksdb
    state.backend.incremental: true
    state.checkpoints.dir: s3a://my-flink-bucket/checkpoints
    state.savepoints.dir: s3a://my-flink-bucket/savepoints

    # Checkpoint interval and timeout
    execution.checkpointing.interval: 60000
    execution.checkpointing.timeout: 600000
    execution.checkpointing.mode: EXACTLY_ONCE

    # Retain checkpoints when jobs fail
    execution.checkpointing.externalized-checkpoint-retention: RETAIN_ON_CANCELLATION

    # S3 configuration
    fs.s3a.endpoint: s3.amazonaws.com
    fs.s3a.impl: org.apache.hadoop.fs.s3a.S3AFileSystem
```

## Step 4: Create a FlinkDeployment for a Streaming Job

```yaml
# apps/flink-jobs/event-processor-flinkdeployment.yaml
apiVersion: flink.apache.org/v1beta1
kind: FlinkDeployment
metadata:
  name: event-processor
  namespace: flink-jobs
spec:
  image: myregistry/flink-event-processor:v2.1.0
  flinkVersion: v1_18
  flinkConfiguration:
    # High availability using Kubernetes
    high-availability: org.apache.flink.kubernetes.highavailability.KubernetesHaServicesFactory
    high-availability.storageDir: s3a://my-flink-bucket/ha/event-processor

    # Checkpoint settings
    state.checkpoints.dir: s3a://my-flink-bucket/checkpoints/event-processor
    state.savepoints.dir: s3a://my-flink-bucket/savepoints/event-processor
    execution.checkpointing.interval: "60000"
    execution.checkpointing.timeout: "300000"

    # Kafka source configuration
    kafka.bootstrap.servers: kafka.infrastructure:9092
    kafka.consumer.group.id: event-processor-group

  serviceAccount: flink-service-account

  # Job Manager configuration
  jobManager:
    resource:
      memory: 2048m
      cpu: 1
    replicas: 1

  # Task Manager configuration
  taskManager:
    resource:
      memory: 4096m
      cpu: 2
    # Number of task manager pods
    replicas: 3

  # The Flink application job spec
  job:
    jarURI: local:///opt/flink/usrlib/event-processor.jar
    entryClass: com.myorg.EventProcessorJob
    args:
      - "--input-topic=raw-events"
      - "--output-topic=processed-events"
      - "--parallelism=6"
    parallelism: 6
    # Upgrade mode: stateful - takes savepoint before upgrade
    upgradeMode: stateful
    # Restore from savepoint on restart
    savepointTriggerNonce: 0

  # Pod template for custom configuration
  podTemplate:
    spec:
      containers:
        - name: flink-main-container
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
```

## Step 5: Create Flux Kustomization for Flink Jobs

```yaml
# clusters/production/apps/flink-jobs-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: flink-jobs
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./apps/flink-jobs
  prune: true
  wait: true
  timeout: 10m
  dependsOn:
    - name: flink-kubernetes-operator
```

## Step 6: Trigger Stateful Job Upgrades

When you push a new Flink job image tag to Git, Flux reconciles the FlinkDeployment. With `upgradeMode: stateful`, the operator takes a savepoint before upgrading.

```bash
# Check FlinkDeployment status
kubectl get flinkdeployment -n flink-jobs
kubectl describe flinkdeployment event-processor -n flink-jobs

# View job manager logs
kubectl logs -n flink-jobs \
  $(kubectl get pod -n flink-jobs -l component=jobmanager -o name) \
  -c flink-main-container

# Monitor task manager pods
kubectl get pods -n flink-jobs -l component=taskmanager -w

# Access Flink Web UI via port-forward
kubectl port-forward -n flink-jobs \
  svc/event-processor-rest 8081:8081

# Check checkpoint status via Flink REST API
curl http://localhost:8081/jobs
curl http://localhost:8081/jobs/{job-id}/checkpoints
```

## Step 7: Manage Savepoints

```bash
# Trigger a manual savepoint by updating savepointTriggerNonce in Git
# The operator will capture a savepoint and update the status with the path

# View savepoint location from FlinkDeployment status
kubectl get flinkdeployment event-processor -n flink-jobs \
  -o jsonpath='{.status.jobStatus.savepointInfo.lastSavepoint.location}'

# Cancel job with savepoint (for planned maintenance)
kubectl patch flinkdeployment event-processor -n flink-jobs \
  --type=merge \
  -p '{"spec":{"job":{"state":"suspended"}}}'
```

## Best Practices

- Use `upgradeMode: stateful` for production streaming jobs to prevent state loss during upgrades
- Always configure S3 or GCS for checkpoint storage - do not rely on local disk
- Store `flinkConfiguration` in a separate ConfigMap and reference it in FlinkDeployment for reuse
- Set `execution.checkpointing.externalized-checkpoint-retention: RETAIN_ON_CANCELLATION` to recover from failures
- Monitor checkpoint duration and size to detect performance degradation early
- Use Flink HA with Kubernetes backend for production deployments to survive job manager failures

## Conclusion

Deploying Apache Flink on Kubernetes with Flux CD gives your streaming data platform the same GitOps workflow as your application services. The Flink Kubernetes Operator handles the complexity of stateful job upgrades through savepoints, while Flux ensures all configuration changes flow through Git. When you need to update job parallelism, change Kafka topics, or upgrade the Flink version, a Git commit triggers the complete, automated upgrade sequence with state preservation.
