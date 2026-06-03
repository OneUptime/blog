# Validation Summary: How to Implement Terraform Sentinel Policies for Kubernetes Resource Compliance

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- HCP Terraform / Terraform Enterprise Sentinel policy enforcement
- Sentinel policy language and Sentinel CLI
- Kubernetes Terraform provider
- Kubernetes Deployments, Pods, Namespaces, NetworkPolicies, resource limits, security contexts, service accounts, and image tags

## Sources Consulted
- HashiCorp Sentinel configuration file syntax: https://developer.hashicorp.com/sentinel/docs/configuration
- HashiCorp Sentinel `tfplan/v2` import reference: https://developer.hashicorp.com/terraform/enterprise/workspaces/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Sentinel `strings` import reference: https://developer.hashicorp.com/sentinel/docs/imports/strings
- HashiCorp Sentinel language specification and built-in functions: https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Sentinel CLI `apply` command reference: https://developer.hashicorp.com/sentinel/docs/commands/apply
- HashiCorp Sentinel installation tutorial: https://developer.hashicorp.com/sentinel/tutorials/get-started/install
- HCP Terraform Sentinel policy set configuration docs: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/manage-policy-sets/sentinel-vcs
- Terraform CLI plan tutorial / JSON plan output workflow: https://developer.hashicorp.com/terraform/tutorials/cli/plan
- HashiCorp Kubernetes provider registry documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs

## Issues Found
- `sentinel.hcl` policy blocks omitted required `source` attributes. Added `source` to each policy block so the configuration matches Sentinel and HCP Terraform policy set requirements.
- Several policies only matched legacy Kubernetes provider resource names such as `kubernetes_deployment`. Updated resource filters to also match current `_v1` resource types such as `kubernetes_deployment_v1`, `kubernetes_namespace_v1`, `kubernetes_pod_v1`, and `kubernetes_network_policy_v1`.
- The image tag policy used `strings.contains`, which is not part of Sentinel's `strings` import. Replaced it with Sentinel's string `contains` operator and scoped the check to the image name after the final slash so registry ports do not get mistaken for tags.
- The naming policy used `strings.matches`, which is not part of Sentinel's `strings` import. Replaced it with Sentinel's `matches` operator and corrected the regex so one-character names can pass while still requiring lowercase alphanumeric boundaries.
- Optional Kubernetes fields such as `resources`, `labels`, `namespace`, `replicas`, `security_context`, and `service_account_name` could cause runtime errors or false passes when omitted. Added Sentinel `else` defaults and length checks where needed.
- The Sentinel CLI install command used `brew install sentinel`, but HashiCorp's official Homebrew installation uses `brew tap hashicorp/tap` and `brew install hashicorp/tap/sentinel`. Updated the commands.
- The local `sentinel apply` example implied that the CLI would automatically read `tfplan.json` for `tfplan/v2`. Updated the command to apply against a local mock configuration, which is how Sentinel CLI simulates Terraform imports locally.
- The suggested repository layout placed local policy files in nested directories under a single `sentinel.hcl`. HCP Terraform policy set documentation requires local policy files referenced by the policy set configuration to reside with the configuration file. Flattened the policy file layout and adjusted test directories to match Sentinel's `test/<policy>/*.hcl` convention.

## Review Notes
The examples remain illustrative and still require real `mock-tfplan-*.sentinel` files for local Sentinel CLI tests. The workspace did not have `sentinel` or `terraform` installed, so runtime validation was limited to documentation-based review and source-level checking.
