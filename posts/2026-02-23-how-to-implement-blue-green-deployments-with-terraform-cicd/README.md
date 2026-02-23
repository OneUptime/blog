# How to Implement Blue-Green Deployments with Terraform CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Blue-Green Deployment, CI/CD, DevOps, Infrastructure as Code, Zero Downtime

Description: Learn how to implement blue-green deployment patterns with Terraform CI/CD pipelines for zero-downtime infrastructure updates, including traffic switching, health checks, and rollback.

---

Blue-green deployments give you zero-downtime releases by maintaining two identical production environments. You deploy changes to the inactive environment, validate it works, then switch traffic. If something goes wrong, you switch back in seconds. Implementing this pattern with Terraform and CI/CD requires careful orchestration of infrastructure, traffic routing, and health validation.

## The Blue-Green Pattern

In a blue-green setup:

- **Blue** is the currently active environment serving production traffic
- **Green** is the standby environment where you deploy changes
- A traffic router (load balancer, DNS, or CDN) controls which environment receives traffic
- After deploying to green and validating it, you flip the router to point at green
- Blue becomes the new standby, ready for the next deployment or instant rollback

## Infrastructure Design

```hcl
# variables.tf
variable "active_environment" {
  description = "Which environment is currently active (blue or green)"
  type        = string
  default     = "blue"

  validation {
    condition     = contains(["blue", "green"], var.active_environment)
    error_message = "active_environment must be either 'blue' or 'green'"
  }
}

variable "blue_version" {
  description = "Application version deployed to blue environment"
  type        = string
}

variable "green_version" {
  description = "Application version deployed to green environment"
  type        = string
}
```

```hcl
# main.tf - Blue and green environments with traffic routing
# Blue environment
module "blue" {
  source = "./modules/app-environment"

  name            = "blue"
  app_version     = var.blue_version
  instance_count  = var.active_environment == "blue" ? 3 : 1  # Scale down inactive
  instance_type   = "t3.large"
  subnet_ids      = module.networking.private_subnet_ids
  security_groups = [aws_security_group.app.id]
}

# Green environment
module "green" {
  source = "./modules/app-environment"

  name            = "green"
  app_version     = var.green_version
  instance_count  = var.active_environment == "green" ? 3 : 1
  instance_type   = "t3.large"
  subnet_ids      = module.networking.private_subnet_ids
  security_groups = [aws_security_group.app.id]
}

# Traffic routing via ALB
resource "aws_lb_listener_rule" "app" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = var.active_environment == "blue" ? module.blue.target_group_arn : module.green.target_group_arn
  }

  condition {
    host_header {
      values = ["app.mycompany.com"]
    }
  }
}
```

```hcl
# modules/app-environment/main.tf
variable "name" { type = string }
variable "app_version" { type = string }
variable "instance_count" { type = number }
variable "instance_type" { type = string }
variable "subnet_ids" { type = list(string) }
variable "security_groups" { type = list(string) }

resource "aws_launch_template" "app" {
  name_prefix   = "app-${var.name}-"
  image_id      = data.aws_ami.app.id
  instance_type = var.instance_type

  user_data = base64encode(templatefile("${path.module}/userdata.sh", {
    app_version = var.app_version
  }))

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "app-${var.name}"
      Environment = var.name
      Version     = var.app_version
    }
  }
}

resource "aws_autoscaling_group" "app" {
  name                = "app-${var.name}"
  desired_capacity    = var.instance_count
  min_size            = 1
  max_size            = var.instance_count * 2
  vpc_zone_identifier = var.subnet_ids
  target_group_arns   = [aws_lb_target_group.app.arn]

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
    }
  }
}

resource "aws_lb_target_group" "app" {
  name     = "app-${var.name}"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 10
    timeout             = 5
  }
}

output "target_group_arn" {
  value = aws_lb_target_group.app.arn
}
```

## CI/CD Pipeline for Blue-Green

The deployment pipeline has four stages:

1. Deploy to inactive environment
2. Run health checks on inactive environment
3. Switch traffic
4. Monitor and rollback if needed

```yaml
# .github/workflows/blue-green-deploy.yml
name: Blue-Green Deployment

on:
  workflow_dispatch:
    inputs:
      app_version:
        description: "Application version to deploy"
        required: true
        type: string

permissions:
  id-token: write
  contents: read

env:
  TF_DIR: terraform

jobs:
  determine-target:
    runs-on: ubuntu-latest
    outputs:
      target_env: ${{ steps.current.outputs.target }}
      current_env: ${{ steps.current.outputs.current }}

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0
          terraform_wrapper: false

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-cicd
          aws-region: us-east-1

      - name: Determine target environment
        id: current
        run: |
          cd $TF_DIR
          terraform init -no-color

          # Read current active environment from Terraform state
          CURRENT=$(terraform output -raw active_environment 2>/dev/null || echo "blue")

          if [ "$CURRENT" = "blue" ]; then
            echo "current=blue" >> $GITHUB_OUTPUT
            echo "target=green" >> $GITHUB_OUTPUT
          else
            echo "current=green" >> $GITHUB_OUTPUT
            echo "target=blue" >> $GITHUB_OUTPUT
          fi

          echo "Current active: $CURRENT, deploying to: $([ $CURRENT = blue ] && echo green || echo blue)"

  deploy-to-target:
    needs: determine-target
    runs-on: ubuntu-latest
    environment: production-deploy

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-cicd
          aws-region: us-east-1

      - name: Deploy to ${{ needs.determine-target.outputs.target_env }}
        run: |
          cd $TF_DIR
          terraform init -no-color

          TARGET=${{ needs.determine-target.outputs.target_env }}

          # Update the target environment version but keep traffic on current
          terraform apply -no-color -auto-approve \
            -var="${TARGET}_version=${{ inputs.app_version }}" \
            -var="active_environment=${{ needs.determine-target.outputs.current_env }}"

  health-check:
    needs: [determine-target, deploy-to-target]
    runs-on: ubuntu-latest

    steps:
      - name: Wait for instances to be healthy
        run: |
          TARGET=${{ needs.determine-target.outputs.target_env }}
          ENDPOINT="https://${TARGET}.internal.mycompany.com/health"

          echo "Checking health of $TARGET environment..."

          for i in $(seq 1 30); do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" $ENDPOINT || echo "000")

            if [ "$STATUS" = "200" ]; then
              echo "Health check passed on attempt $i"
              exit 0
            fi

            echo "Attempt $i: status $STATUS. Waiting 10s..."
            sleep 10
          done

          echo "Health check failed after 30 attempts"
          exit 1

  switch-traffic:
    needs: [determine-target, health-check]
    runs-on: ubuntu-latest
    environment: production-switch  # Requires approval

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-cicd
          aws-region: us-east-1

      - name: Switch traffic to ${{ needs.determine-target.outputs.target_env }}
        run: |
          cd $TF_DIR
          terraform init -no-color

          # Switch the active environment
          terraform apply -no-color -auto-approve \
            -var="active_environment=${{ needs.determine-target.outputs.target_env }}"

          echo "Traffic switched to ${{ needs.determine-target.outputs.target_env }}"
```

## Weighted Traffic Shifting

Instead of an instant switch, gradually shift traffic using weighted target groups:

```hcl
# weighted-routing.tf
resource "aws_lb_listener_rule" "app" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type = "forward"

    forward {
      target_group {
        arn    = module.blue.target_group_arn
        weight = var.active_environment == "blue" ? var.blue_weight : (100 - var.blue_weight)
      }

      target_group {
        arn    = module.green.target_group_arn
        weight = var.active_environment == "green" ? var.blue_weight : (100 - var.blue_weight)
      }
    }
  }

  condition {
    host_header {
      values = ["app.mycompany.com"]
    }
  }
}

variable "blue_weight" {
  description = "Percentage of traffic to send to blue (0-100)"
  type        = number
  default     = 100
}
```

Gradually shift traffic in the pipeline:

```yaml
- name: Gradual traffic shift
  run: |
    cd $TF_DIR
    terraform init -no-color

    TARGET=${{ needs.determine-target.outputs.target_env }}

    # Shift 10% of traffic
    terraform apply -auto-approve -var="blue_weight=90"
    sleep 120  # Monitor for 2 minutes

    # Shift 50% of traffic
    terraform apply -auto-approve -var="blue_weight=50"
    sleep 300  # Monitor for 5 minutes

    # Shift 100% of traffic
    terraform apply -auto-approve -var="active_environment=$TARGET" -var="blue_weight=100"
```

## Rollback

Rollback is straightforward - switch traffic back to the previous environment:

```yaml
# .github/workflows/rollback.yml
name: Rollback Deployment

on:
  workflow_dispatch:

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-cicd
          aws-region: us-east-1

      - name: Rollback traffic
        run: |
          cd $TF_DIR
          terraform init -no-color

          CURRENT=$(terraform output -raw active_environment)
          ROLLBACK=$([ "$CURRENT" = "blue" ] && echo "green" || echo "blue")

          echo "Rolling back from $CURRENT to $ROLLBACK"
          terraform apply -no-color -auto-approve \
            -var="active_environment=$ROLLBACK"
```

## Summary

Blue-green deployments with Terraform CI/CD give you zero-downtime releases with instant rollback capability. The key is maintaining two complete environments and using a traffic router to control which one serves production. The CI/CD pipeline orchestrates the deployment, health checking, and traffic switching. For even more safety, use weighted traffic shifting to gradually move traffic and catch issues before they affect all users.

For related deployment patterns, see our guide on [implementing canary deployments with Terraform CI/CD](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-canary-deployments-with-terraform-cicd/view).
