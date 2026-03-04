# How to Use Terraform to Provision RHEL 9 VMs on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, AWS, Terraform

Description: Step-by-step guide on use terraform to provision rhel 9 vms on aws with practical examples and commands.

---

Terraform automates infrastructure provisioning. This guide shows how to use Terraform to deploy RHEL 9 virtual machines on AWS with proper networking and security groups.

## Prerequisites

- Terraform installed (version 1.5 or later)
- AWS CLI configured with valid credentials
- A RHEL 9 AMI ID for your target region

## Project Structure

```
rhel9-aws/
  main.tf
  variables.tf
  outputs.tf
  terraform.tfvars
```

## Define Variables

```hcl
# variables.tf
variable "aws_region" {
  description = "AWS region"
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  default     = "t3.medium"
}

variable "rhel9_ami" {
  description = "RHEL 9 AMI ID"
  type        = string
}

variable "key_name" {
  description = "SSH key pair name"
  type        = string
}

variable "instance_count" {
  description = "Number of RHEL 9 instances"
  default     = 2
}
```

## Main Configuration

```hcl
# main.tf
provider "aws" {
  region = var.aws_region
}

resource "aws_vpc" "rhel9_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name = "rhel9-vpc"
  }
}

resource "aws_subnet" "rhel9_subnet" {
  vpc_id                  = aws_vpc.rhel9_vpc.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true

  tags = {
    Name = "rhel9-subnet"
  }
}

resource "aws_internet_gateway" "rhel9_igw" {
  vpc_id = aws_vpc.rhel9_vpc.id
}

resource "aws_route_table" "rhel9_rt" {
  vpc_id = aws_vpc.rhel9_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.rhel9_igw.id
  }
}

resource "aws_route_table_association" "rhel9_rta" {
  subnet_id      = aws_subnet.rhel9_subnet.id
  route_table_id = aws_route_table.rhel9_rt.id
}

resource "aws_security_group" "rhel9_sg" {
  name   = "rhel9-sg"
  vpc_id = aws_vpc.rhel9_vpc.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "rhel9" {
  count                  = var.instance_count
  ami                    = var.rhel9_ami
  instance_type          = var.instance_type
  key_name               = var.key_name
  subnet_id              = aws_subnet.rhel9_subnet.id
  vpc_security_group_ids = [aws_security_group.rhel9_sg.id]

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  tags = {
    Name = "rhel9-server-${count.index + 1}"
  }
}
```

## Outputs

```hcl
# outputs.tf
output "instance_public_ips" {
  value = aws_instance.rhel9[*].public_ip
}

output "instance_ids" {
  value = aws_instance.rhel9[*].id
}
```

## Deploy

```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

## Verify

```bash
terraform output instance_public_ips
ssh -i ~/.ssh/mykey.pem ec2-user@<public-ip>
```

## Clean Up

```bash
terraform destroy
```

## Conclusion

You can now use Terraform to provision RHEL 9 VMs on AWS with proper networking, security groups, and storage configuration. Store your Terraform state remotely using an S3 backend for team collaboration.

