# How to Import AWS RDS Instances into OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, AWS, RDS, Import, Database

Description: Learn how to import existing AWS RDS database instances into OpenTofu state, including subnet groups, parameter groups, and option groups.

## Introduction

If you want OpenTofu to manage the instance and its associated resources, you often need to import the instance plus resources such as DB subnet groups, parameter groups, and, for engines that use them, option groups. The most challenging part is writing HCL that closely matches the existing RDS configuration to avoid unexpected changes on the first plan.

Because the example in this post uses PostgreSQL, there is no DB option group resource to import.

## Step 1: Gather RDS Configuration

```bash
DB_ID="my-app-database"

# Get full instance details

aws rds describe-db-instances \
  --db-instance-identifier $DB_ID \
  --query 'DBInstances[0]' \
  --output json | jq '{
    engine: .Engine,
    engine_version: .EngineVersion,
    instance_class: .DBInstanceClass,
    allocated_storage: .AllocatedStorage,
    storage_type: .StorageType,
    storage_encrypted: .StorageEncrypted,
    multi_az: .MultiAZ,
    db_subnet_group: .DBSubnetGroup.DBSubnetGroupName,
    parameter_group: .DBParameterGroups[0].DBParameterGroupName,
    option_group: (.OptionGroupMemberships[0].OptionGroupName // null),
    db_name: .DBName,
    username: .MasterUsername,
    vpc_security_group_ids: [.VpcSecurityGroups[].VpcSecurityGroupId],
    deletion_protection: .DeletionProtection,
    backup_retention_period: .BackupRetentionPeriod,
    backup_window: .PreferredBackupWindow,
    maintenance_window: .PreferredMaintenanceWindow,
    publicly_accessible: .PubliclyAccessible
  }'
```

## Step 2: Write Matching HCL

```hcl
# Import existing DB subnet group
resource "aws_db_subnet_group" "main" {
  name       = "my-app-db-subnet-group"
  subnet_ids = ["subnet-0123456789abcdef0", "subnet-abcdef0123456789"]
  tags       = { Name = "my-app-db-subnet-group" }
}

# Import existing parameter group
resource "aws_db_parameter_group" "main" {
  name   = "my-app-db-params"
  family = "postgres15"

  # Only include parameters you've explicitly set
  parameter {
    name  = "log_connections"
    value = "1"
  }
}

# Import existing RDS instance
resource "aws_db_instance" "main" {
  identifier             = "my-app-database"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = "db.t3.medium"
  allocated_storage      = 100
  storage_type           = "gp3"
  storage_encrypted      = true

  db_name  = "appdb"
  username = "appuser"
  # RDS does not return the current password from the API.
  # If you set password here, it is still stored in state.
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.main.name
  vpc_security_group_ids = ["sg-0123456789abcdef0"]

  multi_az               = true
  deletion_protection    = true
  skip_final_snapshot    = false
  final_snapshot_identifier = "my-app-database-final"
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:06:00"

  lifecycle {
    # Ignore password drift if it is managed externally via Secrets Manager
    ignore_changes = [password]
  }
}
```

## Step 3: Add Import Blocks

```hcl
# import.tf
import {
  to = aws_db_subnet_group.main
  id = "my-app-db-subnet-group"
}

import {
  to = aws_db_parameter_group.main
  id = "my-app-db-params"
}

import {
  to = aws_db_instance.main
  id = "my-app-database"
}
```

## Handling RDS Clusters (Aurora)

```hcl
# For Aurora, import the cluster and instances separately
resource "aws_rds_cluster" "aurora" {
  cluster_identifier = "my-aurora-cluster"
  engine             = "aurora-postgresql"
  engine_version     = "15.4"
  database_name      = "appdb"
  master_username    = "appuser"
  master_password    = var.db_password
}

resource "aws_rds_cluster_instance" "aurora_instances" {
  count              = 2
  cluster_identifier = aws_rds_cluster.aurora.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.aurora.engine
  identifier         = "my-aurora-cluster-instance-${count.index + 1}"
}

import {
  to = aws_rds_cluster.aurora
  id = "my-aurora-cluster"
}

import {
  to = aws_rds_cluster_instance.aurora_instances[0]
  id = "my-aurora-cluster-instance-1"
}

import {
  to = aws_rds_cluster_instance.aurora_instances[1]
  id = "my-aurora-cluster-instance-2"
}
```

## Conclusion

RDS import requires careful attention to parameter groups and, for engines that use them, option groups. Mismatches here can cause OpenTofu to plan unexpected updates, and some instance attributes can still force replacement. The `ignore_changes = [password]` lifecycle rule is useful when the password is managed externally because RDS doesn't return the current password from the API. If you set `password` in configuration, remember that OpenTofu still stores it in state. Always verify with `tofu plan` before applying any changes after import.
