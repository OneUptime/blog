# How to Create Elastic Beanstalk Environments in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Elastic Beanstalk, PaaS, Deployment, Infrastructure as Code

Description: Complete guide to creating AWS Elastic Beanstalk applications and environments with Terraform, including auto-scaling, load balancing, and environment configuration.

---

AWS Elastic Beanstalk handles the provisioning and management of the infrastructure behind your web applications. You upload your code, and Beanstalk takes care of load balancing, auto-scaling, health monitoring, and deployments. It supports a wide range of platforms - Java, .NET, Node.js, Python, Ruby, Go, Docker, and more.

While Beanstalk abstracts away infrastructure management, there is still plenty of configuration to get right. Terraform lets you define that configuration as code so it stays consistent and reviewable. This guide covers creating Beanstalk applications, environments, and the settings that matter most.

## Prerequisites

- Terraform 1.0 or later
- AWS credentials with Elastic Beanstalk, EC2, S3, and IAM permissions
- Application code packaged as a ZIP file or Docker image

## Provider Setup

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
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}
```

## Creating the Beanstalk Application

The application is the top-level container. Environments sit under it:

```hcl
# The Beanstalk application - a logical grouping of environments
resource "aws_elastic_beanstalk_application" "app" {
  name        = "my-web-app"
  description = "Main web application"

  # Configure application version lifecycle
  appversion_lifecycle {
    service_role          = aws_iam_role.beanstalk_service.arn
    max_count             = 50
    delete_source_from_s3 = true
  }

  tags = {
    Environment = "shared"
    Team        = "platform"
  }
}
```

## IAM Roles

Beanstalk needs two roles - a service role for Beanstalk itself and an instance profile for the EC2 instances:

```hcl
# Service role for Elastic Beanstalk
resource "aws_iam_role" "beanstalk_service" {
  name = "elastic-beanstalk-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "elasticbeanstalk.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "beanstalk_service_enhanced_health" {
  role       = aws_iam_role.beanstalk_service.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSElasticBeanstalkEnhancedHealth"
}

resource "aws_iam_role_policy_attachment" "beanstalk_service_managed_updates" {
  role       = aws_iam_role.beanstalk_service.name
  policy_arn = "arn:aws:iam::aws:policy/AWSElasticBeanstalkManagedUpdatesCustomerRolePolicy"
}

# Instance role for EC2 instances
resource "aws_iam_role" "beanstalk_ec2" {
  name = "elastic-beanstalk-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "beanstalk_ec2_web" {
  role       = aws_iam_role.beanstalk_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AWSElasticBeanstalkWebTier"
}

resource "aws_iam_role_policy_attachment" "beanstalk_ec2_worker" {
  role       = aws_iam_role.beanstalk_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AWSElasticBeanstalkWorkerTier"
}

resource "aws_iam_role_policy_attachment" "beanstalk_ec2_docker" {
  role       = aws_iam_role.beanstalk_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AWSElasticBeanstalkMulticontainerDocker"
}

# Instance profile that wraps the EC2 role
resource "aws_iam_instance_profile" "beanstalk_ec2" {
  name = "elastic-beanstalk-ec2-profile"
  role = aws_iam_role.beanstalk_ec2.name
}
```

## Uploading an Application Version

Before creating an environment, upload your application bundle to S3:

```hcl
# S3 bucket for application versions
resource "aws_s3_bucket" "app_versions" {
  bucket = "my-web-app-versions-${data.aws_caller_identity.current.account_id}"

  tags = {
    Purpose = "beanstalk-deployments"
  }
}

data "aws_caller_identity" "current" {}

# Upload the application ZIP
resource "aws_s3_object" "app_bundle" {
  bucket = aws_s3_bucket.app_versions.id
  key    = "versions/v1.0.0.zip"
  source = "app-bundle.zip"
  etag   = filemd5("app-bundle.zip")
}

# Register the application version
resource "aws_elastic_beanstalk_application_version" "v1" {
  name        = "v1.0.0"
  application = aws_elastic_beanstalk_application.app.name
  description = "Initial release"
  bucket      = aws_s3_bucket.app_versions.id
  key         = aws_s3_object.app_bundle.key

  tags = {
    Version = "1.0.0"
  }
}
```

## Creating the Environment

Here is where most of the configuration lives. Beanstalk uses namespaced settings to control everything from instance types to deployment strategies:

```hcl
# The Beanstalk environment
resource "aws_elastic_beanstalk_environment" "production" {
  name                = "my-web-app-prod"
  application         = aws_elastic_beanstalk_application.app.name
  solution_stack_name = "64bit Amazon Linux 2023 v6.1.0 running Node.js 20"
  version_label       = aws_elastic_beanstalk_application_version.v1.name

  # Use the service role
  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "ServiceRole"
    value     = aws_iam_role.beanstalk_service.arn
  }

  # Load-balanced environment type
  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "EnvironmentType"
    value     = "LoadBalanced"
  }

  # Use Application Load Balancer
  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "LoadBalancerType"
    value     = "application"
  }

  # Instance profile
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "IamInstanceProfile"
    value     = aws_iam_instance_profile.beanstalk_ec2.name
  }

  # Instance type
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "InstanceType"
    value     = "t3.medium"
  }

  # VPC configuration
  setting {
    namespace = "aws:ec2:vpc"
    name      = "VPCId"
    value     = var.vpc_id
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "Subnets"
    value     = join(",", var.private_subnet_ids)
  }

  setting {
    namespace = "aws:ec2:vpc"
    name      = "ELBSubnets"
    value     = join(",", var.public_subnet_ids)
  }

  # Auto-scaling configuration
  setting {
    namespace = "aws:autoscaling:asg"
    name      = "MinSize"
    value     = "2"
  }

  setting {
    namespace = "aws:autoscaling:asg"
    name      = "MaxSize"
    value     = "8"
  }

  # Scaling triggers
  setting {
    namespace = "aws:autoscaling:trigger"
    name      = "MeasureName"
    value     = "CPUUtilization"
  }

  setting {
    namespace = "aws:autoscaling:trigger"
    name      = "UpperThreshold"
    value     = "70"
  }

  setting {
    namespace = "aws:autoscaling:trigger"
    name      = "LowerThreshold"
    value     = "30"
  }

  # Rolling deployment configuration
  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "DeploymentPolicy"
    value     = "Rolling"
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "BatchSizeType"
    value     = "Percentage"
  }

  setting {
    namespace = "aws:elasticbeanstalk:command"
    name      = "BatchSize"
    value     = "30"
  }

  # Enhanced health monitoring
  setting {
    namespace = "aws:elasticbeanstalk:healthreporting:system"
    name      = "SystemType"
    value     = "enhanced"
  }

  # Environment variables for the application
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "NODE_ENV"
    value     = "production"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "PORT"
    value     = "8080"
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for instances"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for the load balancer"
  type        = list(string)
}
```

## Creating a Worker Environment

Worker environments process background tasks from an SQS queue instead of handling web traffic:

```hcl
resource "aws_elastic_beanstalk_environment" "worker" {
  name                = "my-web-app-worker"
  application         = aws_elastic_beanstalk_application.app.name
  solution_stack_name = "64bit Amazon Linux 2023 v6.1.0 running Node.js 20"
  tier                = "Worker"

  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "ServiceRole"
    value     = aws_iam_role.beanstalk_service.arn
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "IamInstanceProfile"
    value     = aws_iam_instance_profile.beanstalk_ec2.name
  }

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "InstanceType"
    value     = "t3.small"
  }

  # Worker-specific settings
  setting {
    namespace = "aws:elasticbeanstalk:sqsd"
    name      = "WorkerQueueURL"
    value     = aws_sqs_queue.worker_queue.url
  }

  tags = {
    Environment = "production"
    Tier        = "worker"
  }
}

resource "aws_sqs_queue" "worker_queue" {
  name                       = "beanstalk-worker-queue"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 86400

  tags = {
    Service = "beanstalk-worker"
  }
}
```

## Outputs

```hcl
output "environment_url" {
  description = "URL of the Beanstalk environment"
  value       = aws_elastic_beanstalk_environment.production.endpoint_url
}

output "environment_cname" {
  description = "CNAME of the Beanstalk environment"
  value       = aws_elastic_beanstalk_environment.production.cname
}

output "application_name" {
  description = "Name of the Beanstalk application"
  value       = aws_elastic_beanstalk_application.app.name
}
```

## Monitoring Beanstalk Environments

Beanstalk has built-in health monitoring, but it only covers the basics. For production applications, integrate with OneUptime to get deeper visibility into response times, error rates, and resource utilization. This is especially important during deployments where rolling updates can temporarily reduce capacity.

## Tips and Gotchas

- Solution stack names change over time. Use `aws elasticbeanstalk list-available-solution-stacks` to find the current one for your platform.
- Environment settings are order-independent in Terraform, but some combinations are invalid. Terraform will show errors during plan if settings conflict.
- Changing the solution stack forces environment replacement. Plan accordingly.
- Rolling deployments with health checks enabled can take a while. The `BatchSize` and health check grace period settings control the speed vs. safety tradeoff.

## Summary

Elastic Beanstalk is a good fit when you want PaaS convenience but need more control than fully managed container services provide. Terraform handles the verbosity of Beanstalk's setting namespaces well, and having the configuration in code means you can review environment differences between staging and production in a pull request rather than clicking through the console.
