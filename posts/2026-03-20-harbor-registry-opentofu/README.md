# How to Deploy Harbor Container Registry with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Harbor, Container Registry, Kubernetes, Helm, Infrastructure as Code, Security

Description: Learn how to deploy Harbor container registry on Kubernetes using OpenTofu for a private, secure, and feature-rich Docker registry with vulnerability scanning and image replication.

---

Harbor is the CNCF-graduated container registry that provides image vulnerability scanning, RBAC, content trust, and replication. It's the go-to choice for teams needing more than a basic private registry. OpenTofu with Helm makes Harbor deployment repeatable and manageable.

## Deploying Harbor with Helm

```hcl
# main.tf

terraform {
  required_providers {
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
  }
}

provider "helm" {
  kubernetes {
    host                   = var.cluster_endpoint
    cluster_ca_certificate = base64decode(var.cluster_ca_cert)
    token                  = var.cluster_token
  }
}

provider "kubernetes" {
  host                   = var.cluster_endpoint
  cluster_ca_certificate = base64decode(var.cluster_ca_cert)
  token                  = var.cluster_token
}

resource "kubernetes_namespace" "harbor" {
  metadata {
    name = "harbor"
  }
}

resource "helm_release" "harbor" {
  name       = "harbor"
  repository = "https://helm.goharbor.io"
  chart      = "harbor"
  version    = "1.18.3"
  namespace  = kubernetes_namespace.harbor.metadata[0].name

  wait    = true
  timeout = 600

  values = [
    yamlencode({
      expose = {
        type = "ingress"
        tls = {
          enabled    = true
          certSource = "secret"
          secret = {
            secretName = "harbor-tls"
          }
        }
        ingress = {
          className = "nginx"
          hosts = {
            core = var.harbor_hostname
          }
          annotations = {
            "cert-manager.io/cluster-issuer"            = "letsencrypt-prod"
            "nginx.ingress.kubernetes.io/proxy-body-size" = "0"
          }
        }
      }

      # Set the public URL
      externalURL = "https://${var.harbor_hostname}"

      # Admin password
      harborAdminPassword = var.harbor_admin_password

      # Use external PostgreSQL for production
      database = {
        type = "external"
        external = {
          host     = var.postgres_host
          port     = "5432"
          username = "harbor"
          password = var.postgres_password
          coreDatabase = "registry"
        }
      }

      # Use external Redis for production
      redis = {
        type = "external"
        external = {
          addr     = "${var.redis_host}:6379"
          password = var.redis_password
        }
      }

      persistence = {
        enabled = true
        resourcePolicy = "keep"
        persistentVolumeClaim = {
          registry = {
            storageClass = var.storage_class
            size         = "100Gi"
          }
          jobservice = {
            jobLog = {
              storageClass = var.storage_class
              size         = "1Gi"
            }
          }
          trivy = {
            storageClass = var.storage_class
            size         = "5Gi"
          }
        }
      }

      # Enable Trivy vulnerability scanner
      trivy = {
        enabled  = true
        # Skip unpatched CVEs
        ignoreUnfixed = false
      }
    })
  ]
}
```

## Configuring Image Replication

```hcl
# replication.tf
# Pull-based replication from Docker Hub into an existing Harbor project
resource "null_resource" "configure_replication" {
  depends_on = [helm_release.harbor]

  provisioner "local-exec" {
    command = <<-EOF
      set -euo pipefail

      registry_id=$(
        curl -fsS -u "admin:${var.harbor_admin_password}" \
          -D - -o /dev/null \
          -X POST "${var.harbor_url}/api/v2.0/registries" \
          -H "Content-Type: application/json" \
          -d '{
            "name": "docker-hub",
            "type": "docker-hub",
            "url": "https://hub.docker.com",
            "credential": {
              "type": "basic",
              "access_key": "${var.dockerhub_username}",
              "access_secret": "${var.dockerhub_token}"
            },
            "insecure": false,
            "description": "Docker Hub registry"
          }' \
        | awk -F/ '/^Location:/ {print $NF}' | tr -d '\r'
      )

      curl -fsS -u "admin:${var.harbor_admin_password}" \
        -X POST "${var.harbor_url}/api/v2.0/replication/policies" \
        -H "Content-Type: application/json" \
        -d '{
          "name": "docker-hub-alpine",
          "description": "Pull alpine from Docker Hub",
          "src_registry": {
            "id": '"$registry_id"'
          },
          "dest_namespace": "${var.replication_project}",
          "trigger": {
            "type": "manual",
            "trigger_settings": {
              "cron": ""
            }
          },
          "filters": [
            {
              "type": "name",
              "value": "library/alpine"
            },
            {
              "type": "tag",
              "value": "latest"
            }
          ],
          "enabled": true,
          "replicate_deletion": false,
          "override": true
        }'
    EOF
  }
}
```

## Best Practices

- Use external PostgreSQL and Redis for production - the bundled services are not suitable for high-availability deployments.
- Enable Trivy scanning, then use Harbor project settings to automatically scan images on push and block images with critical vulnerabilities from being pulled.
- Set up replication rules to mirror base images from Docker Hub - this prevents builds from failing when Docker Hub rate-limits your nodes.
- Use `resourcePolicy: keep` on persistent volumes so deleting the Helm release doesn't delete your image data.
- Enable content trust with Cosign or Notation for production deployments so signed artifacts can be verified before deployment.
