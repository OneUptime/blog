# How to Deploy Apache Airflow with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Apache Airflow, Data Engineering

Description: A complete guide to deploying Apache Airflow on Kubernetes using ArgoCD with the official Helm chart for GitOps-managed workflow orchestration.

---

Apache Airflow is the most widely used workflow orchestration platform in the data engineering world. Running it on Kubernetes with ArgoCD gives you a production-grade, GitOps-managed Airflow installation where infrastructure changes, DAG deployments, and configuration updates all flow through Git.

This guide covers deploying Airflow using the official Helm chart managed by ArgoCD, with all the production considerations you need.

## Architecture

```mermaid
graph TD
    A[ArgoCD] --> B[Airflow Webserver]
    A --> C[Airflow Scheduler]
    A --> D[Airflow Workers / KubernetesExecutor]
    A --> E[PostgreSQL]
    A --> F[Redis]
    C --> G[DAG Git Sync]
    G --> H[Git Repository]
    D --> I[Task Pods]
```

## Step 1: Deploy Airflow with the Official Helm Chart

Create an ArgoCD Application for Airflow:

```yaml
# airflow-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: airflow-production
  namespace: argocd
  labels:
    team: data-engineering
    component: airflow
spec:
  project: data-infrastructure
  source:
    repoURL: https://airflow.apache.org
    chart: airflow
    targetRevision: 1.13.0
    helm:
      values: |
        # Use KubernetesExecutor for dynamic task execution
        executor: KubernetesExecutor

        # Airflow image
        defaultAirflowRepository: apache/airflow
        defaultAirflowTag: 2.8.1-python3.11

        # Web server configuration
        webserver:
          replicas: 2
          resources:
            requests:
              cpu: "1"
              memory: "2Gi"
            limits:
              cpu: "2"
              memory: "4Gi"
          service:
            type: ClusterIP
          defaultUser:
            enabled: false

        # Scheduler configuration
        scheduler:
          replicas: 2
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
            limits:
              cpu: "4"
              memory: "8Gi"

        # Triggerer for deferrable operators
        triggerer:
          enabled: true
          replicas: 2
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"

        # DAG sync from Git
        dags:
          gitSync:
            enabled: true
            repo: https://github.com/myorg/airflow-dags.git
            branch: main
            subPath: dags
            wait: 60
            containerName: git-sync
            resources:
              requests:
                cpu: "100m"
                memory: "128Mi"

        # PostgreSQL
        postgresql:
          enabled: true
          auth:
            postgresPassword: changeme
            database: airflow
          primary:
            persistence:
              enabled: true
              size: 50Gi
              storageClass: gp3
            resources:
              requests:
                cpu: "1"
                memory: "2Gi"

        # Redis (for CeleryExecutor, optional with KubernetesExecutor)
        redis:
          enabled: false

        # Worker pod defaults for KubernetesExecutor
        workers:
          resources:
            requests:
              cpu: "1"
              memory: "2Gi"
            limits:
              cpu: "4"
              memory: "8Gi"

        # Flower monitoring (disabled with KubernetesExecutor)
        flower:
          enabled: false

        # Logs
        logs:
          persistence:
            enabled: true
            size: 100Gi
            storageClassName: gp3

        # Extra environment variables
        env:
          - name: AIRFLOW__CORE__DEFAULT_TIMEZONE
            value: "UTC"
          - name: AIRFLOW__CORE__LOAD_EXAMPLES
            value: "False"
          - name: AIRFLOW__WEBSERVER__EXPOSE_CONFIG
            value: "False"
          - name: AIRFLOW__CORE__TEST_CONNECTION
            value: "Disabled"

        # Config overrides
        config:
          core:
            dags_folder: /opt/airflow/dags
            parallelism: 64
            max_active_tasks_per_dag: 32
            max_active_runs_per_dag: 4
          kubernetes_executor:
            namespace: airflow
            worker_container_repository: apache/airflow
            worker_container_tag: 2.8.1-python3.11
            delete_worker_pods: "True"
            delete_worker_pods_on_failure: "False"
          logging:
            remote_logging: "True"
            remote_log_conn_id: aws_s3
            remote_base_log_folder: "s3://airflow-logs/task-logs/"

        # Create initial connections and variables
        createUserJob:
          useHelmHooks: false
        migrateDatabaseJob:
          useHelmHooks: false
  destination:
    server: https://kubernetes.default.svc
    namespace: airflow
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
    retry:
      limit: 3
      backoff:
        duration: 30s
        factor: 2
        maxDuration: 5m
```

Key configuration decisions:

- **KubernetesExecutor** creates a pod for each task, providing perfect isolation and autoscaling. No worker pool to manage.
- **Git-sync** pulls DAGs from a separate Git repository. This decouples DAG development from infrastructure changes.
- **Disabled Helm hooks** for database migration and user creation jobs to avoid conflicts with ArgoCD sync.

## Step 2: Configure Ingress

```yaml
# airflow-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: airflow-ingress
  namespace: airflow
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - airflow.example.com
      secretName: airflow-tls
  rules:
    - host: airflow.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: airflow-production-webserver
                port:
                  number: 8080
```

## Step 3: Custom Worker Pod Templates

For tasks that need specific resources (like GPU or extra libraries), define pod templates:

```yaml
# ConfigMap with pod template
apiVersion: v1
kind: ConfigMap
metadata:
  name: airflow-pod-templates
  namespace: airflow
data:
  gpu_worker.yaml: |
    apiVersion: v1
    kind: Pod
    metadata:
      labels:
        worker-type: gpu
    spec:
      nodeSelector:
        nvidia.com/gpu.present: "true"
      tolerations:
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
      containers:
        - name: base
          image: myregistry/airflow-gpu:2.8.1
          resources:
            requests:
              nvidia.com/gpu: "1"
              cpu: "4"
              memory: "16Gi"
            limits:
              nvidia.com/gpu: "1"
              cpu: "8"
              memory: "32Gi"

  heavy_worker.yaml: |
    apiVersion: v1
    kind: Pod
    spec:
      nodeSelector:
        node-type: compute-optimized
      containers:
        - name: base
          resources:
            requests:
              cpu: "8"
              memory: "32Gi"
            limits:
              cpu: "16"
              memory: "64Gi"
```

DAG authors reference these templates in their task definitions:

```python
from airflow.providers.cncf.kubernetes.operators.pod import KubernetesPodOperator

gpu_task = KubernetesPodOperator(
    task_id="gpu_training",
    name="model-training",
    image="myregistry/training:v1.0",
    pod_template_file="/opt/airflow/pod_templates/gpu_worker.yaml",
    namespace="airflow",
)
```

## Step 4: Managing Airflow Connections and Variables

Store Airflow connections as Kubernetes secrets:

```yaml
# airflow-connections.yaml
apiVersion: v1
kind: Secret
metadata:
  name: airflow-connections
  namespace: airflow
type: Opaque
stringData:
  AIRFLOW_CONN_AWS_S3: "aws://AKIAIOSFODNN7EXAMPLE:secret@/?region_name=us-east-1"
  AIRFLOW_CONN_POSTGRES_DW: "postgresql://etl:password@warehouse.example.com:5432/analytics"
  AIRFLOW_CONN_SLACK: "slack://:xoxb-token@/"
```

Reference these in the Helm values:

```yaml
extraEnvFrom: |
  - secretRef:
      name: airflow-connections
```

## Step 5: DAG Repository Setup

The DAG repository is separate from the infrastructure repository:

```text
airflow-dags/
  dags/
    daily_etl.py
    hourly_metrics.py
    ml_pipeline.py
  plugins/
    custom_operators/
      __init__.py
      data_quality.py
  tests/
    test_daily_etl.py
    test_ml_pipeline.py
  requirements.txt
```

ArgoCD manages the infrastructure. Git-sync pulls the DAGs. This separation means data engineers can deploy new DAGs without touching infrastructure, and platform engineers can upgrade Airflow without affecting DAGs.

## Upgrading Airflow

To upgrade Airflow, update the chart version and image tag:

```yaml
targetRevision: 1.14.0
helm:
  values: |
    defaultAirflowTag: 2.9.0-python3.11
```

ArgoCD will:

1. Run the database migration job
2. Rolling update the webserver
3. Rolling update the scheduler
4. New KubernetesExecutor pods will use the new image automatically

## Monitoring Airflow

Add a ServiceMonitor for Airflow's StatsD metrics:

```yaml
# Enable StatsD in Helm values
statsd:
  enabled: true
  resources:
    requests:
      cpu: "100m"
      memory: "128Mi"

# ServiceMonitor
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: airflow-metrics
spec:
  selector:
    matchLabels:
      component: statsd
  endpoints:
    - port: statsd-metrics
      interval: 30s
```

## Best Practices

1. **Use KubernetesExecutor** for dynamic workloads - each task gets its own pod, so a failing task cannot affect others.

2. **Separate DAGs from infrastructure** - Use git-sync for DAGs so data engineers can work independently.

3. **Disable Helm hooks** - Set `useHelmHooks: false` for migration jobs to let ArgoCD manage them as regular resources.

4. **Remote logging** - Always configure remote logging to S3 or GCS. Local logs are lost when worker pods are deleted.

5. **Test DAGs in CI** - Run `airflow dags test` in your DAG repository's CI pipeline before merging.

Deploying Airflow with ArgoCD gives your data engineering team a reliable, version-controlled orchestration platform. Every infrastructure change is auditable, and the separation between DAG development and platform management keeps things clean.
