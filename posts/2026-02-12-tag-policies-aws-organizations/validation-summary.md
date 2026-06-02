# Validation Summary: How to Implement Tag Policies in AWS Organizations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Organizations tag policies
- AWS CLI
- AWS Resource Groups Tagging API
- AWS Resource Explorer
- AWS Cost Explorer cost allocation tags
- Python and boto3
- AWS Lambda and CloudTrail-triggered automation

## Sources Consulted
- AWS Organizations User Guide: Tag policies - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_tag-policies.html
- AWS Organizations User Guide: Tag policy syntax and examples - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_example-tag-policies.html
- AWS Organizations User Guide: Services and resource types that support enforcement - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_supported-resources-enforcement.html
- AWS Organizations User Guide: Inheritance operators - https://docs.aws.amazon.com/organizations/latest/userguide/policy-operators.html
- AWS CLI Command Reference: organizations enable-policy-type - https://docs.aws.amazon.com/cli/latest/reference/organizations/enable-policy-type.html
- AWS CLI Command Reference: organizations create-policy - https://docs.aws.amazon.com/cli/latest/reference/organizations/create-policy.html
- AWS CLI Command Reference: resourcegroupstaggingapi get-compliance-summary - https://docs.aws.amazon.com/cli/latest/reference/resourcegroupstaggingapi/get-compliance-summary.html
- AWS CLI Command Reference: resourcegroupstaggingapi get-resources - https://docs.aws.amazon.com/cli/latest/reference/resourcegroupstaggingapi/get-resources.html
- AWS Resource Explorer User Guide: Example search queries - https://docs.aws.amazon.com/resource-explorer/latest/userguide/using-search-query-examples.html
- AWS CLI Command Reference: ce update-cost-allocation-tags-status - https://docs.aws.amazon.com/cli/latest/reference/ce/update-cost-allocation-tags-status.html

## Issues Found
- Clarified that AWS Organizations tag policies must be enabled in an organization with all features enabled.
- Corrected the `enforced_for` explanation to state that it blocks non-compliant tagging operations for specified resource types rather than making resources generally mandatory.
- Fixed the production OU example so it captures the created policy ID in `PROD_TAG_POLICY_ID` before using it in `attach-policy`.
- Corrected the tag policy inheritance explanation. Child policies can use operators such as `@@assign`, `@@append`, and `@@remove` by default, so an OU-level policy can replace inherited arrays unless parent policy operators restrict that behavior.
- Corrected `get-compliance-summary --tag-key-filters` from `Key=Environment` to `Environment`, matching the CLI's list-of-strings parameter.
- Replaced the invalid `get-resources --compliance-status NON_COMPLIANT` command with `--include-compliance-details --exclude-compliant-resources`.
- Replaced the Resource Groups Tagging API example for finding missing tags because `get-resources` does not return untagged resources. The corrected example uses AWS Resource Explorer with `-tag.key:Environment`.
- Narrowed the Python audit script description because the Resource Groups Tagging API returns tagged or previously tagged resources, not every untagged resource in the account.

## Review Notes
The post is technically valid after the fixes. Tag policy enforcement support varies by service and resource type, so examples using `enforced_for` should continue to be checked against the AWS supported-resource list when updated in the future.
