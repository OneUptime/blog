# How to Configure Terraform Depends_on for Kubernetes Resource Ordering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Dependencies

Description: Master the depends_on meta-argument to control resource creation order in Kubernetes, ensuring dependencies are satisfied before dependent resources are created.

---

Terraform automatically determines resource dependencies by analyzing references between resources. However, some dependencies are implicit and cannot be detected automatically. The depends_on meta-argument explicitly declares dependencies, forcing Terraform to create resources in a specific order. In Kubernetes environments, this becomes essential when dealing with Custom Resource Definitions, RBAC permissions, namespaces, and operators that must exist before other resources can function.

## Understanding Implicit vs Explicit Dependencies

Terraform detects implicit dependencies automatically when you reference one resource in another:

```hcl
resource "kubernetes_namespace" "app" {
  metadata {
    name = "myapp"
  }
}

resource "kubernetes_deployment" "api" {
  metadata {
    name      = "api"
    namespace = kubernetes_namespace.app.metadata[0].name  # Implicit dependency
  }
  # ... spec
}
```

The deployment implicitly depends on the namespace because it references the namespace name. Terraform creates the namespace first.

However, some dependencies cannot be expressed through references. For example, a CRD must exist before you can create instances of that custom resource, but there's no direct reference relationship.

## Basic depends_on Usage with CRDs

Custom Resource Definitions must be installed before creating custom resources. Use depends_on to enforce this order:

```hcl
resource "kubernetes_manifest" "app_crd" {
  manifest = {
    apiVersion = "apiextensions.k8s.io/v1"
    kind       = "CustomResourceDefinition"
    metadata = {
      name = "applications.platform.example.com"
    }
    spec = {
      group = "platform.example.com"
      names = {
        kind     = "Application"
        listKind = "ApplicationList"
        plural   = "applications"
        singular = "application"
      }
      scope = "Namespaced"
      versions = [{
        name    = "v1"
        served  = true
        storage = true
        schema = {
          openAPIV3Schema = {
            type = "object"
            properties = {
              spec = {
                type = "object"
                properties = {
                  image = {
                    type = "string"
                  }
                  replicas = {
                    type    = "integer"
                    minimum = 1
                  }
                }
              }
            }
          }
        }
      }]
    }
  }
}

resource "kubernetes_manifest" "my_application" {
  manifest = {
    apiVersion = "platform.example.com/v1"
    kind       = "Application"
    metadata = {
      name      = "web-app"
      namespace = "default"
    }
    spec = {
      image    = "nginx:latest"
      replicas = 3
    }
  }

  depends_on = [
    kubernetes_manifest.app_crd  # Ensure CRD exists first
  ]
}
```

Without depends_on, Terraform might try to create the custom resource before the CRD exists, causing the apply to fail.

## RBAC Dependencies

Role-based access control resources have a specific order requirement. ServiceAccounts, Roles, and RoleBindings must be created in sequence:

```hcl
resource "kubernetes_namespace" "app" {
  metadata {
    name = "application"
  }
}

resource "kubernetes_service_account" "app" {
  metadata {
    name      = "app-service-account"
    namespace = kubernetes_namespace.app.metadata[0].name
  }
}

resource "kubernetes_role" "app" {
  metadata {
    name      = "app-role"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  rule {
    api_groups = [""]
    resources  = ["pods", "services"]
    verbs      = ["get", "list", "watch"]
  }

  rule {
    api_groups = ["apps"]
    resources  = ["deployments"]
    verbs      = ["get", "list", "watch", "create", "update", "patch"]
  }
}

resource "kubernetes_role_binding" "app" {
  metadata {
    name      = "app-role-binding"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.app.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.app.metadata[0].name
    namespace = kubernetes_namespace.app.metadata[0].name
  }
}

resource "kubernetes_deployment" "app" {
  metadata {
    name      = "application"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "application"
      }
    }

    template {
      metadata {
        labels = {
          app = "application"
        }
      }

      spec {
        service_account_name = kubernetes_service_account.app.metadata[0].name

        container {
          name  = "app"
          image = "myapp/api:v1.0"

          port {
            container_port = 8080
          }
        }
      }
    }
  }

  depends_on = [
    kubernetes_role_binding.app  # Ensure RBAC is fully configured
  ]
}
```

The deployment depends on the role binding, which implicitly depends on both the role and service account. This ensures complete RBAC setup before the deployment starts.

## Operator Installation Dependencies

When installing operators, the operator deployment must be ready before creating resources it manages:

```hcl
# Install the operator
resource "kubernetes_deployment" "cert_manager" {
  metadata {
    name      = "cert-manager"
    namespace = "cert-manager"
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = "cert-manager"
      }
    }

    template {
      metadata {
        labels = {
          app = "cert-manager"
        }
      }

      spec {
        container {
          name  = "cert-manager"
          image = "quay.io/jetstack/cert-manager-controller:v1.11.0"

          args = [
            "--v=2",
            "--cluster-resource-namespace=$(POD_NAMESPACE)",
            "--leader-election-namespace=kube-system"
          ]
        }
      }
    }
  }
}

# Wait for operator webhook to be ready
resource "null_resource" "wait_for_cert_manager" {
  provisioner "local-exec" {
    command = "kubectl wait --for=condition=Available --timeout=300s deployment/cert-manager -n cert-manager"
  }

  depends_on = [
    kubernetes_deployment.cert_manager
  ]
}

# Create ClusterIssuer managed by cert-manager
resource "kubernetes_manifest" "letsencrypt_issuer" {
  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "ClusterIssuer"
    metadata = {
      name = "letsencrypt-prod"
    }
    spec = {
      acme = {
        server = "https://acme-v02.api.letsencrypt.org/directory"
        email  = "admin@example.com"
        privateKeySecretRef = {
          name = "letsencrypt-prod"
        }
        solvers = [{
          http01 = {
            ingress = {
              class = "nginx"
            }
          }
        }]
      }
    }
  }

  depends_on = [
    null_resource.wait_for_cert_manager  # Ensure operator is ready
  ]
}

# Certificate depends on issuer
resource "kubernetes_manifest" "app_certificate" {
  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "Certificate"
    metadata = {
      name      = "app-tls"
      namespace = "production"
    }
    spec = {
      secretName = "app-tls-secret"
      issuerRef = {
        name = "letsencrypt-prod"
        kind = "ClusterIssuer"
      }
      dnsNames = [
        "app.example.com",
        "www.app.example.com"
      ]
    }
  }

  depends_on = [
    kubernetes_manifest.letsencrypt_issuer
  ]
}
```

This chain ensures the cert-manager operator is fully operational before creating issuers and certificates.

## Network Policy Dependencies

Network policies should be created after workloads to prevent connectivity issues during deployment:

```hcl
resource "kubernetes_deployment" "frontend" {
  metadata {
    name      = "frontend"
    namespace = "production"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app  = "frontend"
        tier = "web"
      }
    }

    template {
      metadata {
        labels = {
          app  = "frontend"
          tier = "web"
        }
      }

      spec {
        container {
          name  = "nginx"
          image = "nginx:1.21"

          port {
            container_port = 80
          }
        }
      }
    }
  }
}

resource "kubernetes_deployment" "backend" {
  metadata {
    name      = "backend"
    namespace = "production"
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app  = "backend"
        tier = "api"
      }
    }

    template {
      metadata {
        labels = {
          app  = "backend"
          tier = "api"
        }
      }

      spec {
        container {
          name  = "api"
          image = "myapp/api:v1.0"

          port {
            container_port = 8080
          }
        }
      }
    }
  }
}

# Network policy applied after deployments exist
resource "kubernetes_network_policy" "deny_all_ingress" {
  metadata {
    name      = "deny-all-ingress"
    namespace = "production"
  }

  spec {
    pod_selector {}  # Applies to all pods

    policy_types = ["Ingress"]
  }

  depends_on = [
    kubernetes_deployment.frontend,
    kubernetes_deployment.backend
  ]
}

resource "kubernetes_network_policy" "allow_frontend_to_backend" {
  metadata {
    name      = "allow-frontend-to-backend"
    namespace = "production"
  }

  spec {
    pod_selector {
      match_labels = {
        tier = "api"
      }
    }

    policy_types = ["Ingress"]

    ingress {
      from {
        pod_selector {
          match_labels = {
            tier = "web"
          }
        }
      }

      ports {
        protocol = "TCP"
        port     = "8080"
      }
    }
  }

  depends_on = [
    kubernetes_network_policy.deny_all_ingress
  ]
}
```

This ensures workloads start before network restrictions apply, preventing startup failures.

## Database Initialization Dependencies

When deploying stateful applications, initialization jobs should complete before application deployment:

```hcl
resource "kubernetes_secret" "db_credentials" {
  metadata {
    name      = "db-credentials"
    namespace = "production"
  }

  data = {
    username = base64encode("appuser")
    password = base64encode("securepassword")
  }
}

resource "kubernetes_stateful_set" "postgres" {
  metadata {
    name      = "postgres"
    namespace = "production"
  }

  spec {
    service_name = "postgres"
    replicas     = 1

    selector {
      match_labels = {
        app = "postgres"
      }
    }

    template {
      metadata {
        labels = {
          app = "postgres"
        }
      }

      spec {
        container {
          name  = "postgres"
          image = "postgres:14"

          env {
            name = "POSTGRES_USER"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.db_credentials.metadata[0].name
                key  = "username"
              }
            }
          }

          env {
            name = "POSTGRES_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.db_credentials.metadata[0].name
                key  = "password"
              }
            }
          }

          volume_mount {
            name       = "data"
            mount_path = "/var/lib/postgresql/data"
          }
        }
      }
    }

    volume_claim_template {
      metadata {
        name = "data"
      }

      spec {
        access_modes = ["ReadWriteOnce"]
        resources {
          requests = {
            storage = "20Gi"
          }
        }
      }
    }
  }
}

# Job to initialize database schema
resource "kubernetes_job" "db_migration" {
  metadata {
    name      = "db-migration"
    namespace = "production"
  }

  spec {
    template {
      metadata {}

      spec {
        container {
          name  = "migrate"
          image = "myapp/db-migrate:v1.0"

          env {
            name  = "DATABASE_URL"
            value = "postgresql://postgres.production.svc.cluster.local:5432/myapp"
          }

          env {
            name = "DB_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.db_credentials.metadata[0].name
                key  = "password"
              }
            }
          }
        }

        restart_policy = "Never"
      }
    }

    backoff_limit = 4
  }

  depends_on = [
    kubernetes_stateful_set.postgres
  ]
}

# Application deployment waits for migration
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "application"
    namespace = "production"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "application"
      }
    }

    template {
      metadata {
        labels = {
          app = "application"
        }
      }

      spec {
        container {
          name  = "app"
          image = "myapp/application:v1.0"

          env {
            name  = "DATABASE_URL"
            value = "postgresql://postgres.production.svc.cluster.local:5432/myapp"
          }
        }
      }
    }
  }

  depends_on = [
    kubernetes_job.db_migration
  ]
}
```

The application waits for the database migration job to complete before starting.

## Multiple Dependencies

You can specify multiple resources in depends_on:

```hcl
resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "app-config"
    namespace = "production"
  }

  data = {
    api_url = "https://api.example.com"
  }
}

resource "kubernetes_secret" "app_secrets" {
  metadata {
    name      = "app-secrets"
    namespace = "production"
  }

  data = {
    api_key = base64encode("secret-key")
  }
}

resource "kubernetes_persistent_volume_claim" "app_storage" {
  metadata {
    name      = "app-storage"
    namespace = "production"
  }

  spec {
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        storage = "10Gi"
      }
    }
  }
}

resource "kubernetes_deployment" "app" {
  metadata {
    name      = "app"
    namespace = "production"
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "app"
      }
    }

    template {
      metadata {
        labels = {
          app = "app"
        }
      }

      spec {
        container {
          name  = "app"
          image = "myapp/app:v1.0"
        }
      }
    }
  }

  depends_on = [
    kubernetes_config_map.app_config,
    kubernetes_secret.app_secrets,
    kubernetes_persistent_volume_claim.app_storage
  ]
}
```

All listed dependencies must be created before the deployment starts.

## Module Dependencies

Use depends_on with modules to control module execution order:

```hcl
module "monitoring" {
  source = "./modules/monitoring"

  namespace = "monitoring"
}

module "application" {
  source = "./modules/application"

  namespace       = "production"
  monitoring_url  = module.monitoring.prometheus_url

  depends_on = [
    module.monitoring  # Ensure monitoring is ready first
  ]
}
```

The application module waits for the monitoring module to complete before starting.

## Best Practices for depends_on

Follow these guidelines when using depends_on:

1. **Use sparingly** - Terraform automatically detects most dependencies. Only use depends_on when necessary.

2. **Avoid circular dependencies** - If resource A depends on B, B cannot depend on A.

3. **Document why** - Add comments explaining why the dependency is needed.

4. **Consider alternatives** - Sometimes restructuring resources or using null_resource with provisioners works better.

5. **Test dependency chains** - Destroy and recreate resources to verify dependencies work correctly.

6. **Use with lifecycle rules** - Combine depends_on with create_before_destroy for complex scenarios.

The depends_on meta-argument provides explicit control over resource creation order when Terraform cannot infer dependencies automatically. In Kubernetes environments with CRDs, operators, and complex initialization sequences, depends_on ensures resources are created in the correct order, preventing failures and reducing deployment complexity.
