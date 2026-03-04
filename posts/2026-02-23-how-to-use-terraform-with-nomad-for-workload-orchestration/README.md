# How to Use Terraform with Nomad for Workload Orchestration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Nomad, Workload Orchestration, HashiCorp, Containers, Scheduling

Description: Learn how to use Terraform with HashiCorp Nomad for workload orchestration, including deploying the Nomad cluster, registering jobs, and managing rolling updates.

---

HashiCorp Nomad is a flexible workload orchestrator that can schedule containers, VMs, and standalone applications. Unlike Kubernetes, which is exclusively focused on containers, Nomad can manage a wider variety of workloads with simpler operational overhead. Terraform integrates with Nomad to provision the cluster infrastructure and manage job definitions, giving you a unified workflow for both infrastructure and workload management.

This guide covers how to deploy a Nomad cluster with Terraform and manage workloads through Terraform's Nomad provider.

## Understanding Nomad's Architecture

Nomad uses a server-client architecture. Server nodes form a consensus cluster that handles scheduling decisions. Client nodes run the actual workloads. Terraform provisions both the server and client infrastructure and can also submit job definitions to the running cluster.

## Deploying a Nomad Cluster with Terraform

Start by provisioning the Nomad servers and clients on AWS.

```hcl
# Nomad server instances
resource "aws_instance" "nomad_server" {
  count         = 3
  ami           = var.nomad_ami_id
  instance_type = "t3.medium"
  key_name      = var.key_name
  subnet_id     = var.private_subnet_ids[count.index % length(var.private_subnet_ids)]

  vpc_security_group_ids = [aws_security_group.nomad_server.id]
  iam_instance_profile   = aws_iam_instance_profile.nomad.name

  user_data = templatefile("${path.module}/templates/nomad-server.sh", {
    nomad_version   = var.nomad_version
    server_count    = 3
    datacenter      = var.datacenter
    region          = var.nomad_region
    encryption_key  = var.nomad_encryption_key
    retry_join_tag  = "nomad-server-${var.environment}"
    consul_address  = var.consul_address
  })

  tags = {
    Name             = "nomad-server-${count.index}"
    Environment      = var.environment
    nomad_server_tag = "nomad-server-${var.environment}"
  }
}

# Nomad client instances for Docker workloads
resource "aws_instance" "nomad_client_docker" {
  count         = var.docker_client_count
  ami           = var.nomad_docker_ami_id
  instance_type = var.docker_client_instance_type
  key_name      = var.key_name
  subnet_id     = var.private_subnet_ids[count.index % length(var.private_subnet_ids)]

  vpc_security_group_ids = [aws_security_group.nomad_client.id]
  iam_instance_profile   = aws_iam_instance_profile.nomad.name

  user_data = templatefile("${path.module}/templates/nomad-client.sh", {
    nomad_version  = var.nomad_version
    datacenter     = var.datacenter
    region         = var.nomad_region
    retry_join_tag = "nomad-server-${var.environment}"
    consul_address = var.consul_address
    node_class     = "docker"
  })

  root_block_device {
    volume_size = 100
    volume_type = "gp3"
  }

  tags = {
    Name        = "nomad-client-docker-${count.index}"
    Environment = var.environment
    NodeClass   = "docker"
  }
}

# Nomad client instances for raw exec workloads
resource "aws_instance" "nomad_client_raw" {
  count         = var.raw_client_count
  ami           = var.nomad_raw_ami_id
  instance_type = var.raw_client_instance_type
  key_name      = var.key_name
  subnet_id     = var.private_subnet_ids[count.index % length(var.private_subnet_ids)]

  vpc_security_group_ids = [aws_security_group.nomad_client.id]
  iam_instance_profile   = aws_iam_instance_profile.nomad.name

  user_data = templatefile("${path.module}/templates/nomad-client.sh", {
    nomad_version  = var.nomad_version
    datacenter     = var.datacenter
    region         = var.nomad_region
    retry_join_tag = "nomad-server-${var.environment}"
    consul_address = var.consul_address
    node_class     = "batch"
  })

  tags = {
    Name        = "nomad-client-raw-${count.index}"
    Environment = var.environment
    NodeClass   = "batch"
  }
}

# Security group for Nomad servers
resource "aws_security_group" "nomad_server" {
  name_prefix = "nomad-server-"
  vpc_id      = var.vpc_id

  # Nomad HTTP API
  ingress {
    from_port   = 4646
    to_port     = 4646
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Nomad HTTP API"
  }

  # Nomad RPC
  ingress {
    from_port   = 4647
    to_port     = 4647
    protocol    = "tcp"
    self        = true
    description = "Nomad RPC"
  }

  # Nomad Serf
  ingress {
    from_port   = 4648
    to_port     = 4648
    protocol    = "tcp"
    self        = true
    description = "Nomad Serf TCP"
  }

  ingress {
    from_port   = 4648
    to_port     = 4648
    protocol    = "udp"
    self        = true
    description = "Nomad Serf UDP"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "nomad-server-sg-${var.environment}"
  }
}
```

## Managing Nomad Jobs with Terraform

Use the Nomad provider to submit and manage job definitions.

```hcl
# Configure the Nomad provider
provider "nomad" {
  address = "http://${aws_instance.nomad_server[0].private_ip}:4646"
  region  = var.nomad_region
}

# Deploy a web service job
resource "nomad_job" "web_service" {
  jobspec = templatefile("${path.module}/jobs/web-service.nomad.hcl", {
    app_version  = var.app_version
    image        = "${var.ecr_repo_url}:${var.app_version}"
    environment  = var.environment
    count        = var.web_service_count
    cpu          = var.web_service_cpu
    memory       = var.web_service_memory
    db_host      = aws_db_instance.main.address
    redis_host   = aws_elasticache_cluster.main.cache_nodes[0].address
  })

  # Detect changes in the job spec
  purge_on_destroy = true
}

# Deploy a batch processing job
resource "nomad_job" "batch_processor" {
  jobspec = templatefile("${path.module}/jobs/batch-processor.nomad.hcl", {
    image       = "${var.ecr_repo_url}/batch:${var.batch_version}"
    environment = var.environment
    schedule    = "@hourly"
  })
}
```

## Creating Nomad Job Templates

Define Nomad job files that Terraform renders with environment-specific values.

```hcl
# jobs/web-service.nomad.hcl
job "web-service" {
  datacenters = ["dc1"]
  type        = "service"

  # Update strategy for rolling deployments
  update {
    max_parallel      = 1
    min_healthy_time  = "30s"
    healthy_deadline  = "5m"
    progress_deadline = "10m"
    auto_revert       = true
    canary            = 1
  }

  # Spread across availability zones
  spread {
    attribute = "$${node.datacenter}"
  }

  group "web" {
    count = ${count}

    # Networking
    network {
      port "http" {
        to = 3000
      }
    }

    # Service registration with Consul
    service {
      name = "web-service"
      port = "http"

      tags = [
        "traefik.enable=true",
        "traefik.http.routers.web.rule=Host(`app.example.com`)",
      ]

      check {
        type     = "http"
        path     = "/health"
        interval = "10s"
        timeout  = "3s"
      }
    }

    # Container task
    task "app" {
      driver = "docker"

      config {
        image = "${image}"
        ports = ["http"]
      }

      env {
        NODE_ENV   = "${environment}"
        DB_HOST    = "${db_host}"
        REDIS_HOST = "${redis_host}"
      }

      resources {
        cpu    = ${cpu}
        memory = ${memory}
      }

      # Vault integration for secrets
      vault {
        policies = ["web-service"]
      }

      template {
        data = <<-EOT
          {{ with secret "secret/data/app/${environment}/database" }}
          DB_PASSWORD={{ .Data.data.password }}
          {{ end }}
        EOT
        destination = "secrets/db.env"
        env         = true
      }
    }
  }
}
```

## Auto-Scaling Nomad Clients

Scale Nomad client nodes based on cluster utilization.

```hcl
# Auto Scaling Group for Nomad clients
resource "aws_autoscaling_group" "nomad_clients" {
  name_prefix         = "nomad-client-"
  desired_capacity    = var.nomad_client_desired
  min_size            = var.nomad_client_min
  max_size            = var.nomad_client_max
  vpc_zone_identifier = var.private_subnet_ids

  launch_template {
    id      = aws_launch_template.nomad_client.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "nomad-client-asg"
    propagate_at_launch = true
  }
}

# Scaling policy based on CPU utilization
resource "aws_autoscaling_policy" "nomad_scale_up" {
  name                   = "nomad-client-scale-up"
  scaling_adjustment     = 2
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.nomad_clients.name
}

resource "aws_cloudwatch_metric_alarm" "nomad_cpu_high" {
  alarm_name          = "nomad-client-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 70
  alarm_actions       = [aws_autoscaling_policy.nomad_scale_up.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.nomad_clients.name
  }
}
```

## Nomad ACL Policies with Terraform

Manage Nomad access control through Terraform.

```hcl
# Nomad ACL policy for developers
resource "nomad_acl_policy" "developer" {
  name        = "developer"
  description = "Policy for developer access"

  rules_hcl = <<-EOT
    namespace "default" {
      policy       = "read"
      capabilities = ["submit-job", "read-logs", "alloc-exec"]
    }

    namespace "dev-*" {
      policy       = "write"
      capabilities = ["submit-job", "read-logs", "alloc-exec", "dispatch-job"]
    }

    node {
      policy = "read"
    }
  EOT
}

# Nomad ACL policy for CI/CD pipeline
resource "nomad_acl_policy" "cicd" {
  name        = "cicd-deployer"
  description = "Policy for CI/CD deployment pipeline"

  rules_hcl = <<-EOT
    namespace "*" {
      policy       = "write"
      capabilities = ["submit-job", "dispatch-job", "read-logs"]
    }

    node {
      policy = "read"
    }
  EOT
}
```

## Best Practices

Run at least three Nomad server nodes for high availability and use Consul for automatic server discovery. Use Nomad namespaces to isolate workloads between teams and environments. Implement rolling update strategies with canary deployments for zero-downtime releases.

For related tools in the HashiCorp ecosystem, see our guides on [using Terraform with Consul for service discovery](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-with-consul-for-service-discovery/view) and [using Terraform with Vault for secret management](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-with-vault-for-secret-management/view).

## Conclusion

Terraform and Nomad together provide a streamlined approach to infrastructure provisioning and workload orchestration. Terraform manages the cluster infrastructure, auto-scaling configuration, and ACL policies, while Nomad handles the scheduling and execution of diverse workloads. This combination is particularly appealing for teams that need container orchestration without the operational complexity of Kubernetes, or that need to manage a mix of containerized and non-containerized workloads in a single platform.
