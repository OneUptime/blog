# How to Use Dynamic Blocks for Kubernetes Container Specs in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Kubernetes, Dynamic Blocks, Container, Deployment

Description: Learn how to use dynamic blocks in OpenTofu to generate Kubernetes Deployment container specs including environment variables, volume mounts, and resource limits.

## Introduction

Kubernetes Deployments often include multiple containers with complex specs - environment variables from ConfigMaps and Secrets, volume mounts, resource limits, and liveness probes. Dynamic blocks in the Kubernetes provider let you build these specs from structured variable data.

## Dynamic Container Environment Variables

```hcl
variable "app_env_vars" {
  description = "Plain environment variables for the application"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "secret_env_vars" {
  description = "Environment variables sourced from Kubernetes Secrets"
  type = list(object({
    name        = string
    secret_name = string
    secret_key  = string
  }))
  default = []
}

resource "kubernetes_deployment" "app" {
  metadata {
    name      = var.app_name
    namespace = var.namespace
  }

  spec {
    replicas = var.replicas
    selector {
      match_labels = { app = var.app_name }
    }

    template {
      metadata {
        labels = { app = var.app_name }
      }

      spec {
        container {
          name  = var.app_name
          image = "${var.image}:${var.image_tag}"

          # Generate plain env var blocks
          dynamic "env" {
            for_each = var.app_env_vars
            content {
              name  = env.value.name
              value = env.value.value
            }
          }

          # Generate env vars sourced from secrets
          dynamic "env" {
            for_each = var.secret_env_vars
            content {
              name = env.value.name
              value_from {
                secret_key_ref {
                  name = env.value.secret_name
                  key  = env.value.secret_key
                }
              }
            }
          }

          resources {
            requests = { cpu = var.cpu_request, memory = var.memory_request }
            limits   = { cpu = var.cpu_limit,   memory = var.memory_limit }
          }
        }
      }
    }
  }
}
```

## Dynamic Volume Mounts

```hcl
variable "volume_mounts" {
  type = list(object({
    name       = string
    mount_path = string
    read_only  = bool
    volume_type = string  # "configmap", "secret", or "pvc"
    source_name = string
  }))
  default = []
}

resource "kubernetes_deployment" "app" {
  metadata {
    name      = var.app_name
    namespace = var.namespace
  }

  spec {
    replicas = var.replicas
    selector {
      match_labels = { app = var.app_name }
    }

    template {
      metadata {
        labels = { app = var.app_name }
      }

      spec {
        container {
          name  = var.app_name
          image = var.image

          # Generate volume mount entries for the container
          dynamic "volume_mount" {
            for_each = var.volume_mounts
            content {
              name       = volume_mount.value.name
              mount_path = volume_mount.value.mount_path
              read_only  = volume_mount.value.read_only
            }
          }
        }

        # Generate corresponding volume definitions in the pod spec
        dynamic "volume" {
          for_each = [for v in var.volume_mounts : v if v.volume_type == "configmap"]
          content {
            name = volume.value.name
            config_map {
              name = volume.value.source_name
            }
          }
        }

        dynamic "volume" {
          for_each = [for v in var.volume_mounts : v if v.volume_type == "secret"]
          content {
            name = volume.value.name
            secret {
              secret_name = volume.value.source_name
            }
          }
        }

        dynamic "volume" {
          for_each = [for v in var.volume_mounts : v if v.volume_type == "pvc"]
          content {
            name = volume.value.name
            persistent_volume_claim {
              claim_name = volume.value.source_name
            }
          }
        }
      }
    }
  }
}
```

## Init Containers with Dynamic Blocks

```hcl
variable "init_containers" {
  type = list(object({
    name    = string
    image   = string
    command = list(string)
    env = list(object({
      name  = string
      value = string
    }))
  }))
  default = []
}

resource "kubernetes_deployment" "app" {
  metadata {
    name      = var.app_name
    namespace = var.namespace
  }

  spec {
    replicas = var.replicas
    selector {
      match_labels = { app = var.app_name }
    }

    template {
      metadata {
        labels = { app = var.app_name }
      }

      spec {
        # Generate init container blocks for database migrations, etc.
        dynamic "init_container" {
          for_each = var.init_containers
          content {
            name    = init_container.value.name
            image   = init_container.value.image
            command = init_container.value.command

            dynamic "env" {
              for_each = init_container.value.env
              content {
                name  = env.value.name
                value = env.value.value
              }
            }
          }
        }

        container {
          name  = var.app_name
          image = var.image
        }
      }
    }
  }
}
```

## Conclusion

Dynamic blocks in Kubernetes resources let you build flexible deployment templates. Define the structure once and let teams provide their specific environment variables, volume mounts, and init containers through variables. This is especially useful for platform engineering teams building reusable deployment modules that different application teams can consume.
