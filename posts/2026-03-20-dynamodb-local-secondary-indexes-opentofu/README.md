# How to Configure DynamoDB Local Secondary Indexes with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, DynamoDB, Local Secondary Indexes, LSI, Query, Infrastructure as Code

Description: Learn how to configure DynamoDB Local Secondary Indexes (LSIs) with OpenTofu to enable alternative sort key queries within the same partition key space.

## Introduction

DynamoDB Local Secondary Indexes (LSIs) share the same partition key as the base table but provide alternative sort keys for querying within a partition. Unlike GSIs, LSIs support strongly consistent reads, must be defined at table creation time (cannot be added later), and consume the base table's capacity. You can have up to 5 LSIs per table, and they're ideal when you need multiple sort orders for the same partition key.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with DynamoDB permissions

## Step 1: Create Table with LSI

```hcl
resource "aws_dynamodb_table" "user_activity" {
  name         = "${var.project_name}-user-activity"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"   # Partition key - same for table and all LSIs
  range_key    = "activityId"  # Primary sort key

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "activityId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  attribute {
    name = "activityType"
    type = "S"
  }

  # LSI: Sort user activities by timestamp
  local_secondary_index {
    name            = "UserActivityByTime"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  # LSI: Sort user activities by type
  local_secondary_index {
    name            = "UserActivityByType"
    range_key       = "activityType"
    projection_type = "INCLUDE"
    non_key_attributes = ["timestamp", "details"]
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = "${var.project_name}-user-activity"
  }
}
```

## Step 2: Deploy

```bash
tofu init
tofu plan
tofu apply

# Query using LSI - get user activities sorted by timestamp

aws dynamodb query \
  --table-name <table-name> \
  --index-name UserActivityByTime \
  --key-condition-expression "userId = :uid AND #ts BETWEEN :start AND :end" \
  --expression-attribute-names '{"#ts": "timestamp"}' \
  --expression-attribute-values '{":uid": {"S": "USER-001"}, ":start": {"N": "1700000000"}, ":end": {"N": "1700100000"}}' \
  --scan-index-forward false  # Descending order
```

## Conclusion

LSIs must be defined at table creation-unlike GSIs they cannot be added afterward, making schema design more critical upfront. LSIs support strongly consistent reads when you set `ConsistentRead` to true, making them preferable over GSIs when strong consistency is required. The 10 GB item collection limit per partition key applies to the total size of all items across the table and all its LSIs with that partition key-monitor item collection sizes to avoid `ItemCollectionSizeLimitExceededException` errors.
