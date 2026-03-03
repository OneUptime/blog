# How to Install Terraform Enterprise on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, AWS, Cloud Infrastructure, Self-Hosted

Description: Deploy Terraform Enterprise on AWS with EC2, RDS PostgreSQL, and S3 storage using infrastructure as code for a production-ready setup.

---

Deploying Terraform Enterprise on AWS is the most common self-hosted deployment pattern. AWS provides all the building blocks you need: EC2 for compute, RDS for the database, S3 for object storage, and ALB for load balancing. This guide covers deploying a production-ready Terraform Enterprise installation on AWS, using Terraform itself to provision the infrastructure.

## Architecture Overview

A production Terraform Enterprise deployment on AWS typically includes:

- An EC2 instance (or Auto Scaling Group) running Terraform Enterprise
- An RDS PostgreSQL instance for the database
- An S3 bucket for object storage (state files, configuration)
- An Application Load Balancer with TLS termination
- A VPC with public and private subnets
- Security groups controlling network access

```text
[Internet]
    |
[ALB - HTTPS:443]
    |
[Private Subnet]
    |
[EC2 - TFE Container]
    |         |
[RDS PostgreSQL]  [S3 Bucket]
```

## Step 1: Create the VPC and Networking

```hcl
# networking.tf

# VPC for Terraform Enterprise
resource "aws_vpc" "tfe" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "tfe-vpc"
  }
}

# Public subnets for the ALB
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.tfe.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name = "tfe-public-${count.index + 1}"
  }
}

# Private subnets for EC2 and RDS
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.tfe.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "tfe-private-${count.index + 1}"
  }
}

# Internet gateway
resource "aws_internet_gateway" "tfe" {
  vpc_id = aws_vpc.tfe.id

  tags = {
    Name = "tfe-igw"
  }
}

# NAT gateway for private subnet internet access
resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "tfe" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "tfe-nat"
  }
}

# Route tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.tfe.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.tfe.id
  }

  tags = {
    Name = "tfe-public-rt"
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.tfe.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.tfe.id
  }

  tags = {
    Name = "tfe-private-rt"
  }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

data "aws_availability_zones" "available" {
  state = "available"
}
```

## Step 2: Create the RDS Database

```hcl
# database.tf

resource "aws_db_subnet_group" "tfe" {
  name       = "tfe-db-subnet"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "tfe-db-subnet-group"
  }
}

resource "aws_security_group" "rds" {
  name   = "tfe-rds-sg"
  vpc_id = aws_vpc.tfe.id

  # Allow PostgreSQL access from TFE instances only
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.tfe.id]
  }

  tags = {
    Name = "tfe-rds-sg"
  }
}

resource "aws_db_instance" "tfe" {
  identifier     = "tfe-database"
  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.r6g.large"

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "terraform_enterprise"
  username = "terraform"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.tfe.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az            = true
  publicly_accessible = false

  backup_retention_period = 14
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  skip_final_snapshot       = false
  final_snapshot_identifier = "tfe-final-snapshot"

  tags = {
    Name = "tfe-database"
  }
}
```

## Step 3: Create the S3 Bucket

```hcl
# storage.tf

resource "aws_s3_bucket" "tfe" {
  bucket = "tfe-data-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "tfe-object-storage"
  }
}

resource "aws_s3_bucket_versioning" "tfe" {
  bucket = aws_s3_bucket.tfe.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tfe" {
  bucket = aws_s3_bucket.tfe.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "tfe" {
  bucket = aws_s3_bucket.tfe.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

data "aws_caller_identity" "current" {}
```

## Step 4: Create the EC2 Instance

```hcl
# compute.tf

resource "aws_security_group" "tfe" {
  name   = "tfe-instance-sg"
  vpc_id = aws_vpc.tfe.id

  # HTTPS from ALB
  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Outbound access
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "tfe-instance-sg"
  }
}

# IAM role for the EC2 instance
resource "aws_iam_role" "tfe" {
  name = "tfe-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "tfe_s3" {
  name = "tfe-s3-access"
  role = aws_iam_role.tfe.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ]
      Resource = [
        aws_s3_bucket.tfe.arn,
        "${aws_s3_bucket.tfe.arn}/*"
      ]
    }]
  })
}

resource "aws_iam_instance_profile" "tfe" {
  name = "tfe-instance-profile"
  role = aws_iam_role.tfe.name
}

resource "aws_instance" "tfe" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "m5.xlarge"
  subnet_id     = aws_subnet.private[0].id

  iam_instance_profile   = aws_iam_instance_profile.tfe.name
  vpc_security_group_ids = [aws_security_group.tfe.id]
  key_name               = var.ssh_key_name

  root_block_device {
    volume_size = 100
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = templatefile("${path.module}/templates/user-data.sh", {
    tfe_license            = var.tfe_license
    tfe_hostname           = var.tfe_hostname
    tfe_encryption_password = var.tfe_encryption_password
    db_host                = aws_db_instance.tfe.address
    db_username            = aws_db_instance.tfe.username
    db_password            = var.db_password
    db_name                = aws_db_instance.tfe.db_name
    s3_bucket              = aws_s3_bucket.tfe.id
    s3_region              = var.aws_region
  })

  tags = {
    Name = "tfe-server"
  }
}

data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  owners = ["099720109477"]
}
```

## Step 5: Create the User Data Script

```bash
#!/bin/bash
# templates/user-data.sh
# Bootstrap script for Terraform Enterprise on EC2

set -euo pipefail

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Log in to the container registry
echo "${tfe_license}" | docker login images.releases.hashicorp.com \
  --username terraform --password-stdin

# Pull the TFE image
docker pull images.releases.hashicorp.com/hashicorp/terraform-enterprise:latest

# Create configuration directory
mkdir -p /etc/terraform-enterprise

# Run Terraform Enterprise
docker run -d \
  --name terraform-enterprise \
  --restart always \
  -p 443:443 \
  -p 8800:8800 \
  -v tfe-data:/var/lib/terraform-enterprise \
  -e TFE_LICENSE="${tfe_license}" \
  -e TFE_HOSTNAME="${tfe_hostname}" \
  -e TFE_ENCRYPTION_PASSWORD="${tfe_encryption_password}" \
  -e TFE_OPERATIONAL_MODE="external" \
  -e TFE_DATABASE_HOST="${db_host}" \
  -e TFE_DATABASE_USER="${db_username}" \
  -e TFE_DATABASE_PASSWORD="${db_password}" \
  -e TFE_DATABASE_NAME="${db_name}" \
  -e TFE_DATABASE_PARAMETERS="sslmode=require" \
  -e TFE_OBJECT_STORAGE_TYPE="s3" \
  -e TFE_OBJECT_STORAGE_S3_BUCKET="${s3_bucket}" \
  -e TFE_OBJECT_STORAGE_S3_REGION="${s3_region}" \
  -e TFE_OBJECT_STORAGE_S3_USE_INSTANCE_PROFILE="true" \
  --cap-add IPC_LOCK \
  images.releases.hashicorp.com/hashicorp/terraform-enterprise:latest
```

## Step 6: Create the Application Load Balancer

```hcl
# alb.tf

resource "aws_security_group" "alb" {
  name   = "tfe-alb-sg"
  vpc_id = aws_vpc.tfe.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "tfe-alb-sg"
  }
}

resource "aws_lb" "tfe" {
  name               = "tfe-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = {
    Name = "tfe-alb"
  }
}

resource "aws_lb_target_group" "tfe" {
  name     = "tfe-tg"
  port     = 443
  protocol = "HTTPS"
  vpc_id   = aws_vpc.tfe.id

  health_check {
    path                = "/_health_check"
    port                = 443
    protocol            = "HTTPS"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 10
  }
}

resource "aws_lb_listener" "tfe" {
  load_balancer_arn = aws_lb.tfe.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tfe.arn
  }
}

resource "aws_lb_target_group_attachment" "tfe" {
  target_group_arn = aws_lb_target_group.tfe.arn
  target_id        = aws_instance.tfe.id
  port             = 443
}
```

## Step 7: Configure DNS

```hcl
# dns.tf

resource "aws_route53_record" "tfe" {
  zone_id = var.route53_zone_id
  name    = var.tfe_hostname
  type    = "A"

  alias {
    name                   = aws_lb.tfe.dns_name
    zone_id                = aws_lb.tfe.zone_id
    evaluate_target_health = true
  }
}
```

## Variables

```hcl
# variables.tf

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "tfe_hostname" {
  type        = string
  description = "Hostname for Terraform Enterprise"
}

variable "tfe_license" {
  type        = string
  sensitive   = true
  description = "Terraform Enterprise license"
}

variable "tfe_encryption_password" {
  type        = string
  sensitive   = true
  description = "Encryption password for TFE data"
}

variable "db_password" {
  type        = string
  sensitive   = true
  description = "PostgreSQL database password"
}

variable "ssh_key_name" {
  type        = string
  description = "SSH key pair name for EC2 access"
}

variable "acm_certificate_arn" {
  type        = string
  description = "ACM certificate ARN for the ALB"
}

variable "route53_zone_id" {
  type        = string
  description = "Route53 hosted zone ID"
}
```

## Deploying

```bash
# Initialize and apply
terraform init

terraform plan \
  -var="tfe_hostname=tfe.example.com" \
  -var="tfe_license=$(cat license.rli)" \
  -var="tfe_encryption_password=$(openssl rand -hex 32)" \
  -var="db_password=$(openssl rand -base64 24)" \
  -var="ssh_key_name=my-key" \
  -var="acm_certificate_arn=arn:aws:acm:..." \
  -var="route53_zone_id=Z..."

terraform apply
```

## Summary

Deploying Terraform Enterprise on AWS involves setting up networking, a managed PostgreSQL database, S3 storage, and an EC2 instance running the TFE container. Using Terraform to deploy Terraform Enterprise (yes, it is recursive) gives you reproducible, version-controlled infrastructure. For production, add an Auto Scaling Group for high availability, enable RDS Multi-AZ, and configure CloudWatch alarms for monitoring.
