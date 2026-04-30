# How to Deploy GitHub Actions Self-Hosted Runners with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GitHub Action, CI/CD, Self-Hosted Runners, AWS, Kubernetes, Infrastructure as Code

Description: Learn how to deploy GitHub Actions self-hosted runners on AWS EC2 or Kubernetes using OpenTofu for private network access, custom hardware, and cost control.

---

GitHub-hosted runners are convenient but can be limiting when you need direct access to private network resources, more control over hardware, or tighter cost control at scale. Self-hosted runners solve these problems. OpenTofu automates runner deployment and, paired with tools like ARC or an Auto Scaling Group, helps you manage runner capacity so you can focus on your pipelines, not your infrastructure.

## Deploying Runners on Kubernetes with ARC

The Actions Runner Controller (ARC) manages a fleet of Kubernetes-based runners that scale automatically with job demand.

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

provider "kubernetes" {
  host                   = var.cluster_endpoint
  cluster_ca_certificate = base64decode(var.cluster_ca_cert)
  token                  = var.cluster_token
}

provider "helm" {
  kubernetes {
    host                   = var.cluster_endpoint
    cluster_ca_certificate = base64decode(var.cluster_ca_cert)
    token                  = var.cluster_token
  }
}

resource "kubernetes_namespace" "arc_systems" {
  metadata {
    name = "arc-systems"
  }
}

resource "kubernetes_namespace" "arc_runners" {
  metadata {
    name = "arc-runners"
  }
}

# Deploy the ARC controller
resource "helm_release" "arc" {
  name       = "arc"
  repository = "oci://ghcr.io/actions/actions-runner-controller-charts"
  chart      = "gha-runner-scale-set-controller"
  version    = "0.14.1"
  namespace  = kubernetes_namespace.arc_systems.metadata[0].name

  wait    = true
  timeout = 300
}

# Store GitHub authentication credentials (PAT example)
resource "kubernetes_secret" "github_credentials" {
  metadata {
    name      = "pre-defined-secret"
    namespace = kubernetes_namespace.arc_runners.metadata[0].name
  }

  data = {
    github_token = var.github_token
  }
}

# Deploy a runner scale set for a specific repository
resource "helm_release" "runner_scale_set" {
  depends_on = [helm_release.arc]

  name       = "arc-runner-set"
  repository = "oci://ghcr.io/actions/actions-runner-controller-charts"
  chart      = "gha-runner-scale-set"
  version    = "0.14.1"
  namespace  = kubernetes_namespace.arc_runners.metadata[0].name

  values = [
    yamlencode({
      # GitHub repository to register runners for
      githubConfigUrl    = "https://github.com/${var.github_org}/${var.github_repo}"
      githubConfigSecret = kubernetes_secret.github_credentials.metadata[0].name

      # Scale from 0 to 10 runners based on job demand
      minRunners = 0
      maxRunners = 10

      # Runner pod template
      template = {
        spec = {
          containers = [
            {
              name  = "runner"
              image = "ghcr.io/actions/actions-runner:latest"
              resources = {
                requests = {
                  cpu    = "500m"
                  memory = "512Mi"
                }
                limits = {
                  cpu    = "2"
                  memory = "4Gi"
                }
              }
            }
          ]
        }
      }
    })
  ]
}
```

## Deploying Runners on EC2 with an Auto Scaling Group

```hcl
# ec2_runner.tf
# Launch template for runner instances
resource "aws_launch_template" "github_runner" {
  name_prefix   = "github-runner-"
  image_id      = data.aws_ami.ubuntu_2204.id
  instance_type = var.runner_instance_type

  iam_instance_profile {
    arn = aws_iam_instance_profile.runner.arn
  }

  vpc_security_group_ids = [aws_security_group.runner.id]

  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -e

    # Install runner dependencies
    apt-get update
    apt-get install -y curl jq

    # Create runner user
    useradd -m runner
    mkdir -p /home/runner/actions-runner
    cd /home/runner/actions-runner

    # Download the latest runner package
    RUNNER_VERSION=$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest | jq -er '.tag_name' | sed 's/v//')
    curl -fsSL -o actions-runner-linux-x64.tar.gz -L "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
    tar xzf ./actions-runner-linux-x64.tar.gz
    chown -R runner:runner /home/runner/actions-runner

    # Fetch a fresh runner registration token at boot
    RUNNER_REGISTRATION_TOKEN=$(curl -fsSL \
      -X POST \
      -H "Accept: application/vnd.github+json" \
      -H "Authorization: Bearer ${var.github_pat}" \
      -H "X-GitHub-Api-Version: 2026-03-10" \
      https://api.github.com/orgs/${var.github_org}/actions/runners/registration-token \
      | jq -er '.token')

    # Register and start the runner
    sudo -u runner ./config.sh \
      --url "https://github.com/${var.github_org}" \
      --token "${RUNNER_REGISTRATION_TOKEN}" \
      --labels "self-hosted,linux,x64,${var.environment}" \
      --unattended

    # Install as a systemd service
    ./svc.sh install runner
    ./svc.sh start
  EOF
  )
}

resource "aws_autoscaling_group" "github_runners" {
  name                = "github-action-runners"
  min_size            = var.min_runners
  max_size            = var.max_runners
  desired_capacity    = var.desired_runners
  vpc_zone_identifier = var.private_subnet_ids

  launch_template {
    id      = aws_launch_template.github_runner.id
    version = "$Latest"
  }
}
```

## Best Practices

- Use ARC on Kubernetes for queue-driven scaling - runner pods can scale to zero when idle.
- Use GitHub Apps instead of PATs to authenticate runner provisioning - Apps have better security controls and audit logging.
- On EC2, pair the Auto Scaling Group with scaling policies or webhook-driven automation if you want capacity changes to follow GitHub job demand.
- Assign runners to specific repository or organization labels to route jobs to appropriately configured hardware.
- Isolate runner network access so each runner can only reach the resources it needs for deployment, not all internal services.
- Generate runner registration tokens just in time during provisioning instead of storing them in OpenTofu configuration - GitHub registration tokens expire after one hour.
