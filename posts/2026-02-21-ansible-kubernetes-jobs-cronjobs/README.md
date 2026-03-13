# How to Use Ansible to Create Kubernetes Jobs and CronJobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, Jobs, CronJobs, Batch Processing

Description: Create and manage Kubernetes Jobs and CronJobs with Ansible for database migrations, batch processing, scheduled backups, and cleanup tasks.

---

Not everything in Kubernetes runs forever. Some workloads need to execute once and finish: database migrations, data exports, report generation, batch processing. Others need to run on a schedule: nightly backups, cache warming, certificate rotation. Kubernetes Jobs and CronJobs handle both patterns, and managing them through Ansible means you can version-control your batch workloads alongside the rest of your infrastructure.

This guide covers creating one-off Jobs, scheduled CronJobs, parallel batch processing, and the configuration options that control retry behavior and history retention.

## Prerequisites

- Ansible 2.12+ with `kubernetes.core` collection
- A running Kubernetes cluster
- A valid kubeconfig

```bash
ansible-galaxy collection install kubernetes.core
pip install kubernetes
```

## Creating a Simple Job

A Job creates one or more pods that run to completion. Here is a basic example that runs a database migration.

```yaml
# playbook: run-db-migration.yml
# Runs a one-time database migration Job
---
- name: Run Database Migration
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    migration_version: "v2.5.0"
    namespace: production

  tasks:
    - name: Run database migration job
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: batch/v1
          kind: Job
          metadata:
            name: "db-migration-{{ migration_version | replace('.', '-') }}"
            namespace: "{{ namespace }}"
            labels:
              app: db-migration
              version: "{{ migration_version }}"
          spec:
            # Do not retry on failure, investigate manually
            backoffLimit: 0
            # Clean up the Job after 1 hour
            ttlSecondsAfterFinished: 3600
            template:
              metadata:
                labels:
                  app: db-migration
              spec:
                restartPolicy: Never
                containers:
                  - name: migrate
                    image: "myapp/migrations:{{ migration_version }}"
                    command:
                      - /bin/sh
                      - -c
                      - "alembic upgrade head"
                    env:
                      - name: DATABASE_URL
                        valueFrom:
                          secretKeyRef:
                            name: db-credentials
                            key: connection_string
                    resources:
                      requests:
                        cpu: 100m
                        memory: 256Mi
                      limits:
                        cpu: 500m
                        memory: 512Mi
```

A few things to notice: `restartPolicy` must be `Never` or `OnFailure` for Jobs (you cannot use `Always`). The `backoffLimit: 0` means if the migration fails, it does not retry automatically. For migrations, this is usually what you want because retrying a failed migration can make things worse. The `ttlSecondsAfterFinished` tells Kubernetes to clean up the completed Job after an hour.

## Waiting for a Job to Complete

Running a Job is half the battle. You also need to wait for it to finish and check whether it succeeded.

```yaml
# playbook: run-and-wait-job.yml
# Runs a Job and waits for successful completion
---
- name: Run Job and wait for completion
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create the data export job
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: batch/v1
          kind: Job
          metadata:
            name: data-export-20260221
            namespace: production
          spec:
            backoffLimit: 3
            activeDeadlineSeconds: 600
            template:
              spec:
                restartPolicy: OnFailure
                containers:
                  - name: exporter
                    image: myapp/data-exporter:latest
                    command: ["python", "export.py", "--format", "csv"]
                    volumeMounts:
                      - name: export-volume
                        mountPath: /exports
                volumes:
                  - name: export-volume
                    persistentVolumeClaim:
                      claimName: export-storage

    - name: Wait for the job to complete
      kubernetes.core.k8s_info:
        kind: Job
        name: data-export-20260221
        namespace: production
      register: job_status
      until: >
        (job_status.resources[0].status.succeeded is defined and
         job_status.resources[0].status.succeeded >= 1) or
        (job_status.resources[0].status.failed is defined and
         job_status.resources[0].status.failed > 3)
      retries: 60
      delay: 10

    - name: Check if job succeeded
      ansible.builtin.assert:
        that:
          - job_status.resources[0].status.succeeded is defined
          - job_status.resources[0].status.succeeded >= 1
        fail_msg: "Data export job failed!"
        success_msg: "Data export completed successfully"
```

The `activeDeadlineSeconds: 600` is a safety net. If the Job is still running after 10 minutes, Kubernetes terminates it. This prevents runaway jobs from consuming resources indefinitely.

## Creating Parallel Jobs

For batch processing where you need to process multiple items concurrently, Jobs support parallelism.

```yaml
# playbook: run-parallel-job.yml
# Processes data in parallel using multiple pods
---
- name: Run Parallel Processing Job
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create parallel processing job
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: batch/v1
          kind: Job
          metadata:
            name: image-processor
            namespace: production
          spec:
            # Total number of pods to complete
            completions: 10
            # How many pods can run at the same time
            parallelism: 3
            backoffLimit: 5
            template:
              spec:
                restartPolicy: OnFailure
                containers:
                  - name: processor
                    image: myapp/image-processor:v1.2
                    env:
                      - name: JOB_COMPLETION_INDEX
                        valueFrom:
                          fieldRef:
                            fieldPath: metadata.annotations['batch.kubernetes.io/job-completion-index']
                    command:
                      - python
                      - process_batch.py
                      - --batch-index
                      - "$(JOB_COMPLETION_INDEX)"
                    resources:
                      requests:
                        cpu: 500m
                        memory: 1Gi
                      limits:
                        cpu: 2
                        memory: 4Gi
```

With `completions: 10` and `parallelism: 3`, Kubernetes runs 3 pods at a time until all 10 have completed. Each pod gets a unique completion index, which the application uses to determine which batch of data to process.

## Creating a CronJob

CronJobs run on a schedule, just like cron on Linux. Here is a nightly database backup.

```yaml
# playbook: create-backup-cronjob.yml
# Schedules a nightly database backup at 2 AM UTC
---
- name: Create Database Backup CronJob
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    namespace: production
    backup_bucket: "s3://myapp-backups/postgres"

  tasks:
    - name: Create nightly backup CronJob
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: batch/v1
          kind: CronJob
          metadata:
            name: db-backup
            namespace: "{{ namespace }}"
            labels:
              app: db-backup
          spec:
            # Run at 2:00 AM UTC every day
            schedule: "0 2 * * *"
            # What to do if the previous run has not finished
            concurrencyPolicy: Forbid
            # Keep the last 3 successful and 1 failed job for debugging
            successfulJobsHistoryLimit: 3
            failedJobsHistoryLimit: 1
            # If the job misses its schedule by more than 5 minutes, skip it
            startingDeadlineSeconds: 300
            jobTemplate:
              spec:
                backoffLimit: 2
                activeDeadlineSeconds: 1800
                template:
                  spec:
                    restartPolicy: OnFailure
                    containers:
                      - name: backup
                        image: myapp/db-backup:v1.0
                        command:
                          - /bin/sh
                          - -c
                          - |
                            TIMESTAMP=$(date +%Y%m%d_%H%M%S)
                            pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | \
                              gzip | \
                              aws s3 cp - {{ backup_bucket }}/backup_${TIMESTAMP}.sql.gz
                        env:
                          - name: DB_HOST
                            value: "postgres.databases.svc.cluster.local"
                          - name: DB_USER
                            valueFrom:
                              secretKeyRef:
                                name: db-credentials
                                key: username
                          - name: DB_NAME
                            value: "myapp"
                          - name: PGPASSWORD
                            valueFrom:
                              secretKeyRef:
                                name: db-credentials
                                key: password
                        resources:
                          requests:
                            cpu: 100m
                            memory: 256Mi
                          limits:
                            cpu: 1
                            memory: 1Gi
```

The `concurrencyPolicy: Forbid` setting is important for backups. It prevents a new backup from starting if the previous one is still running. The alternatives are `Allow` (run them in parallel) and `Replace` (kill the old one and start a new one).

## Creating Multiple CronJobs from a Variable List

Managing several CronJobs follows the same loop pattern used elsewhere.

```yaml
# playbook: create-maintenance-cronjobs.yml
# Creates multiple scheduled maintenance CronJobs from a list
---
- name: Create Maintenance CronJobs
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    cronjobs:
      - name: cleanup-temp-files
        schedule: "0 3 * * *"
        command: "find /data/tmp -mtime +7 -delete"
        image: alpine:3.19
      - name: refresh-cache
        schedule: "*/30 * * * *"
        command: "curl -X POST http://app-service/api/cache/refresh"
        image: curlimages/curl:latest
      - name: generate-reports
        schedule: "0 6 * * 1"
        command: "python /app/generate_weekly_report.py"
        image: myapp/reports:v2.0

  tasks:
    - name: Create each maintenance CronJob
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: batch/v1
          kind: CronJob
          metadata:
            name: "{{ item.name }}"
            namespace: production
            labels:
              type: maintenance
              managed-by: ansible
          spec:
            schedule: "{{ item.schedule }}"
            concurrencyPolicy: Forbid
            successfulJobsHistoryLimit: 3
            failedJobsHistoryLimit: 1
            jobTemplate:
              spec:
                backoffLimit: 1
                template:
                  spec:
                    restartPolicy: OnFailure
                    containers:
                      - name: "{{ item.name }}"
                        image: "{{ item.image }}"
                        command:
                          - /bin/sh
                          - -c
                          - "{{ item.command }}"
      loop: "{{ cronjobs }}"
      loop_control:
        label: "{{ item.name }} ({{ item.schedule }})"
```

## Manually Triggering a CronJob

Sometimes you need to run a CronJob outside its schedule, for testing or to handle an incident. You can create a Job from the CronJob's template.

```yaml
# task: manually trigger a CronJob by creating a Job from its spec
- name: Get the CronJob definition
  kubernetes.core.k8s_info:
    kind: CronJob
    name: db-backup
    namespace: production
  register: cronjob_info

- name: Create a manual Job from the CronJob template
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: batch/v1
      kind: Job
      metadata:
        name: "db-backup-manual-{{ lookup('pipe', 'date +%Y%m%d%H%M%S') }}"
        namespace: production
        labels:
          triggered-by: manual
      spec: "{{ cronjob_info.resources[0].spec.jobTemplate.spec }}"
```

## Summary

Kubernetes Jobs and CronJobs cover the entire spectrum of batch and scheduled workloads. Jobs handle one-time tasks like migrations and data exports, while CronJobs automate recurring operations like backups and maintenance. Ansible gives you a consistent way to manage these alongside your Deployments and Services. The key settings to get right are `backoffLimit` (how many retries), `activeDeadlineSeconds` (maximum runtime), `concurrencyPolicy` (overlap handling), and `ttlSecondsAfterFinished` (automatic cleanup). With these configured properly, your batch workloads will be reliable and self-maintaining.
