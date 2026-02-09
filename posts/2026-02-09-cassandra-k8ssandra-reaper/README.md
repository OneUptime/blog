# Using K8ssandra Reaper for Cassandra Anti-Entropy Repair on Kubernetes
Author: [nawazdhandala](https://github.com/nawazdhandala)
Tags: Cassandra, K8ssandra, Reaper, Kubernetes, Database
Description: Learn how to deploy and configure K8ssandra Reaper for automated anti-entropy repair of Apache Cassandra clusters running on Kubernetes
---

Apache Cassandra relies on an eventual consistency model, which means data replicas across nodes can temporarily diverge. Over time, without periodic maintenance, these inconsistencies accumulate and can lead to stale reads, data loss during node failures, and unpredictable query results. Anti-entropy repair is the mechanism Cassandra provides to reconcile these differences, and Reaper is the most widely adopted tool for automating this critical maintenance task. When running Cassandra on Kubernetes through K8ssandra, Reaper comes integrated and ready to manage repairs at scale.

## Understanding Anti-Entropy Repair

Cassandra distributes data across multiple nodes using consistent hashing. Each piece of data is replicated to a configurable number of nodes (the replication factor). When a write occurs, it may not reach all replicas simultaneously due to network partitions, node failures, or hinted handoff limitations. Anti-entropy repair works by comparing Merkle trees of data ranges across replicas and streaming any differences to bring all replicas into agreement.

Running `nodetool repair` manually is tedious, error-prone, and can cause significant performance degradation if not scheduled carefully. Reaper solves this by breaking repairs into smaller segments, scheduling them intelligently, and providing a management interface to monitor and control the process.

## What Is Reaper?

Reaper, originally developed by Spotify and now maintained as part of the K8ssandra ecosystem, is a repair management tool for Cassandra. It provides:

- Automated scheduling of repairs across all keyspaces and tables
- Segmented repairs that minimize impact on cluster performance
- A web UI and REST API for management and monitoring
- Support for incremental and full repairs
- Adaptive repair intensity that throttles based on cluster load
- Multi-datacenter awareness

## Deploying Reaper with K8ssandra

When deploying a K8ssandra cluster, Reaper can be enabled directly in the K8ssandraCluster custom resource:

```yaml
apiVersion: k8ssandra.io/v1alpha1
kind: K8ssandraCluster
metadata:
  name: production-cluster
  namespace: cassandra
spec:
  cassandra:
    serverVersion: "4.1.3"
    datacenters:
      - metadata:
          name: dc1
        size: 3
        storageConfig:
          cassandraDataVolumeClaimSpec:
            storageClassName: gp3
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 100Gi
  reaper:
    containerImage:
      registry: docker.io
      repository: thelastpickle
      name: cassandra-reaper
      tag: "3.4.0"
    autoScheduling:
      enabled: true
      initialDelayPeriod: PT15S
      periodBetweenPolls: PT10M
      timeBeforeFirstSchedule: PT5M
      scheduleSpreadPeriod: PT6H
      excludedKeyspaces:
        - system
        - system_auth
        - system_distributed
        - system_schema
        - system_traces
    keyspace: reaper_db
    cassandraUserSecretRef:
      name: reaper-db-secret
```

## Configuring Reaper Storage

Reaper needs a backend to store its own state, including repair schedules, run history, and cluster metadata. The recommended approach for Kubernetes deployments is to use Cassandra itself as the storage backend:

```yaml
reaper:
  keyspace: reaper_db
  schemaInitMode: CREATE_IF_NOT_EXISTS
  cassandraUserSecretRef:
    name: reaper-db-secret
```

Create the secret for Reaper's database credentials:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: reaper-db-secret
  namespace: cassandra
type: Opaque
stringData:
  username: reaper
  password: a-strong-password-here
```

## Understanding Auto-Scheduling

The auto-scheduling feature is what makes Reaper truly valuable in production. When enabled, Reaper automatically discovers all keyspaces and tables in the cluster and creates repair schedules for them. The key parameters to understand are:

- **initialDelayPeriod**: How long Reaper waits after startup before beginning auto-scheduling. This gives the cluster time to stabilize.
- **periodBetweenPolls**: How frequently Reaper checks for new keyspaces that need repair schedules.
- **scheduleSpreadPeriod**: The window over which repairs are spread to avoid running all repairs simultaneously.
- **timeBeforeFirstSchedule**: Delay before the first scheduled repair runs after being created.

## Creating Manual Repair Schedules

While auto-scheduling handles most cases, you may need custom repair schedules for specific keyspaces. Use the Reaper REST API or the RepairSchedule custom resource:

```yaml
apiVersion: reaper.k8ssandra.io/v1alpha1
kind: RepairSchedule
metadata:
  name: user-data-repair
  namespace: cassandra
spec:
  clusterRef:
    name: production-cluster
  keyspace: user_data
  tables:
    - user_profiles
    - user_sessions
  repairType: INCREMENTAL
  scheduleDaysBetween: 7
  intensity: "0.5"
  segmentCount: 32
  repairParallelism: DATACENTER_AWARE
  owner: platform-team
```

Key configuration options for repair schedules:

- **intensity**: A value between 0 and 1 controlling how aggressively Reaper runs repairs. Lower values reduce cluster impact but take longer to complete.
- **segmentCount**: The number of token range segments to break each repair into. More segments mean smaller individual repair operations.
- **repairParallelism**: Controls whether repairs run sequentially, in parallel, or with datacenter awareness.

## Accessing the Reaper Web UI

Reaper includes a web interface for monitoring and managing repairs. Expose it through a Kubernetes service:

```bash
kubectl port-forward svc/production-cluster-dc1-reaper-service 8080:8080 -n cassandra
```

Then access the UI at `http://localhost:8080/webui/`. The dashboard shows:

- Active repair runs and their progress
- Scheduled repairs and their next run times
- Cluster topology and node status
- Historical repair run data

## Monitoring Repair Progress

Track ongoing repairs using kubectl:

```bash
# List all repair schedules
kubectl get repairschedule -n cassandra

# Check repair run status
kubectl get repairrun -n cassandra

# View detailed repair information
kubectl describe repairschedule user-data-repair -n cassandra
```

Reaper also exposes Prometheus-compatible metrics. Add a ServiceMonitor to scrape them:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: reaper-metrics
  namespace: cassandra
spec:
  selector:
    matchLabels:
      app.kubernetes.io/managed-by: reaper
  endpoints:
    - port: admin
      interval: 30s
      path: /prometheusMetrics
```

Important metrics to track include:

- `io_cassandrareaper_service_RepairRunner_repairProgress`: Progress of active repair runs
- `io_cassandrareaper_service_RepairRunner_millisSinceLastRepair`: Time since the last successful repair
- `io_cassandrareaper_service_RepairRunner_segmentsDone`: Number of completed repair segments

## Tuning Repair Performance

Repairs consume significant I/O and network resources. Tuning is essential for production clusters:

```yaml
reaper:
  autoScheduling:
    enabled: true
    adaptiveSchedule: true
  heapSize: 1Gi
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 2Gi
```

Consider these tuning strategies:

1. **Reduce intensity during peak hours**: Set intensity to 0.25 during business hours and increase to 0.75 during off-peak.
2. **Use incremental repairs**: For Cassandra 4.x clusters, incremental repairs are significantly faster and less resource-intensive than full repairs.
3. **Increase segment count for large tables**: Breaking large tables into more segments reduces the memory pressure per repair operation.
4. **Set repair thread counts**: Configure `cassandra.yaml` to limit concurrent repair streams with `concurrent_validations` and `concurrent_compactors`.

## Handling Repair Failures

Repairs can fail for various reasons including node unavailability, timeouts, or resource exhaustion. Reaper handles failures gracefully:

```bash
# Check for failed repair runs
kubectl get repairrun -n cassandra -o json | \
  jq '.items[] | select(.status.state == "ERROR") | .metadata.name'

# Retry a failed repair
kubectl annotate repairrun failed-repair-name \
  reaper.k8ssandra.io/retry="true" -n cassandra
```

Configure retry behavior in the repair schedule:

```yaml
spec:
  repairRetryCount: 3
  repairRetryDelayMinutes: 30
```

## Best Practices

Running Reaper effectively in production requires attention to several operational details:

1. **Repair frequency**: Run repairs at least once within the `gc_grace_seconds` window (default 10 days) to prevent zombie data resurrection. A 7-day schedule provides a safety margin.
2. **Exclude system keyspaces**: System keyspaces are typically small and repaired automatically. Excluding them reduces unnecessary work.
3. **Monitor repair duration**: If repairs consistently take longer than the interval between runs, increase parallelism or reduce segment count.
4. **Coordinate with backups**: Schedule repairs to complete before backup windows so backups contain consistent data.
5. **Use datacenter-aware parallelism**: In multi-datacenter setups, this ensures repairs do not overload any single datacenter.

## Conclusion

K8ssandra Reaper transforms Cassandra anti-entropy repair from a manual, error-prone task into an automated, observable, and manageable process. By deploying Reaper alongside your Cassandra cluster on Kubernetes, you ensure data consistency across replicas without manual intervention. The auto-scheduling feature handles the common case, while custom RepairSchedule resources give you fine-grained control over specific keyspaces and tables. Combined with proper monitoring and tuning, Reaper keeps your Cassandra cluster healthy and your data consistent with minimal operational overhead.
