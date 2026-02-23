# How to Configure Database SSL Connections in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Database, SSL, TLS, Security, Infrastructure as Code

Description: Learn how to configure and enforce SSL/TLS connections for AWS databases using Terraform to encrypt data in transit for RDS, Aurora, and other services.

---

Encrypting data in transit is just as important as encrypting data at rest. SSL/TLS connections ensure that data traveling between your application and your database is encrypted and cannot be intercepted. AWS managed database services support SSL/TLS connections, and in many cases you can enforce them so that unencrypted connections are rejected. In this guide, we will cover how to configure SSL connections across different AWS database services using Terraform.

## Understanding SSL/TLS for Databases

When your application connects to a database over SSL/TLS, the connection is encrypted using certificates. AWS provides certificates for its managed database services through the Amazon Root Certificate Authority. Your application uses these certificates to verify the identity of the database server and establish an encrypted connection.

There are two levels of SSL configuration: enabling SSL support (allowing SSL connections) and enforcing SSL (requiring all connections to use SSL). For production environments, you should enforce SSL to ensure no unencrypted connections are possible.

## Setting Up the Provider

```hcl
# Configure Terraform
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Enforcing SSL on PostgreSQL RDS

For PostgreSQL, you enforce SSL through a parameter group:

```hcl
# Parameter group that enforces SSL connections
resource "aws_db_parameter_group" "postgres_ssl" {
  name   = "postgres-ssl-enforced"
  family = "postgres15"

  # Force SSL connections
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  tags = {
    Environment = "production"
    Purpose     = "ssl-enforcement"
  }
}

# RDS PostgreSQL instance with SSL enforced
resource "aws_db_instance" "postgres_ssl" {
  identifier     = "postgres-ssl"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  allocated_storage = 100
  storage_type      = "gp3"
  db_name           = "appdb"
  username          = "dbadmin"
  password          = var.db_password

  # Use the SSL-enforcing parameter group
  parameter_group_name = aws_db_parameter_group.postgres_ssl.name

  # Specify the CA certificate
  ca_cert_identifier = "rds-ca-rsa2048-g1"

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  storage_encrypted      = true
  multi_az               = true

  backup_retention_period = 7
  skip_final_snapshot     = false
  final_snapshot_identifier = "postgres-ssl-final"

  tags = {
    Environment = "production"
    SSLEnforced = "true"
  }
}

variable "db_password" {
  type      = string
  sensitive = true
}
```

## Enforcing SSL on MySQL RDS

For MySQL, SSL enforcement is also done through a parameter group:

```hcl
# MySQL parameter group with SSL enforcement
resource "aws_db_parameter_group" "mysql_ssl" {
  name   = "mysql-ssl-enforced"
  family = "mysql8.0"

  # Require SSL for all connections
  parameter {
    name  = "require_secure_transport"
    value = "ON"
  }

  # Set minimum TLS version
  parameter {
    name  = "tls_version"
    value = "TLSv1.2,TLSv1.3"
  }

  tags = {
    Environment = "production"
    Purpose     = "ssl-enforcement"
  }
}

# MySQL instance with SSL
resource "aws_db_instance" "mysql_ssl" {
  identifier     = "mysql-ssl"
  engine         = "mysql"
  engine_version = "8.0.35"
  instance_class = "db.r6g.large"

  allocated_storage    = 100
  storage_type         = "gp3"
  db_name              = "appdb"
  username             = "dbadmin"
  password             = var.db_password
  parameter_group_name = aws_db_parameter_group.mysql_ssl.name
  ca_cert_identifier   = "rds-ca-rsa2048-g1"

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  storage_encrypted      = true

  skip_final_snapshot       = false
  final_snapshot_identifier = "mysql-ssl-final"

  tags = {
    Environment = "production"
    SSLEnforced = "true"
  }
}
```

## Configuring SSL for Aurora PostgreSQL

```hcl
# Aurora cluster parameter group with SSL enforcement
resource "aws_rds_cluster_parameter_group" "aurora_pg_ssl" {
  name   = "aurora-pg-ssl-enforced"
  family = "aurora-postgresql15"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  tags = {
    Environment = "production"
  }
}

# Aurora cluster with SSL
resource "aws_rds_cluster" "aurora_ssl" {
  cluster_identifier = "aurora-ssl"
  engine             = "aurora-postgresql"
  engine_version     = "15.4"
  database_name      = "appdb"
  master_username    = "dbadmin"
  master_password    = var.db_password

  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.aurora_pg_ssl.name

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  storage_encrypted      = true

  skip_final_snapshot       = false
  final_snapshot_identifier = "aurora-ssl-final"

  tags = {
    Environment = "production"
    SSLEnforced = "true"
  }
}

# Aurora instances
resource "aws_rds_cluster_instance" "aurora_ssl_instances" {
  count = 2

  identifier         = "aurora-ssl-instance-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.aurora_ssl.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.aurora_ssl.engine
  engine_version     = aws_rds_cluster.aurora_ssl.engine_version
  ca_cert_identifier = "rds-ca-rsa2048-g1"

  tags = {
    Environment = "production"
  }
}
```

## Configuring SSL for ElastiCache Redis

ElastiCache Redis uses the `transit_encryption_enabled` flag for TLS:

```hcl
# ElastiCache Redis with TLS enabled
resource "aws_elasticache_replication_group" "redis_tls" {
  replication_group_id       = "redis-tls"
  description                = "Redis with TLS enabled"
  node_type                  = "cache.r6g.large"
  num_cache_clusters         = 3
  automatic_failover_enabled = true

  engine               = "redis"
  engine_version       = "7.0"
  parameter_group_name = "default.redis7"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis_sg.id]

  # Enable TLS (encryption in transit)
  transit_encryption_enabled = true

  # Optional: Require authentication with auth token
  auth_token = var.redis_auth_token

  # Also enable encryption at rest
  at_rest_encryption_enabled = true

  tags = {
    Environment = "production"
    TLSEnabled  = "true"
  }
}

variable "redis_auth_token" {
  type      = string
  sensitive = true
}
```

When TLS is enabled on ElastiCache, your application must connect using TLS. The connection string changes from `redis://` to `rediss://` (note the double 's').

## Configuring SSL for DocumentDB

DocumentDB has TLS enabled by default. You control it through a cluster parameter group:

```hcl
# DocumentDB parameter group with TLS configuration
resource "aws_docdb_cluster_parameter_group" "docdb_tls" {
  family      = "docdb5.0"
  name        = "docdb-tls-enforced"
  description = "DocumentDB with TLS enforced"

  # TLS is enabled by default; this explicitly ensures it
  parameter {
    name  = "tls"
    value = "enabled"
  }

  tags = {
    Environment = "production"
  }
}

# DocumentDB cluster with TLS
resource "aws_docdb_cluster" "docdb_ssl" {
  cluster_identifier              = "docdb-ssl"
  engine                          = "docdb"
  engine_version                  = "5.0.0"
  master_username                 = "docdbadmin"
  master_password                 = var.db_password
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.docdb_tls.name

  db_subnet_group_name   = aws_docdb_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.docdb_sg.id]
  storage_encrypted      = true

  skip_final_snapshot       = false
  final_snapshot_identifier = "docdb-ssl-final"

  tags = {
    Environment = "production"
    TLSEnabled  = "true"
  }
}
```

## Configuring SSL for Neptune

Neptune supports SSL connections and IAM authentication:

```hcl
# Neptune cluster parameter group
resource "aws_neptune_cluster_parameter_group" "neptune_ssl" {
  family      = "neptune1.3"
  name        = "neptune-ssl-params"
  description = "Neptune with SSL and IAM auth"

  parameter {
    name  = "neptune_enable_audit_log"
    value = "1"
  }

  tags = {
    Environment = "production"
  }
}

# Neptune cluster with IAM authentication (uses SSL)
resource "aws_neptune_cluster" "neptune_ssl" {
  cluster_identifier = "neptune-ssl"
  engine             = "neptune"
  engine_version     = "1.3.1.0"

  # IAM authentication requires SSL
  iam_database_authentication_enabled = true

  neptune_cluster_parameter_group_name = aws_neptune_cluster_parameter_group.neptune_ssl.name
  neptune_subnet_group_name            = aws_neptune_subnet_group.main.name
  vpc_security_group_ids               = [aws_security_group.neptune_sg.id]
  storage_encrypted                    = true

  skip_final_snapshot       = false
  final_snapshot_identifier = "neptune-ssl-final"

  tags = {
    Environment = "production"
    SSLEnabled  = "true"
  }
}
```

## Managing CA Certificates

AWS periodically rotates the root CA certificates used for RDS SSL connections. You can manage the certificate version in Terraform:

```hcl
# Specify the CA certificate identifier
resource "aws_db_instance" "with_specific_ca" {
  identifier     = "db-with-ca"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  allocated_storage = 100
  username          = "dbadmin"
  password          = var.db_password

  # Specify the CA certificate to use
  ca_cert_identifier = "rds-ca-rsa2048-g1"

  parameter_group_name   = aws_db_parameter_group.postgres_ssl.name
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  storage_encrypted      = true

  skip_final_snapshot       = false
  final_snapshot_identifier = "db-with-ca-final"

  tags = {
    Environment   = "production"
    CACertificate = "rds-ca-rsa2048-g1"
  }
}

# Data source to get available CA certificates
data "aws_rds_certificate" "current" {
  latest_valid_till = true
}

output "current_ca_cert" {
  description = "Current RDS CA certificate"
  value       = data.aws_rds_certificate.current.id
}
```

## Creating an IAM Policy for SSL-Only Access

You can use IAM policies to enforce that database connections use SSL:

```hcl
# IAM policy that requires SSL for RDS IAM authentication
resource "aws_iam_policy" "rds_ssl_only" {
  name        = "rds-ssl-only-access"
  description = "Allow RDS access only via SSL connections"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds-db:connect"
        ]
        Resource = "arn:aws:rds-db:us-east-1:${data.aws_caller_identity.current.account_id}:dbuser:${aws_db_instance.postgres_ssl.resource_id}/*"
        Condition = {
          Bool = {
            "rds:tlsEnabled" = "true"
          }
        }
      }
    ]
  })
}

data "aws_caller_identity" "current" {}
```

## Monitoring SSL Connections

Track SSL connection metrics to ensure all connections are encrypted:

```hcl
# CloudWatch alarm for non-SSL connections (PostgreSQL)
resource "aws_cloudwatch_metric_alarm" "non_ssl_connections" {
  alarm_name          = "database-non-ssl-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 0
  alarm_description   = "Alert on potential non-SSL database connections"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres_ssl.identifier
  }

  alarm_actions = [aws_sns_topic.security_alerts.arn]
}

resource "aws_sns_topic" "security_alerts" {
  name = "database-security-alerts"
}
```

For comprehensive security monitoring of your database connections, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-create-database-monitoring-dashboards-with-terraform/view) can help you track connection patterns and detect non-encrypted connections.

## Best Practices

Always enforce SSL on production databases, not just enable it. Use the latest CA certificate version for new instances. Plan for CA certificate rotations, which happen periodically. Test your application's SSL configuration in a staging environment before production. For ElastiCache, remember that enabling TLS requires changing your application's connection strings. Combine SSL enforcement with IAM database authentication where supported. Monitor your connections to verify that SSL is being used correctly. Keep your application's SSL/TLS libraries up to date.

## Conclusion

Configuring SSL/TLS for database connections is a critical security measure that protects your data in transit. Terraform makes it straightforward to enforce SSL across all your database services. By combining encryption at rest with encryption in transit, you create a comprehensive data protection strategy. Make SSL enforcement part of your standard database provisioning configuration and never deploy a production database without it.
