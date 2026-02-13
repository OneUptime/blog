# How to Create an EC2 Instance with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Terraform, Infrastructure as Code

Description: A hands-on guide to provisioning EC2 instances using Terraform, covering configuration, networking, security groups, and best practices for production deployments.

---

Clicking through the AWS console to launch EC2 instances works fine for experiments, but it falls apart the moment you need repeatability, version control, or team collaboration. Terraform solves this by letting you define your infrastructure as code - write it once, review it in a pull request, and deploy it consistently every time.

This guide walks through creating EC2 instances with Terraform, starting simple and building up to production-ready configurations.

## Prerequisites

You'll need Terraform installed and AWS credentials configured. If you haven't set these up yet, here's the quick version:

Install Terraform and configure AWS credentials:

```bash
# Install Terraform (macOS with Homebrew)
brew install terraform

# Configure AWS credentials
aws configure
# Enter your Access Key ID, Secret Access Key, region, and output format
```

Verify both are working:

```bash
# Check Terraform version
terraform version

# Verify AWS access
aws sts get-caller-identity
```

## Your First EC2 Instance

Let's start with the simplest possible configuration. Create a new directory and a main Terraform file.

This creates a basic EC2 instance with minimal configuration:

```hcl
# main.tf - Provider and basic instance

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

# Look up the latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  tags = {
    Name = "my-first-terraform-instance"
  }
}
```

Deploy it:

```bash
# Initialize Terraform (downloads the AWS provider)
terraform init

# Preview what will be created
terraform plan

# Apply the configuration
terraform apply
```

Terraform will show you exactly what it's going to create and ask for confirmation. Type `yes` and your instance will spin up.

## Adding a Security Group

A bare instance without a security group isn't very useful. Let's add one that allows SSH and HTTP access.

Define a security group alongside the instance:

```hcl
# Security group allowing SSH and HTTP
resource "aws_security_group" "web_sg" {
  name        = "web-server-sg"
  description = "Allow SSH and HTTP inbound traffic"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH from anywhere"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
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
    Name = "web-server-sg"
  }
}

# Update the instance to use the security group
resource "aws_instance" "web" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = "t3.micro"
  vpc_security_group_ids = [aws_security_group.web_sg.id]
  key_name               = "my-key-pair"

  tags = {
    Name = "web-server"
  }
}
```

## Complete VPC Setup

For a production setup, you should define the whole network stack rather than relying on the default VPC.

Here's a complete VPC with public and private subnets:

```hcl
# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "main-vpc" }
}

# Internet Gateway
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "main-igw" }
}

# Public Subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true

  tags = { Name = "public-subnet" }
}

# Route Table for Public Subnet
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = { Name = "public-rt" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}
```

## Using Variables for Flexibility

Hard-coding values makes your Terraform less reusable. Variables let you parameterize everything.

Define variables in a separate file:

```hcl
# variables.tf
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "development"
}

variable "instance_count" {
  description = "Number of instances to create"
  type        = number
  default     = 1
}

variable "allowed_ssh_cidrs" {
  description = "CIDR blocks allowed to SSH"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}
```

Use variables in your instance definition:

```hcl
# main.tf - Using variables
resource "aws_instance" "web" {
  count = var.instance_count

  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web_sg.id]
  key_name               = "my-key-pair"

  tags = {
    Name        = "web-server-${count.index + 1}"
    Environment = var.environment
  }
}
```

Override defaults with a `terraform.tfvars` file:

```hcl
# terraform.tfvars
instance_type  = "t3.small"
environment    = "staging"
instance_count = 3
allowed_ssh_cidrs = ["10.0.0.0/8"]
```

## User Data for Bootstrap Scripts

User data lets you run scripts when the instance first boots. This is perfect for installing software and configuring services.

Add a user data script to install and start nginx:

```hcl
resource "aws_instance" "web" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web_sg.id]
  key_name               = "my-key-pair"

  user_data = <<-EOF
    #!/bin/bash
    yum update -y
    yum install -y nginx
    systemctl start nginx
    systemctl enable nginx
    echo "<h1>Hello from $(hostname)</h1>" > /usr/share/nginx/html/index.html
  EOF

  user_data_replace_on_change = true

  tags = {
    Name = "web-server"
  }
}
```

The `user_data_replace_on_change` flag tells Terraform to replace the instance if the user data changes, since user data only runs on first boot.

## Adding EBS Volumes

Most instances need additional storage beyond the root volume.

Attach an EBS volume to your instance:

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"

  # Root volume configuration
  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  tags = { Name = "web-server" }
}

# Additional EBS volume
resource "aws_ebs_volume" "data" {
  availability_zone = aws_instance.web.availability_zone
  size              = 100
  type              = "gp3"
  encrypted         = true

  tags = { Name = "web-server-data" }
}

resource "aws_volume_attachment" "data_attach" {
  device_name = "/dev/xvdf"
  volume_id   = aws_ebs_volume.data.id
  instance_id = aws_instance.web.id
}
```

## Outputs for Useful Information

Outputs let you easily access important values after deployment.

Define outputs for your instance:

```hcl
# outputs.tf
output "instance_id" {
  value = aws_instance.web.id
}

output "public_ip" {
  value = aws_instance.web.public_ip
}

output "public_dns" {
  value = aws_instance.web.public_dns
}

output "ssh_command" {
  value = "ssh -i my-key-pair.pem ec2-user@${aws_instance.web.public_ip}"
}
```

After running `terraform apply`, these values will be displayed. You can also retrieve them later with `terraform output`.

## State Management

For team environments, store your Terraform state in S3 rather than locally.

Configure remote state with S3 backend:

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state-bucket"
    key            = "ec2/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-lock"
    encrypt        = true
  }
}
```

This ensures everyone on the team works with the same state, and the DynamoDB table prevents concurrent modifications.

## Lifecycle Rules

Terraform's lifecycle rules give you fine-grained control over how resources are managed.

Common lifecycle configurations for EC2:

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type

  lifecycle {
    # Don't destroy and recreate if AMI changes
    ignore_changes = [ami]

    # Create replacement before destroying old one
    create_before_destroy = true

    # Prevent accidental deletion
    prevent_destroy = true
  }

  tags = { Name = "web-server" }
}
```

The `create_before_destroy` option is especially useful for zero-downtime updates - Terraform will spin up the new instance before terminating the old one.

## Cleaning Up

When you're done, Terraform makes cleanup easy:

```bash
# Destroy all resources managed by this configuration
terraform destroy
```

This is one of the biggest advantages of IaC - no orphaned resources lurking in your account racking up charges.

## Best Practices

1. **Always use remote state** for anything beyond personal experiments
2. **Pin your provider versions** to avoid unexpected breaking changes
3. **Use data sources for AMIs** instead of hard-coding AMI IDs
4. **Tag everything** - it makes cost tracking and resource management much easier
5. **Use modules** for reusable patterns across projects

For monitoring the instances you deploy with Terraform, consider integrating your monitoring setup as code too. Check out our guide on [AWS infrastructure monitoring](https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-infrastructure-monitoring/view) to get started with observability for your EC2 fleet.

## Wrapping Up

Terraform turns EC2 provisioning from a manual, error-prone process into something repeatable and reviewable. Start with a simple instance, layer on networking and security as needed, and use variables and modules to keep your configurations clean. Once you're comfortable with these patterns, you'll never want to go back to clicking through the console.
