# How to Configure Istio for Cron Job Workloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, CronJobs, Kubernetes, Service Mesh, Scheduling

Description: A hands-on guide to configuring Istio for Kubernetes CronJob workloads with sidecar lifecycle management and proper scheduling configuration.

---

CronJobs on Kubernetes create pods on a schedule, run a task, and then the pods should go away. That simple lifecycle gets complicated when Istio injects a sidecar into the pod. The sidecar does not know when your job is done, so it keeps running and the pod never completes. This is the same fundamental issue as regular Jobs, but CronJobs add extra wrinkles around scheduling, concurrency, and cleanup.

This guide covers everything you need to know to run CronJobs reliably with Istio.

## The Core Problem

When Istio injects the Envoy sidecar into a CronJob pod, you get this sequence:

1. Cron trigger fires, Kubernetes creates a Pod
2. Istio injects the sidecar container
3. Both the sidecar and your job container start
4. Your job runs and exits
5. The sidecar keeps running
6. The pod stays in "Running" state indefinitely
7. When the next cron trigger fires, Kubernetes might refuse to create a new pod (depending on concurrencyPolicy)

This can lead to pods piling up and cron schedules being missed.

## Solution: Calling the Sidecar Quit API

The most reliable approach is to have your job container tell the sidecar to shut down when it finishes:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-cleanup
  namespace: scheduled-jobs
spec:
  schedule: "0 3 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      activeDeadlineSeconds: 3600
      template:
        metadata:
          labels:
            app: daily-cleanup
          annotations:
            proxy.istio.io/config: |
              holdApplicationUntilProxyStarts: true
        spec:
          serviceAccountName: cleanup-sa
          containers:
          - name: cleanup
            image: myregistry/daily-cleanup:1.0
            command:
            - /bin/sh
            - -c
            - |
              # Wait for the sidecar to be ready
              until curl -sf http://localhost:15020/healthz/ready; do
                sleep 1
              done
              # Run the actual job
              /app/cleanup
              EXIT_CODE=$?
              # Signal the sidecar to quit
              curl -sf -XPOST http://localhost:15020/quitquitquit
              exit $EXIT_CODE
            resources:
              requests:
                memory: "256Mi"
                cpu: "250m"
              limits:
                memory: "512Mi"
                cpu: "500m"
          restartPolicy: Never
      backoffLimit: 2
```

There are a few things to note here. The `holdApplicationUntilProxyStarts` annotation makes Kubernetes wait for the sidecar to be ready before starting your container. But the curl check in the script provides an extra safety net. The `activeDeadlineSeconds` on the Job spec acts as a hard timeout so pods cannot run forever even if something goes wrong.

## Setting Up the Namespace

```bash
kubectl create namespace scheduled-jobs
kubectl label namespace scheduled-jobs istio-injection=enabled
```

## Handling CronJobs That Do Not Need the Mesh

For simple CronJobs that do not make service-to-service calls, skip the sidecar entirely:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: log-rotation
  namespace: scheduled-jobs
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        metadata:
          annotations:
            sidecar.istio.io/inject: "false"
        spec:
          containers:
          - name: log-rotator
            image: myregistry/log-rotator:1.0
            command: ["/app/rotate-logs"]
          restartPolicy: Never
      backoffLimit: 1
```

## Concurrency Policy Considerations

The `concurrencyPolicy` field matters more when using Istio because stuck pods can interfere with scheduling:

- `Forbid`: Skips the new run if the previous one is still active. With Istio, a stuck sidecar means the previous pod looks active, so new runs get skipped indefinitely.
- `Replace`: Kills the existing pod and starts a new one. This works better with Istio since it forces cleanup of stuck pods.
- `Allow`: Lets multiple pods run concurrently. Pods can pile up if sidecars are not shutting down.

For most use cases with Istio, `Replace` is the safest choice:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: hourly-sync
  namespace: scheduled-jobs
spec:
  schedule: "0 * * * *"
  concurrencyPolicy: Replace
  jobTemplate:
    spec:
      activeDeadlineSeconds: 3000
      template:
        metadata:
          labels:
            app: hourly-sync
          annotations:
            proxy.istio.io/config: |
              holdApplicationUntilProxyStarts: true
        spec:
          containers:
          - name: sync
            image: myregistry/data-sync:1.0
            command:
            - /bin/sh
            - -c
            - |
              /app/sync-data
              curl -sf -XPOST http://localhost:15020/quitquitquit
          restartPolicy: Never
      backoffLimit: 1
```

## CronJob Calling Internal Services

When your CronJob needs to call services inside the mesh, configure the necessary VirtualService and DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: reporting-api-vs
  namespace: scheduled-jobs
spec:
  hosts:
  - "reporting-api.api-services.svc.cluster.local"
  http:
  - route:
    - destination:
        host: reporting-api.api-services.svc.cluster.local
    timeout: 300s
    retries:
      attempts: 3
      perTryTimeout: 120s
      retryOn: 5xx,connect-failure
```

## CronJob Calling External Services

Register external services so the sidecar allows the traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-sftp
  namespace: scheduled-jobs
spec:
  hosts:
  - "sftp.partner.com"
  ports:
  - number: 22
    name: tcp-sftp
    protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

## Restricting CronJob Network Access

Lock down what your CronJobs can reach:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: daily-cleanup-sidecar
  namespace: scheduled-jobs
spec:
  workloadSelector:
    labels:
      app: daily-cleanup
  egress:
  - hosts:
    - "api-services/*"
    - "istio-system/*"
  outboundTrafficPolicy:
    mode: REGISTRY_ONLY
```

## Resource Limits for CronJob Sidecars

CronJob pods are short-lived, so keep the sidecar minimal:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-report
  namespace: scheduled-jobs
spec:
  schedule: "30 2 * * *"
  jobTemplate:
    spec:
      template:
        metadata:
          annotations:
            sidecar.istio.io/proxyCPU: "50m"
            sidecar.istio.io/proxyMemory: "64Mi"
            sidecar.istio.io/proxyCPULimit: "200m"
            sidecar.istio.io/proxyMemoryLimit: "128Mi"
            proxy.istio.io/config: |
              holdApplicationUntilProxyStarts: true
        spec:
          containers:
          - name: report
            image: myregistry/nightly-report:1.0
            command:
            - /bin/sh
            - -c
            - |
              /app/generate-report
              curl -sf -XPOST http://localhost:15020/quitquitquit
          restartPolicy: Never
      backoffLimit: 1
```

## Monitoring CronJob Health

Check for stuck CronJob pods:

```bash
# Find pods from CronJobs that have been running longer than expected
kubectl get pods -n scheduled-jobs --field-selector=status.phase=Running -o json | \
  jq '.items[] | select(.metadata.ownerReferences[]?.kind == "Job") | {name: .metadata.name, startTime: .status.startTime}'

# Check Istio metrics for CronJob traffic
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant 'sum(rate(istio_requests_total{source_workload_namespace="scheduled-jobs"}[1h])) by (source_workload, destination_service)'
```

## Cleaning Up Stuck Pods

If you have existing stuck CronJob pods, clean them up:

```bash
# Find and delete stuck CronJob pods where the main container has exited
kubectl get pods -n scheduled-jobs --field-selector=status.phase=Running -o jsonpath='{.items[*].metadata.name}' | \
  xargs -I {} kubectl delete pod {} -n scheduled-jobs --grace-period=30
```

## Using Native Sidecar Containers (Istio 1.22+)

If your cluster supports Kubernetes 1.29+ and Istio 1.22+, native sidecar containers solve the lifecycle problem automatically:

```bash
istioctl install --set values.pilot.env.ENABLE_NATIVE_SIDECARS=true
```

With native sidecars enabled, the Envoy proxy is registered as an init container with `restartPolicy: Always`. Kubernetes handles stopping it when the main container exits, so you do not need the `quitquitquit` workaround.

## Summary

Running CronJobs with Istio requires handling the sidecar shutdown properly, using `concurrencyPolicy: Replace` as a safety net, and setting `activeDeadlineSeconds` to prevent runaway pods. The `/quitquitquit` endpoint is the most portable solution, while native sidecar containers in newer Istio versions provide a cleaner fix. Always include the `holdApplicationUntilProxyStarts` annotation so your job does not try to make network calls before the proxy is ready.
