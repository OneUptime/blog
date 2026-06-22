# How to Run ClickHouse in Docker and Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Docker, Kubernetes, Container, Helm, DevOps, Database, Analytics

Description: A practical guide to deploying ClickHouse in containers, covering Docker single-node setups, Docker Compose clusters, Kubernetes deployments with the Altinity operator.

---

ClickHouse runs excellently in containers. The official Docker images are well-maintained, and several Kubernetes operators simplify cluster management. This guide covers deployment patterns from simple single-node Docker setups to production Kubernetes clusters.

## Running ClickHouse in Docker

### Basic Single-Node Setup

The quickest way to start ClickHouse:

```bash
docker run -d \
  --name clickhouse \
  -p 8123:8123 \
  -p 9000:9000 \
  -e CLICKHOUSE_SKIP_USER_SETUP=1 \
  clickhouse/clickhouse-server:latest
```

Connect using the CLI:

```bash
docker exec -it clickhouse clickhouse-client
```

Or via HTTP:

```bash
curl 'http://localhost:8123/?query=SELECT%201'
```

### Persisting Data

Without volumes, data is stored in the container's writable layer and is lost when the container is removed. Mount volumes for persistence:

```bash
docker run -d \
  --name clickhouse \
  -p 8123:8123 \
  -p 9000:9000 \
  -e CLICKHOUSE_SKIP_USER_SETUP=1 \
  -v clickhouse_data:/var/lib/clickhouse \
  -v clickhouse_logs:/var/log/clickhouse-server \
  clickhouse/clickhouse-server:latest
```

### Custom Configuration

Create a config directory and mount it:

```bash
mkdir -p clickhouse-config/config.d clickhouse-config/users.d
```

Create a custom configuration. This example increases memory limits and enables query logging:

```xml
<!-- clickhouse-config/config.d/custom.xml -->
<clickhouse>
    <logger>
        <level>information</level>
        <console>true</console>
    </logger>

    <query_log>
        <database>system</database>
        <table>query_log</table>
        <partition_by>toYYYYMM(event_date)</partition_by>
        <flush_interval_milliseconds>7500</flush_interval_milliseconds>
    </query_log>

    <max_server_memory_usage_to_ram_ratio>0.8</max_server_memory_usage_to_ram_ratio>
</clickhouse>
```

Create a default user with password:

```xml
<!-- clickhouse-config/users.d/default.xml -->
<clickhouse>
    <users>
        <default>
            <password_sha256_hex>YOUR_SHA256_HASH</password_sha256_hex>
            <networks>
                <ip>::/0</ip>
            </networks>
            <profile>default</profile>
            <quota>default</quota>
        </default>
    </users>
</clickhouse>
```

Generate the password hash:

```bash
echo -n "your_password" | sha256sum | cut -d' ' -f1
```

Run with custom config:

```bash
docker run -d \
  --name clickhouse \
  -p 8123:8123 \
  -p 9000:9000 \
  -v clickhouse_data:/var/lib/clickhouse \
  -v $(pwd)/clickhouse-config/config.d:/etc/clickhouse-server/config.d \
  -v $(pwd)/clickhouse-config/users.d:/etc/clickhouse-server/users.d \
  clickhouse/clickhouse-server:latest
```

## Docker Compose Multi-Node Cluster

For local development with clustering, use Docker Compose. This setup creates a 2-shard, 2-replica cluster with ClickHouse Keeper.

Here's a `docker-compose.yml` file that sets up the complete cluster:

```yaml
services:
  clickhouse-keeper-1:
    image: clickhouse/clickhouse-keeper:latest
    container_name: clickhouse-keeper-1
    hostname: clickhouse-keeper-1
    volumes:
      - keeper1_data:/var/lib/clickhouse-keeper
      - ./keeper-config/keeper1.xml:/etc/clickhouse-keeper/keeper_config.xml
    networks:
      - clickhouse-net

  clickhouse-keeper-2:
    image: clickhouse/clickhouse-keeper:latest
    container_name: clickhouse-keeper-2
    hostname: clickhouse-keeper-2
    volumes:
      - keeper2_data:/var/lib/clickhouse-keeper
      - ./keeper-config/keeper2.xml:/etc/clickhouse-keeper/keeper_config.xml
    networks:
      - clickhouse-net

  clickhouse-keeper-3:
    image: clickhouse/clickhouse-keeper:latest
    container_name: clickhouse-keeper-3
    hostname: clickhouse-keeper-3
    volumes:
      - keeper3_data:/var/lib/clickhouse-keeper
      - ./keeper-config/keeper3.xml:/etc/clickhouse-keeper/keeper_config.xml
    networks:
      - clickhouse-net

  clickhouse-01:
    image: clickhouse/clickhouse-server:latest
    container_name: clickhouse-01
    hostname: clickhouse-01
    ports:
      - "8123:8123"
      - "9000:9000"
    volumes:
      - ch01_data:/var/lib/clickhouse
      - ./ch-config/config.xml:/etc/clickhouse-server/config.d/cluster.xml
      - ./ch-config/macros-01.xml:/etc/clickhouse-server/config.d/macros.xml
    depends_on:
      - clickhouse-keeper-1
      - clickhouse-keeper-2
      - clickhouse-keeper-3
    networks:
      - clickhouse-net

  clickhouse-02:
    image: clickhouse/clickhouse-server:latest
    container_name: clickhouse-02
    hostname: clickhouse-02
    ports:
      - "8124:8123"
      - "9001:9000"
    volumes:
      - ch02_data:/var/lib/clickhouse
      - ./ch-config/config.xml:/etc/clickhouse-server/config.d/cluster.xml
      - ./ch-config/macros-02.xml:/etc/clickhouse-server/config.d/macros.xml
    depends_on:
      - clickhouse-keeper-1
      - clickhouse-keeper-2
      - clickhouse-keeper-3
    networks:
      - clickhouse-net

  clickhouse-03:
    image: clickhouse/clickhouse-server:latest
    container_name: clickhouse-03
    hostname: clickhouse-03
    ports:
      - "8125:8123"
      - "9002:9000"
    volumes:
      - ch03_data:/var/lib/clickhouse
      - ./ch-config/config.xml:/etc/clickhouse-server/config.d/cluster.xml
      - ./ch-config/macros-03.xml:/etc/clickhouse-server/config.d/macros.xml
    depends_on:
      - clickhouse-keeper-1
      - clickhouse-keeper-2
      - clickhouse-keeper-3
    networks:
      - clickhouse-net

  clickhouse-04:
    image: clickhouse/clickhouse-server:latest
    container_name: clickhouse-04
    hostname: clickhouse-04
    ports:
      - "8126:8123"
      - "9003:9000"
    volumes:
      - ch04_data:/var/lib/clickhouse
      - ./ch-config/config.xml:/etc/clickhouse-server/config.d/cluster.xml
      - ./ch-config/macros-04.xml:/etc/clickhouse-server/config.d/macros.xml
    depends_on:
      - clickhouse-keeper-1
      - clickhouse-keeper-2
      - clickhouse-keeper-3
    networks:
      - clickhouse-net

volumes:
  keeper1_data:
  keeper2_data:
  keeper3_data:
  ch01_data:
  ch02_data:
  ch03_data:
  ch04_data:

networks:
  clickhouse-net:
    driver: bridge
```

Create the cluster configuration. This file defines a 2-shard cluster with 2 replicas per shard:

```xml
<!-- ch-config/config.xml -->
<clickhouse>
    <remote_servers>
        <default_cluster>
            <shard>
                <internal_replication>true</internal_replication>
                <replica>
                    <host>clickhouse-01</host>
                    <port>9000</port>
                </replica>
                <replica>
                    <host>clickhouse-02</host>
                    <port>9000</port>
                </replica>
            </shard>
            <shard>
                <internal_replication>true</internal_replication>
                <replica>
                    <host>clickhouse-03</host>
                    <port>9000</port>
                </replica>
                <replica>
                    <host>clickhouse-04</host>
                    <port>9000</port>
                </replica>
            </shard>
        </default_cluster>
    </remote_servers>

    <zookeeper>
        <node>
            <host>clickhouse-keeper-1</host>
            <port>9181</port>
        </node>
        <node>
            <host>clickhouse-keeper-2</host>
            <port>9181</port>
        </node>
        <node>
            <host>clickhouse-keeper-3</host>
            <port>9181</port>
        </node>
    </zookeeper>
</clickhouse>
```

Create macro files for each node. Example for clickhouse-01:

```xml
<!-- ch-config/macros-01.xml -->
<clickhouse>
    <macros>
        <cluster>default_cluster</cluster>
        <shard>01</shard>
        <replica>clickhouse-01</replica>
    </macros>
</clickhouse>
```

Create the Keeper configuration files. Example for clickhouse-keeper-1:

```xml
<!-- keeper-config/keeper1.xml -->
<clickhouse>
    <listen_host>0.0.0.0</listen_host>
    <keeper_server>
        <tcp_port>9181</tcp_port>
        <server_id>1</server_id>
        <log_storage_path>/var/lib/clickhouse-keeper/log</log_storage_path>
        <snapshot_storage_path>/var/lib/clickhouse-keeper/snapshots</snapshot_storage_path>
        <raft_configuration>
            <server>
                <id>1</id>
                <hostname>clickhouse-keeper-1</hostname>
                <port>9234</port>
            </server>
            <server>
                <id>2</id>
                <hostname>clickhouse-keeper-2</hostname>
                <port>9234</port>
            </server>
            <server>
                <id>3</id>
                <hostname>clickhouse-keeper-3</hostname>
                <port>9234</port>
            </server>
        </raft_configuration>
    </keeper_server>
</clickhouse>
```

Create `keeper2.xml` and `keeper3.xml` with the same content, changing only `<server_id>` to `2` and `3`.

Start the cluster:

```bash
docker compose up -d
```

Verify the cluster is healthy:

```bash
docker exec -it clickhouse-01 clickhouse-client \
  --query "SELECT * FROM system.clusters WHERE cluster = 'default_cluster'"
```

## Deploying ClickHouse on Kubernetes

For production Kubernetes deployments, use an operator. The Altinity ClickHouse Operator is the most mature option.

### Installing the Altinity Operator

Add the Helm repository:

```bash
helm repo add altinity https://helm.altinity.com
helm repo update altinity
```

Install the operator:

```bash
helm upgrade --install clickhouse-operator altinity/altinity-clickhouse-operator \
  --namespace clickhouse \
  --create-namespace
```

Verify the operator is running:

```bash
kubectl get pods -n clickhouse
```

### Creating a ClickHouse Cluster

Define a ClickHouseInstallation custom resource. This creates a 2-shard, 2-replica cluster:

```yaml
# clickhouse-cluster.yaml

apiVersion: clickhouse.altinity.com/v1
kind: ClickHouseInstallation
metadata:
  name: analytics
  namespace: clickhouse
spec:
  configuration:
    clusters:
      - name: default
        layout:
          shardsCount: 2
          replicasCount: 2

    zookeeper:
      keeper:
        name: clickhouse-keeper

    profiles:
      default/max_memory_usage: 10000000000
      default/max_bytes_before_external_group_by: 5000000000

    users:
      admin/password_sha256_hex: YOUR_SHA256_HASH
      admin/networks/ip:
        - 10.0.0.0/8
        - 192.168.0.0/16
      admin/profile: default
      admin/quota: default

  defaults:
    templates:
      podTemplate: clickhouse-pod
      dataVolumeClaimTemplate: data-volume
      logVolumeClaimTemplate: log-volume

  templates:
    podTemplates:
      - name: clickhouse-pod
        spec:
          containers:
            - name: clickhouse
              image: clickhouse/clickhouse-server:24.1
              resources:
                requests:
                  memory: 4Gi
                  cpu: 2
                limits:
                  memory: 8Gi
                  cpu: 4

    volumeClaimTemplates:
      - name: data-volume
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 100Gi
          storageClassName: fast-ssd

      - name: log-volume
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 10Gi
          storageClassName: standard
```

Apply the configuration:

```bash
kubectl apply -f clickhouse-cluster.yaml
```

Watch the pods come up:

```bash
kubectl get pods -n clickhouse -w
```

### Deploying ClickHouse Keeper in Kubernetes

The ClickHouse cluster needs a coordination service. Deploy ClickHouse Keeper with the operator:

```yaml
# clickhouse-keeper.yaml
apiVersion: clickhouse-keeper.altinity.com/v1
kind: ClickHouseKeeperInstallation
metadata:
  name: clickhouse-keeper
  namespace: clickhouse
spec:
  configuration:
    clusters:
      - name: keeper
        layout:
          replicasCount: 3

  defaults:
    templates:
      podTemplate: keeper-pod
      volumeClaimTemplate: keeper-storage

  templates:
    podTemplates:
      - name: keeper-pod
        spec:
          containers:
            - name: clickhouse-keeper
              image: clickhouse/clickhouse-keeper:24.1
              resources:
                requests:
                  memory: 512Mi
                  cpu: 500m
                limits:
                  memory: 1Gi
                  cpu: 1

    volumeClaimTemplates:
      - name: keeper-storage
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 10Gi
```

### Accessing ClickHouse in Kubernetes

The operator creates services for each shard and a load-balanced service for the entire cluster:

```bash
# List services
kubectl get svc -n clickhouse

# Port-forward to access locally
kubectl port-forward svc/clickhouse-analytics 8123:8123 -n clickhouse

# Connect via CLI
kubectl exec -it chi-analytics-default-0-0-0 -n clickhouse -- clickhouse-client
```

### Using Helm Charts

For simpler deployments, Bitnami provides a ClickHouse Helm chart:

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami

helm install clickhouse bitnami/clickhouse \
  --namespace clickhouse \
  --set shards=2 \
  --set replicaCount=2 \
  --set keeper.enabled=true \
  --set persistence.size=100Gi
```

## Production Configuration Tips

Resource Limits

ClickHouse performs best with consistent resources. Set requests equal to limits:

```yaml
resources:
  requests:
    memory: 8Gi
    cpu: 4
  limits:
    memory: 8Gi
    cpu: 4
```

### Memory Settings

Configure ClickHouse memory limits in relation to container limits:

```xml
<max_server_memory_usage_to_ram_ratio>0.9</max_server_memory_usage_to_ram_ratio>
<max_memory_usage>7000000000</max_memory_usage>
```

### Storage

Use local SSDs or high-IOPS storage classes for best performance:

```yaml
storageClassName: premium-ssd
```

### Pod Disruption Budgets

Prevent too many pods from being evicted during upgrades:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: clickhouse-pdb
  namespace: clickhouse
spec:
  minAvailable: 50%
  selector:
    matchLabels:
      app: clickhouse
```

### Anti-Affinity

Spread replicas across nodes and zones:

```yaml
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchLabels:
            app: clickhouse
        topologyKey: kubernetes.io/hostname
```

## Monitoring

Deploy the ClickHouse Exporter for Prometheus metrics:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clickhouse-exporter
  namespace: clickhouse
spec:
  replicas: 1
  selector:
    matchLabels:
      app: clickhouse-exporter
  template:
    metadata:
      labels:
        app: clickhouse-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9116"
    spec:
      containers:
        - name: exporter
          image: f1yegor/clickhouse-exporter
          args:
            - -scrape_uri=http://clickhouse-analytics:8123/
          ports:
            - containerPort: 9116
```

---

Whether you're running a single node for development or a multi-shard cluster in production, containers make ClickHouse deployment reproducible and portable. Start with Docker for local work, then graduate to Kubernetes with the Altinity operator when you need production-grade clustering.
