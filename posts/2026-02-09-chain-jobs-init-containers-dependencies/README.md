# How to Chain Multiple Jobs in Sequence Using Init Containers and Job Dependencies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Jobs, Workflows, Dependencies

Description: Learn how to create sequential job pipelines in Kubernetes using init containers, job completion checks, and workflow patterns for complex batch processing workflows.

---

Many batch processing scenarios require jobs to run in a specific order. Database migrations must complete before app deployments. Data extraction precedes transformation and loading. Building job chains ensures work happens in the right sequence, with each step depending on the success of previous steps.

Kubernetes doesn't have built-in job dependencies, but you can implement them using init containers that wait for other jobs to complete, custom controllers that create jobs sequentially, or workflow engines like Argo Workflows that provide native dependency management.

## Using Init Containers for Dependencies

The simplest approach uses init containers to wait for prerequisite jobs:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: step-1-extract
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: extractor
        image: data-extractor:latest
        command: ["./extract-data.sh"]
---
apiVersion: batch/v1
kind: Job
metadata:
  name: step-2-transform
spec:
  template:
    spec:
      restartPolicy: OnFailure
      serviceAccountName: job-waiter
      initContainers:
      - name: wait-for-extract
        image: bitnami/kubectl:latest
        command:
        - /bin/bash
        - -c
        - |
          echo "Waiting for step-1-extract to complete..."
          until kubectl wait --for=condition=complete --timeout=1h job/step-1-extract; do
            echo "Job not complete yet, waiting..."
            sleep 10
          done
          echo "Prerequisite job complete, proceeding"
      containers:
      - name: transformer
        image: data-transformer:latest
        command: ["./transform-data.sh"]
---
apiVersion: batch/v1
kind: Job
metadata:
  name: step-3-load
spec:
  template:
    spec:
      restartPolicy: OnFailure
      serviceAccountName: job-waiter
      initContainers:
      - name: wait-for-transform
        image: bitnami/kubectl:latest
        command:
        - /bin/bash
        - -c
        - |
          kubectl wait --for=condition=complete --timeout=1h job/step-2-transform
      containers:
      - name: loader
        image: data-loader:latest
        command: ["./load-data.sh"]
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: job-waiter
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: job-waiter-role
rules:
- apiGroups: ["batch"]
  resources: ["jobs"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: job-waiter-binding
subjects:
- kind: ServiceAccount
  name: job-waiter
roleRef:
  kind: Role
  name: job-waiter-role
  apiGroup: rbac.authorization.k8s.io
```

This creates a three-step pipeline where each job waits for the previous one to complete successfully before starting.

## Creating Jobs Sequentially with a Controller

Build a simple controller that creates jobs one at a time:

```python
#!/usr/bin/env python3
from kubernetes import client, config
import time

def wait_for_job_completion(job_name, namespace='default', timeout=3600):
    """Wait for a job to complete successfully"""
    config.load_kube_config()
    batch_v1 = client.BatchV1Api()

    start_time = time.time()

    while True:
        if time.time() - start_time > timeout:
            raise TimeoutError(f"Job {job_name} did not complete within {timeout}s")

        job = batch_v1.read_namespaced_job(job_name, namespace)

        if job.status.succeeded and job.status.succeeded > 0:
            print(f"Job {job_name} completed successfully")
            return True

        if job.status.failed and job.status.failed >= job.spec.backoff_limit:
            raise Exception(f"Job {job_name} failed")

        print(f"Waiting for {job_name}...")
        time.sleep(10)

def create_job(name, image, command, namespace='default'):
    """Create a Kubernetes Job"""
    config.load_kube_config()
    batch_v1 = client.BatchV1Api()

    job = client.V1Job(
        metadata=client.V1ObjectMeta(name=name),
        spec=client.V1JobSpec(
            template=client.V1PodTemplateSpec(
                spec=client.V1PodSpec(
                    restart_policy="OnFailure",
                    containers=[
                        client.V1Container(
                            name="worker",
                            image=image,
                            command=command
                        )
                    ]
                )
            )
        )
    )

    batch_v1.create_namespaced_job(namespace=namespace, body=job)
    print(f"Created job {name}")

def run_job_pipeline():
    """Run a sequence of jobs"""
    jobs = [
        {
            'name': 'fetch-data',
            'image': 'data-fetcher:latest',
            'command': ['./fetch.sh']
        },
        {
            'name': 'process-data',
            'image': 'data-processor:latest',
            'command': ['./process.sh']
        },
        {
            'name': 'upload-results',
            'image': 'uploader:latest',
            'command': ['./upload.sh']
        }
    ]

    for job_config in jobs:
        print(f"\nStarting job: {job_config['name']}")
        create_job(
            name=job_config['name'],
            image=job_config['image'],
            command=job_config['command']
        )

        wait_for_job_completion(job_config['name'])

    print("\nPipeline complete!")

if __name__ == "__main__":
    run_job_pipeline()
```

Run this as a Kubernetes Job itself to orchestrate the pipeline.

## Using Job Completion as a Gate

Create a more sophisticated wait mechanism:

```bash
#!/bin/bash
# wait-for-job.sh

JOB_NAME=$1
NAMESPACE=${2:-default}
TIMEOUT=${3:-3600}

echo "Waiting for job $JOB_NAME to complete (timeout: ${TIMEOUT}s)"

START_TIME=$(date +%s)

while true; do
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))

  if [ $ELAPSED -gt $TIMEOUT ]; then
    echo "Timeout waiting for job $JOB_NAME"
    exit 1
  fi

  # Check if job exists
  if ! kubectl get job $JOB_NAME -n $NAMESPACE &>/dev/null; then
    echo "Job $JOB_NAME does not exist yet, waiting..."
    sleep 5
    continue
  fi

  # Check job status
  SUCCEEDED=$(kubectl get job $JOB_NAME -n $NAMESPACE -o jsonpath='{.status.succeeded}')
  FAILED=$(kubectl get job $JOB_NAME -n $NAMESPACE -o jsonpath='{.status.failed}')
  BACKOFF_LIMIT=$(kubectl get job $JOB_NAME -n $NAMESPACE -o jsonpath='{.spec.backoffLimit}')

  if [ "$SUCCEEDED" == "1" ] || [ "$SUCCEEDED" -gt 0 ]; then
    echo "Job $JOB_NAME completed successfully"
    exit 0
  fi

  if [ ! -z "$FAILED" ] && [ ! -z "$BACKOFF_LIMIT" ]; then
    if [ "$FAILED" -ge "$BACKOFF_LIMIT" ]; then
      echo "Job $JOB_NAME failed (attempts exhausted)"
      exit 1
    fi
  fi

  echo "Job status: succeeded=$SUCCEEDED, failed=$FAILED (elapsed: ${ELAPSED}s)"
  sleep 10
done
```

Use in init containers:

```yaml
initContainers:
- name: wait-for-previous
  image: bitnami/kubectl:latest
  volumeMounts:
  - name: scripts
    mountPath: /scripts
  command: ["/scripts/wait-for-job.sh", "previous-job", "default", "1800"]
volumes:
- name: scripts
  configMap:
    name: wait-scripts
    defaultMode: 0755
```

## Passing Data Between Jobs

Share data using persistent volumes:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pipeline-data
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
---
apiVersion: batch/v1
kind: Job
metadata:
  name: extract
spec:
  template:
    spec:
      restartPolicy: OnFailure
      volumes:
      - name: shared-data
        persistentVolumeClaim:
          claimName: pipeline-data
      containers:
      - name: extractor
        image: extractor:latest
        volumeMounts:
        - name: shared-data
          mountPath: /data
        command:
        - /bin/bash
        - -c
        - |
          echo "Extracting data..."
          ./extract.sh > /data/extracted.json
          echo "Extraction complete"
---
apiVersion: batch/v1
kind: Job
metadata:
  name: transform
spec:
  template:
    spec:
      restartPolicy: OnFailure
      serviceAccountName: job-waiter
      volumes:
      - name: shared-data
        persistentVolumeClaim:
          claimName: pipeline-data
      initContainers:
      - name: wait-for-extract
        image: bitnami/kubectl:latest
        command: ["kubectl", "wait", "--for=condition=complete", "job/extract"]
      containers:
      - name: transformer
        image: transformer:latest
        volumeMounts:
        - name: shared-data
          mountPath: /data
        command:
        - /bin/bash
        - -c
        - |
          echo "Transforming data..."
          ./transform.sh /data/extracted.json > /data/transformed.json
          echo "Transformation complete"
```

## Using Argo Workflows for Complex Dependencies

For production use, consider Argo Workflows:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: data-pipeline-
spec:
  entrypoint: pipeline
  templates:
  - name: pipeline
    steps:
    - - name: extract
        template: extract-data
    - - name: transform
        template: transform-data
    - - name: load
        template: load-data

  - name: extract-data
    container:
      image: data-extractor:latest
      command: ["./extract.sh"]

  - name: transform-data
    container:
      image: data-transformer:latest
      command: ["./transform.sh"]

  - name: load-data
    container:
      image: data-loader:latest
      command: ["./load.sh"]
```

Argo provides native dependency management, parameter passing, conditional execution, and DAG-based workflows.

## Implementing Retry Logic Across Jobs

Handle failures with pipeline-level retries:

```python
#!/usr/bin/env python3
from kubernetes import client, config
import time

def run_job_with_retry(job_name, image, command, max_retries=3):
    """Create and run a job with retry logic"""
    config.load_kube_config()
    batch_v1 = client.BatchV1Api()

    for attempt in range(max_retries):
        try:
            # Create unique job name for each attempt
            unique_name = f"{job_name}-attempt-{attempt}"

            job = client.V1Job(
                metadata=client.V1ObjectMeta(name=unique_name),
                spec=client.V1JobSpec(
                    template=client.V1PodTemplateSpec(
                        spec=client.V1PodSpec(
                            restart_policy="OnFailure",
                            containers=[client.V1Container(
                                name="worker",
                                image=image,
                                command=command
                            )]
                        )
                    )
                )
            )

            batch_v1.create_namespaced_job(namespace='default', body=job)
            print(f"Created job {unique_name} (attempt {attempt + 1}/{max_retries})")

            # Wait for completion
            wait_for_job_completion(unique_name)
            print(f"Job {unique_name} succeeded")
            return True

        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            if attempt == max_retries - 1:
                print(f"Job {job_name} failed after {max_retries} attempts")
                raise

            print(f"Retrying in 30 seconds...")
            time.sleep(30)

    return False
```

## Conditional Job Execution

Run jobs based on previous results:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: conditional-step
spec:
  template:
    spec:
      restartPolicy: OnFailure
      serviceAccountName: job-waiter
      volumes:
      - name: shared-data
        persistentVolumeClaim:
          claimName: pipeline-data
      initContainers:
      - name: check-condition
        image: busybox
        volumeMounts:
        - name: shared-data
          mountPath: /data
        command:
        - /bin/sh
        - -c
        - |
          # Check if previous job produced data requiring this step
          if [ -f /data/requires-processing.flag ]; then
            echo "Condition met, proceeding"
            exit 0
          else
            echo "Condition not met, skipping this job"
            # Touch a success marker so job completes
            touch /data/skipped.flag
            exit 0
          fi
      containers:
      - name: processor
        image: processor:latest
        volumeMounts:
        - name: shared-data
          mountPath: /data
        command:
        - /bin/bash
        - -c
        - |
          if [ -f /data/skipped.flag ]; then
            echo "Skipped by init container"
            exit 0
          fi

          echo "Running conditional processing"
          ./process.sh
```

Chaining jobs enables complex batch processing workflows in Kubernetes. Choose the approach that fits your complexity: init containers for simple chains, custom controllers for moderate complexity, or workflow engines like Argo for production-grade pipelines with advanced features.
