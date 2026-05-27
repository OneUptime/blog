# Validation Summary: How to Use Terraform Moved Blocks to Refactor GCP Resource Configurations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform moved blocks
- Terraform state and resource addressing
- Google Cloud Platform
- Google Cloud Terraform provider resources for Compute Engine, VPC networking, firewall rules, Cloud SQL, service accounts, and GKE

## Sources Consulted
- HashiCorp Terraform documentation: Refactor modules and moved blocks: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- HashiCorp Terraform documentation: Move resources / state mv guidance: https://developer.hashicorp.com/terraform/cli/state/move
- Terraform Registry, HashiCorp Google provider: google_compute_instance resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- Terraform Registry, HashiCorp Google provider: google_compute_firewall resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall
- Terraform Registry, HashiCorp Google provider: google_compute_network resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network
- Terraform Registry, HashiCorp Google provider: google_compute_subnetwork resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork
- Terraform Registry, HashiCorp Google provider: google_sql_database_instance resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- Terraform Registry, HashiCorp Google provider: google_service_account resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_service_account
- Terraform Registry, HashiCorp Google provider: google_container_cluster resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster

## Issues Found
- The `count` to `for_each` refactor changed `server-2` and `server-3` from `us-central1-a` to other zones. For `google_compute_instance`, changing the zone changes the underlying VM placement and would not be a pure address-only refactor. I changed all three `for_each` entries to keep `us-central1-a`, matching the original `count` configuration.
- The "Moving to a different resource type" note stated that `from` and `to` must always be the same resource type. Terraform documentation is more nuanced: resource type changes are generally incompatible, but can be supported by a provider for specific type pairs. I updated the wording to say incompatible type moves are not allowed unless the provider explicitly supports moving state between those types.

## Review Notes
Terraform was not installed in the local workspace, so I could not run `terraform validate`. The snippets were reviewed statically against official Terraform language documentation and the current HashiCorp Google provider resource documentation.
