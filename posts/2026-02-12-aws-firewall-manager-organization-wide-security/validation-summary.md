# Validation Summary: How to Use AWS Firewall Manager for Organization-Wide Security

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Firewall Manager
- AWS Organizations
- AWS Config
- AWS CloudFormation
- AWS CLI
- AWS WAFv2
- Amazon VPC security groups
- AWS Shield Advanced
- AWS Security Hub CSPM

## Sources Consulted
- AWS Firewall Manager API `Policy` reference: https://docs.aws.amazon.com/fms/2018-01-01/APIReference/API_Policy.html
- AWS Firewall Manager API `SecurityServicePolicyData` reference: https://docs.aws.amazon.com/fms/2018-01-01/APIReference/API_SecurityServicePolicyData.html
- AWS CLI `fms put-policy` reference: https://docs.aws.amazon.com/cli/latest/reference/fms/put-policy.html
- AWS CLI `fms associate-admin-account` reference: https://docs.aws.amazon.com/cli/latest/reference/fms/associate-admin-account.html
- AWS CLI `fms get-admin-account` reference: https://docs.aws.amazon.com/cli/latest/reference/fms/get-admin-account.html
- AWS CLI `fms get-compliance-detail` reference: https://docs.aws.amazon.com/cli/latest/reference/fms/get-compliance-detail.html
- AWS CLI `fms list-compliance-status` reference: https://docs.aws.amazon.com/cli/latest/reference/fms/list-compliance-status.html
- AWS Firewall Manager AWS Config setup documentation: https://docs.aws.amazon.com/waf/latest/developerguide/enable-config.html
- AWS Firewall Manager content audit security group policy documentation: https://docs.aws.amazon.com/waf/latest/developerguide/security-group-policies-audit.html
- AWS Firewall Manager managed lists documentation: https://docs.aws.amazon.com/waf/latest/developerguide/working-with-managed-lists.html
- AWS Firewall Manager Shield Advanced policy documentation: https://docs.aws.amazon.com/waf/latest/developerguide/shield-policies.html
- AWS Shield Advanced protected resource types documentation: https://docs.aws.amazon.com/waf/latest/developerguide/ddos-protections-by-resource-type.html
- AWS Firewall Manager integration with Security Hub CSPM documentation: https://docs.aws.amazon.com/waf/latest/developerguide/fms-findings.html
- AWS Firewall Manager pricing: https://aws.amazon.com/firewall-manager/pricing/
- AWS CloudFormation `AWS::Config::ConfigurationRecorder` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-config-configurationrecorder.html
- AWS CloudFormation `AWS::Config::DeliveryChannel` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-config-deliverychannel.html

## Issues Found
- The post said Firewall Manager policies can be applied across every account and resource. This was narrowed to matching accounts and supported resources, which reflects Firewall Manager policy scope and supported resource types.
- The WAF policy used the legacy `WAF` policy type and a WAF Classic-style `ruleGroups` entry for an AWS managed rules name. It was updated to `WAFV2` with a valid `preProcessRuleGroups` managed rule group identifier for `AWSManagedRulesCommonRuleSet`.
- The WAF policy included both `ResourceType` and a duplicate single-item `ResourceTypeList`. The duplicate list was removed because `ResourceTypeList` is used with `ResourceType: "ResourceTypeList"` for multiple resource types.
- The policy scope examples used `ORGUNIT`, but the Firewall Manager API valid key is `ORG_UNIT`. All examples were corrected.
- The policy examples omitted required `ExcludeResourceTags` in several policy structures. The missing field was added.
- The security group content audit policy tried to define inline `securityRules`, which is not part of Firewall Manager `SECURITY_GROUPS_CONTENT_AUDIT` managed service data. The example now creates an audit security group with allowed SSH sources and references it through `securityGroups`.
- The Shield Advanced policy used multiple resource types without setting `ResourceType` to `ResourceTypeList`. The example was corrected.
- The monitoring section said `list-compliance-status` lists non-compliant resources. The AWS CLI command returns member account compliance summaries, so the wording and command comment were corrected.
- The compliance commands used a placeholder policy ID that did not match Firewall Manager's 36-character policy ID constraint, and `list-compliance-status` used `--max-results`, which is not a valid AWS CLI option for that paginated command. The examples now use a valid-shaped policy ID and `--max-items`.

## Review Notes
The AWS CLI was not installed in the local workspace, so CLI validation was performed against the current AWS CLI command reference rather than local `--help` output. The AWS Config CloudFormation snippet is syntactically valid for creating a recorder and delivery channel, but a production StackSet should also account for central logging, bucket policies, encryption, retention, and existing recorders or delivery channels in target accounts.
