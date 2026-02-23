# How to Create Transfer Family SFTP Servers in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Transfer Family, SFTP, File Transfer, Infrastructure as Code

Description: Learn how to create AWS Transfer Family SFTP servers with S3 and EFS backends, custom authentication, and user management using Terraform.

---

AWS Transfer Family provides fully managed file transfer services that support SFTP, FTPS, and FTP protocols. It is the go-to service when you need to give partners, vendors, or internal systems a way to upload and download files from S3 or EFS without managing your own transfer servers. With Terraform, you can define your Transfer Family servers, users, and access controls in code and deploy them consistently across environments.

This guide covers creating SFTP servers with both S3 and EFS backends, setting up user authentication, configuring custom hostnames, and applying security policies.

## Prerequisites

- Terraform 1.0 or later
- AWS CLI configured with appropriate permissions
- An S3 bucket or EFS file system for storage
- A domain name (optional, for custom hostnames)

## Provider Configuration

```hcl
terraform {
  required_version = ">= 1.0"

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

## Creating a Basic SFTP Server

The simplest setup is a public-facing SFTP server backed by S3.

```hcl
# Basic public SFTP server
resource "aws_transfer_server" "sftp" {
  identity_provider_type = "SERVICE_MANAGED"
  protocols              = ["SFTP"]
  endpoint_type          = "PUBLIC"
  domain                 = "S3"

  # Security policy controls which ciphers and key exchange algorithms are supported
  security_policy_name = "TransferSecurityPolicy-2024-01"

  logging_role = aws_iam_role.transfer_logging.arn

  tags = {
    Name        = "sftp-server"
    Environment = "production"
  }
}

# IAM role for CloudWatch logging
resource "aws_iam_role" "transfer_logging" {
  name = "transfer-family-logging-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "transfer.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "transfer_logging" {
  role       = aws_iam_role.transfer_logging.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSTransferLoggingAccess"
}

# Output the server endpoint
output "sftp_endpoint" {
  value = aws_transfer_server.sftp.endpoint
}
```

## VPC-Hosted SFTP Server

For tighter network control, deploy the server inside a VPC with an internal or internet-facing endpoint.

```hcl
# VPC endpoint for the SFTP server
resource "aws_transfer_server" "sftp_vpc" {
  identity_provider_type = "SERVICE_MANAGED"
  protocols              = ["SFTP"]
  endpoint_type          = "VPC"
  domain                 = "S3"
  security_policy_name   = "TransferSecurityPolicy-2024-01"
  logging_role           = aws_iam_role.transfer_logging.arn

  endpoint_details {
    vpc_id                 = aws_vpc.main.id
    subnet_ids             = aws_subnet.private[*].id
    security_group_ids     = [aws_security_group.sftp.id]
    address_allocation_ids = [aws_eip.sftp.id] # For internet-facing VPC endpoint
  }

  tags = {
    Name = "sftp-vpc-server"
  }
}

# Security group for the SFTP server
resource "aws_security_group" "sftp" {
  name        = "sftp-server-sg"
  description = "Security group for Transfer Family SFTP server"
  vpc_id      = aws_vpc.main.id

  # Allow SFTP from specific IP ranges
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8", "203.0.113.0/24"] # Your partner IPs
    description = "Allow SFTP from trusted networks"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "sftp-server-sg"
  }
}

# Elastic IP for stable public IP
resource "aws_eip" "sftp" {
  domain = "vpc"

  tags = {
    Name = "sftp-server-eip"
  }
}
```

## Creating SFTP Users with S3 Access

Each SFTP user needs an IAM role that defines what they can access in S3 and a home directory mapping.

```hcl
# S3 bucket for file storage
resource "aws_s3_bucket" "sftp_files" {
  bucket = "my-org-sftp-files"
}

# IAM role for SFTP users
resource "aws_iam_role" "sftp_user_role" {
  name = "sftp-user-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "transfer.amazonaws.com"
        }
      }
    ]
  })
}

# Policy granting S3 access scoped to the user's directory
resource "aws_iam_role_policy" "sftp_user_policy" {
  name = "sftp-user-s3-access"
  role = aws_iam_role.sftp_user_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowListBucket"
        Effect = "Allow"
        Action = "s3:ListBucket"
        Resource = aws_s3_bucket.sftp_files.arn
      },
      {
        Sid    = "AllowObjectOperations"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:GetObjectVersion",
        ]
        Resource = "${aws_s3_bucket.sftp_files.arn}/*"
      }
    ]
  })
}

# Create an SFTP user with SSH key authentication
resource "aws_transfer_user" "partner_a" {
  server_id = aws_transfer_server.sftp.id
  user_name = "partner-a"
  role      = aws_iam_role.sftp_user_role.arn

  # Restrict user to their home directory
  home_directory_type = "LOGICAL"

  home_directory_mappings {
    entry  = "/"
    target = "/${aws_s3_bucket.sftp_files.id}/partner-a"
  }

  tags = {
    Partner = "partner-a"
  }
}

# Add SSH public key for the user
resource "aws_transfer_ssh_key" "partner_a_key" {
  server_id = aws_transfer_server.sftp.id
  user_name = aws_transfer_user.partner_a.user_name
  body      = file("${path.module}/keys/partner-a.pub")
}
```

## Multiple Users with for_each

When you have many users, use a map and for_each.

```hcl
# Define users and their SSH keys
variable "sftp_users" {
  type = map(object({
    ssh_public_key = string
    home_directory = string
  }))
  default = {
    "partner-alpha" = {
      ssh_public_key = "ssh-rsa AAAAB3... partner-alpha@example.com"
      home_directory = "partner-alpha"
    }
    "partner-beta" = {
      ssh_public_key = "ssh-rsa AAAAB3... partner-beta@example.com"
      home_directory = "partner-beta"
    }
    "internal-etl" = {
      ssh_public_key = "ssh-rsa AAAAB3... etl@internal"
      home_directory = "etl-uploads"
    }
  }
}

# Create users dynamically
resource "aws_transfer_user" "users" {
  for_each = var.sftp_users

  server_id = aws_transfer_server.sftp.id
  user_name = each.key
  role      = aws_iam_role.sftp_user_role.arn

  home_directory_type = "LOGICAL"

  home_directory_mappings {
    entry  = "/"
    target = "/${aws_s3_bucket.sftp_files.id}/${each.value.home_directory}"
  }

  tags = {
    User = each.key
  }
}

# Add SSH keys for each user
resource "aws_transfer_ssh_key" "user_keys" {
  for_each = var.sftp_users

  server_id = aws_transfer_server.sftp.id
  user_name = aws_transfer_user.users[each.key].user_name
  body      = each.value.ssh_public_key
}
```

## EFS-Backed SFTP Server

For use cases that need POSIX file permissions or shared access, use EFS as the backend.

```hcl
# SFTP server with EFS backend
resource "aws_transfer_server" "sftp_efs" {
  identity_provider_type = "SERVICE_MANAGED"
  protocols              = ["SFTP"]
  endpoint_type          = "VPC"
  domain                 = "EFS"
  security_policy_name   = "TransferSecurityPolicy-2024-01"
  logging_role           = aws_iam_role.transfer_logging.arn

  endpoint_details {
    vpc_id             = aws_vpc.main.id
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.sftp.id]
  }
}

# EFS file system
resource "aws_efs_file_system" "sftp_storage" {
  creation_token = "sftp-storage"
  encrypted      = true

  tags = {
    Name = "sftp-efs-storage"
  }
}

# EFS access point for the SFTP user
resource "aws_efs_access_point" "sftp_user" {
  file_system_id = aws_efs_file_system.sftp_storage.id

  posix_user {
    gid = 1000
    uid = 1000
  }

  root_directory {
    path = "/sftp/partner-a"
    creation_info {
      owner_gid   = 1000
      owner_uid   = 1000
      permissions = "0755"
    }
  }
}

# IAM role for EFS-backed user
resource "aws_iam_role" "sftp_efs_user_role" {
  name = "sftp-efs-user-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "transfer.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "sftp_efs_policy" {
  name = "sftp-efs-access"
  role = aws_iam_role.sftp_efs_user_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "elasticfilesystem:ClientMount",
          "elasticfilesystem:ClientWrite",
          "elasticfilesystem:ClientRootAccess",
        ]
        Resource = aws_efs_file_system.sftp_storage.arn
      }
    ]
  })
}

# EFS-backed SFTP user
resource "aws_transfer_user" "efs_user" {
  server_id = aws_transfer_server.sftp_efs.id
  user_name = "partner-a"
  role      = aws_iam_role.sftp_efs_user_role.arn

  home_directory_type = "LOGICAL"

  home_directory_mappings {
    entry  = "/"
    target = "/${aws_efs_file_system.sftp_storage.id}/sftp/partner-a"
  }
}
```

## Custom Hostname with Route 53

Point a custom domain to your SFTP server instead of using the auto-generated endpoint.

```hcl
# Custom DNS record for the SFTP server
resource "aws_route53_record" "sftp" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "sftp.company.com"
  type    = "CNAME"
  ttl     = 300
  records = [aws_transfer_server.sftp.endpoint]
}

# Host key for the server (so clients see a consistent host key)
resource "aws_transfer_tag" "hostname" {
  resource_arn = aws_transfer_server.sftp.arn
  key          = "aws:transfer:customHostname"
  value        = "sftp.company.com"
}
```

## Managed Workflows

Transfer Family supports managed workflows for post-upload processing.

```hcl
# Workflow to process uploaded files
resource "aws_transfer_workflow" "post_upload" {
  description = "Process files after upload"

  steps {
    type = "COPY"

    copy_step_details {
      name                 = "copy-to-processing"
      source_file_location = "$${original.file}"

      destination_file_location {
        s3_file_location {
          bucket = aws_s3_bucket.processing.id
          key    = "incoming/"
        }
      }
    }
  }

  steps {
    type = "TAG"

    tag_step_details {
      name                 = "tag-processed"
      source_file_location = "$${original.file}"

      tags {
        key   = "Status"
        value = "Received"
      }
    }
  }

  tags = {
    Name = "post-upload-workflow"
  }
}

# Associate the workflow with the server
resource "aws_transfer_server" "sftp_with_workflow" {
  identity_provider_type = "SERVICE_MANAGED"
  protocols              = ["SFTP"]
  endpoint_type          = "PUBLIC"
  domain                 = "S3"
  security_policy_name   = "TransferSecurityPolicy-2024-01"
  logging_role           = aws_iam_role.transfer_logging.arn

  workflow_details {
    on_upload {
      workflow_id    = aws_transfer_workflow.post_upload.id
      execution_role = aws_iam_role.workflow_execution.arn
    }
  }
}
```

## Best Practices

1. **Use VPC endpoints for sensitive transfers.** Public endpoints are convenient but VPC endpoints let you control access through security groups and network ACLs.

2. **Scope IAM policies tightly.** Each user's role should only grant access to their specific S3 prefix or EFS path.

3. **Use logical home directories.** Logical directory mappings give you clean paths and prevent users from navigating outside their designated area.

4. **Enable logging.** Always attach a logging role so Transfer Family sends structured logs to CloudWatch. You will need these for troubleshooting and auditing.

5. **Use strong security policies.** The older security policies allow weak ciphers. Use `TransferSecurityPolicy-2024-01` or newer.

6. **Rotate SSH keys.** Have a process for rotating user SSH keys. Terraform makes this easy - update the key in your variables and apply.

## Conclusion

AWS Transfer Family removes the operational burden of running SFTP servers while giving you the flexibility to use S3 or EFS as the storage backend. With Terraform managing the configuration, adding new users, updating security policies, and deploying to new environments becomes a straightforward code change. Whether you are exchanging files with external partners or building internal data pipelines, this setup gives you a solid foundation.
