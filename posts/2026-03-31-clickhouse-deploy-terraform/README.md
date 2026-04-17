# How to Deploy ClickHouse with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Terraform, Infrastructure as Code, DevOps, Cloud

Description: Learn how to deploy ClickHouse on cloud infrastructure using Terraform, covering VM provisioning, security groups, and post-install configuration.

---

## Why Use Terraform for ClickHouse

Terraform lets you define ClickHouse infrastructure as code - VMs, networking, security groups, and DNS - in a repeatable and version-controlled way. Changes go through plan/apply cycles with state tracking, making it safe to evolve your cluster over time.

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
```

## Variables

```hcl
variable "aws_region"       { default = "us-east-1" }
variable "instance_type"    { default = "m6i.2xlarge" }
variable "clickhouse_count" { default = 3 }
variable "key_pair_name"    { default = "my-keypair" }
```

## Security Group

```hcl
resource "aws_security_group" "clickhouse" {
  name = "clickhouse-sg"

  ingress {
    from_port   = 8123
    to_port     = 8123
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "ClickHouse HTTP interface"
  }

  ingress {
    from_port   = 9000
    to_port     = 9000
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "ClickHouse native TCP interface"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## EC2 Instance with User Data

```hcl
resource "aws_instance" "clickhouse" {
  count         = var.clickhouse_count
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  key_name      = var.key_pair_name

  vpc_security_group_ids = [aws_security_group.clickhouse.id]

  user_data = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y apt-transport-https ca-certificates curl gnupg
    curl -fsSL 'https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key' | gpg --dearmor -o /usr/share/keyrings/clickhouse-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg] https://packages.clickhouse.com/deb lts main" > /etc/apt/sources.list.d/clickhouse.list
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y clickhouse-server clickhouse-client
    systemctl enable --now clickhouse-server
  EOF

  tags = {
    Name = "clickhouse-${count.index + 1}"
    Role = "clickhouse"
  }
}
```

## Output

```hcl
output "clickhouse_ips" {
  value = aws_instance.clickhouse[*].private_ip
}
```

## Applying

```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

## Summary

Terraform provisions ClickHouse infrastructure by defining EC2 instances, security groups, and bootstrap scripts as HCL resources. Use `count` for multi-node clusters and `user_data` for initial software installation. Store state remotely in S3 with DynamoDB locking for team workflows. Keep ClickHouse configuration management in Ansible or cloud-init scripts rather than Terraform to separate infrastructure provisioning from application configuration.
