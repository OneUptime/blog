# How to Use managedBy Field in CronJobs for External Controller Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CronJob, Controller, Custom Resources

Description: Learn how to use the managedBy field in Kubernetes CronJobs to integrate external controllers and implement custom scheduling logic beyond standard cron expressions.

---

The managedBy field in Kubernetes Jobs tells Kubernetes which controller is responsible for reconciling the Job. CronJobs do not have a top-level managedBy field, but they can set this field in their jobTemplate so every Job they create is delegated to an external Job controller.

This enables advanced use cases like dynamic execution based on external conditions, complex dependencies between jobs, or integration with external orchestration systems like Apache Airflow or Temporal.

## Understanding managedBy Field

The managedBy field is a Job spec field. It was introduced by the JobManagedBy feature gate in Kubernetes 1.30, became beta and enabled by default in Kubernetes 1.32, and is stable in Kubernetes 1.35. When set to a value other than the default `kubernetes.io/job-controller`, the built-in Job controller skips the Job, letting your custom controller handle it.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: custom-scheduled-job
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      managedBy: "custom.example.com/scheduler"  # Custom Job controller
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: worker
            image: worker:latest
```

With managedBy set in the jobTemplate, the built-in CronJob controller still creates Jobs on the configured cron schedule. The built-in Job controller will not reconcile those Jobs, so your custom controller identified by "custom.example.com/scheduler" must watch the Jobs and manage their execution and status.

## Building a Custom Controller

A basic custom controller watches delegated Jobs:

```python
#!/usr/bin/env python3
from kubernetes import client, config
import time
from datetime import datetime, timezone

CONTROLLER_NAME = "custom.example.com/scheduler"

def should_start_job(job):
    """Custom execution logic"""
    # Example: Only run on weekdays
    today = datetime.now().weekday()
    if today >= 5:  # Saturday=5, Sunday=6
        print(f"Deferring {job.metadata.name} on weekend")
        return False

    # Example: Check external condition
    # if not external_api_allows_execution():
    #     return False

    return True

def start_pod_for_job(job):
    """Create a Pod from a delegated Job template"""
    core_v1 = client.CoreV1Api()
    batch_v1 = client.BatchV1Api()

    namespace = job.metadata.namespace
    template_metadata = job.spec.template.metadata or client.V1ObjectMeta()
    labels = dict(template_metadata.labels or {})
    labels["batch.kubernetes.io/job-name"] = job.metadata.name

    pod = client.V1Pod(
        metadata=client.V1ObjectMeta(
            generate_name=f"{job.metadata.name}-",
            namespace=namespace,
            labels=labels,
            owner_references=[
                client.V1OwnerReference(
                    api_version=job.api_version,
                    kind=job.kind,
                    name=job.metadata.name,
                    uid=job.metadata.uid,
                    controller=True
                )
            ]
        ),
        spec=job.spec.template.spec
    )

    core_v1.create_namespaced_pod(namespace=namespace, body=pod)
    print(f"Started pod for job {job.metadata.name}")

    batch_v1.patch_namespaced_job_status(
        name=job.metadata.name,
        namespace=namespace,
        body={
            "status": {
                "active": 1,
                "startTime": datetime.now(timezone.utc).isoformat()
            }
        }
    )

def sync_job_status(job):
    """Update basic Job status from owned Pods"""
    core_v1 = client.CoreV1Api()
    batch_v1 = client.BatchV1Api()
    namespace = job.metadata.namespace

    pods = core_v1.list_namespaced_pod(
        namespace=namespace,
        label_selector=f"batch.kubernetes.io/job-name={job.metadata.name}"
    )

    active = sum(1 for pod in pods.items if pod.status.phase in ("Pending", "Running"))
    succeeded = sum(1 for pod in pods.items if pod.status.phase == "Succeeded")
    failed = sum(1 for pod in pods.items if pod.status.phase == "Failed")

    status = {"active": active, "succeeded": succeeded, "failed": failed}
    if succeeded >= (job.spec.completions or 1):
        status["completionTime"] = datetime.now(timezone.utc).isoformat()
        status["conditions"] = [{
            "type": "Complete",
            "status": "True",
            "reason": "PodsCompleted",
            "message": "All delegated pods completed",
            "lastTransitionTime": datetime.now(timezone.utc).isoformat()
        }]
    elif failed >= (job.spec.backoff_limit or 6):
        status["conditions"] = [{
            "type": "Failed",
            "status": "True",
            "reason": "BackoffLimitExceeded",
            "message": "Delegated pods exceeded the backoff limit",
            "lastTransitionTime": datetime.now(timezone.utc).isoformat()
        }]

    batch_v1.patch_namespaced_job_status(
        name=job.metadata.name,
        namespace=namespace,
        body={"status": status}
    )
    return status

def process_jobs():
    """Main controller loop"""
    config.load_kube_config()
    batch_v1 = client.BatchV1Api()

    while True:
        # List Jobs delegated to this controller
        jobs = batch_v1.list_job_for_all_namespaces()

        for job in jobs.items:
            if job.spec.managed_by != CONTROLLER_NAME:
                continue

            current_status = sync_job_status(job)

            if current_status["active"] or current_status["succeeded"] or current_status["failed"]:
                continue

            if should_start_job(job):
                start_pod_for_job(job)

        time.sleep(60)  # Check every minute

if __name__ == "__main__":
    process_jobs()
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
  resources: ["jobs", "jobs/status"]
  verbs: ["get", "list", "watch", "patch"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch", "create"]
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

Start jobs based on cluster conditions:

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

def should_start_job(job):
    """Only run job if cluster has capacity"""
    cpu_usage = get_cluster_cpu_usage()

    if cpu_usage > 0.8:  # 80% CPU usage
        print(f"Cluster busy ({cpu_usage:.0%}), deferring {job.metadata.name}")
        return False

    return True
```

## Dependency-Based Scheduling

Run jobs only after dependencies complete:

```python
def check_dependencies(job):
    """Check if prerequisite jobs completed"""
    config.load_kube_config()
    batch_v1 = client.BatchV1Api()

    # Check annotation for dependencies
    annotations = job.metadata.annotations or {}
    depends_on = annotations.get('depends-on', '')
    if not depends_on:
        return True

    for dep_name in depends_on.split(','):
        # Check if dependency job exists and succeeded
        try:
            jobs = batch_v1.list_namespaced_job(
                namespace=job.metadata.namespace,
                label_selector=f'workflow-step={dep_name.strip()}'
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
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    metadata:
      labels:
        workflow-step: data-load
      annotations:
        depends-on: "data-extract,data-transform"
    spec:
      managedBy: "custom.example.com/scheduler"
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
        metadata=client.V1ObjectMeta(name=job_name, namespace=namespace),
        spec=cronjob.spec.job_template.spec
    )

    batch_v1.create_namespaced_job(namespace=namespace, body=job)
    print(f"Created {job_name}")

with DAG('kubernetes_jobs', start_date=datetime(2026, 1, 1),
         schedule='@daily') as dag:

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
        # Check controller is processing Jobs
        return jsonify({'status': 'healthy', 'controller': CONTROLLER_NAME})

    @app.route('/metrics')
    def metrics():
        # Expose Prometheus metrics
        return f"""
# HELP jobs_managed Number of Jobs managed

# TYPE jobs_managed gauge
jobs_managed{{controller="{CONTROLLER_NAME}"}} {count_managed_jobs()}

# HELP jobs_created_total Total jobs created
# TYPE jobs_created_total counter
jobs_created_total{{controller="{CONTROLLER_NAME}"}} {jobs_created}
"""

    app.run(host='0.0.0.0', port=8080)
```

The managedBy field enables sophisticated Job execution beyond the built-in Job controller. Use it with CronJob jobTemplates to integrate with external orchestrators or build advanced workflow systems on top of Kubernetes primitives.
