# Validation Summary: How to Set Up AWS Organizations with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Organizations
- AWS Organizations service control policies
- AWS Organizations organizational units
- AWS IAM policy condition keys
- AWS Security Hub CSPM delegated administration
- AWS provider for OpenTofu/Terraform

## Sources Consulted
- AWS provider documentation source: aws_organizations_organization - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/organizations_organization.html.markdown
- AWS provider documentation source: aws_organizations_organizational_unit - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/organizations_organizational_unit.html.markdown
- AWS provider documentation source: aws_organizations_policy - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/organizations_policy.html.markdown
- AWS provider documentation source: aws_organizations_policy_attachment - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/organizations_policy_attachment.html.markdown
- AWS provider documentation source: aws_organizations_delegated_administrator - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/organizations_delegated_administrator.html.markdown
- AWS provider documentation source: aws_securityhub_organization_admin_account - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/securityhub_organization_admin_account.html.markdown
- AWS Organizations terminology and concepts - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_getting-started_concepts.html
- AWS Organizations SCP syntax - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_reference_scp-syntax.html
- AWS Organizations EnablePolicyType API - https://docs.aws.amazon.com/organizations/latest/APIReference/API_EnablePolicyType.html
- AWS IAM global condition context keys - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS Organizations service integrations list - https://docs.aws.amazon.com/organizations/latest/userguide/orgs_integrate_services_list.html
- AWS Security Hub CSPM and AWS Organizations - https://docs.aws.amazon.com/organizations/latest/userguide/services-that-can-integrate-securityhub.html
- Integrating Security Hub CSPM with AWS Organizations - https://docs.aws.amazon.com/securityhub/latest/userguide/designate-orgs-admin-account.html
- OpenTofu jsonencode function - https://opentofu.org/docs/language/functions/jsonencode/
- OpenTofu output values - https://opentofu.org/docs/language/values/outputs/

## Issues Found
- The Security Hub delegated administrator example used `aws_organizations_delegated_administrator` with `securityhub.amazonaws.com`. AWS Security Hub documentation says delegated Security Hub CSPM administrator designation must be done through Security Hub CSPM console, API, or CLI, and that using Organizations APIs does not reflect in Security Hub CSPM. The AWS provider exposes `aws_securityhub_organization_admin_account` for this. I replaced the example resource with `aws_securityhub_organization_admin_account`, used `admin_account_id`, and added an explicit dependency on the organization resource.
- The organization trusted access list did not include `securityhub.amazonaws.com`, even though the post delegates Security Hub administration. I added `securityhub.amazonaws.com` to `aws_service_access_principals` so the configuration matches the Security Hub integration example in the AWS provider documentation.

## Review Notes
- `aws_organizations_organization.main.master_account_id` is still the current AWS provider attribute name, although AWS documentation now generally uses the term "management account."
- Security Hub delegated administrator configuration is regional unless Security Hub central configuration is used, so the example now notes that it applies in the provider region.
- `tofu` and `terraform` were not installed in this environment, so I could not run a local `tofu validate` or `terraform validate`. The snippets were checked against official OpenTofu, AWS, and AWS provider documentation.
