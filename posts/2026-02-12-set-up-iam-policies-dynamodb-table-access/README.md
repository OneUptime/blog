# How to Set Up IAM Policies for DynamoDB Table Access

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, DynamoDB, Security

Description: Learn how to create IAM policies for DynamoDB table access, including fine-grained controls for specific tables, attributes, items, and indexes.

---

DynamoDB's IAM integration goes deeper than most AWS services. You can control access not just at the table level, but down to specific items and attributes. This means you can let a user read from one table but only see certain columns, or allow writes to only their own items. It's powerful, but the policy syntax takes some getting used to.

Let's walk through the common patterns from basic table access to fine-grained item-level controls.

## DynamoDB Resource ARNs

DynamoDB has several resource types:

```
Table:    arn:aws:dynamodb:us-east-1:123456789012:table/MyTable
Index:    arn:aws:dynamodb:us-east-1:123456789012:table/MyTable/index/MyIndex
Stream:   arn:aws:dynamodb:us-east-1:123456789012:table/MyTable/stream/*
Backup:   arn:aws:dynamodb:us-east-1:123456789012:table/MyTable/backup/*
```

Each needs to be specified explicitly if you want to grant access to it.

## Basic Read-Only Access

Allow reading from a specific table:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowDynamoDBReadAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:BatchGetItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:DescribeTable"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:123456789012:table/Users",
        "arn:aws:dynamodb:us-east-1:123456789012:table/Users/index/*"
      ]
    }
  ]
}
```

Notice we include both the table and its indexes. Without the index ARN, queries on GSIs and LSIs will fail.

## Read-Write Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowDynamoDBReadWrite",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:BatchGetItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:BatchWriteItem",
        "dynamodb:DescribeTable"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:123456789012:table/Orders",
        "arn:aws:dynamodb:us-east-1:123456789012:table/Orders/index/*"
      ]
    }
  ]
}
```

## Multiple Tables with Different Access Levels

A realistic application usually needs different permissions for different tables:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadWriteOrdersTable",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:123456789012:table/Orders",
        "arn:aws:dynamodb:us-east-1:123456789012:table/Orders/index/*"
      ]
    },
    {
      "Sid": "ReadOnlyUsersTable",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:123456789012:table/Users",
        "arn:aws:dynamodb:us-east-1:123456789012:table/Users/index/*"
      ]
    },
    {
      "Sid": "WriteOnlyAuditLog",
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/AuditLog"
    }
  ]
}
```

## Fine-Grained Access: Item-Level Control

This is where DynamoDB policies get really interesting. You can restrict access to specific items based on the partition key value.

### User Can Only Access Their Own Items

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowAccessOwnItems",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/UserData",
      "Condition": {
        "ForAllValues:StringEquals": {
          "dynamodb:LeadingKeys": ["${aws:userid}"]
        }
      }
    }
  ]
}
```

The `dynamodb:LeadingKeys` condition restricts operations to items where the partition key matches the user's ID. A user with ID `AIDACKCEVSQ6C2EXAMPLE` can only access items with that partition key.

### Practical Example: Multi-Tenant Application

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "TenantIsolation",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/TenantData",
      "Condition": {
        "ForAllValues:StringEquals": {
          "dynamodb:LeadingKeys": ["${aws:PrincipalTag/TenantId}"]
        }
      }
    }
  ]
}
```

This uses session tags (see our guide on [ABAC with session tags](https://oneuptime.com/blog/post/configure-session-tags-attribute-based-access-control/view)) to enforce tenant isolation. Each tenant can only access rows where the partition key matches their tenant ID.

## Fine-Grained Access: Attribute-Level Control

You can also restrict which attributes (columns) a user can see:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RestrictAttributes",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/Employees",
      "Condition": {
        "ForAllValues:StringEquals": {
          "dynamodb:Attributes": [
            "EmployeeId",
            "Name",
            "Department",
            "Title"
          ]
        },
        "StringEqualsIfExists": {
          "dynamodb:Select": "SPECIFIC_ATTRIBUTES"
        }
      }
    }
  ]
}
```

This allows reading the table but only the specified attributes. Sensitive fields like `Salary`, `SSN`, or `HomeAddress` are excluded. The `dynamodb:Select` condition ensures the user must use a `ProjectionExpression` - they can't do `SELECT *`.

## DynamoDB Streams Access

For applications that process DynamoDB Streams (like event-driven architectures):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowStreamRead",
      "Effect": "Allow",
      "Action": [
        "dynamodb:DescribeStream",
        "dynamodb:GetRecords",
        "dynamodb:GetShardIterator",
        "dynamodb:ListStreams"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/Orders/stream/*"
    }
  ]
}
```

## DynamoDB with Lambda

Lambda functions that interact with DynamoDB need specific permissions. Here's a typical execution role policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DynamoDBCRUD",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:123456789012:table/Products",
        "arn:aws:dynamodb:us-east-1:123456789012:table/Products/index/*"
      ]
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:123456789012:*"
    }
  ]
}
```

## Using Terraform

```hcl
# Create an IAM policy for DynamoDB access
resource "aws_iam_policy" "dynamodb_access" {
  name        = "dynamodb-orders-read-write"
  description = "Read/write access to the Orders DynamoDB table"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowTableAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:DescribeTable"
        ]
        Resource = [
          aws_dynamodb_table.orders.arn,
          "${aws_dynamodb_table.orders.arn}/index/*"
        ]
      }
    ]
  })
}

# Attach to a role
resource "aws_iam_role_policy_attachment" "app_dynamodb" {
  role       = aws_iam_role.app_role.name
  policy_arn = aws_iam_policy.dynamodb_access.arn
}
```

## Preventing Table Deletion

Allow full CRUD on items but prevent anyone from deleting the table:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowItemOperations",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/*"
    },
    {
      "Sid": "DenyTableDeletion",
      "Effect": "Deny",
      "Action": [
        "dynamodb:DeleteTable"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/*"
    }
  ]
}
```

## Common Actions Reference

Here's a quick reference for DynamoDB IAM actions:

| Action | What It Does |
|--------|--------------|
| `GetItem` | Read a single item by key |
| `PutItem` | Create or replace an item |
| `UpdateItem` | Modify attributes of an existing item |
| `DeleteItem` | Remove an item |
| `Query` | Find items by partition key (and optionally sort key) |
| `Scan` | Read every item in the table |
| `BatchGetItem` | Read multiple items at once |
| `BatchWriteItem` | Write/delete multiple items at once |
| `DescribeTable` | Get table metadata |
| `CreateTable` | Create a new table |
| `DeleteTable` | Delete a table |
| `UpdateTable` | Modify table settings (capacity, indexes) |

Always use the most specific actions. Granting `dynamodb:*` gives access to table management operations that most applications don't need.

DynamoDB's fine-grained IAM controls are one of its strongest features. Use them to build policies that match your application's actual data access patterns, and you'll have a much stronger security posture than blanket `dynamodb:*` policies.
