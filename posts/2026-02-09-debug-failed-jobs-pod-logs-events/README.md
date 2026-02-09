# How to Debug Failed Kubernetes Jobs by Inspecting Pod Logs and Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Jobs, Debugging, Troubleshooting

Description: Master debugging techniques for failed Kubernetes Jobs including pod log analysis, event inspection, exit code interpretation, and resource issue diagnosis.

---

When Kubernetes Jobs fail, you need to quickly understand why. Failed pods, exhausted backoff limits, and mysterious errors all require systematic investigation. The key debugging tools are pod logs showing application output, Kubernetes events revealing cluster-level issues, and job status fields exposing failure patterns.

Effective debugging follows a structured approach: check job status, inspect failed pod logs, review Kubernetes events, examine exit codes, and investigate resource constraints. Each piece of information narrows down the root cause.

## Checking Job Status

Start with overall job status:

```bash
# Get job status
kubectl get job failed-job

# Detailed status
kubectl describe job failed-job

# Check status fields
kubectl get job failed-job -o yaml | grep -A 10 status
```

Key status fields include succeeded count, failed count, active pods, and conditions indicating why the job failed.

## Inspecting Failed Pod Logs

View logs from failed pods:

```bash
# List pods from the job
kubectl get pods -l job-name=failed-job

# Get logs from most recent pod
kubectl logs -l job-name=failed-job --tail=100

# Get logs from a specific failed pod
kubectl logs failed-job-abc123

# Get previous container logs if pod restarted
kubectl logs failed-job-abc123 --previous

# Follow logs in real-time
kubectl logs -f -l job-name=failed-job
```

Logs show application-level errors, stack traces, and debug output that reveal why your code failed.

## Examining Kubernetes Events

Events provide cluster-level context:

```bash
# Events for the job itself
kubectl get events --field-selector involvedObject.name=failed-job

# Events for all pods from the job
kubectl get events --field-selector involvedObject.kind=Pod | grep failed-job

# Sort by timestamp
kubectl get events --sort-by='.lastTimestamp' | grep failed-job

# Detailed event view
kubectl describe job failed-job | grep -A 20 Events
```

Common event messages include image pull failures, resource constraints, and scheduling problems.

## Analyzing Exit Codes

Container exit codes indicate failure type:

```bash
# Get exit code from failed pod
kubectl get pod failed-job-abc123 -o jsonpath='{.status.containerStatuses[0].state.terminated.exitCode}'

# Get termination reason
kubectl get pod failed-job-abc123 -o jsonpath='{.status.containerStatuses[0].state.terminated.reason}'

# Full termination info
kubectl get pod failed-job-abc123 -o json | \
  jq '.status.containerStatuses[0].state.terminated'
```

Exit code 137 means OOMKilled (out of memory). Exit code 1 typically indicates application error. Exit code 0 means success.

## Debugging Script

Create a comprehensive debugging script:

```bash
#!/bin/bash
# debug-job.sh

JOB_NAME=$1

if [ -z "$JOB_NAME" ]; then
  echo "Usage: debug-job.sh JOB_NAME"
  exit 1
fi

echo "=== Job Status ==="
kubectl get job $JOB_NAME

echo ""
echo "=== Job Details ==="
kubectl describe job $JOB_NAME

echo ""
echo "=== Recent Pods ==="
kubectl get pods -l job-name=$JOB_NAME --sort-by='.status.startTime'

echo ""
echo "=== Failed Pod Logs ==="
FAILED_POD=$(kubectl get pods -l job-name=$JOB_NAME \
  --field-selector=status.phase=Failed \
  --sort-by='.status.startTime' \
  -o jsonpath='{.items[-1:].metadata.name}')

if [ -n "$FAILED_POD" ]; then
  echo "Logs from $FAILED_POD:"
  kubectl logs $FAILED_POD --tail=50
  
  echo ""
  echo "=== Pod Termination Info ==="
  kubectl get pod $FAILED_POD -o json | \
    jq '.status.containerStatuses[0].state.terminated'
fi

echo ""
echo "=== Events ==="
kubectl get events --field-selector involvedObject.name=$JOB_NAME --sort-by='.lastTimestamp'
```

## Checking Resource Limits

Investigate resource-related failures:

```bash
# Check if pod was OOMKilled
kubectl get pod failed-job-abc123 -o jsonpath='{.status.containerStatuses[0].state.terminated.reason}'

# View resource requests/limits
kubectl get pod failed-job-abc123 -o jsonpath='{.spec.containers[0].resources}'

# Check actual resource usage (requires metrics-server)
kubectl top pod failed-job-abc123
```

## Debugging ImagePullBackOff

Common image pull issues:

```bash
# Check image pull status
kubectl describe pod failed-job-abc123 | grep -A 5 "Events:"

# Common causes:
# - Wrong image name or tag
# - Private registry without imagePullSecrets
# - Image doesn't exist
# - Network issues

# Verify image exists
docker pull myregistry.com/myimage:tag

# Check image pull secrets
kubectl get pod failed-job-abc123 -o jsonpath='{.spec.imagePullSecrets}'
```

## Interactive Debugging

Debug by running a shell in the job container:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: debug-session
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: debugger
        image: myapp:latest
        command: ["sleep", "3600"]  # Keep alive for debugging
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-creds
              key: url
```

Then exec into it:

```bash
kubectl exec -it debug-session-abc123 -- /bin/bash

# Now run commands interactively to reproduce the issue
./my-failing-command
```

## Checking Dependencies

Verify external dependencies:

```bash
# Test database connectivity
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- \
  psql postgresql://user:pass@postgres:5432/db

# Test API endpoint
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl https://api.example.com/health

# Test network connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  wget -O- http://internal-service:8080
```

## Persistent Debugging

Keep failed pods for investigation:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: keep-on-failure
spec:
  backoffLimit: 3
  template:
    spec:
      restartPolicy: Never  # Failed pods stay around
      containers:
      - name: worker
        image: worker:latest
```

With restartPolicy: Never, failed pods remain for inspection.

## Automated Failure Notification

Alert on job failures:

```python
#!/usr/bin/env python3
from kubernetes import client, config, watch
import requests

def send_alert(job_name, namespace, logs):
    webhook_url = "https://hooks.slack.com/services/YOUR/WEBHOOK"
    payload = {
        "text": f"Job {namespace}/{job_name} failed",
        "attachments": [{
            "color": "danger",
            "text": f"```{logs[-500:]}```"
        }]
    }
    requests.post(webhook_url, json=payload)

def watch_job_failures():
    config.load_kube_config()
    batch_v1 = client.BatchV1Api()
    core_v1 = client.CoreV1Api()
    
    w = watch.Watch()
    for event in w.stream(batch_v1.list_job_for_all_namespaces):
        job = event['object']
        
        if job.status.failed and job.status.failed >= job.spec.backoff_limit:
            # Job has failed, get logs
            pods = core_v1.list_namespaced_pod(
                namespace=job.metadata.namespace,
                label_selector=f'job-name={job.metadata.name}'
            )
            
            if pods.items:
                logs = core_v1.read_namespaced_pod_log(
                    name=pods.items[-1].metadata.name,
                    namespace=job.metadata.namespace,
                    tail_lines=50
                )
                
                send_alert(job.metadata.name, job.metadata.namespace, logs)

if __name__ == "__main__":
    watch_job_failures()
```

Systematic debugging of failed jobs using logs, events, and status information quickly identifies root causes. Combine multiple debugging techniques to understand both application-level and infrastructure-level failures.
