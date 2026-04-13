# How to Set Up Atlas Flex Clusters for Low-Traffic Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Flex Cluster, Cloud, Serverless

Description: Configure MongoDB Atlas Flex clusters for low-traffic or development workloads with automatic scaling, minimal idle cost, and simple setup steps.

---

## Overview

Atlas Flex clusters are MongoDB Atlas's replacement for the legacy shared-tier M2 and M5 clusters. They are designed for low-traffic workloads like development environments, staging, and early-stage applications. Flex clusters scale storage automatically, charge only for what you use, and support replica sets - making them a practical step up from free-tier clusters without the cost of a dedicated M10.

## What Are Flex Clusters?

Flex clusters sit between the free M0 cluster and dedicated M10+ clusters in the Atlas hierarchy:

- No fixed compute reservation - you pay for operations and storage used
- Up to 5 GB storage included, with usage-based billing beyond that
- Supports most MongoDB features: transactions, aggregation, indexes
- No dedicated RAM or vCPU guarantee - throughput scales with demand
- Available in most AWS, Azure, and GCP regions

## Creating a Flex Cluster via the Atlas UI

1. Log in to cloud.mongodb.com and select your organization and project.
2. Click "Create" -> "Database".
3. Select "Flex" as the cluster tier.
4. Choose your preferred cloud provider and region.
5. Name the cluster and click "Create".

The cluster is ready in about two minutes.

## Creating a Flex Cluster via the Atlas CLI

```bash
# Install the Atlas CLI
brew install mongodb-atlas-cli

# Authenticate
atlas auth login

# Create a Flex cluster
atlas clusters create my-flex-cluster \
  --tier FLEX \
  --provider AWS \
  --region US_EAST_1 \
  --projectId <PROJECT_ID>

# Check cluster status
atlas clusters describe my-flex-cluster --projectId <PROJECT_ID>
```

## Creating a Flex Cluster via the Atlas API

```bash
curl -X POST \
  "https://cloud.mongodb.com/api/atlas/v2/groups/${PROJECT_ID}/flexClusters" \
  -H "Content-Type: application/vnd.atlas.2024-11-13+json" \
  --digest -u "${PUBLIC_KEY}:${PRIVATE_KEY}" \
  -d '{
    "name": "my-flex-cluster",
    "providerSettings": {
      "backingProviderName": "AWS",
      "regionName": "US_EAST_1"
    }
  }'
```

## Connecting to a Flex Cluster

Once created, get the connection string from the Atlas UI under "Connect" -> "Drivers".

```javascript
const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://<user>:<password>@my-flex-cluster.abc123.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000,
  maxPoolSize: 5,
});

async function run() {
  await client.connect();
  const db = client.db("myapp");
  await db.collection("ping").insertOne({ ts: new Date() });
  console.log("Connected to Flex cluster");
}

run().catch(console.error).finally(() => client.close());
```

## Flex Cluster Limitations

```text
- No dedicated compute: throughput is limited for high-concurrency workloads
- No auto-pause: Flex clusters do not pause when idle (unlike M0)
- Connection limit: lower than dedicated clusters (500 connections max)
- No cross-region failover
- No custom MongoDB version selection
```

## Summary

Atlas Flex clusters provide a cost-effective, auto-scaling MongoDB deployment for development, staging, and low-traffic production workloads. Create them in minutes using the Atlas UI, CLI, or REST API, connect with the standard MongoDB driver, and migrate to a dedicated M10+ cluster when your workload requires guaranteed compute resources or higher connection limits.
