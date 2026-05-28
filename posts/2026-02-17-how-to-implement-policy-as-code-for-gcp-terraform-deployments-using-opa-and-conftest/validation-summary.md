# Validation Summary: How to Use Policy-as-Code for GCP Terraform Deployments Using OPA and Conftest

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Platform
- Terraform
- Open Policy Agent
- Rego
- Conftest
- GitHub Actions

## Sources Consulted
- Open Policy Agent Rego policy language documentation: https://www.openpolicyagent.org/docs/latest/policy-language/
- Open Policy Agent `if` keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/if
- Open Policy Agent v1.0 upgrade notes: https://www.openpolicyagent.org/docs/v0-upgrade
- Conftest documentation and usage: https://www.conftest.dev/
- Conftest options documentation: https://www.conftest.dev/options/
- Terraform `show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- HashiCorp Google provider `google_sql_database_instance` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- HashiCorp Google provider `google_storage_bucket` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- HashiCorp Google provider `google_compute_instance` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- HashiCorp Google provider `google_compute_firewall` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall
- HashiCorp Google provider `google_compute_network` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network
- HashiCorp Google provider `google_container_cluster` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- HashiCorp setup-terraform GitHub Action documentation: https://github.com/hashicorp/setup-terraform

## Issues Found
- The Rego snippets used pre-OPA-v1 partial set rule syntax such as `deny[msg] { ... }`, which fails under current Conftest 0.68.2 / OPA 1.15.2. Updated the snippets to use `import rego.v1`, `deny contains msg if`, and v1-compatible function syntax.
- The Conftest configuration file was named `.conftest.toml`, but Conftest documents `conftest.toml` as the default config file name. Updated the project structure and config comment.
- The GKE private cluster policy only checked whether `private_cluster_config` existed, so it would not catch `enable_private_nodes = false`. Updated it to check `enable_private_nodes`.
- The firewall policy could miss rules that omit `ports`, which means all ports in Google Compute firewall rules. Updated the example to default missing or null ports to an empty list so non-HTTP open rules are denied.
- The cost policy assumed labels were always present as objects, which can fail or skip unlabeled resources in Terraform plan JSON. Updated label access to safely default to an empty object.
- The Cloud SQL label examples used top-level `labels`, but the Google provider stores Cloud SQL labels under `settings.user_labels`. Updated the cost and naming policy examples accordingly.
- The command shown for seeing passing tests used `--all-namespaces`, which changes namespace selection rather than output verbosity. Updated it to `--output table`.
- The example Conftest summary showed `2 tests`, but current Conftest reports all evaluated rules. Updated the sample summary to `9 tests, 7 passed, 0 warnings, 2 failures, 0 exceptions`.
- The GitHub Actions workflow installed an older Conftest release and did not point Conftest at `infrastructure/policy` from the repository root. Updated the release to Conftest 0.68.2 and added `-p infrastructure/policy`.

## Review Notes
Verified the corrected Rego snippets with Conftest 0.68.2, which embeds OPA 1.15.2. Also ran a synthetic Terraform plan JSON through the policies to confirm the intended violations are reported.
