# How to Understand Aurora Architecture and Storage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Aurora, Architecture, Database, Storage

Description: A deep dive into Amazon Aurora's distributed storage architecture, replication model, and how it achieves high availability and performance.

---

Aurora looks like MySQL or PostgreSQL from the application's perspective, but underneath, it's a fundamentally different database architecture. Understanding how it works isn't just academic - it directly impacts how you design your application, plan capacity, troubleshoot performance, and handle failure scenarios.

Most Aurora documentation focuses on "what to click." Let's instead focus on "how it works and why it matters."

## The Big Architectural Difference

Traditional databases (including standard RDS) follow a more tightly coupled architecture: the database engine writes to storage attached to the DB instance. When you write data, the engine writes to EBS-backed storage. Replication copies data from the primary to replicas over the network.

Aurora decouples the database engine from the storage layer. The compute instances (writer and readers) run the database engine, while storage is handled by a separate distributed system. This separation is what enables most of Aurora's advantages.

```mermaid
graph TB
    subgraph "Traditional RDS Architecture"
        A[Primary Instance] -->|EBS Write| B[EBS Volume]
        A -->|Replication Stream| C[Replica Instance]
        C -->|EBS Write| D[EBS Volume]
    end

    subgraph "Aurora Architecture"
        E[Writer Instance] -->|Redo Logs| F[Shared Storage Volume]
        G[Reader Instance 1] --> F
        H[Reader Instance 2] --> F
        F --> I[AZ-1: 2 copies]
        F --> J[AZ-2: 2 copies]
        F --> K[AZ-3: 2 copies]
    end
```

## The Storage Layer

Aurora's storage is a distributed, fault-tolerant system that spans three Availability Zones. Here's what makes it special:

### Six Copies Across Three AZs

Every piece of data you write is replicated six times: two copies in each of three AZs. This is significantly more redundant than a standard RDS Multi-AZ DB instance deployment, where changes are synchronously replicated to a standby in another AZ.

Aurora uses a quorum-based protocol:
- **Writes succeed** when 4 out of 6 copies acknowledge
- **Reads succeed** when 3 out of 6 copies acknowledge

This means Aurora can tolerate:
- The loss of an entire AZ (losing 2 copies) without affecting writes
- The loss of an entire AZ plus one additional node (losing 3 copies) without affecting reads
- Up to 2 copies failing simultaneously without any data loss

### 10 GB Protection Groups

The storage volume is divided into 10 GB segments called protection groups. Each protection group is independently replicated across six storage nodes. If a segment fails, only 10 GB needs to be repaired, not the entire volume.

This segmented approach means repair operations are fast. Rebuilding a 10 GB segment over a 10 Gbps network takes about 10 seconds. Compare that to rebuilding an entire multi-terabyte EBS volume, which could take hours.

### Log-Structured Storage

Here's a detail that surprises many people: Aurora doesn't write full data pages to the storage layer. It only writes redo log records.

In a traditional database:
1. The engine modifies a data page in memory
2. The engine writes the full data page (typically 8-16 KB) to storage
3. The engine also writes redo log entries for crash recovery

In Aurora:
1. The engine modifies a data page in memory
2. The engine sends only the redo log records to the storage layer
3. The storage layer applies the redo logs to reconstruct data pages

This dramatically reduces network I/O. Instead of sending full pages across the network, Aurora sends compact log records. AWS reports this reduces network I/O by up to 30x compared to standard MySQL, which is a big reason Aurora achieves higher throughput.

### Automatic Storage Scaling

Aurora storage auto-scales in 10 GB increments. Current Aurora versions support up to 128 TiB or 256 TiB cluster volumes, depending on the engine version. You never need to provision storage or worry about running out of disk space in the usual RDS sense, although the cluster can still reach its engine-version storage limit.

Storage billing is based on the storage your cluster volume uses, evaluated over time. On Aurora versions that support dynamic volume resizing, deleting a large amount of data can reduce the allocated cluster volume size and lower storage charges.

## How Replication Works

This is where Aurora really differs from traditional replication.

### Traditional MySQL Replication
The primary sends a stream of binary log events to each replica. The replica receives these events, writes them to its own relay log, and then replays them. This is asynchronous, so replicas can fall behind.

### Aurora Replication
Since all instances (writer and readers) share the same storage volume, there's no data replication in the traditional sense. The writer sends redo log records to the storage layer. Readers see the new data as soon as the storage layer applies those records.

The result: Aurora replica lag is typically 10-20 milliseconds, compared to seconds or even minutes with traditional replication. In practice, for many use cases, reads from Aurora replicas return data that's effectively real-time.

```mermaid
sequenceDiagram
    participant W as Writer Instance
    participant S as Storage Layer (6 copies)
    participant R as Reader Instance
    W->>S: Write redo log records
    S->>S: Apply logs, acknowledge when 4/6 copies done
    S-->>W: Write acknowledged
    R->>S: Read data page
    S-->>R: Returns page with latest applied logs
    Note over R: Sees new data with ~10ms delay
```

## Buffer Cache and Warm Reads

Each Aurora instance maintains its own buffer cache (in-memory pages). When you add a reader, it starts with a cold cache and needs to warm up by reading pages from storage. This can cause temporarily higher read latency on new reader instances.

One feature that helps: during a failover, Aurora can use the surviving instance's buffer cache. If reader-1 gets promoted to writer, it already has a warm cache from serving reads, so performance impact is minimal compared to a cold start.

## Failover Mechanics

Aurora failover is faster than standard RDS for several reasons:

1. **No data replication needed**: The new writer already has access to all data through the shared storage layer.
2. **Fast recovery**: Aurora's storage layer and survivable page cache reduce the amount of recovery work needed on the new writer.
3. **DNS update**: Aurora updates the cluster endpoint DNS to point to the new writer.

Typical failover times:
- **With existing readers**: typically within 30 seconds. Aurora promotes a reader to writer.
- **Without readers**: typically less than 10 minutes. Aurora needs to create a new instance.

This is why production Aurora clusters commonly include at least one reader instance, even when read scaling isn't the primary goal.

## Storage Costs

Aurora storage pricing differs from standard RDS:

- **Standard RDS**: You provision a fixed amount of storage (e.g., 500 GB) and pay for that regardless of usage.
- **Aurora**: You pay per GB-month for what you actually use, plus per million I/O requests.

For small databases, Aurora can be more expensive because the per-GB rate is higher. For large databases with variable storage needs, Aurora can be cheaper because you don't have to over-provision.

As of 2026, Aurora storage pricing in common US Regions is approximately:
- Storage: $0.10 per GB-month
- I/O: $0.20 per million requests (standard), or included with Aurora I/O-Optimized

### Aurora I/O-Optimized

If your workload is I/O-intensive, consider Aurora I/O-Optimized. This configuration eliminates per-I/O charges and replaces them with a higher storage rate (roughly $0.225 per GB-month). For workloads where I/O costs exceed 25% of your total Aurora bill, I/O-Optimized saves money.

```bash
# Switch to I/O-Optimized storage

aws rds modify-db-cluster \
  --db-cluster-identifier my-aurora-cluster \
  --storage-type aurora-iopt1 \
  --apply-immediately
```

## Backtracking (Aurora MySQL Only)

Aurora MySQL has a unique feature called Backtracking that lets you "rewind" the database to a previous point in time without restoring from a snapshot:

```bash
# Enable backtracking when creating the cluster (Aurora MySQL only)
aws rds create-db-cluster \
  --db-cluster-identifier my-cluster \
  --engine aurora-mysql \
  --master-username admin \
  --master-user-password 'changeMe123!' \
  --backtrack-window 86400

# Backtrack to a specific time
aws rds backtrack-db-cluster \
  --db-cluster-identifier my-cluster \
  --backtrack-to "2026-02-12T10:30:00Z"
```

This works because Aurora stores change records for the configured backtrack window. Backtracking usually takes minutes, compared to minutes or hours for a snapshot restore.

## Performance Considerations

Understanding the architecture helps you optimize performance:

**Write throughput**: Aurora's log-structured writes reduce I/O amplification, but the writer is still a single instance. If you need more write throughput, you need to shard at the application level.

**Read throughput**: Scale horizontally by adding reader instances. They're cheap to add since they share storage. See our guide on [setting up Aurora read replicas](https://oneuptime.com/blog/post/2026-02-12-set-up-aurora-read-replicas/view).

**Latency**: Aurora's read latency depends heavily on buffer cache hit ratio. Monitor this metric. If it drops below 95-99%, your working set is larger than available memory and you should consider a larger instance class.

**I/O patterns**: Aurora performs best with workloads that have high read-to-write ratios. The shared storage architecture is optimized for this pattern.

## When to Choose Aurora vs. Standard RDS

Choose Aurora when:
- You need very low replica lag
- You want fast, automatic failover
- You don't want to manage storage provisioning
- Your database might grow unpredictably
- You need many low-lag read replicas without putting traditional replication load on the primary

Choose standard RDS when:
- You have a small database (< 100 GB) and want to minimize cost
- You need a database engine not supported by Aurora (SQL Server, Oracle)
- You want more control over the storage layer (specific IOPS, specific storage type)

Aurora's architecture is what makes it more than "just RDS but faster." The distributed storage, log-based replication, and quorum writes give it durability and availability characteristics that are genuinely difficult to achieve with traditional database architectures. Understanding these internals helps you make better decisions about when to use it and how to get the most out of it.
