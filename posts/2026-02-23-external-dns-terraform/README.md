# How to Deploy External DNS with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, External DNS, Route53, Cloud DNS, DevOps

Description: Learn how to deploy and configure ExternalDNS on Kubernetes with Terraform to automatically manage DNS records from ingress resources and services across AWS, GCP, and Azure.

---

ExternalDNS automates DNS record management for Kubernetes. When you create an ingress or a LoadBalancer service with the right annotations, ExternalDNS picks it up and creates the corresponding DNS record in Route53, Cloud DNS, Azure DNS, or any other supported provider. No more manually creating DNS records or writing separate Terraform for them.

This guide covers deploying ExternalDNS with Terraform and configuring it for the major cloud providers.

## How ExternalDNS Works

ExternalDNS watches Kubernetes resources - typically Ingress and Service objects - for hostname annotations. When it finds one, it creates a DNS record pointing to the resource's external IP or hostname. When the Kubernetes resource is deleted, ExternalDNS removes the DNS record.

The key annotation is `external-dns.alpha.kubernetes.io/hostname`. Add it to any service or ingress, and ExternalDNS handles the rest.

## ExternalDNS on AWS (Route53)

The most common setup. ExternalDNS needs IAM permissions to modify Route53 records.

```hcl
# Create IAM policy for ExternalDNS
resource "aws_iam_policy" "external_dns" {
  name = "external-dns"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "route53:ChangeResourceRecordSets"
        ]
        Resource = [
          "arn:aws:route53:::hostedzone/${var.route53_zone_id}"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "route53:ListHostedZones",
          "route53:ListResourceRecordSets",
          "route53:ListTagsForResource"
        ]
        Resource = ["*"]
      }
    ]
  })
}

# IRSA role for ExternalDNS (EKS)
module "external_dns_irsa" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "5.33.0"

  role_name = "external-dns"

  role_policy_arns = {
    policy = aws_iam_policy.external_dns.arn
  }

  oidc_providers = {
    main = {
      provider_arn               = var.oidc_provider_arn
      namespace_service_accounts = ["external-dns:external-dns"]
    }
  }
}

# Deploy ExternalDNS
resource "helm_release" "external_dns" {
  name             = "external-dns"
  repository       = "https://kubernetes-sigs.github.io/external-dns/"
  chart            = "external-dns"
  namespace        = "external-dns"
  create_namespace = true
  version          = "1.14.0"

  values = [
    yamlencode({
      provider = "aws"

      # Only manage records in specific hosted zones
      domainFilters = [var.domain]

      # Use the TXT registry to track ownership
      registry = "txt"
      txtOwnerId = var.cluster_name

      # Policy: sync creates, updates, and deletes records
      # Use "upsert-only" if you do not want ExternalDNS to delete records
      policy = "sync"

      # AWS-specific settings
      aws = {
        region = var.aws_region
        zoneType = "public"  # or "private"
      }

      # Service account with IRSA annotation
      serviceAccount = {
        create = true
        name   = "external-dns"
        annotations = {
          "eks.amazonaws.com/role-arn" = module.external_dns_irsa.iam_role_arn
        }
      }

      # Resources
      resources = {
        requests = {
          cpu    = "50m"
          memory = "64Mi"
        }
        limits = {
          memory = "128Mi"
        }
      }

      # Watch these resource types for DNS records
      sources = [
        "service",
        "ingress",
      ]
    })
  ]
}
```

## ExternalDNS on GCP (Cloud DNS)

```hcl
# Create a service account for ExternalDNS
resource "google_service_account" "external_dns" {
  account_id   = "external-dns"
  display_name = "ExternalDNS"
}

# Grant DNS admin permissions
resource "google_project_iam_member" "external_dns" {
  project = var.gcp_project
  role    = "roles/dns.admin"
  member  = "serviceAccount:${google_service_account.external_dns.email}"
}

# Workload Identity binding
resource "google_service_account_iam_member" "external_dns_wi" {
  service_account_id = google_service_account.external_dns.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.gcp_project}.svc.id.goog[external-dns/external-dns]"
}

# Deploy ExternalDNS for GCP
resource "helm_release" "external_dns" {
  name             = "external-dns"
  repository       = "https://kubernetes-sigs.github.io/external-dns/"
  chart            = "external-dns"
  namespace        = "external-dns"
  create_namespace = true
  version          = "1.14.0"

  values = [
    yamlencode({
      provider = "google"

      domainFilters = [var.domain]
      registry      = "txt"
      txtOwnerId    = var.cluster_name
      policy        = "sync"

      google = {
        project = var.gcp_project
      }

      serviceAccount = {
        create = true
        name   = "external-dns"
        annotations = {
          "iam.gke.io/gcp-service-account" = google_service_account.external_dns.email
        }
      }

      sources = [
        "service",
        "ingress",
      ]
    })
  ]
}
```

## ExternalDNS on Azure

```hcl
# Deploy ExternalDNS for Azure DNS
resource "helm_release" "external_dns" {
  name             = "external-dns"
  repository       = "https://kubernetes-sigs.github.io/external-dns/"
  chart            = "external-dns"
  namespace        = "external-dns"
  create_namespace = true
  version          = "1.14.0"

  values = [
    yamlencode({
      provider = "azure"

      domainFilters = [var.domain]
      registry      = "txt"
      txtOwnerId    = var.cluster_name
      policy        = "sync"

      azure = {
        resourceGroup  = var.dns_resource_group
        tenantId       = var.tenant_id
        subscriptionId = var.subscription_id
        useManagedIdentityExtension = true
      }

      # Pod identity label for AAD Pod Identity
      podLabels = {
        "aadpodidbinding" = "external-dns"
      }

      sources = [
        "service",
        "ingress",
      ]
    })
  ]
}
```

## Using ExternalDNS with Services

Once ExternalDNS is running, annotate your services to create DNS records automatically.

```hcl
# Service with ExternalDNS annotation
resource "kubernetes_service" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"

    annotations = {
      # ExternalDNS picks this up and creates a DNS record
      "external-dns.alpha.kubernetes.io/hostname" = "app.${var.domain}"
      # Optional: set the TTL for the DNS record
      "external-dns.alpha.kubernetes.io/ttl"      = "300"
    }
  }

  spec {
    type = "LoadBalancer"

    selector = {
      app = "my-app"
    }

    port {
      port        = 443
      target_port = 8080
    }
  }
}
```

## Using ExternalDNS with Ingress

Ingress resources work automatically - ExternalDNS reads the hostname from the ingress rules.

```hcl
# Ingress - ExternalDNS reads the host from the rules
resource "kubernetes_ingress_v1" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"

    annotations = {
      # Optional: ExternalDNS will use the host from rules if not set
      "external-dns.alpha.kubernetes.io/hostname" = "app.${var.domain},api.${var.domain}"
    }
  }

  spec {
    ingress_class_name = "nginx"

    rule {
      host = "app.${var.domain}"

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = "frontend"
              port {
                number = 80
              }
            }
          }
        }
      }
    }

    rule {
      host = "api.${var.domain}"

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = "api"
              port {
                number = 8080
              }
            }
          }
        }
      }
    }
  }
}
```

## Multiple Domains and Zone Filtering

When managing multiple domains across different hosted zones:

```hcl
resource "helm_release" "external_dns" {
  # ... base config ...

  values = [
    yamlencode({
      provider = "aws"

      # Filter to only manage specific domains
      domainFilters = [
        "example.com",
        "internal.example.com"
      ]

      # Or filter by zone ID for more precision
      zoneIdFilters = [
        var.public_zone_id,
        var.private_zone_id
      ]

      # Exclude specific subdomains
      excludeDomains = [
        "staging.example.com"
      ]
    })
  ]
}
```

## Private DNS Zones

For internal services, use private DNS zones.

```hcl
# ExternalDNS for private hosted zones
resource "helm_release" "external_dns_private" {
  name      = "external-dns-private"
  repository = "https://kubernetes-sigs.github.io/external-dns/"
  chart     = "external-dns"
  namespace = "external-dns"
  version   = "1.14.0"

  values = [
    yamlencode({
      provider = "aws"

      # Only manage the private zone
      domainFilters = ["internal.example.com"]

      aws = {
        region   = var.aws_region
        zoneType = "private"
      }

      # Use a different TXT owner to avoid conflicts
      txtOwnerId = "${var.cluster_name}-private"

      # Different service account for private zone
      serviceAccount = {
        name = "external-dns-private"
        annotations = {
          "eks.amazonaws.com/role-arn" = module.external_dns_private_irsa.iam_role_arn
        }
      }

      sources = ["service"]
    })
  ]
}
```

## Dry Run and Safety

When first setting up ExternalDNS, run it in dry-run mode to verify what it would do.

```hcl
resource "helm_release" "external_dns" {
  # ... base config ...

  values = [
    yamlencode({
      # Dry run mode - logs what it would do without making changes
      dryRun = true

      # Or use upsert-only to prevent accidental deletions
      policy = "upsert-only"

      # Log level for debugging
      logLevel = "debug"
    })
  ]
}
```

## Best Practices

- Start with `policy: upsert-only` until you are confident, then switch to `sync`
- Always use `domainFilters` to prevent ExternalDNS from touching unrelated zones
- Set a unique `txtOwnerId` per cluster to prevent conflicts in multi-cluster setups
- Use IRSA, Workload Identity, or Managed Identity instead of static credentials
- Run ExternalDNS with minimal permissions - only the hosted zones it needs
- Monitor ExternalDNS logs for errors, especially during initial setup
- Use separate ExternalDNS instances for public and private zones

For more on ingress and networking, see our guide on [deploying ingress controllers with Terraform](https://oneuptime.com/blog/post/2026-02-23-ingress-controllers-terraform/view).
