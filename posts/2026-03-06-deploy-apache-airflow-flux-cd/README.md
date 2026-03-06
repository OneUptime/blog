# How to Deploy Apache Airflow with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Apache Airflow, Kubernetes, GitOps, Helm, Data Pipeline, Workflow Orchestration

Description: A comprehensive guide to deploying Apache Airflow on Kubernetes using Flux CD for GitOps-managed data pipeline orchestration.

---

## Introduction

Apache Airflow is the industry-standard platform for authoring, scheduling, and monitoring data pipelines. Running Airflow on Kubernetes with Flux CD gives you a fully GitOps-managed deployment where DAGs, configurations, and infrastructure changes are tracked in Git and automatically reconciled.

This guide covers deploying Airflow with the KubernetesExecutor, Git-sync for DAGs, persistent logging, and production-ready database configuration.

## Prerequisites

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped
- A PostgreSQL database (or deploy one alongside Airflow)
- A Git repository containing your Airflow DAGs
- kubectl access to the cluster

## Repository Structure

```text
clusters/
  production/
    airflow/
      namespace.yaml
      source.yaml
      release.yaml
      secrets.yaml
      dag-sync-config.yaml
      kustomization.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/production/airflow/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: airflow
  labels:
    app.kubernetes.io/part-of: data-platform
```

## Step 2: Add the Apache Airflow Helm Repository

```yaml
# clusters/production/airflow/source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: apache-airflow
  namespace: flux-system
spec:
  # Official Apache Airflow Helm chart repository
  url: https://airflow.apache.org
  interval: 1h
```

## Step 3: Configure Secrets

Store sensitive configuration such as database credentials and Fernet key.

```yaml
# clusters/production/airflow/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: airflow-secrets
  namespace: airflow
type: Opaque
stringData:
  # PostgreSQL connection string for Airflow metadata database
  connection: "postgresql://airflow:password@postgres.airflow.svc:5432/airflow"
  # Fernet key for encrypting connections and variables
  # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
  fernet-key: "your-fernet-key-here"
  # Secret key for Flask webserver session signing
  webserver-secret-key: "your-webserver-secret-key"
---
apiVersion: v1
kind: Secret
metadata:
  name: airflow-git-ssh
  namespace: airflow
type: Opaque
stringData:
  # SSH private key for cloning the DAGs repository
  gitSshKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    your-ssh-key-here
    -----END OPENSSH PRIVATE KEY-----
```

## Step 4: Deploy Apache Airflow

Create the HelmRelease with production configuration.

```yaml
# clusters/production/airflow/release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: airflow
  namespace: airflow
spec:
  interval: 30m
  chart:
    spec:
      chart: airflow
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: apache-airflow
        namespace: flux-system
      interval: 12h
  install:
    createNamespace: false
    remediation:
      retries: 3
    timeout: 15m
  upgrade:
    cleanupOnFail: true
    remediation:
      retries: 3
    timeout: 15m
  values:
    # Use KubernetesExecutor for dynamic pod-based task execution
    executor: KubernetesExecutor

    # Airflow Docker image configuration
    images:
      airflow:
        repository: apache/airflow
        tag: "2.8.1-python3.11"

    # Webserver configuration
    webserver:
      replicas: 2
      resources:
        requests:
          cpu: 500m
          memory: 512Mi
        limits:
          cpu: 1000m
          memory: 1Gi
      # Default user for initial login
      defaultUser:
        enabled: true
        role: Admin
        username: admin
        email: admin@example.com
        firstName: Admin
        lastName: User
        password: change-me-immediately
      service:
        type: ClusterIP

    # Scheduler configuration
    scheduler:
      replicas: 2
      resources:
        requests:
          cpu: 500m
          memory: 512Mi
        limits:
          cpu: 1000m
          memory: 2Gi

    # Triggerer for deferrable operators
    triggerer:
      enabled: true
      replicas: 1
      resources:
        requests:
          cpu: 200m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 512Mi

    # Database configuration using external PostgreSQL
    data:
      metadataSecretName: airflow-secrets

    # Fernet key from secret
    fernetKeySecretName: airflow-secrets

    # Webserver secret key from secret
    webserverSecretKeySecretName: airflow-secrets

    # DAG synchronization via Git
    dags:
      gitSync:
        enabled: true
        # Repository containing Airflow DAGs
        repo: "git@github.com:your-org/airflow-dags.git"
        branch: main
        subPath: "dags"
        # Sync interval in seconds
        wait: 60
        # SSH key for private repositories
        sshKeySecret: airflow-git-ssh

    # Persistent logging
    logs:
      persistence:
        enabled: true
        size: 50Gi
        storageClassName: standard

    # KubernetesExecutor pod template
    workers:
      resources:
        requests:
          cpu: 500m
          memory: 512Mi
        limits:
          cpu: 2000m
          memory: 4Gi

    # Airflow configuration overrides
    config:
      core:
        # Load example DAGs: set to False in production
        load_examples: "False"
        # Default timezone
        default_timezone: "utc"
      logging:
        # Remote logging to S3
        remote_logging: "True"
        remote_base_log_folder: "s3://airflow-logs/production"
        remote_log_conn_id: "aws_default"
      kubernetes_executor:
        # Delete completed worker pods
        delete_worker_pods: "True"
        # Delete pods on failure for cleanup
        delete_worker_pods_on_failure: "False"
        # Namespace for worker pods
        namespace: "airflow"

    # Database migration job
    migrateDatabaseJob:
      enabled: true

    # Redis is not needed with KubernetesExecutor
    redis:
      enabled: false

    # StatsD for metrics export
    statsd:
      enabled: true

    # Flower is not needed with KubernetesExecutor
    flower:
      enabled: false
```

## Step 5: Configure Ingress

Expose the Airflow webserver through an ingress.

```yaml
# clusters/production/airflow/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: airflow-webserver
  namespace: airflow
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "120"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  rules:
    - host: airflow.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: airflow-webserver
                port:
                  number: 8080
  tls:
    - hosts:
        - airflow.example.com
      secretName: airflow-tls
```

## Step 6: Configure Airflow Connections via GitOps

Manage Airflow connections as Kubernetes secrets.

```yaml
# clusters/production/airflow/connections.yaml
apiVersion: v1
kind: Secret
metadata:
  name: airflow-connections
  namespace: airflow
type: Opaque
stringData:
  # AWS connection for S3 and other AWS services
  AIRFLOW_CONN_AWS_DEFAULT: |
    aws://AKIAIOSFODNN7EXAMPLE:secretkey@/?region_name=us-east-1
  # Slack connection for alerts
  AIRFLOW_CONN_SLACK_DEFAULT: |
    slack://:xoxb-your-token@/?channel=data-alerts
  # PostgreSQL data warehouse connection
  AIRFLOW_CONN_WAREHOUSE: |
    postgresql://etl_user:password@warehouse.example.com:5432/analytics
```

## Step 7: Add Extra Python Packages

Configure additional Python packages for your DAGs.

```yaml
# clusters/production/airflow/extra-packages.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: airflow-requirements
  namespace: airflow
data:
  # Extra pip packages for Airflow workers and scheduler
  requirements.txt: |
    apache-airflow-providers-amazon==8.0.0
    apache-airflow-providers-slack==8.0.0
    apache-airflow-providers-postgres==5.0.0
    pandas==2.1.0
    boto3==1.34.0
```

## Step 8: Create the Flux Kustomization

```yaml
# clusters/production/airflow/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: airflow
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/production/airflow
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: airflow-webserver
      namespace: airflow
    - apiVersion: apps/v1
      kind: Deployment
      name: airflow-scheduler
      namespace: airflow
  # Airflow takes time to initialize the database and start
  timeout: 15m
```

## Step 9: Verify the Deployment

```bash
# Check the HelmRelease status
flux get helmreleases -n airflow

# Verify all pods are running
kubectl get pods -n airflow

# Check scheduler logs for DAG parsing
kubectl logs -n airflow deployment/airflow-scheduler -c scheduler

# Check git-sync sidecar is pulling DAGs
kubectl logs -n airflow deployment/airflow-scheduler -c git-sync

# Port-forward to access the Airflow UI
kubectl port-forward -n airflow svc/airflow-webserver 8080:8080
```

## Troubleshooting

```bash
# If database migration fails
kubectl logs -n airflow job/airflow-run-airflow-migrations

# If DAGs are not appearing, check git-sync
kubectl logs -n airflow deployment/airflow-scheduler -c git-sync

# If workers fail to start, check KubernetesExecutor config
kubectl describe pod -n airflow -l component=worker

# Force Flux reconciliation
flux reconcile helmrelease airflow -n airflow --with-source

# Check Airflow configuration
kubectl exec -n airflow deployment/airflow-webserver -- airflow config list
```

## Summary

You now have Apache Airflow deployed on Kubernetes via Flux CD with the KubernetesExecutor. DAGs are automatically synced from Git, configuration is managed declaratively, and all changes flow through version control. The KubernetesExecutor dynamically creates pods for each task execution, providing efficient resource utilization and isolation. Flux CD ensures that any updates to Airflow configuration, connections, or infrastructure are automatically applied to the cluster.
