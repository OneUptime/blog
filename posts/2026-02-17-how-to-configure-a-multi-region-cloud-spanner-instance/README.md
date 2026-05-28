# How to Configure a Multi-Region Cloud Spanner Instance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Spanner, Multi-Region, High Availability, Database

Description: A practical guide to configuring multi-region Cloud Spanner instances for global applications requiring high availability and low-latency reads.

---

One of Cloud Spanner's most compelling features is its ability to run across multiple regions while maintaining strong consistency. A multi-region instance replicates your data across several geographic areas, giving you higher availability guarantees and lower read latency for globally distributed users. In this post, I will walk through how to choose and configure a multi-region Spanner instance, and what tradeoffs to expect.

## Single-Region vs Multi-Region

Before diving into configuration, let's understand what you get with each option:

A **single-region instance** stores your data in one geographic region. Regional Spanner configurations provide 99.99% availability within that region. If the region goes down, your database goes down.

A **multi-region instance** replicates data across multiple regions automatically. It provides 99.999% availability even if an entire region becomes unavailable. Reads can be fast from locations near configured read-write or read-only replicas. Writes go through the leader region, so they have slightly higher latency if the writer is far from the leader.

## Available Multi-Region Configurations

Spanner offers several predefined multi-region configurations in the Enterprise Plus edition. You can see them all with:

```bash
# List all available instance configurations, including multi-region options

gcloud spanner instance-configs list --filter="name:nam OR name:eur OR name:asia"
```

Some commonly used multi-region configurations:

- **nam6** - Replicas in multiple US regions. Good for US-only applications needing regional fault tolerance.
- **nam14** - Replicas across North America, similar to nam6 but with different region choices.
- **eur6** - Replicas across multiple European regions.
- **nam-eur-asia1** - The broadest configuration, spanning North America, Europe, and Asia.

Each configuration has a specific set of read-write, read-only, and witness replicas placed in predetermined regions.

## Checking Configuration Details

To see exactly which regions are included in a configuration:

```bash
# See the detailed replica placement for a specific configuration
gcloud spanner instance-configs describe nam6
```

This will show you something like:

```text
displayName: United States (NAM6)
replicas:
- location: us-central1
  type: READ_WRITE
- location: us-east1
  type: READ_WRITE
- location: us-west1
  type: READ_ONLY
- location: us-west2
  type: READ_ONLY
- location: us-central2
  type: WITNESS
```

The replica types matter:

- **READ_WRITE replicas** participate in write quorums and can serve reads. The leader is always in one of these regions.
- **READ_ONLY replicas** serve reads only. They maintain a full copy of the data but do not vote on writes or become leaders.
- **WITNESS replicas** participate in write quorums to maintain consensus but do not store a full copy of the data and cannot serve reads.

## Creating a Multi-Region Instance

Creating a multi-region instance is nearly identical to creating a single-region one:

```bash
# Create a multi-region instance spanning US regions
gcloud spanner instances create my-global-instance \
    --config=nam6 \
    --description="My Global Spanner Instance" \
    --edition=ENTERPRISE_PLUS \
    --processing-units=1000
```

That is it. Spanner handles all the replication automatically. Your data is now spread across multiple US regions.

For a truly global deployment:

```bash
# Create a globally distributed instance
gcloud spanner instances create my-worldwide-instance \
    --config=nam-eur-asia1 \
    --description="Global Spanner Instance" \
    --edition=ENTERPRISE_PLUS \
    --processing-units=3000
```

## Creating a Database on a Multi-Region Instance

Database creation works the same as single-region:

```bash
# Create a database on the multi-region instance
gcloud spanner databases create my-global-db \
    --instance=my-global-instance \
    --ddl='CREATE TABLE Users (
        UserId STRING(36) NOT NULL,
        Email STRING(256) NOT NULL,
        Region STRING(32),
        CreatedAt TIMESTAMP NOT NULL
    ) PRIMARY KEY (UserId)'
```

The database automatically inherits the multi-region configuration of the instance.

## Understanding Write Latency

The most important tradeoff with multi-region instances is write latency. Every write must be committed by a quorum of replicas before it is acknowledged to the client. Since these replicas are in different regions, the write latency includes the network round-trip time between regions.

For a nam6 configuration, Spanner places the voting regions within the US to form a low-latency write quorum. For nam-eur-asia1, the write quorum is still formed by the voting replicas in North America; the Europe and Asia replicas are read-only, so they do not directly add to write quorum latency.

Here is how write flow works:

```mermaid
sequenceDiagram
    participant App as Application (us-east1)
    participant Leader as Leader (us-central1)
    participant RW2 as Read-Write Replica (us-east1)
    participant Witness as Witness (us-central2)

    App->>Leader: Write request
    Leader->>RW2: Prepare write
    Leader->>Witness: Prepare write
    RW2-->>Leader: Prepared
    Witness-->>Leader: Prepared
    Leader-->>App: Write committed
    Leader->>Leader: Replicate to remaining non-witness replicas
```

## Optimizing Read Performance

While writes go through the leader, reads can be served by read-write or read-only replicas. This is where multi-region really shines for read-heavy workloads.

**Strong reads** can go to any read-write or read-only replica. If the request goes to a non-leader replica, Spanner might need to communicate with the leader to make sure the read sees all data committed before the read starts.

**Stale reads** can be served by the closest available read-only or read-write replica that has caught up to the requested timestamp. If your application can tolerate data that is several seconds old, stale reads can avoid the leader round trip and reduce latency.

```python
from google.cloud import spanner
import datetime

client = spanner.Client()
instance = client.instance("my-global-instance")
database = instance.database("my-global-db")

# Strong read - might need to communicate with the leader
with database.snapshot() as snapshot:
    results = snapshot.execute_sql("SELECT * FROM Users WHERE UserId = @id",
        params={"id": "user-123"},
        param_types={"id": spanner.param_types.STRING})

# Stale read - can be served by a nearby replica that has caught up
# Accepts data up to 15 seconds old
staleness = datetime.timedelta(seconds=15)
with database.snapshot(exact_staleness=staleness) as snapshot:
    results = snapshot.execute_sql("SELECT * FROM Users WHERE UserId = @id",
        params={"id": "user-123"},
        param_types={"id": spanner.param_types.STRING})
```

## Cost Considerations

Multi-region instances cost more than single-region instances. The cost multiplier depends on the configuration:

- Compute capacity is billed at the rate for the selected edition and instance configuration
- Dual-region and multi-region configurations also incur cross-region data replication charges for writes

This is because multi-region configurations use five or more replicas, depending on the configuration, and Spanner also charges for cross-region replication in dual-region and multi-region configurations. The pricing scales with processing units, so a multi-region instance with 1000 processing units costs more than a single-region instance with 1000 processing units.

For many applications, the right strategy is to use single-region instances for development and staging, and multi-region for production where availability is critical.

## Decision Framework

Here is a framework for choosing between single and multi-region:

```mermaid
flowchart TD
    A[What are your availability requirements?] -->|99.99% regional| B[Single-region instance]
    A -->|99.999% even during regional outages| C[Multi-region instance]
    C --> D{Where are your users?}
    D -->|Single country| E[Same-continent multi-region - nam6 or eur6]
    D -->|Multiple continents| F[Global multi-region - nam-eur-asia1]
    B --> G{Budget concerns?}
    G -->|Yes| H[Single-region with cross-region backups for DR]
    G -->|No| I[Consider multi-region for extra safety]
```

## Monitoring a Multi-Region Instance

Keep an eye on per-region latency to make sure your global deployment is performing as expected:

```bash
# Check instance-level metrics
gcloud spanner instances describe my-global-instance
```

Use Cloud Monitoring to track:

- Write latency by region (to see the impact of cross-region coordination)
- Read latency by region (to verify local reads are fast)
- CPU utilization per region (to detect unbalanced load)
- Replication lag (to monitor how quickly read-only replicas catch up)

## Wrapping Up

Multi-region Cloud Spanner instances give you a level of availability and global reach that is hard to achieve with any other database. The setup is simple - you just pick a multi-region configuration and create your instance. The complexity is in understanding the tradeoffs: higher write latency, higher cost, but dramatically better availability and global read performance. For applications that serve users worldwide or cannot tolerate regional outages, multi-region Spanner is one of the most practical solutions available.
