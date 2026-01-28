# How to Configure Airflow Executors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Airflow, Data Engineering, Executors, Python, Workflow Orchestration

Description: A practical guide to choosing and configuring Airflow executors for different workload requirements, from local development to production clusters.

---

The executor is the heart of Apache Airflow. It determines how your tasks run, where they run, and how many can run simultaneously. Choosing the wrong executor for your workload is one of the most common mistakes teams make when deploying Airflow.

## Understanding Executors

An executor is responsible for running the tasks that the scheduler decides should run. Different executors have different trade-offs in terms of scalability, resource isolation, and operational complexity.

```mermaid
flowchart TB
    subgraph Airflow["Airflow Components"]
        Scheduler[Scheduler]
        Executor[Executor]
        Webserver[Webserver]
        Metadata[(Metadata DB)]
    end

    subgraph Workers["Task Execution"]
        W1[Worker 1]
        W2[Worker 2]
        W3[Worker 3]
    end

    Scheduler --> Executor
    Executor --> W1
    Executor --> W2
    Executor --> W3
    Scheduler <--> Metadata
    Webserver <--> Metadata
```

## Available Executors

### LocalExecutor

Runs tasks in parallel as subprocesses on the same machine as the scheduler. Good for small to medium workloads.

```ini
# airflow.cfg
[core]
executor = LocalExecutor
parallelism = 32  # Max tasks running across all DAGs
dag_concurrency = 16  # Max tasks running per DAG

[database]
sql_alchemy_conn = postgresql+psycopg2://airflow:password@localhost/airflow
```

LocalExecutor requires a database backend that supports parallelism (PostgreSQL or MySQL). SQLite does not work.

### SequentialExecutor

Runs one task at a time. Only useful for testing and debugging.

```ini
# airflow.cfg
[core]
executor = SequentialExecutor

[database]
# SQLite works with SequentialExecutor
sql_alchemy_conn = sqlite:////home/airflow/airflow.db
```

### CeleryExecutor

Distributes tasks across multiple worker machines using Celery. The go-to choice for production deployments requiring horizontal scaling.

```ini
# airflow.cfg
[core]
executor = CeleryExecutor
parallelism = 128

[celery]
broker_url = redis://redis:6379/0
result_backend = db+postgresql://airflow:password@postgres/airflow
worker_concurrency = 16
```

```mermaid
flowchart LR
    subgraph Scheduler
        S[Airflow Scheduler]
    end

    subgraph Broker
        R[(Redis/RabbitMQ)]
    end

    subgraph Workers["Celery Workers"]
        W1[Worker 1]
        W2[Worker 2]
        W3[Worker 3]
    end

    S -->|Push Tasks| R
    R -->|Pull Tasks| W1
    R -->|Pull Tasks| W2
    R -->|Pull Tasks| W3
```

### KubernetesExecutor

Launches each task as a separate Kubernetes pod. Provides strong isolation and dynamic scaling but with higher latency for task startup.

```ini
# airflow.cfg
[core]
executor = KubernetesExecutor

[kubernetes]
namespace = airflow
worker_container_repository = apache/airflow
worker_container_tag = 2.8.0
delete_worker_pods = True
delete_worker_pods_on_failure = False
```

Additional configuration via pod template:

```yaml
# pod_template.yaml
apiVersion: v1
kind: Pod
metadata:
  name: airflow-worker
spec:
  containers:
    - name: base
      image: apache/airflow:2.8.0
      resources:
        requests:
          memory: "512Mi"
          cpu: "500m"
        limits:
          memory: "2Gi"
          cpu: "2"
      volumeMounts:
        - name: dags
          mountPath: /opt/airflow/dags
          readOnly: true
  volumes:
    - name: dags
      persistentVolumeClaim:
        claimName: airflow-dags
```

### CeleryKubernetesExecutor

A hybrid approach that uses CeleryExecutor by default but allows specific tasks to run on Kubernetes. Best of both worlds.

```ini
# airflow.cfg
[core]
executor = CeleryKubernetesExecutor

[celery]
broker_url = redis://redis:6379/0
result_backend = db+postgresql://airflow:password@postgres/airflow

[kubernetes]
namespace = airflow
worker_container_repository = apache/airflow
worker_container_tag = 2.8.0
```

To run a specific task on Kubernetes:

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime

with DAG('hybrid_dag', start_date=datetime(2024, 1, 1)) as dag:

    # Runs on Celery (default)
    quick_task = PythonOperator(
        task_id='quick_task',
        python_callable=lambda: print("Fast task on Celery")
    )

    # Runs on Kubernetes - heavy processing
    heavy_task = PythonOperator(
        task_id='heavy_task',
        python_callable=process_large_dataset,
        queue='kubernetes',  # Magic keyword for K8s
        executor_config={
            "pod_override": {
                "spec": {
                    "containers": [{
                        "name": "base",
                        "resources": {
                            "requests": {"memory": "4Gi", "cpu": "2"},
                            "limits": {"memory": "8Gi", "cpu": "4"}
                        }
                    }]
                }
            }
        }
    )
```

## Choosing the Right Executor

```mermaid
flowchart TD
    Start[Start] --> Q1{Single machine?}
    Q1 -->|Yes| Q2{Production?}
    Q1 -->|No| Q3{Need pod isolation?}

    Q2 -->|No| Seq[SequentialExecutor]
    Q2 -->|Yes| Local[LocalExecutor]

    Q3 -->|Yes| Q4{Mixed workloads?}
    Q3 -->|No| Celery[CeleryExecutor]

    Q4 -->|Yes| Hybrid[CeleryKubernetesExecutor]
    Q4 -->|No| K8s[KubernetesExecutor]
```

| Executor | Best For | Scaling | Task Isolation | Startup Latency |
|----------|----------|---------|----------------|-----------------|
| Sequential | Testing | None | None | Instant |
| Local | Small teams | Vertical | Process | Low |
| Celery | Production | Horizontal | Process | Low |
| Kubernetes | Cloud-native | Dynamic | Pod | Medium |
| CeleryK8s | Mixed workloads | Both | Mixed | Mixed |

## Configuring CeleryExecutor for Production

CeleryExecutor remains the most popular choice. Here is a production-ready configuration:

### Redis Broker Setup

```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
```

### Worker Configuration

```ini
# airflow.cfg
[celery]
# Number of tasks each worker can run simultaneously
worker_concurrency = 16

# Prefetch multiplier - how many tasks to prefetch
worker_prefetch_multiplier = 1

# Task acknowledgment timing
task_acks_late = True
task_reject_on_worker_lost = True

# Broker connection pool
broker_pool_limit = 10

# Result backend cleanup
result_expires = 86400  # 24 hours
```

### Queue Configuration

Separate queues allow routing different task types to specialized workers:

```python
# dags/etl_dag.py
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime

with DAG('etl_pipeline', start_date=datetime(2024, 1, 1)) as dag:

    # Route to high-memory workers
    transform = PythonOperator(
        task_id='transform_data',
        python_callable=heavy_transform,
        queue='high_memory'
    )

    # Route to GPU workers
    ml_inference = PythonOperator(
        task_id='ml_inference',
        python_callable=run_model,
        queue='gpu'
    )
```

Start workers for specific queues:

```bash
# High-memory worker
airflow celery worker --queues high_memory --concurrency 4

# GPU worker
airflow celery worker --queues gpu --concurrency 2

# Default worker handles unqueued tasks
airflow celery worker --queues default --concurrency 16
```

## Configuring KubernetesExecutor

### Namespace and RBAC

```yaml
# rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: airflow
  namespace: airflow
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: airflow-pod-manager
  namespace: airflow
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["create", "get", "list", "watch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: airflow-pod-manager
  namespace: airflow
subjects:
  - kind: ServiceAccount
    name: airflow
roleRef:
  kind: Role
  name: airflow-pod-manager
  apiGroup: rbac.authorization.k8s.io
```

### Per-Task Resource Configuration

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from kubernetes.client import models as k8s
from datetime import datetime

# Define resource configurations
light_resources = k8s.V1ResourceRequirements(
    requests={"cpu": "250m", "memory": "256Mi"},
    limits={"cpu": "500m", "memory": "512Mi"}
)

heavy_resources = k8s.V1ResourceRequirements(
    requests={"cpu": "2", "memory": "4Gi"},
    limits={"cpu": "4", "memory": "8Gi"}
)

with DAG('k8s_dag', start_date=datetime(2024, 1, 1)) as dag:

    light_task = PythonOperator(
        task_id='light_processing',
        python_callable=quick_job,
        executor_config={
            "pod_override": k8s.V1Pod(
                spec=k8s.V1PodSpec(
                    containers=[
                        k8s.V1Container(
                            name="base",
                            resources=light_resources
                        )
                    ]
                )
            )
        }
    )

    heavy_task = PythonOperator(
        task_id='heavy_processing',
        python_callable=big_job,
        executor_config={
            "pod_override": k8s.V1Pod(
                spec=k8s.V1PodSpec(
                    containers=[
                        k8s.V1Container(
                            name="base",
                            resources=heavy_resources
                        )
                    ],
                    # Use spot instances for cost savings
                    tolerations=[
                        k8s.V1Toleration(
                            key="kubernetes.azure.com/scalesetpriority",
                            operator="Equal",
                            value="spot",
                            effect="NoSchedule"
                        )
                    ],
                    node_selector={"node-type": "spot"}
                )
            )
        }
    )
```

## Monitoring Executor Performance

Track executor health with these key metrics:

```python
# plugins/executor_metrics.py
from airflow.plugins_manager import AirflowPlugin
from airflow.models import TaskInstance
from prometheus_client import Gauge, Counter

# Celery metrics
celery_queue_length = Gauge(
    'airflow_celery_queue_length',
    'Number of tasks in Celery queue',
    ['queue']
)

# Task execution metrics
task_duration = Gauge(
    'airflow_task_duration_seconds',
    'Task execution duration',
    ['dag_id', 'task_id']
)

executor_slots_available = Gauge(
    'airflow_executor_slots_available',
    'Available executor slots'
)
```

```bash
# Check Celery queue status
airflow celery flower  # Opens Flower UI on port 5555

# Check worker status
celery -A airflow.executors.celery_executor.app inspect active

# Check reserved tasks
celery -A airflow.executors.celery_executor.app inspect reserved
```

## Common Configuration Mistakes

### Mistake 1: parallelism Too High

```ini
# Bad - will overwhelm the scheduler
parallelism = 1000

# Better - tune based on actual capacity
parallelism = 64
```

### Mistake 2: Not Setting Task Timeouts

```python
# Bad - tasks can run forever
task = PythonOperator(
    task_id='might_hang',
    python_callable=unstable_api_call
)

# Good - set execution timeout
task = PythonOperator(
    task_id='might_hang',
    python_callable=unstable_api_call,
    execution_timeout=timedelta(hours=1)
)
```

### Mistake 3: Using SQLite with LocalExecutor

```ini
# Will fail with parallel tasks
executor = LocalExecutor
sql_alchemy_conn = sqlite:////home/airflow/airflow.db

# Use PostgreSQL instead
executor = LocalExecutor
sql_alchemy_conn = postgresql+psycopg2://user:pass@localhost/airflow
```

---

Choosing the right executor depends on your scale, infrastructure, and isolation requirements. Start with LocalExecutor for development, graduate to CeleryExecutor for production, and consider KubernetesExecutor when you need dynamic scaling or strong task isolation. The hybrid CeleryKubernetesExecutor offers flexibility when you have mixed workloads with different resource profiles.
