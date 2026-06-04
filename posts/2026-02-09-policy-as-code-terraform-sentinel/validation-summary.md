# Validation Summary: How to Use Policy-as-Code for Terraform Kubernetes Plans Using Sentinel and OPA

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform plan JSON
- HCP Terraform / Terraform Cloud policy enforcement
- HashiCorp Sentinel
- Open Policy Agent (OPA)
- Rego
- Terraform Kubernetes provider
- GitHub Actions

## Sources Consulted
- HashiCorp Terraform JSON output format: https://developer.hashicorp.com/terraform/internals/json-format
- HashiCorp Sentinel `tfplan/v2` import: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/sentinel/import/tfplan-v2
- HashiCorp Sentinel test command: https://developer.hashicorp.com/sentinel/docs/commands/test
- HashiCorp Sentinel undefined and boolean handling: https://developer.hashicorp.com/sentinel/docs/language/undefined
- HashiCorp Sentinel strings import: https://developer.hashicorp.com/sentinel/docs/imports/strings
- OPA Terraform guide: https://www.openpolicyagent.org/docs/terraform
- OPA CLI and `opa eval` documentation: https://www.openpolicyagent.org/docs
- OPA Rego v1 `if` keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/if
- OPA Rego import documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/import
- Terraform Kubernetes provider `kubernetes_deployment_v1`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment_v1
- Terraform Kubernetes provider `kubernetes_namespace_v1`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/namespace_v1
- Terraform Kubernetes provider `kubernetes_network_policy_v1`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/network_policy_v1
- Terraform Kubernetes provider `kubernetes_ingress_v1`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/ingress_v1
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/

## Issues Found
- Corrected the claim that policies run during `terraform plan`. Terraform creates the plan first; Sentinel and OPA evaluate the generated plan before apply.
- Updated Kubernetes Terraform resource type checks from older non-`_v1` names to current provider resource names such as `kubernetes_deployment_v1`, `kubernetes_namespace_v1`, and `kubernetes_network_policy_v1`.
- Updated OPA/Rego examples to Rego v1 syntax by adding `import rego.v1` and using `deny contains msg if` and function `if` forms.
- Fixed OPA examples that treated Terraform Kubernetes nested blocks as objects. The examples now account for list-based nested blocks such as `resources`, `readiness_probe`, and `tls`.
- Made label and annotation checks resilient when optional maps are absent by using `object.get`.
- Clarified that the network policy example checks for network policies created in the same Terraform plan, not policies that may already exist outside the plan.
- Fixed the cost-control CPU comparison to normalize whole-core values and millicore values before comparing them.
- Made Sentinel resource-limit and tag checks handle undefined values more explicitly.

## Review Notes
The OPA snippets were checked with OPA 1.17.0 using `opa check`, and the `opa eval --format raw` command shape was verified with an empty Terraform plan input. Sentinel syntax was reviewed against HashiCorp language and `tfplan/v2` documentation, but the Sentinel CLI was not available locally for execution testing.
