# How to Use Atlas CLI for Local Development with Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, CLI, Development, Local

Description: Learn how to use the Atlas CLI to run a local Atlas instance, connect applications, and mirror production Atlas configuration during development.

---

## Local Development with Atlas CLI

The Atlas CLI includes `atlas deployments` commands that let you run a local MongoDB instance - including Atlas Search - without a cloud cluster. This is ideal for fast feedback loops, offline development, and cost-free testing.

## Starting a Local Deployment

```bash
atlas deployments setup
```

This interactive wizard creates a local MongoDB deployment using Docker. It asks for a name, port, and whether to enable Atlas Search.

For a fully non-interactive setup:

```bash
atlas deployments setup localDev \
  --type local \
  --port 27017 \
  --force
```

## Listing Local Deployments

```bash
atlas deployments list
```

## Starting and Stopping

```bash
atlas deployments start localDev
atlas deployments pause localDev
atlas deployments delete localDev --force
```

## Connecting to a Local Deployment

Get the connection string:

```bash
atlas deployments connect localDev --connectWith connectionString
```

Open the MongoDB Shell directly:

```bash
atlas deployments connect localDev --connectWith mongosh
```

Typical connection string for local development:

```text
mongodb://localhost:27017/?directConnection=true
```

Use it in your `.env` file:

```text
MONGODB_URI=mongodb://localhost:27017/myapp?directConnection=true
```

## Seeding Data for Development

After connecting, create indexes and seed initial data:

```javascript
// seed.js
const { MongoClient } = require("mongodb");

const client = new MongoClient("mongodb://localhost:27017");

async function seed() {
  const db = client.db("myapp");
  await db.collection("products").insertMany([
    { name: "Widget A", price: 9.99, category: "widgets" },
    { name: "Widget B", price: 14.99, category: "widgets" },
    { name: "Gadget X", price: 49.99, category: "gadgets" }
  ]);
  console.log("Seeded successfully");
  await client.close();
}

seed();
```

```bash
node seed.js
```

## Creating Local Search Indexes

Atlas Search works in local deployments too:

```bash
atlas deployments search indexes create \
  --deploymentName localDev \
  --file search-index.json
```

This lets you develop and test full-text search queries without a cloud cluster.

## Mirroring Production Configuration

Export your production cluster users and apply them locally for integration testing:

```bash
# Export production users
atlas dbusers list --output json > prod-users.json

# Create matching users locally (adapt for local auth)
atlas deployments setup localDev --type local
```

For consistent index configuration, keep your search index JSON files in source control and apply them to both local and production deployments:

```bash
#!/bin/bash
TARGET=${1:-localDev}
TYPE=${2:-local}

if [ "$TYPE" = "local" ]; then
  atlas deployments search indexes create \
    --deploymentName "$TARGET" \
    --file indexes/products.json
else
  atlas clusters search indexes create \
    --clusterName "$TARGET" \
    --file indexes/products.json
fi
```

## Connecting Compass to a Local Deployment

```bash
atlas deployments connect localDev --connectWith compass
```

This opens MongoDB Compass with the local connection string pre-filled.

## Checking Local Deployment Status

```bash
atlas deployments list
```

## Summary

`atlas deployments` brings the Atlas experience to your local machine. Start a local deployment, use the same connection string format as Atlas, apply search indexes from your repository, and connect with Compass or mongosh - all without an internet connection or a cloud cluster. This keeps development fast and cost-free while staying compatible with production Atlas.
