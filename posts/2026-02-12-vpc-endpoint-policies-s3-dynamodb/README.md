# How to Set Up VPC Endpoint Policies for S3 and DynamoDB

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, S3, DynamoDB, Security

Description: Configure VPC endpoint policies to restrict which S3 buckets and DynamoDB tables can be accessed through your gateway and interface endpoints.

---

VPC endpoints let your resources access AWS services without going through the internet. That's great for security and cost savings. But by default, a VPC endpoint for S3 allows access to every S3 bucket in every account. Same for DynamoDB - any table, anywhere. That's a wide-open door you probably didn't realize was there.

VPC endpoint policies fix this by adding an authorization layer to the endpoint itself. You can restrict which buckets, tables, accounts, and even IAM principals can use the endpoint. It's an extra security boundary that works alongside your IAM policies and bucket policies. Let's configure them properly.

## Gateway Endpoints vs Interface Endpoints

S3 and DynamoDB support both endpoint types:

**Gateway endpoints** - Free, route-table based. They add a route in your route table that directs traffic to the endpoint. These are the original endpoint type for S3 and DynamoDB.

**Interface endpoints** - Cost money, ENI-based. They create elastic network interfaces in your subnets. These use PrivateLink under the hood.

Both types support endpoint policies. Gateway endpoints are the most common for S3 and DynamoDB because they're free.

## Creating a Gateway Endpoint with a Policy

### S3 Gateway Endpoint

This creates an S3 gateway endpoint with a policy that only allows access to specific buckets:

```bash
# Create S3 gateway endpoint with restrictive policy
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-12345678 \
  --service-name com.amazonaws.us-east-1.s3 \
  --route-table-ids rtb-aaa111 rtb-bbb222 \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "AllowSpecificBuckets",
        "Effect": "Allow",
        "Principal": "*",
        "Action": [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ],
        "Resource": [
          "arn:aws:s3:::my-app-data-bucket",
          "arn:aws:s3:::my-app-data-bucket/*",
          "arn:aws:s3:::my-app-logs-bucket",
          "arn:aws:s3:::my-app-logs-bucket/*"
        ]
      }
    ]
  }'
```

### DynamoDB Gateway Endpoint

This creates a DynamoDB endpoint that only allows access to specific tables:

```bash
# Create DynamoDB gateway endpoint with restrictive policy
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-12345678 \
  --service-name com.amazonaws.us-east-1.dynamodb \
  --route-table-ids rtb-aaa111 rtb-bbb222 \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "AllowSpecificTables",
        "Effect": "Allow",
        "Principal": "*",
        "Action": [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ],
        "Resource": [
          "arn:aws:dynamodb:us-east-1:111111111111:table/users",
          "arn:aws:dynamodb:us-east-1:111111111111:table/users/index/*",
          "arn:aws:dynamodb:us-east-1:111111111111:table/sessions",
          "arn:aws:dynamodb:us-east-1:111111111111:table/sessions/index/*"
        ]
      }
    ]
  }'
```

## Policy Examples

Let's look at several common endpoint policy patterns.

### Restrict to Specific AWS Account

Only allow S3 access to buckets owned by your organization's accounts:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RestrictToOrgAccounts",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "s3:ResourceAccount": [
            "111111111111",
            "222222222222",
            "333333333333"
          ]
        }
      }
    }
  ]
}
```

### Restrict to Organization

Even better, restrict to your entire AWS Organization:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RestrictToOrganization",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:PrincipalOrgID": "o-exampleorgid"
        }
      }
    }
  ]
}
```

### Allow Read-Only Access to Specific Buckets

Useful for subnets that should only read data, never write:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadOnlyAccess",
      "Effect": "Allow",
      "Principal": "*",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::production-data",
        "arn:aws:s3:::production-data/*"
      ]
    }
  ]
}
```

### Restrict by IAM Principal

Limit which IAM roles can use the endpoint:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RestrictToPrincipals",
      "Effect": "Allow",
      "Principal": {
        "AWS": [
          "arn:aws:iam::111111111111:role/AppRole",
          "arn:aws:iam::111111111111:role/BatchProcessorRole"
        ]
      },
      "Action": "s3:*",
      "Resource": "*"
    }
  ]
}
```

### Deny Specific Actions

Block dangerous operations through the endpoint while allowing everything else:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowMost",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": "*"
    },
    {
      "Sid": "DenyDangerousActions",
      "Effect": "Deny",
      "Principal": "*",
      "Action": [
        "s3:DeleteBucket",
        "s3:PutBucketPolicy",
        "s3:PutBucketAcl",
        "s3:PutBucketPublicAccessBlock"
      ],
      "Resource": "*"
    }
  ]
}
```

## Updating Existing Endpoint Policies

If you already have endpoints with the default full-access policy, update them:

```bash
# Update an existing endpoint's policy
aws ec2 modify-vpc-endpoint \
  --vpc-endpoint-id vpce-abc123 \
  --policy-document file://s3-endpoint-policy.json
```

To reset to the default (full access) policy:

```bash
aws ec2 modify-vpc-endpoint \
  --vpc-endpoint-id vpce-abc123 \
  --reset-policy
```

## Terraform Configuration

Here's a complete Terraform setup for both S3 and DynamoDB endpoints with policies:

```hcl
# S3 Gateway Endpoint
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.s3"

  route_table_ids = [
    aws_route_table.private_a.id,
    aws_route_table.private_b.id
  ]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowAppBuckets"
        Effect    = "Allow"
        Principal = "*"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          "arn:aws:s3:::${var.app_bucket}",
          "arn:aws:s3:::${var.app_bucket}/*",
          "arn:aws:s3:::${var.logs_bucket}",
          "arn:aws:s3:::${var.logs_bucket}/*"
        ]
      },
      {
        Sid       = "AllowECRAccess"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "arn:aws:s3:::prod-${var.region}-starport-layer-bucket/*"
      }
    ]
  })

  tags = {
    Name = "s3-gateway-endpoint"
  }
}

# DynamoDB Gateway Endpoint
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.dynamodb"

  route_table_ids = [
    aws_route_table.private_a.id,
    aws_route_table.private_b.id
  ]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowAppTables"
        Effect    = "Allow"
        Principal = "*"
        Action    = "dynamodb:*"
        Resource = [
          "arn:aws:dynamodb:${var.region}:${var.account_id}:table/${var.app_name}-*"
        ]
      }
    ]
  })

  tags = {
    Name = "dynamodb-gateway-endpoint"
  }
}
```

## Combining Endpoint Policies with Bucket Policies

For defense in depth, enforce the VPC endpoint requirement in your bucket policy too. This ensures the bucket can only be accessed through the endpoint.

This bucket policy denies all access that doesn't come through the specified VPC endpoint:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyAccessUnlessFromEndpoint",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::sensitive-data-bucket",
        "arn:aws:s3:::sensitive-data-bucket/*"
      ],
      "Condition": {
        "StringNotEquals": {
          "aws:sourceVpce": "vpce-abc123"
        }
      }
    }
  ]
}
```

## Don't Forget ECR and Package Repositories

A common gotcha: if you restrict the S3 endpoint too tightly, ECR image pulls, yum/apt updates, and other package operations break because they use S3 under the hood.

Make sure your S3 endpoint policy includes access to ECR's S3 buckets:

```json
{
  "Sid": "AllowECRLayers",
  "Effect": "Allow",
  "Principal": "*",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::prod-*-starport-layer-bucket/*"
}
```

## Monitoring

Use CloudTrail to audit endpoint usage. Look for access denied events that might indicate misconfigured policies:

```bash
# Search CloudTrail for endpoint access denied events
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=GetObject \
  --max-results 50 \
  --query 'Events[?contains(CloudTrailEvent, `AccessDenied`)].{Time:EventTime,User:Username}'
```

## Best Practices

**Start restrictive, then widen.** It's safer to start with a narrow policy and add access as needed. The alternative - starting wide and narrowing down - risks missing something.

**Use resource wildcards carefully.** `arn:aws:s3:::my-app-*` is reasonable. `arn:aws:s3:::*` defeats the purpose.

**Test thoroughly before deploying.** Policy changes take effect immediately. A bad endpoint policy can break your entire application's access to S3 or DynamoDB.

**Document your policies.** Use the `Sid` field to explain what each statement does. Future you will be grateful.

For the broader VPC networking picture, check out our guide on [AWS PrivateLink for private API access](https://oneuptime.com/blog/post/aws-privatelink-private-api-access/view). Monitor your endpoint performance and data transfer with [OneUptime](https://oneuptime.com) to catch issues before they impact your applications.
