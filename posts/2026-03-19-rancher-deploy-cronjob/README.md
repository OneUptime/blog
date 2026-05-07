# How to Deploy a CronJob in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, CronJob, Workload

Description: Learn how to deploy a CronJob in Rancher to run scheduled tasks on a recurring basis in your Kubernetes cluster.

CronJobs in Kubernetes allow you to run tasks on a schedule, similar to cron on Linux systems. They are useful for periodic backups, report generation, email sending, data cleanup, and other scheduled operations. This guide walks you through creating and managing CronJobs in Rancher.

## Prerequisites

- A running Rancher instance (v2.7 or later)
- A managed Kubernetes cluster registered in Rancher
- Access to a project and namespace

## Step 1: Navigate to the Workload View

Log in to your Rancher dashboard. Click **☰ > Cluster Management**, open the cluster where you want to deploy the CronJob, and click **Explore**. In the left navigation bar, click **Workload**.

## Step 2: Create a New CronJob

Click the **Create** button, then choose **CronJob**.

Fill in the basic details:

- **Name**: Enter a name like `db-backup-cron`
- **Namespace**: Select the target namespace
- **Schedule**: Enter a cron expression (e.g., `0 2 * * *` for daily at 2 AM)

### Understanding Cron Expressions

The schedule follows the standard cron format with five fields:

```plaintext
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6, Sunday = 0)
│ │ │ │ │
* * * * *
```

Common examples:

- `*/5 * * * *` - Every 5 minutes
- `0 * * * *` - Every hour
- `0 2 * * *` - Daily at 2 AM
- `0 0 * * 0` - Weekly on Sunday at midnight
- `0 0 1 * *` - Monthly on the first day

## Step 3: Configure the Container

In the **Container** section:

- **Container Image**: Enter your job image, such as `postgres:15`
- **Command**: Enter the command to execute, for example:
  - **Command**: `sh`
  - **Arguments**: `-c`, `pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > /backup/db-$(date +%Y%m%d).sql`

Add environment variables:

- `DB_HOST`: Your database hostname
- `DB_USER`: Your database username
- `DB_NAME`: Your database name
- `PGPASSWORD`: Your database password (use a Secret reference instead of plaintext)

## Step 4: Configure Job Settings

Scroll to the **Job Configuration** section:

- **Completions**: Number of times the job should run successfully (default: 1)
- **Parallelism**: Number of pods that can run in parallel (default: 1)
- **Back Off Limit**: Number of retries before marking the job as failed (default: 6)
- **Active Deadline Seconds**: Maximum time the job can run before being terminated

## Step 5: Configure CronJob-Specific Settings

- **Concurrency Policy**: Controls what happens when a new job is scheduled while a previous one is still running:
  - **Allow** (default): Multiple jobs can run concurrently
  - **Forbid**: Skip the new job if the previous one is still running
  - **Replace**: Cancel the running job and start a new one
- **Starting Deadline Seconds**: The deadline for starting the job if it misses its scheduled time
- **Successful Jobs History Limit**: Number of completed jobs to retain (default: 3)
- **Failed Jobs History Limit**: Number of failed jobs to retain (default: 1)
- **Suspend**: Set to true to pause the CronJob without deleting it

## Step 6: Deploy

Click **Create** to deploy the CronJob. It will run according to the schedule you defined.

## Alternative: Deploy via YAML

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: db-backup-cron
  namespace: default
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  startingDeadlineSeconds: 300
  jobTemplate:
    spec:
      backoffLimit: 3
      activeDeadlineSeconds: 3600
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: db-backup
              image: postgres:15
              command:
                - sh
                - -c
                - |
                  pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > /backup/db-$(date +%Y%m%d-%H%M%S).sql.gz
                  echo "Backup completed successfully"
              env:
                - name: DB_HOST
                  value: "postgres-service"
                - name: DB_USER
                  value: "admin"
                - name: DB_NAME
                  value: "production"
                - name: PGPASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: db-credentials
                      key: password
              volumeMounts:
                - name: backup-volume
                  mountPath: /backup
              resources:
                requests:
                  cpu: 100m
                  memory: 256Mi
                limits:
                  cpu: 500m
                  memory: 512Mi
          volumes:
            - name: backup-volume
              persistentVolumeClaim:
                claimName: backup-pvc
```

## Step 7: Verify the CronJob

Check the CronJob in Rancher from the cluster's **Workload** view. You will see:

- The schedule
- The last scheduled time
- Whether it is currently active
- The number of successful and failed runs

Using kubectl:

```bash
kubectl get cronjob db-backup-cron -n default
```

## Manually Triggering a CronJob

To run the CronJob immediately without waiting for the next scheduled time:

```bash
kubectl create job manual-backup --from=cronjob/db-backup-cron -n default
```

This creates a one-off Job from the CronJob template.

## Monitoring Job Runs

View the jobs in the namespace, including the ones created by your CronJob:

```bash
kubectl get jobs -n default
```

Check logs from the most recent job:

```bash
kubectl logs job/db-backup-cron-28457320 -n default
```

In Rancher, you can view job logs from the cluster's **Workload** view by opening the Job created by the CronJob.

## Suspending a CronJob

To temporarily stop a CronJob from creating new jobs:

1. Go to the cluster's **Workload** view
2. Find the CronJob, click the three-dot menu, and select **Edit Config**
3. Check the **Suspend** option
4. Click **Save**

Or with kubectl:

```bash
kubectl patch cronjob db-backup-cron -n default -p '{"spec":{"suspend":true}}'
```

## Summary

You have deployed a CronJob in Rancher to run scheduled tasks in your Kubernetes cluster. CronJobs are powerful tools for automating recurring operations. Rancher provides a convenient interface for setting schedules, concurrency policies, and history limits, while giving you full kubectl access for advanced operations like manual triggers and suspension.
