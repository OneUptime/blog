# How to Deploy Zabbix Monitoring with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Zabbix, Monitoring, Infrastructure Monitoring, SNMP

Description: Learn how to deploy Zabbix monitoring server on AWS using OpenTofu with RDS MySQL, ECS Fargate, and ALB for enterprise-grade infrastructure monitoring.

## Introduction

Zabbix is an enterprise-class open-source monitoring platform that monitors networks, servers, applications, and services. This guide deploys Zabbix Server with the web frontend on AWS ECS Fargate using RDS MySQL for the monitoring database.

## RDS MySQL for Zabbix

```hcl
resource "aws_db_instance" "zabbix" {
  identifier          = "zabbix-${var.environment}"
  engine              = "mysql"
  engine_version      = "8.0"
  instance_class      = "db.t3.medium"
  allocated_storage   = 100
  max_allocated_storage = 1000  # Zabbix databases grow significantly
  storage_type        = "gp3"
  storage_encrypted   = true

  db_name  = "zabbix"
  username = "zabbix"
  password = random_password.db_password.result

  vpc_security_group_ids = [aws_security_group.rds_zabbix.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  # Zabbix performance parameters
  parameter_group_name = aws_db_parameter_group.zabbix.name

  backup_retention_period = 7
  deletion_protection     = true
}

resource "aws_db_parameter_group" "zabbix" {
  name   = "zabbix-mysql8-${var.environment}"
  family = "mysql8.0"

  parameter {
    name  = "innodb_buffer_pool_size"
    value = "{DBInstanceClassMemory*3/4}"
  }

  parameter {
    name  = "innodb_flush_log_at_trx_commit"
    value = "2"
  }

  parameter {
    name         = "log_bin_trust_function_creators"
    value        = "1"
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "character_set_server"
    value        = "utf8mb4"
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "collation_server"
    value        = "utf8mb4_bin"
    apply_method = "pending-reboot"
  }
}
```

## Zabbix Server Task Definition

```hcl
resource "aws_ecs_task_definition" "zabbix_server" {
  family                   = "zabbix-server-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "2048"
  memory                   = "4096"
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([{
    name  = "zabbix-server"
    image = "zabbix/zabbix-server-mysql:ubuntu-6.4-latest"

    environment = [
      { name = "DB_SERVER_HOST",  value = aws_db_instance.zabbix.address },
      { name = "DB_SERVER_PORT",  value = "3306" },
      { name = "MYSQL_DATABASE",  value = "zabbix" },
      { name = "MYSQL_USER",      value = "zabbix" },
      { name = "ZBX_CACHESIZE",   value = "512M" },
      { name = "ZBX_TRENDCACHESIZE", value = "128M" },
      { name = "ZBX_VALUECACHESIZE", value = "256M" },
    ]

    secrets = [
      { name = "MYSQL_PASSWORD",      valueFrom = aws_secretsmanager_secret.db_password.arn },
    ]

    portMappings = [{ containerPort = 10051, protocol = "tcp" }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/zabbix-server"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "zabbix-server"
      }
    }
  }])
}
```

## Zabbix Web Frontend

```hcl
resource "aws_ecs_task_definition" "zabbix_web" {
  family                   = "zabbix-web-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([{
    name  = "zabbix-web"
    image = "zabbix/zabbix-web-nginx-mysql:ubuntu-6.4-latest"

    environment = [
      { name = "ZBX_SERVER_HOST",  value = "zabbix-server.${var.environment}.local" },
      { name = "ZBX_SERVER_PORT",  value = "10051" },
      { name = "DB_SERVER_HOST",   value = aws_db_instance.zabbix.address },
      { name = "MYSQL_DATABASE",   value = "zabbix" },
      { name = "MYSQL_USER",       value = "zabbix" },
      { name = "PHP_TZ",           value = "UTC" },
    ]

    secrets = [
      { name = "MYSQL_PASSWORD", valueFrom = aws_secretsmanager_secret.db_password.arn },
    ]

    portMappings = [{ containerPort = 8080, protocol = "tcp" }]

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:8080/ping || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 120
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/zabbix-web"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "zabbix-web"
      }
    }
  }])
}
```

## Service Discovery with Cloud Map

```hcl
resource "aws_service_discovery_private_dns_namespace" "monitoring" {
  name = "${var.environment}.local"
  vpc  = var.vpc_id
}

resource "aws_service_discovery_service" "zabbix_server" {
  name = "zabbix-server"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.monitoring.id
    dns_records {
      ttl  = 10
      type = "A"
    }
    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_ecs_service" "zabbix_server" {
  name            = "zabbix-server-${var.environment}"
  cluster         = aws_ecs_cluster.monitoring.arn
  task_definition = aws_ecs_task_definition.zabbix_server.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.zabbix_server.id]
  }

  service_registries {
    registry_arn = aws_service_discovery_service.zabbix_server.arn
  }
}
```

## Conclusion

Deploying Zabbix with OpenTofu on AWS creates a scalable monitoring platform. The MySQL parameter group tuning is important for Zabbix performance - the default MySQL settings are inadequate for the write-heavy monitoring workload. Use Cloud Map for service discovery between the Zabbix server and web frontend containers. For distributed monitoring, deploy Zabbix proxies as separate ECS services in the networks where the monitored hosts reside.
