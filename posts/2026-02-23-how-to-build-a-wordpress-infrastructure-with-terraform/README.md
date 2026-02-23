# How to Build a WordPress Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, WordPress, AWS, RDS, EFS, Infrastructure Patterns, Web Hosting

Description: Build a scalable, highly available WordPress infrastructure on AWS using Terraform with ECS Fargate, RDS Aurora, EFS, ElastiCache, and CloudFront.

---

WordPress powers over 40% of the web, but running it reliably at scale requires more than a single EC2 instance with a MySQL database. High-traffic WordPress sites need load balancing, database replication, shared file storage, caching, and a CDN. Setting all this up manually is time-consuming and fragile.

In this guide, we will build a production-grade WordPress infrastructure on AWS using Terraform. The result is a highly available, auto-scaling WordPress deployment that can handle serious traffic.

## Architecture Components

- **ECS Fargate** for running WordPress containers (no servers to manage)
- **RDS Aurora MySQL** for the database with read replicas
- **EFS** for shared media uploads across containers
- **ElastiCache Redis** for object caching
- **CloudFront** for CDN and static asset caching
- **Application Load Balancer** for traffic distribution

## VPC and Networking

WordPress needs private subnets for the database and cache, and public subnets for the ALB:

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.project_name}-wordpress-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.region}a", "${var.region}b", "${var.region}c"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true
}
```

## RDS Aurora MySQL

Aurora provides better performance and availability than standard RDS MySQL:

```hcl
resource "aws_rds_cluster" "wordpress" {
  cluster_identifier     = "${var.project_name}-wordpress"
  engine                 = "aurora-mysql"
  engine_version         = "8.0.mysql_aurora.3.05.2"
  database_name          = "wordpress"
  master_username        = var.db_username
  master_password        = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.wordpress.name
  vpc_security_group_ids = [aws_security_group.database.id]

  backup_retention_period = 7
  preferred_backup_window = "03:00-04:00"
  storage_encrypted       = true
  skip_final_snapshot     = false
  final_snapshot_identifier = "${var.project_name}-wordpress-final"

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 16
  }
}

# Writer instance
resource "aws_rds_cluster_instance" "writer" {
  identifier         = "${var.project_name}-wordpress-writer"
  cluster_identifier = aws_rds_cluster.wordpress.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.wordpress.engine
  engine_version     = aws_rds_cluster.wordpress.engine_version
}

# Reader instance for read-heavy queries
resource "aws_rds_cluster_instance" "reader" {
  identifier         = "${var.project_name}-wordpress-reader"
  cluster_identifier = aws_rds_cluster.wordpress.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.wordpress.engine
  engine_version     = aws_rds_cluster.wordpress.engine_version
}

resource "aws_db_subnet_group" "wordpress" {
  name       = "${var.project_name}-wordpress"
  subnet_ids = module.vpc.private_subnets
}
```

## EFS for Shared Media Storage

WordPress stores uploaded media on the filesystem. With multiple containers, you need a shared filesystem:

```hcl
resource "aws_efs_file_system" "wordpress" {
  creation_token = "${var.project_name}-wordpress"
  encrypted      = true
  kms_key_id     = aws_kms_key.efs.arn

  performance_mode = "generalPurpose"
  throughput_mode  = "bursting"

  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }

  tags = {
    Name = "${var.project_name}-wordpress-media"
  }
}

resource "aws_efs_mount_target" "wordpress" {
  count           = length(module.vpc.private_subnets)
  file_system_id  = aws_efs_file_system.wordpress.id
  subnet_id       = module.vpc.private_subnets[count.index]
  security_groups = [aws_security_group.efs.id]
}

# Access point for WordPress uploads directory
resource "aws_efs_access_point" "wordpress" {
  file_system_id = aws_efs_file_system.wordpress.id

  posix_user {
    gid = 33 # www-data group
    uid = 33 # www-data user
  }

  root_directory {
    path = "/wordpress"
    creation_info {
      owner_gid   = 33
      owner_uid   = 33
      permissions = "755"
    }
  }
}
```

## ElastiCache Redis

Redis dramatically improves WordPress performance by caching database queries and page fragments:

```hcl
resource "aws_elasticache_replication_group" "wordpress" {
  replication_group_id = "${var.project_name}-wordpress-cache"
  description          = "Redis cache for WordPress"
  node_type            = "cache.r6g.large"
  num_cache_clusters   = 2
  engine               = "redis"
  engine_version       = "7.1"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.wordpress.name
  security_group_ids   = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  automatic_failover_enabled = true
  multi_az_enabled           = true

  snapshot_retention_limit = 3
  snapshot_window          = "04:00-05:00"
}

resource "aws_elasticache_subnet_group" "wordpress" {
  name       = "${var.project_name}-wordpress-cache"
  subnet_ids = module.vpc.private_subnets
}
```

## ECS Task Definition

The WordPress container with all the configuration to connect to Aurora, EFS, and Redis:

```hcl
resource "aws_ecs_task_definition" "wordpress" {
  family                   = "${var.project_name}-wordpress"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 1024
  memory                   = 2048
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.wordpress_task.arn

  container_definitions = jsonencode([
    {
      name      = "wordpress"
      image     = "wordpress:6.4-php8.2-fpm"
      essential = true

      portMappings = [
        {
          containerPort = 80
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "WORDPRESS_DB_HOST", value = aws_rds_cluster.wordpress.endpoint },
        { name = "WORDPRESS_DB_NAME", value = "wordpress" },
        { name = "WORDPRESS_DB_USER", value = var.db_username },
        { name = "WORDPRESS_CONFIG_EXTRA", value = <<-EOT
          define('WP_REDIS_HOST', '${aws_elasticache_replication_group.wordpress.primary_endpoint_address}');
          define('WP_REDIS_PORT', 6379);
          define('WP_REDIS_TIMEOUT', 1);
          define('WP_REDIS_READ_TIMEOUT', 1);
        EOT
        }
      ]

      secrets = [
        {
          name      = "WORDPRESS_DB_PASSWORD"
          valueFrom = aws_secretsmanager_secret.db_password.arn
        }
      ]

      mountPoints = [
        {
          sourceVolume  = "wordpress-data"
          containerPath = "/var/www/html/wp-content"
          readOnly      = false
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.wordpress.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "wordpress"
        }
      }
    }
  ])

  volume {
    name = "wordpress-data"

    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.wordpress.id
      transit_encryption = "ENABLED"

      authorization_config {
        access_point_id = aws_efs_access_point.wordpress.id
        iam             = "ENABLED"
      }
    }
  }
}
```

## ECS Service with Auto Scaling

```hcl
resource "aws_ecs_service" "wordpress" {
  name            = "${var.project_name}-wordpress"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.wordpress.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.wordpress.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.wordpress.arn
    container_name   = "wordpress"
    container_port   = 80
  }

  health_check_grace_period_seconds = 120
}

# Auto scaling based on CPU
resource "aws_appautoscaling_target" "wordpress" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.wordpress.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "wordpress_cpu" {
  name               = "${var.project_name}-wordpress-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.wordpress.resource_id
  scalable_dimension = aws_appautoscaling_target.wordpress.scalable_dimension
  service_namespace  = aws_appautoscaling_target.wordpress.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 60.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

## CloudFront CDN

Put CloudFront in front of the ALB to cache static assets globally. For more details on CDN configuration, see [building a CDN infrastructure with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-cdn-infrastructure-with-terraform/view).

## Wrapping Up

A production WordPress setup is more involved than most people expect, but Terraform makes it manageable. The architecture we built handles high availability with multi-AZ Aurora, shared storage with EFS, performance caching with Redis, and auto-scaling with ECS Fargate. This setup can handle thousands of concurrent users while remaining cost-effective during quiet periods thanks to Aurora Serverless and Fargate scaling.
