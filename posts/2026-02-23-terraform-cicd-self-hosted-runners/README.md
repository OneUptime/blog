# How to Set Up Terraform CI/CD with Self-Hosted Runners

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Self-Hosted Runners, GitHub Actions, DevOps, Infrastructure as Code

Description: Configure self-hosted CI/CD runners for Terraform pipelines to access private networks, reduce costs, improve performance, and meet compliance requirements.

---

Cloud-hosted runners work fine for many Terraform pipelines, but sometimes you need self-hosted runners. Maybe your infrastructure lives in a private network. Maybe you need to access an on-premises Terraform Enterprise server. Maybe compliance requires that your pipeline runs within your own infrastructure. Or maybe you just want to avoid paying for GitHub Actions minutes.

This guide walks through setting up self-hosted runners specifically optimized for Terraform workflows.

## When You Need Self-Hosted Runners

Common reasons to go self-hosted for Terraform:

- Accessing resources in private VPCs or on-premises networks
- Connecting to private module registries behind a firewall
- Meeting compliance requirements that prohibit third-party CI infrastructure
- Reducing costs for high-volume pipelines
- Caching Terraform providers and modules locally for speed
- Running pipelines in air-gapped environments

## Setting Up GitHub Actions Self-Hosted Runners

### Runner on EC2

Deploy a runner instance inside your VPC:

```hcl
# runner.tf
# EC2 instance for GitHub Actions runner
resource "aws_instance" "github_runner" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.large"
  subnet_id     = var.private_subnet_id  # Place in private subnet

  # IAM role for Terraform operations
  iam_instance_profile = aws_iam_instance_profile.runner.name

  # User data to install and configure the runner
  user_data = templatefile("${path.module}/runner-userdata.sh", {
    github_org    = var.github_org
    runner_token  = var.runner_registration_token
    runner_labels = "terraform,self-hosted,linux"
  })

  root_block_device {
    volume_size = 50  # Space for Terraform providers and cache
    volume_type = "gp3"
  }

  tags = {
    Name = "github-actions-runner"
    Role = "ci-runner"
  }
}

# Security group allowing outbound only
resource "aws_security_group" "runner" {
  name_prefix = "github-runner-"
  vpc_id      = var.vpc_id

  # No inbound rules needed - runner initiates connections

  # Outbound to GitHub API
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound to internal resources
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
  }
}

# IAM role with Terraform permissions
resource "aws_iam_role" "runner" {
  name = "github-actions-runner"

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
  name = "github-actions-runner"
  role = aws_iam_role.runner.name
}
```

The user data script to bootstrap the runner:

```bash
#!/bin/bash
# runner-userdata.sh
set -euo pipefail

# Install dependencies
apt-get update
apt-get install -y curl jq unzip

# Install Terraform
TERRAFORM_VERSION="1.7.4"
curl -Lo terraform.zip "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
unzip terraform.zip -d /usr/local/bin/
rm terraform.zip

# Install GitHub Actions runner
RUNNER_VERSION="2.314.1"
mkdir -p /opt/actions-runner
cd /opt/actions-runner

curl -Lo runner.tar.gz "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
tar xzf runner.tar.gz
rm runner.tar.gz

# Create runner user
useradd -m -s /bin/bash runner
chown -R runner:runner /opt/actions-runner

# Configure the runner
su - runner -c "
  cd /opt/actions-runner
  ./config.sh \
    --url https://github.com/${github_org} \
    --token ${runner_token} \
    --labels ${runner_labels} \
    --unattended \
    --replace
"

# Install and start as a service
./svc.sh install runner
./svc.sh start
```

### Using the Self-Hosted Runner in Workflows

```yaml
# .github/workflows/terraform.yml
name: Terraform
on:
  push:
    branches: [main]

jobs:
  apply:
    # Target your self-hosted runner by label
    runs-on: [self-hosted, terraform]
    steps:
      - uses: actions/checkout@v4

      # No need to install Terraform - it's pre-installed on the runner
      # No need for AWS credentials - runner has an IAM role

      - name: Terraform Init
        working-directory: infrastructure
        run: |
          terraform init

      - name: Terraform Apply
        working-directory: infrastructure
        run: terraform apply -auto-approve
```

## Auto-Scaling Runner Groups

A single runner creates a bottleneck. Use auto-scaling to handle concurrent jobs:

```hcl
# asg-runners.tf
# Launch template for runner instances
resource "aws_launch_template" "runner" {
  name_prefix   = "github-runner-"
  image_id      = data.aws_ami.runner.id  # Pre-baked AMI with runner installed
  instance_type = "t3.large"

  iam_instance_profile {
    name = aws_iam_instance_profile.runner.name
  }

  vpc_security_group_ids = [aws_security_group.runner.id]

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "github-runner-asg"
    }
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "runners" {
  name                = "github-runners"
  desired_capacity    = 2
  min_size            = 1
  max_size            = 10
  vpc_zone_identifier = var.private_subnet_ids

  launch_template {
    id      = aws_launch_template.runner.id
    version = "$Latest"
  }

  # Scale based on custom metric (pending jobs)
  tag {
    key                 = "Role"
    value               = "github-runner"
    propagate_at_launch = true
  }
}

# Scale up when jobs are queued
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "runner-scale-up"
  scaling_adjustment     = 2
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 120
  autoscaling_group_name = aws_autoscaling_group.runners.name
}
```

## Ephemeral Runners with Actions Runner Controller

For Kubernetes environments, Actions Runner Controller (ARC) provides ephemeral runners that spin up per job and get destroyed after:

```yaml
# runner-deployment.yaml
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: terraform-runners
spec:
  replicas: 3
  template:
    spec:
      repository: myorg/infrastructure
      labels:
        - terraform
        - self-hosted
      env:
        - name: RUNNER_FEATURE_FLAG_EPHEMERAL
          value: "true"
      resources:
        limits:
          cpu: "2"
          memory: "4Gi"
      volumeMounts:
        # Persistent cache for Terraform providers
        - name: terraform-cache
          mountPath: /home/runner/.terraform.d/plugin-cache
    volumes:
      - name: terraform-cache
        persistentVolumeClaim:
          claimName: terraform-provider-cache
```

## Caching Terraform Providers

One of the biggest benefits of self-hosted runners is persistent caching. Terraform providers can be hundreds of MB:

```bash
# Set up provider cache on the runner
mkdir -p /opt/terraform-cache/plugins

# Configure Terraform to use the cache
cat > /home/runner/.terraformrc << 'EOF'
plugin_cache_dir = "/opt/terraform-cache/plugins"
disable_checkpoint = true
EOF
```

In your pipeline, the cache is already warm:

```yaml
- name: Terraform Init
  env:
    TF_PLUGIN_CACHE_DIR: /opt/terraform-cache/plugins
  run: |
    # First run downloads providers, subsequent runs use cache
    terraform init
```

## Security Hardening for Self-Hosted Runners

Self-hosted runners require extra security attention:

```yaml
# runner-hardening.yml
# Use ephemeral runners that get destroyed after each job
jobs:
  apply:
    runs-on: [self-hosted, terraform, ephemeral]
    steps:
      # Clean workspace before use
      - name: Clean Workspace
        run: |
          rm -rf "$GITHUB_WORKSPACE"/*
          rm -rf /tmp/terraform-*

      - uses: actions/checkout@v4

      - name: Terraform Apply
        run: terraform apply -auto-approve

      # Clean up sensitive files after
      - name: Post-Job Cleanup
        if: always()
        run: |
          rm -rf .terraform/
          rm -f tfplan
          rm -f *.tfstate
```

Network isolation is also important:

```hcl
# Restrict runner network access
resource "aws_security_group" "runner" {
  name_prefix = "runner-"
  vpc_id      = var.vpc_id

  # Allow HTTPS to GitHub (for runner registration)
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # GitHub IPs change frequently
  }

  # Allow access to internal Terraform state backend
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.state_bucket_vpc_endpoint_cidr]
  }

  # Block everything else
}
```

## Monitoring Runner Health

Keep an eye on your runners:

```yaml
# .github/workflows/runner-health.yml
name: Runner Health Check
on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes

jobs:
  health:
    runs-on: [self-hosted, terraform]
    timeout-minutes: 5
    steps:
      - name: Check Terraform
        run: terraform version

      - name: Check Disk Space
        run: |
          USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
          if [ "$USAGE" -gt 80 ]; then
            echo "WARNING: Disk usage at ${USAGE}%"
            # Clean up old provider cache
            find /opt/terraform-cache -mtime +7 -delete
          fi

      - name: Check Connectivity
        run: |
          # Verify access to state backend
          aws s3 ls s3://my-terraform-state/ > /dev/null
          echo "State backend accessible"
```

## Summary

Setting up self-hosted runners for Terraform CI/CD involves:

1. Deploying runner instances in your VPC with appropriate IAM roles
2. Pre-installing Terraform and configuring provider caching
3. Using auto-scaling to handle concurrent pipeline jobs
4. Hardening security with ephemeral runners and network isolation
5. Monitoring runner health and disk usage

Self-hosted runners give you better performance through caching, access to private networks, and compliance control. The tradeoff is maintenance overhead. For most teams, start with cloud-hosted runners and switch to self-hosted when you hit a specific limitation. For more pipeline optimization tips, see [optimizing Terraform CI/CD pipeline performance](https://oneuptime.com/blog/post/2026-02-23-optimize-terraform-cicd-pipeline-performance/view).
