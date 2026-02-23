# How to Build a Load Testing Infrastructure with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Load Testing, Performance, k6, Locust, AWS, Infrastructure as Code

Description: Learn how to build a scalable load testing infrastructure using Terraform with distributed test runners, result collection, and automated performance analysis.

---

Performance problems are best caught before they reach production. A dedicated load testing infrastructure lets you simulate thousands or millions of users hitting your system, revealing bottlenecks, breaking points, and degradation patterns. Running load tests from your laptop does not scale, and spinning up infrastructure manually for each test run is slow and inconsistent.

In this guide, we will build a scalable, reusable load testing infrastructure on AWS using Terraform. The setup supports distributed load generation, centralized result collection, and automated analysis.

## Load Testing Architecture

Our infrastructure includes:

- **Load generators**: ECS Fargate tasks running k6 or Locust
- **Orchestration**: Step Functions to coordinate distributed test runs
- **Results storage**: S3 for raw results, InfluxDB for time-series metrics
- **Dashboards**: Grafana for real-time test visualization
- **Scheduling**: EventBridge for automated test runs

## Load Generator Cluster

The load generators run as ECS Fargate tasks that can scale to generate massive amounts of traffic.

```hcl
# generators.tf - Load generator infrastructure
resource "aws_ecs_cluster" "load_test" {
  name = "${var.project_name}-load-testing"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Purpose = "LoadTesting"
  }
}

# ECR repository for custom load test images
resource "aws_ecr_repository" "load_test" {
  name = "${var.project_name}/load-tester"

  image_scanning_configuration {
    scan_on_push = true
  }

  image_tag_mutability = "MUTABLE"
}

# Task definition for k6 load generators
resource "aws_ecs_task_definition" "k6_generator" {
  family                   = "k6-load-generator"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "2048"
  memory                   = "4096"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.load_test_task.arn

  container_definitions = jsonencode([
    {
      name  = "k6"
      image = "${aws_ecr_repository.load_test.repository_url}:latest"

      environment = [
        {
          name  = "K6_INFLUXDB_PUSH_INTERVAL"
          value = "5s"
        },
        {
          name  = "K6_OUT"
          value = "influxdb=http://${aws_service_discovery_service.influxdb.name}.${aws_service_discovery_private_dns_namespace.load_test.name}:8086/k6"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.k6.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "k6"
        }
      }
    }
  ])
}

# Task definition for Locust load generators (alternative)
resource "aws_ecs_task_definition" "locust_worker" {
  family                   = "locust-worker"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.load_test_task.arn

  container_definitions = jsonencode([
    {
      name  = "locust"
      image = "locustio/locust:latest"

      command = [
        "--worker",
        "--master-host", "locust-master.${aws_service_discovery_private_dns_namespace.load_test.name}"
      ]

      environment = [
        {
          name  = "LOCUST_LOCUSTFILE"
          value = "/tests/locustfile.py"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.locust.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "locust-worker"
        }
      }
    }
  ])
}
```

## S3 for Test Scripts and Results

Store test scripts and results in S3 so they are versioned and accessible.

```hcl
# storage.tf - Test scripts and results
resource "aws_s3_bucket" "load_test" {
  bucket = "${var.project_name}-load-testing"

  tags = {
    Purpose = "LoadTesting"
  }
}

resource "aws_s3_bucket_versioning" "load_test" {
  bucket = aws_s3_bucket.load_test.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "load_test" {
  bucket = aws_s3_bucket.load_test.id

  rule {
    id     = "cleanup-old-results"
    status = "Enabled"

    filter {
      prefix = "results/"
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = 180
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "load_test" {
  bucket = aws_s3_bucket.load_test.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
```

## InfluxDB for Real-Time Metrics

InfluxDB collects time-series metrics from the load generators in real time.

```hcl
# influxdb.tf - Time series database for test metrics
resource "aws_ecs_task_definition" "influxdb" {
  family                   = "influxdb"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "2048"
  memory                   = "4096"
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name  = "influxdb"
      image = "influxdb:2.7"

      portMappings = [
        {
          containerPort = 8086
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "DOCKER_INFLUXDB_INIT_MODE"
          value = "setup"
        },
        {
          name  = "DOCKER_INFLUXDB_INIT_USERNAME"
          value = "admin"
        },
        {
          name  = "DOCKER_INFLUXDB_INIT_ORG"
          value = var.project_name
        },
        {
          name  = "DOCKER_INFLUXDB_INIT_BUCKET"
          value = "k6"
        }
      ]

      secrets = [
        {
          name      = "DOCKER_INFLUXDB_INIT_PASSWORD"
          valueFrom = aws_secretsmanager_secret.influxdb_password.arn
        }
      ]

      mountPoints = [
        {
          sourceVolume  = "influxdb-data"
          containerPath = "/var/lib/influxdb2"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.influxdb.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "influxdb"
        }
      }
    }
  ])

  volume {
    name = "influxdb-data"

    efs_volume_configuration {
      file_system_id = aws_efs_file_system.load_test.id
      root_directory = "/influxdb"
    }
  }
}

resource "aws_ecs_service" "influxdb" {
  name            = "influxdb"
  cluster         = aws_ecs_cluster.load_test.id
  task_definition = aws_ecs_task_definition.influxdb.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.influxdb.id]
  }

  service_registries {
    registry_arn = aws_service_discovery_service.influxdb.arn
  }
}

# EFS for persistent InfluxDB storage
resource "aws_efs_file_system" "load_test" {
  creation_token = "${var.project_name}-load-test-data"
  encrypted      = true

  tags = {
    Purpose = "LoadTestData"
  }
}

resource "aws_efs_mount_target" "load_test" {
  count           = length(var.private_subnet_ids)
  file_system_id  = aws_efs_file_system.load_test.id
  subnet_id       = var.private_subnet_ids[count.index]
  security_groups = [aws_security_group.efs.id]
}
```

## Test Orchestration with Step Functions

Step Functions coordinates the test lifecycle: spin up generators, run tests, collect results, and clean up.

```hcl
# orchestration.tf - Test run orchestration
resource "aws_sfn_state_machine" "load_test" {
  name     = "${var.project_name}-load-test-orchestrator"
  role_arn = aws_iam_role.step_functions.arn

  definition = jsonencode({
    Comment = "Orchestrate distributed load test"
    StartAt = "PrepareTest"
    States = {
      PrepareTest = {
        Type = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = aws_lambda_function.prepare_test.arn
          "Payload.$"  = "$"
        }
        Next = "RunLoadGenerators"
      }
      RunLoadGenerators = {
        Type = "Task"
        Resource = "arn:aws:states:::ecs:runTask.sync"
        Parameters = {
          Cluster        = aws_ecs_cluster.load_test.arn
          TaskDefinition = aws_ecs_task_definition.k6_generator.arn
          "Count.$"      = "$.generatorCount"
          LaunchType     = "FARGATE"
          NetworkConfiguration = {
            AwsvpcConfiguration = {
              Subnets        = var.private_subnet_ids
              SecurityGroups = [aws_security_group.k6.id]
            }
          }
        }
        Next = "CollectResults"
      }
      CollectResults = {
        Type = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = aws_lambda_function.collect_results.arn
          "Payload.$"  = "$"
        }
        Next = "AnalyzeResults"
      }
      AnalyzeResults = {
        Type = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = aws_lambda_function.analyze_results.arn
          "Payload.$"  = "$"
        }
        Next = "CheckThresholds"
      }
      CheckThresholds = {
        Type = "Choice"
        Choices = [
          {
            Variable        = "$.Payload.passed"
            BooleanEquals   = false
            Next            = "TestFailed"
          }
        ]
        Default = "TestPassed"
      }
      TestPassed = {
        Type = "Succeed"
      }
      TestFailed = {
        Type  = "Fail"
        Cause = "Performance thresholds not met"
      }
    }
  })

  tags = {
    Purpose = "LoadTesting"
  }
}
```

## Grafana Dashboard for Real-Time Visualization

```hcl
# dashboards.tf - Load test visualization
resource "aws_grafana_workspace" "load_test" {
  name                     = "${var.project_name}-load-testing"
  account_access_type      = "CURRENT_ACCOUNT"
  authentication_providers = ["AWS_SSO"]
  permission_type          = "SERVICE_MANAGED"
  role_arn                 = aws_iam_role.grafana.arn

  data_sources = ["CLOUDWATCH"]

  tags = {
    Purpose = "LoadTesting"
  }
}
```

## Summary

A well-built load testing infrastructure eliminates the manual work of spinning up test environments and collecting results. ECS Fargate provides scalable load generation that can simulate massive user loads. Step Functions orchestrates the test lifecycle with proper error handling. And InfluxDB plus Grafana give you real-time visibility into test execution.

The key is automating the entire process so that load tests can run in CI/CD pipelines, not just as one-off exercises. When every deployment includes performance validation, you catch regressions before they reach production.

For monitoring your production systems and comparing real-world performance against load test baselines, [OneUptime](https://oneuptime.com/blog/post/2026-02-23-how-to-build-an-observability-platform-with-terraform/view) provides the visibility you need to track performance over time.
