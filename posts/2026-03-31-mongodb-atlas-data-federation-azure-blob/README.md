# How to Use Atlas Data Federation with Azure Blob Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Data Federation, Azure

Description: Configure MongoDB Atlas Data Federation to query Azure Blob Storage containers using MQL aggregation pipelines without moving data to MongoDB.

---

Atlas Data Federation supports Azure Blob Storage as a data source alongside S3 and Atlas clusters. This lets you query JSON, CSV, Parquet, and other files stored in Azure Blob using standard MongoDB aggregation - useful if your cloud environment is primarily Azure.

## Prerequisites

- An Azure Blob Storage account and container
- An Azure service principal or access key for the container
- An existing Atlas Federated Database Instance

## Setting Up Azure Blob Credentials in Atlas

In the Atlas UI, navigate to Data Federation - then Private Endpoints / Access Settings. Create a new Azure store credential with:

```javascript
// Data Federation admin CLI (mongosh connected to the FDI)
db.runCommand({
  createStore: "azure-blob-store",
  provider: "azure",
  azure: {
    serviceURL: "https://mystorageaccount.blob.core.windows.net",
    containerName: "my-data-container"
  }
})
```

Credentials (tenant ID, client ID, and client secret) are configured separately in the Atlas UI under Data Federation access settings for the Azure store.

## Storage Configuration for Azure Blob

The storage configuration JSON uses `azure` as the provider:

```json
{
  "databases": [
    {
      "name": "azure_analytics",
      "collections": [
        {
          "name": "clickstream",
          "dataSources": [
            {
              "storeName": "azure-blob",
              "path": "/clickstream/{year}/{month}/{day}/*.json",
              "defaultFormat": ".json"
            }
          ]
        },
        {
          "name": "transactions",
          "dataSources": [
            {
              "storeName": "azure-blob",
              "path": "/transactions/{year}/{month}/*.parquet",
              "defaultFormat": ".parquet"
            }
          ]
        }
      ]
    }
  ],
  "stores": [
    {
      "name": "azure-blob",
      "provider": "azure",
      "region": "eastus",
      "serviceURL": "https://mystorageaccount.blob.core.windows.net",
      "containerName": "my-data-container",
      "delimiter": "/"
    }
  ]
}
```

## Querying Azure Blob Data

Connect to the FDI and query as if the data were in a MongoDB collection:

```javascript
// Connect to FDI
const client = new MongoClient(FDI_CONNECTION_STRING);
const db = client.db("azure_analytics");

// Query Parquet transactions
const results = await db.collection("transactions").aggregate([
  {
    $match: {
      year: "2024",
      month: "03",
      transactionType: "debit"
    }
  },
  {
    $group: {
      _id: "$accountId",
      totalDebited: { $sum: "$amount" },
      transactionCount: { $sum: 1 }
    }
  },
  { $sort: { totalDebited: -1 } },
  { $limit: 50 }
]).toArray();
```

## Supported File Formats

Atlas Data Federation supports these formats from Azure Blob:

```text
.json, .json.gz     - Newline-delimited JSON
.bson, .bson.gz     - BSON
.csv, .tsv          - Delimited text
.parquet            - Apache Parquet
.orc                - Apache ORC
.avro               - Apache Avro
```

## Writing Back to Azure Blob with $out

Export aggregation results back to Azure Blob:

```javascript
db.clickstream.aggregate([
  { $match: { year: "2024", month: "01" } },
  {
    $group: {
      _id: "$pageUrl",
      views: { $sum: 1 },
      uniqueUsers: { $addToSet: "$userId" }
    }
  },
  {
    $addFields: {
      uniqueUserCount: { $size: "$uniqueUsers" }
    }
  },
  {
    $out: {
      azure: {
        serviceURL: "https://mystorageaccount.blob.core.windows.net",
        containerName: "reports",
        filename: "page-views/{yyyy}/{mm}/report",
        format: { name: "json" }
      }
    }
  }
])
```

## Cross-Provider Queries

Combine Azure Blob and Atlas cluster in one pipeline:

```javascript
db.clickstream.aggregate([
  { $match: { year: "2024" } },
  {
    $lookup: {
      from: "users",          // Atlas cluster collection
      localField: "userId",
      foreignField: "_id",
      as: "userProfile"
    }
  },
  { $unwind: { path: "$userProfile", preserveNullAndEmptyArrays: true } },
  { $project: { pageUrl: 1, "userProfile.country": 1, "userProfile.plan": 1 } }
])
```

## Summary

Atlas Data Federation supports Azure Blob Storage with the same MQL interface used for S3 and Atlas collections. Configure an Azure store with service principal credentials, map blob paths to virtual collections with partition field extraction, and query using standard aggregation pipelines. You can also write results back to Azure Blob using the `$out` stage with an Azure target specification.
