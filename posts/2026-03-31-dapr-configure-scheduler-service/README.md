# How to Configure Dapr Scheduler Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Scheduler, Configuration, Kubernetes, Job

Description: Configure the Dapr Scheduler service for job scheduling, including replica counts, storage backends, and connection settings for reliable job execution.

---

## Overview of the Dapr Scheduler Service

The Dapr Scheduler service was introduced to handle job scheduling independently from the Dapr runtime. It stores scheduled jobs, triggers them at the right time, and delivers execution callbacks to your application via the sidecar. The Scheduler service runs as a separate control plane component.

## Installing with Scheduler Enabled

By default, the Scheduler service is included when installing Dapr 1.14+:

```bash
helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update

helm install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace
```

## Configuring Scheduler via Helm

Customize Scheduler settings using Helm values:

```yaml
global:
  tag: "1.14.0"

dapr_scheduler:
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi
  cluster:
    etcdDataDirPath: /data/dapr-scheduler
```

Apply changes:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --values scheduler-values.yaml \
  --reuse-values
```

## Verifying Scheduler is Running

```bash
kubectl get pods -n dapr-system -l app=dapr-scheduler-server

# Check scheduler logs
kubectl logs -n dapr-system -l app=dapr-scheduler-server --tail=50
```

## Scheduling a Job via the API

Once the Scheduler is configured, schedule jobs using the Dapr Jobs API:

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/my-daily-report \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "@every 24h",
    "data": {
      "value": "generate-report"
    }
  }'
```

## Handling Job Callbacks in Your App

Your application must implement a handler for job callbacks:

```javascript
const express = require('express');
const app = express();

app.post('/job/my-daily-report', express.json(), (req, res) => {
  console.log('Job triggered:', req.body);
  // Execute the scheduled work
  generateDailyReport();
  res.sendStatus(200);
});

app.listen(3000);
```

## Summary

The Dapr Scheduler service provides reliable job scheduling as a dedicated control plane component. Configure it via Helm with appropriate replica counts and resource limits, then use the Jobs API to schedule recurring or one-time jobs. Your application handles job execution through HTTP callbacks delivered by the sidecar.
