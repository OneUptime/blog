# How to Deploy Amazon Aurora with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Aurora, AWS, Database, Infrastructure as Code, MySQL, PostgreSQL

Description: Learn how to deploy Amazon Aurora clusters (MySQL and PostgreSQL compatible) using OpenTofu - including cluster configuration, reader instances, Auto Scaling, and Global Database.

## Introduction

Aurora differs from standard RDS: it uses a cluster with one writer and multiple readers sharing a storage layer. OpenTofu manages both the `aws_rds_cluster` (the cluster itself) and `aws_rds_cluster_instance` (the individual instances in the cluster).

## Aurora Cluster

```hcl
resource "aws_rds_cluster" "main" {
  cluster_identifier = "${var.environment}-aurora"

  # Choose: aurora-mysql or aurora-postgresql
  engine         = "aurora-postgresql"
  engine_version = "15.4"

  database_name   = var.db_name
  master_username = var.db_username
  master_password = var.db_password

  db_subnet_group_name            = aws_db_subnet_group.aurora.name
  vpc_security_group_ids          = [aws_security_group.aurora.id]
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.aurora_pg.name

  # Backups
  backup_retention_period = 7
  preferred_backup_window = "03:00-04:00"
  preferred_maintenance_window = "Mon:04:00-Mon:05:00"

  # Encryption
  storage_encrypted = true
  kms_key_id        = aws_kms_key.aurora.arn

  # Protection
  deletion_protection       = var.environment == "prod"
  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.environment}-aurora-final" : null

  # Data API (optional HTTP endpoint)
  enable_http_endpoint = false

  tags = {
    Name        = "${var.environment}-aurora"
    Environment = var.environment
  }
}
```

## Cluster Parameter Group

```hcl
resource "aws_rds_cluster_parameter_group" "aurora_pg" {
  name   = "${var.environment}-aurora-postgresql15"
  family = "aurora-postgresql15"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,auto_explain"
  }

  tags = { Environment = var.environment }
}
```

## Cluster Instances

```hcl
variable "aurora_instance_count" {
  default = 2  # 1 writer + 1 reader minimum for HA
}

resource "aws_rds_cluster_instance" "aurora" {
  count = var.aurora_instance_count

  identifier         = "${var.environment}-aurora-${count.index + 1}"
  cluster_identifier = aws_rds_cluster.main.id

  engine         = aws_rds_cluster.main.engine
  engine_version = aws_rds_cluster.main.engine_version
  instance_class = var.aurora_instance_class  # "db.r6g.large"

  db_subnet_group_name    = aws_db_subnet_group.aurora.name
  db_parameter_group_name = aws_db_parameter_group.aurora_pg_instance.name

  performance_insights_enabled = true
  monitoring_interval          = 60
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn

  # Distribute across AZs
  availability_zone = data.aws_availability_zones.available.names[count.index % 3]

  tags = {
    Name        = "${var.environment}-aurora-${count.index + 1}"
    Environment = var.environment
    Role        = count.index == 0 ? "writer" : "reader"
  }
}
```

## Aurora Auto Scaling (Reader Auto Scaling)

```hcl
resource "aws_appautoscaling_target" "aurora_readers" {
  service_namespace  = "rds"
  resource_id        = "cluster:${aws_rds_cluster.main.cluster_identifier}"
  scalable_dimension = "rds:cluster:ReadReplicaCount"
  min_capacity       = 1
  max_capacity       = 5
}

resource "aws_appautoscaling_policy" "aurora_readers_cpu" {
  name               = "${var.environment}-aurora-reader-cpu-scaling"
  service_namespace  = "rds"
  resource_id        = aws_appautoscaling_target.aurora_readers.resource_id
  scalable_dimension = aws_appautoscaling_target.aurora_readers.scalable_dimension
  policy_type        = "TargetTrackingScaling"

  target_tracking_scaling_policy_configuration {
    target_value = 70.0  # Scale when average CPU > 70%

    predefined_metric_specification {
      predefined_metric_type = "RDSReaderAverageCPUUtilization"
    }

    scale_in_cooldown  = 300
    scale_out_cooldown = 300
  }
}
```

## Aurora Global Database (Multi-Region)

```hcl
# Primary cluster (us-east-1)

resource "aws_rds_global_cluster" "main" {
  global_cluster_identifier = "${var.project}-global-aurora"
  engine                    = "aurora-postgresql"
  engine_version            = "15.4"
  database_name             = var.db_name
  storage_encrypted         = true
}

resource "aws_rds_cluster" "primary" {
  provider = aws.us_east_1

  cluster_identifier        = "${var.project}-primary"
  engine                    = aws_rds_global_cluster.main.engine
  engine_version            = aws_rds_global_cluster.main.engine_version
  global_cluster_identifier = aws_rds_global_cluster.main.id
  master_username           = var.db_username
  master_password           = var.db_password
  # ...
}
```

## Outputs

```hcl
output "cluster_endpoint" {
  value       = aws_rds_cluster.main.endpoint
  description = "Writer endpoint"
}

output "cluster_reader_endpoint" {
  value       = aws_rds_cluster.main.reader_endpoint
  description = "Reader endpoint (load-balanced across all readers)"
}

output "cluster_port" {
  value = aws_rds_cluster.main.port
}
```

## Conclusion

Aurora's cluster architecture requires managing both the `aws_rds_cluster` (storage, backups, credentials) and `aws_rds_cluster_instance` (compute nodes). Use the reader endpoint for read-heavy queries to distribute load across all reader instances. Enable Aurora Auto Scaling to handle read traffic spikes by scaling reader count automatically. For global deployments, Aurora Global Database provides sub-second replication lag across regions.
