# Validation Summary: How to Configure MongoDB Atlas Provider in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- MongoDB Atlas Terraform Provider
- MongoDB Atlas clusters and advanced clusters
- MongoDB Atlas database users
- MongoDB Atlas project IP access lists
- MongoDB Atlas network peering and PrivateLink
- MongoDB Atlas cloud backup schedules
- MongoDB Atlas alert configurations
- AWS VPC peering and VPC endpoints

## Sources Consulted
- MongoDB Atlas Terraform Provider documentation: https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs
- MongoDB Atlas provider configuration guide: https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs/guides/provider-configuration
- `mongodbatlas_advanced_cluster` resource documentation: https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs/resources/advanced_cluster
- `mongodbatlas_cluster` resource documentation: https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs/resources/cluster
- `mongodbatlas_project` resource documentation: https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs/resources/project
- `mongodbatlas_database_user` resource documentation: https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs/resources/database_user
- `mongodbatlas_network_peering` resource documentation: https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs/resources/network_peering
- `mongodbatlas_privatelink_endpoint_service` resource documentation: https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs/resources/privatelink_endpoint_service
- `mongodbatlas_cloud_backup_schedule` resource documentation: https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs/resources/cloud_backup_schedule
- `mongodbatlas_alert_configuration` resource documentation: https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs/resources/alert_configuration
- HashiCorp AWS provider `aws_vpc_peering_connection_accepter` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_peering_connection_accepter
- HashiCorp AWS provider `aws_vpc_endpoint` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint

## Issues Found
- The post used Terraform `>= 1.0`, but the current MongoDB Atlas provider support matrix no longer lists Terraform 1.0 as supported. Updated the prerequisite and `required_version` example to `>= 1.9`.
- The provider version constraint used `~> 1.15`. Updated it to `~> 2.0` to align with the current provider major version guidance.
- The post used the older `mongodbatlas_cluster` resource throughout cluster examples. Current provider documentation marks that resource as deprecated and recommends `mongodbatlas_advanced_cluster`. Updated the free, dedicated, and multi-region cluster examples and all references to the advanced cluster resource.
- The environment variable names for programmatic access keys were outdated. Changed `MONGODB_ATLAS_PUBLIC_KEY` and `MONGODB_ATLAS_PRIVATE_KEY` to `MONGODB_ATLAS_PUBLIC_API_KEY` and `MONGODB_ATLAS_PRIVATE_API_KEY`.
- The API key role guidance incorrectly described Organization Project Creator as full access. Updated it to Organization Owner for managing all resources in the guide.
- The API access wording used "whitelist" and the network section used "IP Whitelist". Updated these to "API access list" and "IP Access List".
- The PrivateLink endpoint example used AWS region format `us-east-1` for the Atlas `region` field. Updated it to Atlas region format `US_EAST_1`.
- The backup schedule weekly policy said `frequency_interval = 1` meant Sunday. Atlas backup policy documentation defines `1` as Monday and `7` as Sunday, so the example now uses `7`.
- The network peering example referenced `mongodbatlas_cluster.production.container_id`. With `mongodbatlas_advanced_cluster`, the container ID is exposed through `replication_specs[0].container_id` as a provider/region map, so the example now uses `one(values(...))`.
- Output examples were updated from `mongodbatlas_cluster` attributes to `mongodbatlas_advanced_cluster` attributes.

## Review Notes
Terraform is not installed in this workspace, so local `terraform fmt` or provider validation could not be run. The updated examples were checked against the current official Terraform Registry documentation instead.
