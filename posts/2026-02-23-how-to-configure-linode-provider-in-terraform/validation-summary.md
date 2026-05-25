# Validation Summary: How to Configure Linode Provider in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Linode Terraform Provider
- Linode Compute Instances
- Linode StackScripts
- Linode Block Storage
- Linode NodeBalancers
- Linode Kubernetes Engine (LKE)
- Linode VLANs and Cloud Firewalls
- Linode DNS
- Linode Object Storage

## Sources Consulted
- Terraform Registry: Linode provider overview and configuration reference: https://registry.terraform.io/providers/linode/linode/latest/docs
- Terraform Registry / official provider docs: `linode_instance`: https://registry.terraform.io/providers/linode/linode/latest/docs/resources/instance
- Terraform Registry / official provider docs: `linode_stackscript`: https://registry.terraform.io/providers/linode/linode/latest/docs/resources/stackscript
- Terraform Registry / official provider docs: `linode_nodebalancer`, `linode_nodebalancer_config`, and `linode_nodebalancer_node`: https://registry.terraform.io/providers/linode/linode/latest/docs/resources/nodebalancer
- Terraform Registry / official provider docs: `linode_lke_cluster`: https://registry.terraform.io/providers/linode/linode/latest/docs/resources/lke_cluster
- Terraform Registry / official provider docs: `linode_firewall`, `linode_domain`, `linode_domain_record`, `linode_volume`, `linode_object_storage_bucket`, and `linode_object_storage_key`: https://registry.terraform.io/providers/linode/linode/latest/docs
- Terraform Registry / official provider docs: `linode_images`, `linode_regions`, and `linode_instance_type` data sources: https://registry.terraform.io/providers/linode/linode/latest/docs
- Linode API image metadata for `linode/ubuntu22.04`: https://api.linode.com/v4/images/linode/ubuntu22.04
- Akamai/Linode API documentation for Object Storage keys and bucket access: https://techdocs.akamai.com/linode-api/reference/post-object-storage-keys

## Issues Found
- The provider version constraint used `~> 2.14`, which is outdated for a 2026 tutorial. Updated it to `~> 3.13`, matching the current 3.x provider line documented in the Terraform Registry.
- The `linode_instance` example used the deprecated `group` argument. Removed it and kept `tags`, which the current provider documentation recommends for organization.
- The StackScript UDF comments used `Label` instead of the current documented `label` form. Updated both UDF declarations.
- The StackScript generated the Nginx config with a single-quoted heredoc delimiter, so `$APP_PORT` would not be expanded into the configured port. Changed the heredoc so the StackScript writes the actual port into the Nginx configuration.
- The NodeBalancer example referenced undeclared TLS resources and an undeclared `linode_instance.web_cluster`. Changed the example to a plain HTTP NodeBalancer config and a backend node using the earlier `linode_instance.web` private IP.
- The LKE example used Kubernetes `1.28`, which is outdated. Updated it to `1.32`, matching the current official provider examples for standard LKE clusters.
- The Object Storage examples used the deprecated `cluster` argument. Updated `linode_object_storage_bucket` and limited key `bucket_access` to use `region`.
- The `linode_images` data source filtered for `Linode 22.04`, which does not match the official image label for `linode/ubuntu22.04`. Updated it to `Ubuntu 22.04 LTS`.

## Review Notes
- The snippets remain tutorial examples rather than one single copy-paste Terraform module; users still need to define variables such as `var.root_password`, `var.ssh_public_key`, and `var.admin_ip`.
- Some newer Linode features, especially Object Storage endpoint behavior and VPC-attached NodeBalancers, have version and availability caveats. The reviewed examples avoid those limited-availability paths.
