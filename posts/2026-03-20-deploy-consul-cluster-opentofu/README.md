# How to Deploy Consul Cluster with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Consul, Service Discovery, Service Mesh, High Availability

Description: Learn how to deploy a production-ready HashiCorp Consul cluster on AWS using OpenTofu with EC2 Auto Join, TLS encryption, and ACL bootstrapping for service discovery and service mesh.

## Introduction

Consul provides service discovery, health checking, key-value storage, and service mesh capabilities. A production Consul cluster requires TLS encryption, ACL enforcement, and EC2 Auto Join for automatic cluster formation. This guide deploys a 3-server Consul cluster on EC2.

## KMS for Gossip Encryption

```hcl
# Generate a gossip encryption key

resource "random_bytes" "gossip_key" {
  length = 32
}

resource "aws_secretsmanager_secret" "gossip_key" {
  name = "/consul/${var.environment}/gossip-encryption-key"
}

resource "aws_secretsmanager_secret_version" "gossip_key" {
  secret_id     = aws_secretsmanager_secret.gossip_key.id
  secret_string = random_bytes.gossip_key.base64
}
```

## IAM for Consul EC2 Auto Join

```hcl
resource "aws_iam_role_policy" "consul_autojoin" {
  name = "consul-ec2-autojoin"
  role = aws_iam_role.consul.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ec2:DescribeInstances"]
      Resource = "*"
    }]
  })
}
```

## Consul Server Instances

```hcl
resource "aws_instance" "consul_server" {
  count                  = 3
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = "t3.small"
  key_name               = var.key_pair_name
  subnet_id              = var.private_subnet_ids[count.index % length(var.private_subnet_ids)]
  vpc_security_group_ids = [aws_security_group.consul_server.id]
  iam_instance_profile   = aws_iam_instance_profile.consul.name

  user_data = templatefile("${path.module}/consul-server-init.sh.tpl", {
    consul_version      = var.consul_version
    datacenter          = var.datacenter
    environment         = var.environment
    gossip_key_secret   = aws_secretsmanager_secret.gossip_key.name
    bootstrap_expect    = 3
    aws_region          = var.aws_region
  })

  tags = {
    Name         = "consul-server-${var.environment}-${count.index + 1}"
    ConsulRole   = "server"
    ConsulDC     = var.datacenter
    Environment  = var.environment
  }
}
```

## Consul Configuration

```hcl
# consul-server.hcl - generated in user_data
locals {
  consul_server_config = <<-CONFIG
    datacenter  = "${var.datacenter}"
    data_dir    = "/opt/consul/data"
    log_level   = "INFO"
    node_name   = "server-NODE_INDEX"
    server      = true
    bootstrap_expect = 3
    ui_config {
      enabled = true
    }
    retry_join = ["provider=aws tag_key=ConsulRole tag_value=server region=${var.aws_region}"]
    encrypt     = "GOSSIP_KEY"
    verify_incoming        = true
    verify_outgoing        = true
    verify_server_hostname = true
    ca_file   = "/opt/consul/tls/ca.crt"
    cert_file = "/opt/consul/tls/server.crt"
    key_file  = "/opt/consul/tls/server.key"
    acl {
      enabled        = true
      default_policy = "deny"
      enable_token_persistence = true
    }
    performance {
      raft_multiplier = 1
    }
  CONFIG
}
```

## Security Groups

```hcl
resource "aws_security_group" "consul_server" {
  name        = "consul-server-${var.environment}"
  description = "Consul server security group"
  vpc_id      = var.vpc_id

  # Consul RPC
  ingress {
    from_port   = 8300
    to_port     = 8300
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Consul Serf LAN (gossip)
  ingress {
    from_port   = 8301
    to_port     = 8301
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
  ingress {
    from_port   = 8301
    to_port     = 8301
    protocol    = "udp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Consul HTTP API
  ingress {
    from_port   = 8500
    to_port     = 8500
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Consul HTTPS API
  ingress {
    from_port   = 8501
    to_port     = 8501
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # Consul DNS
  ingress {
    from_port   = 8600
    to_port     = 8600
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
  ingress {
    from_port   = 8600
    to_port     = 8600
    protocol    = "udp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Managing Consul with the Consul Provider

```hcl
provider "consul" {
  address    = "https://consul.${var.domain_name}:8501"
  ca_pem     = file("${path.module}/ca.crt")
  token      = var.consul_bootstrap_token
  datacenter = var.datacenter
}

resource "consul_acl_policy" "service_policy" {
  name  = "app-service-policy"
  rules = <<-RULE
    service "app" {
      policy = "write"
    }
    service_prefix "" {
      policy = "read"
    }
    node_prefix "" {
      policy = "read"
    }
  RULE
}
```

## Conclusion

Deploying Consul with OpenTofu requires careful sequencing: create the instances first, bootstrap the cluster once, then use the Consul provider to manage ACL policies and service configurations. EC2 Auto Join with instance tags eliminates the need for static peer lists. Enable ACLs with `default_policy = "deny"` to prevent unauthorized service registration and KV access in production.
