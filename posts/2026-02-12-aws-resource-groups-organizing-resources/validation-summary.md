# Validation Summary: How to Use AWS Resource Groups for Organizing Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Resource Groups
- AWS Resource Groups Tag Editor
- AWS CLI
- AWS CloudFormation
- AWS Systems Manager
- AWS Config
- AWS Organizations tag policies
- Terraform AWS provider
- EC2 tagging and JMESPath queries

## Sources Consulted
- AWS CLI Command Reference: `resource-groups create-group` - https://docs.aws.amazon.com/cli/latest/reference/resource-groups/create-group.html
- AWS CLI Command Reference: `resource-groups list-group-resources` - https://docs.aws.amazon.com/cli/latest/reference/resource-groups/list-group-resources.html
- AWS Resource Groups User Guide: Build a tag-based query and create a group - https://docs.aws.amazon.com/ARG/latest/userguide/gettingstarted-query-tag-based.html
- AWS Resource Groups User Guide: Creating query-based groups - https://docs.aws.amazon.com/ARG/latest/userguide/gettingstarted-query.html
- AWS Resource Groups User Guide: Supported resource types for Resource Groups and Tag Editor - https://docs.aws.amazon.com/ARG/latest/userguide/supported-resources.html
- AWS Systems Manager User Guide: Run commands at scale - https://docs.aws.amazon.com/systems-manager/latest/userguide/send-commands-multiple.html
- AWS Config API Reference: Scope - https://docs.aws.amazon.com/config/latest/APIReference/API_Scope.html
- Terraform Registry: `aws_resourcegroups_group` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/resourcegroups_group
- AWS Organizations User Guide: Tag policies - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_tag-policies.html
- Tag Editor User Guide: Finding resources to tag - https://docs.aws.amazon.com/tag-editor/latest/userguide/find-resources-to-tag.html

## Issues Found
- The post said there are only two types of resource groups. AWS Resource Groups has two `ResourceQuery` types for query-based groups, while the service also has service configuration behavior. Changed the wording to "For query-based resource groups, there are two query types."
- The `list-group-resources` examples used `--group-name`, which the current AWS CLI docs mark as deprecated. Changed both examples to use `--group`.
- The Systems Manager section described Run Command and Patch Manager as operating on all instances. AWS Systems Manager Run Command targets managed nodes, and AWS recommends resource group criteria that include managed instance/EC2 resource types. Updated the wording and command comment to refer to managed nodes.
- The AWS Config section claimed Config can scope rules to Resource Groups, but the shown `Scope` object uses tag-based scoping. Updated the section to say Config can use the same tags as Resource Groups to scope evaluations, and corrected the snippet comment.

## Review Notes
The AWS CLI `create-group` examples match the current `TAG_FILTERS_1_0` and `CLOUDFORMATION_STACK_1_0` resource query formats. The Terraform examples match the current `aws_resourcegroups_group` resource pattern using `resource_query.query`; the provider documents `type` with a default of `TAG_FILTERS_1_0`, so omitting it is acceptable for these tag-based examples.
