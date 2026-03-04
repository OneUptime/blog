# How to Deploy cert-manager with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, cert-manager, TLS, Certificates, Security, DevOps

Description: Learn how to deploy and configure cert-manager on Kubernetes using Terraform, including Let's Encrypt issuers, DNS validation, wildcard certificates, and automatic renewal.

---

TLS certificates are a requirement for any production Kubernetes deployment. cert-manager automates the entire certificate lifecycle - requesting, issuing, and renewing certificates from authorities like Let's Encrypt, Vault, and private CAs. Deploying it through Terraform means your certificate infrastructure is reproducible, version controlled, and part of your broader infrastructure-as-code workflow.

This guide covers deploying cert-manager, configuring issuers, and creating certificates, all through Terraform.

## Installing cert-manager

The standard approach is to use the official Helm chart.

```hcl
# providers.tf
terraform {
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = "~> 1.14"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

# Create the cert-manager namespace
resource "kubernetes_namespace" "cert_manager" {
  metadata {
    name = "cert-manager"

    labels = {
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }
}

# Deploy cert-manager using Helm
resource "helm_release" "cert_manager" {
  name       = "cert-manager"
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  namespace  = kubernetes_namespace.cert_manager.metadata[0].name
  version    = "1.14.0"

  # Install CRDs with the chart
  set {
    name  = "installCRDs"
    value = "true"
  }

  # Enable DNS01 challenge for wildcard certificates
  set {
    name  = "extraArgs[0]"
    value = "--dns01-recursive-nameservers-only"
  }

  set {
    name  = "extraArgs[1]"
    value = "--dns01-recursive-nameservers=8.8.8.8:53\\,1.1.1.1:53"
  }

  # Resource limits for the controller
  values = [
    yamlencode({
      resources = {
        requests = {
          cpu    = "50m"
          memory = "128Mi"
        }
        limits = {
          memory = "256Mi"
        }
      }
      webhook = {
        resources = {
          requests = {
            cpu    = "25m"
            memory = "64Mi"
          }
          limits = {
            memory = "128Mi"
          }
        }
      }
    })
  ]

  wait    = true
  timeout = 300
}
```

## Configuring a Let's Encrypt ClusterIssuer

A ClusterIssuer works across all namespaces. This is the most common setup for Let's Encrypt.

```hcl
# Let's Encrypt staging issuer for testing
resource "kubectl_manifest" "letsencrypt_staging" {
  yaml_body = <<YAML
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    # Staging endpoint for testing - does not count against rate limits
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: ${var.acme_email}
    privateKeySecretRef:
      name: letsencrypt-staging-key
    solvers:
      - http01:
          ingress:
            class: nginx
YAML

  depends_on = [helm_release.cert_manager]
}

# Let's Encrypt production issuer
resource "kubectl_manifest" "letsencrypt_prod" {
  yaml_body = <<YAML
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ${var.acme_email}
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: nginx
YAML

  depends_on = [helm_release.cert_manager]
}
```

## DNS01 Challenge for Wildcard Certificates

HTTP01 challenges cannot issue wildcard certificates. For wildcards, you need DNS01 validation. Here is how to set it up with AWS Route53.

```hcl
# Create an IAM policy for cert-manager to manage Route53 records
resource "aws_iam_policy" "cert_manager" {
  name = "cert-manager-route53"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "route53:GetChange"
        ]
        Resource = "arn:aws:route53:::change/*"
      },
      {
        Effect = "Allow"
        Action = [
          "route53:ChangeResourceRecordSets",
          "route53:ListResourceRecordSets"
        ]
        Resource = "arn:aws:route53:::hostedzone/${var.route53_zone_id}"
      },
      {
        Effect = "Allow"
        Action = [
          "route53:ListHostedZonesByName"
        ]
        Resource = "*"
      }
    ]
  })
}

# Create an IRSA role for cert-manager (EKS)
module "cert_manager_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "5.33.0"

  role_name = "cert-manager"

  role_policy_arns = {
    policy = aws_iam_policy.cert_manager.arn
  }

  oidc_providers = {
    main = {
      provider_arn               = var.oidc_provider_arn
      namespace_service_accounts = ["cert-manager:cert-manager"]
    }
  }
}

# ClusterIssuer with DNS01 challenge using Route53
resource "kubectl_manifest" "letsencrypt_dns" {
  yaml_body = <<YAML
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ${var.acme_email}
    privateKeySecretRef:
      name: letsencrypt-dns-key
    solvers:
      - dns01:
          route53:
            region: ${var.aws_region}
            hostedZoneID: ${var.route53_zone_id}
        selector:
          dnsZones:
            - "${var.domain}"
YAML

  depends_on = [helm_release.cert_manager]
}

# Request a wildcard certificate
resource "kubectl_manifest" "wildcard_certificate" {
  yaml_body = <<YAML
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-cert
  namespace: production
spec:
  secretName: wildcard-tls
  issuerRef:
    name: letsencrypt-dns
    kind: ClusterIssuer
  dnsNames:
    - "${var.domain}"
    - "*.${var.domain}"
  # Renew 30 days before expiry
  renewBefore: 720h
YAML

  depends_on = [kubectl_manifest.letsencrypt_dns]
}
```

## Google Cloud DNS Configuration

For GKE clusters using Cloud DNS:

```hcl
# Create a service account for cert-manager
resource "google_service_account" "cert_manager" {
  account_id   = "cert-manager"
  display_name = "cert-manager DNS solver"
}

# Grant DNS admin permissions
resource "google_project_iam_member" "cert_manager_dns" {
  project = var.gcp_project
  role    = "roles/dns.admin"
  member  = "serviceAccount:${google_service_account.cert_manager.email}"
}

# Create a key for the service account
resource "google_service_account_key" "cert_manager" {
  service_account_id = google_service_account.cert_manager.name
}

# Store the key as a Kubernetes secret
resource "kubernetes_secret" "cert_manager_gcp" {
  metadata {
    name      = "cert-manager-gcp-key"
    namespace = "cert-manager"
  }

  data = {
    "key.json" = base64decode(google_service_account_key.cert_manager.private_key)
  }
}

# ClusterIssuer with Google Cloud DNS
resource "kubectl_manifest" "letsencrypt_gcp" {
  yaml_body = <<YAML
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-gcp
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ${var.acme_email}
    privateKeySecretRef:
      name: letsencrypt-gcp-key
    solvers:
      - dns01:
          cloudDNS:
            project: ${var.gcp_project}
            serviceAccountSecretRef:
              name: cert-manager-gcp-key
              key: key.json
YAML

  depends_on = [
    helm_release.cert_manager,
    kubernetes_secret.cert_manager_gcp,
  ]
}
```

## Using Certificates with Ingress

The easiest way to use cert-manager is through ingress annotations. cert-manager watches for annotated ingress resources and automatically creates certificates.

```hcl
# Ingress with automatic certificate provisioning
resource "kubernetes_ingress_v1" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"

    annotations = {
      # Tell cert-manager to issue a certificate
      "cert-manager.io/cluster-issuer" = "letsencrypt-prod"
    }
  }

  spec {
    ingress_class_name = "nginx"

    tls {
      hosts       = ["app.example.com"]
      secret_name = "app-tls"
    }

    rule {
      host = "app.example.com"

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = "my-app"
              port {
                number = 80
              }
            }
          }
        }
      }
    }
  }
}
```

## Monitoring cert-manager

Keep an eye on your certificates with Prometheus metrics.

```hcl
# Enable Prometheus metrics in cert-manager
resource "helm_release" "cert_manager" {
  # ... other config ...

  values = [
    yamlencode({
      prometheus = {
        enabled = true
        servicemonitor = {
          enabled = true
          labels = {
            release = "kube-prometheus-stack"
          }
        }
      }
    })
  ]
}
```

Key metrics to monitor:
- `certmanager_certificate_ready_status` - whether certificates are valid
- `certmanager_certificate_expiration_timestamp_seconds` - when certificates expire
- `certmanager_certificate_renewal_timestamp_seconds` - when renewal is scheduled

## Troubleshooting

Common issues and how to check them:

```bash
# Check certificate status
kubectl get certificates -A
kubectl describe certificate app-tls -n production

# Check certificate requests
kubectl get certificaterequests -A

# Check orders (ACME)
kubectl get orders -A

# Check challenges (ACME)
kubectl get challenges -A

# cert-manager controller logs
kubectl logs -n cert-manager -l app.kubernetes.io/component=controller
```

## Best Practices

- Start with the staging issuer to avoid hitting Let's Encrypt rate limits
- Use DNS01 challenges for wildcard certificates
- Set `renewBefore` to ensure certificates renew well before expiry (default is 30 days)
- Monitor certificate expiration with Prometheus alerts
- Use IRSA or Workload Identity instead of static credentials for cloud DNS access
- Deploy cert-manager in its own namespace with appropriate RBAC

For more on securing Kubernetes ingress, see our guide on [deploying ingress controllers with Terraform](https://oneuptime.com/blog/post/2026-02-23-ingress-controllers-terraform/view).
