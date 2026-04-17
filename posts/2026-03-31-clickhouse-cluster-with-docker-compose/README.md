# How to Set Up ClickHouse Cluster with Docker Compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Docker Compose, Cluster, Replication, ZooKeeper, Distributed

Description: Learn how to set up a multi-node ClickHouse cluster with replication using Docker Compose, including ZooKeeper configuration for coordination.

---

Running a ClickHouse cluster with Docker Compose is an excellent way to test distributed features, replication, and sharding locally. This guide sets up a one-shard, two-replica cluster with ZooKeeper.

## Architecture Overview

This setup includes:

- 2 ClickHouse nodes: 1 shard x 2 replicas
- 1 ZooKeeper node for coordination
- A shared Docker network for inter-node communication

## Directory Structure

```bash
mkdir clickhouse-cluster && cd clickhouse-cluster
mkdir -p config/clickhouse config/ch1 config/ch2
```

## ZooKeeper and ClickHouse docker-compose.yml

```yaml
version: "3.8"

services:
  zookeeper:
    image: zookeeper:3.8
    container_name: zookeeper
    hostname: zookeeper
    ports:
      - "2181:2181"
    networks:
      - ch_net

  ch1:
    image: clickhouse/clickhouse-server:24.3
    container_name: ch1
    hostname: ch1
    ports:
      - "8123:8123"
      - "9000:9000"
    volumes:
      - ch1_data:/var/lib/clickhouse
      - ./config/clickhouse:/etc/clickhouse-server/config.d
      - ./config/ch1/macros.xml:/etc/clickhouse-server/config.d/macros.xml
    networks:
      - ch_net
    depends_on:
      - zookeeper

  ch2:
    image: clickhouse/clickhouse-server:24.3
    container_name: ch2
    hostname: ch2
    ports:
      - "8124:8123"
      - "9001:9000"
    volumes:
      - ch2_data:/var/lib/clickhouse
      - ./config/clickhouse:/etc/clickhouse-server/config.d
      - ./config/ch2/macros.xml:/etc/clickhouse-server/config.d/macros.xml
    networks:
      - ch_net
    depends_on:
      - zookeeper

networks:
  ch_net:
    driver: bridge

volumes:
  ch1_data:
  ch2_data:
```

## Cluster Configuration

Create `config/clickhouse/cluster.xml`:

```xml
<clickhouse>
    <zookeeper>
        <node>
            <host>zookeeper</host>
            <port>2181</port>
        </node>
    </zookeeper>

    <remote_servers>
        <my_cluster>
            <shard>
                <internal_replication>true</internal_replication>
                <replica>
                    <host>ch1</host>
                    <port>9000</port>
                </replica>
                <replica>
                    <host>ch2</host>
                    <port>9000</port>
                </replica>
            </shard>
        </my_cluster>
    </remote_servers>
</clickhouse>
```

Each node needs its own `macros.xml` so that `{shard}` and `{replica}` resolve to unique values per replica. Without a unique `{replica}` value, both nodes would register at the same ZooKeeper path and replication would fail.

Create `config/ch1/macros.xml`:

```xml
<clickhouse>
    <macros>
        <cluster>my_cluster</cluster>
        <shard>01</shard>
        <replica>ch1</replica>
    </macros>
</clickhouse>
```

Create `config/ch2/macros.xml`:

```xml
<clickhouse>
    <macros>
        <cluster>my_cluster</cluster>
        <shard>01</shard>
        <replica>ch2</replica>
    </macros>
</clickhouse>
```

## Starting the Cluster

```bash
docker compose up -d
docker compose ps
```

## Creating a Replicated Table

Connect to `ch1` and create a replicated table:

```sql
CREATE TABLE events_local ON CLUSTER my_cluster (
    event_id   UUID DEFAULT generateUUIDv4(),
    event_type String,
    event_time DateTime DEFAULT now()
) ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/events_local',
    '{replica}'
)
ORDER BY event_time;

CREATE TABLE events ON CLUSTER my_cluster AS events_local
ENGINE = Distributed(my_cluster, default, events_local, rand());
```

Insert data and verify replication:

```sql
INSERT INTO events (event_type) VALUES ('login'), ('purchase'), ('logout');

-- Query from ch2 to verify replication
SELECT count() FROM events;
```

## Verifying Cluster Status

```sql
SELECT
    cluster,
    shard_num,
    replica_num,
    host_name,
    is_local
FROM system.clusters
WHERE cluster = 'my_cluster';
```

## Summary

Docker Compose makes it straightforward to spin up a multi-node ClickHouse cluster for local testing. With ZooKeeper handling coordination and `ReplicatedMergeTree` tables, you can validate distributed queries, replication lag, and failover behavior before deploying to production.
