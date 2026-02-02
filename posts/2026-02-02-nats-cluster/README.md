# How to Set Up NATS Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NATS, Messaging, Clustering, High Availability, Microservices, DevOps

Description: A comprehensive guide to setting up a NATS cluster for high availability messaging, including cluster configuration, security, monitoring, and production best practices.

---

NATS is a lightweight, high-performance messaging system designed for cloud-native applications. Running NATS as a cluster provides fault tolerance, high availability, and horizontal scalability for your messaging infrastructure.

## NATS Cluster Architecture

A NATS cluster consists of multiple servers that communicate with each other, allowing clients connected to any server to send and receive messages across the entire cluster.

```mermaid
flowchart TB
    subgraph Clients
        C1[Publisher Client]
        C2[Subscriber Client 1]
        C3[Subscriber Client 2]
    end

    subgraph NATS Cluster
        N1[NATS Server 1<br/>:4222]
        N2[NATS Server 2<br/>:4222]
        N3[NATS Server 3<br/>:4222]

        N1 <-->|Cluster Route<br/>:6222| N2
        N2 <-->|Cluster Route<br/>:6222| N3
        N3 <-->|Cluster Route<br/>:6222| N1
    end

    C1 --> N1
    C2 --> N2
    C3 --> N3
```

### Key Cluster Concepts

| Concept | Description |
|---------|-------------|
| Routes | Connections between NATS servers for message forwarding |
| Cluster Port | Dedicated port for inter-server communication (default: 6222) |
| Client Port | Port for client connections (default: 4222) |
| Gossip Protocol | Mechanism for cluster discovery and health checking |

## Prerequisites

Before setting up a NATS cluster, ensure you have the following:

- Three or more servers (virtual or physical) for production deployments
- Network connectivity between all servers
- Firewall rules allowing ports 4222 (clients) and 6222 (cluster routes)
- NATS server binary or Docker installed on each node

## Installing NATS Server

### Option 1: Binary Installation

Download and install the NATS server binary on each node.

```bash
# Download the latest NATS server release
curl -L https://github.com/nats-io/nats-server/releases/download/v2.10.7/nats-server-v2.10.7-linux-amd64.tar.gz -o nats-server.tar.gz

# Extract the archive
tar -xzf nats-server.tar.gz

# Move the binary to a system path
sudo mv nats-server-v2.10.7-linux-amd64/nats-server /usr/local/bin/

# Verify the installation
nats-server --version
```

### Option 2: Docker Installation

Pull the official NATS Docker image.

```bash
# Pull the official NATS image
docker pull nats:2.10.7

# Verify the image
docker run --rm nats:2.10.7 --version
```

## Basic Cluster Configuration

### Server 1 Configuration

Create the configuration file for the first NATS server.

```hcl
# /etc/nats/nats-server-1.conf
# Server identification
server_name: nats-1

# Client connection settings
port: 4222
host: 0.0.0.0

# HTTP monitoring endpoint
http_port: 8222

# Cluster configuration
cluster {
    name: my-nats-cluster

    # Port for cluster communication
    port: 6222
    host: 0.0.0.0

    # Define routes to other cluster members
    routes: [
        nats-route://nats-2.example.com:6222
        nats-route://nats-3.example.com:6222
    ]
}

# Logging configuration
debug: false
trace: false
logtime: true
log_file: /var/log/nats/nats-server.log
```

### Server 2 Configuration

Configure the second server with routes pointing to other cluster members.

```hcl
# /etc/nats/nats-server-2.conf
server_name: nats-2

port: 4222
host: 0.0.0.0
http_port: 8222

cluster {
    name: my-nats-cluster
    port: 6222
    host: 0.0.0.0

    routes: [
        nats-route://nats-1.example.com:6222
        nats-route://nats-3.example.com:6222
    ]
}

debug: false
trace: false
logtime: true
log_file: /var/log/nats/nats-server.log
```

### Server 3 Configuration

Complete the cluster with the third server configuration.

```hcl
# /etc/nats/nats-server-3.conf
server_name: nats-3

port: 4222
host: 0.0.0.0
http_port: 8222

cluster {
    name: my-nats-cluster
    port: 6222
    host: 0.0.0.0

    routes: [
        nats-route://nats-1.example.com:6222
        nats-route://nats-2.example.com:6222
    ]
}

debug: false
trace: false
logtime: true
log_file: /var/log/nats/nats-server.log
```

## Securing the Cluster

### TLS Configuration

Secure both client and cluster connections using TLS certificates.

```mermaid
flowchart LR
    subgraph Certificate Authority
        CA[Root CA]
    end

    subgraph Certificates
        CA --> SC1[Server 1 Cert]
        CA --> SC2[Server 2 Cert]
        CA --> SC3[Server 3 Cert]
        CA --> CC[Client Cert]
    end

    subgraph NATS Cluster
        SC1 --> N1[NATS 1]
        SC2 --> N2[NATS 2]
        SC3 --> N3[NATS 3]
    end

    CC --> Client[Client App]
    Client --> N1
```

Generate certificates using OpenSSL or your preferred PKI tool.

```bash
# Generate CA private key and certificate
openssl genrsa -out ca-key.pem 4096
openssl req -new -x509 -days 365 -key ca-key.pem -out ca.pem -subj "/CN=NATS CA"

# Generate server private key
openssl genrsa -out server-key.pem 4096

# Create certificate signing request
openssl req -new -key server-key.pem -out server.csr -subj "/CN=nats-server"

# Sign the server certificate with CA
openssl x509 -req -days 365 -in server.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial -out server.pem
```

Apply TLS settings to your NATS configuration.

```hcl
# /etc/nats/nats-server-secure.conf
server_name: nats-1

port: 4222
host: 0.0.0.0
http_port: 8222

# TLS for client connections
tls {
    cert_file: /etc/nats/certs/server.pem
    key_file: /etc/nats/certs/server-key.pem
    ca_file: /etc/nats/certs/ca.pem
    verify: true
    timeout: 2
}

cluster {
    name: my-nats-cluster
    port: 6222
    host: 0.0.0.0

    # TLS for cluster routes
    tls {
        cert_file: /etc/nats/certs/server.pem
        key_file: /etc/nats/certs/server-key.pem
        ca_file: /etc/nats/certs/ca.pem
        verify: true
        timeout: 2
    }

    routes: [
        nats-route://nats-2.example.com:6222
        nats-route://nats-3.example.com:6222
    ]
}
```

### Authentication Configuration

Add authentication to prevent unauthorized access to your cluster.

```hcl
# /etc/nats/nats-server-auth.conf
server_name: nats-1

port: 4222
host: 0.0.0.0
http_port: 8222

# User authentication for clients
authorization {
    users: [
        {user: publisher, password: "$2a$11$...", permissions: {publish: ">"}}
        {user: subscriber, password: "$2a$11$...", permissions: {subscribe: ">"}}
        {user: admin, password: "$2a$11$...", permissions: {publish: ">", subscribe: ">"}}
    ]
}

cluster {
    name: my-nats-cluster
    port: 6222
    host: 0.0.0.0

    # Cluster authentication
    authorization {
        user: cluster_user
        password: "secure_cluster_password"
        timeout: 2
    }

    routes: [
        nats-route://cluster_user:secure_cluster_password@nats-2.example.com:6222
        nats-route://cluster_user:secure_cluster_password@nats-3.example.com:6222
    ]
}
```

## Kubernetes Deployment

### NATS Helm Chart Installation

Deploy NATS cluster on Kubernetes using the official Helm chart.

```bash
# Add the NATS Helm repository
helm repo add nats https://nats-io.github.io/k8s/helm/charts/
helm repo update

# Install NATS with clustering enabled
helm install nats nats/nats \
    --set cluster.enabled=true \
    --set cluster.replicas=3 \
    --set nats.jetstream.enabled=true \
    --set nats.jetstream.fileStore.pvc.size=10Gi
```

### Custom Kubernetes Manifests

Deploy NATS cluster using custom Kubernetes resources for more control.

```yaml
# nats-configmap.yaml
# ConfigMap containing NATS server configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: nats-config
  namespace: nats
data:
  nats.conf: |
    server_name: $NATS_SERVER_NAME

    port: 4222
    http_port: 8222

    cluster {
        name: nats-cluster
        port: 6222

        routes: [
            nats-route://nats-0.nats-headless.nats.svc.cluster.local:6222
            nats-route://nats-1.nats-headless.nats.svc.cluster.local:6222
            nats-route://nats-2.nats-headless.nats.svc.cluster.local:6222
        ]
    }

    jetstream {
        store_dir: /data/jetstream
        max_memory_store: 1Gi
        max_file_store: 10Gi
    }
```

Create the StatefulSet for NATS cluster deployment.

```yaml
# nats-statefulset.yaml
# StatefulSet for running NATS as a clustered service
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: nats
  namespace: nats
spec:
  serviceName: nats-headless
  replicas: 3
  selector:
    matchLabels:
      app: nats
  template:
    metadata:
      labels:
        app: nats
    spec:
      containers:
        - name: nats
          image: nats:2.10.7
          ports:
            - containerPort: 4222
              name: client
            - containerPort: 6222
              name: cluster
            - containerPort: 8222
              name: monitor
          env:
            - name: NATS_SERVER_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
          command:
            - nats-server
            - --config
            - /etc/nats/nats.conf
          volumeMounts:
            - name: config
              mountPath: /etc/nats
            - name: data
              mountPath: /data
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8222
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /healthz?js-enabled-only=true
              port: 8222
            initialDelaySeconds: 10
            periodSeconds: 10
      volumes:
        - name: config
          configMap:
            name: nats-config
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
```

Define services for client access and internal cluster communication.

```yaml
# nats-services.yaml
# Headless service for StatefulSet DNS resolution
apiVersion: v1
kind: Service
metadata:
  name: nats-headless
  namespace: nats
spec:
  clusterIP: None
  selector:
    app: nats
  ports:
    - name: client
      port: 4222
    - name: cluster
      port: 6222
    - name: monitor
      port: 8222
---
# ClusterIP service for client connections
apiVersion: v1
kind: Service
metadata:
  name: nats
  namespace: nats
spec:
  selector:
    app: nats
  ports:
    - name: client
      port: 4222
      targetPort: 4222
```

## Docker Compose Deployment

Deploy a local NATS cluster using Docker Compose for development and testing.

```yaml
# docker-compose.yaml
# Docker Compose file for running a 3-node NATS cluster
version: "3.8"

services:
  nats-1:
    image: nats:2.10.7
    container_name: nats-1
    command: >
      --name nats-1
      --cluster_name my-cluster
      --cluster nats://0.0.0.0:6222
      --routes nats://nats-2:6222,nats://nats-3:6222
      --http_port 8222
    ports:
      - "4222:4222"
      - "8222:8222"
    networks:
      - nats-cluster

  nats-2:
    image: nats:2.10.7
    container_name: nats-2
    command: >
      --name nats-2
      --cluster_name my-cluster
      --cluster nats://0.0.0.0:6222
      --routes nats://nats-1:6222,nats://nats-3:6222
      --http_port 8222
    ports:
      - "4223:4222"
      - "8223:8222"
    networks:
      - nats-cluster

  nats-3:
    image: nats:2.10.7
    container_name: nats-3
    command: >
      --name nats-3
      --cluster_name my-cluster
      --cluster nats://0.0.0.0:6222
      --routes nats://nats-1:6222,nats://nats-2:6222
      --http_port 8222
    ports:
      - "4224:4222"
      - "8224:8222"
    networks:
      - nats-cluster

networks:
  nats-cluster:
    driver: bridge
```

Start the cluster with Docker Compose.

```bash
# Start the NATS cluster in detached mode
docker-compose up -d

# Verify all containers are running
docker-compose ps

# View logs from all NATS servers
docker-compose logs -f
```

## JetStream Configuration

JetStream adds persistence, stream processing, and exactly-once delivery to NATS. Enable JetStream for durable messaging capabilities.

```mermaid
flowchart TB
    subgraph JetStream Cluster
        JS1[JetStream Server 1<br/>Leader]
        JS2[JetStream Server 2<br/>Follower]
        JS3[JetStream Server 3<br/>Follower]

        JS1 -->|Raft Replication| JS2
        JS1 -->|Raft Replication| JS3
    end

    subgraph Storage
        S1[(Stream Storage)]
        S2[(Consumer State)]
    end

    JS1 --> S1
    JS1 --> S2

    Publisher[Publisher] -->|Publish| JS1
    JS1 -->|Deliver| Consumer[Consumer]
```

Configure JetStream in your NATS server.

```hcl
# /etc/nats/nats-jetstream.conf
server_name: nats-1

port: 4222
http_port: 8222

# JetStream configuration
jetstream {
    # Storage directory for streams and consumers
    store_dir: /data/jetstream

    # Maximum memory storage per server
    max_memory_store: 1Gi

    # Maximum file storage per server
    max_file_store: 50Gi

    # Domain for multi-cluster JetStream
    domain: production
}

cluster {
    name: my-nats-cluster
    port: 6222

    routes: [
        nats-route://nats-2.example.com:6222
        nats-route://nats-3.example.com:6222
    ]
}
```

## Client Connection Examples

### Go Client

Connect to the NATS cluster from a Go application.

```go
// main.go
// Go client connecting to NATS cluster with failover support
package main

import (
    "log"
    "time"

    "github.com/nats-io/nats.go"
)

func main() {
    // Connect to the cluster with multiple server URLs
    // The client will automatically failover if a server becomes unavailable
    nc, err := nats.Connect(
        "nats://nats-1.example.com:4222,nats://nats-2.example.com:4222,nats://nats-3.example.com:4222",
        nats.Name("my-app"),
        nats.ReconnectWait(2*time.Second),
        nats.MaxReconnects(-1), // Unlimited reconnection attempts
        nats.DisconnectErrHandler(func(nc *nats.Conn, err error) {
            log.Printf("Disconnected: %v", err)
        }),
        nats.ReconnectHandler(func(nc *nats.Conn) {
            log.Printf("Reconnected to %s", nc.ConnectedUrl())
        }),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer nc.Close()

    // Subscribe to a subject
    _, err = nc.Subscribe("orders.*", func(msg *nats.Msg) {
        log.Printf("Received: %s", string(msg.Data))
    })
    if err != nil {
        log.Fatal(err)
    }

    // Publish a message
    err = nc.Publish("orders.new", []byte(`{"id": 123, "product": "widget"}`))
    if err != nil {
        log.Fatal(err)
    }

    // Wait for messages
    select {}
}
```

### Node.js Client

Connect to the NATS cluster from a Node.js application.

```javascript
// client.js
// Node.js client connecting to NATS cluster with automatic reconnection
const { connect, StringCodec } = require('nats');

async function main() {
    // Connect to the cluster - the client handles failover automatically
    const nc = await connect({
        servers: [
            'nats://nats-1.example.com:4222',
            'nats://nats-2.example.com:4222',
            'nats://nats-3.example.com:4222'
        ],
        name: 'my-nodejs-app',
        reconnect: true,
        maxReconnectAttempts: -1,
        reconnectTimeWait: 2000,
    });

    const sc = StringCodec();

    // Handle connection events
    nc.closed().then((err) => {
        if (err) {
            console.log(`Connection closed with error: ${err.message}`);
        } else {
            console.log('Connection closed');
        }
    });

    // Subscribe to messages
    const sub = nc.subscribe('orders.*');
    (async () => {
        for await (const msg of sub) {
            console.log(`Received: ${sc.decode(msg.data)}`);
        }
    })();

    // Publish a message
    nc.publish('orders.new', sc.encode(JSON.stringify({
        id: 123,
        product: 'widget'
    })));

    console.log('Connected to NATS cluster');
}

main().catch(console.error);
```

### Python Client

Connect to the NATS cluster from a Python application.

```python
# client.py
# Python client connecting to NATS cluster with asyncio
import asyncio
import json
import nats

async def main():
    # Connect to the cluster with multiple servers for failover
    nc = await nats.connect(
        servers=[
            "nats://nats-1.example.com:4222",
            "nats://nats-2.example.com:4222",
            "nats://nats-3.example.com:4222"
        ],
        name="my-python-app",
        reconnect_time_wait=2,
        max_reconnect_attempts=-1,
    )

    # Define message handler
    async def message_handler(msg):
        subject = msg.subject
        data = msg.data.decode()
        print(f"Received on '{subject}': {data}")

    # Subscribe to orders
    await nc.subscribe("orders.*", cb=message_handler)

    # Publish a message
    await nc.publish(
        "orders.new",
        json.dumps({"id": 123, "product": "widget"}).encode()
    )

    print("Connected to NATS cluster")

    # Keep the connection alive
    while True:
        await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(main())
```

## Monitoring and Observability

### Prometheus Metrics

Configure NATS to expose Prometheus metrics.

```hcl
# /etc/nats/nats-monitoring.conf
server_name: nats-1

port: 4222
http_port: 8222

# Enable Prometheus metrics endpoint
http: 0.0.0.0:8222

cluster {
    name: my-nats-cluster
    port: 6222
    routes: [
        nats-route://nats-2.example.com:6222
        nats-route://nats-3.example.com:6222
    ]
}
```

Create a Prometheus scrape configuration for NATS.

```yaml
# prometheus.yaml
# Prometheus configuration for scraping NATS metrics
scrape_configs:
  - job_name: 'nats'
    static_configs:
      - targets:
          - 'nats-1.example.com:8222'
          - 'nats-2.example.com:8222'
          - 'nats-3.example.com:8222'
    metrics_path: /varz
    params:
      srvz: ['true']
      connz: ['true']
      routez: ['true']
      subsz: ['true']
      jsz: ['true']
```

### Grafana Dashboard

Deploy the NATS Surveyor for comprehensive cluster monitoring.

```yaml
# nats-surveyor.yaml
# Kubernetes deployment for NATS Surveyor metrics collection
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nats-surveyor
  namespace: nats
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nats-surveyor
  template:
    metadata:
      labels:
        app: nats-surveyor
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "7777"
    spec:
      containers:
        - name: surveyor
          image: natsio/nats-surveyor:latest
          args:
            - -s
            - nats://nats.nats.svc.cluster.local:4222
            - -observe
            - my-nats-cluster
          ports:
            - containerPort: 7777
              name: metrics
```

### Health Check Endpoints

NATS provides built-in health check endpoints for monitoring.

```bash
# Check server health
curl http://nats-1.example.com:8222/healthz

# Get server information
curl http://nats-1.example.com:8222/varz

# Check cluster routes
curl http://nats-1.example.com:8222/routez

# View active connections
curl http://nats-1.example.com:8222/connz

# Check JetStream status
curl http://nats-1.example.com:8222/jsz
```

## Troubleshooting

### Common Issues and Solutions

```mermaid
flowchart TD
    A[Connection Failed] --> B{Check Network}
    B -->|Port Blocked| C[Open Firewall Ports<br/>4222, 6222]
    B -->|DNS Issue| D[Verify Server Hostnames]
    B -->|Network OK| E{Check Auth}

    E -->|Auth Error| F[Verify Credentials]
    E -->|TLS Error| G[Check Certificates]
    E -->|Auth OK| H{Check Cluster}

    H -->|Routes Down| I[Verify Cluster Config]
    H -->|Split Brain| J[Check Network Partitions]
    H -->|Cluster OK| K[Check Logs]
```

### Debug Commands

Use the NATS CLI tool for debugging cluster issues.

```bash
# Install NATS CLI
curl -L https://github.com/nats-io/natscli/releases/download/v0.1.1/nats-0.1.1-linux-amd64.zip -o nats-cli.zip
unzip nats-cli.zip
sudo mv nats /usr/local/bin/

# Check cluster status
nats server list -s nats://nats-1.example.com:4222

# View cluster connections
nats server report connections -s nats://nats-1.example.com:4222

# Check JetStream cluster status
nats server report jetstream -s nats://nats-1.example.com:4222

# Test publish and subscribe
nats pub test.subject "Hello NATS" -s nats://nats-1.example.com:4222
nats sub test.subject -s nats://nats-1.example.com:4222
```

### Log Analysis

Configure detailed logging for troubleshooting.

```hcl
# /etc/nats/nats-debug.conf
server_name: nats-1

port: 4222
http_port: 8222

# Enable debug and trace logging
debug: true
trace: true
logtime: true
log_file: /var/log/nats/nats-server.log

# Log to stdout for container environments
# log_file: ""

cluster {
    name: my-nats-cluster
    port: 6222
    routes: [
        nats-route://nats-2.example.com:6222
        nats-route://nats-3.example.com:6222
    ]
}
```

## Best Practices

### Production Recommendations

1. **Deploy at least 3 nodes** - Maintain quorum for JetStream and avoid split-brain scenarios
2. **Use dedicated cluster networks** - Separate cluster traffic from client traffic
3. **Enable TLS everywhere** - Encrypt both client and cluster connections
4. **Implement authentication** - Use tokens, NKeys, or JWT for access control
5. **Monitor cluster health** - Set up alerting on connection counts and message rates
6. **Configure proper resource limits** - Set memory and storage limits for JetStream
7. **Plan for disaster recovery** - Implement backup strategies for JetStream data
8. **Use connection pooling** - Reuse connections in high-throughput applications

### Performance Tuning

Optimize NATS server performance for high-throughput workloads.

```hcl
# /etc/nats/nats-performance.conf
server_name: nats-1

port: 4222
http_port: 8222

# Increase maximum connections
max_connections: 100000

# Increase maximum payload size (default is 1MB)
max_payload: 8388608

# Write deadline for client connections
write_deadline: 10s

# Maximum control line size
max_control_line: 4096

# Ping interval for connection health
ping_interval: 2m
ping_max: 2

cluster {
    name: my-nats-cluster
    port: 6222

    # Pool size for cluster connections
    pool_size: 3

    routes: [
        nats-route://nats-2.example.com:6222
        nats-route://nats-3.example.com:6222
    ]
}

jetstream {
    store_dir: /data/jetstream
    max_memory_store: 4Gi
    max_file_store: 100Gi
}
```

---

Running NATS as a cluster provides the foundation for a resilient messaging infrastructure. Start with a three-node cluster for development and testing, then scale horizontally as your messaging needs grow. Remember to secure your cluster with TLS and authentication, monitor performance metrics, and test failover scenarios regularly to ensure your messaging system can handle production workloads.
