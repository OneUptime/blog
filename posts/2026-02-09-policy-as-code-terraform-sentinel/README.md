# How to Implement Policy-as-Code for Terraform Kubernetes Plans Using Sentinel and OPA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Policy-as-Code, Security

Description: Learn how to enforce infrastructure policies on Terraform Kubernetes plans using Sentinel for Terraform Cloud and Open Policy Agent for open-source workflows, ensuring compliance before deployment.

---

Infrastructure code needs governance. Teams must enforce naming conventions, security requirements, and resource limits. Policy-as-code validates Terraform plans automatically, catching violations before deployment. Sentinel works with Terraform Cloud, while OPA provides an open-source alternative.

This guide shows you how to implement both approaches for Kubernetes infrastructure.

## Understanding Policy-as-Code

Policies are rules written as code that validate infrastructure changes. They check Terraform plans for compliance, blocking non-compliant changes. Common policies enforce tagging, prevent public resources, and require specific configurations.

Policies run during terraform plan, so violations are caught before applying changes. This prevents configuration drift and enforces standards.

## Implementing Sentinel Policies

Sentinel is HashiCorp's policy language. Create your first policy:

```sentinel
# policies/require-tags.sentinel
import "tfplan/v2" as tfplan

# Required tags for all resources
required_tags = ["Environment", "Owner", "ManagedBy"]

# Find all resources in the plan
all_resources = filter tfplan.resource_changes as _, rc {
    rc.mode is "managed" and
    rc.change.actions contains "create"
}

# Validate tags
validate_tags = rule {
    all all_resources as _, resource {
        all required_tags as tag {
            resource.change.after.tags contains tag
        }
    }
}

main = rule {
    validate_tags
}
```

Test locally:

```bash
sentinel test policies/require-tags.sentinel
```

## Creating Kubernetes-Specific Sentinel Policies

Enforce resource limits:

```sentinel
# policies/kubernetes-resource-limits.sentinel
import "tfplan/v2" as tfplan

# Find all Kubernetes deployments
deployments = filter tfplan.resource_changes as _, rc {
    rc.type is "kubernetes_deployment" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check resource limits
validate_resource_limits = rule {
    all deployments as _, deployment {
        all deployment.change.after.spec[0].template[0].spec[0].container as container {
            container.resources[0].limits is not null and
            container.resources[0].requests is not null
        }
    }
}

main = rule {
    validate_resource_limits
}
```

Enforce namespace conventions:

```sentinel
# policies/kubernetes-namespaces.sentinel
import "tfplan/v2" as tfplan
import "strings"

# Allowed namespace prefixes
allowed_prefixes = ["prod-", "staging-", "dev-"]

# Find all namespaces
namespaces = filter tfplan.resource_changes as _, rc {
    rc.type is "kubernetes_namespace" and
    rc.change.actions contains "create"
}

# Validate namespace names
validate_namespaces = rule {
    all namespaces as _, ns {
        any allowed_prefixes as prefix {
            strings.has_prefix(ns.change.after.metadata[0].name, prefix)
        }
    }
}

main = rule {
    validate_namespaces
}
```

## Implementing OPA Policies

OPA uses Rego language. Convert Terraform plan to JSON:

```bash
terraform plan -out=tfplan
terraform show -json tfplan > tfplan.json
```

Create OPA policy:

```rego
# policies/kubernetes.rego
package terraform.kubernetes

import input as tfplan

# Deny deployments without resource limits
deny[msg] {
    resource := tfplan.resource_changes[_]
    resource.type == "kubernetes_deployment"
    resource.change.actions[_] == "create"

    container := resource.change.after.spec[0].template[0].spec[0].container[_]
    not container.resources.limits

    msg := sprintf("Deployment %s container %s missing resource limits", [
        resource.name,
        container.name
    ])
}

# Deny deployments without readiness probes
deny[msg] {
    resource := tfplan.resource_changes[_]
    resource.type == "kubernetes_deployment"
    resource.change.actions[_] == "create"

    container := resource.change.after.spec[0].template[0].spec[0].container[_]
    not container.readiness_probe

    msg := sprintf("Deployment %s container %s missing readiness probe", [
        resource.name,
        container.name
    ])
}

# Enforce replica counts
deny[msg] {
    resource := tfplan.resource_changes[_]
    resource.type == "kubernetes_deployment"

    replicas := resource.change.after.spec[0].replicas
    replicas < 2

    msg := sprintf("Deployment %s has fewer than 2 replicas: %d", [
        resource.name,
        replicas
    ])
}

# Require specific labels
required_labels := ["app", "environment", "owner"]

deny[msg] {
    resource := tfplan.resource_changes[_]
    resource.type == "kubernetes_deployment"

    labels := resource.change.after.metadata[0].labels
    required_label := required_labels[_]
    not labels[required_label]

    msg := sprintf("Deployment %s missing required label: %s", [
        resource.name,
        required_label
    ])
}
```

Test the policy:

```bash
opa eval -d policies/ -i tfplan.json "data.terraform.kubernetes.deny"
```

## Integrating OPA into CI/CD

Create a validation script:

```bash
#!/bin/bash
# validate-terraform.sh

set -e

echo "Running Terraform plan..."
terraform plan -out=tfplan

echo "Converting plan to JSON..."
terraform show -json tfplan > tfplan.json

echo "Running OPA policy checks..."
VIOLATIONS=$(opa eval -d policies/ -i tfplan.json "data.terraform.kubernetes.deny" --format raw)

if [ "$VIOLATIONS" != "[]" ]; then
    echo "Policy violations found:"
    echo "$VIOLATIONS" | jq -r '.[]'
    exit 1
fi

echo "All policies passed!"
```

Add to GitHub Actions:

```yaml
# .github/workflows/terraform-policy.yml
name: Terraform Policy Check

on:
  pull_request:
    branches: [main]

jobs:
  policy-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Setup OPA
        run: |
          curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64
          chmod +x opa
          sudo mv opa /usr/local/bin/

      - name: Terraform Init
        run: terraform init

      - name: Run Policy Checks
        run: ./validate-terraform.sh
```

## Creating Advanced OPA Policies

Enforce network policies:

```rego
# policies/network-policy.rego
package terraform.kubernetes.network

import input as tfplan

# Require network policies for all namespaces
deny[msg] {
    namespace := tfplan.resource_changes[_]
    namespace.type == "kubernetes_namespace"
    namespace.change.actions[_] == "create"

    ns_name := namespace.change.after.metadata[0].name
    not has_network_policy(ns_name)

    msg := sprintf("Namespace %s missing network policy", [ns_name])
}

has_network_policy(ns_name) {
    policy := tfplan.resource_changes[_]
    policy.type == "kubernetes_network_policy"
    policy.change.after.metadata[0].namespace == ns_name
}
```

Validate ingress configurations:

```rego
# policies/ingress.rego
package terraform.kubernetes.ingress

import input as tfplan

# Require TLS for all ingress
deny[msg] {
    ingress := tfplan.resource_changes[_]
    ingress.type == "kubernetes_ingress_v1"
    ingress.change.actions[_] == "create"

    not ingress.change.after.spec[0].tls

    msg := sprintf("Ingress %s missing TLS configuration", [ingress.name])
}

# Require cert-manager annotations
deny[msg] {
    ingress := tfplan.resource_changes[_]
    ingress.type == "kubernetes_ingress_v1"

    annotations := ingress.change.after.metadata[0].annotations
    not annotations["cert-manager.io/cluster-issuer"]

    msg := sprintf("Ingress %s missing cert-manager annotation", [ingress.name])
}
```

## Implementing Cost Control Policies

Limit resource sizes:

```rego
# policies/cost-control.rego
package terraform.kubernetes.cost

import input as tfplan

# Maximum CPU per container
max_cpu := "2000m"

# Maximum memory per container
max_memory := "4Gi"

deny[msg] {
    resource := tfplan.resource_changes[_]
    resource.type == "kubernetes_deployment"

    container := resource.change.after.spec[0].template[0].spec[0].container[_]
    cpu_limit := container.resources.limits.cpu

    exceeds_cpu_limit(cpu_limit)

    msg := sprintf("Container %s CPU limit %s exceeds maximum %s", [
        container.name,
        cpu_limit,
        max_cpu
    ])
}

exceeds_cpu_limit(limit) {
    limit_val := to_number(trim_suffix(limit, "m"))
    max_val := to_number(trim_suffix(max_cpu, "m"))
    limit_val > max_val
}
```

## Creating Policy Libraries

Organize policies:

```
policies/
├── kubernetes/
│   ├── deployments.rego
│   ├── namespaces.rego
│   ├── network-policies.rego
│   ├── ingress.rego
│   └── rbac.rego
├── security/
│   ├── secrets.rego
│   ├── pod-security.rego
│   └── image-policies.rego
├── compliance/
│   ├── tagging.rego
│   ├── naming.rego
│   └── resource-limits.rego
└── cost/
    ├── limits.rego
    └── quotas.rego
```

## Summary

Policy-as-code enforces infrastructure standards automatically. Sentinel integrates with Terraform Cloud for enterprise workflows, while OPA provides an open-source alternative that runs anywhere. Both approaches validate Terraform plans before deployment, catching violations early. This prevents configuration drift, enforces security requirements, and maintains compliance across all Kubernetes infrastructure changes.
