# How to Implement EKS Security Best Practices with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, EKS, Kubernetes, AWS

Description: A hands-on guide to securing AWS EKS clusters with Terraform, covering cluster configuration, node security, RBAC, network policies, and pod security.

---

EKS brings together the complexity of Kubernetes security and AWS security in one package. There is a lot to get right: cluster endpoint access, node group configuration, RBAC, pod security standards, network policies, and secrets management. Terraform is well suited for managing the AWS side of EKS security, and with the Kubernetes and Helm providers, it can handle the in-cluster configuration too.

This guide covers the most important EKS security practices you can implement with Terraform.

## Secure Cluster Configuration

Start with a cluster that is locked down by default:

```hcl
resource "aws_eks_cluster" "main" {
  name     = "production"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.29"

  vpc_config {
    subnet_ids              = aws_subnet.private[*].id
    endpoint_private_access = true
    endpoint_public_access  = false  # No public API endpoint

    security_group_ids = [aws_security_group.eks_cluster.id]
  }

  # Enable envelope encryption for Kubernetes secrets
  encryption_config {
    provider {
      key_arn = aws_kms_key.eks.arn
    }
    resources = ["secrets"]
  }

  # Enable control plane logging
  enabled_cluster_log_types = [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ]

  tags = {
    Name        = "production"
    Environment = "production"
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_cloudwatch_log_group.eks
  ]
}

# CloudWatch log group for control plane logs
resource "aws_cloudwatch_log_group" "eks" {
  name              = "/aws/eks/production/cluster"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.logs.arn
}
```

### Private Endpoint Access

If the cluster API must be accessible from outside the VPC (for CI/CD), restrict it by CIDR:

```hcl
vpc_config {
  endpoint_private_access = true
  endpoint_public_access  = true  # Only if necessary

  # Restrict public access to specific CIDRs
  public_access_cidrs = [
    "203.0.113.0/24",    # Office IP range
    "198.51.100.50/32"   # CI/CD server
  ]
}
```

## Secure Node Groups

```hcl
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "production-nodes"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = aws_subnet.private[*].id

  instance_types = ["m5.large"]

  scaling_config {
    desired_size = 3
    max_size     = 10
    min_size     = 2
  }

  # Use the latest Amazon Linux 2 EKS-optimized AMI
  ami_type = "AL2_x86_64"

  # Encrypt EBS volumes
  disk_size = 50

  # Use launch template for more control
  launch_template {
    id      = aws_launch_template.eks_nodes.id
    version = aws_launch_template.eks_nodes.latest_version
  }

  tags = {
    Name = "production-nodes"
  }
}

resource "aws_launch_template" "eks_nodes" {
  name_prefix = "eks-nodes-"

  # Encrypt root volume
  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size           = 50
      volume_type           = "gp3"
      encrypted             = true
      kms_key_id            = aws_kms_key.ebs.arn
      delete_on_termination = true
    }
  }

  # Enable IMDSv2 (prevent SSRF attacks)
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"  # IMDSv2 only
    http_put_response_hop_limit = 1
  }

  # Use the EKS-optimized AMI
  image_id = data.aws_ssm_parameter.eks_ami.value

  monitoring {
    enabled = true
  }

  tag_specifications {
    resource_type = "instance"

    tags = {
      Name = "eks-production-node"
    }
  }
}
```

## IAM Roles for Service Accounts (IRSA)

IRSA is the recommended way to give pods access to AWS services. It is much better than attaching policies to the node role:

```hcl
# Enable OIDC provider for the cluster
data "tls_certificate" "eks" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

# Create an IAM role for a specific service account
resource "aws_iam_role" "app_service_account" {
  name = "eks-order-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")}:sub" = "system:serviceaccount:production:order-service"
            "${replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })
}

# Attach only the permissions this service needs
resource "aws_iam_role_policy" "app_service_account" {
  name = "order-service-permissions"
  role = aws_iam_role.app_service_account.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.orders.arn
      }
    ]
  })
}

# Create the Kubernetes service account
resource "kubernetes_service_account" "order_service" {
  metadata {
    name      = "order-service"
    namespace = "production"
    annotations = {
      "eks.amazonaws.com/role-arn" = aws_iam_role.app_service_account.arn
    }
  }
}
```

## Network Policies

Use Calico or Cilium for network policy enforcement:

```hcl
# Install Calico for network policy support
resource "helm_release" "calico" {
  name       = "calico"
  repository = "https://docs.tigera.io/calico/charts"
  chart      = "tigera-operator"
  namespace  = "tigera-operator"
  version    = "3.27.0"

  create_namespace = true
}

# Default deny-all network policy for a namespace
resource "kubernetes_network_policy" "default_deny" {
  metadata {
    name      = "default-deny-all"
    namespace = "production"
  }

  spec {
    pod_selector {}
    policy_types = ["Ingress", "Egress"]
  }
}

# Allow specific traffic for the order service
resource "kubernetes_network_policy" "order_service" {
  metadata {
    name      = "order-service-policy"
    namespace = "production"
  }

  spec {
    pod_selector {
      match_labels = {
        app = "order-service"
      }
    }

    # Allow ingress from the ingress controller
    ingress {
      from {
        namespace_selector {
          match_labels = {
            name = "ingress-nginx"
          }
        }
      }
      ports {
        protocol = "TCP"
        port     = 8080
      }
    }

    # Allow egress to DNS and specific services
    egress {
      # DNS
      to {
        namespace_selector {}
      }
      ports {
        protocol = "UDP"
        port     = 53
      }
    }

    egress {
      # HTTPS for AWS APIs
      ports {
        protocol = "TCP"
        port     = 443
      }
    }

    policy_types = ["Ingress", "Egress"]
  }
}
```

## Pod Security Standards

Enforce pod security standards at the namespace level:

```hcl
resource "kubernetes_namespace" "production" {
  metadata {
    name = "production"

    labels = {
      # Enforce restricted pod security standard
      "pod-security.kubernetes.io/enforce" = "restricted"
      "pod-security.kubernetes.io/audit"   = "restricted"
      "pod-security.kubernetes.io/warn"    = "restricted"
    }
  }
}
```

## Security Group for Cluster

```hcl
resource "aws_security_group" "eks_cluster" {
  name        = "eks-cluster-sg"
  description = "Security group for EKS cluster control plane"
  vpc_id      = aws_vpc.main.id

  # Allow node groups to communicate with control plane
  ingress {
    description     = "Node groups to cluster API"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  egress {
    description = "Cluster to node communication"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }

  tags = {
    Name = "eks-cluster-sg"
  }
}
```

## Wrapping Up

EKS security spans both AWS and Kubernetes domains. On the AWS side, focus on private cluster endpoints, encrypted secrets, IMDSv2 on nodes, and IRSA for pod-level AWS access. On the Kubernetes side, enforce pod security standards, implement network policies, and use RBAC to control who can do what. Terraform can manage both layers, giving you a single source of truth for your cluster security configuration.

For monitoring your EKS clusters and workloads, [OneUptime](https://oneuptime.com) provides Kubernetes monitoring, log management, and incident response tools to keep your containers running smoothly.
