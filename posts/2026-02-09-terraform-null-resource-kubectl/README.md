# How to Build Terraform Null Resource with Local-Exec for kubectl Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Automation

Description: Learn how to use Terraform null resources with local-exec provisioners to execute kubectl commands for Kubernetes operations that lack native Terraform resource support.

---

While Terraform provides excellent support for standard Kubernetes resources, some operations require direct kubectl commands. The null_resource with local-exec provisioner bridges this gap, allowing you to execute arbitrary kubectl commands as part of your Terraform workflow. This technique is particularly useful for applying raw manifests, executing administrative commands, or working with custom resources that don't have Terraform providers.

## Understanding Null Resources

The null_resource doesn't create any actual infrastructure. Instead, it acts as a container for provisioners that execute commands or scripts. You can trigger null resource recreation using triggers, which force provisioners to run again when specified values change.

## Basic kubectl Command Execution

Start with a simple example that labels a namespace:

```hcl
resource "kubernetes_namespace" "app" {
  metadata {
    name = "application"
  }
}

resource "null_resource" "label_namespace" {
  provisioner "local-exec" {
    command = "kubectl label namespace ${kubernetes_namespace.app.metadata[0].name} environment=production --overwrite"
  }

  triggers = {
    namespace_id = kubernetes_namespace.app.metadata[0].uid
  }
}
```

The local-exec provisioner runs on the machine executing Terraform, not in the cluster. The triggers block ensures the command runs again if the namespace is recreated.

## Applying Raw Kubernetes Manifests

Sometimes you have existing YAML manifests that are easier to apply directly than convert to Terraform:

```hcl
resource "null_resource" "apply_manifests" {
  provisioner "local-exec" {
    command = <<-EOT
      kubectl apply -f ${path.module}/manifests/monitoring/prometheus.yaml
      kubectl apply -f ${path.module}/manifests/monitoring/grafana.yaml
      kubectl apply -f ${path.module}/manifests/monitoring/alertmanager.yaml
    EOT
  }

  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      kubectl delete -f ${path.module}/manifests/monitoring/alertmanager.yaml --ignore-not-found=true
      kubectl delete -f ${path.module}/manifests/monitoring/grafana.yaml --ignore-not-found=true
      kubectl delete -f ${path.module}/manifests/monitoring/prometheus.yaml --ignore-not-found=true
    EOT
  }

  triggers = {
    manifest_hash = sha256(join("", [
      filesha256("${path.module}/manifests/monitoring/prometheus.yaml"),
      filesha256("${path.module}/manifests/monitoring/grafana.yaml"),
      filesha256("${path.module}/manifests/monitoring/alertmanager.yaml")
    ]))
  }
}
```

This resource applies manifests when created or when file contents change. The destroy provisioner cleans up resources when the null_resource is destroyed.

## Waiting for Resource Readiness

Use kubectl wait commands to ensure resources are ready before proceeding:

```hcl
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

          port {
            container_port = 8080
          }

          readiness_probe {
            http_get {
              path = "/ready"
              port = 8080
            }
          }
        }
      }
    }
  }
}

resource "null_resource" "wait_for_app" {
  provisioner "local-exec" {
    command = "kubectl wait --for=condition=Available --timeout=300s deployment/${kubernetes_deployment.app.metadata[0].name} -n ${kubernetes_deployment.app.metadata[0].namespace}"
  }

  triggers = {
    deployment_id = kubernetes_deployment.app.metadata[0].uid
  }

  depends_on = [
    kubernetes_deployment.app
  ]
}

resource "kubernetes_service" "external_service" {
  metadata {
    name      = "external-api"
    namespace = "production"
  }

  spec {
    type = "ExternalName"
    external_name = "api.partner.com"
  }

  depends_on = [
    null_resource.wait_for_app
  ]
}
```

The external service creation waits until the application deployment is fully ready.

## Executing kubectl patch Commands

Patch commands modify existing resources without replacing them:

```hcl
variable "enable_horizontal_scaling" {
  description = "Enable horizontal pod autoscaling"
  type        = bool
  default     = false
}

resource "kubernetes_deployment" "web" {
  metadata {
    name      = "web"
    namespace = "production"
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "web"
      }
    }

    template {
      metadata {
        labels = {
          app = "web"
        }
      }

      spec {
        container {
          name  = "nginx"
          image = "nginx:1.21"
        }
      }
    }
  }
}

resource "null_resource" "patch_deployment_annotations" {
  count = var.enable_horizontal_scaling ? 1 : 0

  provisioner "local-exec" {
    command = <<-EOT
      kubectl patch deployment ${kubernetes_deployment.web.metadata[0].name} \
        -n ${kubernetes_deployment.web.metadata[0].namespace} \
        --type merge \
        -p '{"metadata":{"annotations":{"autoscaling.enabled":"true"}}}'
    EOT
  }

  triggers = {
    deployment_id    = kubernetes_deployment.web.metadata[0].uid
    scaling_enabled  = var.enable_horizontal_scaling
  }

  depends_on = [
    kubernetes_deployment.web
  ]
}
```

This conditionally patches the deployment based on a variable, adding annotations that other controllers might use.

## Creating Custom Resources

When working with CRDs that lack Terraform provider support, use kubectl to create custom resources:

```hcl
variable "istio_gateway_config" {
  description = "Istio Gateway configuration"
  type = object({
    name      = string
    namespace = string
    hosts     = list(string)
  })
  default = {
    name      = "default-gateway"
    namespace = "istio-system"
    hosts     = ["*.example.com"]
  }
}

resource "null_resource" "create_istio_gateway" {
  provisioner "local-exec" {
    command = <<-EOT
      cat <<EOF | kubectl apply -f -
      apiVersion: networking.istio.io/v1beta1
      kind: Gateway
      metadata:
        name: ${var.istio_gateway_config.name}
        namespace: ${var.istio_gateway_config.namespace}
      spec:
        selector:
          istio: ingressgateway
        servers:
        - port:
            number: 80
            name: http
            protocol: HTTP
          hosts:
          ${join("\n          ", [for host in var.istio_gateway_config.hosts : "- ${host}"])}
        - port:
            number: 443
            name: https
            protocol: HTTPS
          tls:
            mode: SIMPLE
            credentialName: gateway-cert
          hosts:
          ${join("\n          ", [for host in var.istio_gateway_config.hosts : "- ${host}"])}
      EOF
    EOT
  }

  provisioner "local-exec" {
    when    = destroy
    command = "kubectl delete gateway ${var.istio_gateway_config.name} -n ${var.istio_gateway_config.namespace} --ignore-not-found=true"
  }

  triggers = {
    config_hash = sha256(jsonencode(var.istio_gateway_config))
  }
}
```

This creates an Istio Gateway resource by piping YAML to kubectl apply.

## Running Database Migrations

Execute database migrations as part of infrastructure deployment:

```hcl
resource "kubernetes_job" "db_migration" {
  metadata {
    name      = "db-migration-${formatdate("YYYYMMDDhhmmss", timestamp())}"
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
            value = var.database_url
          }
        }

        restart_policy = "Never"
      }
    }

    backoff_limit = 4
  }

  lifecycle {
    ignore_changes = [metadata[0].name]
  }
}

resource "null_resource" "wait_for_migration" {
  provisioner "local-exec" {
    command = "kubectl wait --for=condition=Complete --timeout=600s job/${kubernetes_job.db_migration.metadata[0].name} -n ${kubernetes_job.db_migration.metadata[0].namespace}"
  }

  triggers = {
    job_id = kubernetes_job.db_migration.metadata[0].uid
  }

  depends_on = [
    kubernetes_job.db_migration
  ]
}

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
        }
      }
    }
  }

  depends_on = [
    null_resource.wait_for_migration
  ]
}
```

The application deployment waits for the migration job to complete successfully.

## Executing Rollout Commands

Manage deployment rollouts explicitly:

```hcl
resource "kubernetes_deployment" "api" {
  metadata {
    name      = "api"
    namespace = "production"
  }

  spec {
    replicas = 5

    strategy {
      type = "RollingUpdate"
      rolling_update {
        max_surge       = "25%"
        max_unavailable = "25%"
      }
    }

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
          image = var.api_image

          port {
            container_port = 8080
          }
        }
      }
    }
  }
}

resource "null_resource" "watch_rollout" {
  provisioner "local-exec" {
    command = "kubectl rollout status deployment/${kubernetes_deployment.api.metadata[0].name} -n ${kubernetes_deployment.api.metadata[0].namespace} --timeout=5m"
  }

  triggers = {
    image_version = var.api_image
  }

  depends_on = [
    kubernetes_deployment.api
  ]
}

resource "null_resource" "rollout_undo" {
  count = var.rollback_enabled ? 1 : 0

  provisioner "local-exec" {
    command = "kubectl rollout undo deployment/${kubernetes_deployment.api.metadata[0].name} -n ${kubernetes_deployment.api.metadata[0].namespace}"
  }

  triggers = {
    rollback_timestamp = timestamp()
  }

  depends_on = [
    kubernetes_deployment.api
  ]
}
```

This monitors rollout status and optionally triggers rollback.

## Configuring kubeconfig Context

Ensure kubectl uses the correct cluster context:

```hcl
variable "kubeconfig_path" {
  description = "Path to kubeconfig file"
  type        = string
  default     = "~/.kube/config"
}

variable "kubernetes_context" {
  description = "Kubernetes context to use"
  type        = string
  default     = "production-cluster"
}

resource "null_resource" "kubectl_command" {
  provisioner "local-exec" {
    command = "kubectl --kubeconfig=${var.kubeconfig_path} --context=${var.kubernetes_context} get nodes"

    environment = {
      KUBECONFIG = var.kubeconfig_path
    }
  }

  triggers = {
    always_run = timestamp()
  }
}
```

You can set the kubeconfig path and context for all kubectl commands.

## Error Handling and Retries

Add error handling and retry logic:

```hcl
resource "null_resource" "apply_with_retry" {
  provisioner "local-exec" {
    command = <<-EOT
      set -e

      MAX_RETRIES=3
      RETRY_COUNT=0

      while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if kubectl apply -f ${path.module}/manifests/app.yaml; then
          echo "Successfully applied manifest"
          exit 0
        else
          RETRY_COUNT=$((RETRY_COUNT + 1))
          echo "Attempt $RETRY_COUNT failed, retrying..."
          sleep 5
        fi
      done

      echo "Failed after $MAX_RETRIES attempts"
      exit 1
    EOT

    interpreter = ["/bin/bash", "-c"]
  }

  triggers = {
    manifest_hash = filesha256("${path.module}/manifests/app.yaml")
  }
}
```

This retries the kubectl command up to three times before failing.

## Combining with Data Sources

Use null resources to populate data sources with kubectl output:

```hcl
resource "null_resource" "get_cluster_info" {
  provisioner "local-exec" {
    command = "kubectl cluster-info > ${path.module}/cluster-info.txt"
  }

  triggers = {
    always_run = timestamp()
  }
}

data "local_file" "cluster_info" {
  filename = "${path.module}/cluster-info.txt"

  depends_on = [
    null_resource.get_cluster_info
  ]
}

output "cluster_info" {
  value = data.local_file.cluster_info.content
}
```

This captures cluster information and makes it available as a Terraform output.

## Best Practices

Follow these guidelines when using null resources with kubectl:

1. **Use triggers wisely** - Define triggers that accurately represent when commands should re-run.

2. **Handle destroy phase** - Add destroy provisioners to clean up resources properly.

3. **Check exit codes** - Ensure commands fail appropriately so Terraform detects errors.

4. **Use heredocs for complex commands** - Multi-line commands are easier to read with heredocs.

5. **Avoid sensitive data in commands** - Don't pass secrets directly in command strings.

6. **Prefer native resources** - Only use null resources when no native Terraform resource exists.

7. **Add timeouts** - Use kubectl wait with timeouts to prevent indefinite hangs.

Null resources with local-exec provisioners provide flexibility for Kubernetes operations that lack native Terraform support. While you should prefer native Terraform resources when available, null resources bridge the gap for custom resources, raw manifests, and administrative commands that require direct kubectl access.
