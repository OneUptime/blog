# How to Use managedBy Field in CronJobs for External Controller Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CronJobs, Controllers, Custom Resources

Description: Learn how to use the managedBy field in Kubernetes CronJobs to integrate external controllers and implement custom scheduling logic beyond standard cron expressions.

---

The managedBy field in CronJobs tells Kubernetes which controller is responsible for managing the CronJob's scheduling and execution. By default, this is the built-in CronJob controller, but you can specify a custom controller to implement sophisticated scheduling logic that goes beyond standard cron expressions.

This enables advanced use cases like dynamic scheduling based on external conditions, complex dependencies between jobs, or integration with external scheduling systems like Apache Airflow or Temporal.

## Understanding managedBy Field

The managedBy field requires Kubernetes 1.28 or later with the JobManagedBy feature gate enabled. When set to a value other than the default, the built-in CronJob controller ignores the CronJob, letting your custom controller handle it.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: custom-scheduled-job
spec:
  schedule: "0 2 * * *"  # Default schedule (may be overridden by controller)
  managedBy: "custom.example.com/scheduler"  # Custom controller
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: worker
            image: worker:latest
```

With managedBy set, the built-in controller won't create Jobs. Your custom controller identified by "custom.example.com/scheduler" must watch this CronJob and create Jobs according to its own logic.

## Building a Custom Controller

A basic custom controller watches CronJobs:

```python
#!/usr/bin/env python3
from kubernetes import client, config, watch
import time
from datetime import datetime

CONTROLLER_NAME = "custom.example.com/scheduler"

def should_run_job(cronjob):
    """Custom scheduling logic"""
    # Example: Only run on weekdays
    today = datetime.now().weekday()
    if today >= 5:  # Saturday=5, Sunday=6
        print(f"Skipping {cronjob.metadata.name} on weekend")
        return False

    # Example: Check external condition
    # if not external_api_allows_execution():
    #     return False

    return True

def create_job_from_cronjob(cronjob):
    """Create a Job from CronJob template"""
    config.load_kube_config()
    batch_v1 = client.BatchV1Api()

    job_name = f"{cronjob.metadata.name}-{int(time.time())}"
    namespace = cronjob.metadata.namespace

    job = client.V1Job(
        metadata=client.V1ObjectMeta(
            name=job_name,
            namespace=namespace,
            owner_references=[
                client.V1OwnerReference(
                    api_version=cronjob.api_version,
                    kind=cronjob.kind,
                    name=cronjob.metadata.name,
                    uid=cronjob.metadata.uid
                )
            ]
        ),
        spec=cronjob.spec.job_template.spec
    )

    batch_v1.create_namespaced_job(namespace=namespace, body=job)
    print(f"Created job {job_name}")

    # Update CronJob status
    cronjob.status.last_schedule_time = datetime.utcnow()
    batch_v1.patch_namespaced_cron_job_status(
        name=cronjob.metadata.name,
        namespace=namespace,
        body=cronjob
    )

def process_cronjobs():
    """Main controller loop"""
    config.load_kube_config()
    batch_v1 = client.BatchV1Api()

    while True:
        # List CronJobs managed by this controller
        cronjobs = batch_v1.list_cron_job_for_all_namespaces()

        for cj in cronjobs.items:
            if cj.spec.managed_by != CONTROLLER_NAME:
                continue

            # Check if it's time to run (simplified)
            # Real implementation would parse cron schedule
            if should_run_job(cj):
                create_job_from_cronjob(cj)

        time.sleep(60)  # Check every minute

if __name__ == "__main__":
    process_cronjobs()
```

Deploy the controller:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: custom-cronjob-controller
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cronjob-controller
  template:
    metadata:
      labels:
        app: cronjob-controller
    spec:
      serviceAccountName: cronjob-controller
      containers:
      - name: controller
        image: custom-controller:latest
        command: ["python3", "/app/controller.py"]
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cronjob-controller
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cronjob-controller-role
rules:
- apiGroups: ["batch"]
  resources: ["cronjobs", "cronjobs/status", "jobs"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cronjob-controller-binding
subjects:
- kind: ServiceAccount
  name: cronjob-controller
  namespace: default
roleRef:
  kind: ClusterRole
  name: cronjob-controller-role
  apiGroup: rbac.authorization.k8s.io
```

## Dynamic Scheduling Based on Metrics

Schedule jobs based on cluster conditions:

```python
#!/usr/bin/env python3
from kubernetes import client, config
import requests

def get_cluster_cpu_usage():
    """Get current cluster CPU usage"""
    # Query Prometheus or metrics server
    response = requests.get('http://prometheus:9090/api/v1/query',
                          params={'query': 'cluster:cpu_usage:ratio'})
    data = response.json()
    return float(data['data']['result'][0]['value'][1])

def should_run_job(cronjob):
    """Only run job if cluster has capacity"""
    cpu_usage = get_cluster_cpu_usage()

    if cpu_usage > 0.8:  # 80% CPU usage
        print(f"Cluster busy ({cpu_usage:.0%}), deferring {cronjob.metadata.name}")
        return False

    return True
```

## Dependency-Based Scheduling

Run jobs only after dependencies complete:

```python
def check_dependencies(cronjob):
    """Check if prerequisite jobs completed"""
    config.load_kube_config()
    batch_v1 = client.BatchV1Api()

    # Check annotation for dependencies
    depends_on = cronjob.metadata.annotations.get('depends-on', '')
    if not depends_on:
        return True

    for dep_name in depends_on.split(','):
        # Check if dependency job exists and succeeded
        try:
            jobs = batch_v1.list_namespaced_job(
                namespace=cronjob.metadata.namespace,
                label_selector=f'cronjob-name={dep_name.strip()}'
            )

            if not jobs.items:
                print(f"Dependency {dep_name} not found")
                return False

            latest_job = max(jobs.items, key=lambda j: j.metadata.creation_timestamp)
            if not latest_job.status.succeeded:
                print(f"Dependency {dep_name} not successful yet")
                return False

        except Exception as e:
            print(f"Error checking dependency {dep_name}: {e}")
            return False

    return True
```

Use with annotated CronJobs:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dependent-job
  annotations:
    depends-on: "data-extract,data-transform"
spec:
  schedule: "0 3 * * *"
  managedBy: "custom.example.com/scheduler"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: loader
            image: data-loader:latest
```

## Integration with External Schedulers

Bridge Kubernetes CronJobs with Airflow:

```python
#!/usr/bin/env python3
from kubernetes import client, config
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime

def trigger_kubernetes_job(cronjob_name, namespace='default'):
    """Trigger a Kubernetes Job from Airflow"""
    config.load_kube_config()
    batch_v1 = client.BatchV1Api()

    # Get CronJob
    cronjob = batch_v1.read_namespaced_cron_job(cronjob_name, namespace)

    # Create Job
    job_name = f"{cronjob_name}-airflow-{int(datetime.now().timestamp())}"

    job = client.V1Job(
        metadata=client.V1ObjectMeta(name=job_name),
        spec=cronjob.spec.job_template.spec
    )

    batch_v1.create_namespaced_job(namespace=namespace, body=job)
    print(f"Created {job_name}")

with DAG('kubernetes_jobs', start_date=datetime(2026, 1, 1),
         schedule_interval='@daily') as dag:

    task1 = PythonOperator(
        task_id='extract',
        python_callable=trigger_kubernetes_job,
        op_kwargs={'cronjob_name': 'data-extract'}
    )

    task2 = PythonOperator(
        task_id='transform',
        python_callable=trigger_kubernetes_job,
        op_kwargs={'cronjob_name': 'data-transform'}
    )

    task1 >> task2  # Airflow manages dependencies
```

## Monitoring Custom Controllers

Track controller health:

```python
def health_check_endpoint():
    """Expose health check for monitoring"""
    from flask import Flask, jsonify

    app = Flask(__name__)

    @app.route('/health')
    def health():
        # Check controller is processing CronJobs
        return jsonify({'status': 'healthy', 'controller': CONTROLLER_NAME})

    @app.route('/metrics')
    def metrics():
        # Expose Prometheus metrics
        return f"""
# HELP cronjobs_managed Number of CronJobs managed
# TYPE cronjobs_managed gauge
cronjobs_managed{{controller="{CONTROLLER_NAME}"}} {count_managed_cronjobs()}

# HELP jobs_created_total Total jobs created
# TYPE jobs_created_total counter
jobs_created_total{{controller="{CONTROLLER_NAME}"}} {jobs_created}
"""

    app.run(host='0.0.0.0', port=8080)
```

The managedBy field enables sophisticated CronJob scheduling beyond standard cron expressions. Use it to implement custom scheduling logic, integrate with external orchestrators, or build advanced workflow systems on top of Kubernetes primitives.
