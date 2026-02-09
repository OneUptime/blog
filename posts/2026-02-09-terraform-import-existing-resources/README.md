# How to Implement Terraform Import for Existing Kubernetes Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Import

Description: Learn how to import existing Kubernetes resources into Terraform state, enabling you to manage manually-created resources with infrastructure as code.

---

Organizations often start with manually-created Kubernetes resources before adopting Terraform. Importing existing resources into Terraform state allows you to bring these resources under infrastructure as code management without recreating them. This process requires careful planning and execution to avoid disrupting running applications.

## Understanding Terraform Import

The terraform import command adds existing infrastructure to your Terraform state file. It doesn't generate configuration automatically, so you must write the resource configuration yourself that matches the existing resource. After import, Terraform manages the resource lifecycle just like resources it created.

## Basic Import Workflow

The import process follows these steps:

1. Write the resource configuration in Terraform files
2. Run terraform import with the resource address and identifier
3. Run terraform plan to verify the import matches
4. Adjust configuration if there are differences
5. Apply to ensure state is consistent

## Importing a Namespace

Start with a simple example importing an existing namespace:

```hcl
# Write the configuration first
resource "kubernetes_namespace" "app" {
  metadata {
    name = "application"
  }
}
```

Import the existing namespace:

```bash
terraform import kubernetes_namespace.app application
```

Verify the import with terraform plan. You'll likely see differences in labels, annotations, or other computed fields. Adjust your configuration to match:

```hcl
resource "kubernetes_namespace" "app" {
  metadata {
    name = "application"
    labels = {
      name = "application"
      environment = "production"
    }
  }
}
```

Run terraform plan again until it shows no changes.

## Importing Deployments

Deployments require more complex configuration. First, inspect the existing deployment:

```bash
kubectl get deployment api -n production -o yaml > api-deployment.yaml
```

Write the Terraform configuration based on the YAML:

```hcl
resource "kubernetes_deployment" "api" {
  metadata {
    name      = "api"
    namespace = "production"
    labels = {
      app = "api"
    }
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "api"
      }
    }

    template {
      metadata {
        labels = {
          app = "api"
        }
      }

      spec {
        container {
          name  = "api"
          image = "myapp/api:v1.2.0"

          port {
            container_port = 8080
          }

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
          }

          env {
            name  = "DATABASE_URL"
            value = "postgres://db:5432/app"
          }

          env {
            name  = "LOG_LEVEL"
            value = "info"
          }

          liveness_probe {
            http_get {
              path = "/health"
              port = 8080
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }

          readiness_probe {
            http_get {
              path = "/ready"
              port = 8080
            }
            initial_delay_seconds = 10
            period_seconds        = 5
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      spec[0].replicas  # If using HPA
    ]
  }
}
```

Import the deployment:

```bash
terraform import kubernetes_deployment.api production/api
```

The format is `namespace/name` for namespaced resources.

## Importing Services

Services are straightforward to import:

```hcl
resource "kubernetes_service" "api" {
  metadata {
    name      = "api"
    namespace = "production"
  }

  spec {
    selector = {
      app = "api"
    }

    port {
      name        = "http"
      port        = 80
      target_port = 8080
      protocol    = "TCP"
    }

    type = "LoadBalancer"

    session_affinity = "ClientIP"
  }
}
```

Import command:

```bash
terraform import kubernetes_service.api production/api
```

## Importing ConfigMaps and Secrets

ConfigMaps and Secrets often contain many key-value pairs. Capture all of them:

```hcl
resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "app-config"
    namespace = "production"
  }

  data = {
    database_host = "postgres.production.svc.cluster.local"
    cache_host    = "redis.production.svc.cluster.local"
    api_timeout   = "30"
    max_connections = "100"
    log_level     = "info"
    feature_flag_new_ui = "true"
  }
}

resource "kubernetes_secret" "app_secrets" {
  metadata {
    name      = "app-secrets"
    namespace = "production"
  }

  type = "Opaque"

  data = {
    api_key      = "base64encodedkey=="
    db_password  = "base64encodedpassword=="
    jwt_secret   = "base64encodedsecret=="
  }
}
```

Import both:

```bash
terraform import kubernetes_config_map.app_config production/app-config
terraform import kubernetes_secret.app_secrets production/app-secrets
```

## Importing StatefulSets

StatefulSets include volume claim templates that must match exactly:

```hcl
resource "kubernetes_stateful_set" "postgres" {
  metadata {
    name      = "postgres"
    namespace = "production"
  }

  spec {
    service_name = "postgres"
    replicas     = 3

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

          port {
            container_port = 5432
            name          = "postgres"
          }

          env {
            name  = "POSTGRES_DB"
            value = "myapp"
          }

          env {
            name = "POSTGRES_PASSWORD"
            value_from {
              secret_key_ref {
                name = "postgres-secrets"
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
            storage = "50Gi"
          }
        }
        storage_class_name = "fast-ssd"
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}
```

Import command:

```bash
terraform import kubernetes_stateful_set.postgres production/postgres
```

## Importing Persistent Volume Claims

PVCs need careful attention to storage class and capacity:

```hcl
resource "kubernetes_persistent_volume_claim" "app_storage" {
  metadata {
    name      = "app-storage"
    namespace = "production"
  }

  spec {
    access_modes = ["ReadWriteOnce"]

    resources {
      requests = {
        storage = "100Gi"
      }
    }

    storage_class_name = "fast-ssd"
  }

  lifecycle {
    prevent_destroy = true
  }
}
```

Import command:

```bash
terraform import kubernetes_persistent_volume_claim.app_storage production/app-storage
```

Add prevent_destroy to avoid accidental data loss.

## Importing Ingress Resources

Ingress resources can have many rules and annotations:

```hcl
resource "kubernetes_ingress_v1" "app" {
  metadata {
    name      = "app-ingress"
    namespace = "production"

    annotations = {
      "kubernetes.io/ingress.class"                = "nginx"
      "cert-manager.io/cluster-issuer"             = "letsencrypt-prod"
      "nginx.ingress.kubernetes.io/ssl-redirect"   = "true"
      "nginx.ingress.kubernetes.io/force-ssl-redirect" = "true"
      "nginx.ingress.kubernetes.io/proxy-body-size" = "50m"
    }
  }

  spec {
    rule {
      host = "api.example.com"

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = "api"
              port {
                number = 80
              }
            }
          }
        }
      }
    }

    rule {
      host = "admin.example.com"

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = "admin"
              port {
                number = 80
              }
            }
          }
        }
      }
    }

    tls {
      hosts       = ["api.example.com"]
      secret_name = "api-tls"
    }

    tls {
      hosts       = ["admin.example.com"]
      secret_name = "admin-tls"
    }
  }
}
```

Import command:

```bash
terraform import kubernetes_ingress_v1.app production/app-ingress
```

## Importing Resources with for_each

When importing multiple similar resources, use for_each and import each one:

```hcl
variable "namespaces" {
  type = set(string)
  default = ["dev", "staging", "production"]
}

resource "kubernetes_namespace" "env" {
  for_each = var.namespaces

  metadata {
    name = each.key
    labels = {
      environment = each.key
      managed-by  = "terraform"
    }
  }
}
```

Import each namespace:

```bash
terraform import 'kubernetes_namespace.env["dev"]' dev
terraform import 'kubernetes_namespace.env["staging"]' staging
terraform import 'kubernetes_namespace.env["production"]' production
```

Note the quotes around the resource address when using for_each.

## Handling Computed Fields

Some fields are computed by Kubernetes and can't be set in configuration. Use lifecycle ignore_changes:

```hcl
resource "kubernetes_deployment" "api" {
  metadata {
    name      = "api"
    namespace = "production"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "api"
      }
    }

    template {
      metadata {
        labels = {
          app = "api"
        }
      }

      spec {
        container {
          name  = "api"
          image = "myapp/api:v1.0"
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      metadata[0].annotations,
      metadata[0].generation,
      metadata[0].resource_version,
      metadata[0].uid,
      spec[0].template[0].metadata[0].annotations
    ]
  }
}
```

This prevents Terraform from trying to manage fields that Kubernetes controls.

## Importing RBAC Resources

RBAC resources must be imported in order: ServiceAccount, Role, RoleBinding:

```hcl
resource "kubernetes_service_account" "app" {
  metadata {
    name      = "app-sa"
    namespace = "production"
  }
}

resource "kubernetes_role" "app" {
  metadata {
    name      = "app-role"
    namespace = "production"
  }

  rule {
    api_groups = [""]
    resources  = ["pods", "services"]
    verbs      = ["get", "list", "watch"]
  }

  rule {
    api_groups = ["apps"]
    resources  = ["deployments"]
    verbs      = ["get", "list", "watch", "update", "patch"]
  }
}

resource "kubernetes_role_binding" "app" {
  metadata {
    name      = "app-binding"
    namespace = "production"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.app.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.app.metadata[0].name
    namespace = "production"
  }
}
```

Import commands:

```bash
terraform import kubernetes_service_account.app production/app-sa
terraform import kubernetes_role.app production/app-role
terraform import kubernetes_role_binding.app production/app-binding
```

## Bulk Import Script

For many resources, write a script to automate imports:

```bash
#!/bin/bash

# Import all namespaces
for ns in dev staging production; do
  terraform import "kubernetes_namespace.env[\"$ns\"]" $ns
done

# Import deployments
declare -A deployments=(
  ["api"]="production"
  ["worker"]="production"
  ["frontend"]="production"
)

for name in "${!deployments[@]}"; do
  namespace="${deployments[$name]}"
  terraform import "kubernetes_deployment.$name" "$namespace/$name"
  terraform import "kubernetes_service.$name" "$namespace/$name"
done

# Import config resources
terraform import kubernetes_config_map.app_config production/app-config
terraform import kubernetes_secret.app_secrets production/app-secrets

echo "Import complete. Run 'terraform plan' to verify."
```

Make the script executable and run it:

```bash
chmod +x import.sh
./import.sh
```

## Verifying Imports

After importing, verify everything matches:

```bash
terraform plan
```

If you see changes, investigate each one. Common issues:

1. **Missing fields** - Add them to your configuration
2. **Different values** - Match your configuration to the actual resource
3. **Computed fields** - Use lifecycle ignore_changes
4. **Default values** - Explicitly set values that match Kubernetes defaults

## Handling Import Failures

If import fails, check:

1. **Resource exists** - Verify with kubectl
2. **Correct format** - Use namespace/name for namespaced resources
3. **Provider version** - Ensure compatible provider version
4. **Permissions** - Check kubeconfig has necessary access

## Post-Import Cleanup

After successful import and verification:

1. Remove manual kubectl commands from documentation
2. Update runbooks to use Terraform commands
3. Train team on Terraform workflow
4. Set up state backend for collaboration
5. Implement CI/CD for infrastructure changes

Importing existing Kubernetes resources into Terraform state enables gradual adoption of infrastructure as code without disrupting running applications. The process requires careful attention to detail and thorough testing, but once complete, you gain all the benefits of Terraform's declarative approach to infrastructure management.
