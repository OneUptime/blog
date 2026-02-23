# How to Create Service Quotas in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Service Quotas, Limits, Infrastructure as Code, Governance

Description: Learn how to manage and request AWS service quota increases using Terraform to prevent hitting resource limits in production environments.

---

Every AWS service has default limits on how many resources you can create or how much capacity you can use. These limits - officially called service quotas - exist to protect your account and AWS infrastructure from runaway resource creation. But they can also block legitimate growth if you are not proactive about managing them.

Terraform's AWS provider includes resources for viewing current quotas and requesting increases. By managing quota requests through Terraform, you document what limits you have adjusted, why, and in which accounts. This is far better than manually submitting support tickets and hoping someone remembers what was changed.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials with Service Quotas permissions
- Basic understanding of which services you are scaling

## Provider Configuration

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Understanding Service Quotas

Before requesting increases, you need to know what quotas exist and their current values. The `aws_servicequotas_service_quota` data source lets you look these up:

```hcl
# Look up the current EC2 On-Demand instance limit
data "aws_servicequotas_service_quota" "ec2_on_demand" {
  service_code = "ec2"
  quota_code   = "L-1216C47A"  # Running On-Demand Standard instances
}

output "ec2_on_demand_limit" {
  description = "Current EC2 On-Demand instance vCPU limit"
  value       = data.aws_servicequotas_service_quota.ec2_on_demand.value
}

# Look up VPC limits
data "aws_servicequotas_service_quota" "vpc_per_region" {
  service_code = "vpc"
  quota_code   = "L-F678F1CE"  # VPCs per Region
}

output "vpc_limit" {
  description = "Maximum VPCs per region"
  value       = data.aws_servicequotas_service_quota.vpc_per_region.value
}
```

## Finding Quota Codes

The tricky part is knowing the quota code for the limit you want to check. You can look them up with the AWS CLI:

```bash
# List all quotas for a service
aws service-quotas list-service-quotas --service-code ec2

# Search for a specific quota
aws service-quotas list-service-quotas \
  --service-code ec2 \
  --query "Quotas[?contains(QuotaName, 'On-Demand')]"
```

Or use a Terraform data source to list available services:

```hcl
# List available services in Service Quotas
data "aws_servicequotas_service" "ec2" {
  service_name = "Amazon Elastic Compute Cloud (Amazon EC2)"
}

output "ec2_service_code" {
  description = "Service code for EC2"
  value       = data.aws_servicequotas_service.ec2.service_code
}
```

## Requesting Quota Increases

When you need more capacity, submit a quota increase request:

```hcl
# Request an increase for EC2 On-Demand instances
resource "aws_servicequotas_service_quota" "ec2_on_demand_increase" {
  service_code = "ec2"
  quota_code   = "L-1216C47A"  # Running On-Demand Standard instances

  # New desired value
  value = 256
}

# Request more Elastic IPs
resource "aws_servicequotas_service_quota" "elastic_ips" {
  service_code = "ec2"
  quota_code   = "L-0263D0A3"  # EC2-VPC Elastic IPs

  value = 20
}

# Request more VPCs per region
resource "aws_servicequotas_service_quota" "vpcs" {
  service_code = "vpc"
  quota_code   = "L-F678F1CE"  # VPCs per Region

  value = 10
}
```

## Common Quota Increases

Here are the quotas that organizations most frequently need to increase:

```hcl
# Collection of common quota increase requests
locals {
  quota_increases = {
    ec2_on_demand = {
      service_code = "ec2"
      quota_code   = "L-1216C47A"  # On-Demand Standard instances (vCPUs)
      value        = 512
      description  = "Running On-Demand Standard instances"
    }
    ec2_spot = {
      service_code = "ec2"
      quota_code   = "L-34B43A08"  # All Standard Spot Instance Requests
      value        = 256
      description  = "All Standard Spot Instance Requests"
    }
    ebs_volumes = {
      service_code = "ebs"
      quota_code   = "L-D18FCD1D"  # General Purpose SSD (gp2) volume storage
      value        = 100  # in TiB
      description  = "GP2 volume storage in TiB"
    }
    lambda_concurrent = {
      service_code = "lambda"
      quota_code   = "L-B99A9384"  # Concurrent executions
      value        = 3000
      description  = "Lambda concurrent executions"
    }
    rds_instances = {
      service_code = "rds"
      quota_code   = "L-7B6409FD"  # DB instances
      value        = 80
      description  = "RDS DB instances"
    }
    ecs_services = {
      service_code = "ecs"
      quota_code   = "L-9095EBAF"  # Services per cluster
      value        = 2000
      description  = "ECS services per cluster"
    }
    alb_count = {
      service_code = "elasticloadbalancing"
      quota_code   = "L-53DA6B97"  # Application Load Balancers per Region
      value        = 100
      description  = "ALBs per region"
    }
  }
}

# Apply all quota increase requests
resource "aws_servicequotas_service_quota" "increases" {
  for_each = local.quota_increases

  service_code = each.value.service_code
  quota_code   = each.value.quota_code
  value        = each.value.value
}

# Output all quota request statuses
output "quota_requests" {
  description = "Status of quota increase requests"
  value = {
    for k, v in aws_servicequotas_service_quota.increases :
    k => {
      service    = v.service_code
      quota_name = v.quota_name
      requested  = v.value
      status     = v.request_status
    }
  }
}
```

## Monitoring Quota Usage

Create CloudWatch alarms that fire when you approach your quota limits:

```hcl
# CloudWatch alarm for EC2 instance count approaching quota
resource "aws_cloudwatch_metric_alarm" "ec2_quota_usage" {
  alarm_name          = "ec2-on-demand-quota-80-percent"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 80

  metric_query {
    id          = "usage_pct"
    expression  = "(usage / quota) * 100"
    label       = "Quota Usage Percentage"
    return_data = true
  }

  metric_query {
    id = "usage"
    metric {
      metric_name = "ResourceCount"
      namespace   = "AWS/Usage"
      period      = 300
      stat        = "Maximum"

      dimensions = {
        Type     = "Resource"
        Service  = "EC2"
        Class    = "Standard/OnDemand"
        Resource = "vCPU"
      }
    }
  }

  metric_query {
    id = "quota"
    metric {
      metric_name = "ServiceQuota"
      namespace   = "AWS/Usage"
      period      = 300
      stat        = "Maximum"

      dimensions = {
        Type     = "Resource"
        Service  = "EC2"
        Class    = "Standard/OnDemand"
        Resource = "vCPU"
      }
    }
  }

  alarm_description = "EC2 On-Demand vCPU usage is above 80% of quota"
  alarm_actions     = [var.sns_topic_arn]

  tags = {
    Purpose = "quota-monitoring"
  }
}

variable "sns_topic_arn" {
  description = "SNS topic for quota alerts"
  type        = string
  default     = ""
}
```

## Multi-Region Quota Management

Some quotas are per-region. If you deploy across multiple regions, you need to request increases in each one:

```hcl
# Define regions where you need increased quotas
variable "active_regions" {
  description = "AWS regions where workloads run"
  type        = list(string)
  default     = ["us-east-1", "us-west-2", "eu-west-1"]
}

# Create provider aliases for each region
provider "aws" {
  alias  = "us_west_2"
  region = "us-west-2"
}

provider "aws" {
  alias  = "eu_west_1"
  region = "eu-west-1"
}

# Request EC2 quota increase in us-west-2
resource "aws_servicequotas_service_quota" "ec2_us_west" {
  provider     = aws.us_west_2
  service_code = "ec2"
  quota_code   = "L-1216C47A"
  value        = 256
}

# Request EC2 quota increase in eu-west-1
resource "aws_servicequotas_service_quota" "ec2_eu_west" {
  provider     = aws.eu_west_1
  service_code = "ec2"
  quota_code   = "L-1216C47A"
  value        = 256
}
```

## Quota Templates for AWS Organizations

If you use AWS Organizations, quota templates apply default quota values to new accounts:

```hcl
# Create a quota template for new accounts in the organization
resource "aws_servicequotas_template" "ec2_on_demand" {
  region       = "us-east-1"
  service_code = "ec2"
  quota_code   = "L-1216C47A"
  value        = 256
}

# Associate the template with the organization
resource "aws_servicequotas_template_association" "main" {
  # This enables the template for the entire organization
}
```

## Proactive Monitoring

Hitting a service quota in production is a bad experience. The deployment fails, the auto-scaler cannot add instances, or the pipeline stops processing. Set up monitoring through OneUptime to track resource counts against their quotas. When utilization crosses 70%, you have enough lead time to submit an increase request before it becomes an emergency.

For tracking the cost impact of increased quotas, see our guide on budget alerts at https://oneuptime.com/blog/post/2026-02-23-how-to-create-budget-alerts-in-terraform/view.

## Tips

- Quota increase requests are asynchronous. Some are approved instantly (adjustable quotas), while others require AWS review and can take days.
- Not all quotas can be increased through the API. Some require a support ticket.
- The `request_status` attribute in the Terraform state tells you whether the request was approved, pending, or denied.
- Keep your quota requests in Terraform even after they are approved. They serve as documentation of what limits have been adjusted and why.

## Summary

Service quotas are one of those things you do not think about until they bite you. Managing them proactively through Terraform - requesting increases before you need them and monitoring usage against limits - prevents production outages caused by hitting resource ceilings. The `for_each` pattern makes it easy to manage a collection of quota increases across services, and CloudWatch alarms give you early warning when you are approaching limits.
