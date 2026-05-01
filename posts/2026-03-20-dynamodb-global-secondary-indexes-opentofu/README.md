# How to Configure DynamoDB Global Secondary Indexes with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, DynamoDB, Global Secondary Indexes, GSI, Query Performance, Infrastructure as Code

Description: Learn how to configure DynamoDB Global Secondary Indexes (GSIs) with OpenTofu to enable efficient queries on non-primary-key attributes without table scans.

## Introduction

DynamoDB Global Secondary Indexes (GSIs) allow you to query data using attributes other than the table's primary key. A GSI has its own partition key and optional sort key, and can include projected attributes from the base table. You can add up to 20 GSIs per table by default. GSIs use the same capacity mode as the base table, and on provisioned tables each GSI can have its own read/write capacity settings. Queries against GSIs are eventually consistent only, and DynamoDB replicates data to them asynchronously from the base table.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with DynamoDB permissions

## Step 1: Create Table with GSI

```hcl
resource "aws_dynamodb_table" "orders" {
  name         = "${var.project_name}-orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "orderId"
  range_key    = "createdAt"

  attribute {
    name = "orderId"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  attribute {
    name = "customerId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  # GSI: Query orders by customer
  global_secondary_index {
    name = "CustomerOrders"
    key_schema {
      attribute_name = "customerId"
      key_type       = "HASH"
    }
    key_schema {
      attribute_name = "createdAt"
      key_type       = "RANGE"
    }
    projection_type = "ALL"  # ALL, KEYS_ONLY, or INCLUDE
  }

  # GSI: Query orders by status
  global_secondary_index {
    name = "OrdersByStatus"
    key_schema {
      attribute_name = "status"
      key_type       = "HASH"
    }
    key_schema {
      attribute_name = "createdAt"
      key_type       = "RANGE"
    }
    projection_type    = "INCLUDE"
    non_key_attributes = ["customerId", "totalAmount"]
  }

  tags = {
    Name = "${var.project_name}-orders"
  }
}
```

## Step 2: GSI with Provisioned Capacity

```hcl
resource "aws_dynamodb_table" "products" {
  name           = "${var.project_name}-products"
  billing_mode   = "PROVISIONED"
  read_capacity  = 10
  write_capacity = 5
  hash_key       = "productId"

  attribute {
    name = "productId"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  attribute {
    name = "price"
    type = "N"
  }

  # GSI with separate read/write capacity
  global_secondary_index {
    name = "CategoryPrice"
    key_schema {
      attribute_name = "category"
      key_type       = "HASH"
    }
    key_schema {
      attribute_name = "price"
      key_type       = "RANGE"
    }
    projection_type = "ALL"
    read_capacity   = 5  # Independent capacity from base table
    write_capacity  = 2
  }
}
```

## Step 3: Deploy

```bash
tofu init
tofu plan
tofu apply

# Query using GSI

aws dynamodb query \
  --table-name "myapp-orders" \
  --index-name CustomerOrders \
  --key-condition-expression "customerId = :cid" \
  --expression-attribute-values '{":cid": {"S": "CUST-001"}}'
```

## Conclusion

Choose `projection_type = "ALL"` when you frequently access most attributes from GSI query results; it avoids follow-up reads against the base table but uses the most index storage. Use `INCLUDE` to project only the attributes your queries need, and `KEYS_ONLY` for lookups or counts that only need key attributes. On provisioned tables, GSI updates consume additional write capacity, and in on-demand mode they still increase write cost, because writes that add, change, or remove indexed data also update the GSI. Design your GSI partition keys to distribute load evenly; hot partition keys on GSIs cause the same throttling issues as on base tables.
