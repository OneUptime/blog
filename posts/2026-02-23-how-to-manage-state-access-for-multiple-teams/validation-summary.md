# Validation Summary: How to Manage State Access for Multiple Teams

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- Terraform S3 backend
- AWS IAM
- Amazon S3
- AWS Systems Manager Parameter Store
- AWS CloudTrail
- Google Cloud Storage IAM
- Azure RBAC
- HCP Terraform / Terraform Cloud
- AWS CLI

## Sources Consulted
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- HashiCorp Terraform remote state documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- HashiCorp TFE provider `tfe_workspace_settings` documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace_settings
- HashiCorp TFE provider `tfe_team_access` documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/team_access
- AWS S3 IAM actions, resources, and condition keys documentation: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html
- AWS IAM global condition context keys documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- Google Cloud IAM conditions attribute reference: https://cloud.google.com/iam/docs/conditions-attribute-reference
- Google Cloud Storage IAM documentation: https://cloud.google.com/storage/docs/access-control/iam
- Terraform AzureRM `azurerm_role_assignment` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment
- AWS Systems Manager Parameter Store documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html
- AWS CloudTrail `EventSelector` API documentation: https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_EventSelector.html
- AWS CLI `iam list-policies` documentation: https://docs.aws.amazon.com/cli/latest/reference/iam/list-policies.html

## Issues Found
- The AWS S3 IAM examples mixed `s3:ListBucket` and object-level actions in the same statements and did not restrict listing with `s3:prefix`, so the examples did not fully enforce the stated prefix-level access model. Split bucket listing and object access into separate statements and added `s3:prefix` conditions.
- The AWS locking example used DynamoDB locking permissions without `dynamodb:DescribeTable`, and DynamoDB-based S3 backend locking is deprecated in current Terraform documentation. Replaced the locking statement with S3 lockfile permissions.
- The production write restriction example used an additional `Allow` policy, which would not restrict principals that already had broader write access. Changed it to explicit `Deny` statements for production state writes without MFA or without the required principal tag.
- The GCP section implied that IAM conditions can fully restrict Cloud Storage access to object prefixes. Google documents that `storage.objects.list` is bucket-level and cannot be prefix-restricted with `resource.name`; updated the text and condition examples to reflect that limitation.
- The HCP Terraform remote-state sharing snippet set `global_remote_state = false` but did not configure any allowed consumer workspaces. Added `project_remote_state = false` and `remote_state_consumer_ids`.
- The shared output layer referenced `data.terraform_remote_state.database` without declaring it. Added the missing data source block.

## Review Notes
The CloudTrail alarm example assumes that a custom metric named `UnauthorizedProdStateAccess` is published separately, for example by a log metric filter or another detection pipeline. The post is otherwise technically sound after the corrections above.
