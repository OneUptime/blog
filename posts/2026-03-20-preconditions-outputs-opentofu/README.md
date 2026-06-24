# How to Add Preconditions to Outputs in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Output, Preconditions, Validation, Infrastructure as Code, DevOps

Description: A guide to adding precondition checks to OpenTofu output values to validate assumptions before exposing values to consumers.

## Introduction

Preconditions in output blocks validate guarantees about the values your module exposes before OpenTofu finalizes them. Unlike variable validations that check input values, output preconditions verify that the infrastructure or data behind an output meets certain requirements.

## Basic Output Precondition

```hcl
# outputs.tf

output "api_endpoint" {
  description = "The HTTPS endpoint for the API"
  value       = "https://${aws_lb.main.dns_name}/api"

  precondition {
    condition     = aws_lb.main.load_balancer_type == "application"
    error_message = "The load balancer must be of type 'application' to serve API traffic."
  }
}
```

## Multiple Preconditions

```hcl
output "production_database_url" {
  description = "Connection URL for the production database"
  value       = "postgresql://${aws_db_instance.main.username}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
  sensitive   = true

  # Verify the database is properly configured for production
  precondition {
    condition     = aws_db_instance.main.multi_az == true
    error_message = "Production database must have Multi-AZ enabled for high availability."
  }

  precondition {
    condition     = aws_db_instance.main.backup_retention_period >= 7
    error_message = "Production database must have at least 7 days of backup retention."
  }

  precondition {
    condition     = aws_db_instance.main.deletion_protection == true
    error_message = "Production database must have deletion protection enabled."
  }
}
```

## Preconditions for Environment Validation

```hcl
variable "environment" {
  type = string
}

resource "aws_s3_bucket" "state" {
  bucket = "${var.environment}-app-state"
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = var.environment == "prod" ? "Enabled" : "Suspended"
  }
}

output "state_bucket_arn" {
  description = "ARN of the state bucket"
  value       = aws_s3_bucket.state.arn

  precondition {
    # Ensure bucket versioning is enabled in production
    condition = !(var.environment == "prod") || aws_s3_bucket_versioning.state.versioning_configuration[0].status == "Enabled"
    error_message = "Production state bucket must have versioning enabled. Current status: ${aws_s3_bucket_versioning.state.versioning_configuration[0].status}"
  }
}
```

## Preconditions for Security Compliance

```hcl
output "eks_cluster_arn" {
  description = "The ARN of the EKS cluster (verified secure)"
  value       = aws_eks_cluster.main.arn

  # Security compliance checks
  precondition {
    condition     = aws_eks_cluster.main.kubernetes_network_config[0].ip_family == "ipv4"
    error_message = "EKS cluster must use IPv4 for the pod network (security requirement)."
  }

  precondition {
    condition     = length(aws_eks_cluster.main.encryption_config) > 0
    error_message = "EKS cluster must have envelope encryption configured for secrets."
  }
}
```

## Preconditions vs Postconditions

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  lifecycle {
    # Postconditions: validate after creation
    postcondition {
      condition     = self.public_ip != ""
      error_message = "Instance must have a public IP address."
    }
  }
}

output "web_url" {
  description = "The web server URL"
  value       = "http://${aws_instance.web.public_ip}"

  # Preconditions: validate before exposing the output
  precondition {
    condition     = aws_instance.web.public_ip != null
    error_message = "Web instance must have a public IP before URL can be generated."
  }
}
```

## Using Preconditions for Data Validation

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-*-22.04-amd64-server-*"]
  }
}

output "ami_id" {
  description = "The Ubuntu 22.04 AMI ID to use for new instances"
  value       = data.aws_ami.ubuntu.id

  precondition {
    condition     = data.aws_ami.ubuntu.architecture == "x86_64"
    error_message = "The selected AMI must be x86_64 architecture. Got: ${data.aws_ami.ubuntu.architecture}"
  }
}
```

## Conclusion

Output preconditions are a powerful tool for encoding infrastructure guarantees and compliance requirements directly in your configuration. OpenTofu evaluates them as early as possible: during planning when the referenced values are already known, or during apply when they are not. For outputs specifically, the precondition is checked before OpenTofu finalizes the output value, helping prevent invalid values from being saved to state. This is especially valuable for security-sensitive outputs where you want to guarantee certain properties before the output is used.
