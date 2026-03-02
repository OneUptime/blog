# How to Set Up M3DB for Time-Series Storage on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Time-Series, M3DB, Monitoring, Prometheus

Description: A step-by-step guide to installing and configuring M3DB as a distributed time-series database on Ubuntu for long-term metrics storage at scale.

---

M3DB is a distributed time-series database built by Uber to handle their massive metrics workload. It's part of the M3 platform, which also includes M3Coordinator (a Prometheus remote write endpoint) and M3Query (a query frontend). M3DB is designed for environments where you need to store billions of metrics with configurable retention policies, strong consistency, and horizontal scalability. This guide covers deploying M3DB in standalone mode on Ubuntu, then configuring it as a Prometheus remote storage backend.

## Components Overview

- **M3DB** - the storage engine, handles writes and reads
- **M3Coordinator** - translates Prometheus remote write/read API to M3DB calls
- **M3Query** - provides PromQL query interface with additional features
- **etcd** - cluster coordination and configuration storage

## Installing M3DB

Download the M3DB binary:

```bash
# Download M3DB binary
VERSION="1.5.3"
curl -Lo /tmp/m3dbnode https://github.com/m3db/m3/releases/download/v${VERSION}/m3dbnode-linux-amd64

# Install
sudo mv /tmp/m3dbnode /usr/local/bin/
sudo chmod +x /usr/local/bin/m3dbnode

# Verify
m3dbnode --help
```

Also download M3Coordinator for Prometheus integration:

```bash
curl -Lo /tmp/m3coordinator https://github.com/m3db/m3/releases/download/v${VERSION}/m3coordinator-linux-amd64
sudo mv /tmp/m3coordinator /usr/local/bin/
sudo chmod +x /usr/local/bin/m3coordinator
```

## Setting Up etcd

M3DB uses etcd for cluster coordination. For a standalone setup, run a single etcd instance:

```bash
# Install etcd
sudo apt update
sudo apt install etcd

# Configure etcd
sudo nano /etc/default/etcd
```

```bash
# /etc/default/etcd
ETCD_NAME="m3db-etcd"
ETCD_DATA_DIR="/var/lib/etcd/m3db"
ETCD_LISTEN_CLIENT_URLS="http://0.0.0.0:2379"
ETCD_ADVERTISE_CLIENT_URLS="http://localhost:2379"
ETCD_LISTEN_PEER_URLS="http://0.0.0.0:2380"
ETCD_INITIAL_ADVERTISE_PEER_URLS="http://localhost:2380"
ETCD_INITIAL_CLUSTER="m3db-etcd=http://localhost:2380"
ETCD_INITIAL_CLUSTER_STATE="new"
ETCD_INITIAL_CLUSTER_TOKEN="m3db-cluster"
```

```bash
sudo systemctl enable etcd
sudo systemctl start etcd

# Verify etcd is running
etcdctl endpoint status
```

## Configuring M3DB

Create the M3DB configuration file:

```bash
sudo mkdir -p /etc/m3db /var/lib/m3db
sudo useradd --system --no-create-home m3db
sudo chown m3db:m3db /var/lib/m3db

sudo nano /etc/m3db/m3dbnode.yml
```

```yaml
# /etc/m3db/m3dbnode.yml - standalone M3DB configuration

logging:
  level: info

metrics:
  scope:
    prefix: m3db
  prometheus:
    handlerPath: /metrics
    listenAddress: 0.0.0.0:9004
    onError: none
  sanitization: prometheus
  samplingRate: 1.0
  extended: detailed

# HTTP management API
db:
  httpNodeListenAddress: 0.0.0.0:9002
  grpcListenAddress: 0.0.0.0:9001

  hostID:
    resolver: config
    value: m3db-node-01

  client:
    writeConsistencyLevel: majority
    readConsistencyLevel: unstrict_majority
    connectTimeout: 20s
    fetchTimeout: 15s
    backgroundHealthCheckFailLimit: 4
    backgroundHealthCheckFailThrottleFactor: 0.5

  # Storage configuration
  fs:
    filePathPrefix: /var/lib/m3db/data
    writeBufferSize: 65536
    dataReadBufferSize: 65536
    infoReadBufferSize: 128
    seekReadBufferSize: 4096
    throughputLimitMbps: 100.0
    throughputCheckEvery: 128

  # Commit log configuration
  commitlog:
    flushMaxBytes: 524288
    flushEvery: 1s
    queue:
      calculationType: fixed
      size: 2097152

  # Etcd connection for cluster coordination
  discovery:
    type: m3db_cluster
    m3dbCluster:
      env: default_env
      zone: embedded
      endpoints:
        - 127.0.0.1:2379

  # Namespace configuration (will be set via API)
  namespaces: []
```

## Creating the Systemd Service

```bash
sudo nano /etc/systemd/system/m3dbnode.service
```

```ini
[Unit]
Description=M3DB Node
After=network.target etcd.service

[Service]
Type=simple
User=m3db
Group=m3db
ExecStart=/usr/local/bin/m3dbnode -f /etc/m3db/m3dbnode.yml
Restart=always
RestartSec=10
LimitNOFILE=65536
LimitNPROC=65536

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable m3dbnode
sudo systemctl start m3dbnode

# Monitor startup
sudo journalctl -u m3dbnode -f
```

## Initializing the Cluster

M3DB requires cluster initialization via the management API:

```bash
# Initialize the placement (topology) for a single node
curl -X POST http://localhost:9002/api/v1/database/create \
    -H 'Content-Type: application/json' \
    -d '{
        "type": "local",
        "namespaceName": "default",
        "retentionTime": "720h"
    }'

# Check cluster status
curl http://localhost:9002/api/v1/database/health

# List namespaces
curl http://localhost:9002/api/v1/namespaces
```

## Configuring M3Coordinator

M3Coordinator acts as the bridge between Prometheus and M3DB:

```bash
sudo nano /etc/m3db/m3coordinator.yml
```

```yaml
# /etc/m3db/m3coordinator.yml

listenAddress: 0.0.0.0:7201

metrics:
  scope:
    prefix: coordinator
  prometheus:
    handlerPath: /metrics
    listenAddress: 0.0.0.0:7203

# Connect to M3DB
m3db:
  client:
    config:
      service:
        zone: embedded
        env: default_env
        etcdClusters:
          - zone: embedded
            endpoints:
              - 127.0.0.1:2379

# Namespace mapping
clusters:
  - namespaces:
      - namespace: default
        type: unaggregated
        retention: 720h
```

Create M3Coordinator service:

```bash
sudo nano /etc/systemd/system/m3coordinator.service
```

```ini
[Unit]
Description=M3 Coordinator
After=network.target m3dbnode.service

[Service]
Type=simple
ExecStart=/usr/local/bin/m3coordinator -f /etc/m3db/m3coordinator.yml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable m3coordinator
sudo systemctl start m3coordinator
```

## Configuring Prometheus Remote Write to M3DB

Edit your Prometheus configuration:

```yaml
# /etc/prometheus/prometheus.yml
global:
  scrape_interval: 15s

remote_write:
  - url: "http://localhost:7201/api/v1/prom/remote/write"
    remote_timeout: 30s
    queue_config:
      max_samples_per_send: 2000
      max_shards: 200
      capacity: 2500

remote_read:
  - url: "http://localhost:7201/api/v1/prom/remote/read"
    read_recent: true
```

## Creating Namespaces with Different Retentions

M3DB supports multiple namespaces with different retention policies - useful for keeping downsampled metrics longer than raw metrics:

```bash
# Create an aggregated namespace with 2-year retention (for downsampled data)
curl -X POST http://localhost:9002/api/v1/services/m3db/namespaces \
    -H 'Content-Type: application/json' \
    -d '{
        "name": "metrics_long_term",
        "options": {
            "bootstrapEnabled": true,
            "flushEnabled": true,
            "writesToCommitLog": true,
            "cleanupEnabled": true,
            "repairEnabled": false,
            "retentionOptions": {
                "retentionPeriodNanos": "63072000000000000",
                "blockSizeNanos": "7200000000000",
                "bufferFutureNanos": "600000000000",
                "bufferPastNanos": "600000000000"
            }
        }
    }'
```

## Querying M3DB

Query through M3Coordinator's Prometheus-compatible API:

```bash
# Instant query
curl 'http://localhost:7201/api/v1/query?query=up&time=2026-03-02T00:00:00Z'

# Range query
curl 'http://localhost:7201/api/v1/query_range?query=up&start=2026-03-01T00:00:00Z&end=2026-03-02T00:00:00Z&step=60s'

# Check M3DB metrics
curl http://localhost:9004/metrics | grep m3db_store
```

M3DB is well-suited for organizations already running large Prometheus deployments that need more than a year of retention or are storing more metrics than Prometheus's local TSDB can efficiently handle. The operational complexity is higher than VictoriaMetrics, but the distributed architecture allows linear horizontal scaling as your metrics volume grows.
