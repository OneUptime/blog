# How to Scale Airflow Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Airflow, Data Engineering, Scaling, Kubernetes, Performance, Infrastructure

Description: A practical guide to scaling Apache Airflow deployments from hundreds to thousands of DAGs, covering executor optimization, database tuning, and architectural patterns.

---

Airflow works fine for small deployments, but scaling to thousands of DAGs and millions of task runs requires careful architecture. This guide covers the bottlenecks you will hit and how to overcome them.

## Understanding Airflow Bottlenecks

Before scaling, understand where Airflow struggles:

```mermaid
flowchart TB
    subgraph Bottlenecks["Common Bottlenecks"]
        B1[Scheduler CPU]
        B2[Metadata DB]
        B3[DAG Parsing]
        B4[Worker Capacity]
        B5[Log Storage]
    end

    subgraph Impact["User Impact"]
        I1[Delayed Task Scheduling]
        I2[Slow UI]
        I3[DAG Load Failures]
        I4[Task Queue Buildup]
        I5[Missing Logs]
    end

    B1 --> I1
    B2 --> I2
    B3 --> I3
    B4 --> I4
    B5 --> I5
```

## Scaling the Scheduler

The scheduler is the brain of Airflow. It parses DAGs, creates task instances, and queues them for execution.

### Run Multiple Schedulers

Airflow 2.0+ supports multiple schedulers for high availability and throughput:

```ini
# airflow.cfg
[scheduler]
# Number of schedulers (run as separate processes)
num_runs = -1  # Run continuously

# How often to scan DAG folder
dag_dir_list_interval = 300  # 5 minutes

# Parsing processes
parsing_processes = 4

# How many DAGs to parse per scheduler heartbeat
min_file_process_interval = 30
```

Deploy multiple scheduler pods:

```yaml
# kubernetes/scheduler-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: airflow-scheduler
spec:
  replicas: 2  # Multiple schedulers
  selector:
    matchLabels:
      app: airflow-scheduler
  template:
    spec:
      containers:
        - name: scheduler
          image: apache/airflow:2.8.0
          command: ["airflow", "scheduler"]
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
            limits:
              cpu: "4"
              memory: "8Gi"
          env:
            - name: AIRFLOW__SCHEDULER__STANDALONE_DAG_PROCESSOR
              value: "False"
```

### Optimize Scheduler Settings

```ini
# airflow.cfg
[scheduler]
# Reduce scheduler loop time
scheduler_heartbeat_sec = 5

# Max DAG runs to create per loop
max_dagruns_to_create_per_loop = 10

# Max task instances to schedule per loop
max_tis_per_query = 512

# Use database row-level locking
use_row_level_locking = True

[core]
# Parallelism across entire deployment
parallelism = 256

# Per-DAG limits
max_active_tasks_per_dag = 32
max_active_runs_per_dag = 16
```

### Separate DAG Processor

For very large deployments, run DAG parsing separately:

```yaml
# kubernetes/dag-processor-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: airflow-dag-processor
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: dag-processor
          image: apache/airflow:2.8.0
          command: ["airflow", "dag-processor"]
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
```

```ini
# airflow.cfg for schedulers
[scheduler]
standalone_dag_processor = True
```

## Scaling the Metadata Database

The PostgreSQL metadata database is the most common bottleneck at scale.

### Database Optimization

```sql
-- Essential indexes (beyond defaults)
CREATE INDEX CONCURRENTLY idx_ti_state_dag ON task_instance(state, dag_id);
CREATE INDEX CONCURRENTLY idx_ti_dag_date ON task_instance(dag_id, execution_date);
CREATE INDEX CONCURRENTLY idx_dr_dag_state ON dag_run(dag_id, state);
CREATE INDEX CONCURRENTLY idx_log_dttm ON log(dttm);

-- Analyze tables for query planner
ANALYZE task_instance;
ANALYZE dag_run;
ANALYZE log;
```

### Connection Pooling with PgBouncer

```yaml
# kubernetes/pgbouncer-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pgbouncer-config
data:
  pgbouncer.ini: |
    [databases]
    airflow = host=postgres port=5432 dbname=airflow

    [pgbouncer]
    listen_addr = 0.0.0.0
    listen_port = 6432
    auth_type = md5
    auth_file = /etc/pgbouncer/userlist.txt
    pool_mode = transaction
    max_client_conn = 1000
    default_pool_size = 50
    min_pool_size = 10
    reserve_pool_size = 10
```

Update Airflow to use PgBouncer:

```ini
# airflow.cfg
[database]
sql_alchemy_conn = postgresql+psycopg2://airflow:password@pgbouncer:6432/airflow
sql_alchemy_pool_size = 5
sql_alchemy_pool_recycle = 1800
sql_alchemy_max_overflow = 10
```

### Database Maintenance

Schedule regular cleanup:

```bash
#!/bin/bash
# db_maintenance.sh - Run weekly

# Clean old task instances (keep 90 days)
airflow db clean --clean-before-timestamp $(date -d '90 days ago' +%Y-%m-%d) --tables task_instance -y

# Clean old DAG runs
airflow db clean --clean-before-timestamp $(date -d '90 days ago' +%Y-%m-%d) --tables dag_run -y

# Clean old logs
airflow db clean --clean-before-timestamp $(date -d '30 days ago' +%Y-%m-%d) --tables log -y

# Vacuum to reclaim space
psql -h postgres -U airflow -c "VACUUM ANALYZE;"
```

## Scaling Workers

### CeleryExecutor Scaling

```mermaid
flowchart LR
    subgraph Scheduler
        S[Scheduler]
    end

    subgraph Broker
        R[(Redis Cluster)]
    end

    subgraph Workers["Worker Fleet"]
        W1[Worker Pool 1<br/>default queue]
        W2[Worker Pool 2<br/>high-memory queue]
        W3[Worker Pool 3<br/>gpu queue]
    end

    S --> R
    R --> W1
    R --> W2
    R --> W3
```

Worker deployment with autoscaling:

```yaml
# kubernetes/worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: airflow-worker-default
spec:
  replicas: 5
  template:
    spec:
      containers:
        - name: worker
          image: apache/airflow:2.8.0
          command: ["airflow", "celery", "worker"]
          args:
            - "--queues=default"
            - "--concurrency=16"
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
            limits:
              cpu: "4"
              memory: "8Gi"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: airflow-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: airflow-worker-default
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: External
      external:
        metric:
          name: celery_queue_length
          selector:
            matchLabels:
              queue: default
        target:
          type: AverageValue
          averageValue: "10"
```

### KubernetesExecutor Scaling

KubernetesExecutor scales dynamically but needs resource quotas:

```yaml
# kubernetes/resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: airflow-worker-quota
  namespace: airflow
spec:
  hard:
    requests.cpu: "100"
    requests.memory: "200Gi"
    limits.cpu: "200"
    limits.memory: "400Gi"
    pods: "500"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: airflow-worker-limits
  namespace: airflow
spec:
  limits:
    - default:
        cpu: "1"
        memory: "2Gi"
      defaultRequest:
        cpu: "500m"
        memory: "1Gi"
      type: Container
```

### Worker Pools

Use pools to limit concurrent access to shared resources:

```bash
# Create pools
airflow pools set database_pool 20 "Limit concurrent DB connections"
airflow pools set api_pool 10 "Rate limit external API calls"
airflow pools set gpu_pool 4 "Limited GPU resources"
```

```python
# Use pools in tasks
task = PythonOperator(
    task_id='db_heavy_task',
    python_callable=run_heavy_query,
    pool='database_pool',
    pool_slots=2  # Uses 2 slots from pool
)
```

## Optimizing DAG Parsing

### Reduce Parse Time

```python
# BAD: Heavy imports at module level
import pandas as pd  # Imported every parse
import tensorflow as tf

def my_task():
    # Use pandas and tf
    pass

# GOOD: Lazy imports inside functions
def my_task():
    import pandas as pd
    import tensorflow as tf
    # Use pandas and tf
```

### Use DAG Serialization

```ini
# airflow.cfg
[core]
store_serialized_dags = True
min_serialized_dag_update_interval = 30
min_serialized_dag_fetch_interval = 10
```

### DAG Factory Pattern

For many similar DAGs, use a factory to reduce parsing overhead:

```python
# dags/dag_factory.py
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime
import yaml

def create_etl_dag(config):
    """Factory function to create ETL DAGs"""
    dag_id = f"etl_{config['source']}_{config['destination']}"

    with DAG(
        dag_id=dag_id,
        start_date=datetime(2024, 1, 1),
        schedule=config.get('schedule', '@daily'),
        catchup=False,
        tags=['etl', config['source']]
    ) as dag:

        extract = PythonOperator(
            task_id='extract',
            python_callable=extract_data,
            op_kwargs={'source': config['source']}
        )

        load = PythonOperator(
            task_id='load',
            python_callable=load_data,
            op_kwargs={'destination': config['destination']}
        )

        extract >> load

    return dag

# Load configs and create DAGs
with open('/opt/airflow/config/etl_configs.yaml') as f:
    configs = yaml.safe_load(f)

for config in configs:
    globals()[f"dag_{config['source']}"] = create_etl_dag(config)
```

```yaml
# config/etl_configs.yaml
- source: mysql_orders
  destination: warehouse_orders
  schedule: "@hourly"
- source: postgres_users
  destination: warehouse_users
  schedule: "@daily"
- source: mongo_events
  destination: warehouse_events
  schedule: "*/15 * * * *"
```

## Log Storage at Scale

### Remote Logging

```ini
# airflow.cfg
[logging]
remote_logging = True
remote_log_conn_id = aws_s3
remote_base_log_folder = s3://airflow-logs/production
encrypt_s3_logs = True

# Delete local logs after upload
delete_local_logs = True

# Log retention
[scheduler]
log_cleanup_interval = 86400  # Clean logs daily
```

### Elasticsearch for Log Search

```ini
# airflow.cfg
[elasticsearch]
host = elasticsearch:9200
log_id_template = {dag_id}-{task_id}-{run_id}-{try_number}
end_of_log_mark = end_of_log
frontend = http://kibana:5601/app/discover#/?_a=(columns:!(message),query:(language:kuery,query:'log_id:{log_id}'))
```

## Architectural Patterns for Scale

### Multi-Tenant Architecture

```mermaid
flowchart TB
    subgraph Shared["Shared Infrastructure"]
        DB[(PostgreSQL)]
        Redis[(Redis)]
        S3[(S3 Logs)]
    end

    subgraph TenantA["Team A"]
        SA[Scheduler A]
        WA[Workers A]
        NSA[Namespace: team-a]
    end

    subgraph TenantB["Team B"]
        SB[Scheduler B]
        WB[Workers B]
        NSB[Namespace: team-b]
    end

    SA --> DB
    SB --> DB
    SA --> Redis
    SB --> Redis
    WA --> S3
    WB --> S3
```

```ini
# Team A airflow.cfg
[core]
dags_folder = /opt/airflow/dags/team-a

[kubernetes]
namespace = team-a
worker_container_tag = team-a-workers

# Resource limits per team
parallelism = 64
max_active_tasks_per_dag = 16
```

### Geographic Distribution

```mermaid
flowchart TB
    subgraph US["US Region"]
        US_S[Scheduler]
        US_W[Workers]
        US_DB[(Primary DB)]
    end

    subgraph EU["EU Region"]
        EU_S[Scheduler]
        EU_W[Workers]
        EU_DB[(Read Replica)]
    end

    US_DB -->|Replicate| EU_DB
    US_S --> US_DB
    EU_S --> EU_DB
```

## Monitoring at Scale

### Key Metrics to Track

```python
# plugins/scale_metrics.py
from prometheus_client import Gauge, Counter, Histogram

# Scheduler metrics
scheduler_heartbeat = Gauge(
    'airflow_scheduler_heartbeat',
    'Last scheduler heartbeat timestamp'
)

dag_processing_time = Histogram(
    'airflow_dag_processing_seconds',
    'Time to parse DAG file',
    ['dag_file'],
    buckets=[0.1, 0.5, 1, 2, 5, 10, 30, 60]
)

# Task metrics
task_queue_length = Gauge(
    'airflow_task_queue_length',
    'Tasks waiting in queue',
    ['queue']
)

task_slot_utilization = Gauge(
    'airflow_task_slot_utilization',
    'Percentage of parallelism used'
)

# Database metrics
db_connection_pool_size = Gauge(
    'airflow_db_pool_size',
    'Active database connections'
)
```

### Alerting Rules

```yaml
# prometheus/alerts.yml
groups:
  - name: airflow
    rules:
      - alert: AirflowSchedulerDown
        expr: time() - airflow_scheduler_heartbeat > 60
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Airflow scheduler is down"

      - alert: AirflowTaskQueueBacklog
        expr: airflow_task_queue_length > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Task queue backlog growing"

      - alert: AirflowDAGParsingSlowK
        expr: histogram_quantile(0.95, airflow_dag_processing_seconds_bucket) > 30
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "DAG parsing is slow"
```

## Capacity Planning

### Sizing Guidelines

| Scale | DAGs | Tasks/Day | Scheduler | Workers | Database |
|-------|------|-----------|-----------|---------|----------|
| Small | <100 | <1K | 1x2CPU/4GB | 2-4 | 2CPU/4GB |
| Medium | 100-500 | 1K-10K | 2x4CPU/8GB | 5-20 | 4CPU/16GB |
| Large | 500-2000 | 10K-100K | 3x4CPU/8GB | 20-100 | 8CPU/32GB |
| Enterprise | 2000+ | 100K+ | 4+x8CPU/16GB | 100+ | 16CPU/64GB+ |

### Load Testing

```python
# Generate test DAGs for load testing
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime
import time

def generate_load_test_dags(count=100):
    """Generate DAGs for load testing"""
    for i in range(count):
        dag_id = f"load_test_dag_{i:04d}"

        with DAG(
            dag_id=dag_id,
            start_date=datetime(2024, 1, 1),
            schedule='@hourly',
            catchup=False
        ) as dag:

            def task_func(sleep_time=1):
                time.sleep(sleep_time)

            tasks = []
            for j in range(10):  # 10 tasks per DAG
                task = PythonOperator(
                    task_id=f'task_{j}',
                    python_callable=task_func
                )
                tasks.append(task)

            # Chain tasks
            for k in range(len(tasks) - 1):
                tasks[k] >> tasks[k + 1]

        globals()[dag_id] = dag

generate_load_test_dags(100)
```

---

Scaling Airflow is about identifying and removing bottlenecks systematically. Start with the scheduler and database, then scale workers horizontally. Use connection pooling, optimize DAG parsing, and implement proper monitoring. The key is to measure before and after each change - scaling blindly leads to wasted resources and hidden problems.
