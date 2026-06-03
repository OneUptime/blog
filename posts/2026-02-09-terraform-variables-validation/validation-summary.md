# Validation Summary: How to Configure Terraform Variables and Validation for Kubernetes Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform input variables and validation blocks
- Terraform expressions and functions
- Kubernetes namespaces, labels, Services, probes, and resource quantities
- PostgreSQL connection URI format

## Sources Consulted
- HashiCorp Terraform variable block reference: https://developer.hashicorp.com/terraform/language/block/variable
- HashiCorp Terraform custom conditions documentation: https://developer.hashicorp.com/terraform/language/validate
- HashiCorp Terraform validate command reference: https://developer.hashicorp.com/terraform/cli/commands/validate
- HashiCorp Terraform regex function documentation: https://developer.hashicorp.com/terraform/language/functions/regex
- HashiCorp Terraform cidrhost function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrhost
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Service protocols documentation: https://kubernetes.io/docs/reference/networking/service-protocols/
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- PostgreSQL libpq connection string documentation: https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING

## Issues Found
- Namespace and Deployment DNS-label validations did not enforce the Kubernetes 63-character DNS label limit. Added `length(...) <= 63` checks.
- Image validation error text required a registry/repository/tag shape, but the regex allowed strings without a slash before the tag. Tightened the regex and commit-hash tag pattern.
- CPU limit/request comparison compared only the leading numeric text, so `500m` could incorrectly compare as greater than `1`. Updated the comparison to normalize CPU values to millicores before comparing.
- The cluster-capacity example summed the leading numeric text from CPU and memory quantities without converting units. Updated the local values to normalize CPU requests to cores and memory requests to GiB before comparing them with cluster capacity.
- CIDR validation only matched dotted-decimal shape, allowing invalid addresses such as `999.999.999.999/99`. Replaced the regex check with Terraform's `cidrhost(cidr, 0)` inside `can(...)`.
- Label key validation accepted invalid keys such as keys ending in `/` or keys with multiple slash-separated segments. Replaced the regex with one that follows the Kubernetes optional-prefix/key-name structure more closely.
- Probe timeout validation allowed `timeout_seconds = 0`, which is invalid for Kubernetes probes. Added a minimum value check while preserving the post's stricter "timeout less than period" policy.
- The section title "Custom Validation Functions" implied user-defined Terraform functions. Terraform configuration cannot define custom functions, so the heading was corrected to "Custom Validation Logic".
- The testing commands used `terraform validate -var-file=...`. Although current Terraform documentation lists variable flags for validation, HashiCorp recommends `terraform plan` when validating a configuration in the context of particular input variable values. Updated the examples to use `terraform plan -var-file=...`.

## Review Notes
Terraform was not installed in the local workspace, so I could not run `terraform fmt` or execute the snippets. The environment-specific and local-value validation examples depend on current Terraform behavior that supports validation expressions referencing other objects; users on Terraform versions before 1.9 should use preconditions or upgrade Terraform.
