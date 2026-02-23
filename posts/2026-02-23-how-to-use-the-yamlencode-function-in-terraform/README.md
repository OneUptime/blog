# How to Use the yamlencode Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, DevOps, YAML, Configuration, HCL, Infrastructure as Code

Description: Learn how to use Terraform's yamlencode function to convert Terraform data structures into YAML-formatted strings for configuration generation.

---

While `yamldecode` lets you read YAML into Terraform, `yamlencode` does the opposite - it takes Terraform data structures and converts them into YAML-formatted strings. This is incredibly useful when you need to generate YAML configuration files for Kubernetes, Docker Compose, CI/CD pipelines, or any system that consumes YAML.

## What Does yamlencode Do?

The `yamlencode` function takes a Terraform value (map, list, string, number, bool) and returns a string containing the YAML representation of that value.

```hcl
output "yaml_output" {
  value = yamlencode({
    name    = "myapp"
    version = "1.0"
    ports   = [80, 443]
  })
}

# Output:
# "name": "myapp"
# "ports":
# - 80
# - 443
# "version": "1.0"
```

## Syntax

```hcl
yamlencode(value)
```

Takes any Terraform value, returns a YAML-formatted string.

## Important: yamlencode Output Style

Terraform's `yamlencode` produces YAML in a specific style:

- Map keys are always quoted
- Keys are sorted alphabetically
- The output does not include the YAML document start marker (`---`)
- The output uses block style (not flow/inline style)

```hcl
output "example" {
  value = yamlencode({
    database = {
      host = "localhost"
      port = 5432
    }
    features = ["auth", "logging"]
  })
}

# Output:
# "database":
#   "host": "localhost"
#   "port": 5432
# "features":
# - "auth"
# - "logging"
```

## Practical Examples

### Generating Kubernetes ConfigMaps

Create Kubernetes ConfigMap manifests from Terraform data:

```hcl
variable "app_config" {
  type = map(string)
  default = {
    DATABASE_URL = "postgres://db:5432/myapp"
    REDIS_URL    = "redis://cache:6379"
    LOG_LEVEL    = "info"
  }
}

resource "local_file" "configmap" {
  filename = "${path.module}/generated/configmap.yaml"
  content = yamlencode({
    apiVersion = "v1"
    kind       = "ConfigMap"
    metadata = {
      name      = "app-config"
      namespace = "default"
    }
    data = var.app_config
  })
}
```

### Generating Docker Compose Files

Build Docker Compose configurations dynamically:

```hcl
variable "services" {
  type = map(object({
    image = string
    ports = list(string)
    environment = map(string)
  }))
  default = {
    web = {
      image = "nginx:latest"
      ports = ["80:80", "443:443"]
      environment = {
        NGINX_HOST = "example.com"
      }
    }
    api = {
      image = "myapp:latest"
      ports = ["8080:8080"]
      environment = {
        DB_HOST   = "db"
        LOG_LEVEL = "info"
      }
    }
  }
}

resource "local_file" "docker_compose" {
  filename = "${path.module}/generated/docker-compose.yaml"
  content = yamlencode({
    version  = "3.8"
    services = var.services
  })
}
```

### Writing Helm Values Files

Generate Helm values files from Terraform variables:

```hcl
variable "helm_values" {
  description = "Values to pass to the Helm chart"
  type        = any
  default = {
    replicaCount = 3
    image = {
      repository = "myapp"
      tag        = "v1.2.3"
      pullPolicy = "IfNotPresent"
    }
    service = {
      type = "ClusterIP"
      port = 80
    }
    ingress = {
      enabled = true
      hosts = [{
        host = "myapp.example.com"
        paths = [{
          path     = "/"
          pathType = "Prefix"
        }]
      }]
    }
    resources = {
      limits = {
        cpu    = "500m"
        memory = "512Mi"
      }
      requests = {
        cpu    = "250m"
        memory = "256Mi"
      }
    }
  }
}

resource "local_file" "helm_values" {
  filename = "${path.module}/generated/values.yaml"
  content  = yamlencode(var.helm_values)
}
```

### Ansible Inventory Generation

Create Ansible inventory files from Terraform-managed infrastructure:

```hcl
resource "aws_instance" "web" {
  count         = 3
  ami           = var.ami_id
  instance_type = "t3.micro"
}

resource "aws_instance" "db" {
  count         = 2
  ami           = var.ami_id
  instance_type = "t3.medium"
}

resource "local_file" "ansible_inventory" {
  filename = "${path.module}/generated/inventory.yaml"
  content = yamlencode({
    all = {
      children = {
        webservers = {
          hosts = {
            for idx, instance in aws_instance.web :
            "web-${idx}" => {
              ansible_host = instance.private_ip
              ansible_user = "ubuntu"
            }
          }
        }
        databases = {
          hosts = {
            for idx, instance in aws_instance.db :
            "db-${idx}" => {
              ansible_host = instance.private_ip
              ansible_user = "ubuntu"
            }
          }
        }
      }
    }
  })
}
```

### CI/CD Pipeline Generation

Generate CI/CD pipeline configurations:

```hcl
locals {
  # Define pipeline stages
  pipeline = {
    stages = ["build", "test", "deploy"]

    build = {
      stage  = "build"
      script = [
        "docker build -t myapp:$CI_COMMIT_SHA .",
        "docker push myapp:$CI_COMMIT_SHA",
      ]
    }

    test = {
      stage  = "test"
      script = [
        "docker run myapp:$CI_COMMIT_SHA npm test",
      ]
    }

    deploy = {
      stage       = "deploy"
      script      = ["./deploy.sh"]
      environment = var.environment
      only        = ["main"]
    }
  }
}

resource "local_file" "pipeline" {
  filename = "${path.module}/generated/.gitlab-ci.yml"
  content  = yamlencode(local.pipeline)
}
```

### Using with Kubernetes Provider

Pass YAML to the Kubernetes provider's manifest resource:

```hcl
locals {
  namespace_manifest = {
    apiVersion = "v1"
    kind       = "Namespace"
    metadata = {
      name = var.namespace
      labels = {
        environment = var.environment
        managed_by  = "terraform"
      }
    }
  }
}

resource "kubernetes_manifest" "namespace" {
  manifest = local.namespace_manifest
}

# Also write it to a file for reference
resource "local_file" "namespace_yaml" {
  filename = "${path.module}/generated/namespace.yaml"
  content  = yamlencode(local.namespace_manifest)
}
```

## Controlling the Output Format

Since `yamlencode` always quotes map keys and sorts them alphabetically, you might want to post-process the output for certain use cases:

```hcl
locals {
  # yamlencode produces quoted keys by default
  raw_yaml = yamlencode({
    apiVersion = "v1"
    kind       = "Service"
  })

  # If you need a document start marker, add it manually
  yaml_with_header = "---\n${local.raw_yaml}"
}
```

## Combining yamlencode with templatefile

For complex YAML documents where you need more control over formatting, consider using `templatefile` instead:

```hcl
# When yamlencode's output format is not exactly what you need,
# use a template for the main structure and yamlencode for nested parts

resource "local_file" "complex_config" {
  filename = "${path.module}/generated/config.yaml"
  content = templatefile("${path.module}/templates/config.yaml.tpl", {
    app_name    = var.app_name
    environment = var.environment
    # Use yamlencode for the dynamic nested section
    features    = indent(4, yamlencode(var.feature_flags))
  })
}
```

## Summary

The `yamlencode` function is your tool for generating YAML output from Terraform data structures. It is essential for producing Kubernetes manifests, Helm values, Docker Compose files, Ansible inventories, and CI/CD configurations dynamically. Remember that it always quotes keys, sorts them alphabetically, and does not include the `---` document separator. For reading YAML back into Terraform, see [yamldecode](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-yamldecode-function-in-terraform/view), and for a practical guide on generating YAML output, check out [generating YAML output with yamlencode](https://oneuptime.com/blog/post/2026-02-23-how-to-generate-yaml-output-with-yamlencode-in-terraform/view).
