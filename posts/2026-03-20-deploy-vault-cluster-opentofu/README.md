# How to Deploy Vault Cluster with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Vault, Cluster, High Availability, HashiCorp, Secret Management

Description: Learn how to deploy a production-ready HashiCorp Vault cluster on AWS using OpenTofu with integrated storage, Auto Unseal via KMS, and load balancer configuration.

## Introduction

A production Vault cluster uses integrated storage (Raft) for HA without external dependencies, AWS KMS for Auto Unseal to avoid manual unsealing after restarts, and a Network Load Balancer for client access. This guide deploys a 3-node Vault cluster on EC2.

## KMS Key for Auto Unseal

```hcl
resource "aws_kms_key" "vault_unseal" {
  description             = "Vault Auto Unseal key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = { Name = "vault-unseal-${var.environment}" }
}

resource "aws_kms_alias" "vault_unseal" {
  name          = "alias/vault-unseal-${var.environment}"
  target_key_id = aws_kms_key.vault_unseal.id
}
```

## IAM for Vault Nodes

```hcl
resource "aws_iam_role" "vault" {
  name = "vault-cluster-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "vault_kms" {
  name = "vault-kms-unseal"
  role = aws_iam_role.vault.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["kms:Encrypt", "kms:Decrypt", "kms:DescribeKey"]
        Resource = aws_kms_key.vault_unseal.arn
      },
      {
        Effect   = "Allow"
        Action   = ["ec2:DescribeInstances"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "vault" {
  name = "vault-cluster-${var.environment}"
  role = aws_iam_role.vault.name
}
```

## EC2 Instances (3-node cluster)

```hcl
resource "aws_instance" "vault" {
  count                  = 3
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = "t3.medium"
  key_name               = var.key_pair_name
  subnet_id              = var.private_subnet_ids[count.index % length(var.private_subnet_ids)]
  vpc_security_group_ids = [aws_security_group.vault.id]
  iam_instance_profile   = aws_iam_instance_profile.vault.name

  ebs_block_device {
    device_name           = "/dev/xvdf"
    volume_size           = 50
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = false  # Preserve the old data volume after termination; reattach it separately on replacement
  }

  user_data = templatefile("${path.module}/vault-init.sh.tpl", {
    vault_version  = var.vault_version
    kms_key_id     = aws_kms_key.vault_unseal.key_id
    aws_region     = var.aws_region
    cluster_name   = "vault-${var.environment}"
    node_index     = count.index
    all_node_ips   = []  # Placeholder kept empty when Vault uses auto_join for peer discovery
  })

  tags = {
    Name         = "vault-${var.environment}-node-${count.index + 1}"
    Environment  = var.environment
    VaultCluster = "vault-${var.environment}"
  }
}
```

## Vault Configuration Template

```hcl
# vault-init.sh.tpl - simplified for brevity

```

```hcl
# Vault HCL configuration generated in user_data
locals {
  vault_config = <<-CONFIG
    storage "raft" {
      path    = "/opt/vault/data"
      node_id = "vault-${var.environment}-node-INDEX"

      retry_join {
        auto_join             = "provider=aws region=${var.aws_region} tag_key=VaultCluster tag_value=vault-${var.environment}"
        auto_join_scheme      = "https"
        leader_tls_servername = "vault.${var.domain_name}"
      }
    }

    listener "tcp" {
      address            = "0.0.0.0:8200"
      cluster_address    = "0.0.0.0:8201"
      tls_cert_file      = "/opt/vault/tls/vault.crt"
      tls_key_file       = "/opt/vault/tls/vault.key"
    }

    seal "awskms" {
      region     = "${var.aws_region}"
      kms_key_id = "${aws_kms_key.vault_unseal.key_id}"
    }

    api_addr     = "https://vault.${var.domain_name}:8200"
    cluster_addr = "https://PRIVATE_IP:8201"

    ui = true
  CONFIG
}
```

## Network Load Balancer

```hcl
resource "aws_lb" "vault" {
  name               = "vault-${var.environment}"
  internal           = true
  load_balancer_type = "network"
  subnets            = var.private_subnet_ids

  enable_deletion_protection = true
}

resource "aws_lb_target_group" "vault" {
  name        = "vault-${var.environment}"
  port        = 8200
  protocol    = "TCP"
  vpc_id      = var.vpc_id
  target_type = "instance"

  health_check {
    protocol          = "HTTPS"
    path              = "/v1/sys/health"
    healthy_threshold = 3
    interval          = 10
  }
}

resource "aws_lb_listener" "vault" {
  load_balancer_arn = aws_lb.vault.arn
  port              = 8200
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.vault.arn
  }
}

resource "aws_lb_target_group_attachment" "vault" {
  count            = length(aws_instance.vault)
  target_group_arn = aws_lb_target_group.vault.arn
  target_id        = aws_instance.vault[count.index].id
  port             = 8200
}
```

## Route53 Record

```hcl
resource "aws_route53_record" "vault" {
  zone_id = data.aws_route53_zone.private.zone_id
  name    = "vault.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.vault.dns_name
    zone_id                = aws_lb.vault.zone_id
    evaluate_target_health = true
  }
}
```

## Conclusion

A production Vault cluster requires careful consideration of the initialization and unseal process. With KMS Auto Unseal, nodes unseal automatically after restart without operator intervention. Raft integrated storage eliminates the need for an external Consul cluster. Use `auto_join` with EC2 tags for nodes to discover each other without hard-coded IP addresses. Initialize the cluster once using `vault operator init` on the first node, then save the recovery keys in a secure location.
