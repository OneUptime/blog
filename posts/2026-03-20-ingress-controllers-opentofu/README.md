# Deploying Ingress Controllers with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenTofu, Ingress, Networking, Infrastructure as Code

Description: Learn how to provision and configure Kubernetes ingress controllers using OpenTofu to manage HTTP and HTTPS routing for your cluster workloads.

## What is an Ingress Controller?

A Kubernetes Ingress controller is a component that manages external access to services in a cluster. It reads Ingress resource definitions and configures a load balancer or reverse proxy accordingly. Popular ingress controllers include NGINX, Traefik, and the AWS Load Balancer Controller.

OpenTofu (the open-source Terraform fork) can provision both the controller infrastructure and the Kubernetes resources.

## Project Structure

```text
ingress/
├── main.tf
├── helm.tf
├── variables.tf
├── outputs.tf
```

## Installing NGINX Ingress Controller via Helm

ingress-nginx remains installable, but the project entered retirement after March 2026 and no longer receives new releases or security fixes.

```hcl
resource "helm_release" "nginx_ingress" {
  name             = "nginx-ingress"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  namespace        = "ingress-nginx"
  create_namespace = true
  version          = "4.15.1"

  set {
    name  = "controller.service.type"
    value = "LoadBalancer"
  }

  set {
    name  = "controller.metrics.enabled"
    value = "true"
  }
}
```

## Configuring the Kubernetes Provider

```hcl
provider "kubernetes" {
  host                   = var.cluster_endpoint
  cluster_ca_certificate = base64decode(var.cluster_ca_cert)
  token                  = var.cluster_token
}

provider "helm" {
  kubernetes {
    host                   = var.cluster_endpoint
    cluster_ca_certificate = base64decode(var.cluster_ca_cert)
    token                  = var.cluster_token
  }
}
```

## Creating an Ingress Resource

```hcl
resource "kubernetes_ingress_v1" "app_ingress" {
  metadata {
    name      = "app-ingress"
    namespace = "default"
    annotations = {
      "nginx.ingress.kubernetes.io/rewrite-target" = "/"
    }
  }

  spec {
    ingress_class_name = "nginx"

    rule {
      host = "app.example.com"
      http {
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = "app-service"
              port { number = 80 }
            }
          }
        }
      }
    }

    tls {
      hosts       = ["app.example.com"]
      secret_name = "app-tls-secret"
    }
  }
}
```

## AWS Load Balancer Controller

This example assumes you have already created the IAM policy, IAM role, and `aws-load-balancer-controller` ServiceAccount required by the controller installation guide.

```hcl
resource "helm_release" "aws_load_balancer_controller" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"
  version    = "3.2.2"

  set {
    name  = "clusterName"
    value = var.cluster_name
  }

  set {
    name  = "serviceAccount.create"
    value = "false"
  }

  set {
    name  = "serviceAccount.name"
    value = "aws-load-balancer-controller"
  }
}
```

## TLS Certificate with cert-manager

```hcl
resource "helm_release" "cert_manager" {
  name             = "cert-manager"
  repository       = "oci://quay.io/jetstack/charts"
  chart            = "cert-manager"
  namespace        = "cert-manager"
  create_namespace = true
  version          = "v1.20.2"

  set {
    name  = "crds.enabled"
    value = "true"
  }
}
```

## Best Practices

1. **Pin chart versions** to avoid unexpected upgrades
2. **Enable metrics** on the ingress controller for observability
3. **Use cert-manager** for automated TLS certificate management
4. **Set resource requests and limits** on the controller pods
5. **Use namespacing** to isolate ingress controllers per environment

## Conclusion

OpenTofu makes it straightforward to deploy and configure ingress controllers alongside your cluster infrastructure. By combining Helm releases with Kubernetes resource definitions, you get a fully declarative ingress setup that is easy to reproduce and audit.
