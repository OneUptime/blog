# How to Handle Kubernetes Init Containers in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Init Containers, Pods, Infrastructure as Code, DevOps

Description: Learn how to configure Kubernetes init containers in Terraform for database migrations, dependency checks, configuration setup, and other pre-start tasks in your deployments.

---

Init containers run before the main application containers start. They are perfect for tasks that need to complete before your application can function - running database migrations, waiting for dependent services, downloading configuration files, or setting up file permissions. In Terraform's Kubernetes provider, init containers are defined within the pod template spec just like regular containers, but they run sequentially and must complete successfully before the main containers start.

This guide covers practical init container patterns you can implement with Terraform.

## Basic Init Container

The simplest init container waits for a dependency to become available.

```hcl
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "my-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "my-app"
        }
      }

      spec {
        # Init containers run before main containers
        init_container {
          name  = "wait-for-db"
          image = "busybox:1.36"

          # Wait until PostgreSQL is accepting connections
          command = [
            "sh", "-c",
            "until nc -z postgres.database.svc.cluster.local 5432; do echo 'Waiting for database...'; sleep 2; done; echo 'Database is ready'"
          ]
        }

        # Main application container
        container {
          name  = "app"
          image = "my-app:1.0.0"

          port {
            container_port = 8080
          }

          env {
            name  = "DATABASE_HOST"
            value = "postgres.database.svc.cluster.local"
          }
        }
      }
    }
  }
}
```

## Database Migration Init Container

Running migrations before the app starts ensures the database schema is up to date.

```hcl
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "my-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "my-app"
        }
      }

      spec {
        # Init container 1: Wait for the database
        init_container {
          name  = "wait-for-db"
          image = "busybox:1.36"

          command = [
            "sh", "-c",
            "until nc -z ${var.db_host} 5432; do echo 'Waiting for database...'; sleep 2; done"
          ]
        }

        # Init container 2: Run migrations
        init_container {
          name  = "run-migrations"
          image = "my-app:${var.app_version}"

          # Run the migration command from the same app image
          command = ["./migrate", "up"]

          env {
            name  = "DATABASE_URL"
            value = "postgresql://${var.db_user}:${var.db_password}@${var.db_host}:5432/${var.db_name}?sslmode=require"
          }

          # Resource limits for migration
          resources {
            requests = {
              cpu    = "100m"
              memory = "256Mi"
            }
            limits = {
              memory = "512Mi"
            }
          }
        }

        # Main container starts after migrations complete
        container {
          name  = "app"
          image = "my-app:${var.app_version}"

          port {
            container_port = 8080
          }

          env {
            name  = "DATABASE_URL"
            value = "postgresql://${var.db_user}:${var.db_password}@${var.db_host}:5432/${var.db_name}?sslmode=require"
          }
        }
      }
    }
  }
}
```

## Configuration Download Init Container

Download configuration from an external source before the app starts.

```hcl
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "my-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "my-app"
        }
      }

      spec {
        # Init container downloads config from S3
        init_container {
          name  = "download-config"
          image = "amazon/aws-cli:2.15.0"

          # Download configuration files from S3
          command = [
            "sh", "-c",
            "aws s3 cp s3://${var.config_bucket}/config.yaml /config/config.yaml && echo 'Config downloaded'"
          ]

          # Shared volume with the main container
          volume_mount {
            name       = "config"
            mount_path = "/config"
          }
        }

        # Init container to set file permissions
        init_container {
          name  = "fix-permissions"
          image = "busybox:1.36"

          command = ["sh", "-c", "chmod 644 /config/config.yaml && chown 1000:1000 /config/config.yaml"]

          volume_mount {
            name       = "config"
            mount_path = "/config"
          }
        }

        container {
          name  = "app"
          image = "my-app:1.0.0"

          # Mount the same volume to read the config
          volume_mount {
            name       = "config"
            mount_path = "/app/config"
          }
        }

        # Shared volume between init and main containers
        volume {
          name = "config"

          empty_dir {}
        }
      }
    }
  }
}
```

## Git Clone Init Container

Clone a repository before the application starts, useful for configuration or template loading.

```hcl
resource "kubernetes_deployment" "nginx" {
  metadata {
    name      = "nginx"
    namespace = "web"
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "nginx"
      }
    }

    template {
      metadata {
        labels = {
          app = "nginx"
        }
      }

      spec {
        # Clone the website content from Git
        init_container {
          name  = "git-clone"
          image = "alpine/git:2.43.0"

          command = [
            "git", "clone",
            "--depth", "1",
            "--branch", var.content_branch,
            var.content_repo,
            "/content"
          ]

          volume_mount {
            name       = "content"
            mount_path = "/content"
          }
        }

        container {
          name  = "nginx"
          image = "nginx:1.25"

          port {
            container_port = 80
          }

          volume_mount {
            name       = "content"
            mount_path = "/usr/share/nginx/html"
          }
        }

        volume {
          name = "content"

          empty_dir {}
        }
      }
    }
  }
}
```

## Multiple Init Containers with Sequential Execution

Init containers execute in order. Each must complete before the next starts.

```hcl
resource "kubernetes_deployment" "complex_app" {
  metadata {
    name      = "complex-app"
    namespace = "production"
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "complex-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "complex-app"
        }
      }

      spec {
        # Step 1: Wait for dependent services
        init_container {
          name  = "wait-for-redis"
          image = "busybox:1.36"

          command = [
            "sh", "-c",
            "until nc -z redis.cache.svc.cluster.local 6379; do echo 'Waiting for Redis...'; sleep 2; done"
          ]
        }

        # Step 2: Wait for message queue
        init_container {
          name  = "wait-for-rabbitmq"
          image = "busybox:1.36"

          command = [
            "sh", "-c",
            "until nc -z rabbitmq.messaging.svc.cluster.local 5672; do echo 'Waiting for RabbitMQ...'; sleep 2; done"
          ]
        }

        # Step 3: Prepare the data directory
        init_container {
          name  = "prepare-data"
          image = "busybox:1.36"

          command = ["sh", "-c", "mkdir -p /data/cache /data/tmp && chmod 777 /data/tmp"]

          volume_mount {
            name       = "data"
            mount_path = "/data"
          }
        }

        # Step 4: Download ML model
        init_container {
          name  = "download-model"
          image = "curlimages/curl:8.5.0"

          command = [
            "sh", "-c",
            "curl -L -o /data/model.bin ${var.model_url} && echo 'Model downloaded'"
          ]

          volume_mount {
            name       = "data"
            mount_path = "/data"
          }

          resources {
            requests = {
              memory = "512Mi"
            }
            limits = {
              memory = "1Gi"
            }
          }
        }

        # Main container runs after all init containers succeed
        container {
          name  = "app"
          image = "complex-app:${var.app_version}"

          port {
            container_port = 8080
          }

          volume_mount {
            name       = "data"
            mount_path = "/app/data"
          }
        }

        volume {
          name = "data"

          empty_dir {
            size_limit = "5Gi"
          }
        }
      }
    }
  }
}
```

## Init Container with Secrets

Init containers can access the same secrets as main containers.

```hcl
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = "production"
  }

  spec {
    selector {
      match_labels = {
        app = "my-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "my-app"
        }
      }

      spec {
        # Init container that uses database credentials
        init_container {
          name  = "setup-db"
          image = "postgres:16"

          command = [
            "sh", "-c",
            "PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c 'CREATE SCHEMA IF NOT EXISTS app;'"
          ]

          # Environment variables from a secret
          env_from {
            secret_ref {
              name = kubernetes_secret.db_credentials.metadata[0].name
            }
          }
        }

        container {
          name  = "app"
          image = "my-app:1.0.0"

          env_from {
            secret_ref {
              name = kubernetes_secret.db_credentials.metadata[0].name
            }
          }
        }
      }
    }
  }
}

resource "kubernetes_secret" "db_credentials" {
  metadata {
    name      = "db-credentials"
    namespace = "production"
  }

  data = {
    DB_HOST     = var.db_host
    DB_USER     = var.db_user
    DB_PASSWORD = var.db_password
    DB_NAME     = var.db_name
  }
}
```

## Init Container Resource Management

Init containers can have different resource requirements than main containers. Kubernetes calculates the effective resource request as the maximum of all init container requests (since they run sequentially) versus the sum of main container requests.

```hcl
spec {
  # This init container needs a lot of memory for migration
  init_container {
    name  = "heavy-migration"
    image = "my-app:1.0.0"

    command = ["./migrate", "up"]

    resources {
      requests = {
        cpu    = "500m"
        memory = "2Gi"  # Needs more memory than the app
      }
      limits = {
        cpu    = "1"
        memory = "4Gi"
      }
    }
  }

  # Main container runs with less memory
  container {
    name  = "app"
    image = "my-app:1.0.0"

    resources {
      requests = {
        cpu    = "200m"
        memory = "512Mi"
      }
      limits = {
        memory = "1Gi"
      }
    }
  }
}
```

## Debugging Init Containers

When init containers fail, the pod stays in `Init:CrashLoopBackOff` state. Check logs:

```bash
# Check which init container failed
kubectl describe pod my-app-xxx -n production

# View init container logs
kubectl logs my-app-xxx -n production -c wait-for-db

# View logs of a previous failed init container
kubectl logs my-app-xxx -n production -c run-migrations --previous
```

## Best Practices

- Keep init containers lightweight - use small images like busybox for simple checks
- Set resource limits on init containers, especially for memory-intensive tasks like migrations
- Use timeouts in wait loops to prevent pods from hanging indefinitely
- Order init containers from fastest to slowest for quicker feedback on failures
- Share data between init and main containers using emptyDir volumes
- Use the same image for migration init containers and the app to ensure version consistency
- Set `restartPolicy` to `Always` (default) so that failed init containers are retried
- Add logging to init container commands so you can debug failures

For more on Kubernetes pod configuration, see our guide on [configuring Kubernetes liveness and readiness probes in Terraform](https://oneuptime.com/blog/post/2026-02-23-kubernetes-liveness-readiness-probes-terraform/view).
