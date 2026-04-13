# How to Set Up Atlas Data Federation to Query S3 Data in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Data Federation, S3, AWS

Description: Learn how to configure MongoDB Atlas Data Federation to query data stored in AWS S3 buckets using standard MongoDB query syntax.

---

## What Is Atlas Data Federation?

Atlas Data Federation lets you query data across MongoDB Atlas clusters, AWS S3 buckets, HTTP endpoints, and Atlas Data Lake stores using standard MongoDB query language. You don't need to move or transform your data - you query it in place.

This is especially useful for querying archived JSON, BSON, Parquet, CSV, or Avro files in S3 alongside live operational data.

## Prerequisites

- MongoDB Atlas account (any tier)
- AWS account with S3 bucket containing data
- AWS IAM role with S3 read permissions

## Step 1: Create an AWS IAM Role for Atlas

Atlas needs permission to access your S3 bucket. Create an IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::my-data-bucket",
        "arn:aws:s3:::my-data-bucket/*"
      ]
    }
  ]
}
```

Create an IAM role and attach this policy, then configure the trust relationship with the Atlas AWS account ID (provided in the Atlas UI during setup).

## Step 2: Add the AWS IAM Role in Atlas

1. In Atlas, go to **Security > Integrations > AWS IAM Roles**
2. Click **Add an AWS IAM Role**
3. Choose "Authorize an IAM Role" and follow the trust relationship instructions
4. Copy the Atlas AWS Account ID and External ID provided
5. Update your IAM role's trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ATLAS_ACCOUNT_ID:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "YOUR_EXTERNAL_ID"
        }
      }
    }
  ]
}
```

## Step 3: Create a Federated Database Instance

In Atlas, go to **Data Federation** and click **Create a Federated Database**:

1. Select your authorized AWS IAM role
2. Choose AWS S3 as the data source
3. Enter your S3 bucket name and optional path prefix
4. Configure the virtual namespace mapping

```text
Virtual Namespace: myFederatedDB.logs
S3 Path: s3://my-data-bucket/logs/*.json
```

## Step 4: Configure Data Stores via Atlas CLI or API

Using the Atlas Administration API:

```bash
curl --user "publicKey:privateKey" --digest \
  --header "Content-Type: application/json" \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/dataFederation" \
  --data '{
    "name": "myFederatedDB",
    "dataProcessRegion": {
      "cloudProvider": "AWS",
      "region": "US_EAST_1"
    },
    "storage": {
      "databases": [
        {
          "name": "logs",
          "collections": [
            {
              "name": "access_logs",
              "dataSources": [
                {
                  "storeName": "myS3Store",
                  "path": "/logs/2024/{date}/*.json",
                  "defaultFormat": ".json"
                }
              ]
            }
          ]
        }
      ],
      "stores": [
        {
          "name": "myS3Store",
          "provider": "s3",
          "region": "us-east-1",
          "bucket": "my-data-bucket",
          "delimiter": "/",
          "prefix": "logs"
        }
      ]
    }
  }'
```

## Step 5: Connect and Query

Connect to the federated database endpoint using mongosh:

```bash
mongosh "mongodb+srv://myFederatedDB.example.mongodb.net/logs" \
  --username myUser --password myPassword
```

Then run standard MongoDB queries:

```javascript
// Count log entries for a date range
db.access_logs.countDocuments({
  date: { $gte: "2024-01-01", $lte: "2024-01-31" }
})

// Aggregate by HTTP status
db.access_logs.aggregate([
  { $match: { date: "2024-01-15" } },
  { $group: { _id: "$status_code", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

## Step 6: Partition Optimization with Path Partitioning

Organize S3 files in a partitioned layout to dramatically improve query performance:

```text
s3://my-data-bucket/logs/year=2024/month=01/day=15/part-001.json
s3://my-data-bucket/logs/year=2024/month=01/day=15/part-002.json
```

Map this structure in the Data Federation config:

```json
{
  "path": "/logs/year={year}/month={month}/day={day}/*.json",
  "defaultFormat": ".json"
}
```

Now queries with date filters skip irrelevant S3 files entirely.

## Step 7: Join S3 Data with Atlas Collections

One of the most powerful features is querying S3 alongside live Atlas data:

```javascript
db.access_logs.aggregate([
  {
    $lookup: {
      from: "users",           // Atlas collection
      localField: "user_id",
      foreignField: "_id",
      as: "user_details"
    }
  },
  { $unwind: "$user_details" },
  {
    $project: {
      date: 1,
      endpoint: 1,
      "user_details.email": 1
    }
  }
])
```

## Summary

Atlas Data Federation lets you query S3-hosted data with MongoDB's query language by creating a federated database instance that maps S3 paths to virtual collections. Configure an IAM role for access, define storage mappings with optional path partitioning for performance, then connect with any MongoDB driver to run queries, aggregations, and even joins between S3 data and live Atlas collections.
