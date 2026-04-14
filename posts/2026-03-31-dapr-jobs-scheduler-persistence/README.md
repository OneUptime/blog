# How to Configure Jobs Persistence with Dapr Scheduler

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job, Scheduler, Persistence, Kubernetes

Description: Learn how to configure the Dapr Scheduler service for job persistence, ensuring scheduled jobs survive restarts and remain durable in production deployments.

---

The Dapr Scheduler service is the control plane component responsible for storing and triggering jobs. By default, the Scheduler uses an embedded etcd store for persistence. Understanding how to configure this persistence layer is critical for production deployments where job durability matters.

## How the Dapr Scheduler Stores Jobs

The Dapr Scheduler service uses an embedded etcd cluster to persist job definitions. This means:

- Jobs survive Scheduler pod restarts
- Jobs are replicated when multiple Scheduler replicas run
- Job metadata (schedule, data, repeats) persists across upgrades

## Checking Scheduler Status

Verify the Scheduler service is running:

```bash
# Self-hosted
dapr status

# Kubernetes
kubectl get pods -n dapr-system | grep scheduler
```

Expected output:

```text
NAME                              READY   STATUS    RESTARTS   AGE
dapr-scheduler-server-0           1/1     Running   0          5m
```

## Configuring Scheduler in Kubernetes

The Scheduler is deployed as a StatefulSet with persistent volumes. Check the default configuration:

```bash
kubectl describe statefulset dapr-scheduler-server -n dapr-system
```

By default, Dapr configures the Scheduler with a persistent volume claim:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: dapr-scheduler-server
  namespace: dapr-system
spec:
  replicas: 3
  volumeClaimTemplates:
    - metadata:
        name: dapr-scheduler-data-dir
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 1Gi
```

## Customizing Storage Size via Helm

When installing Dapr with Helm, configure Scheduler storage:

```bash
helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --set dapr_scheduler.cluster.storageSize=5Gi \
  --set dapr_scheduler.cluster.storageClassName=fast-ssd
```

The Scheduler always runs with 3 replicas in Kubernetes (this is not configurable via Helm). Customize storage and resources:

```yaml
# values.yaml
dapr_scheduler:
  cluster:
    storageSize: 5Gi
    storageClassName: "standard"
  resources:
    requests:
      cpu: "250m"
      memory: "256Mi"
    limits:
      cpu: "1000m"
      memory: "1Gi"
```

Apply the values:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  -f values.yaml
```

## Verifying Job Persistence

Create a job, restart the Scheduler, and verify the job persists:

```bash
# Create a job
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/persistence-test \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "@every 1h",
    "data": {
      "value": "test"
    }
  }'

# Restart the scheduler (Kubernetes)
kubectl rollout restart statefulset/dapr-scheduler-server -n dapr-system
kubectl rollout status statefulset/dapr-scheduler-server -n dapr-system

# Verify job still exists
curl http://localhost:3500/v1.0-alpha1/jobs/persistence-test
```

## Monitoring Scheduler Health

Check Scheduler logs for etcd and job persistence issues:

```bash
kubectl logs -n dapr-system -l app=dapr-scheduler-server --tail=50
```

Look for lines like:

```text
time="2026-03-31T10:00:00Z" level=info msg="Scheduler started" ...
time="2026-03-31T10:00:01Z" level=info msg="etcd cluster initialized" ...
```

## Summary

The Dapr Scheduler service provides built-in job persistence via an embedded etcd cluster deployed as a StatefulSet with persistent volumes. Configuring adequate storage size, replica count, and storage class through Helm ensures scheduled jobs remain durable across restarts and upgrades in production environments.
