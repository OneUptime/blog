# How to Implement Terraform Sentinel Policies for Kubernetes Resource Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Kubernetes, Policy as Code

Description: Enforce organizational standards and security requirements for Kubernetes deployments using Terraform Sentinel policies, ensuring compliance before resources are created.

---

Terraform Sentinel is a policy-as-code framework that enforces rules on your infrastructure before it's created. For Kubernetes deployments, Sentinel policies can validate resource configurations, ensure security best practices, enforce naming conventions, and prevent misconfigurations that could lead to production issues or security vulnerabilities.

## Understanding Sentinel Basics

Sentinel policies are written in the Sentinel language and evaluate to either pass or fail. Policies can access the Terraform plan, configuration, and state to make decisions. Enforcement levels determine what happens when a policy fails:

- **advisory** - Logs a warning but allows the apply
- **soft-mandatory** - Can be overridden with proper permissions
- **hard-mandatory** - Cannot be overridden, blocks the apply

## Setting Up Sentinel for Kubernetes

Sentinel is available in Terraform Cloud and Enterprise. Create a sentinel.hcl file in your repository:

```hcl
policy "require-resource-limits" {
  enforcement_level = "hard-mandatory"
}

policy "prevent-latest-image-tag" {
  enforcement_level = "hard-mandatory"
}

policy "require-production-replicas" {
  enforcement_level = "soft-mandatory"
}

policy "enforce-namespace-labels" {
  enforcement_level = "advisory"
}
```

## Requiring Resource Limits

Ensure all containers have resource requests and limits defined:

```sentinel
# require-resource-limits.sentinel
import "tfplan/v2" as tfplan

# Find all Kubernetes deployment resources
deployments = filter tfplan.resource_changes as _, rc {
  rc.type is "kubernetes_deployment" and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check each deployment's containers for resource limits
violations = []

for deployments as path, deployment {
  spec = deployment.change.after.spec[0]
  containers = spec.template[0].spec[0].container
  
  for containers as idx, container {
    if "resources" not in keys(container) {
      append(violations, {
        "deployment": path,
        "container": idx,
        "message": "Container must define resource requests and limits"
      })
    } else {
      resources = container.resources[0]
      
      if "requests" not in keys(resources) or "limits" not in keys(resources) {
        append(violations, {
          "deployment": path,
          "container": idx,
          "message": "Container must define both requests and limits"
        })
      } else {
        requests = resources.requests
        limits = resources.limits
        
        if "cpu" not in keys(requests) or "memory" not in keys(requests) {
          append(violations, {
            "deployment": path,
            "container": idx,
            "message": "Container must request CPU and memory"
          })
        }
        
        if "cpu" not in keys(limits) or "memory" not in keys(limits) {
          append(violations, {
            "deployment": path,
            "container": idx,
            "message": "Container must limit CPU and memory"
          })
        }
      }
    }
  }
}

# Main rule
main = rule {
  length(violations) == 0
}

# Print violations
print("Resource limit violations:")
for violations as v {
  print(v.deployment, "-", v.container, ":", v.message)
}
```

## Preventing Latest Image Tags

Enforce explicit version tags on container images:

```sentinel
# prevent-latest-image-tag.sentinel
import "tfplan/v2" as tfplan
import "strings"

# Get all deployment resources
deployments = filter tfplan.resource_changes as _, rc {
  rc.type is "kubernetes_deployment" and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check for 'latest' tag or missing tag
violations = []

for deployments as path, deployment {
  containers = deployment.change.after.spec[0].template[0].spec[0].container
  
  for containers as idx, container {
    image = container.image
    
    # Check if image ends with :latest
    if strings.has_suffix(image, ":latest") {
      append(violations, {
        "deployment": path,
        "container": idx,
        "image": image,
        "message": "Image tag 'latest' is not allowed"
      })
    }
    
    # Check if image has no tag
    if not strings.contains(image, ":") {
      append(violations, {
        "deployment": path,
        "container": idx,
        "image": image,
        "message": "Image must have an explicit version tag"
      })
    }
  }
}

main = rule {
  length(violations) == 0
}

print("Image tag violations:")
for violations as v {
  print(v.deployment, "-", v.image, ":", v.message)
}
```

## Enforcing Production Replica Counts

Require minimum replica counts in production namespaces:

```sentinel
# require-production-replicas.sentinel
import "tfplan/v2" as tfplan

production_namespaces = ["production", "prod"]
min_replicas = 2

deployments = filter tfplan.resource_changes as _, rc {
  rc.type is "kubernetes_deployment" and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

violations = []

for deployments as path, deployment {
  namespace = deployment.change.after.metadata[0].namespace
  replicas = deployment.change.after.spec[0].replicas
  
  if namespace in production_namespaces and replicas < min_replicas {
    append(violations, {
      "deployment": path,
      "namespace": namespace,
      "replicas": replicas,
      "message": "Production deployments must have at least " + string(min_replicas) + " replicas"
    })
  }
}

main = rule {
  length(violations) == 0
}

print("Production replica violations:")
for violations as v {
  print(v.deployment, "in", v.namespace, "has", v.replicas, "replicas")
}
```

## Enforcing Namespace Labels

Require specific labels on all namespaces:

```sentinel
# enforce-namespace-labels.sentinel
import "tfplan/v2" as tfplan

required_labels = ["team", "environment", "cost-center"]

namespaces = filter tfplan.resource_changes as _, rc {
  rc.type is "kubernetes_namespace" and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

violations = []

for namespaces as path, namespace {
  labels = namespace.change.after.metadata[0].labels
  
  for required_labels as required_label {
    if required_label not in keys(labels) {
      append(violations, {
        "namespace": path,
        "missing_label": required_label,
        "message": "Namespace missing required label: " + required_label
      })
    }
  }
}

main = rule {
  length(violations) == 0
}

print("Namespace label violations:")
for violations as v {
  print(v.namespace, "-", v.message)
}
```

## Preventing Privileged Containers

Block containers running with elevated privileges:

```sentinel
# prevent-privileged-containers.sentinel
import "tfplan/v2" as tfplan

deployments = filter tfplan.resource_changes as _, rc {
  (rc.type is "kubernetes_deployment" or rc.type is "kubernetes_pod") and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

violations = []

for deployments as path, resource {
  spec = resource.change.after.spec[0]
  
  # Handle both pod and deployment specs
  containers = undefined
  if resource.type is "kubernetes_deployment" {
    containers = spec.template[0].spec[0].container
  } else {
    containers = spec.container
  }
  
  for containers as idx, container {
    if "security_context" in keys(container) {
      security = container.security_context[0]
      
      if "privileged" in keys(security) and security.privileged is true {
        append(violations, {
          "resource": path,
          "container": idx,
          "message": "Privileged containers are not allowed"
        })
      }
    }
  }
}

main = rule {
  length(violations) == 0
}
```

## Enforcing Network Policy Usage

Ensure network policies exist for all namespaces:

```sentinel
# require-network-policies.sentinel
import "tfplan/v2" as tfplan

namespaces = filter tfplan.resource_changes as _, rc {
  rc.type is "kubernetes_namespace" and
  rc.mode is "managed" and
  rc.change.actions contains "create"
}

network_policies = filter tfplan.resource_changes as _, rc {
  rc.type is "kubernetes_network_policy" and
  rc.mode is "managed" and
  rc.change.actions contains "create"
}

# Build map of namespaces with network policies
policy_namespaces = {}
for network_policies as _, policy {
  namespace = policy.change.after.metadata[0].namespace
  policy_namespaces[namespace] = true
}

violations = []

for namespaces as path, namespace {
  ns_name = namespace.change.after.metadata[0].name
  
  if ns_name not in keys(policy_namespaces) {
    append(violations, {
      "namespace": ns_name,
      "message": "Namespace must have at least one network policy"
    })
  }
}

main = rule {
  length(violations) == 0
}
```

## Validating Service Account Usage

Require non-default service accounts for workloads:

```sentinel
# require-service-accounts.sentinel
import "tfplan/v2" as tfplan

deployments = filter tfplan.resource_changes as _, rc {
  rc.type is "kubernetes_deployment" and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

violations = []

for deployments as path, deployment {
  spec = deployment.change.after.spec[0].template[0].spec[0]
  
  if "service_account_name" not in keys(spec) or spec.service_account_name is "default" {
    append(violations, {
      "deployment": path,
      "message": "Deployment must use a non-default service account"
    })
  }
}

main = rule {
  length(violations) == 0
}
```

## Enforcing Resource Naming Conventions

Validate resource names follow organizational standards:

```sentinel
# enforce-naming-conventions.sentinel
import "tfplan/v2" as tfplan
import "strings"

all_resources = filter tfplan.resource_changes as _, rc {
  rc.type contains "kubernetes_" and
  rc.mode is "managed" and
  rc.change.actions contains "create"
}

violations = []

for all_resources as path, resource {
  name = resource.change.after.metadata[0].name
  
  # Must be lowercase
  if name != strings.to_lower(name) {
    append(violations, {
      "resource": path,
      "name": name,
      "message": "Resource name must be lowercase"
    })
  }
  
  # Must not exceed 63 characters
  if length(name) > 63 {
    append(violations, {
      "resource": path,
      "name": name,
      "message": "Resource name must not exceed 63 characters"
    })
  }
  
  # Must start and end with alphanumeric
  if not (strings.matches(name, "^[a-z0-9].*[a-z0-9]$")) {
    append(violations, {
      "resource": path,
      "name": name,
      "message": "Resource name must start and end with alphanumeric character"
    })
  }
}

main = rule {
  length(violations) == 0
}
```

## Testing Sentinel Policies

Test policies locally using the Sentinel CLI:

```bash
# Install Sentinel CLI
brew install sentinel

# Test a policy
sentinel test require-resource-limits.sentinel

# Apply policy to a plan
terraform plan -out=tfplan.binary
terraform show -json tfplan.binary > tfplan.json
sentinel apply -config=sentinel.hcl require-resource-limits.sentinel
```

Create test cases:

```hcl
# test/require-resource-limits/pass.hcl
mock "tfplan/v2" {
  module {
    source = "mock-tfplan-pass.sentinel"
  }
}

test {
  rules = {
    main = true
  }
}

# test/require-resource-limits/fail.hcl
mock "tfplan/v2" {
  module {
    source = "mock-tfplan-fail.sentinel"
  }
}

test {
  rules = {
    main = false
  }
}
```

## Organizing Policies

Structure your policy repository:

```
policies/
├── sentinel.hcl
├── security/
│   ├── prevent-privileged-containers.sentinel
│   ├── require-service-accounts.sentinel
│   └── require-network-policies.sentinel
├── compliance/
│   ├── require-resource-limits.sentinel
│   ├── enforce-namespace-labels.sentinel
│   └── enforce-naming-conventions.sentinel
├── operations/
│   ├── prevent-latest-image-tag.sentinel
│   └── require-production-replicas.sentinel
└── test/
    ├── security/
    ├── compliance/
    └── operations/
```

Terraform Sentinel policies provide automated enforcement of organizational standards for Kubernetes deployments. By codifying requirements as policies, you ensure consistent, secure, and compliant infrastructure across all teams and environments, catching violations before they reach production.
