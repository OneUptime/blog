# Validation Summary: How to Implement Resource Tagging for Security in Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS resource tagging
- AWS IAM and tag-based access control
- AWS Organizations Service Control Policies
- AWS Config managed rules and remediation
- AWS Systems Manager Automation documents
- Checkov custom policies

## Sources Consulted
- Terraform AWS Provider documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/index.html.markdown
- Terraform AWS Provider aws_config_remediation_configuration documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/config_remediation_configuration.html.markdown
- AWS Config REQUIRED_TAGS managed rule documentation: https://docs.aws.amazon.com/config/latest/developerguide/required-tags.html
- AWS Config remediation documentation: https://docs.aws.amazon.com/config/latest/developerguide/remediation.html
- AWS IAM global condition context keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- Amazon S3 service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html
- Amazon Resource Groups tag query documentation: https://docs.amazonaws.cn/en_us/ARG/latest/userguide/resgrps-ug.pdf
- OneUptime website: https://oneuptime.com/

## Issues Found
- The `CreatedDate = formatdate("YYYY-MM-DD", timestamp())` tag would change on every Terraform run because `timestamp()` is evaluated at plan/apply time. Changed it to `var.created_date` so the tag can be supplied as a stable value.
- The AWS provider default tags section said default tags apply to every resource. The provider documentation states default tags apply to supported taggable resources and explicitly excludes `aws_autoscaling_group`. Updated the wording and added the Auto Scaling Group caveat.
- The IAM policy snippet used `ForAnyValue:StringEquals` as an unquoted HCL object key. Quoted it as `"ForAnyValue:StringEquals"` so the Terraform expression is valid.
- The AWS Config `REQUIRED_TAGS` scope included `AWS::Lambda::Function` and `AWS::ECS::Service`, which are not listed as supported resource types for that managed rule. Removed those resource types from the example scope.
- The AWS Config remediation example used `AWS-SetRequiredTags`, but AWS documentation states that this AWS-managed automation document does not work as a remediation for the `REQUIRED_TAGS` rule. Updated the example to reference a custom SSM Automation document instead.
- The Resource Groups example claimed it would find untagged EC2 instances, but tag-based Resource Groups queries only include resources that match specified tags. Replaced it with an AWS Config `REQUIRED_TAGS` audit example scoped to EC2 instances.

## Review Notes
- The SCP examples use global tag condition keys that are supported only when the target AWS action includes tag data in the request context. This is correct for the illustrated tag-on-create pattern, but real policies should still be checked action by action in the AWS Service Authorization Reference before rollout.
- The remediation example now correctly uses a custom SSM Automation document placeholder. A production implementation must define that document and align the parameter names with the document schema.
