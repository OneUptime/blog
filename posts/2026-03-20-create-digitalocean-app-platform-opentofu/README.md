# How to Create DigitalOcean App Platform Apps with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, DigitalOcean, App Platform, PaaS, Infrastructure as Code

Description: Learn how to deploy applications on DigitalOcean App Platform using OpenTofu to define services, databases, and environment variables as code.

DigitalOcean App Platform is a PaaS offering that deploys apps from Git repositories or container registries. OpenTofu lets you define your entire app spec - services, workers, databases, static sites, and environment variables - as declarative configuration.

## Basic Web Service from a Git Repository

```hcl
resource "digitalocean_app" "web" {
  spec {
    name   = "my-web-app"
    region = "nyc"

    # Deploy a web service from GitHub
    service {
      name               = "api"
      instance_count     = 2
      instance_size_slug = "apps-s-1vcpu-0.5gb"
      http_port          = 8080

      git {
        repo_clone_url = "https://github.com/myorg/myapp.git"
        branch         = "main"
      }

      # Build command (for non-Dockerfile apps)
      build_command = "npm ci && npm run build"
      run_command   = "npm start"

      env {
        key   = "NODE_ENV"
        value = "production"
      }

      health_check {
        http_path             = "/health"
        initial_delay_seconds = 30
        period_seconds        = 10
      }
    }
  }
}
```

## Deploying from a Container Registry

```hcl
resource "digitalocean_app" "container" {
  spec {
    name   = "container-app"
    region = "nyc"

    service {
      name               = "api"
      instance_count     = 1
      instance_size_slug = "apps-s-1vcpu-1gb"
      http_port          = 3000

      image {
        registry_type = "DOCR"  # DigitalOcean Container Registry (registry must be empty for DOCR)
        repository    = "myapp"
        tag           = var.image_tag
      }
    }
  }
}
```

## Adding a Managed Database to the App

```hcl
resource "digitalocean_app" "full_stack" {
  spec {
    name   = "full-stack-app"
    region = "nyc"

    service {
      name               = "api"
      instance_count     = 2
      instance_size_slug = "apps-s-1vcpu-0.5gb"
      http_port          = 8080

      git {
        repo_clone_url = "https://github.com/myorg/api.git"
        branch         = "main"
      }

      # Reference the managed DB component below using App Platform's bindable
      # variable syntax. The `$$` escapes the `$` so Terraform passes the literal
      # `${db.DATABASE_URL}` string through to App Platform, which resolves it
      # at runtime to the database connection URL.
      env {
        key   = "DATABASE_URL"
        value = "$${db.DATABASE_URL}"
        type  = "SECRET"
      }
    }

    # Provision a managed PostgreSQL database as part of the app
    database {
      name         = "db"
      engine       = "PG"
      production   = true
      cluster_name = "production-db"
    }
  }
}
```

## Adding a Background Worker

```hcl
resource "digitalocean_app" "with_worker" {
  spec {
    name   = "app-with-worker"
    region = "nyc"

    service {
      name  = "api"
      # ... web service config
    }

    worker {
      name               = "queue-worker"
      instance_count     = 1
      instance_size_slug = "apps-s-1vcpu-0.5gb"

      git {
        repo_clone_url = "https://github.com/myorg/app.git"
        branch         = "main"
      }

      run_command = "node worker.js"
    }
  }
}
```

## Retrieving the Live URL

```hcl
output "app_live_url" {
  value = digitalocean_app.web.live_url
}
```

## Conclusion

DigitalOcean App Platform in OpenTofu is configured through an app `spec` that declaratively defines all components: web services, workers, static sites, jobs, and databases. Use Git-based deployments for standard workflows or container image deployments for custom environments, and let App Platform handle infrastructure provisioning, scaling, and TLS automatically.
