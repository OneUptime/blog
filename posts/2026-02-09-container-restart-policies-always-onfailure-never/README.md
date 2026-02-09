# How to Set Container Restart Policies to Always, OnFailure, and Never

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Containers, Reliability

Description: Master Kubernetes restart policies to control container restart behavior. Learn when to use Always, OnFailure, and Never policies for deployments, jobs, and cronjobs to ensure appropriate failure handling.

---

When containers crash or exit, Kubernetes can automatically restart them based on the configured restart policy. Understanding restart policies is critical for building reliable applications that recover from failures appropriately. The wrong policy can cause infinite restart loops, waste resources, or leave failed containers unrecovered.

Kubernetes provides three restart policies: Always, OnFailure, and Never. Each serves different use cases and workload types. Mastering these policies ensures your applications handle failures correctly.

## Understanding Restart Policies

The restart policy determines what happens when a container exits, regardless of exit code. The policy applies to all containers in a pod.

Always restarts containers whenever they exit, whether successfully or with an error. Use Always for long-running services that should always be running.

OnFailure restarts containers only if they exit with a non-zero status code. Successful exits (exit code 0) leave the container stopped. Use OnFailure for jobs that should retry on failure but not on success.

Never never restarts containers. Once they exit, they stay stopped. Use Never for one-time tasks that should not retry.

The kubelet on each node enforces restart policies with exponential backoff. The delay between restarts starts at 10 seconds and doubles each time, capping at 5 minutes.

## Always Restart Policy

Always is the default restart policy for pods created by Deployments and most controllers:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: always-restart-pod
spec:
  restartPolicy: Always
  containers:
  - name: web
    image: nginx
```

If the nginx process exits for any reason, Kubernetes immediately restarts it.

For long-running services:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      restartPolicy: Always
      containers:
      - name: nginx
        image: nginx:latest
```

Deployments require restartPolicy: Always. Using other policies causes validation errors.

The Always policy ensures high availability. If a container crashes, Kubernetes brings it back automatically without manual intervention.

## OnFailure Restart Policy

OnFailure only restarts containers that exit with errors:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: onfailure-pod
spec:
  restartPolicy: OnFailure
  containers:
  - name: worker
    image: worker:latest
    command: ['python', 'process.py']
```

If process.py exits with code 0 (success), the container stops. If it exits with any non-zero code, Kubernetes restarts it.

For batch jobs:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processor
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: data-processor:v1.0
        command: ['python', 'process_data.py']
      backoffLimit: 4
```

Jobs typically use OnFailure. The job retries on failure but completes on success.

The backoffLimit controls total retry attempts. After exceeding this limit, the job is marked as failed even with OnFailure policy.

## Never Restart Policy

Never prevents all automatic restarts:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: never-restart-pod
spec:
  restartPolicy: Never
  containers:
  - name: one-shot
    image: busybox
    command: ['sh', '-c', 'echo "Task complete" && exit 0']
```

Whether the container succeeds or fails, it never restarts.

For one-time execution:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: database-migration
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: migrate
        image: migrate:latest
        command: ['./migrate', 'up']
  backoffLimit: 3
```

With Never policy, each pod attempt counts toward backoffLimit. If a pod fails, a new pod is created instead of restarting the existing container.

## Comparing Restart Behaviors

Understand how each policy handles different exit codes:

Container exits with code 0 (success):
- Always: Restarts immediately
- OnFailure: Stays stopped
- Never: Stays stopped

Container exits with code 1 (failure):
- Always: Restarts immediately
- OnFailure: Restarts after backoff delay
- Never: Stays stopped

Container is killed by OOM:
- Always: Restarts immediately
- OnFailure: Restarts after backoff delay
- Never: Stays stopped

## Use Cases for Each Policy

Use Always for:
- Web servers
- API services
- Database pods
- Message queue consumers
- Any long-running service that should always be available

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      restartPolicy: Always
      containers:
      - name: api
        image: api:v2.0.0
```

Use OnFailure for:
- Batch processing jobs
- Data processing tasks
- Tasks that should retry on failure but complete on success

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: report-generator
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: generator
        image: report-gen:latest
        command: ['python', 'generate_report.py']
```

Use Never for:
- Database migrations
- One-time setup tasks
- Tasks where retry creates duplicate work

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: init-database
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: init
        image: db-init:v1.0
        command: ['./init.sh']
  backoffLimit: 0  # Don't retry at all
```

## Restart Backoff Behavior

Kubernetes uses exponential backoff for container restarts:

First restart: 10 seconds delay
Second restart: 20 seconds delay
Third restart: 40 seconds delay
Fourth restart: 80 seconds delay
Fifth restart: 160 seconds delay
Subsequent restarts: 300 seconds delay (5 minutes max)

After 10 minutes of successful operation, the backoff timer resets.

View restart count and backoff:

```bash
kubectl describe pod my-pod
```

Look for the "Restart Count" and "Last State" sections:

```
Restart Count:  5
Last State:     Terminated
  Reason:       Error
  Exit Code:    1
  Started:      Mon, 09 Feb 2026 10:15:00 +0000
  Finished:     Mon, 09 Feb 2026 10:15:05 +0000
```

The backoff prevents resource exhaustion from rapidly restarting containers in crash loops.

## CrashLoopBackOff State

When a container repeatedly crashes, it enters CrashLoopBackOff state:

```bash
kubectl get pods
```

Output:

```
NAME           READY   STATUS             RESTARTS   AGE
crashing-pod   0/1     CrashLoopBackOff   10         30m
```

This indicates the container is in restart backoff. Kubernetes will keep trying to restart it according to the restart policy.

Debug CrashLoopBackOff:

```bash
# View current logs
kubectl logs crashing-pod

# View previous container logs
kubectl logs crashing-pod --previous

# Describe pod for events
kubectl describe pod crashing-pod
```

Common causes:
- Application crashes immediately on start
- Missing configuration
- Resource limits too low
- Failed liveness probes

## Combining Restart Policy with Liveness Probes

Restart policy works with liveness probes. If a liveness probe fails, Kubernetes kills the container. The restart policy then determines if it restarts.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: probed-pod
spec:
  restartPolicy: Always
  containers:
  - name: app
    image: app:latest
    livenessProbe:
      httpGet:
        path: /health
        port: 8080
      initialDelaySeconds: 30
      periodSeconds: 10
      failureThreshold: 3
```

If the liveness probe fails 3 times, the container is killed. Because restartPolicy is Always, it restarts immediately.

With OnFailure, failed liveness probes also trigger restarts because the killed container has a non-zero exit code.

## StatefulSet Restart Considerations

StatefulSets always use restartPolicy: Always and require stable identities:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  serviceName: db
  replicas: 3
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      restartPolicy: Always
      containers:
      - name: postgres
        image: postgres:14
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

Containers in StatefulSets restart in place, maintaining their identity and persistent storage.

## DaemonSet Restart Behavior

DaemonSets also require restartPolicy: Always:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector
spec:
  selector:
    matchLabels:
      name: log-collector
  template:
    metadata:
      labels:
        name: log-collector
    spec:
      restartPolicy: Always
      containers:
      - name: fluentd
        image: fluentd:v1.14
```

DaemonSet pods must always be running on each node, so Always is the only valid policy.

## CronJob Restart Policies

CronJobs create jobs on a schedule. Each job can use OnFailure or Never:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-job
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: backup
            image: backup:latest
            command: ['./backup.sh']
```

OnFailure makes sense for scheduled tasks that should retry on failure.

For idempotent tasks:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-job
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
          - name: cleanup
            image: cleanup:latest
            command: ['./cleanup.sh']
      backoffLimit: 2
```

Never prevents retries within the same pod. backoffLimit allows creating new pods on failure.

## Init Containers and Restart Policy

Init containers share the pod's restart policy but behave differently:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: init-pod
spec:
  restartPolicy: Always
  initContainers:
  - name: init-db
    image: busybox
    command: ['sh', '-c', 'until nc -z db 5432; do sleep 2; done']
  containers:
  - name: app
    image: app:latest
```

If an init container fails:
- With Always or OnFailure, the init container restarts
- With Never, the pod fails

Init containers must complete successfully before main containers start. They retry according to the restart policy.

## Monitoring Restart Behavior

Track container restarts:

```bash
kubectl get pods -o wide
```

The RESTARTS column shows restart counts.

Get detailed restart history:

```bash
kubectl describe pod my-pod | grep -A 10 "State:"
```

Monitor restart rate with Prometheus:

```promql
rate(kube_pod_container_status_restarts_total[5m])
```

Alert on high restart rates:

```yaml
groups:
- name: restart-alerts
  rules:
  - alert: HighRestartRate
    expr: rate(kube_pod_container_status_restarts_total[15m]) > 0.5
    annotations:
      summary: "Pod {{ $labels.pod }} restarting frequently"
```

## Troubleshooting Restart Issues

Container restarting too frequently:

1. Check logs for crash reasons:
```bash
kubectl logs pod-name --previous
```

2. Check resource limits:
```bash
kubectl describe pod pod-name | grep -A 5 "Limits:"
```

3. Verify liveness probe configuration is not too aggressive

4. Check for memory issues:
```bash
kubectl top pod pod-name
```

Container not restarting when it should:

1. Verify restart policy:
```bash
kubectl get pod pod-name -o jsonpath='{.spec.restartPolicy}'
```

2. Check if pod is terminating:
```bash
kubectl get pod pod-name -o jsonpath='{.status.phase}'
```

3. Check kubelet logs on the node:
```bash
journalctl -u kubelet | grep pod-name
```

## Best Practices

Use Always for long-running services and deployments. This ensures high availability.

Use OnFailure for jobs and batch tasks that should retry on failure but complete on success.

Use Never for one-time tasks where retries might cause problems (idempotency concerns).

Set appropriate backoffLimit for Jobs to prevent infinite retries.

Monitor restart counts and investigate pods with high restart rates.

Combine restart policies with appropriate liveness and readiness probes for complete health management.

Test restart behavior in development. Intentionally crash containers to verify they restart correctly.

Document why specific restart policies are used, especially for Never policy which might seem counterintuitive.

## Conclusion

Restart policies control how Kubernetes handles container exits. Choose Always for services, OnFailure for jobs, and Never for one-time tasks. Understand restart backoff behavior and how policies interact with liveness probes.

Configure appropriate restart policies for each workload type. Monitor restart behavior and troubleshoot high restart rates. Combine restart policies with other reliability features like health probes and resource limits.

Master restart policies to build resilient Kubernetes applications that recover from failures appropriately without wasting resources or creating infinite restart loops.
