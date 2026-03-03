# How to Configure Istio with Kubernetes Jobs and CronJobs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Jobs, CronJob, Sidecar

Description: How to handle Istio sidecar injection with Kubernetes Jobs and CronJobs, including the sidecar termination problem and practical solutions.

---

Kubernetes Jobs and CronJobs have a well-known problem with Istio: the sidecar proxy does not terminate when the Job container finishes. Your Job completes its work and exits, but the Envoy sidecar keeps running, so the pod stays in a Running state forever. The Job never reaches the Completed status, and CronJobs pile up pods that never terminate.

This is one of the most common Istio pain points, and there are several ways to solve it.

## Understanding the Problem

When Istio injects a sidecar into a Job pod, the pod has two containers: your Job container and `istio-proxy`. When your Job finishes, its container exits with status 0. But the `istio-proxy` container is still running and listening for traffic. Kubernetes only considers a pod completed when ALL containers have exited.

The result:

```bash
kubectl get pods -l job-name=my-job
```

```text
NAME           READY   STATUS    RESTARTS   AGE
my-job-abc12   1/2     Running   0          45m
```

The pod shows 1/2 ready because the Job container exited but the sidecar is still running.

## Solution 1: Disable Sidecar Injection for Jobs

The simplest solution is to not inject the sidecar into Job pods at all:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: my-job
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      restartPolicy: Never
      containers:
      - name: my-job
        image: my-job:latest
        command: ["./run-job.sh"]
```

This works fine if your Job does not need to call services inside the mesh or if the mesh allows PERMISSIVE mTLS mode. Without the sidecar, the Job pod will not have mTLS credentials, so it cannot authenticate to services that require STRICT mTLS.

## Solution 2: Sidecar Lifecycle with Kubernetes Native Support

Starting with Kubernetes 1.28 (stable), the sidecar containers feature allows containers to be marked as sidecars that terminate automatically when the main container exits:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: my-job
spec:
  template:
    spec:
      restartPolicy: Never
      initContainers:
      - name: istio-proxy
        restartPolicy: Always  # This marks it as a sidecar
      containers:
      - name: my-job
        image: my-job:latest
```

Istio versions 1.22 and later support this native sidecar mode. Enable it during installation:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    pilot:
      env:
        ENABLE_NATIVE_SIDECARS: "true"
```

With native sidecars, the istio-proxy is injected as an init container with `restartPolicy: Always`. Kubernetes automatically terminates it when the main container exits.

## Solution 3: Exit on Zero Active Connections

Istio supports a configuration that makes the sidecar exit when it detects that the application container has stopped:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: my-job
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
    spec:
      restartPolicy: Never
      containers:
      - name: my-job
        image: my-job:latest
        command:
        - /bin/sh
        - -c
        - |
          ./run-job.sh
          EXIT_CODE=$?
          curl -sf -X POST http://localhost:15020/quitquitquit
          exit $EXIT_CODE
```

The key is the `curl -X POST http://localhost:15020/quitquitquit` call at the end. This tells the Envoy proxy to shut down. The `/quitquitquit` endpoint is a standard Envoy admin endpoint that Istio exposes.

## Solution 4: Using a Wrapper Script

If you do not want to modify your Job container, use a wrapper:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: my-job
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
    spec:
      restartPolicy: Never
      containers:
      - name: my-job
        image: my-job:latest
        command:
        - /bin/sh
        - -c
        - |
          # Wait for sidecar to be ready
          until curl -sf http://localhost:15021/healthz/ready; do
            echo "Waiting for sidecar..."
            sleep 2
          done

          # Run the actual job
          ./run-job.sh
          JOB_EXIT=$?

          # Tell sidecar to quit
          curl -sf -X POST http://localhost:15020/quitquitquit

          exit $JOB_EXIT
```

This script:
1. Waits for the sidecar to be ready before starting the Job
2. Runs the Job
3. Tells the sidecar to shut down
4. Exits with the Job's exit code

## Configuring CronJobs

CronJobs have the same issues plus the added concern of pods accumulating over time. Here is a properly configured CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: data-sync
  namespace: default
spec:
  schedule: "0 */6 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      activeDeadlineSeconds: 3600
      backoffLimit: 2
      template:
        metadata:
          annotations:
            proxy.istio.io/config: |
              holdApplicationUntilProxyStarts: true
        spec:
          restartPolicy: Never
          containers:
          - name: data-sync
            image: data-sync:latest
            command:
            - /bin/sh
            - -c
            - |
              until curl -sf http://localhost:15021/healthz/ready; do
                sleep 2
              done
              ./sync.sh
              STATUS=$?
              curl -sf -X POST http://localhost:15020/quitquitquit
              exit $STATUS
```

Important settings:
- `concurrencyPolicy: Forbid` prevents overlapping runs
- `activeDeadlineSeconds: 3600` kills the Job if it runs too long (including a hung sidecar)
- `successfulJobsHistoryLimit: 3` limits the number of completed Job pods kept around

## Handling Job Failures

When a Job fails with a sidecar, you need to handle both the Job failure and the sidecar cleanup:

```yaml
command:
- /bin/sh
- -c
- |
  until curl -sf http://localhost:15021/healthz/ready; do
    sleep 2
  done

  # Run job, capture exit code regardless of success/failure
  ./run-job.sh
  JOB_EXIT=$?

  # Always shut down sidecar, even on failure
  curl -sf -X POST http://localhost:15020/quitquitquit || true

  exit $JOB_EXIT
```

The `|| true` after the quitquitquit curl ensures that a sidecar communication error does not mask the actual Job exit code.

## Monitoring Job Completion

Set up alerting for Jobs that do not complete within expected timeframes:

```bash
# Find Jobs that are still running past their expected duration
kubectl get jobs -A -o json | python3 -c "
import json, sys
from datetime import datetime, timezone

jobs = json.load(sys.stdin)
for job in jobs['items']:
    if job['status'].get('active', 0) > 0:
        start = job['status'].get('startTime', '')
        print(f\"{job['metadata']['namespace']}/{job['metadata']['name']}: active since {start}\")
"
```

## Testing the Configuration

Verify that your Job completes properly:

```bash
# Apply the Job
kubectl apply -f my-job.yaml

# Watch it complete
kubectl wait --for=condition=complete job/my-job --timeout=120s

# Check pod status
kubectl get pods -l job-name=my-job
```

The pod should show status Completed with 0/2 containers ready (both containers exited).

## Wrapping Up

The Istio sidecar termination problem with Jobs is a known issue with several good solutions. If you are running Kubernetes 1.28 or later, native sidecar containers are the cleanest approach. Otherwise, use the `/quitquitquit` endpoint to shut down the sidecar when your Job finishes. For Jobs that do not need mesh features, simply disable sidecar injection. Whichever approach you choose, test it thoroughly and monitor for stuck Jobs.
