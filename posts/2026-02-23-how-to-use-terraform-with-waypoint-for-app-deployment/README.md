# How to Use Terraform with Waypoint for App Deployment

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Waypoint, Application Deployment, HashiCorp, DevOps, CI/CD

Description: Learn how to use Terraform with HashiCorp Waypoint for streamlined application deployment, including building, deploying, and releasing apps across platforms.

---

HashiCorp Waypoint provides a consistent workflow for building, deploying, and releasing applications across any platform. While Terraform manages the underlying infrastructure, Waypoint focuses on the application lifecycle, handling the build, deploy, and release phases. Together, they create a clean separation between infrastructure provisioning and application deployment that simplifies both operations.

This guide covers how to integrate Terraform and Waypoint for a complete infrastructure-to-application deployment workflow.

## Understanding the Terraform-Waypoint Boundary

Terraform provisions the platform infrastructure: Kubernetes clusters, ECS clusters, networking, databases, and other cloud resources. Waypoint then deploys applications onto that platform. This separation means infrastructure teams manage Terraform and application teams use Waypoint, each with the appropriate abstraction level.

## Deploying Waypoint Server with Terraform

Start by deploying the Waypoint server on your existing infrastructure.

```hcl
# ECS cluster for Waypoint server
resource "aws_ecs_cluster" "waypoint" {
  name = "waypoint-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "waypoint-cluster"
    Environment = var.environment
  }
}

# Waypoint server ECS service
resource "aws_ecs_task_definition" "waypoint" {
  family                   = "waypoint-server"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.waypoint_execution.arn
  task_role_arn            = aws_iam_role.waypoint_task.arn

  container_definitions = jsonencode([{
    name  = "waypoint-server"
    image = "hashicorp/waypoint:latest"
    portMappings = [
      {
        containerPort = 9701
        protocol      = "tcp"
      },
      {
        containerPort = 9702
        protocol      = "tcp"
      }
    ]
    command = [
      "server", "run",
      "-accept-tos",
      "-vv",
      "-db=/data/waypoint.db",
      "-listen-grpc=0.0.0.0:9701",
      "-listen-http=0.0.0.0:9702"
    ]
    mountPoints = [{
      sourceVolume  = "waypoint-data"
      containerPath = "/data"
      readOnly      = false
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.waypoint.name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "waypoint"
      }
    }
  }])

  volume {
    name = "waypoint-data"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.waypoint.id
    }
  }
}

resource "aws_ecs_service" "waypoint" {
  name            = "waypoint-server"
  cluster         = aws_ecs_cluster.waypoint.id
  task_definition = aws_ecs_task_definition.waypoint.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.waypoint.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.waypoint_grpc.arn
    container_name   = "waypoint-server"
    container_port   = 9701
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.waypoint_http.arn
    container_name   = "waypoint-server"
    container_port   = 9702
  }
}

# EFS for Waypoint data persistence
resource "aws_efs_file_system" "waypoint" {
  creation_token = "waypoint-data"
  encrypted      = true

  tags = {
    Name = "waypoint-data"
  }
}
```

## Creating the Waypoint Configuration

Define the waypoint.hcl file that describes how your application is built, deployed, and released.

```hcl
# waypoint.hcl - Application deployment configuration
project = "web-application"

# Build phase - create a Docker image
app "api" {
  build {
    use "docker" {
      dockerfile = "Dockerfile"
    }

    registry {
      use "aws-ecr" {
        region     = "us-east-1"
        repository = "web-app-api"
        tag        = gitrefpretty()
      }
    }
  }

  # Deploy phase - deploy to ECS
  deploy {
    use "aws-ecs" {
      region = "us-east-1"
      memory = 512
      cpu    = 256

      count = 2

      subnets          = ["subnet-abc123", "subnet-def456"]
      security_group_ids = ["sg-abc123"]

      logging {
        create_group = true
        region       = "us-east-1"
      }
    }
  }

  # Release phase - configure the load balancer
  release {
    use "aws-alb" {
      listener_arn = "arn:aws:elasticloadbalancing:us-east-1:123456789:listener/app/web-alb/abc123/def456"
    }
  }
}
```

## Passing Terraform Outputs to Waypoint

Terraform outputs provide the infrastructure details that Waypoint needs for deployment.

```hcl
# Terraform outputs for Waypoint consumption
output "waypoint_config" {
  description = "Configuration values for Waypoint deployment"
  value = {
    ecr_repository_url = aws_ecr_repository.app.repository_url
    ecs_cluster_name   = aws_ecs_cluster.app.name
    subnet_ids         = var.private_subnet_ids
    security_group_id  = aws_security_group.app.id
    alb_listener_arn   = aws_lb_listener.https.arn
    log_group_name     = aws_cloudwatch_log_group.app.name
    execution_role_arn = aws_iam_role.ecs_execution.arn
    task_role_arn      = aws_iam_role.ecs_task.arn
  }
}

# Generate a Waypoint variables file from Terraform outputs
resource "local_file" "waypoint_vars" {
  content = templatefile("${path.module}/templates/waypoint-vars.tftpl", {
    ecr_repo         = aws_ecr_repository.app.repository_url
    cluster_name     = aws_ecs_cluster.app.name
    subnets          = jsonencode(var.private_subnet_ids)
    security_groups  = jsonencode([aws_security_group.app.id])
    listener_arn     = aws_lb_listener.https.arn
    region           = var.region
    execution_role   = aws_iam_role.ecs_execution.arn
    task_role        = aws_iam_role.ecs_task.arn
  })

  filename = "${path.module}/../waypoint-vars.hcl"
}
```

## Kubernetes Deployment with Waypoint

If your Terraform provisions a Kubernetes cluster, Waypoint can deploy applications to it.

```hcl
# Terraform provisions the EKS cluster
resource "aws_eks_cluster" "main" {
  name     = "app-cluster-${var.environment}"
  role_arn = aws_iam_role.cluster.arn
  version  = "1.28"

  vpc_config {
    subnet_ids = var.private_subnet_ids
  }
}

# Output kubeconfig for Waypoint
output "kubeconfig" {
  description = "Kubeconfig for Waypoint Kubernetes deployments"
  value = {
    cluster_endpoint = aws_eks_cluster.main.endpoint
    cluster_ca       = aws_eks_cluster.main.certificate_authority[0].data
    cluster_name     = aws_eks_cluster.main.name
  }
  sensitive = true
}
```

The corresponding Waypoint configuration for Kubernetes deployment:

```hcl
# waypoint.hcl for Kubernetes deployment
app "api" {
  build {
    use "docker" {
      dockerfile = "Dockerfile"
    }

    registry {
      use "aws-ecr" {
        region     = var.region
        repository = var.ecr_repo
        tag        = gitrefpretty()
      }
    }
  }

  deploy {
    use "kubernetes" {
      probe_path = "/health"
      replicas   = 3

      resources {
        requests = {
          cpu    = "100m"
          memory = "128Mi"
        }
        limits = {
          cpu    = "500m"
          memory = "512Mi"
        }
      }
    }
  }

  release {
    use "kubernetes" {
      load_balancer = true
      port          = 80
    }
  }
}
```

## CI/CD Pipeline Integration

Integrate Terraform and Waypoint in a CI/CD pipeline for automated deployments.

```hcl
# Terraform provisions CI/CD pipeline resources
resource "aws_codepipeline" "app_deploy" {
  name     = "app-deployment-pipeline"
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    location = aws_s3_bucket.pipeline.id
    type     = "S3"
  }

  stage {
    name = "Source"
    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]
      configuration = {
        ConnectionArn    = var.codestar_connection_arn
        FullRepositoryId = var.repository_id
        BranchName       = var.branch_name
      }
    }
  }

  stage {
    name = "Infrastructure"
    action {
      name            = "TerraformApply"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      input_artifacts = ["source_output"]
      configuration = {
        ProjectName = aws_codebuild_project.terraform.name
      }
    }
  }

  stage {
    name = "Deploy"
    action {
      name            = "WaypointDeploy"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      input_artifacts = ["source_output"]
      configuration = {
        ProjectName = aws_codebuild_project.waypoint.name
      }
    }
  }
}
```

## Best Practices

Keep Terraform and Waypoint responsibilities clearly separated. Terraform manages infrastructure that changes infrequently, while Waypoint manages application deployments that happen frequently. Use Terraform outputs to bridge the two tools, passing infrastructure details like subnet IDs, security groups, and cluster endpoints to Waypoint configuration.

Version your Waypoint configuration alongside your application code, not your infrastructure code. This ensures that deployment configuration changes are reviewed with the application changes they support.

For related deployment patterns, see our guides on [using Terraform with Nomad for workload orchestration](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-with-nomad-for-workload-orchestration/view) and [using Terraform with Docker Compose](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-with-docker-compose/view).

## Conclusion

Terraform and Waypoint create a two-layer deployment model that serves both infrastructure and application teams well. Terraform provides the stable platform layer, and Waypoint provides the application deployment layer. This separation of concerns means infrastructure changes do not require application redeployment, and application deployments do not require infrastructure changes. The result is a more manageable, faster, and safer deployment process that scales with your organization.
