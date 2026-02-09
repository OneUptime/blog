# How to Write Gatekeeper ConstraintTemplates Using Rego Language

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OPA, Gatekeeper, Rego

Description: Learn to write custom Gatekeeper ConstraintTemplates using the Rego policy language, creating reusable policies for Kubernetes resource validation.

---

Gatekeeper ConstraintTemplates use Rego, Open Policy Agent's policy language, to define validation logic. Understanding Rego fundamentals enables you to write custom policies tailored to your organization's specific requirements, going beyond basic built-in constraints.

## Rego Language Basics

Rego is a declarative query language. Policies define rules that evaluate to true or false:

```rego
package example

# Simple rule
allow {
  input.user == "admin"
}

# Rule with multiple conditions
deny {
  input.method == "DELETE"
  input.user != "admin"
}
```

In Gatekeeper, violation rules identify policy violations.

## ConstraintTemplate Structure

Templates consist of two main sections:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sexample
spec:
  crd:
    spec:
      names:
        kind: K8sExample
      validation:
        openAPIV3Schema:
          type: object
          properties:
            # Parameters users can provide
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        # Rego policy code
```

## Writing Basic Validation Rules

Check for required annotations:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredannotations
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredAnnotations
      validation:
        openAPIV3Schema:
          type: object
          properties:
            annotations:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredannotations

        violation[{"msg": msg}] {
          # Get annotations from the resource
          provided := {annotation | input.review.object.metadata.annotations[annotation]}
          
          # Get required annotations from parameters
          required := {annotation | annotation := input.parameters.annotations[_]}
          
          # Find missing annotations
          missing := required - provided
          count(missing) > 0
          
          # Build error message
          msg := sprintf("Missing required annotations: %v", [missing])
        }
```

## Accessing Resource Fields

Access different parts of the Kubernetes resource:

```rego
package example

violation[{"msg": msg}] {
  # Metadata
  name := input.review.object.metadata.name
  namespace := input.review.object.metadata.namespace
  labels := input.review.object.metadata.labels
  
  # Spec (varies by resource type)
  spec := input.review.object.spec
  
  # For Pods/Deployments
  containers := spec.containers[_]
  image := containers.image
  
  # Build violation message
  msg := sprintf("Resource %v in namespace %v violates policy", [name, namespace])
}
```

## Iterating Over Containers

Check all containers in a pod spec:

```rego
package containervalidation

violation[{"msg": msg}] {
  # Get all containers
  container := input.review.object.spec.containers[_]
  
  # Check each container
  not container.securityContext.runAsNonRoot
  
  msg := sprintf("Container %v must run as non-root", [container.name])
}

violation[{"msg": msg}] {
  # Check init containers too
  container := input.review.object.spec.initContainers[_]
  not container.securityContext.runAsNonRoot
  
  msg := sprintf("Init container %v must run as non-root", [container.name])
}
```

## Working with Parameters

Use parameters to make templates reusable:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sminreplicas
spec:
  crd:
    spec:
      names:
        kind: K8sMinReplicas
      validation:
        openAPIV3Schema:
          type: object
          properties:
            minReplicas:
              type: integer
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sminreplicas

        violation[{"msg": msg}] {
          # Get replica count from resource
          replicas := input.review.object.spec.replicas
          
          # Get minimum from parameters
          min_replicas := input.parameters.minReplicas
          
          # Check if below minimum
          replicas < min_replicas
          
          msg := sprintf("Deployment has %v replicas, minimum is %v", [replicas, min_replicas])
        }
```

## Pattern Matching with Regex

Validate naming conventions:

```rego
package naming

import future.keywords.contains
import future.keywords.if

violation[{"msg": msg}] if {
  name := input.review.object.metadata.name
  
  # Must start with team prefix
  not startswith(name, "team-")
  
  msg := sprintf("Resource name %v must start with 'team-'", [name])
}

violation[{"msg": msg}] if {
  name := input.review.object.metadata.name
  
  # Must match pattern
  not regex.match("^[a-z0-9-]+$", name)
  
  msg := sprintf("Resource name %v must contain only lowercase alphanumeric and hyphens", [name])
}
```

## Complex Logic with Functions

Create helper functions:

```rego
package helpers

# Check if container has resource limits
has_limits(container) {
  container.resources.limits
}

# Check if image is from approved registry
approved_image(image, allowed_registries) {
  registry := allowed_registries[_]
  startswith(image, registry)
}

# Main violation rules
violation[{"msg": msg}] {
  container := input.review.object.spec.containers[_]
  not has_limits(container)
  msg := sprintf("Container %v missing resource limits", [container.name])
}

violation[{"msg": msg}] {
  container := input.review.object.spec.containers[_]
  allowed := input.parameters.registries
  not approved_image(container.image, allowed)
  msg := sprintf("Container %v uses unapproved registry", [container.name])
}
```

## Handling Multiple Resource Types

Write templates that work across resource types:

```rego
package podspec

# Extract pod spec from various resource types
get_pod_spec(review) = spec {
  review.object.kind == "Pod"
  spec := review.object.spec
}

get_pod_spec(review) = spec {
  review.object.kind == "Deployment"
  spec := review.object.spec.template.spec
}

get_pod_spec(review) = spec {
  review.object.kind == "StatefulSet"
  spec := review.object.spec.template.spec
}

violation[{"msg": msg}] {
  spec := get_pod_spec(input.review)
  container := spec.containers[_]
  
  # Now check containers regardless of resource type
  container.securityContext.privileged == true
  msg := sprintf("Privileged container not allowed: %v", [container.name])
}
```

## Testing Rego Policies

Use OPA CLI to test policies locally:

```bash
# Install OPA
brew install opa

# Test policy file
opa test policy.rego test_policy.rego

# Evaluate policy with input
opa eval -d policy.rego -i input.json "data.package.violation"
```

Example test file:

```rego
# test_policy.rego
package test

test_violation_with_missing_labels {
  violation with input as {
    "review": {
      "object": {
        "metadata": {
          "name": "test",
          "labels": {}
        }
      }
    },
    "parameters": {
      "labels": ["app", "team"]
    }
  }
}

test_no_violation_with_labels {
  not violation with input as {
    "review": {
      "object": {
        "metadata": {
          "name": "test",
          "labels": {
            "app": "myapp",
            "team": "platform"
          }
        }
      }
    },
    "parameters": {
      "labels": ["app", "team"]
    }
  }
}
```

Writing custom ConstraintTemplates with Rego enables precise policy enforcement tailored to your organization's requirements, going beyond generic built-in policies to implement specific compliance and security rules.
