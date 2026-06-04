# How to Use Policy-as-Code for Terraform Kubernetes Plans Using Sentinel and OPA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Policy-as-Code, Security

Description: Learn how to enforce infrastructure policies on Terraform Kubernetes plans using Sentinel for Terraform Cloud and Open Policy Agent for open-source workflows, ensuring compliance before deployment.

---

Infrastructure code needs governance. Teams must enforce naming conventions, security requirements, and resource limits. Policy-as-code validates Terraform plans automatically, catching violations before deployment. Sentinel works with Terraform Cloud, while OPA provides an open-source alternative.

This guide shows you how to implement both approaches for Kubernetes infrastructure.

## Understanding Policy-as-Code

Policies are rules written as code that validate infrastructure changes. They check Terraform plans for compliance, blocking non-compliant changes. Common policies enforce tagging, prevent public resources, and require specific configurations.

Policies evaluate the generated Terraform plan before apply, so violations are caught before changes are deployed. This prevents configuration drift and enforces standards.

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
            resource.change.after.tags is defined and
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
    rc.type is "kubernetes_deployment_v1" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check resource limits
validate_resource_limits = rule {
    all deployments as _, deployment {
        all deployment.change.after.spec[0].template[0].spec[0].container as container {
            container.resources is defined and
            container.resources is not empty and
            container.resources[0].limits is defined and
            container.resources[0].limits is not empty and
            container.resources[0].requests is defined and
            container.resources[0].requests is not empty
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
    rc.type is "kubernetes_namespace_v1" and
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

import rego.v1
import input as tfplan

# Deny deployments without resource limits
deny contains msg if {
    resource := tfplan.resource_changes[_]
    resource.type == "kubernetes_deployment_v1"
    resource.change.actions[_] == "create"

    container := resource.change.after.spec[0].template[0].spec[0].container[_]
    not has_resource_limits(container)

    msg := sprintf("Deployment %s container %s missing resource limits", [
        resource.name,
        container.name
    ])
}

has_resource_limits(container) if {
    resources := object.get(container, "resources", [])
    count(resources) > 0
    limits := object.get(resources[0], "limits", {})
    count(limits) > 0
}

# Deny deployments without readiness probes
deny contains msg if {
    resource := tfplan.resource_changes[_]
    resource.type == "kubernetes_deployment_v1"
    resource.change.actions[_] == "create"

    container := resource.change.after.spec[0].template[0].spec[0].container[_]
    readiness_probes := object.get(container, "readiness_probe", [])
    count(readiness_probes) == 0

    msg := sprintf("Deployment %s container %s missing readiness probe", [
        resource.name,
        container.name
    ])
}

# Enforce replica counts
deny contains msg if {
    resource := tfplan.resource_changes[_]
    resource.type == "kubernetes_deployment_v1"

    replicas := resource.change.after.spec[0].replicas
    replicas < 2

    msg := sprintf("Deployment %s has fewer than 2 replicas: %d", [
        resource.name,
        replicas
    ])
}

# Require specific labels
required_labels := ["app", "environment", "owner"]

deny contains msg if {
    resource := tfplan.resource_changes[_]
    resource.type == "kubernetes_deployment_v1"

    labels := object.get(resource.change.after.metadata[0], "labels", {})
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

Enforce network policies in the same plan:

```rego
# policies/network-policy.rego
package terraform.kubernetes.network

import rego.v1
import input as tfplan

# Require network policies for newly created namespaces
deny contains msg if {
    namespace := tfplan.resource_changes[_]
    namespace.type == "kubernetes_namespace_v1"
    namespace.change.actions[_] == "create"

    ns_name := namespace.change.after.metadata[0].name
    not has_network_policy(ns_name)

    msg := sprintf("Namespace %s missing network policy", [ns_name])
}

has_network_policy(ns_name) if {
    policy := tfplan.resource_changes[_]
    policy.type == "kubernetes_network_policy_v1"
    policy.change.after.metadata[0].namespace == ns_name
}
```

Validate ingress configurations:

```rego
# policies/ingress.rego
package terraform.kubernetes.ingress

import rego.v1
import input as tfplan

# Require TLS for all ingress
deny contains msg if {
    ingress := tfplan.resource_changes[_]
    ingress.type == "kubernetes_ingress_v1"
    ingress.change.actions[_] == "create"

    tls := object.get(ingress.change.after.spec[0], "tls", [])
    count(tls) == 0

    msg := sprintf("Ingress %s missing TLS configuration", [ingress.name])
}

# Require cert-manager annotations
deny contains msg if {
    ingress := tfplan.resource_changes[_]
    ingress.type == "kubernetes_ingress_v1"

    annotations := object.get(ingress.change.after.metadata[0], "annotations", {})
    not annotations["cert-manager.io/cluster-issuer"]

    msg := sprintf("Ingress %s missing cert-manager annotation", [ingress.name])
}
```

## Implementing Cost Control Policies

Limit resource sizes:

```rego
# policies/cost-control.rego
package terraform.kubernetes.cost

import rego.v1
import input as tfplan

# Maximum CPU per container
max_cpu := "2000m"

deny contains msg if {
    resource := tfplan.resource_changes[_]
    resource.type == "kubernetes_deployment_v1"

    container := resource.change.after.spec[0].template[0].spec[0].container[_]
    resources := object.get(container, "resources", [])
    count(resources) > 0
    limits := object.get(resources[0], "limits", {})
    cpu_limit := limits.cpu

    exceeds_cpu_limit(cpu_limit)

    msg := sprintf("Container %s CPU limit %s exceeds maximum %s", [
        container.name,
        cpu_limit,
        max_cpu
    ])
}

exceeds_cpu_limit(limit) if {
    limit_val := cpu_millicores(limit)
    max_val := cpu_millicores(max_cpu)
    limit_val > max_val
}

cpu_millicores(limit) := value if {
    endswith(limit, "m")
    value := to_number(trim_suffix(limit, "m"))
}

cpu_millicores(limit) := value if {
    not endswith(limit, "m")
    value := to_number(limit) * 1000
}
```

## Creating Policy Libraries

Organize policies:

```text
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
