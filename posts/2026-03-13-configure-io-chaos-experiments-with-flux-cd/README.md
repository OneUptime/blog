# How to Configure IO Chaos Experiments with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Chaos Engineering, Chaos Mesh, IO Chaos

Description: Manage IO fault injection experiments using Chaos Mesh and Flux CD to test how applications respond to disk latency, errors, and file system faults.

---

## Introduction

IO (Input/Output) failures are a category of infrastructure fault that applications often handle poorly. Slow disk writes, read errors, and file system faults can cause databases to corrupt data, log pipelines to back up, and stateful services to fail in non-obvious ways. IO chaos experiments expose these weaknesses in a controlled environment before they cause production incidents.

Chaos Mesh's `IOChaos` CRD lets you inject latency into file system operations, simulate read/write errors, and corrupt file attributes — all targeting specific containers and file paths. Because `IOChaos` manifests are standard Kubernetes resources, Flux CD can manage them in Git just like any other workload configuration.

This guide walks through configuring IO latency, IO errors, and file attribute faults using Chaos Mesh managed by Flux CD.

## Prerequisites

- Chaos Mesh deployed via Flux HelmRelease (version 2.x+)
- Flux CD bootstrapped on the cluster
- A stateful application (e.g., a database) running in the cluster
- The Chaos Mesh chaos-daemon must be running on the target node

## Step 1: Inject IO Latency

IO latency simulates a slow disk, causing file operations to take longer than normal. This is useful for testing database query timeouts and log pipeline back-pressure.

```yaml
# clusters/my-cluster/chaos-experiments/io-latency.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: IOChaos
metadata:
  name: io-latency-postgres
  namespace: chaos-mesh
spec:
  action: latency
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: postgres
  # Target the container running the database
  containerNames:
    - postgres
  # Apply latency to the data directory
  volumePath: /var/lib/postgresql/data
  # Inject 100ms latency on all IO operations
  delay: "100ms"
  # Apply to both read and write operations
  methods:
    - read
    - write
  percent: 100
  duration: "5m"
```

## Step 2: Inject IO Errors

IO error chaos simulates disk read/write failures, testing whether your application returns appropriate errors and avoids data corruption.

```yaml
# clusters/my-cluster/chaos-experiments/io-errors.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: IOChaos
metadata:
  name: io-errors-redis
  namespace: chaos-mesh
spec:
  action: fault
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: redis
  containerNames:
    - redis
  volumePath: /data
  # Return EIO (Input/output error) for 10% of IO operations
  errno: 5
  percent: 10
  methods:
    - write
  duration: "3m"
```

## Step 3: Inject File Attribute Faults

File attribute faults corrupt metadata (like permissions or size), testing defensive file handling code.

```yaml
# clusters/my-cluster/chaos-experiments/io-attr-override.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: IOChaos
metadata:
  name: io-attr-override
  namespace: chaos-mesh
spec:
  action: attrOverride
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: fileserver
  containerNames:
    - fileserver
  volumePath: /uploads
  attr:
    # Simulate files appearing empty
    size: 0
    # Simulate very old modification time
    mtime:
      nsec: 0
  percent: 50
  duration: "2m"
```

## Step 4: Schedule IO Chaos Experiments

```yaml
# clusters/my-cluster/chaos-experiments/io-latency-schedule.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: Schedule
metadata:
  name: weekly-io-latency
  namespace: chaos-mesh
spec:
  # Run every Sunday at midnight
  schedule: "0 0 * * 0"
  historyLimit: 3
  concurrencyPolicy: Forbid
  type: IOChaos
  ioChaos:
    action: latency
    mode: one
    selector:
      namespaces:
        - default
      labelSelectors:
        app: postgres
    containerNames:
      - postgres
    volumePath: /var/lib/postgresql/data
    delay: "200ms"
    percent: 100
    methods:
      - write
    duration: "10m"
```

## Step 5: Manage via Flux Kustomization

```yaml
# clusters/my-cluster/chaos-experiments/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: io-chaos-experiments
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/my-cluster/chaos-experiments
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: chaos-mesh
```

## Step 6: Monitor Application Behavior

```bash
# Watch the IOChaos resource
kubectl get iochaos -n chaos-mesh -w

# Monitor database performance metrics during experiment
kubectl exec -it postgres-0 -n default -- \
  psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# Check application logs for IO error handling
kubectl logs -n default -l app=postgres --since=10m
```

## Best Practices

- Always test IO chaos in a staging environment with a copy of production data to understand actual impact before running in production.
- Start with low `percent` values (5-10%) and short durations before increasing the fault rate.
- Combine IO latency with application-level query timeout metrics to measure the exact latency at which queries begin failing.
- Use `methods: [write]` before `methods: [read, write]` since write failures are generally safer to simulate first.
- Ensure your database backup processes run before scheduling IO chaos experiments.

## Conclusion

IO chaos experiments surface one of the most underappreciated failure modes in stateful Kubernetes workloads. By managing `IOChaos` resources through Flux CD, your team can systematically test disk fault tolerance, review experiment parameters through pull requests, and build confidence that your databases and file-dependent services handle IO failures gracefully without data loss or silent corruption.
