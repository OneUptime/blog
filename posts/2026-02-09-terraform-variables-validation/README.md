# How to Configure Terraform Variables and Validation for Kubernetes Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Validation

Description: Implement robust Terraform variable validation to catch configuration errors early in Kubernetes deployments, ensuring reliable and error-free infrastructure provisioning.

---

Terraform variables make your configurations reusable and flexible, but without proper validation, invalid inputs can cause deployment failures or create misconfigured resources. Variable validation catches errors before resources are created, saving time and preventing production issues. For Kubernetes configurations, validation becomes critical when managing resource limits, replica counts, image tags, and namespace naming conventions.

## Basic Variable Validation

Add validation rules directly to variable declarations using the validation block:

```hcl
variable "namespace" {
  description = "Kubernetes namespace name"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", var.namespace))
    error_message = "Namespace must consist of lowercase alphanumeric characters or '-', start and end with an alphanumeric character."
  }
}

variable "replica_count" {
  description = "Number of pod replicas"
  type        = number
  default     = 1

  validation {
    condition     = var.replica_count >= 1 && var.replica_count <= 10
    error_message = "Replica count must be between 1 and 10."
  }
}

variable "cpu_request" {
  description = "CPU request for containers"
  type        = string
  default     = "100m"

  validation {
    condition     = can(regex("^[0-9]+(m|\\.[0-9]+)?$", var.cpu_request))
    error_message = "CPU request must be a valid Kubernetes resource quantity (e.g., '100m' or '0.5')."
  }
}
```

These validations run before Terraform creates any resources, catching invalid inputs immediately.

## Validating Image Tags

Container image tags should follow specific patterns to prevent accidentally using latest or incorrect versions:

```hcl
variable "api_image" {
  description = "Container image for API service"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9./-]+:[a-z0-9._-]+$", var.api_image))
    error_message = "Image must include a registry, repository, and explicit tag (format: registry/repo:tag)."
  }

  validation {
    condition     = !can(regex(":latest$", var.api_image))
    error_message = "Using 'latest' tag is not allowed. Specify an explicit version."
  }

  validation {
    condition     = can(regex("^[a-z0-9./-]+:v[0-9]+\\.[0-9]+\\.[0-9]+$", var.api_image)) || can(regex("^[a-z0-9./-]+:[a-z0-9]{7,}$", var.api_image))
    error_message = "Image tag must be semantic version (v1.2.3) or commit hash (at least 7 characters)."
  }
}
```

This ensures teams always use specific, traceable image versions.

## Validating Resource Limits

Resource requests and limits must follow Kubernetes quantity formats:

```hcl
variable "container_resources" {
  description = "Resource requests and limits for containers"
  type = object({
    cpu_request    = string
    memory_request = string
    cpu_limit      = string
    memory_limit   = string
  })

  default = {
    cpu_request    = "100m"
    memory_request = "128Mi"
    cpu_limit      = "500m"
    memory_limit   = "512Mi"
  }

  validation {
    condition = (
      can(regex("^[0-9]+(m|\\.[0-9]+)?$", var.container_resources.cpu_request)) &&
      can(regex("^[0-9]+(m|\\.[0-9]+)?$", var.container_resources.cpu_limit))
    )
    error_message = "CPU values must be valid Kubernetes quantities (e.g., '100m' or '0.5')."
  }

  validation {
    condition = (
      can(regex("^[0-9]+(Ki|Mi|Gi|Ti|Pi|Ei)?$", var.container_resources.memory_request)) &&
      can(regex("^[0-9]+(Ki|Mi|Gi|Ti|Pi|Ei)?$", var.container_resources.memory_limit))
    )
    error_message = "Memory values must be valid Kubernetes quantities (e.g., '128Mi', '1Gi')."
  }

  validation {
    condition = (
      tonumber(regex("^([0-9]+)", var.container_resources.cpu_limit)[0]) >=
      tonumber(regex("^([0-9]+)", var.container_resources.cpu_request)[0])
    )
    error_message = "CPU limit must be greater than or equal to CPU request."
  }
}
```

## Validating Environment-Specific Values

Different environments should have different constraints:

```hcl
variable "environment" {
  description = "Deployment environment"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "min_replicas" {
  description = "Minimum number of replicas"
  type        = number

  validation {
    condition     = var.min_replicas >= (var.environment == "production" ? 2 : 1)
    error_message = "Production environment must have at least 2 replicas for high availability."
  }
}

variable "enable_autoscaling" {
  description = "Enable horizontal pod autoscaling"
  type        = bool

  validation {
    condition     = var.environment == "production" ? var.enable_autoscaling == true : true
    error_message = "Autoscaling must be enabled in production environment."
  }
}
```

## Validating Network Configuration

Validate service ports and network policies:

```hcl
variable "service_ports" {
  description = "Service port configurations"
  type = list(object({
    name        = string
    port        = number
    target_port = number
    protocol    = string
  }))

  validation {
    condition = alltrue([
      for port in var.service_ports :
      port.port >= 1 && port.port <= 65535
    ])
    error_message = "Service ports must be between 1 and 65535."
  }

  validation {
    condition = alltrue([
      for port in var.service_ports :
      contains(["TCP", "UDP", "SCTP"], port.protocol)
    ])
    error_message = "Protocol must be TCP, UDP, or SCTP."
  }

  validation {
    condition = length(var.service_ports) == length(distinct([for port in var.service_ports : port.name]))
    error_message = "Port names must be unique."
  }
}

variable "allowed_cidrs" {
  description = "CIDR blocks allowed to access services"
  type        = list(string)

  validation {
    condition = alltrue([
      for cidr in var.allowed_cidrs :
      can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$", cidr))
    ])
    error_message = "All entries must be valid CIDR notation (e.g., 10.0.0.0/16)."
  }
}
```

## Validating Storage Configuration

Storage class and volume size validation:

```hcl
variable "storage_class" {
  description = "Kubernetes storage class name"
  type        = string

  validation {
    condition     = contains(["standard", "fast-ssd", "slow-hdd"], var.storage_class)
    error_message = "Storage class must be one of: standard, fast-ssd, slow-hdd."
  }
}

variable "volume_size" {
  description = "Persistent volume size"
  type        = string
  default     = "10Gi"

  validation {
    condition     = can(regex("^[0-9]+(Gi|Ti)$", var.volume_size))
    error_message = "Volume size must be specified in Gi or Ti (e.g., '10Gi', '1Ti')."
  }

  validation {
    condition = (
      tonumber(regex("^([0-9]+)", var.volume_size)[0]) >= 1
    )
    error_message = "Volume size must be at least 1Gi."
  }
}

variable "access_modes" {
  description = "PVC access modes"
  type        = list(string)

  validation {
    condition = alltrue([
      for mode in var.access_modes :
      contains(["ReadWriteOnce", "ReadOnlyMany", "ReadWriteMany"], mode)
    ])
    error_message = "Access modes must be ReadWriteOnce, ReadOnlyMany, or ReadWriteMany."
  }
}
```

## Validating Label and Annotation Keys

Kubernetes has strict rules for label and annotation keys:

```hcl
variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}

  validation {
    condition = alltrue([
      for key, value in var.labels :
      can(regex("^([a-z0-9A-Z]([a-z0-9A-Z._-]*[a-z0-9A-Z])?(/)?)+$", key))
    ])
    error_message = "Label keys must be valid DNS subdomain with optional prefix."
  }

  validation {
    condition = alltrue([
      for key, value in var.labels :
      length(value) <= 63
    ])
    error_message = "Label values must be 63 characters or less."
  }

  validation {
    condition = alltrue([
      for key, value in var.labels :
      can(regex("^[a-z0-9A-Z]([a-z0-9A-Z._-]*[a-z0-9A-Z])?$", value)) || value == ""
    ])
    error_message = "Label values must be alphanumeric with ., _, or - in the middle."
  }
}
```

## Complex Object Validation

Validate nested configuration objects:

```hcl
variable "deployment_config" {
  description = "Complete deployment configuration"
  type = object({
    name      = string
    namespace = string
    replicas  = number
    image     = string
    ports = list(object({
      name = string
      port = number
    }))
    env = map(string)
    resources = object({
      cpu_request    = string
      memory_request = string
      cpu_limit      = string
      memory_limit   = string
    })
  })

  validation {
    condition     = can(regex("^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", var.deployment_config.name))
    error_message = "Deployment name must be valid DNS label."
  }

  validation {
    condition     = var.deployment_config.replicas >= 1 && var.deployment_config.replicas <= 100
    error_message = "Replicas must be between 1 and 100."
  }

  validation {
    condition     = !can(regex(":latest$", var.deployment_config.image))
    error_message = "Image must not use 'latest' tag."
  }

  validation {
    condition = length(var.deployment_config.ports) > 0
    error_message = "At least one port must be configured."
  }

  validation {
    condition = alltrue([
      for port in var.deployment_config.ports :
      port.port >= 1 && port.port <= 65535
    ])
    error_message = "All ports must be between 1 and 65535."
  }
}
```

## Validating Probe Configuration

Health check configuration validation:

```hcl
variable "liveness_probe" {
  description = "Liveness probe configuration"
  type = object({
    enabled               = bool
    path                  = string
    port                  = number
    initial_delay_seconds = number
    period_seconds        = number
    timeout_seconds       = number
    failure_threshold     = number
  })

  validation {
    condition = (
      !var.liveness_probe.enabled ||
      (var.liveness_probe.initial_delay_seconds >= 0 && var.liveness_probe.initial_delay_seconds <= 300)
    )
    error_message = "Initial delay must be between 0 and 300 seconds."
  }

  validation {
    condition = (
      !var.liveness_probe.enabled ||
      (var.liveness_probe.period_seconds >= 1 && var.liveness_probe.period_seconds <= 60)
    )
    error_message = "Period must be between 1 and 60 seconds."
  }

  validation {
    condition = (
      !var.liveness_probe.enabled ||
      var.liveness_probe.timeout_seconds < var.liveness_probe.period_seconds
    )
    error_message = "Timeout must be less than period."
  }

  validation {
    condition = (
      !var.liveness_probe.enabled ||
      (var.liveness_probe.failure_threshold >= 1 && var.liveness_probe.failure_threshold <= 10)
    )
    error_message = "Failure threshold must be between 1 and 10."
  }
}
```

## Custom Validation Functions

Use local values for reusable validation logic:

```hcl
locals {
  is_valid_dns_label = {
    for key, ns in var.namespaces :
    key => can(regex("^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", ns))
  }

  all_dns_labels_valid = alltrue(values(local.is_valid_dns_label))

  total_cpu_request = sum([
    for service in var.services :
    tonumber(regex("^([0-9]+)", service.cpu_request)[0])
  ])

  total_memory_request_gi = sum([
    for service in var.services :
    tonumber(regex("^([0-9]+)", service.memory_request)[0])
  ])
}

variable "cluster_capacity" {
  description = "Cluster resource capacity"
  type = object({
    cpu_cores  = number
    memory_gi  = number
  })

  validation {
    condition     = var.cluster_capacity.cpu_cores >= local.total_cpu_request
    error_message = "Total CPU requests exceed cluster capacity."
  }

  validation {
    condition     = var.cluster_capacity.memory_gi >= local.total_memory_request_gi
    error_message = "Total memory requests exceed cluster capacity."
  }
}
```

## Providing Helpful Error Messages

Write clear, actionable error messages:

```hcl
variable "database_url" {
  description = "Database connection URL"
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^postgres://", var.database_url))
    error_message = <<-EOT
      Database URL must start with 'postgres://'.

      Example: postgres://username:password@hostname:5432/database

      See documentation: https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING
    EOT
  }
}

variable "ingress_hosts" {
  description = "Ingress hostnames"
  type        = list(string)

  validation {
    condition = alltrue([
      for host in var.ingress_hosts :
      can(regex("^([a-z0-9]+(-[a-z0-9]+)*\\.)+[a-z]{2,}$", host))
    ])
    error_message = <<-EOT
      All hostnames must be valid fully-qualified domain names.

      Valid examples:
        - api.example.com
        - staging-app.example.com
        - app.subdomain.example.com

      Invalid examples:
        - localhost
        - example
        - api_server.example.com (underscores not allowed)
    EOT
  }
}
```

## Testing Variable Validation

Create test configurations to verify validation works:

```hcl
# test/invalid-replica-count.tfvars
namespace     = "test"
replica_count = 20  # Should fail validation (> 10)

# test/invalid-image-tag.tfvars
namespace = "test"
api_image = "myapp/api:latest"  # Should fail (latest not allowed)

# test/valid-config.tfvars
namespace     = "production"
replica_count = 5
api_image     = "myapp/api:v1.2.3"
cpu_request   = "200m"
```

Test validation by running:

```bash
terraform validate -var-file=test/invalid-replica-count.tfvars
terraform validate -var-file=test/invalid-image-tag.tfvars
terraform validate -var-file=test/valid-config.tfvars
```

Variable validation is your first line of defense against configuration errors in Kubernetes deployments. By implementing comprehensive validation rules with clear error messages, you catch mistakes early in the development cycle, improve team productivity, and reduce the risk of deploying misconfigured infrastructure to production environments.
