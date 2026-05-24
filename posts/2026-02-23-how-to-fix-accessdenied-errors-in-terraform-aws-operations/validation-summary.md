# Validation Summary: How to Fix AccessDenied Errors in Terraform AWS Operations

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (AWS provider)
- AWS IAM (users, roles, policies, permission boundaries)
- AWS CLI (sts, iam, cloudtrail, organizations, accessanalyzer)
- AWS S3, EC2, DynamoDB (referenced in policy examples)
- AWS Organizations / Service Control Policies (SCPs)
- AWS CloudTrail
- AWS IAM Policy Simulator
- AWS IAM Access Analyzer

## Sources Consulted
- AWS CLI Command Reference for `sts get-caller-identity`: https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html
- AWS CLI Command Reference for `cloudtrail lookup-events`: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html
- AWS CLI Command Reference for `iam simulate-principal-policy`: https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-principal-policy.html
- AWS CLI Command Reference for `organizations list-policies-for-target`: https://docs.aws.amazon.com/cli/latest/reference/organizations/list-policies-for-target.html
- AWS CLI Command Reference for `accessanalyzer start-policy-generation`: https://docs.aws.amazon.com/cli/latest/reference/accessanalyzer/start-policy-generation.html
- AWS IAM Policy Language Reference (Version 2012-10-17, Effect/Action/Resource/Condition syntax): https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies.html
- AWS Global Condition Context Keys (`aws:RequestedRegion`): https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS IAM Permissions Boundaries: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
- AWS Organizations Service Control Policies: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html
- Terraform Debugging documentation (`TF_LOG` environment variable): https://developer.hashicorp.com/terraform/internals/debugging
- HashiCorp Terraform AWS Provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- Minor markdown formatting: the "Resource-Level Restrictions" subsection was missing its `###` heading marker (the surrounding subsections within "Step 3" all use `###`). Added the heading marker for consistency so it renders as a proper subsection.

## Review Notes
- All AWS CLI commands, flags, and parameter names are correct and current as of the review date.
- The IAM policy JSON examples are syntactically valid and use the correct `2012-10-17` policy version.
- The `aws:RequestedRegion` global condition key is correct.
- The `TF_LOG=DEBUG` environment variable is the documented mechanism for enabling Terraform debug logging; `TRACE` is also valid for even more verbose output but `DEBUG` is appropriate here.
- The example error messages match the actual error format produced by the Terraform AWS provider.
- The broad "TerraformInfraProvisioning" policy (with `ec2:*`, `s3:*`, `iam:*`, etc. on `Resource: "*"`) is appropriately flagged as a development-only policy that should be scoped down for production — `iam:*` in particular grants privilege-escalation potential and the post correctly recommends narrowing it.
- The `cloudtrail lookup-events` example uses `EventName=CreateBucket`; CloudTrail's lookup attributes index a subset of fields, so this works for many common API calls, though for thorough access-denied investigation the CloudTrail console or Athena queries on the trail's S3 bucket are often more effective. This is not an error in the post, just additional context.
