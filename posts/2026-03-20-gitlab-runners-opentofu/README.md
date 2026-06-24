# How to Deploy GitLab Runners with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GitLab, CI/CD, Runner, AWS, Kubernetes, Infrastructure as Code

Description: Learn how to deploy GitLab CI/CD runners using OpenTofu on EC2 or Kubernetes, with auto-scaling configuration and secure registration token management.

---

GitLab Runners execute CI/CD pipeline jobs. Deploying runners manually leads to inconsistent configurations and hard-to-debug pipelines. With OpenTofu, you can deploy and configure runners as code, ensuring every environment has properly configured, consistently scaled runner fleets.

## Deploying GitLab Runner on Kubernetes with Helm

The Kubernetes executor scales runners dynamically, spinning up a new pod for each job.

```hcl
# main.tf

terraform {
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
  }
}

provider "helm" {
  kubernetes {
    host                   = var.cluster_endpoint
    cluster_ca_certificate = base64decode(var.cluster_ca_cert)
    token                  = var.cluster_token
  }
}

provider "kubernetes" {
  host                   = var.cluster_endpoint
  cluster_ca_certificate = base64decode(var.cluster_ca_cert)
  token                  = var.cluster_token
}

resource "kubernetes_namespace" "gitlab_runner" {
  metadata {
    name = "gitlab-runner"
  }
}

# Store the runner authentication token as a Kubernetes secret
resource "kubernetes_secret" "runner_token" {
  metadata {
    name      = "gitlab-runner-secret"
    namespace = kubernetes_namespace.gitlab_runner.metadata[0].name
  }

  data = {
    runner-registration-token = ""
    runner-token              = var.gitlab_runner_token
  }
}

resource "helm_release" "gitlab_runner" {
  name       = "gitlab-runner"
  repository = "https://charts.gitlab.io"
  chart      = "gitlab-runner"
  version    = "0.61.0"
  namespace  = kubernetes_namespace.gitlab_runner.metadata[0].name

  wait    = true
  timeout = 300

  values = [
    yamlencode({
      gitlabUrl = var.gitlab_url

      rbac = {
        create = true
      }

      runners = {
        # Reference the secret that contains the runner token
        secret = kubernetes_secret.runner_token.metadata[0].name

        # Runner configuration
        config = <<-TOML
          [[runners]]
            name = "kubernetes-runner"
            url = "${var.gitlab_url}"
            executor = "kubernetes"
            [runners.kubernetes]
              namespace = "gitlab-runner"
              image = "alpine:latest"
              cpu_request = "100m"
              memory_request = "128Mi"
              cpu_limit = "2"
              memory_limit = "4Gi"
              # Keep privileged mode disabled unless you need Docker-in-Docker
              privileged = false
              [runners.kubernetes.node_selector]
                "kubernetes.io/os" = "linux"
        TOML
      }

      # Concurrent job limit
      concurrent = 10

      resources = {
        requests = {
          cpu    = "100m"
          memory = "128Mi"
        }
        limits = {
          cpu    = "500m"
          memory = "512Mi"
        }
      }
    })
  ]
}
```

## Deploying GitLab Runner on EC2 in an Auto Scaling Group

For workloads that need runners hosted on EC2 instances, you can place Docker executor runner managers in an Auto Scaling Group.

```hcl
# ec2_runner.tf
# Security group for runner instances
resource "aws_security_group" "gitlab_runner" {
  name        = "gitlab-runner-sg"
  description = "GitLab runner EC2 instances"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# IAM role for runner instances
resource "aws_iam_role" "runner" {
  name = "gitlab-runner-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_instance_profile" "runner" {
  name = "gitlab-runner-profile"
  role = aws_iam_role.runner.name
}

# Launch template for runner instances
resource "aws_launch_template" "runner" {
  name_prefix   = "gitlab-runner-"
  image_id      = var.runner_ami_id
  instance_type = "t3.medium"

  iam_instance_profile {
    arn = aws_iam_instance_profile.runner.arn
  }

  vpc_security_group_ids = [aws_security_group.gitlab_runner.id]

  user_data = base64encode(<<-EOF
    #!/bin/bash
    curl -L "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.rpm.sh" | bash
    dnf install -y gitlab-runner docker
    systemctl enable docker
    systemctl start docker
    usermod -aG docker gitlab-runner
    gitlab-runner register \
      --non-interactive \
      --url "${var.gitlab_url}" \
      --token "${var.gitlab_runner_token}" \
      --executor "docker" \
      --docker-image "alpine:latest" \
      --description "ec2-runner-$(hostname)"
    systemctl enable gitlab-runner
    systemctl start gitlab-runner
  EOF
  )
}

# Auto Scaling Group for runner managers
resource "aws_autoscaling_group" "runners" {
  name                = "gitlab-runners"
  min_size            = var.runner_min_count
  max_size            = var.runner_max_count
  desired_capacity    = var.runner_desired_count
  vpc_zone_identifier = var.private_subnet_ids

  launch_template {
    id      = aws_launch_template.runner.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "gitlab-runner"
    propagate_at_launch = true
  }
}
```

## Best Practices

- Use the Kubernetes executor for dynamic scaling and better resource utilization in containerized environments.
- Avoid hard-coding runner authentication tokens in configuration or version control. If OpenTofu manages the secret value, protect access to state because secret data is stored there.
- Set appropriate `concurrent` limits to prevent a single repo from monopolizing all runner capacity.
- Use runner tags to route specific job types (e.g., `docker`, `gpu`, `high-memory`) to appropriately configured runners.
- Use the Kubernetes executor or GitLab Runner autoscaler when you need capacity to expand and contract automatically with job demand.
