# How to Set Up EKS with Fargate Profiles Using OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, EKS, Fargate, Kubernetes, Serverless Containers, Infrastructure as Code

Description: Learn how to configure EKS Fargate profiles using OpenTofu to run Kubernetes pods on serverless compute without managing EC2 node groups.

## Introduction

AWS Fargate for EKS runs each Kubernetes pod on isolated serverless compute, eliminating the need to provision and manage EC2 nodes. Fargate profiles define which namespaces and labels select pods for Fargate scheduling. This is ideal for variable workloads and teams that want to focus on application development.

## Prerequisites

- OpenTofu v1.6+
- AWS CLI and kubectl installed
- An existing EKS cluster
- Private subnets with NAT gateway access to AWS services and no direct route to an Internet Gateway

## Step 1: Create the Fargate Pod Execution Role

```hcl
# IAM role that Fargate uses to pull container images and register with the cluster

resource "aws_iam_role" "fargate" {
  name = "${var.cluster_name}-fargate-pod-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "eks-fargate-pods.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "fargate_execution" {
  role       = aws_iam_role.fargate.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSFargatePodExecutionRolePolicy"
}
```

## Step 2: Create Fargate Profiles

```hcl
# Fargate profile for CoreDNS in the kube-system namespace
# Required for CoreDNS to run on Fargate
resource "aws_eks_fargate_profile" "kube_system" {
  cluster_name           = var.cluster_name
  fargate_profile_name   = "kube-system"
  pod_execution_role_arn = aws_iam_role.fargate.arn
  subnet_ids             = var.private_subnet_ids

  selector {
    namespace = "kube-system"
    labels = {
      "k8s-app" = "kube-dns"
    }
  }

  tags = {
    Name = "${var.cluster_name}-fargate-kube-system"
  }
}

# Fargate profile for application namespaces
resource "aws_eks_fargate_profile" "apps" {
  cluster_name           = var.cluster_name
  fargate_profile_name   = "apps"
  pod_execution_role_arn = aws_iam_role.fargate.arn
  subnet_ids             = var.private_subnet_ids

  # Match pods in the "apps" namespace
  selector {
    namespace = "apps"
  }

  # Match pods with the compute=fargate label in the default namespace
  selector {
    namespace = "default"
    labels = {
      "compute" = "fargate"
    }
  }

  tags = {
    Name = "${var.cluster_name}-fargate-apps"
  }
}
```

## Step 3: Restart CoreDNS on Fargate

```hcl
# Restart CoreDNS after creating the Fargate profile
# so the replacement Pods are scheduled onto Fargate
resource "null_resource" "coredns_fargate_restart" {
  triggers = {
    fargate_profile = aws_eks_fargate_profile.kube_system.id
  }

  provisioner "local-exec" {
    command = <<-EOF
      aws eks update-kubeconfig --region ${var.region} --name ${var.cluster_name}
      kubectl rollout restart -n kube-system deployment coredns
    EOF
  }

  depends_on = [aws_eks_fargate_profile.kube_system]
}
```

## Step 4: Deploy a Pod to Fargate

```hcl
# Create the namespace matched by the Fargate profile
resource "kubernetes_namespace_v1" "apps" {
  metadata {
    name = "apps"
  }
}

# Deploy a workload to the namespace matched by the Fargate profile
resource "kubernetes_deployment_v1" "fargate_app" {
  metadata {
    name      = "fargate-app"
    namespace = kubernetes_namespace_v1.apps.metadata[0].name
  }

  spec {
    replicas = 3

    selector {
      match_labels = { app = "fargate-app" }
    }

    template {
      metadata {
        labels = { app = "fargate-app" }
      }

      spec {
        container {
          name  = "app"
          image = "nginx:latest"

          resources {
            limits = {
              cpu    = "250m"
              memory = "512Mi"
            }
            requests = {
              cpu    = "250m"
              memory = "512Mi"
            }
          }
        }
      }
    }
  }
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

EKS Fargate profiles enable serverless Kubernetes by routing matched pods to managed compute. Each Fargate pod gets its own isolated kernel, enhancing security isolation. Note that Fargate does not support DaemonSets, privileged containers, or Amazon EBS volumes, and persistent storage on Fargate is limited to Amazon EFS with static provisioning. For stateful workloads, combine Fargate profiles with managed node groups in the same cluster.
