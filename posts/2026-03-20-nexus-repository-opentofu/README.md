# How to Deploy Nexus Repository with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Nexus Repository, Artifact Management, Kubernetes, Helm, Infrastructure as Code, DevOps

Description: Learn how to deploy Sonatype Nexus Repository Manager on Kubernetes using OpenTofu for centralized artifact management, package proxying, and container registry capabilities.

---

Nexus Repository Manager is the enterprise artifact management solution that supports Maven, npm, Docker, PyPI, and 20+ other formats. It serves as a proxy for public registries (saving bandwidth and improving build reliability) and as a private registry for internal artifacts. OpenTofu automates its deployment.

## Deploying Nexus with Helm

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

resource "kubernetes_namespace" "nexus" {
  metadata {
    name = "nexus"
  }
}

resource "helm_release" "nexus" {
  name       = "nexus"
  repository = "https://sonatype.github.io/helm3-charts/"
  chart      = "nexus-repository-manager"
  version    = "64.2.0"
  namespace  = kubernetes_namespace.nexus.metadata[0].name

  wait    = true
  timeout = 600

  values = [
    yamlencode({
      nexus = {
        # Docker port for the container registry
        docker = {
          enabled = true
          registries = [
            { host = var.nexus_docker_hostname, port = 8082 },
            { host = var.nexus_docker_proxy_hostname, port = 8083 }
          ]
        }

        resources = {
          requests = {
            cpu    = "500m"
            memory = "2Gi"
          }
          limits = {
            cpu    = "4"
            memory = "8Gi"
          }
        }

        # JVM tuning
        env = [
          { name = "INSTALL4J_ADD_VM_PARAMS", value = "-Xms2g -Xmx2g -XX:MaxDirectMemorySize=2g" }
        ]
      }

      # Persistent storage for Nexus data
      persistence = {
        enabled          = true
        storageClass     = var.storage_class
        storageSize      = "200Gi"
      }

      ingress = {
        enabled = true
        annotations = {
          "kubernetes.io/ingress.class"               = "nginx"
          "cert-manager.io/cluster-issuer"            = "letsencrypt-prod"
          "nginx.ingress.kubernetes.io/proxy-body-size" = "0"  # Allow large uploads
        }
        hostRepo = var.nexus_hostname
      }
    })
  ]
}
```

## Exposing the Docker Registry Port

```hcl
# docker_registry.tf
# Nexus needs separate ingress entries for the Docker registry port
resource "kubernetes_ingress_v1" "nexus_docker" {
  metadata {
    name      = "nexus-docker-registry"
    namespace = kubernetes_namespace.nexus.metadata[0].name
    annotations = {
      "kubernetes.io/ingress.class"               = "nginx"
      "cert-manager.io/cluster-issuer"            = "letsencrypt-prod"
      "nginx.ingress.kubernetes.io/proxy-body-size" = "0"
    }
  }

  spec {
    tls {
      hosts       = [var.nexus_docker_hostname]
      secret_name = "nexus-docker-tls"
    }

    rule {
      host = var.nexus_docker_hostname
      http {
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = "nexus-nexus-repository-manager"
              port {
                number = 8082
              }
            }
          }
        }
      }
    }
  }
}
```

## Configuring Repositories via REST API

```hcl
# repos.tf
# Use a null_resource to configure repositories after Nexus starts
resource "null_resource" "configure_maven_proxy" {
  depends_on = [helm_release.nexus]

  provisioner "local-exec" {
    command = <<-EOF
      curl -s -u admin:${var.nexus_admin_password} \
        -X POST "${var.nexus_url}/service/rest/v1/repositories/maven/proxy" \
        -H "Content-Type: application/json" \
        -d '{
          "name": "maven-central",
          "online": true,
          "storage": {
            "blobStoreName": "default",
            "strictContentTypeValidation": false
          },
          "proxy": {
            "remoteUrl": "https://repo1.maven.org/maven2/",
            "contentMaxAge": 1440,
            "metadataMaxAge": 1440
          },
          "negativeCache": {
            "enabled": true,
            "timeToLive": 1440
          },
          "httpClient": {
            "blocked": false,
            "autoBlock": false
          },
          "maven": {
            "versionPolicy": "RELEASE",
            "layoutPolicy": "STRICT"
          }
        }'
    EOF
  }
}
```

## Best Practices

- Allocate at least 200Gi of persistent storage - Nexus caches proxied artifacts and can grow large over time.
- Increase JVM memory settings as your artifact counts grow - the default settings are too conservative for busy repositories.
- Enable anonymous access for proxy repositories so developers don't need credentials for public packages.
- Use Nexus IQ Server (if licensed) to scan artifacts for security vulnerabilities.
- Set `nginx.ingress.kubernetes.io/proxy-body-size: "0"` to remove the upload size limit for large artifacts.
