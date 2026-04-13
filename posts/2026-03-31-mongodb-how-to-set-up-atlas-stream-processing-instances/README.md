# How to Set Up Atlas Stream Processing Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Stream Processing, Real-Time, Event Streaming

Description: Learn how to create and configure MongoDB Atlas Stream Processing instances to build real-time data pipelines with the Atlas UI and CLI.

---

## What Is Atlas Stream Processing?

MongoDB Atlas Stream Processing allows you to define aggregation-style pipelines that process continuous streams of data in real time. It integrates natively with Kafka topics and Atlas collections, enabling you to filter, transform, enrich, and aggregate streaming data without maintaining separate infrastructure.

Key components:
- **Stream Processing Instance (SPI)** - the compute resource that runs pipelines
- **Connections** - links to Kafka brokers or Atlas collections
- **Stream Processors** - named pipelines that run continuously

## Prerequisites

```text
- Atlas account with M10+ cluster (stream processing requires a dedicated cluster)
- Atlas CLI installed (brew install mongodb-atlas, or see official install docs)
- A Kafka cluster or Atlas collection as a data source
```

## Creating an Instance via the Atlas UI

1. Log in to cloud.mongodb.com
2. Navigate to your project
3. Click **Stream Processing** in the left sidebar
4. Click **Create Stream Processing Instance**
5. Choose:
   - Instance name (e.g., `prod-stream-processor`)
   - Cloud provider and region (match your Atlas cluster region)
   - Instance tier (SP10, SP30, SP100)
6. Click **Create**

## Creating an Instance via Atlas CLI

```bash
# Login to Atlas
atlas auth login

# Create a stream processing instance
atlas streams instances create prod-stream-processor \
  --provider AWS \
  --region VIRGINIA_USA \
  --tier SP10

# List instances
atlas streams instances list

# Describe an instance
atlas streams instances describe prod-stream-processor
```

## Adding a Kafka Connection

Stream processors need connections to data sources:

```bash
# Create a Kafka connection configuration file
cat > kafka-connection.json << 'EOF'
{
  "name": "prod-kafka",
  "type": "Kafka",
  "bootstrapServers": "broker1.kafka.example.com:9092,broker2.kafka.example.com:9092",
  "authentication": {
    "mechanism": "SCRAM-512",
    "username": "kafka-user",
    "password": "kafka-password"
  },
  "security": {
    "protocol": "SASL_SSL"
  }
}
EOF

# Add the connection to your instance
atlas streams connections create \
  --instance prod-stream-processor \
  --file kafka-connection.json
```

## Adding an Atlas Connection

To use an Atlas collection as a source or sink:

```bash
cat > atlas-connection.json << 'EOF'
{
  "name": "prod-atlas",
  "type": "Cluster",
  "clusterName": "ProdCluster",
  "dbRoleToExecute": {
    "role": "atlasAdmin",
    "type": "BUILT_IN"
  }
}
EOF

atlas streams connections create \
  --instance prod-stream-processor \
  --file atlas-connection.json
```

## Connecting to the Stream Processing Instance

Use `mongosh` to connect to and manage your stream processing instance:

```bash
# Get the connection string from Atlas UI or CLI
atlas streams instances describe prod-stream-processor --output json

# Connect with mongosh
mongosh "mongodb://stream.mongodb.net/?directConnection=true" \
  --username <atlas-username> \
  --password <atlas-password>
```

## Verifying Connections

Once connected with `mongosh`:

```javascript
// List available connections
sp.listConnections()

// List all stream processors on this instance
sp.listStreamProcessors()
```

## Instance Tiers and Scaling

```text
SP10  - 4 vCPU, 16 GB RAM - dev/test workloads
SP30  - 8 vCPU, 32 GB RAM - moderate production
SP100 - 32 vCPU, 128 GB RAM - high-throughput production
```

To change the tier, you must create a new instance with the desired tier, as the tier cannot be modified after creation.

## Monitoring and Logs

```bash
# Download audit logs for the stream processing instance
atlas streams instances download prod-stream-processor \
  --out stream-logs.gz

# View instance metrics in Atlas UI:
# Stream Processing > your instance > Metrics tab
```

You can also view stream processor statistics from `mongosh`:

```javascript
// Get stats for a specific processor
sp.my_pipeline.stats()
```

## Summary

MongoDB Atlas Stream Processing instances provide managed compute for real-time data pipelines. Create instances via the Atlas UI or CLI, add connections to Kafka brokers or Atlas clusters, then connect with `mongosh` to define and manage stream processors. Choose the instance tier based on your throughput requirements and monitor pipeline performance through Atlas metrics and log access.
