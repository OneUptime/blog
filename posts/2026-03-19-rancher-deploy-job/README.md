# How to Deploy a Job Workload in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Job, Workload

Description: Learn how to deploy a one-time Job workload in Rancher for batch processing, data migrations, and other tasks that run to completion.

A Kubernetes Job creates one or more pods and ensures they run to successful completion. Unlike Deployments that run indefinitely, Jobs are designed for finite tasks such as data migrations, batch processing, report generation, and one-time setup operations. This guide shows you how to create and manage Jobs in Rancher.

## Prerequisites

- A running Rancher instance (v2.7 or later)
- A managed Kubernetes cluster registered in Rancher
- Access to a project and namespace

## Step 1: Navigate to the Workload View

Log in to your Rancher dashboard, select your target cluster, click **Explore**, and navigate to **Workload** from the left sidebar.

## Step 2: Create a New Job

Click the **Create** button, then choose **Job** to open the Job creation form.

Fill in the basic details:

- **Name**: Enter a descriptive name, such as `data-migration-v2`
- **Namespace**: Select the namespace where the job should run

## Step 3: Configure the Container

In the **Container** section:

- **Container Image**: Enter the image for your job, such as `python:3.11-slim`
- **Command**: Set the command to execute:
  - **Command**: `python`
  - **Arguments**: `/scripts/migrate.py`

Or for a simpler example using a shell command:

- **Command**: `sh`
- **Arguments**: `-c`, `echo "Processing batch..." && sleep 30 && echo "Done"`

## Step 4: Configure Job Parameters

In the **Job Configuration** section, set the following:

- **Completions**: The number of times the job needs to complete successfully. Set to `1` for a single run, or higher for batch processing where the same task needs multiple runs.
- **Parallelism**: The number of pods that can run simultaneously. Set to `1` to run sequentially, or higher to process in parallel.
- **Back Off Limit**: The number of retries before considering the job failed (default: 6). If a pod fails, Kubernetes will retry up to this many times.
- **Active Deadline Seconds**: The maximum duration the job can run. After this time, the job is terminated. Set this to prevent runaway jobs.

### Restart Policy

The restart policy for Jobs must be either:

- **OnFailure**: Restart the container in the same pod if it fails
- **Never**: Create a new pod if the container fails (useful for debugging since failed pod logs are preserved)

## Step 5: Add Volumes (Optional)

If your job needs to read input data or write output:

1. Click **Add Volume**
2. Choose the volume type:
   - **ConfigMap**: For configuration files
   - **PersistentVolumeClaim**: For reading/writing data
   - **Secret**: For credentials
3. Set the mount path in the container

## Step 6: Deploy the Job

Click **Launch** to submit the Job. Rancher will create the pod(s) and the job will begin executing.

## Alternative: Deploy via YAML

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-migration-v2
  namespace: default
spec:
  completions: 1
  parallelism: 1
  backoffLimit: 3
  activeDeadlineSeconds: 3600
  ttlSecondsAfterFinished: 86400
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: migration
          image: python:3.11-slim
          command:
            - python
            - /scripts/migrate.py
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
          volumeMounts:
            - name: scripts
              mountPath: /scripts
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 1Gi
      volumes:
        - name: scripts
          configMap:
            name: migration-scripts
```

### Parallel Batch Processing Example

For processing multiple items in parallel:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: batch-processor
  namespace: default
spec:
  completions: 10
  parallelism: 3
  completionMode: Indexed
  backoffLimit: 5
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: processor
          image: my-batch-processor:latest
          env:
            - name: JOB_COMPLETION_INDEX
              valueFrom:
                fieldRef:
                  fieldPath: metadata.annotations['batch.kubernetes.io/job-completion-index']
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
```

This runs 10 completions with up to 3 pods running at a time.

## Step 7: Monitor the Job

In the Rancher UI, return to **Workload** to see your job status:

- **Active**: Number of currently running pods
- **Succeeded**: Number of successfully completed pods
- **Failed**: Number of failed pods

Click on the job name to see detailed information, including individual pod statuses and logs.

Using kubectl:

```bash
kubectl get job data-migration-v2 -n default
kubectl describe job data-migration-v2 -n default
```

## Viewing Job Logs

To view the output of your job:

1. In the Rancher UI, click on the job name
2. Select the pod under the **Pods** tab
3. Click the **Logs** icon to view container output

Or with kubectl:

```bash
kubectl logs job/data-migration-v2 -n default
```

For jobs with multiple pods:

```bash
kubectl logs job/batch-processor -n default --all-pods=true
```

## Automatic Cleanup

Use `ttlSecondsAfterFinished` to automatically delete completed jobs and their pods:

```yaml
spec:
  ttlSecondsAfterFinished: 86400  # Delete 24 hours after completion
```

This keeps your cluster clean by removing finished jobs automatically.

## Deleting a Job

To manually delete a completed or failed job:

1. Go to **Workload**
2. Click the three-dot menu next to the job
3. Select **Delete**

Or with kubectl:

```bash
kubectl delete job data-migration-v2 -n default
```

## Summary

You have deployed a Job workload in Rancher for running tasks to completion. Jobs are ideal for batch processing, data migrations, and one-time operations. Rancher provides visibility into job status, pod logs, and completion progress through its UI. Use completion counts and parallelism settings to handle batch workloads efficiently, and set active deadlines to prevent runaway jobs.
