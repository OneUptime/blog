# Validation Summary: How to Deploy GCP Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Google Cloud provider
- HashiCorp Google Beta provider
- Google Cloud VPC networking
- Compute Engine
- Cloud NAT
- VPC firewall rules
- Google Kubernetes Engine (GKE)
- Cloud SQL for PostgreSQL
- Cloud Storage
- Google Cloud IAM

## Sources Consulted
- Terraform provider requirements documentation: https://developer.hashicorp.com/terraform/language/providers/requirements
- Terraform Google provider version guide: https://registry.terraform.io/providers/hashicorp/google/latest/docs/guides/provider_versions
- Terraform Google provider `google_compute_network` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network
- Terraform Google provider `google_compute_subnetwork` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork
- Terraform Google provider `google_compute_firewall` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall
- Terraform Google provider `google_compute_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- Terraform Google provider `google_compute_router_nat` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router_nat
- Terraform Google provider `google_container_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Terraform Google provider `google_container_node_pool` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_node_pool
- Terraform Google provider `google_sql_database_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- Terraform Google provider `google_storage_bucket` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- Google Cloud VPC subnets documentation: https://docs.cloud.google.com/vpc/docs/subnets
- Google Cloud firewall network tags documentation: https://docs.cloud.google.com/vpc/docs/add-remove-network-tags
- Google Cloud Private Google Access documentation: https://docs.cloud.google.com/vpc/docs/configure-private-google-access
- Google Cloud Load Balancing firewall rules documentation: https://docs.cloud.google.com/load-balancing/docs/firewall-rules
- Google Cloud SQL private services access documentation: https://docs.cloud.google.com/sql/docs/mysql/configure-private-services-access
- Google Cloud SQL private IP documentation: https://docs.cloud.google.com/sql/docs/mysql/private-ip
- Google Cloud GKE private cluster networking documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/latest/network-isolation
- Google Cloud Storage Terraform lifecycle sample: https://cloud.google.com/storage/docs/samples/storage-create-lifecycle-setting-tf

## Issues Found
- The provider configuration in the submitted post used the older `~> 5.0` Google provider constraint. The README on disk already targeted the current major version with `~> 7.0`.
- The submitted post included a `google-beta` provider block without declaring `google-beta` in `required_providers`. The README on disk already had an explicit `hashicorp/google-beta` requirement with a matching version constraint.
- The submitted post described and diagrammed Cloud SQL as if it lived inside the private subnet. The README on disk already showed Cloud SQL on a Private Service Access range, which matches how private IP Cloud SQL connectivity works.
- The submitted Compute Engine instance did not include the `allow-ssh` network tag used by the SSH firewall rule. The README on disk already included the tag so the rule applies to the example VM.
- The submitted post described the GKE example as "production-ready" even though it intentionally keeps some settings broad for tutorial use, such as an all-ranges master authorized network example. The README on disk already changed that wording to "private GKE cluster" while preserving the existing production caution comments.
- The GKE node pool example set `node_count` together with an `autoscaling` block. The Google provider documentation says `node_count` should not be used alongside autoscaling because it represents the current node count per instance group and can conflict with autoscaler-managed size. Changed it to `initial_node_count = 1`, which preserves the intended initial per-zone size while allowing autoscaling to manage the node pool afterward.

## Review Notes
- Terraform is not installed in the review environment, so I could not run `terraform validate`; validation was performed against official Terraform provider and Google Cloud documentation.
- The examples intentionally keep some permissive defaults for tutorial readability, such as SSH from `0.0.0.0/0` and master authorized networks set to `0.0.0.0/0`, with comments warning readers to restrict them in production.
- The Cloud SQL instance uses `deletion_protection = true`, which is appropriate for safety but means `terraform destroy` will require changing that setting first.
