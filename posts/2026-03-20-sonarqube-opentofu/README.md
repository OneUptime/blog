# How to Deploy SonarQube with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, SonarQube, Code Quality, Kubernetes, Helm, Infrastructure as Code, DevSecOps

Description: Learn how to deploy SonarQube on Kubernetes using OpenTofu for automated code quality analysis, security scanning, and technical debt tracking across your repositories.

---

SonarQube is the leading platform for continuous inspection of code quality. It detects bugs, vulnerabilities, and code smells across 30+ programming languages. Deploying it via OpenTofu with Helm ensures your code quality infrastructure is as well-managed as the code it analyzes.

## Deploying SonarQube with Helm

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

resource "kubernetes_namespace" "sonarqube" {
  metadata {
    name = "sonarqube"
  }
}

# PostgreSQL database for SonarQube
resource "helm_release" "postgresql" {
  name       = "postgresql"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "postgresql"
  version    = "13.4.4"
  namespace  = kubernetes_namespace.sonarqube.metadata[0].name

  values = [
    yamlencode({
      auth = {
        username = "sonarqube"
        password = var.postgres_password
        database = "sonarqube"
      }
      primary = {
        persistence = {
          size = "20Gi"
        }
      }
    })
  ]
}

# SonarQube application
resource "helm_release" "sonarqube" {
  depends_on = [helm_release.postgresql]

  name       = "sonarqube"
  repository = "https://SonarSource.github.io/helm-chart-sonarqube"
  chart      = "sonarqube"
  version    = "10.4.1+2389"
  namespace  = kubernetes_namespace.sonarqube.metadata[0].name

  wait    = true
  timeout = 600  # SonarQube takes a while to start

  values = [
    yamlencode({
      # Use external PostgreSQL
      postgresql = {
        enabled = false  # Disable bundled PostgreSQL
      }

      jdbcOverwrite = {
        enable       = true
        jdbcUrl      = "jdbc:postgresql://postgresql:5432/sonarqube"
        jdbcUsername = "sonarqube"
        jdbcPassword = var.postgres_password
      }

      # Persistent storage for SonarQube's bundled Elasticsearch indexes
      persistence = {
        enabled          = true
        storageClass     = var.storage_class
        size             = "20Gi"
      }

      ingress = {
        enabled = true
        ingressClassName = "nginx"
        annotations = {
          "cert-manager.io/cluster-issuer" = "letsencrypt-prod"
        }
        hosts = [
          {
            name  = var.sonarqube_hostname
            path  = "/"
          }
        ]
        tls = [
          {
            secretName = "sonarqube-tls"
            hosts      = [var.sonarqube_hostname]
          }
        ]
      }

      resources = {
        requests = {
          cpu    = "500m"
          memory = "2Gi"
        }
        limits = {
          cpu    = "2"
          memory = "4Gi"
        }
      }

      # JVM memory settings
      sonarProperties = {
        "sonar.web.javaOpts" = "-Xmx1536m -Xms1536m"
        "sonar.ce.javaOpts"  = "-Xmx512m -Xms128m"
      }
    })
  ]
}
```

## Configuring System Tuning

SonarQube requires elevated virtual memory. Set this via a DaemonSet init container.

```hcl
# sysctl.tf
# Increase vm.max_map_count on nodes (required by SonarQube's Elasticsearch)
resource "kubernetes_daemon_set_v1" "sysctl" {
  metadata {
    name      = "sysctl-tuner"
    namespace = kubernetes_namespace.sonarqube.metadata[0].name
  }

  spec {
    selector {
      match_labels = {
        app = "sysctl-tuner"
      }
    }

    template {
      metadata {
        labels = {
          app = "sysctl-tuner"
        }
      }

      spec {
        init_container {
          name  = "set-vm-max-map-count"
          image = "busybox:1.35"
          command = ["sysctl", "-w", "vm.max_map_count=524288"]
          security_context {
            privileged = true
          }
        }

        container {
          name  = "pause"
          image = "registry.k8s.io/pause:3.9"
        }
      }
    }
  }
}
```

## Best Practices

- Use an external PostgreSQL instance rather than the bundled one for production - it's easier to back up, scale, and upgrade independently.
- Set `vm.max_map_count=524288` on all nodes - SonarQube will fail to start without this due to Elasticsearch requirements.
- Configure authentication with LDAP or SAML for production deployments - avoid sharing the admin account.
- Set memory limits appropriate for your codebase size - large projects require significantly more JVM heap.
- Enable SonarQube's webhook integration to fail pull requests that violate quality gates.
