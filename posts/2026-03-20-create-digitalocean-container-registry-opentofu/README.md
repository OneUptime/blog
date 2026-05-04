# How to Create DigitalOcean Container Registry with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, DigitalOcean, Container Registry, Docker, Infrastructure as Code

Description: Learn how to create and configure a DigitalOcean Container Registry with OpenTofu to store and manage Docker container images.

DigitalOcean Container Registry (DOCR) provides a private Docker registry tightly integrated with DigitalOcean Kubernetes and App Platform. OpenTofu lets you create the registry and manage garbage collection policies as code.

## Creating a Container Registry

```hcl
resource "digitalocean_container_registry" "main" {
  name                   = "myorg"           # Registry name (globally unique)
  subscription_tier_slug = "starter"         # starter, basic, or professional
  region                 = "nyc3"
}

output "registry_endpoint" {
  value = digitalocean_container_registry.main.endpoint
  # Example: registry.digitalocean.com/myorg
}

output "server_url" {
  value = digitalocean_container_registry.main.server_url
  # Example: registry.digitalocean.com
}
```

## Subscription Tiers

| Tier | Storage | Price |
|---|---|---|
| Starter | 500 MiB | Free |
| Basic | 5 GiB | $5/month |
| Professional | 100 GiB | $20/month |

## Generating Docker Credentials

```hcl
resource "digitalocean_container_registry_docker_credentials" "main" {
  registry_name = digitalocean_container_registry.main.name
  write         = true  # Read/write credentials; false for read-only
}

output "docker_credentials" {
  value     = digitalocean_container_registry_docker_credentials.main.docker_credentials
  sensitive = true
}
```

## Using the Registry with Kubernetes

Grant your DOKS cluster access to pull images from the registry:

```hcl
resource "digitalocean_kubernetes_cluster" "main" {
  name    = "production"
  region  = "nyc3"
  version = "1.32.2-do.0"

  node_pool {
    name       = "workers"
    size       = "s-2vcpu-4gb"
    node_count = 3
  }
}

# Create a Kubernetes pull secret for the registry

resource "digitalocean_container_registry_docker_credentials" "k8s" {
  registry_name = digitalocean_container_registry.main.name
  write         = false  # Read-only for Kubernetes pull
}
```

## Pushing Images via CI/CD

After creating the registry, authenticate and push from a CI pipeline:

```bash
# Authenticate using doctl
doctl registry login

# Tag and push an image
docker tag myapp:latest registry.digitalocean.com/myorg/myapp:latest
docker push registry.digitalocean.com/myorg/myapp:latest

# Or use the OpenTofu output
ENDPOINT=$(tofu output -raw registry_endpoint)
docker tag myapp:latest $ENDPOINT/myapp:latest
docker push $ENDPOINT/myapp:latest
```

## Referencing Registry Images in App Platform

```hcl
resource "digitalocean_app" "api" {
  spec {
    name   = "api"
    region = "nyc"

    service {
      name               = "api"
      instance_size_slug = "apps-s-1vcpu-0.5gb"
      http_port          = 8080

      image {
        # Reference the DOCR registry created above. The `registry` field
        # must be left empty for DOCR; the registry is implied by your account.
        registry_type = "DOCR"
        repository    = "myapp"
        tag           = var.image_tag
      }
    }
  }
}
```

## Conclusion

DigitalOcean Container Registry provides a private, region-specific Docker registry integrated with the rest of DigitalOcean's platform. Create it with OpenTofu using the appropriate subscription tier, generate Docker credentials for CI/CD pipelines, and reference it directly in App Platform and DOKS configurations for seamless image pulling.
