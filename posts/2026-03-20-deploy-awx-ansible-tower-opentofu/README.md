# How to Deploy AWX (Ansible Tower) with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWX, Ansible Tower, Automation, Configuration Management

Description: Learn how to deploy AWX (open-source Ansible Tower) on Kubernetes using OpenTofu with the AWX Operator, RDS PostgreSQL, and EKS for enterprise Ansible automation.

## Introduction

AWX is the open-source version of Red Hat Ansible Automation Platform. The AWX Operator simplifies deployment on Kubernetes. This guide deploys AWX on an EKS cluster with an external RDS PostgreSQL database using OpenTofu.

## EKS Cluster (prerequisite)

```hcl
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "awx-cluster-${var.environment}"
  cluster_version = "1.29"
  vpc_id          = var.vpc_id
  subnet_ids      = var.private_subnet_ids

  eks_managed_node_groups = {
    awx = {
      instance_types = ["t3.xlarge"]
      min_size       = 2
      max_size       = 5
      desired_size   = 3

      disk_size = 100
    }
  }
}
```

## RDS PostgreSQL for AWX

```hcl
resource "aws_db_instance" "awx" {
  identifier          = "awx-${var.environment}"
  engine              = "postgres"
  engine_version      = "15.4"
  instance_class      = "db.t3.medium"
  allocated_storage   = 50
  max_allocated_storage = 500
  storage_encrypted   = true

  db_name  = "awx"
  username = "awx"
  password = random_password.db_password.result

  vpc_security_group_ids = [aws_security_group.rds_awx.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 7
  deletion_protection     = true
}
```

## Deploying AWX Operator via Helm

```hcl
provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}

resource "helm_release" "awx_operator" {
  name             = "awx-operator"
  repository       = "https://ansible.github.io/awx-operator/"
  chart            = "awx-operator"
  version          = "2.10.0"
  namespace        = "awx"
  create_namespace = true

  set {
    name  = "AWX.enabled"
    value = "false"  # We deploy AWX separately via the CRD
  }
}
```

## AWX Custom Resource via Kubernetes Provider

```hcl
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

# Create the external DB secret for AWX

resource "kubernetes_secret" "awx_db" {
  metadata {
    name      = "awx-db-secret"
    namespace = "awx"
  }

  data = {
    host     = aws_db_instance.awx.address
    port     = "5432"
    database = "awx"
    username = "awx"
    password = random_password.db_password.result
    sslmode  = "prefer"
    type     = "unmanaged"
  }

  depends_on = [helm_release.awx_operator]
}

# Deploy AWX using the CRD
resource "kubernetes_manifest" "awx" {
  manifest = {
    apiVersion = "awx.ansible.com/v1beta1"
    kind       = "AWX"
    metadata = {
      name      = "awx"
      namespace = "awx"
    }
    spec = {
      service_type                  = "ClusterIP"
      hostname                      = var.awx_hostname
      admin_email                   = var.awx_admin_email
      postgres_configuration_secret = kubernetes_secret.awx_db.metadata[0].name
      web_resource_requirements = {
        requests = { memory = "1Gi", cpu = "500m" }
        limits   = { memory = "2Gi", cpu = "1000m" }
      }
      task_resource_requirements = {
        requests = { memory = "1Gi", cpu = "500m" }
        limits   = { memory = "2Gi", cpu = "2000m" }
      }
    }
  }

  depends_on = [helm_release.awx_operator, kubernetes_secret.awx_db]
}
```

## Ingress for AWX

```hcl
resource "kubernetes_ingress_v1" "awx" {
  metadata {
    name      = "awx-ingress"
    namespace = "awx"
    annotations = {
      "kubernetes.io/ingress.class"               = "alb"
      "alb.ingress.kubernetes.io/scheme"          = "internet-facing"
      "alb.ingress.kubernetes.io/target-type"     = "ip"
      "alb.ingress.kubernetes.io/certificate-arn" = aws_acm_certificate.awx.arn
    }
  }

  spec {
    rule {
      host = var.awx_hostname
      http {
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = "awx-service"
              port { number = 80 }
            }
          }
        }
      }
    }
  }
}
```

## Conclusion

Deploying AWX with OpenTofu on EKS uses the AWX Operator's Kubernetes-native approach, which handles the complexity of deploying multiple AWX components (web, task, receptor). Using an external RDS database instead of the operator-managed PostgreSQL provides better durability, backups, and scaling. After deployment, configure AWX organizations, projects (pointing to Git repos), and credentials through the AWX provider or web UI.
