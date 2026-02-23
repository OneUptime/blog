# How to Create Kubernetes ConfigMaps with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, ConfigMaps, Configuration Management, Infrastructure as Code

Description: Learn how to create and manage Kubernetes ConfigMaps with Terraform for externalizing application configuration from container images.

---

ConfigMaps are Kubernetes' answer to the question "where do I put my application configuration?" They let you decouple configuration data from your container images, so you can change settings without rebuilding and redeploying your application. When you manage ConfigMaps with Terraform, your configuration becomes part of your infrastructure code, versioned in Git and applied through your standard deployment pipeline.

This guide covers creating ConfigMaps with Terraform, including key-value data, file-based configuration, and different ways to consume them in pods.

## Provider Configuration

```hcl
# providers.tf
terraform {
  required_version = ">= 1.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}
```

## Basic ConfigMap with Key-Value Pairs

The simplest ConfigMap stores string key-value pairs.

```hcl
# configmap.tf - Simple key-value configuration
resource "kubernetes_config_map" "app_settings" {
  metadata {
    name      = "app-settings"
    namespace = "default"

    labels = {
      app        = "my-app"
      managed-by = "terraform"
    }
  }

  data = {
    # Database connection settings
    DATABASE_HOST     = "postgres.database.svc.cluster.local"
    DATABASE_PORT     = "5432"
    DATABASE_NAME     = "myapp"

    # Application settings
    LOG_LEVEL         = "info"
    CACHE_TTL_SECONDS = "300"
    MAX_CONNECTIONS   = "100"

    # Feature flags
    ENABLE_FEATURE_X  = "true"
    ENABLE_BETA_UI    = "false"
  }
}
```

## ConfigMap with File Content

You can store entire configuration files in a ConfigMap. This is useful for things like nginx.conf, application.yaml, or any other config file your application reads from disk.

```hcl
# configmap_files.tf - ConfigMap containing configuration files
resource "kubernetes_config_map" "nginx_config" {
  metadata {
    name      = "nginx-config"
    namespace = "frontend"
  }

  data = {
    # Store an nginx configuration file
    "nginx.conf" = <<-EOT
      worker_processes auto;
      error_log /var/log/nginx/error.log warn;

      events {
          worker_connections 1024;
      }

      http {
          include       /etc/nginx/mime.types;
          default_type  application/octet-stream;

          # Logging format
          log_format main '$remote_addr - $remote_user [$time_local] '
                          '"$request" $status $body_bytes_sent '
                          '"$http_referer" "$http_user_agent"';

          access_log /var/log/nginx/access.log main;

          sendfile on;
          keepalive_timeout 65;

          # Gzip compression
          gzip on;
          gzip_types text/plain text/css application/json application/javascript;

          server {
              listen 80;
              server_name _;

              location / {
                  root   /usr/share/nginx/html;
                  index  index.html;
                  try_files $uri $uri/ /index.html;
              }

              location /health {
                  return 200 'healthy';
                  add_header Content-Type text/plain;
              }
          }
      }
    EOT

    # You can include multiple files
    "mime.types" = <<-EOT
      types {
          text/html                             html htm;
          text/css                              css;
          application/javascript                js;
          application/json                      json;
          image/png                             png;
          image/jpeg                            jpg jpeg;
          image/svg+xml                         svg;
      }
    EOT
  }
}
```

## Loading ConfigMap Data from External Files

Instead of inlining file content, you can read it from files on disk.

```hcl
# configmap_from_files.tf - Load config from local files
resource "kubernetes_config_map" "app_config_files" {
  metadata {
    name      = "app-config-files"
    namespace = "default"
  }

  data = {
    # Read the file content at plan time
    "application.yaml" = file("${path.module}/config/application.yaml")
    "logging.xml"      = file("${path.module}/config/logging.xml")
  }
}
```

## ConfigMap with Binary Data

For binary content like certificates, compressed files, or other non-text data, use the `binary_data` field.

```hcl
# configmap_binary.tf - ConfigMap with binary data
resource "kubernetes_config_map" "binary_config" {
  metadata {
    name      = "binary-config"
    namespace = "default"
  }

  # Regular text data
  data = {
    "config.yaml" = "key: value"
  }

  # Binary data (must be base64 encoded)
  binary_data = {
    "truststore.jks" = filebase64("${path.module}/certs/truststore.jks")
  }
}
```

## Using ConfigMaps in Deployments

There are several ways to consume ConfigMaps in your pods.

### As Environment Variables

```hcl
# deployment_env.tf - Inject ConfigMap as environment variables
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "app-with-config"
    namespace = "default"
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "app-with-config"
      }
    }

    template {
      metadata {
        labels = {
          app = "app-with-config"
        }
      }

      spec {
        container {
          name  = "app"
          image = "myregistry.io/app:latest"

          # Load all keys from ConfigMap as environment variables
          env_from {
            config_map_ref {
              name = kubernetes_config_map.app_settings.metadata[0].name
            }
          }

          # Or select specific keys
          env {
            name = "DB_HOST"
            value_from {
              config_map_key_ref {
                name = kubernetes_config_map.app_settings.metadata[0].name
                key  = "DATABASE_HOST"
              }
            }
          }

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
          }
        }
      }
    }
  }
}
```

### As Volume Mounts

```hcl
# deployment_volume.tf - Mount ConfigMap as files
resource "kubernetes_deployment" "nginx" {
  metadata {
    name      = "nginx-custom"
    namespace = "frontend"
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "nginx-custom"
      }
    }

    template {
      metadata {
        labels = {
          app = "nginx-custom"
        }
      }

      spec {
        container {
          name  = "nginx"
          image = "nginx:1.25-alpine"

          # Mount the ConfigMap at /etc/nginx
          volume_mount {
            name       = "nginx-config"
            mount_path = "/etc/nginx/nginx.conf"
            sub_path   = "nginx.conf"  # Mount a single file, not the whole dir
            read_only  = true
          }

          resources {
            requests = {
              cpu    = "50m"
              memory = "64Mi"
            }
          }
        }

        # Define the volume from the ConfigMap
        volume {
          name = "nginx-config"
          config_map {
            name = kubernetes_config_map.nginx_config.metadata[0].name

            # Optional: set file permissions
            default_mode = "0644"
          }
        }
      }
    }
  }
}
```

## Dynamic ConfigMaps with Terraform Variables

Build ConfigMaps that change based on your Terraform variables and environment.

```hcl
# dynamic_configmap.tf - Environment-aware configuration
variable "environment" {
  type    = string
  default = "production"
}

variable "app_config" {
  type = map(string)
  default = {}
}

locals {
  # Base configuration that applies everywhere
  base_config = {
    APP_NAME    = "my-application"
    APP_VERSION = "3.0.0"
  }

  # Environment-specific configuration
  env_config = {
    production = {
      LOG_LEVEL        = "warn"
      DEBUG_MODE       = "false"
      CACHE_ENABLED    = "true"
      MAX_CONNECTIONS  = "500"
    }
    staging = {
      LOG_LEVEL        = "info"
      DEBUG_MODE       = "false"
      CACHE_ENABLED    = "true"
      MAX_CONNECTIONS  = "100"
    }
    development = {
      LOG_LEVEL        = "debug"
      DEBUG_MODE       = "true"
      CACHE_ENABLED    = "false"
      MAX_CONNECTIONS  = "20"
    }
  }
}

resource "kubernetes_config_map" "dynamic_config" {
  metadata {
    name      = "app-config-${var.environment}"
    namespace = var.environment
  }

  # Merge base config with environment-specific values and any overrides
  data = merge(
    local.base_config,
    local.env_config[var.environment],
    var.app_config
  )
}
```

## ConfigMap with Immutable Flag

For ConfigMaps that should never change after creation (like versioned application configs), use the immutable flag. This also improves cluster performance since the API server does not need to watch for changes.

```hcl
# immutable_configmap.tf - Configuration that cannot be changed
resource "kubernetes_config_map" "versioned_config" {
  metadata {
    name      = "app-config-v3"
    namespace = "default"

    labels = {
      app     = "my-app"
      version = "v3"
    }
  }

  data = {
    "config.json" = jsonencode({
      version  = "3.0.0"
      features = ["auth", "caching", "metrics"]
      timeout  = 30
    })
  }

  # Once created, this ConfigMap cannot be modified
  immutable = true
}
```

## Monitoring Configuration Changes

Configuration drift can cause hard-to-debug issues. When a ConfigMap changes, pods using it might not pick up the changes automatically (environment variables are set at pod creation time, and volume mounts may take up to a minute to update). Monitor your applications after configuration changes to ensure they behave as expected. [OneUptime](https://oneuptime.com) helps you track application behavior and catch issues quickly when configuration updates cause unexpected side effects.

## Summary

ConfigMaps are essential for managing application configuration in Kubernetes. With Terraform, you can create them from inline data, external files, or dynamically from variables. The key patterns include using `env_from` to inject all keys as environment variables, volume mounts for configuration files, and Terraform's `merge` function for environment-specific overrides. Remember that pods need to be restarted to pick up ConfigMap changes when using environment variables, while volume-mounted ConfigMaps update automatically (with some delay).

For managing sensitive configuration data, see our guide on [Kubernetes Secrets with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-kubernetes-secrets-with-terraform/view).
