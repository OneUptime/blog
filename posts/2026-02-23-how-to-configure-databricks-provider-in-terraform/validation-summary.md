# Validation Summary: How to Configure Databricks Provider in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Databricks Terraform Provider
- Databricks workspaces
- Databricks clusters and cluster policies
- Databricks Jobs
- Databricks notebooks and directories
- Databricks secrets
- Databricks permissions and groups
- Unity Catalog
- Databricks SQL warehouses
- AWS and Azure Databricks authentication

## Sources Consulted
- Databricks Terraform provider documentation: https://registry.terraform.io/providers/databricks/databricks/latest/docs
- Databricks Terraform provider source documentation: https://github.com/databricks/terraform-provider-databricks
- Databricks workspace management with Terraform: https://docs.databricks.com/aws/en/dev-tools/terraform/workspace-management
- Databricks personal access token authentication: https://docs.databricks.com/aws/en/dev-tools/auth/pat
- Databricks unified authentication: https://docs.databricks.com/aws/en/dev-tools/auth/unified-auth
- Databricks OAuth machine-to-machine authentication: https://docs.databricks.com/en/dev-tools/auth/oauth-m2m.html
- Databricks unified authentication environment variables and fields: https://docs.databricks.com/aws/en/dev-tools/auth/env-vars
- Databricks knowledge base article for Terraform single-node compute configuration: https://kb.databricks.com/en_US/clusters/cannot-create-cluster-spark-conf-sparkdatabricksclusterprofile-is-not-allowed-when-choosing-an-access-mode

## Issues Found
- The personal access token UI steps were outdated. Updated the steps to use Settings > Developer > Manage next to Access tokens, then Generate new token, including current token naming and scope selection.
- The AWS account-level provider example used username/password basic authentication. Replaced it with OAuth service principal authentication using `account_id`, `client_id`, and `client_secret`, matching current Databricks Terraform provider guidance.
- The AWS workspace-level provider example referenced a workspace resource token directly from the provider block. Replaced it with a service-principal workspace provider using `host`, `client_id`, and `client_secret`.
- The all-purpose autoscaling cluster example set `spark.databricks.cluster.profile = "singleNode"`, which is incorrect for an autoscaling multi-node cluster and is no longer the recommended way to configure single-node compute. Removed that Spark conf and kept the cluster as a normal autoscaling all-purpose cluster.

## Review Notes
- Terraform was not installed in the local environment, so validation was performed against official documentation rather than by running `terraform validate`.
- Several examples use AWS node type IDs such as `i3.xlarge` and `m5.xlarge`; these are valid AWS-style examples but should be adjusted for Azure or GCP workspaces.
- Personal access token authentication remains supported but is documented by Databricks as legacy; OAuth is preferred for automation.
