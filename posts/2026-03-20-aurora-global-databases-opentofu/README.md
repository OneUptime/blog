# How to Deploy Aurora Global Databases with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Aurora, Global Database, Disaster Recovery, Multi-Region, Infrastructure as Code

Description: Learn how to deploy Aurora Global Databases with OpenTofu to achieve sub-second cross-region replication and enable fast disaster recovery with RPOs under 1 second.

## Introduction

Aurora Global Databases replicate data from a primary region to up to 10 secondary regions with typical latency under 1 second, using dedicated infrastructure that has little performance impact on the primary cluster. In disaster scenarios, you can perform a cross-region failover to a secondary cluster, with RPO typically measured in seconds and RTO in the order of minutes.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with RDS/Aurora permissions in both primary and secondary regions
- Multi-provider configuration for cross-region deployment

## Step 1: Configure Multi-Region Providers

```hcl
provider "aws" {
  alias  = "primary"
  region = "us-east-1"
}

provider "aws" {
  alias  = "secondary"
  region = "eu-west-1"
}
```

## Step 2: Create Primary Aurora Cluster

```hcl
resource "aws_rds_cluster" "primary" {
  provider = aws.primary

  cluster_identifier = "${var.project_name}-aurora-primary"
  engine             = "aurora-postgresql"
  engine_version     = "16.1"

  database_name   = var.database_name
  master_username = var.master_username
  master_password = var.master_password

  db_subnet_group_name   = var.primary_subnet_group_name
  vpc_security_group_ids = [var.primary_security_group_id]

  storage_encrypted = true
  kms_key_id        = var.primary_kms_key_arn

  backup_retention_period = 14
  deletion_protection     = true
  skip_final_snapshot     = false
  final_snapshot_identifier = "${var.project_name}-primary-final"

  tags = {
    Name   = "${var.project_name}-aurora-primary"
    Region = "us-east-1"
  }

  lifecycle {
    ignore_changes = [global_cluster_identifier]
  }
}

resource "aws_rds_cluster_instance" "primary" {
  provider = aws.primary

  identifier         = "${var.project_name}-primary-instance"
  cluster_identifier = aws_rds_cluster.primary.id
  instance_class     = "db.r6g.xlarge"
  engine             = aws_rds_cluster.primary.engine
  engine_version     = aws_rds_cluster.primary.engine_version

  db_subnet_group_name = var.primary_subnet_group_name
}
```

## Step 3: Create Aurora Global Cluster

```hcl
resource "aws_rds_global_cluster" "main" {
  provider = aws.primary

  global_cluster_identifier    = "${var.project_name}-global-cluster"
  source_db_cluster_identifier = aws_rds_cluster.primary.arn
  force_destroy                = false
}
```

## Step 4: Add Secondary Region Cluster

```hcl
resource "aws_rds_cluster" "secondary" {
  provider = aws.secondary

  cluster_identifier = "${var.project_name}-aurora-secondary"
  engine             = "aurora-postgresql"
  engine_version     = "16.1"

  # Link to global cluster for replication
  global_cluster_identifier = aws_rds_global_cluster.main.id

  db_subnet_group_name   = var.secondary_subnet_group_name
  vpc_security_group_ids = [var.secondary_security_group_id]

  # Use secondary region's KMS key
  storage_encrypted = true
  kms_key_id        = var.secondary_kms_key_arn

  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-secondary-final"

  tags = {
    Name   = "${var.project_name}-aurora-secondary"
    Region = "eu-west-1"
    Role   = "secondary"
  }

  lifecycle {
    ignore_changes = [
      replication_source_identifier,
      master_username,
      master_password,
    ]
  }

  depends_on = [aws_rds_cluster_instance.primary]
}

resource "aws_rds_cluster_instance" "secondary" {
  provider = aws.secondary

  identifier         = "${var.project_name}-secondary-instance"
  cluster_identifier = aws_rds_cluster.secondary.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.secondary.engine
  engine_version     = aws_rds_cluster.secondary.engine_version

  db_subnet_group_name = var.secondary_subnet_group_name
}
```

## Step 5: Failover (Managed Failover)

```bash
# In a DR scenario, perform a managed failover to promote the secondary to primary

aws rds --region eu-west-1 \
  failover-global-cluster \
  --global-cluster-identifier my-project-global-cluster \
  --target-db-cluster-identifier arn:aws:rds:eu-west-1:123456789012:cluster:my-project-aurora-secondary \
  --allow-data-loss
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

Aurora Global Databases provide sub-second cross-region replication lag and lower RPO/RTO than traditional replication solutions. The dedicated replication infrastructure uses storage-level replication rather than database-engine replication, keeping the performance impact on the primary cluster low. For planned regional rotation or failback testing, AWS supports switchovers that swap primary and secondary roles without data loss; test this regularly to validate your DR runbook.
