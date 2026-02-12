# How to Implement Database Security Best Practices on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Database, RDS, DynamoDB, Security

Description: A complete guide to securing databases on AWS including network isolation, encryption, access control, auditing, and automated security monitoring for RDS and DynamoDB.

---

Your database holds your most valuable asset - your data. And it's usually the primary target in any breach. A misconfigured security group, an overly broad IAM policy, or a missing encryption setting can expose customer records, financial data, or intellectual property. On AWS, database security isn't a single switch you flip. It's a combination of network controls, encryption, access management, auditing, and monitoring that work together.

Let's go through each layer systematically.

## Network Isolation

Your databases should never be directly accessible from the internet. Put them in private subnets with no route to an internet gateway.

This Terraform configuration creates a properly isolated database network.

```hcl
# Private subnets for databases - no internet access
resource "aws_subnet" "db_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.10.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = false

  tags = { Name = "db-subnet-a" }
}

resource "aws_subnet" "db_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.11.0/24"
  availability_zone       = "us-east-1b"
  map_public_ip_on_launch = false

  tags = { Name = "db-subnet-b" }
}

# Route table with NO internet route
resource "aws_route_table" "db" {
  vpc_id = aws_vpc.main.id

  # Only local VPC route - no NAT gateway, no internet gateway
  tags = { Name = "db-route-table" }
}

resource "aws_route_table_association" "db_a" {
  subnet_id      = aws_subnet.db_a.id
  route_table_id = aws_route_table.db.id
}

resource "aws_route_table_association" "db_b" {
  subnet_id      = aws_subnet.db_b.id
  route_table_id = aws_route_table.db.id
}

# DB subnet group
resource "aws_db_subnet_group" "main" {
  name       = "database-subnets"
  subnet_ids = [aws_subnet.db_a.id, aws_subnet.db_b.id]
}

# Security group that only allows traffic from the application layer
resource "aws_security_group" "database" {
  name_prefix = "database-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.application.id]
    description     = "PostgreSQL from application layer only"
  }

  # No egress rules needed for most databases
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = []  # No outbound access
    description = "No outbound access"
  }
}
```

By giving the database subnets no route to the internet and restricting the security group to only accept connections from the application security group, you've created strong network isolation.

## Encryption at Rest and in Transit

Every database on AWS should be encrypted. Period.

Here's a complete RDS configuration with encryption and forced SSL.

```hcl
resource "aws_db_instance" "production" {
  identifier     = "production-postgres"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"

  allocated_storage     = 100
  max_allocated_storage = 500  # Auto-scaling storage

  # Encryption at rest
  storage_encrypted = true
  kms_key_id        = aws_kms_key.database.arn

  # Network isolation
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false

  # Force SSL connections
  parameter_group_name = aws_db_parameter_group.force_ssl.name

  # Backup configuration
  backup_retention_period = 35
  backup_window           = "03:00-04:00"
  copy_tags_to_snapshot   = true

  # Enable enhanced monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  # Enable Performance Insights
  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.database.arn
  performance_insights_retention_period = 731  # 2 years

  # Prevent accidental deletion
  deletion_protection = true

  # Enable IAM database authentication
  iam_database_authentication_enabled = true
}

# Force SSL parameter group
resource "aws_db_parameter_group" "force_ssl" {
  family = "postgres15"
  name   = "force-ssl-postgres15"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  # Enable query logging for audit
  parameter {
    name  = "log_statement"
    value = "ddl"  # Log all DDL statements
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }
}
```

## IAM Database Authentication

Instead of managing database passwords, use IAM authentication. This lets you control database access through IAM policies and eliminates password rotation concerns.

This Python code demonstrates connecting to RDS using IAM authentication.

```python
import boto3
import psycopg2
import ssl

def get_iam_auth_connection(host, port, database, user, region):
    """Connect to RDS PostgreSQL using IAM authentication."""
    # Generate an authentication token
    rds_client = boto3.client('rds', region_name=region)
    token = rds_client.generate_db_auth_token(
        DBHostname=host,
        Port=port,
        DBUsername=user,
        Region=region
    )

    # Connect using the token as the password
    connection = psycopg2.connect(
        host=host,
        port=port,
        database=database,
        user=user,
        password=token,
        sslmode='verify-full',
        sslrootcert='/opt/amazon-root-ca.pem'
    )

    return connection

# Usage
conn = get_iam_auth_connection(
    host='production-postgres.cluster-abc123.us-east-1.rds.amazonaws.com',
    port=5432,
    database='myapp',
    user='app_user',
    region='us-east-1'
)

cursor = conn.cursor()
cursor.execute("SELECT current_user, current_database()")
print(cursor.fetchone())
conn.close()
```

The corresponding IAM policy for the application role looks like this.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "rds-db:connect",
      "Resource": "arn:aws:rds-db:us-east-1:123456789012:dbuser:cluster-ABC123/app_user"
    }
  ]
}
```

## DynamoDB Security

DynamoDB has a different security model than RDS, but the principles are the same.

```hcl
resource "aws_dynamodb_table" "user_data" {
  name         = "user-data"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  # Encryption with customer-managed key
  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.dynamodb.arn
  }

  # Enable point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  # Prevent accidental deletion
  deletion_protection_enabled = true
}

# Fine-grained access control using IAM conditions
resource "aws_iam_policy" "user_data_access" {
  name = "dynamodb-user-data-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowAccessToOwnItems"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = aws_dynamodb_table.user_data.arn
        Condition = {
          "ForAllValues:StringEquals" = {
            "dynamodb:LeadingKeys" = ["$${www.amazon.com:user_id}"]
          }
        }
      }
    ]
  })
}
```

The `LeadingKeys` condition restricts each user to only access their own items in the table. This is fine-grained access control at the database level, implemented entirely through IAM.

## Database Activity Monitoring

Enable database activity streams for RDS to capture all database activity for security analysis.

```python
import boto3

def enable_activity_stream(cluster_id, kms_key_id):
    """Enable database activity streams for an Aurora cluster."""
    rds = boto3.client('rds')

    response = rds.start_activity_stream(
        ResourceArn=f'arn:aws:rds:us-east-1:123456789012:cluster:{cluster_id}',
        Mode='async',  # Use 'sync' for guaranteed delivery
        KmsKeyId=kms_key_id,
        ApplyImmediately=True
    )

    print(f"Activity stream enabled")
    print(f"Kinesis stream: {response['KinesisStreamName']}")
    print(f"Status: {response['Status']}")

    return response

enable_activity_stream('production-cluster', 'alias/database-audit-key')
```

Activity streams send all database activity to a Kinesis Data Stream, where you can process it with Lambda, store it in S3, or send it to a SIEM for analysis.

## Automated Security Checks

This script performs a comprehensive security audit of your RDS instances.

```python
import boto3

def audit_rds_security():
    """Audit RDS instances for security best practices."""
    rds = boto3.client('rds')
    findings = []

    instances = rds.describe_db_instances()['DBInstances']

    for db in instances:
        db_id = db['DBInstanceIdentifier']

        # Check encryption
        if not db.get('StorageEncrypted', False):
            findings.append(f"CRITICAL: {db_id} - Storage not encrypted")

        # Check public accessibility
        if db.get('PubliclyAccessible', False):
            findings.append(f"CRITICAL: {db_id} - Publicly accessible")

        # Check backup retention
        retention = db.get('BackupRetentionPeriod', 0)
        if retention < 7:
            findings.append(f"WARNING: {db_id} - Backup retention is only {retention} days")

        # Check IAM auth
        if not db.get('IAMDatabaseAuthenticationEnabled', False):
            findings.append(f"INFO: {db_id} - IAM authentication not enabled")

        # Check deletion protection
        if not db.get('DeletionProtection', False):
            findings.append(f"WARNING: {db_id} - Deletion protection not enabled")

        # Check enhanced monitoring
        if db.get('MonitoringInterval', 0) == 0:
            findings.append(f"INFO: {db_id} - Enhanced monitoring not enabled")

        # Check multi-AZ
        if not db.get('MultiAZ', False):
            findings.append(f"WARNING: {db_id} - Not multi-AZ")

    if findings:
        print(f"Found {len(findings)} security findings:")
        for f in findings:
            print(f"  {f}")
    else:
        print("All RDS instances pass security checks")

    return findings

audit_rds_security()
```

## Summary

Database security on AWS boils down to: isolate the network, encrypt everything, use IAM authentication where possible, log all activity, and regularly audit your configuration. The biggest risk is usually the simplest mistake - a publicly accessible database, an unencrypted instance, or a security group that's too open.

Take the time to lock these down properly. A database breach isn't just a technical incident - it's a business crisis that can cost millions in fines, lawsuits, and lost customer trust.

For related security topics, see our posts on [encryption everywhere on AWS](https://oneuptime.com/blog/post/encryption-everywhere-aws/view) and [data protection best practices on AWS](https://oneuptime.com/blog/post/data-protection-best-practices-aws/view).
