# How to Configure EKS Add-Ons (CoreDNS, kube-proxy, VPC CNI) with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, AWS, Terraform

Description: Manage EKS add-ons including CoreDNS, kube-proxy, and Amazon VPC CNI using Terraform for automated configuration, versioning, and updates.

---

EKS add-ons are Amazon-managed components that extend Kubernetes functionality. CoreDNS provides DNS resolution, kube-proxy handles service networking, and VPC CNI integrates pods with AWS networking. Managing these add-ons through Terraform ensures consistent configuration, automated updates, and infrastructure-as-code practices. This guide covers configuring and managing EKS add-ons with Terraform.

## Understanding EKS Add-Ons

EKS add-ons are cluster components managed by AWS with automatic updates, health monitoring, and configuration management. The core add-ons include:

**Amazon VPC CNI** - Assigns AWS VPC IP addresses to pods, enabling native AWS networking integration.

**CoreDNS** - Provides DNS-based service discovery for pods and services.

**kube-proxy** - Maintains network rules for service traffic routing.

**Amazon EBS CSI Driver** - Enables persistent volume support with EBS.

**Amazon EFS CSI Driver** - Provides shared filesystem support.

## Basic Add-On Configuration

Configure essential add-ons:

```hcl
# eks-addons.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# VPC CNI Add-on
resource "aws_eks_addon" "vpc_cni" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "vpc-cni"
  addon_version = data.aws_eks_addon_version.vpc_cni.version

  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "PRESERVE"

  tags = {
    Name = "vpc-cni"
  }
}

# CoreDNS Add-on
resource "aws_eks_addon" "coredns" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "coredns"
  addon_version = data.aws_eks_addon_version.coredns.version

  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "PRESERVE"

  depends_on = [
    aws_eks_node_group.main
  ]

  tags = {
    Name = "coredns"
  }
}

# kube-proxy Add-on
resource "aws_eks_addon" "kube_proxy" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "kube-proxy"
  addon_version = data.aws_eks_addon_version.kube_proxy.version

  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "PRESERVE"

  tags = {
    Name = "kube-proxy"
  }
}

# Get latest add-on versions
data "aws_eks_addon_version" "vpc_cni" {
  addon_name         = "vpc-cni"
  kubernetes_version = aws_eks_cluster.main.version
  most_recent        = true
}

data "aws_eks_addon_version" "coredns" {
  addon_name         = "coredns"
  kubernetes_version = aws_eks_cluster.main.version
  most_recent        = true
}

data "aws_eks_addon_version" "kube_proxy" {
  addon_name         = "kube-proxy"
  kubernetes_version = aws_eks_cluster.main.version
  most_recent        = true
}
```

## Configuring VPC CNI with Custom Settings

Enable advanced VPC CNI features:

```hcl
# vpc-cni-addon.tf
resource "aws_eks_addon" "vpc_cni" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "vpc-cni"
  addon_version = "v1.15.4-eksbuild.1"

  service_account_role_arn = aws_iam_role.vpc_cni.arn

  configuration_values = jsonencode({
    env = {
      # Enable prefix delegation for higher pod density
      ENABLE_PREFIX_DELEGATION = "true"
      # Warm IP target
      WARM_IP_TARGET = "5"
      # Minimum IPs
      MINIMUM_IP_TARGET = "10"
      # Enable pod ENI
      ENABLE_POD_ENI = "true"
      # Network policy support
      ENABLE_NETWORK_POLICY = "true"
      # Security groups for pods
      ENABLE_POD_SECURITY_GROUP = "true"
    }
    # Resource limits
    resources = {
      limits = {
        cpu    = "100m"
        memory = "128Mi"
      }
      requests = {
        cpu    = "50m"
        memory = "64Mi"
      }
    }
  })

  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "PRESERVE"
}

# IAM role for VPC CNI
resource "aws_iam_role" "vpc_cni" {
  name = "${var.cluster_name}-vpc-cni"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.eks.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub" = "system:serviceaccount:kube-system:aws-node"
          "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "vpc_cni" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.vpc_cni.name
}
```

## Configuring CoreDNS for Custom DNS

Customize CoreDNS configuration:

```hcl
# coredns-addon.tf
resource "aws_eks_addon" "coredns" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "coredns"
  addon_version = "v1.10.1-eksbuild.6"

  configuration_values = jsonencode({
    # Replica count
    replicaCount = 3

    # Resource limits
    resources = {
      limits = {
        cpu    = "200m"
        memory = "256Mi"
      }
      requests = {
        cpu    = "100m"
        memory = "128Mi"
      }
    }

    # Pod disruption budget
    podDisruptionBudget = {
      maxUnavailable = 1
    }

    # Node affinity
    affinity = {
      podAntiAffinity = {
        preferredDuringSchedulingIgnoredDuringExecution = [{
          weight = 100
          podAffinityTerm = {
            topologyKey = "kubernetes.io/hostname"
            labelSelector = {
              matchLabels = {
                "k8s-app" = "kube-dns"
              }
            }
          }
        }]
      }
    }
  })

  depends_on = [aws_eks_node_group.main]
}

# Custom CoreDNS ConfigMap (managed separately)
resource "kubernetes_config_map_v1_data" "coredns_custom" {
  metadata {
    name      = "coredns-custom"
    namespace = "kube-system"
  }

  data = {
    "custom.server" = <<-EOF
      # Custom DNS configuration
      example.com:53 {
        errors
        cache 30
        forward . 10.0.0.2
      }

      # Conditional forwarding
      corp.internal:53 {
        forward . 10.1.0.2
      }
    EOF
  }

  force = true
}
```

## Configuring kube-proxy

Customize kube-proxy settings:

```hcl
# kube-proxy-addon.tf
resource "aws_eks_addon" "kube_proxy" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "kube-proxy"
  addon_version = "v1.28.2-eksbuild.2"

  configuration_values = jsonencode({
    # Proxy mode (iptables or ipvs)
    mode = "iptables"

    # Resource limits
    resources = {
      limits = {
        cpu    = "100m"
        memory = "64Mi"
      }
      requests = {
        cpu    = "50m"
        memory = "32Mi"
      }
    }

    # Configuration
    config = {
      # Connection tracking
      conntrack = {
        maxPerCore = 32768
        min = 131072
      }
      # IP tables
      iptables = {
        masqueradeAll = false
        masqueradeBit = 14
        minSyncPeriod = "0s"
        syncPeriod = "30s"
      }
    }
  })
}
```

## EBS CSI Driver Add-on

Configure EBS CSI driver for persistent volumes:

```hcl
# ebs-csi-addon.tf
resource "aws_eks_addon" "ebs_csi" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "aws-ebs-csi-driver"
  addon_version = "v1.26.0-eksbuild.1"

  service_account_role_arn = aws_iam_role.ebs_csi.arn

  configuration_values = jsonencode({
    controller = {
      replicaCount = 2
      resources = {
        limits = {
          cpu    = "200m"
          memory = "256Mi"
        }
        requests = {
          cpu    = "100m"
          memory = "128Mi"
        }
      }
    }
  })

  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "PRESERVE"
}

# IAM role for EBS CSI driver
resource "aws_iam_role" "ebs_csi" {
  name = "${var.cluster_name}-ebs-csi-driver"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.eks.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub" = "system:serviceaccount:kube-system:ebs-csi-controller-sa"
          "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ebs_csi" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
  role       = aws_iam_role.ebs_csi.name
}
```

## Add-On Update Strategy

Configure update behavior:

```hcl
resource "aws_eks_addon" "vpc_cni" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "vpc-cni"

  # Pin to specific version for stability
  addon_version = "v1.15.4-eksbuild.1"

  # Or use latest
  # addon_version = data.aws_eks_addon_version.vpc_cni.version

  # Conflict resolution
  resolve_conflicts_on_create = "OVERWRITE"  # OVERWRITE or NONE
  resolve_conflicts_on_update = "PRESERVE"   # PRESERVE or OVERWRITE

  # Prevent destruction during updates
  lifecycle {
    prevent_destroy = false
    ignore_changes  = []
  }
}
```

## Monitoring Add-Ons

Create CloudWatch dashboards:

```hcl
# cloudwatch-dashboard.tf
resource "aws_cloudwatch_dashboard" "eks_addons" {
  dashboard_name = "${var.cluster_name}-addons"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/EKS", "AddonHealth", { stat = "Average", label = "VPC CNI Health" }],
            ["...", { stat = "Average", label = "CoreDNS Health" }],
            ["...", { stat = "Average", label = "kube-proxy Health" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Add-on Health"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/EKS", "AddonUpdateDuration", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Add-on Update Duration"
        }
      }
    ]
  })
}
```

## Complete Example

Full Terraform configuration:

```hcl
# main.tf
module "eks_addons" {
  source = "./modules/eks-addons"

  cluster_name    = aws_eks_cluster.main.name
  cluster_version = aws_eks_cluster.main.version
  oidc_provider   = aws_iam_openid_connect_provider.eks

  # Add-on versions
  vpc_cni_version    = "v1.15.4-eksbuild.1"
  coredns_version    = "v1.10.1-eksbuild.6"
  kube_proxy_version = "v1.28.2-eksbuild.2"
  ebs_csi_version    = "v1.26.0-eksbuild.1"

  # VPC CNI configuration
  vpc_cni_config = {
    enable_prefix_delegation   = true
    enable_pod_eni             = true
    enable_network_policy      = true
    warm_ip_target             = 5
    minimum_ip_target          = 10
  }

  # CoreDNS configuration
  coredns_config = {
    replica_count = 3
    resources = {
      limits = {
        cpu    = "200m"
        memory = "256Mi"
      }
      requests = {
        cpu    = "100m"
        memory = "128Mi"
      }
    }
  }

  depends_on = [
    aws_eks_node_group.main
  ]
}
```

## Testing Add-Ons

Verify add-on functionality:

```bash
# Check add-on status
terraform show | grep addon

# Verify with AWS CLI
aws eks list-addons --cluster-name my-cluster
aws eks describe-addon --cluster-name my-cluster --addon-name vpc-cni

# Test VPC CNI
kubectl get pods -n kube-system -l k8s-app=aws-node
kubectl logs -n kube-system -l k8s-app=aws-node

# Test CoreDNS
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl run test-dns --image=busybox:1.28 --rm -it --restart=Never -- nslookup kubernetes.default

# Test kube-proxy
kubectl get pods -n kube-system -l k8s-app=kube-proxy
kubectl get ds -n kube-system kube-proxy
```

## Updating Add-Ons

Update add-on versions:

```hcl
# Update version in terraform
resource "aws_eks_addon" "vpc_cni" {
  addon_version = "v1.16.0-eksbuild.1"  # New version
  # ...
}

# Apply changes
# terraform plan
# terraform apply
```

Check compatibility:

```bash
# List available versions
aws eks describe-addon-versions \
  --addon-name vpc-cni \
  --kubernetes-version 1.28

# Check compatibility
aws eks describe-addon-configuration \
  --addon-name vpc-cni \
  --addon-version v1.16.0-eksbuild.1
```

## Best Practices

1. Pin add-on versions for production clusters
2. Test add-on updates in non-production first
3. Use PRESERVE for conflict resolution on updates
4. Configure appropriate resource limits
5. Enable monitoring and logging for add-ons
6. Use IAM roles for service accounts (IRSA) for add-ons
7. Document custom configurations
8. Set up alerts for add-on health
9. Regularly review and update add-ons
10. Keep Terraform state secure

## Conclusion

Managing EKS add-ons with Terraform provides version control, reproducibility, and automation for critical cluster components. Configure VPC CNI for networking, CoreDNS for service discovery, kube-proxy for service routing, and CSI drivers for storage. Use Terraform to manage add-on versions, customize configurations, and ensure consistent deployments across environments. Monitor add-on health and test updates thoroughly before applying to production.
