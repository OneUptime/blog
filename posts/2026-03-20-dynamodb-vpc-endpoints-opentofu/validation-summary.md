# Validation Summary: How to Configure DynamoDB VPC Endpoints with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI and HCL
- AWS VPC gateway endpoints
- Amazon DynamoDB
- IAM policies
- DynamoDB resource-based policies
- AWS CLI

## Sources Consulted
- OpenTofu CLI `init` documentation: https://opentofu.org/docs/cli/init/
- OpenTofu CLI `plan` documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI `apply` documentation: https://opentofu.org/docs/cli/commands/apply/
- AWS provider docs for `aws_vpc_endpoint`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint
- AWS provider docs for `aws_dynamodb_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- AWS provider docs for `aws_dynamodb_resource_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_resource_policy
- AWS VPC documentation for DynamoDB gateway endpoints: https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-ddb.html
- AWS VPC documentation for gateway endpoints: https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html
- DynamoDB documentation for VPC endpoints and IAM policies: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/inter-network-traffic-privacy.html
- DynamoDB documentation for resource-based policies: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/access-control-resource-based.html
- DynamoDB resource-based policy examples: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/rbac-examples.html
- AWS CLI `describe-table` reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/describe-table.html

## Issues Found
1. **The post incorrectly said DynamoDB uses only gateway endpoints.** AWS currently documents that DynamoDB supports both gateway and interface endpoints. I changed the comment to say the example uses a gateway endpoint rather than claiming interface endpoints are unsupported.

2. **The HCL referenced an undeclared data source.** The endpoint policy used `data.aws_caller_identity.current.account_id` without declaring `aws_caller_identity`. I added the missing data block so the snippet is syntactically valid.

3. **The endpoint policy omitted `dynamodb:DescribeEndpoints`.** AWS documents that requests through a DynamoDB VPC endpoint require both the IAM policy and the VPC endpoint policy to allow `dynamodb:DescribeEndpoints`. I added an allow statement for that action on `Resource = "*"`.

4. **Step 2 referred to a bucket policy even though the snippet creates an IAM policy.** I corrected the section title and clarified that the managed policy must be attached to the roles or users that access DynamoDB.

5. **The connectivity test command did not match the policy shown and mixed regions.** The original example used `aws dynamodb list-tables`, but the endpoint policy only allowed table-scoped actions such as `DescribeTable`. It also used `${AWS_REGION}` in the URL while hardcoding `--region us-east-1`. I replaced the test with `describe-table` and a consistent region argument.

6. **The intro and conclusion overstated some benefits.** Claims about reduced latency and generic data transfer cost reduction were not supported by the official docs used here. I revised the wording to the documented benefits: no additional charge for gateway endpoints, no need for internet or NAT gateways for same-VPC access, and potential avoidance of NAT gateway charges for that traffic.

## Review Notes
- The post assumes a recent AWS provider release that includes `aws_dynamodb_resource_policy`. The current provider documentation includes this resource, but the post does not pin a provider version.
- DynamoDB gateway endpoints are regional, IPv4-only, and cannot be used from on-premises networks, peered VPCs in other Regions, or through a transit gateway. Those constraints are documented by AWS but were outside the narrow scope of the example, so I did not expand the article.
- The local environment did not have the AWS CLI installed, so command syntax was validated against the official AWS CLI reference rather than local `aws ... help` output.
