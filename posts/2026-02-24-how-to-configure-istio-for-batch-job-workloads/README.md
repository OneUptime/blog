# How to Configure Istio for Batch Job Workloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Batch Jobs, Kubernetes, Service Mesh, Jobs

Description: Practical guide to running Kubernetes batch jobs with Istio sidecar injection, handling job completion and sidecar lifecycle correctly.

---

Running batch jobs on Kubernetes with Istio is one of those things that seems like it should just work, but actually requires some specific configuration. The core problem is straightforward: Kubernetes Jobs are designed to run to completion and then exit, but the Istio sidecar proxy keeps running after your job container finishes. This means your Job never reaches the "Completed" state, and it hangs indefinitely.

This guide covers how to solve that problem and properly configure Istio for batch workloads.

## The Sidecar Lifecycle Problem

When you deploy a Kubernetes Job in an Istio-enabled namespace, the pod gets an Envoy sidecar injected alongside your job container. Your job runs, finishes its work, and exits with code 0. But the Envoy sidecar is still running. Kubernetes sees at least one container still active, so the pod stays in the "Running" state instead of transitioning to "Completed."

This is the number one issue people hit when running Jobs with Istio.

## Solution 1: Use Istio's Native Job Support (Istio 1.12+)

Starting with Istio 1.12, there is built-in support for handling this. You can enable the `EXIT_ON_ZERO_ACTIVE_CONNECTIONS` feature by setting the `ISTIO_QUIT_API` or using the holdApplicationUntilProxyStarts annotation together with the sidecar's `/quitquitquit` endpoint.

The simplest approach is to have your job container call the Envoy quit API when it finishes:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-export-job
  namespace: batch-jobs
spec:
  template:
    metadata:
      labels:
        app: data-export
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
    spec:
      containers:
      - name: data-export
        image: myregistry/data-export:1.0
        command:
        - /bin/sh
        - -c
        - |
          # Run the actual job
          /app/export-data
          EXIT_CODE=$?
          # Tell the sidecar to quit
          curl -sf -XPOST http://localhost:15020/quitquitquit
          exit $EXIT_CODE
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
      restartPolicy: Never
  backoffLimit: 3
```

The `holdApplicationUntilProxyStarts` annotation ensures your job container does not start before the Envoy proxy is ready. Without this, your job might try to make network calls before the sidecar is ready and fail.

## Solution 2: Disable Sidecar Injection for Jobs

If your batch job does not need mesh features (mTLS, traffic management, observability), you can simply disable sidecar injection:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: simple-batch-job
  namespace: batch-jobs
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      containers:
      - name: worker
        image: myregistry/batch-worker:1.0
        command: ["/app/run-batch"]
      restartPolicy: Never
  backoffLimit: 2
```

This is the easiest approach but you lose all Istio benefits for that job.

## Solution 3: Use Istio 1.22+ Native Sidecar Containers

Istio 1.22 and later supports Kubernetes native sidecar containers (a feature that went stable in Kubernetes 1.29). With this, the sidecar is defined as an init container with `restartPolicy: Always`, and Kubernetes knows to stop it when the main containers exit:

```bash
# Make sure your Istio installation uses native sidecars
istioctl install --set values.pilot.env.ENABLE_NATIVE_SIDECARS=true
```

With native sidecars enabled, Jobs work correctly without any workarounds. The sidecar automatically terminates when the main container exits.

## Configuring Timeouts for Batch Workloads

Batch jobs can run for a long time. The default Istio timeouts are too short:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: batch-api-vs
  namespace: batch-jobs
spec:
  hosts:
  - batch-api
  http:
  - route:
    - destination:
        host: batch-api
    timeout: 7200s
```

Two hours is a reasonable starting point for batch jobs, but adjust based on your actual job duration.

## Setting Up a CronJob with Istio

CronJobs follow the same pattern. Here is a CronJob that properly handles the sidecar lifecycle:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-report
  namespace: batch-jobs
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            app: nightly-report
          annotations:
            proxy.istio.io/config: |
              holdApplicationUntilProxyStarts: true
        spec:
          containers:
          - name: report-generator
            image: myregistry/report-gen:1.0
            command:
            - /bin/sh
            - -c
            - |
              /app/generate-report
              EXIT_CODE=$?
              curl -sf -XPOST http://localhost:15020/quitquitquit
              exit $EXIT_CODE
          restartPolicy: Never
      backoffLimit: 2
```

## Network Policies for Batch Jobs

Batch jobs often need to access databases or external APIs. Configure ServiceEntry resources to allow external access:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-db
  namespace: batch-jobs
spec:
  hosts:
  - "db.production.internal"
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: external-db-dr
  namespace: batch-jobs
spec:
  host: "db.production.internal"
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 10
        connectTimeout: 10s
```

## Handling Batch Job Authentication

If your batch jobs need to call services inside the mesh, mTLS will handle authentication automatically. But if they need to call external services, you might need to configure authorization:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: batch-job-access
  namespace: data-services
spec:
  selector:
    matchLabels:
      app: data-api
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/batch-jobs/sa/batch-job-sa"
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/data/*"]
```

This allows your batch job's service account to access the data API.

## Resource Configuration for Sidecar in Batch Jobs

Batch jobs often run on nodes with limited resources. Keep the sidecar lightweight:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: lightweight-batch
  namespace: batch-jobs
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "50m"
        sidecar.istio.io/proxyMemory: "64Mi"
        sidecar.istio.io/proxyCPULimit: "200m"
        sidecar.istio.io/proxyMemoryLimit: "128Mi"
    spec:
      containers:
      - name: worker
        image: myregistry/batch-worker:1.0
      restartPolicy: Never
```

## Monitoring Batch Job Traffic

You can use Istio metrics to track how your batch jobs interact with other services:

```bash
# See request patterns from batch jobs
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant 'sum(rate(istio_requests_total{source_workload_namespace="batch-jobs"}[5m])) by (source_workload, destination_service)'
```

## Troubleshooting Common Issues

If your job pod is stuck in "Running" after the main container exits, check:

```bash
# See which containers are still running
kubectl get pod <job-pod-name> -n batch-jobs -o jsonpath='{.status.containerStatuses[*].name}:{.status.containerStatuses[*].state}'

# Check if the quitquitquit endpoint was called
kubectl logs <job-pod-name> -n batch-jobs -c istio-proxy | tail -20
```

If the job container starts before the sidecar is ready, you will see connection refused errors in the logs. Add the `holdApplicationUntilProxyStarts` annotation to fix this.

## Summary

The key to running batch jobs with Istio is handling the sidecar lifecycle correctly. Either use the `/quitquitquit` endpoint, disable injection when you do not need mesh features, or use native sidecar containers if your Kubernetes and Istio versions support it. Once you get the lifecycle right, everything else is about setting appropriate timeouts and resource limits for your specific batch workload patterns.
