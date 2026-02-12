# How to Set Up Amazon Redshift Serverless

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Redshift, Data Warehouse, Serverless

Description: Learn how to set up Amazon Redshift Serverless for on-demand analytics without managing clusters, including configuration, data loading, and cost optimization.

---

Traditional Redshift requires you to pick a cluster size, manage scaling, and pay whether you're running queries or not. Redshift Serverless removes all of that. You get the same Redshift engine, the same SQL compatibility, but without provisioning or managing any infrastructure. You pay only for the compute you actually use, measured in Redshift Processing Units (RPUs).

## When to Use Redshift Serverless

Redshift Serverless makes sense when:
- Your query workload is unpredictable or bursty
- You don't want to manage cluster sizing and scaling
- You have development or testing workloads that don't run 24/7
- You're getting started with Redshift and want to skip the operational overhead

For steady, predictable workloads running all day, a provisioned cluster might still be cheaper. But for most other scenarios, serverless is the easier choice.

## Creating a Namespace and Workgroup

Redshift Serverless uses two concepts:
- **Namespace** - Your databases, schemas, tables, and users. This is the storage layer.
- **Workgroup** - The compute layer. This is where RPU capacity and network settings live.

Create a namespace and workgroup:

```bash
# Create a namespace (storage layer)
aws redshift-serverless create-namespace \
  --namespace-name analytics \
  --admin-username admin \
  --admin-user-password 'YourSecurePassword123!' \
  --db-name analytics_db \
  --default-iam-role-arn arn:aws:iam::123456789012:role/RedshiftServerlessRole

# Create a workgroup (compute layer)
aws redshift-serverless create-workgroup \
  --workgroup-name analytics-workgroup \
  --namespace-name analytics \
  --base-capacity 32 \
  --enhanced-vpc-routing \
  --subnet-ids subnet-0aaa111 subnet-0bbb222 subnet-0ccc333 \
  --security-group-ids sg-0abc123
```

The `base-capacity` is in RPUs. The minimum is 8, and it scales in increments of 8. You only pay for what you use - if no queries are running, you pay nothing for compute.

## CloudFormation Setup

Deploy everything with CloudFormation:

```yaml
Resources:
  RedshiftServerlessNamespace:
    Type: AWS::RedshiftServerless::Namespace
    Properties:
      NamespaceName: analytics
      AdminUsername: admin
      AdminUserPassword: !Ref AdminPassword
      DbName: analytics_db
      DefaultIamRoleArn: !GetAtt RedshiftRole.Arn
      IamRoles:
        - !GetAtt RedshiftRole.Arn

  RedshiftServerlessWorkgroup:
    Type: AWS::RedshiftServerless::Workgroup
    Properties:
      WorkgroupName: analytics-workgroup
      NamespaceName: !Ref RedshiftServerlessNamespace
      BaseCapacity: 32
      EnhancedVpcRouting: true
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2
        - !Ref PrivateSubnet3
      SecurityGroupIds:
        - !Ref RedshiftSecurityGroup
      PubliclyAccessible: false

  RedshiftRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              Service: redshift.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
        - arn:aws:iam::aws:policy/AmazonRedshiftAllCommandsFullAccess

  RedshiftSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Redshift Serverless Security Group
      VpcId: !Ref VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 5439
          ToPort: 5439
          CidrIp: 10.0.0.0/16

Outputs:
  Endpoint:
    Value: !GetAtt RedshiftServerlessWorkgroup.Workgroup.Endpoint.Address
  Port:
    Value: !GetAtt RedshiftServerlessWorkgroup.Workgroup.Endpoint.Port
```

## Connecting to Redshift Serverless

Connect using any Postgres-compatible client or driver. The endpoint looks like a standard Redshift endpoint.

Connect with psql or Python:

```bash
# Connect with psql
psql -h analytics-workgroup.123456789012.us-east-1.redshift-serverless.amazonaws.com \
  -p 5439 \
  -U admin \
  -d analytics_db
```

```python
import redshift_connector

# Connect using the Redshift Python connector
conn = redshift_connector.connect(
    host="analytics-workgroup.123456789012.us-east-1.redshift-serverless.amazonaws.com",
    port=5439,
    database="analytics_db",
    user="admin",
    password="YourSecurePassword123!",
)

cursor = conn.cursor()
cursor.execute("SELECT current_user, current_database()")
print(cursor.fetchone())
```

## Creating Your First Tables

Set up your schema with standard Redshift DDL:

```sql
-- Create a schema for your analytics data
CREATE SCHEMA IF NOT EXISTS sales;

-- Create a fact table with distribution and sort keys
CREATE TABLE sales.orders (
    order_id        BIGINT IDENTITY(1,1),
    order_date      DATE NOT NULL,
    customer_id     INTEGER NOT NULL,
    product_id      INTEGER NOT NULL,
    quantity         INTEGER NOT NULL,
    unit_price      DECIMAL(10,2) NOT NULL,
    total_amount    DECIMAL(12,2) NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending',
    created_at      TIMESTAMP DEFAULT GETDATE()
)
DISTKEY(customer_id)
SORTKEY(order_date);

-- Create a dimension table
CREATE TABLE sales.customers (
    customer_id     INTEGER NOT NULL,
    name            VARCHAR(200) NOT NULL,
    email           VARCHAR(200),
    city            VARCHAR(100),
    state           VARCHAR(50),
    country         VARCHAR(50) DEFAULT 'US',
    segment         VARCHAR(50),
    created_at      TIMESTAMP DEFAULT GETDATE(),
    PRIMARY KEY (customer_id)
)
DISTSTYLE ALL;  -- Small dimension tables should be distributed to all nodes

-- Create a products dimension
CREATE TABLE sales.products (
    product_id      INTEGER NOT NULL,
    name            VARCHAR(200) NOT NULL,
    category        VARCHAR(100),
    subcategory     VARCHAR(100),
    price           DECIMAL(10,2),
    PRIMARY KEY (product_id)
)
DISTSTYLE ALL;
```

## Loading Data from S3

The COPY command is the fastest way to load data into Redshift. It reads files from S3 in parallel.

Load CSV data from S3:

```sql
-- Load orders from CSV files in S3
COPY sales.orders (order_date, customer_id, product_id, quantity, unit_price, total_amount, status)
FROM 's3://my-data-lake/raw/orders/'
IAM_ROLE 'arn:aws:iam::123456789012:role/RedshiftServerlessRole'
CSV
IGNOREHEADER 1
DATEFORMAT 'YYYY-MM-DD'
TIMEFORMAT 'YYYY-MM-DD HH:MI:SS'
REGION 'us-east-1';

-- Load Parquet data (more efficient)
COPY sales.orders
FROM 's3://my-data-lake/parquet/orders/'
IAM_ROLE 'arn:aws:iam::123456789012:role/RedshiftServerlessRole'
FORMAT AS PARQUET;

-- Check for load errors
SELECT * FROM stl_load_errors ORDER BY starttime DESC LIMIT 10;
```

## Setting RPU Limits

Control costs by setting maximum RPU capacity:

```bash
# Set maximum RPU capacity
aws redshift-serverless update-workgroup \
  --workgroup-name analytics-workgroup \
  --max-capacity 128

# Set a usage limit (total RPU-hours per day)
aws redshift-serverless create-usage-limit \
  --resource-arn arn:aws:redshift-serverless:us-east-1:123456789012:workgroup/analytics-workgroup \
  --usage-type serverless-compute \
  --amount 60 \
  --period daily \
  --breach-action deactivate
```

The usage limit is especially important for cost control. If your daily limit is 60 RPU-hours and you hit it, the workgroup deactivates until the next day. You can also set it to `log` instead of `deactivate` to get a warning without stopping queries.

## Querying Your Data

Run analytics queries just like you would on provisioned Redshift:

```sql
-- Daily sales summary
SELECT
    o.order_date,
    p.category,
    COUNT(*) as order_count,
    SUM(o.total_amount) as total_revenue,
    AVG(o.total_amount) as avg_order_value
FROM sales.orders o
JOIN sales.products p ON o.product_id = p.product_id
WHERE o.order_date >= DATEADD(day, -30, CURRENT_DATE)
GROUP BY o.order_date, p.category
ORDER BY o.order_date DESC, total_revenue DESC;

-- Customer segmentation
SELECT
    c.segment,
    COUNT(DISTINCT c.customer_id) as customers,
    COUNT(o.order_id) as total_orders,
    SUM(o.total_amount) as total_revenue,
    SUM(o.total_amount) / COUNT(DISTINCT c.customer_id) as revenue_per_customer
FROM sales.customers c
LEFT JOIN sales.orders o ON c.customer_id = o.customer_id
GROUP BY c.segment
ORDER BY revenue_per_customer DESC;
```

## Scheduled Queries and Data Loading

Use Redshift's built-in scheduler or EventBridge to run queries on a schedule:

```bash
# Create a scheduled query using Redshift Data API
aws redshift-data execute-statement \
  --workgroup-name analytics-workgroup \
  --database analytics_db \
  --sql "CALL refresh_materialized_views()"

# Use EventBridge to schedule regular data loads
aws events put-rule \
  --name "daily-data-load" \
  --schedule-expression "cron(0 2 * * ? *)" \
  --state ENABLED

aws events put-targets \
  --rule "daily-data-load" \
  --targets '[{
    "Id": "redshift-load",
    "Arn": "arn:aws:lambda:us-east-1:123456789012:function:trigger-data-load",
    "Input": "{\"source\": \"s3://my-data-lake/daily/\"}"
  }]'
```

## Monitoring and Cost Tracking

Keep an eye on your Redshift Serverless costs and performance:

```bash
# Check current workgroup status and RPU usage
aws redshift-serverless get-workgroup \
  --workgroup-name analytics-workgroup \
  --query 'workgroup.{Status:status,BaseCapacity:baseCapacity,Endpoint:endpoint.address}'

# List usage limits and current consumption
aws redshift-serverless list-usage-limits \
  --resource-arn arn:aws:redshift-serverless:us-east-1:123456789012:workgroup/analytics-workgroup
```

For dashboards and alerts on your Redshift Serverless performance, check out our post on [data warehouse monitoring](https://oneuptime.com/blog/post/aws-cloudwatch-dashboards/view).

## Wrapping Up

Redshift Serverless gives you a fully managed data warehouse that scales to zero when idle. No cluster sizing decisions, no scaling policies to tune, no paying for idle compute. Set up your namespace and workgroup, load your data with COPY, and start querying. The main thing to watch is cost - set RPU limits and usage limits early so a runaway query doesn't surprise you at the end of the month.
